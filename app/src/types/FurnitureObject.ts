import * as THREE from 'three';

export interface FurnitureObject {
  id: string;
  type: 'table' | 'chair' | 'bookshelf' | 'sofa' | 'lamp';
  group: THREE.Group;  // Main container for all parts
  selected: boolean;
}

export interface SceneObject {
  id: string;
  name: string;
  type: 'floor' | 'walls' | 'furniture';
  object: THREE.Object3D;  // The actual Three.js object (Mesh or Group)
  selected: boolean;
  furnitureRef?: FurnitureObject; // Reference if type is 'furniture'
}

