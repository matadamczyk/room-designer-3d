import { mat4, vec3 } from 'gl-matrix';

export class RoomScene {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  
  // Camera
  private camera = {
    position: vec3.fromValues(5, 5, 5),
    target: vec3.fromValues(0, 0, 0),
    up: vec3.fromValues(0, 1, 0),
    fov: 45 * Math.PI / 180,
    aspect: 1,
    near: 0.1,
    far: 100
  };

  // Lights
  private ambientLight = vec3.fromValues(0.3, 0.3, 0.3);
  private directionalLight = {
    direction: vec3.fromValues(-0.5, -1.0, -0.5),
    color: vec3.fromValues(1.0, 1.0, 1.0)
  };

  // Matrices
  private projectionMatrix: mat4 = mat4.create();
  private viewMatrix: mat4 = mat4.create();

  // Geometry buffers
  private floorVAO: WebGLVertexArrayObject | null = null;
  private cubeVAO: WebGLVertexArrayObject | null = null;
  private cubeVertexCount = 0;

  // Cube transform
  private cubePosition = vec3.fromValues(0, 0.5, 0);
  private cubeRotation = 0;
  private cubeScale = vec3.fromValues(1, 1, 1);

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2');
    if (!gl) {
      throw new Error('WebGL 2 not supported');
    }
    this.gl = gl;
    this.init();
  }

  private init() {
    const gl = this.gl;

    // Enable depth testing and backface culling
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    
    gl.clearColor(0.1, 0.1, 0.15, 1.0);

    // Create shader program
    this.program = this.createShaderProgram();
    if (!this.program) {
      throw new Error('Failed to create shader program');
    }

    // Create geometry
    this.createFloorGeometry();
    this.createCubeGeometry();

    // Update aspect ratio
    this.updateAspect();
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

      out vec3 vNormal;
      out vec3 vFragPos;
      out vec2 vTexCoord;

      void main() {
        vec4 worldPos = uModelMatrix * vec4(aPosition, 1.0);
        vFragPos = worldPos.xyz;
        vNormal = uNormalMatrix * aNormal;
        vTexCoord = aTexCoord;
        gl_Position = uProjectionMatrix * uViewMatrix * worldPos;
      }
    `;

    const fragmentShaderSource = `#version 300 es
      precision highp float;

      in vec3 vNormal;
      in vec3 vFragPos;
      in vec2 vTexCoord;

      uniform vec3 uAmbientLight;
      uniform vec3 uLightDirection;
      uniform vec3 uLightColor;
      uniform vec3 uCameraPosition;
      uniform vec3 uMaterialColor;
      uniform float uShininess;

      out vec4 fragColor;

      void main() {
        // Normalize vectors
        vec3 normal = normalize(vNormal);
        vec3 lightDir = normalize(-uLightDirection);
        vec3 viewDir = normalize(uCameraPosition - vFragPos);
        vec3 reflectDir = reflect(-lightDir, normal);

        // Ambient
        vec3 ambient = uAmbientLight * uMaterialColor;

        // Diffuse
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 diffuse = diff * uLightColor * uMaterialColor;

        // Specular (Phong)
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), uShininess);
        vec3 specular = spec * uLightColor * 0.5;

        vec3 result = ambient + diffuse + specular;
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

    // Floor vertices (simple plane)
    const vertices = new Float32Array([
      // Position          Normal           TexCoord
      -size, 0, -size,     0, 1, 0,        0, 0,
       size, 0, -size,     0, 1, 0,        1, 0,
       size, 0,  size,     0, 1, 0,        1, 1,
      -size, 0,  size,     0, 1, 0,        0, 1,
    ]);

    const indices = new Uint16Array([
      0, 1, 2,
      0, 2, 3
    ]);

    this.floorVAO = gl.createVertexArray();
    gl.bindVertexArray(this.floorVAO);

    // Vertex buffer
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Position attribute
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);

    // Normal attribute
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);

    // TexCoord attribute
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);

    // Index buffer
    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
  }

  private createCubeGeometry() {
    const gl = this.gl;

    // Cube vertices with normals
    const vertices = new Float32Array([
      // Front face
      -0.5, -0.5,  0.5,   0,  0,  1,   0, 0,
       0.5, -0.5,  0.5,   0,  0,  1,   1, 0,
       0.5,  0.5,  0.5,   0,  0,  1,   1, 1,
      -0.5,  0.5,  0.5,   0,  0,  1,   0, 1,

      // Back face
      -0.5, -0.5, -0.5,   0,  0, -1,   1, 0,
      -0.5,  0.5, -0.5,   0,  0, -1,   1, 1,
       0.5,  0.5, -0.5,   0,  0, -1,   0, 1,
       0.5, -0.5, -0.5,   0,  0, -1,   0, 0,

      // Top face
      -0.5,  0.5, -0.5,   0,  1,  0,   0, 1,
      -0.5,  0.5,  0.5,   0,  1,  0,   0, 0,
       0.5,  0.5,  0.5,   0,  1,  0,   1, 0,
       0.5,  0.5, -0.5,   0,  1,  0,   1, 1,

      // Bottom face
      -0.5, -0.5, -0.5,   0, -1,  0,   0, 0,
       0.5, -0.5, -0.5,   0, -1,  0,   1, 0,
       0.5, -0.5,  0.5,   0, -1,  0,   1, 1,
      -0.5, -0.5,  0.5,   0, -1,  0,   0, 1,

      // Right face
       0.5, -0.5, -0.5,   1,  0,  0,   1, 0,
       0.5,  0.5, -0.5,   1,  0,  0,   1, 1,
       0.5,  0.5,  0.5,   1,  0,  0,   0, 1,
       0.5, -0.5,  0.5,   1,  0,  0,   0, 0,

      // Left face
      -0.5, -0.5, -0.5,  -1,  0,  0,   0, 0,
      -0.5, -0.5,  0.5,  -1,  0,  0,   1, 0,
      -0.5,  0.5,  0.5,  -1,  0,  0,   1, 1,
      -0.5,  0.5, -0.5,  -1,  0,  0,   0, 1,
    ]);

    const indices = new Uint16Array([
      0,  1,  2,    0,  2,  3,    // front
      4,  5,  6,    4,  6,  7,    // back
      8,  9, 10,    8, 10, 11,    // top
      12, 13, 14,   12, 14, 15,   // bottom
      16, 17, 18,   16, 18, 19,   // right
      20, 21, 22,   20, 22, 23,   // left
    ]);

    this.cubeVertexCount = indices.length;

    this.cubeVAO = gl.createVertexArray();
    gl.bindVertexArray(this.cubeVAO);

    // Vertex buffer
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Position attribute
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);

    // Normal attribute
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);

    // TexCoord attribute
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);

    // Index buffer
    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
  }

  public updateAspect() {
    this.camera.aspect = this.canvas.width / this.canvas.height;
  }

  public render() {
    const gl = this.gl;

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

    // Clear
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (!this.program) return;
    gl.useProgram(this.program);

    // Set common uniforms
    const projLoc = gl.getUniformLocation(this.program, 'uProjectionMatrix');
    const viewLoc = gl.getUniformLocation(this.program, 'uViewMatrix');
    gl.uniformMatrix4fv(projLoc, false, this.projectionMatrix);
    gl.uniformMatrix4fv(viewLoc, false, this.viewMatrix);

    // Light uniforms
    gl.uniform3fv(gl.getUniformLocation(this.program, 'uAmbientLight'), this.ambientLight);
    gl.uniform3fv(gl.getUniformLocation(this.program, 'uLightDirection'), this.directionalLight.direction);
    gl.uniform3fv(gl.getUniformLocation(this.program, 'uLightColor'), this.directionalLight.color);
    gl.uniform3fv(gl.getUniformLocation(this.program, 'uCameraPosition'), this.camera.position);

    // Draw floor
    this.drawFloor();

    // Draw cube
    this.drawCube();
  }

  private drawFloor() {
    const gl = this.gl;
    if (!this.program || !this.floorVAO) return;

    const modelMatrix = mat4.create();
    const normalMatrix = mat4.create();
    mat4.invert(normalMatrix, modelMatrix);
    mat4.transpose(normalMatrix, normalMatrix);
    const normalMatrix3 = mat3FromMat4(normalMatrix);

    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'uModelMatrix'), false, modelMatrix);
    gl.uniformMatrix3fv(gl.getUniformLocation(this.program, 'uNormalMatrix'), false, normalMatrix3);
    gl.uniform3f(gl.getUniformLocation(this.program, 'uMaterialColor'), 0.5, 0.5, 0.5);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uShininess'), 8.0);

    gl.bindVertexArray(this.floorVAO);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }

  private drawCube() {
    const gl = this.gl;
    if (!this.program || !this.cubeVAO) return;

    const modelMatrix = mat4.create();
    mat4.translate(modelMatrix, modelMatrix, this.cubePosition);
    mat4.rotateY(modelMatrix, modelMatrix, this.cubeRotation);
    mat4.scale(modelMatrix, modelMatrix, this.cubeScale);

    const normalMatrix = mat4.create();
    mat4.invert(normalMatrix, modelMatrix);
    mat4.transpose(normalMatrix, normalMatrix);
    const normalMatrix3 = mat3FromMat4(normalMatrix);

    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'uModelMatrix'), false, modelMatrix);
    gl.uniformMatrix3fv(gl.getUniformLocation(this.program, 'uNormalMatrix'), false, normalMatrix3);
    gl.uniform3f(gl.getUniformLocation(this.program, 'uMaterialColor'), 0.8, 0.3, 0.3);
    gl.uniform1f(gl.getUniformLocation(this.program, 'uShininess'), 32.0);

    gl.bindVertexArray(this.cubeVAO);
    gl.drawElements(gl.TRIANGLES, this.cubeVertexCount, gl.UNSIGNED_SHORT, 0);
  }

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

  public setCubeRotation(angle: number) {
    this.cubeRotation = angle;
  }

  public getCubeRotation(): number {
    return this.cubeRotation;
  }
}

// Helper to extract mat3 from mat4
function mat3FromMat4(mat: mat4): Float32Array {
  return new Float32Array([
    mat[0], mat[1], mat[2],
    mat[4], mat[5], mat[6],
    mat[8], mat[9], mat[10]
  ]);
}