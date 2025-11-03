import { mat4, vec3 } from 'gl-matrix';

export class ShadowMap {
  private gl: WebGL2RenderingContext;
  private framebuffer: WebGLFramebuffer | null = null;
  private depthTexture: WebGLTexture | null = null;
  private shadowProgram: WebGLProgram | null = null;
  
  public readonly shadowMapSize = 2048;
  public lightProjectionMatrix: mat4 = mat4.create();
  public lightViewMatrix: mat4 = mat4.create();

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.init();
  }

  private init() {
    this.createFramebuffer();
    this.createShadowProgram();
  }

  private createFramebuffer() {
    const gl = this.gl;

    // Create framebuffer
    this.framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);

    // Create depth texture
    this.depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.DEPTH_COMPONENT32F,
      this.shadowMapSize,
      this.shadowMapSize,
      0,
      gl.DEPTH_COMPONENT,
      gl.FLOAT,
      null
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Attach depth texture to framebuffer
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT,
      gl.TEXTURE_2D,
      this.depthTexture,
      0
    );

    // Check framebuffer status
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      console.error('Shadow framebuffer incomplete:', status);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private createShadowProgram() {
    const gl = this.gl;

    const vertexShaderSource = `#version 300 es
      precision highp float;

      layout(location = 0) in vec3 aPosition;

      uniform mat4 uLightSpaceMatrix;
      uniform mat4 uModelMatrix;

      void main() {
        gl_Position = uLightSpaceMatrix * uModelMatrix * vec4(aPosition, 1.0);
      }
    `;

    const fragmentShaderSource = `#version 300 es
      precision highp float;

      void main() {
        // Depth is automatically written
      }
    `;

    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) {
      console.error('Failed to compile shadow shaders');
      return;
    }

    this.shadowProgram = gl.createProgram();
    if (!this.shadowProgram) return;

    gl.attachShader(this.shadowProgram, vertexShader);
    gl.attachShader(this.shadowProgram, fragmentShader);
    gl.linkProgram(this.shadowProgram);

    if (!gl.getProgramParameter(this.shadowProgram, gl.LINK_STATUS)) {
      console.error('Shadow program link error:', gl.getProgramInfoLog(this.shadowProgram));
      this.shadowProgram = null;
    }
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shadow shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  public updateLightMatrices(lightDirection: vec3, sceneCenter: vec3 = vec3.fromValues(0, 0, 0)) {
    // Position light far from scene
    const lightPos = vec3.create();
    vec3.scale(lightPos, lightDirection, -20);
    vec3.add(lightPos, lightPos, sceneCenter);

    // Light view matrix (looking at scene center)
    mat4.lookAt(
      this.lightViewMatrix,
      lightPos,
      sceneCenter,
      vec3.fromValues(0, 1, 0)
    );

    // Orthographic projection for directional light
    const size = 15;
    mat4.ortho(
      this.lightProjectionMatrix,
      -size, size,  // left, right
      -size, size,  // bottom, top
      1, 50         // near, far
    );
  }

  public beginShadowPass() {
    const gl = this.gl;
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.viewport(0, 0, this.shadowMapSize, this.shadowMapSize);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    // Enable depth testing, disable color writes
    gl.enable(gl.DEPTH_TEST);
    gl.colorMask(false, false, false, false);
    
    // Use shadow program
    if (this.shadowProgram) {
      gl.useProgram(this.shadowProgram);
    }
  }

  public endShadowPass(canvasWidth: number, canvasHeight: number) {
    const gl = this.gl;
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvasWidth, canvasHeight);
    
    // Re-enable color writes
    gl.colorMask(true, true, true, true);
  }

  public renderToShadowMap(
    modelMatrix: mat4,
    vao: WebGLVertexArrayObject,
    indexCount: number
  ) {
    if (!this.shadowProgram) return;

    const gl = this.gl;

    // Calculate light space matrix
    const lightSpaceMatrix = mat4.create();
    mat4.multiply(lightSpaceMatrix, this.lightProjectionMatrix, this.lightViewMatrix);

    // Set uniforms
    const lightSpaceLoc = gl.getUniformLocation(this.shadowProgram, 'uLightSpaceMatrix');
    const modelLoc = gl.getUniformLocation(this.shadowProgram, 'uModelMatrix');

    gl.uniformMatrix4fv(lightSpaceLoc, false, lightSpaceMatrix);
    gl.uniformMatrix4fv(modelLoc, false, modelMatrix);

    // Draw
    gl.bindVertexArray(vao);
    gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
  }

  public bindShadowMap(textureUnit: number = 0) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + textureUnit);
    gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
  }

  public getLightSpaceMatrix(): mat4 {
    const lightSpaceMatrix = mat4.create();
    mat4.multiply(lightSpaceMatrix, this.lightProjectionMatrix, this.lightViewMatrix);
    return lightSpaceMatrix;
  }

  public dispose() {
    const gl = this.gl;
    if (this.framebuffer) gl.deleteFramebuffer(this.framebuffer);
    if (this.depthTexture) gl.deleteTexture(this.depthTexture);
    if (this.shadowProgram) gl.deleteProgram(this.shadowProgram);
  }
}

