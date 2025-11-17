import * as THREE from 'three';

import { FurnitureObject } from '../types/FurnitureObject';

export class FurnitureFactory {
  private nextId = 0;

  private generateId(): string {
    return `furniture_${this.nextId++}`;
  }

  private createBox(
    width: number,
    height: number,
    depth: number,
    color: THREE.ColorRepresentation,
    position: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
  ): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshPhongMaterial({ 
      color,
      specular: 0x222222,
      shininess: 30
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  public createTable(): FurnitureObject {
    const group = new THREE.Group();

    const top = this.createBox(1.5, 0.1, 1.0, 0x996633, new THREE.Vector3(0, 0.75, 0));
    group.add(top);

    const legPositions = [
      new THREE.Vector3(-0.65, 0.35, -0.4),
      new THREE.Vector3(0.65, 0.35, -0.4),
      new THREE.Vector3(-0.65, 0.35, 0.4),
      new THREE.Vector3(0.65, 0.35, 0.4)
    ];

    legPositions.forEach(pos => {
      const leg = this.createBox(0.08, 0.7, 0.08, 0x805a2e, pos);
      group.add(leg);
    });

    return {
      id: this.generateId(),
      type: 'table',
      group,
      selected: false
    };
  }

  public createChair(): FurnitureObject {
    const group = new THREE.Group();

    const seat = this.createBox(0.5, 0.08, 0.5, 0x996633, new THREE.Vector3(0, 0.5, 0));
    group.add(seat);

    const back = this.createBox(0.5, 0.6, 0.08, 0x996633, new THREE.Vector3(0, 0.84, -0.21));
    group.add(back);

    const legPositions = [
      new THREE.Vector3(-0.18, 0.25, -0.18),
      new THREE.Vector3(0.18, 0.25, -0.18),
      new THREE.Vector3(-0.18, 0.25, 0.18),
      new THREE.Vector3(0.18, 0.25, 0.18)
    ];

    legPositions.forEach(pos => {
      const leg = this.createBox(0.06, 0.5, 0.06, 0x805a2e, pos);
      group.add(leg);
    });

    return {
      id: this.generateId(),
      type: 'chair',
      group,
      selected: false
    };
  }

  public createBookshelf(): FurnitureObject {
    const group = new THREE.Group();

    const leftSide = this.createBox(0.08, 1.5, 0.4, 0x805a33, new THREE.Vector3(-0.46, 0.75, 0));
    group.add(leftSide);

    const rightSide = this.createBox(0.08, 1.5, 0.4, 0x805a33, new THREE.Vector3(0.46, 0.75, 0));
    group.add(rightSide);

    for (let i = 0; i < 4; i++) {
      const shelf = this.createBox(1.0, 0.06, 0.4, 0x8c6640, new THREE.Vector3(0, i * 0.5, 0));
      group.add(shelf);
    }

    return {
      id: this.generateId(),
      type: 'bookshelf',
      group,
      selected: false
    };
  }

  public createSofa(): FurnitureObject {
    const group = new THREE.Group();

    const seat = this.createBox(2.0, 0.4, 0.8, 0x334d80, new THREE.Vector3(0, 0.4, 0));
    group.add(seat);

    const back = this.createBox(2.0, 0.6, 0.2, 0x334d80, new THREE.Vector3(0, 0.7, -0.3));
    group.add(back);

    const leftArm = this.createBox(0.2, 0.5, 0.8, 0x2e477a, new THREE.Vector3(-1.0, 0.45, 0));
    group.add(leftArm);

    const rightArm = this.createBox(0.2, 0.5, 0.8, 0x2e477a, new THREE.Vector3(1.0, 0.45, 0));
    group.add(rightArm);

    const base = this.createBox(2.0, 0.15, 0.8, 0x262626, new THREE.Vector3(0, 0.075, 0));
    group.add(base);

    return {
      id: this.generateId(),
      type: 'sofa',
      group,
      selected: false
    };
  }

  public createLamp(): FurnitureObject {
    const group = new THREE.Group();

    const base = this.createBox(0.2, 0.05, 0.2, 0x4d4d4d, new THREE.Vector3(0, 0.025, 0));
    group.add(base);

    const pole = this.createBox(0.03, 1.0, 0.03, 0x666666, new THREE.Vector3(0, 0.55, 0));
    group.add(pole);

    const shadeGeometry = new THREE.BoxGeometry(0.3, 0.24, 0.3);
    const shadeMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffee88
    });
    const shade = new THREE.Mesh(shadeGeometry, shadeMaterial);
    shade.position.set(0, 1.2, 0);
    shade.castShadow = false;
    shade.receiveShadow = false;
    group.add(shade);

    const light = new THREE.PointLight(0xffeedd, 3.5, 15, 1.5);
    light.position.set(0, 1.2, 0);
    light.castShadow = true;
    
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 15;
    light.shadow.bias = -0.001;
    light.shadow.radius = 2;
    
    group.add(light);

    return {
      id: this.generateId(),
      type: 'lamp',
      group,
      selected: false
    };
  }
}
