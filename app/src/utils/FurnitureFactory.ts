import { vec3 } from 'gl-matrix';
import { FurnitureObject, FurniturePart, GeometryData } from '../types/FurnitureObject';

export class FurnitureFactory {
  private gl: WebGL2RenderingContext;
  private nextId = 0;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  private generateId(): string {
    return `furniture_${this.nextId++}`;
  }

  private createBox(width: number, height: number, depth: number): GeometryData {
    const w = width / 2;
    const h = height / 2;
    const d = depth / 2;

    const vertices = new Float32Array([
      // Front face
      -w, -h,  d,   0,  0,  1,   0, 0,
       w, -h,  d,   0,  0,  1,   1, 0,
       w,  h,  d,   0,  0,  1,   1, 1,
      -w,  h,  d,   0,  0,  1,   0, 1,

      // Back face
      -w, -h, -d,   0,  0, -1,   1, 0,
      -w,  h, -d,   0,  0, -1,   1, 1,
       w,  h, -d,   0,  0, -1,   0, 1,
       w, -h, -d,   0,  0, -1,   0, 0,

      // Top face
      -w,  h, -d,   0,  1,  0,   0, 1,
      -w,  h,  d,   0,  1,  0,   0, 0,
       w,  h,  d,   0,  1,  0,   1, 0,
       w,  h, -d,   0,  1,  0,   1, 1,

      // Bottom face
      -w, -h, -d,   0, -1,  0,   0, 0,
       w, -h, -d,   0, -1,  0,   1, 0,
       w, -h,  d,   0, -1,  0,   1, 1,
      -w, -h,  d,   0, -1,  0,   0, 1,

      // Right face
       w, -h, -d,   1,  0,  0,   1, 0,
       w,  h, -d,   1,  0,  0,   1, 1,
       w,  h,  d,   1,  0,  0,   0, 1,
       w, -h,  d,   1,  0,  0,   0, 0,

      // Left face
      -w, -h, -d,  -1,  0,  0,   0, 0,
      -w, -h,  d,  -1,  0,  0,   1, 0,
      -w,  h,  d,  -1,  0,  0,   1, 1,
      -w,  h, -d,  -1,  0,  0,   0, 1,
    ]);

    const indices = new Uint16Array([
      0,  1,  2,    0,  2,  3,    // front
      4,  5,  6,    4,  6,  7,    // back
      8,  9, 10,    8, 10, 11,    // top
      12, 13, 14,   12, 14, 15,   // bottom
      16, 17, 18,   16, 18, 19,   // right
      20, 21, 22,   20, 22, 23,   // left
    ]);

    return { vertices, indices };
  }

  private createVAO(geometry: GeometryData): WebGLVertexArrayObject | null {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    if (!vao) return null;

    gl.bindVertexArray(vao);

    // Vertex buffer
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.vertices, gl.STATIC_DRAW);

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
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);

    return vao;
  }

  public createTable(): FurnitureObject {
    const parts: FurniturePart[] = [];

    // Table top
    const topGeom = this.createBox(1.5, 0.1, 1.0);
    const topVAO = this.createVAO(topGeom);
    if (topVAO) {
      parts.push({
        vao: topVAO,
        vertexCount: topGeom.indices.length,
        position: vec3.fromValues(0, 0.75, 0),
        rotation: vec3.fromValues(0, 0, 0),
        scale: vec3.fromValues(1, 1, 1),
        color: vec3.fromValues(0.6, 0.4, 0.2)
      });
    }

    // Four legs
    const legGeom = this.createBox(0.08, 0.7, 0.08);
    const legVAO = this.createVAO(legGeom);
    if (legVAO) {
      const legPositions = [
        vec3.fromValues(-0.65, 0.35, -0.4),
        vec3.fromValues(0.65, 0.35, -0.4),
        vec3.fromValues(-0.65, 0.35, 0.4),
        vec3.fromValues(0.65, 0.35, 0.4)
      ];

      legPositions.forEach(pos => {
        parts.push({
          vao: legVAO,
          vertexCount: legGeom.indices.length,
          position: pos,
          rotation: vec3.fromValues(0, 0, 0),
          scale: vec3.fromValues(1, 1, 1),
          color: vec3.fromValues(0.5, 0.35, 0.18)
        });
      });
    }

    return {
      id: this.generateId(),
      type: 'table',
      parts,
      position: vec3.fromValues(0, 0, 0),
      rotation: 0,
      scale: vec3.fromValues(1, 1, 1),
      selected: false,
      boundingBox: {
        min: vec3.fromValues(-0.75, 0, -0.5),
        max: vec3.fromValues(0.75, 0.8, 0.5)
      }
    };
  }

  public createChair(): FurnitureObject {
    const parts: FurniturePart[] = [];

    // Seat
    const seatGeom = this.createBox(0.5, 0.08, 0.5);
    const seatVAO = this.createVAO(seatGeom);
    if (seatVAO) {
      parts.push({
        vao: seatVAO,
        vertexCount: seatGeom.indices.length,
        position: vec3.fromValues(0, 0.5, 0),
        rotation: vec3.fromValues(0, 0, 0),
        scale: vec3.fromValues(1, 1, 1),
        color: vec3.fromValues(0.6, 0.4, 0.2)
      });
    }

    // Backrest
    const backGeom = this.createBox(0.5, 0.6, 0.08);
    const backVAO = this.createVAO(backGeom);
    if (backVAO) {
      parts.push({
        vao: backVAO,
        vertexCount: backGeom.indices.length,
        position: vec3.fromValues(0, 0.84, -0.21),
        rotation: vec3.fromValues(0, 0, 0),
        scale: vec3.fromValues(1, 1, 1),
        color: vec3.fromValues(0.6, 0.4, 0.2)
      });
    }

    // Four legs
    const legGeom = this.createBox(0.06, 0.5, 0.06);
    const legVAO = this.createVAO(legGeom);
    if (legVAO) {
      const legPositions = [
        vec3.fromValues(-0.18, 0.25, -0.18),
        vec3.fromValues(0.18, 0.25, -0.18),
        vec3.fromValues(-0.18, 0.25, 0.18),
        vec3.fromValues(0.18, 0.25, 0.18)
      ];

      legPositions.forEach(pos => {
        parts.push({
          vao: legVAO,
          vertexCount: legGeom.indices.length,
          position: pos,
          rotation: vec3.fromValues(0, 0, 0),
          scale: vec3.fromValues(1, 1, 1),
          color: vec3.fromValues(0.5, 0.35, 0.18)
        });
      });
    }

    return {
      id: this.generateId(),
      type: 'chair',
      parts,
      position: vec3.fromValues(0, 0, 0),
      rotation: 0,
      scale: vec3.fromValues(1, 1, 1),
      selected: false,
      boundingBox: {
        min: vec3.fromValues(-0.25, 0, -0.25),
        max: vec3.fromValues(0.25, 1.14, 0.25)
      }
    };
  }

  public createBookshelf(): FurnitureObject {
    const parts: FurniturePart[] = [];

    // Sides
    const sideGeom = this.createBox(0.08, 1.5, 0.4);
    const sideVAO = this.createVAO(sideGeom);
    if (sideVAO) {
      parts.push({
        vao: sideVAO,
        vertexCount: sideGeom.indices.length,
        position: vec3.fromValues(-0.46, 0.75, 0),
        rotation: vec3.fromValues(0, 0, 0),
        scale: vec3.fromValues(1, 1, 1),
        color: vec3.fromValues(0.5, 0.35, 0.2)
      });
      parts.push({
        vao: sideVAO,
        vertexCount: sideGeom.indices.length,
        position: vec3.fromValues(0.46, 0.75, 0),
        rotation: vec3.fromValues(0, 0, 0),
        scale: vec3.fromValues(1, 1, 1),
        color: vec3.fromValues(0.5, 0.35, 0.2)
      });
    }

    // Shelves
    const shelfGeom = this.createBox(1.0, 0.06, 0.4);
    const shelfVAO = this.createVAO(shelfGeom);
    if (shelfVAO) {
      for (let i = 0; i < 4; i++) {
        parts.push({
          vao: shelfVAO,
          vertexCount: shelfGeom.indices.length,
          position: vec3.fromValues(0, i * 0.5, 0),
          rotation: vec3.fromValues(0, 0, 0),
          scale: vec3.fromValues(1, 1, 1),
          color: vec3.fromValues(0.55, 0.4, 0.25)
        });
      }
    }

    return {
      id: this.generateId(),
      type: 'bookshelf',
      parts,
      position: vec3.fromValues(0, 0, 0),
      rotation: 0,
      scale: vec3.fromValues(1, 1, 1),
      selected: false,
      boundingBox: {
        min: vec3.fromValues(-0.5, 0, -0.2),
        max: vec3.fromValues(0.5, 1.5, 0.2)
      }
    };
  }

  public createSofa(): FurnitureObject {
    const parts: FurniturePart[] = [];

    // Seat
    const seatGeom = this.createBox(2.0, 0.4, 0.8);
    const seatVAO = this.createVAO(seatGeom);
    if (seatVAO) {
      parts.push({
        vao: seatVAO,
        vertexCount: seatGeom.indices.length,
        position: vec3.fromValues(0, 0.4, 0),
        rotation: vec3.fromValues(0, 0, 0),
        scale: vec3.fromValues(1, 1, 1),
        color: vec3.fromValues(0.2, 0.3, 0.5)
      });
    }

    // Backrest
    const backGeom = this.createBox(2.0, 0.6, 0.2);
    const backVAO = this.createVAO(backGeom);
    if (backVAO) {
      parts.push({
        vao: backVAO,
        vertexCount: backGeom.indices.length,
        position: vec3.fromValues(0, 0.7, -0.3),
        rotation: vec3.fromValues(0, 0, 0),
        scale: vec3.fromValues(1, 1, 1),
        color: vec3.fromValues(0.2, 0.3, 0.5)
      });
    }

    // Armrests
    const armGeom = this.createBox(0.2, 0.5, 0.8);
    const armVAO = this.createVAO(armGeom);
    if (armVAO) {
      parts.push({
        vao: armVAO,
        vertexCount: armGeom.indices.length,
        position: vec3.fromValues(-1.0, 0.45, 0),
        rotation: vec3.fromValues(0, 0, 0),
        scale: vec3.fromValues(1, 1, 1),
        color: vec3.fromValues(0.18, 0.28, 0.48)
      });
      parts.push({
        vao: armVAO,
        vertexCount: armGeom.indices.length,
        position: vec3.fromValues(1.0, 0.45, 0),
        rotation: vec3.fromValues(0, 0, 0),
        scale: vec3.fromValues(1, 1, 1),
        color: vec3.fromValues(0.18, 0.28, 0.48)
      });
    }

    // Base/legs
    const baseGeom = this.createBox(2.0, 0.15, 0.8);
    const baseVAO = this.createVAO(baseGeom);
    if (baseVAO) {
      parts.push({
        vao: baseVAO,
        vertexCount: baseGeom.indices.length,
        position: vec3.fromValues(0, 0.075, 0),
        rotation: vec3.fromValues(0, 0, 0),
        scale: vec3.fromValues(1, 1, 1),
        color: vec3.fromValues(0.15, 0.15, 0.15)
      });
    }

    return {
      id: this.generateId(),
      type: 'sofa',
      parts,
      position: vec3.fromValues(0, 0, 0),
      rotation: 0,
      scale: vec3.fromValues(1, 1, 1),
      selected: false,
      boundingBox: {
        min: vec3.fromValues(-1.1, 0, -0.4),
        max: vec3.fromValues(1.1, 1.0, 0.4)
      }
    };
  }

  public createLamp(): FurnitureObject {
    const parts: FurniturePart[] = [];

    // Base
    const baseGeom = this.createBox(0.2, 0.05, 0.2);
    const baseVAO = this.createVAO(baseGeom);
    if (baseVAO) {
      parts.push({
        vao: baseVAO,
        vertexCount: baseGeom.indices.length,
        position: vec3.fromValues(0, 0.025, 0),
        rotation: vec3.fromValues(0, 0, 0),
        scale: vec3.fromValues(1, 1, 1),
        color: vec3.fromValues(0.3, 0.3, 0.3)
      });
    }

    // Pole
    const poleGeom = this.createBox(0.03, 1.0, 0.03);
    const poleVAO = this.createVAO(poleGeom);
    if (poleVAO) {
      parts.push({
        vao: poleVAO,
        vertexCount: poleGeom.indices.length,
        position: vec3.fromValues(0, 0.55, 0),
        rotation: vec3.fromValues(0, 0, 0),
        scale: vec3.fromValues(1, 1, 1),
        color: vec3.fromValues(0.4, 0.4, 0.4)
      });
    }

    // Lampshade (represented as truncated pyramid / box for simplicity)
    const shadeGeom = this.createBox(0.3, 0.3, 0.3);
    const shadeVAO = this.createVAO(shadeGeom);
    if (shadeVAO) {
      parts.push({
        vao: shadeVAO,
        vertexCount: shadeGeom.indices.length,
        position: vec3.fromValues(0, 1.2, 0),
        rotation: vec3.fromValues(0, 0, 0),
        scale: vec3.fromValues(1, 0.8, 1),
        color: vec3.fromValues(0.9, 0.9, 0.7)
      });
    }

    return {
      id: this.generateId(),
      type: 'lamp',
      parts,
      position: vec3.fromValues(0, 0, 0),
      rotation: 0,
      scale: vec3.fromValues(1, 1, 1),
      selected: false,
      boundingBox: {
        min: vec3.fromValues(-0.15, 0, -0.15),
        max: vec3.fromValues(0.15, 1.35, 0.15)
      }
    };
  }
}

