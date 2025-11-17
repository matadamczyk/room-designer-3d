import * as THREE from 'three';

export interface FurnitureObject {
  id: string;
  type: 'table' | 'chair' | 'bookshelf' | 'sofa' | 'lamp';
  group: THREE.Group;
  selected: boolean;
}

export interface SceneObject {
  id: string;
  name: string;
  type: 'floor' | 'walls' | 'furniture';
  object: THREE.Object3D;
  selected: boolean;
  furnitureRef?: FurnitureObject;
}

