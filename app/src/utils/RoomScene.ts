import { mat4, vec3 } from 'gl-matrix';

import { FurnitureFactory } from './FurnitureFactory';
import { FurnitureObject } from '../types/FurnitureObject';
import { Raycaster } from './Raycaster';
import { ShadowMap } from './ShadowMap';
import { TextureLoader } from './TextureLoader';

export class RoomScene {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  
  // Utilities
  private textureLoader: TextureLoader;
  private furnitureFactory: FurnitureFactory;
  private raycaster: Raycaster;
  private shadowMap: ShadowMap;
  
  // Camera
  private camera = {
    position: vec3.fromValues(8, 6, 8),
    target: vec3.fromValues(0, 1, 0),
    up: vec3.fromValues(0, 1, 0),
    fov: 45 * Math.PI / 180,
    aspect: 1,
    near: 0.1,
    far: 100
  };

  // Lights
  private ambientLight = vec3.fromValues(0.3, 0.3, 0.35);
  private directionalLight = {
    direction: vec3.fromValues(-0.5, -1.0, -0.5),
    color: vec3.fromValues(1.0, 1.0, 0.95),
    intensity: 1.0
  };

  // Matrices
  private projectionMatrix: mat4 = mat4.create();
  private viewMatrix: mat4 = mat4.create();

  // Geometry buffers
  private floorVAO: WebGLVertexArrayObject | null = null;
  private wallVAO: WebGLVertexArrayObject | null = null;
  private wallIndexCount = 0;

  // Textures
  private floorTexture: WebGLTexture | null = null;
  private wallTexture: WebGLTexture | null = null;

  // Furniture
  private furniture: FurnitureObject[] = [];
  private selectedFurniture: FurnitureObject | null = null;

  // Settings
  public shadowsEnabled = true;
  public showGrid = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2');
    if (!gl) {
      throw new Error('WebGL 2 not supported');
    }
    this.gl = gl;
    
    // Initialize utilities
    this.textureLoader = new TextureLoader(gl);
    this.furnitureFactory = new FurnitureFactory(gl);
    this.raycaster = new Raycaster();
    this.shadowMap = new ShadowMap(gl);
    
    this.init();
  }

  private async init() {
    const gl = this.gl;

    // Enable depth testing and backface culling
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    
    gl.clearColor(0.53, 0.81, 0.92, 1.0); // Sky blue background

    // Create shader program
    this.program = this.createShaderProgram();
    if (!this.program) {
      throw new Error('Failed to create shader program');
    }

    // Create geometry
    this.createFloorGeometry();
    this.createWallsGeometry();

    // Load textures
    await this.loadTextures();

    // Update aspect ratio
    this.updateAspect();
  }

  private async loadTextures() {
    // Create procedural textures
    this.floorTexture = this.textureLoader.createCheckerboardTexture(512, 64);
    this.wallTexture = this.textureLoader.createProceduralTexture(512, 512, (x, y) => {
      const noise = (Math.sin(x * 0.1) + Math.cos(y * 0.1)) * 10;
      const base = 220 + noise;
      return [base, base, base * 0.95, 255];
    });
  }

  private createShaderProgram(): WebGLProgram | null {
    const gl = this.gl;

    const vertexShaderSource = `#version 300 es
      precision highp float;

      layout(location = 0) in vec3 aPosition;
      layout(location = 1) in vec3 aNormal;
      layout(location = 2) in vec2 aTexCoord;

      uniform mat4 uProjectionMatrix;
      uniform mat4 uViewMatrix;
      uniform mat4 uModelMatrix;
      uniform mat3 uNormalMatrix;
      uniform mat4 uLightSpaceMatrix;

      out vec3 vNormal;
      out vec3 vFragPos;
      out vec2 vTexCoord;
      out vec4 vFragPosLightSpace;

      void main() {
        vec4 worldPos = uModelMatrix * vec4(aPosition, 1.0);
        vFragPos = worldPos.xyz;
        vNormal = uNormalMatrix * aNormal;
        vTexCoord = aTexCoord;
        vFragPosLightSpace = uLightSpaceMatrix * worldPos;
        gl_Position = uProjectionMatrix * uViewMatrix * worldPos;
      }
    `;

    const fragmentShaderSource = `#version 300 es
      precision highp float;

      in vec3 vNormal;
      in vec3 vFragPos;
      in vec2 vTexCoord;
      in vec4 vFragPosLightSpace;

      uniform vec3 uAmbientLight;
      uniform vec3 uLightDirection;
      uniform vec3 uLightColor;
      uniform float uLightIntensity;
      uniform vec3 uCameraPosition;
      uniform vec3 uMaterialColor;
      uniform float uShininess;
      uniform bool uUseTexture;
      uniform sampler2D uTexture;
      uniform sampler2D uShadowMap;
      uniform bool uUseShadows;
      uniform bool uIsSelected;

      out vec4 fragColor;

      float calculateShadow(vec4 fragPosLightSpace) {
        // Perspective divide
        vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
        
        // Transform to [0,1] range
        projCoords = projCoords * 0.5 + 0.5;
        
        // Outside shadow map
        if (projCoords.z > 1.0 || projCoords.x < 0.0 || projCoords.x > 1.0 || 
            projCoords.y < 0.0 || projCoords.y > 1.0) {
          return 0.0;
        }
        
        // Get closest depth from shadow map
        float closestDepth = texture(uShadowMap, projCoords.xy).r;
        float currentDepth = projCoords.z;
        
        // Bias to prevent shadow acne
        float bias = 0.005;
        
        // PCF (Percentage Closer Filtering) for soft shadows
        float shadow = 0.0;
        vec2 texelSize = 1.0 / vec2(textureSize(uShadowMap, 0));
        for(int x = -1; x <= 1; ++x) {
          for(int y = -1; y <= 1; ++y) {
            float pcfDepth = texture(uShadowMap, projCoords.xy + vec2(x, y) * texelSize).r;
            shadow += currentDepth - bias > pcfDepth ? 1.0 : 0.0;
          }
        }
        shadow /= 9.0;
        
        return shadow;
      }

      void main() {
        // Normalize vectors
        vec3 normal = normalize(vNormal);
        vec3 lightDir = normalize(-uLightDirection);
        vec3 viewDir = normalize(uCameraPosition - vFragPos);
        vec3 reflectDir = reflect(-lightDir, normal);

        // Base color
        vec3 baseColor = uMaterialColor;
        if (uUseTexture) {
          baseColor *= texture(uTexture, vTexCoord).rgb;
        }

        // Ambient
        vec3 ambient = uAmbientLight * baseColor;

        // Diffuse
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 diffuse = diff * uLightColor * uLightIntensity * baseColor;

        // Specular (Phong)
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), uShininess);
        vec3 specular = spec * uLightColor * uLightIntensity * 0.3;

        // Shadow
        float shadow = 0.0;
        if (uUseShadows) {
          shadow = calculateShadow(vFragPosLightSpace);
        }

        vec3 result = ambient + (1.0 - shadow * 0.7) * (diffuse + specular);

        // Selection highlight
        if (uIsSelected) {
          result = mix(result, vec3(1.0, 1.0, 0.3), 0.3);
        }

        fragColor = vec4(result, 1.0);
      }
    `;

    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) {
      return null;
    }

    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return null;
    }

    return program;
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  private createFloorGeometry() {
    const gl = this.gl;
    const size = 10;

    const vertices = new Float32Array([
      // Position          Normal           TexCoord
      -size, 0, -size,     0, 1, 0,        0, 0,
       size, 0, -size,     0, 1, 0,        5, 0,
       size, 0,  size,     0, 1, 0,        5, 5,
      -size, 0,  size,     0, 1, 0,        0, 5,
    ]);

    const indices = new Uint16Array([
      0, 1, 2,
      0, 2, 3
    ]);

    this.floorVAO = gl.createVertexArray();
    gl.bindVertexArray(this.floorVAO);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);

    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
  }

  private createWallsGeometry() {
    const gl = this.gl;
    const size = 10;
    const height = 5;

    const vertices = new Float32Array([
      // Back wall (Z = -size)
      -size, 0, -size,      0, 0, 1,   0, 0,
       size, 0, -size,      0, 0, 1,   4, 0,
       size, height, -size, 0, 0, 1,   4, 2,
      -size, height, -size, 0, 0, 1,   0, 2,

      // Right wall (X = size)
       size, 0, -size,     -1, 0, 0,   0, 0,
       size, 0,  size,     -1, 0, 0,   4, 0,
       size, height,  size, -1, 0, 0,   4, 2,
       size, height, -size, -1, 0, 0,   0, 2,

      // Left wall (X = -size)
      -size, 0,  size,      1, 0, 0,   0, 0,
      -size, 0, -size,      1, 0, 0,   4, 0,
      -size, height, -size, 1, 0, 0,   4, 2,
      -size, height,  size, 1, 0, 0,   0, 2,

      // Front wall (Z = size) - partial, with opening
      // Left part
      -size, 0, size,       0, 0, -1,  0, 0,
      -3, 0, size,          0, 0, -1,  1.4, 0,
      -3, height, size,     0, 0, -1,  1.4, 2,
      -size, height, size,  0, 0, -1,  0, 2,

      // Right part
       3, 0, size,          0, 0, -1,  2.6, 0,
       size, 0, size,       0, 0, -1,  4, 0,
       size, height, size,  0, 0, -1,  4, 2,
       3, height, size,     0, 0, -1,  2.6, 2,

      // Top part (door frame)
      -3, 3.5, size,        0, 0, -1,  1.4, 1.4,
       3, 3.5, size,        0, 0, -1,  2.6, 1.4,
       3, height, size,     0, 0, -1,  2.6, 2,
      -3, height, size,     0, 0, -1,  1.4, 2,
    ]);

    const indices = new Uint16Array([
      // Back wall
      0, 1, 2,    0, 2, 3,
      // Right wall
      4, 5, 6,    4, 6, 7,
      // Left wall
      8, 9, 10,   8, 10, 11,
      // Front left
      12, 13, 14, 12, 14, 15,
      // Front right
      16, 17, 18, 16, 18, 19,
      // Front top
      20, 21, 22, 20, 22, 23,
    ]);

    this.wallIndexCount = indices.length;

    this.wallVAO = gl.createVertexArray();
    gl.bindVertexArray(this.wallVAO);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);

    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
  }

  public updateAspect() {
    this.camera.aspect = this.canvas.width / this.canvas.height;
  }

  public render() {
    // Update matrices
    mat4.perspective(
      this.projectionMatrix,
      this.camera.fov,
      this.camera.aspect,
      this.camera.near,
      this.camera.far
    );

    mat4.lookAt(
      this.viewMatrix,
      this.camera.position,
      this.camera.target,
      this.camera.up
    );

    // Update shadow map light matrices
    this.shadowMap.updateLightMatrices(this.directionalLight.direction);

    // Shadow pass
    if (this.shadowsEnabled) {
      this.renderShadowPass();
    }

    // Main render pass
    this.renderMainPass();
  }

  private renderShadowPass() {
    this.shadowMap.beginShadowPass();

    // Render floor
    const floorModel = mat4.create();
    if (this.floorVAO) {
      this.shadowMap.renderToShadowMap(floorModel, this.floorVAO, 6);
    }

    // Render walls
    const wallModel = mat4.create();
    if (this.wallVAO) {
      this.shadowMap.renderToShadowMap(wallModel, this.wallVAO, this.wallIndexCount);
    }

    // Render furniture
    this.furniture.forEach(item => {
      item.parts.forEach(part => {
        const modelMatrix = this.getFurniturePartMatrix(item, part);
        this.shadowMap.renderToShadowMap(modelMatrix, part.vao, part.vertexCount);
      });
    });

    this.shadowMap.endShadowPass(this.canvas.width, this.canvas.height);
  }

  private renderMainPass() {
    const gl = this.gl;

    // Clear
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (!this.program) return;
    gl.useProgram(this.program);

    // Set common uniforms
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'uProjectionMatrix'), false, this.projectionMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'uViewMatrix'), false, this.viewMatrix);

    // Light uniforms
    gl.uniform3fv(gl.getUniformLocation(this.program, 'uAmbientLight'), this.ambientLight);
    gl.uniform3fv(gl.getUniformLocation(this.program, 'uLightDirection'), this.directionalLight.direction);
    gl.uniform3fv(gl.getUniformLocation(this.program, 'uLightColor'), this.directionalLight.color);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uLightIntensity'), this.directionalLight.intensity);
    gl.uniform3fv(gl.getUniformLocation(this.program, 'uCameraPosition'), this.camera.position);

    // Shadow map uniforms
    const lightSpaceMatrix = this.shadowMap.getLightSpaceMatrix();
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'uLightSpaceMatrix'), false, lightSpaceMatrix);
    gl.uniform1i(gl.getUniformLocation(this.program, 'uUseShadows'), this.shadowsEnabled ? 1 : 0);

    // Bind shadow map
    this.shadowMap.bindShadowMap(1);
    gl.uniform1i(gl.getUniformLocation(this.program, 'uShadowMap'), 1);

    // Draw scene
    this.drawFloor();
    this.drawWalls();
    this.drawFurniture();
  }

  private drawFloor() {
    const gl = this.gl;
    const program = this.program;
    if (!program || !this.floorVAO) return;

    const modelMatrix = mat4.create();
    const normalMatrix = this.getNormalMatrix(modelMatrix);

    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uModelMatrix'), false, modelMatrix);
    gl.uniformMatrix3fv(gl.getUniformLocation(program, 'uNormalMatrix'), false, normalMatrix);
    gl.uniform3f(gl.getUniformLocation(program, 'uMaterialColor'), 1.0, 1.0, 1.0);
    gl.uniform1f(gl.getUniformLocation(program, 'uShininess'), 8.0);
    gl.uniform1i(gl.getUniformLocation(program, 'uUseTexture'), 1);
    gl.uniform1i(gl.getUniformLocation(program, 'uIsSelected'), 0);

    // Bind floor texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.floorTexture);
    gl.uniform1i(gl.getUniformLocation(program, 'uTexture'), 0);

    gl.bindVertexArray(this.floorVAO);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }

  private drawWalls() {
    const gl = this.gl;
    const program = this.program;
    if (!program || !this.wallVAO) return;

    const modelMatrix = mat4.create();
    const normalMatrix = this.getNormalMatrix(modelMatrix);

    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uModelMatrix'), false, modelMatrix);
    gl.uniformMatrix3fv(gl.getUniformLocation(program, 'uNormalMatrix'), false, normalMatrix);
    gl.uniform3f(gl.getUniformLocation(program, 'uMaterialColor'), 1.0, 1.0, 1.0);
    gl.uniform1f(gl.getUniformLocation(program, 'uShininess'), 4.0);
    gl.uniform1i(gl.getUniformLocation(program, 'uUseTexture'), 1);
    gl.uniform1i(gl.getUniformLocation(program, 'uIsSelected'), 0);

    // Bind wall texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.wallTexture);
    gl.uniform1i(gl.getUniformLocation(program, 'uTexture'), 0);

    gl.bindVertexArray(this.wallVAO);
    gl.drawElements(gl.TRIANGLES, this.wallIndexCount, gl.UNSIGNED_SHORT, 0);
  }

  private drawFurniture() {
    const gl = this.gl;
    const program = this.program;
    if (!program) return;

    this.furniture.forEach(item => {
      const isSelected = item === this.selectedFurniture;

      item.parts.forEach(part => {
        const modelMatrix = this.getFurniturePartMatrix(item, part);
        const normalMatrix = this.getNormalMatrix(modelMatrix);

        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uModelMatrix'), false, modelMatrix);
        gl.uniformMatrix3fv(gl.getUniformLocation(program, 'uNormalMatrix'), false, normalMatrix);
        gl.uniform3fv(gl.getUniformLocation(program, 'uMaterialColor'), part.color);
        gl.uniform1f(gl.getUniformLocation(program, 'uShininess'), 32.0);
        gl.uniform1i(gl.getUniformLocation(program, 'uUseTexture'), 0);
        gl.uniform1i(gl.getUniformLocation(program, 'uIsSelected'), isSelected ? 1 : 0);

        gl.bindVertexArray(part.vao);
        gl.drawElements(gl.TRIANGLES, part.vertexCount, gl.UNSIGNED_SHORT, 0);
      });
    });
  }

  private getFurniturePartMatrix(furniture: FurnitureObject, part: any): mat4 {
    const modelMatrix = mat4.create();
    
    // Apply furniture transform
    mat4.translate(modelMatrix, modelMatrix, furniture.position);
    mat4.rotateY(modelMatrix, modelMatrix, furniture.rotation);
    mat4.scale(modelMatrix, modelMatrix, furniture.scale);
    
    // Apply part transform
    mat4.translate(modelMatrix, modelMatrix, part.position);
    mat4.scale(modelMatrix, modelMatrix, part.scale);
    
    return modelMatrix;
  }

  private getNormalMatrix(modelMatrix: mat4): Float32Array {
    const normalMatrix = mat4.create();
    mat4.invert(normalMatrix, modelMatrix);
    mat4.transpose(normalMatrix, normalMatrix);
    return new Float32Array([
      normalMatrix[0], normalMatrix[1], normalMatrix[2],
      normalMatrix[4], normalMatrix[5], normalMatrix[6],
      normalMatrix[8], normalMatrix[9], normalMatrix[10]
    ]);
  }

  // Public API methods
  
  public setCamera(position: vec3, target: vec3) {
    vec3.copy(this.camera.position, position);
    vec3.copy(this.camera.target, target);
  }

  public getCameraPosition(): vec3 {
    return this.camera.position;
  }

  public getCameraTarget(): vec3 {
    return this.camera.target;
  }

  public addFurniture(type: 'table' | 'chair' | 'bookshelf' | 'sofa' | 'lamp'): FurnitureObject {
    let furniture: FurnitureObject;

    switch (type) {
      case 'table':
        furniture = this.furnitureFactory.createTable();
        break;
      case 'chair':
        furniture = this.furnitureFactory.createChair();
        break;
      case 'bookshelf':
        furniture = this.furnitureFactory.createBookshelf();
        break;
      case 'sofa':
        furniture = this.furnitureFactory.createSofa();
        break;
      case 'lamp':
        furniture = this.furnitureFactory.createLamp();
        break;
    }

    // Position at a default location
    furniture.position[1] = 0;

    this.furniture.push(furniture);
    return furniture;
  }

  public removeFurniture(furniture: FurnitureObject) {
    const index = this.furniture.indexOf(furniture);
    if (index > -1) {
      this.furniture.splice(index, 1);
      if (this.selectedFurniture === furniture) {
        this.selectedFurniture = null;
      }
    }
  }

  public selectFurniture(mouseX: number, mouseY: number): FurnitureObject | null {
    this.raycaster.setFromCamera(
      mouseX,
      mouseY,
      this.canvas.width,
      this.canvas.height,
      this.projectionMatrix,
      this.viewMatrix,
      this.camera.position
    );

    const intersected = this.raycaster.intersectFurniture(this.furniture);
    this.selectedFurniture = intersected;
    return intersected;
  }

  public getSelectedFurniture(): FurnitureObject | null {
    return this.selectedFurniture;
  }

  public clearSelection() {
    this.selectedFurniture = null;
  }

  public getAllFurniture(): FurnitureObject[] {
    return this.furniture;
  }

  public setLightDirection(x: number, y: number, z: number) {
    vec3.set(this.directionalLight.direction, x, y, z);
    vec3.normalize(this.directionalLight.direction, this.directionalLight.direction);
  }

  public setLightIntensity(intensity: number) {
    this.directionalLight.intensity = intensity;
  }

  public dispose() {
    this.textureLoader.dispose();
    this.shadowMap.dispose();
  }
}
