export class TextureLoader {
  private gl: WebGL2RenderingContext;
  private textureCache: Map<string, WebGLTexture> = new Map();

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  public async loadTexture(url: string): Promise<WebGLTexture | null> {
    // Check cache first
    if (this.textureCache.has(url)) {
      return this.textureCache.get(url)!;
    }

    const gl = this.gl;
    const texture = gl.createTexture();
    if (!texture) return null;

    // Create a 1x1 placeholder while loading
    gl.bindTexture(gl.TEXTURE_2D, texture);
    const placeholder = new Uint8Array([128, 128, 128, 255]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, placeholder);

    try {
      const image = await this.loadImage(url);
      
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

      // Check if image is power of 2
      if (this.isPowerOf2(image.width) && this.isPowerOf2(image.height)) {
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      this.textureCache.set(url, texture);
      console.log(`Texture loaded: ${url}`);
      return texture;
    } catch (error) {
      console.error(`Failed to load texture: ${url}`, error);
      return texture; // Return placeholder texture
    }
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = url;
    });
  }

  private isPowerOf2(value: number): boolean {
    return (value & (value - 1)) === 0;
  }

  public createProceduralTexture(
    width: number,
    height: number,
    generator: (x: number, y: number) => [number, number, number, number]
  ): WebGLTexture | null {
    const gl = this.gl;
    const texture = gl.createTexture();
    if (!texture) return null;

    const data = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const [r, g, b, a] = generator(x, y);
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = a;
      }
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);

    if (this.isPowerOf2(width) && this.isPowerOf2(height)) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    return texture;
  }

  public createCheckerboardTexture(size: number = 256, checkerSize: number = 32): WebGLTexture | null {
    return this.createProceduralTexture(size, size, (x, y) => {
      const checkX = Math.floor(x / checkerSize);
      const checkY = Math.floor(y / checkerSize);
      const isWhite = (checkX + checkY) % 2 === 0;
      const value = isWhite ? 240 : 80;
      return [value, value, value, 255];
    });
  }

  public createWoodTexture(width: number = 256, height: number = 256): WebGLTexture | null {
    return this.createProceduralTexture(width, height, (x, y) => {
      const grain = Math.sin(x * 0.1) * 20 + Math.sin(y * 0.05) * 10;
      const base = 139 + grain;
      return [
        Math.max(0, Math.min(255, base * 0.7)),
        Math.max(0, Math.min(255, base * 0.5)),
        Math.max(0, Math.min(255, base * 0.3)),
        255
      ];
    });
  }

  public createFabricTexture(width: number = 256, height: number = 256, color: [number, number, number] = [200, 50, 50]): WebGLTexture | null {
    return this.createProceduralTexture(width, height, (x, y) => {
      const noise = (Math.random() - 0.5) * 30;
      return [
        Math.max(0, Math.min(255, color[0] + noise)),
        Math.max(0, Math.min(255, color[1] + noise)),
        Math.max(0, Math.min(255, color[2] + noise)),
        255
      ];
    });
  }

  public dispose() {
    this.textureCache.forEach(texture => {
      this.gl.deleteTexture(texture);
    });
    this.textureCache.clear();
  }
}

