import { vec3 } from 'gl-matrix';

export interface FurniturePart {
  vao: WebGLVertexArrayObject;
  vertexCount: number;
  position: vec3;
  rotation: vec3;
  scale: vec3;
  color: vec3;
}

export interface FurnitureObject {
  id: string;
  type: 'table' | 'chair' | 'bookshelf' | 'sofa' | 'lamp';
  parts: FurniturePart[];
  position: vec3;
  rotation: number; // Y-axis rotation
  scale: vec3;
  selected: boolean;
  boundingBox: {
    min: vec3;
    max: vec3;
  };
}

export interface GeometryData {
  vertices: Float32Array;
  indices: Uint16Array;
}

