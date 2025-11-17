import * as THREE from 'three';

import { FurnitureObject, SceneObject } from '../types/FurnitureObject';

import { FurnitureFactory } from './FurnitureFactory';

export class RoomScene {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  
  private textureLoader: THREE.TextureLoader;
  private furnitureFactory: FurnitureFactory;
  
  private floor: THREE.Mesh | null = null;
  private walls: THREE.Group | null = null;
  private furniture: FurnitureObject[] = [];
  private sceneObjects: SceneObject[] = [];
  private selectedObject: SceneObject | null = null;
  
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  
  public shadowsEnabled = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    
    this.renderer = new THREE.WebGLRenderer({ 
      canvas,
      antialias: true 
    });
    this.renderer.setSize(canvas.width, canvas.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    
    this.camera = new THREE.PerspectiveCamera(
      45,
      canvas.width / canvas.height,
      0.1,
      100
    );
    this.camera.position.set(8, 6, 8);
    this.camera.lookAt(0, 1, 0);
    
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.textureLoader = new THREE.TextureLoader();
    this.textureLoader.setCrossOrigin('anonymous');
    
    this.furnitureFactory = new FurnitureFactory();
    
    this.ambientLight = new THREE.AmbientLight(0x4d4d59, 0.3);
    this.scene.add(this.ambientLight);
    
    this.directionalLight = new THREE.DirectionalLight(0xfff2f2, 0.8);
    this.directionalLight.position.set(5, 10, 5);
    this.directionalLight.castShadow = true;
    
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 50;
    this.directionalLight.shadow.camera.left = -15;
    this.directionalLight.shadow.camera.right = 15;
    this.directionalLight.shadow.camera.top = 15;
    this.directionalLight.shadow.camera.bottom = -15;
    this.directionalLight.shadow.bias = -0.001;
    
    this.scene.add(this.directionalLight);
    
    this.createRoom();
    
    this.initializeSceneObjects();
  }

  private createRoom() {
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.9
    });
    this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.receiveShadow = true;
    this.floor.name = 'floor';
    this.scene.add(this.floor);
    
    this.createProceduralFloorTexture();
    
    this.walls = new THREE.Group();
    this.walls.name = 'walls';
    
    const wallMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xffffff,
      side: THREE.DoubleSide,
      specular: 0x111111,
      shininess: 30
    });
    
    const size = 10;
    const height = 5;
    
    const windowWidth = 3;
    const windowHeight = 2;
    const windowY = 2.5;
    
    const backLeftWall = new THREE.Mesh(
      new THREE.PlaneGeometry((size * 2 - windowWidth) / 2, height),
      wallMaterial.clone()
    );
    backLeftWall.position.set(-(size * 2 - windowWidth) / 4 - windowWidth / 2, height / 2, -size);
    backLeftWall.receiveShadow = true;
    this.walls.add(backLeftWall);
    
    const backRightWall = new THREE.Mesh(
      new THREE.PlaneGeometry((size * 2 - windowWidth) / 2, height),
      wallMaterial.clone()
    );
    backRightWall.position.set((size * 2 - windowWidth) / 4 + windowWidth / 2, height / 2, -size);
    backRightWall.receiveShadow = true;
    this.walls.add(backRightWall);
    
    const backTopWall = new THREE.Mesh(
      new THREE.PlaneGeometry(windowWidth, height - windowY - windowHeight / 2),
      wallMaterial.clone()
    );
    backTopWall.position.set(0, windowY + windowHeight / 2 + (height - windowY - windowHeight / 2) / 2, -size);
    backTopWall.receiveShadow = true;
    this.walls.add(backTopWall);
    
    const backBottomWall = new THREE.Mesh(
      new THREE.PlaneGeometry(windowWidth, windowY - windowHeight / 2),
      wallMaterial.clone()
    );
    backBottomWall.position.set(0, (windowY - windowHeight / 2) / 2, -size);
    backBottomWall.receiveShadow = true;
    this.walls.add(backBottomWall);
    
    this.createWindow(0, windowY, -size + 0.01, windowWidth, windowHeight, 0);
    
    const rightWindowWidth = 2.5;
    const rightWindowHeight = 2;
    const rightWindowY = 2.5;
    
    const rightLeftWall = new THREE.Mesh(
      new THREE.PlaneGeometry((size * 2 - rightWindowWidth) / 2, height),
      wallMaterial.clone()
    );
    rightLeftWall.position.set(size, height / 2, -(size * 2 - rightWindowWidth) / 4 - rightWindowWidth / 2);
    rightLeftWall.rotation.y = -Math.PI / 2;
    rightLeftWall.receiveShadow = true;
    this.walls.add(rightLeftWall);
    
    const rightRightWall = new THREE.Mesh(
      new THREE.PlaneGeometry((size * 2 - rightWindowWidth) / 2, height),
      wallMaterial.clone()
    );
    rightRightWall.position.set(size, height / 2, (size * 2 - rightWindowWidth) / 4 + rightWindowWidth / 2);
    rightRightWall.rotation.y = -Math.PI / 2;
    rightRightWall.receiveShadow = true;
    this.walls.add(rightRightWall);
    
    const rightTopWall = new THREE.Mesh(
      new THREE.PlaneGeometry(rightWindowWidth, height - rightWindowY - rightWindowHeight / 2),
      wallMaterial.clone()
    );
    rightTopWall.position.set(size, rightWindowY + rightWindowHeight / 2 + (height - rightWindowY - rightWindowHeight / 2) / 2, 0);
    rightTopWall.rotation.y = -Math.PI / 2;
    rightTopWall.receiveShadow = true;
    this.walls.add(rightTopWall);
    
    const rightBottomWall = new THREE.Mesh(
      new THREE.PlaneGeometry(rightWindowWidth, rightWindowY - rightWindowHeight / 2),
      wallMaterial.clone()
    );
    rightBottomWall.position.set(size, (rightWindowY - rightWindowHeight / 2) / 2, 0);
    rightBottomWall.rotation.y = -Math.PI / 2;
    rightBottomWall.receiveShadow = true;
    this.walls.add(rightBottomWall);
    
    this.createWindow(size - 0.01, rightWindowY, 0, rightWindowWidth, rightWindowHeight, -Math.PI / 2);
    
    const leftWindowWidth = 2.5;
    const leftWindowHeight = 2;
    const leftWindowY = 2.5;
    
    const leftLeftWall = new THREE.Mesh(
      new THREE.PlaneGeometry((size * 2 - leftWindowWidth) / 2, height),
      wallMaterial.clone()
    );
    leftLeftWall.position.set(-size, height / 2, (size * 2 - leftWindowWidth) / 4 + leftWindowWidth / 2);
    leftLeftWall.rotation.y = Math.PI / 2;
    leftLeftWall.receiveShadow = true;
    this.walls.add(leftLeftWall);
    
    const leftRightWall = new THREE.Mesh(
      new THREE.PlaneGeometry((size * 2 - leftWindowWidth) / 2, height),
      wallMaterial.clone()
    );
    leftRightWall.position.set(-size, height / 2, -(size * 2 - leftWindowWidth) / 4 - leftWindowWidth / 2);
    leftRightWall.rotation.y = Math.PI / 2;
    leftRightWall.receiveShadow = true;
    this.walls.add(leftRightWall);
    
    const leftTopWall = new THREE.Mesh(
      new THREE.PlaneGeometry(leftWindowWidth, height - leftWindowY - leftWindowHeight / 2),
      wallMaterial.clone()
    );
    leftTopWall.position.set(-size, leftWindowY + leftWindowHeight / 2 + (height - leftWindowY - leftWindowHeight / 2) / 2, 0);
    leftTopWall.rotation.y = Math.PI / 2;
    leftTopWall.receiveShadow = true;
    this.walls.add(leftTopWall);
    
    const leftBottomWall = new THREE.Mesh(
      new THREE.PlaneGeometry(leftWindowWidth, leftWindowY - leftWindowHeight / 2),
      wallMaterial.clone()
    );
    leftBottomWall.position.set(-size, (leftWindowY - leftWindowHeight / 2) / 2, 0);
    leftBottomWall.rotation.y = Math.PI / 2;
    leftBottomWall.receiveShadow = true;
    this.walls.add(leftBottomWall);
    
    this.createWindow(-size + 0.01, leftWindowY, 0, leftWindowWidth, leftWindowHeight, Math.PI / 2);
    
    const doorWidth = 2;
    const doorHeight = 3.5;
    
    const leftWallWidth = size - doorWidth / 2;
    const frontLeftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(leftWallWidth, height),
      wallMaterial.clone()
    );
    frontLeftWall.position.set(-size + leftWallWidth / 2, height / 2, size);
    frontLeftWall.rotation.y = Math.PI;
    frontLeftWall.receiveShadow = true;
    this.walls.add(frontLeftWall);
    
    const rightWallWidth = size - doorWidth / 2;
    const frontRightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(rightWallWidth, height),
      wallMaterial.clone()
    );
    frontRightWall.position.set(size - rightWallWidth / 2, height / 2, size);
    frontRightWall.rotation.y = Math.PI;
    frontRightWall.receiveShadow = true;
    this.walls.add(frontRightWall);
    
    const topWallHeight = height - doorHeight;
    const frontTopWall = new THREE.Mesh(
      new THREE.PlaneGeometry(doorWidth, topWallHeight),
      wallMaterial.clone()
    );
    frontTopWall.position.set(0, doorHeight + topWallHeight / 2, size);
    frontTopWall.rotation.y = Math.PI;
    frontTopWall.receiveShadow = true;
    this.walls.add(frontTopWall);
    
    this.scene.add(this.walls);
    
    this.createDoor(0, 0, size - 0.2, doorWidth, doorHeight);
    
    this.createProceduralWallTexture();
  }

  private createWindow(x: number, y: number, z: number, width: number, height: number, rotationY: number) {
    const windowGroup = new THREE.Group();
    windowGroup.name = 'window';
    
    const frameMaterial = new THREE.MeshPhongMaterial({
      color: 0x8b4513,
      specular: 0x222222,
      shininess: 20
    });
    
    const frameThickness = 0.15;
    const frameDepth = 0.2;
    
    const topFrame = new THREE.Mesh(
      new THREE.BoxGeometry(width + frameThickness * 2, frameThickness, frameDepth),
      frameMaterial
    );
    topFrame.position.set(0, height / 2, 0);
    windowGroup.add(topFrame);
    
    const bottomFrame = new THREE.Mesh(
      new THREE.BoxGeometry(width + frameThickness * 2, frameThickness, frameDepth),
      frameMaterial
    );
    bottomFrame.position.set(0, -height / 2, 0);
    windowGroup.add(bottomFrame);
    
    const leftFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, height, frameDepth),
      frameMaterial
    );
    leftFrame.position.set(-width / 2, 0, 0);
    windowGroup.add(leftFrame);
    
    const rightFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, height, frameDepth),
      frameMaterial
    );
    rightFrame.position.set(width / 2, 0, 0);
    windowGroup.add(rightFrame);
    
    const glassMaterial = new THREE.MeshPhongMaterial({
      color: 0x87ceeb,
      transparent: true,
      opacity: 0.3,
      specular: 0xffffff,
      shininess: 100
    });
    
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      glassMaterial
    );
    glass.position.z = frameDepth / 2 + 0.01;
    windowGroup.add(glass);
    
    const sillMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      specular: 0x111111,
      shininess: 30
    });
    
    const sill = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.2, 0.1, 0.3),
      sillMaterial
    );
    sill.position.set(0, -height / 2 - 0.05, 0.1);
    windowGroup.add(sill);
    
    windowGroup.position.set(x, y, z);
    windowGroup.rotation.y = rotationY;
    windowGroup.receiveShadow = true;
    windowGroup.castShadow = true;
    
    this.scene.add(windowGroup);
  }

  private createDoor(x: number, y: number, z: number, width: number, height: number) {
    const doorGroup = new THREE.Group();
    doorGroup.name = 'door';
    
    const frameMaterial = new THREE.MeshPhongMaterial({
      color: 0x8b4513,
      specular: 0x222222,
      shininess: 20
    });
    
    const frameThickness = 0.2;
    const frameDepth = 0.15;
    
    const leftFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, height + frameThickness * 2, frameDepth),
      frameMaterial
    );
    leftFrame.position.set(-width / 2 - frameThickness / 2, height / 2, 0);
    doorGroup.add(leftFrame);
    
    const rightFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, height + frameThickness * 2, frameDepth),
      frameMaterial
    );
    rightFrame.position.set(width / 2 + frameThickness / 2, height / 2, 0);
    doorGroup.add(rightFrame);
    
    const topFrame = new THREE.Mesh(
      new THREE.BoxGeometry(width + frameThickness * 2, frameThickness, frameDepth),
      frameMaterial
    );
    topFrame.position.set(0, height + frameThickness / 2, 0);
    doorGroup.add(topFrame);
    
    const doorMaterial = new THREE.MeshPhongMaterial({
      color: 0x654321,
      specular: 0x111111,
      shininess: 25
    });
    
    const doorPanel = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, 0.1),
      doorMaterial
    );
    doorPanel.position.set(0, height / 2, -frameDepth / 2 - 0.05);
    doorPanel.castShadow = true;
    doorPanel.receiveShadow = true;
    doorGroup.add(doorPanel);
    
    const handleMaterial = new THREE.MeshPhongMaterial({
      color: 0xc0c0c0,
      specular: 0xffffff,
      shininess: 100
    });
    
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.1, 16),
      handleMaterial
    );
    handle.rotation.z = Math.PI / 2;
    handle.position.set(width / 2 - 0.2, height / 2, -frameDepth / 2 - 0.05);
    doorGroup.add(handle);
    
    doorGroup.position.set(x, y, z);
    doorGroup.receiveShadow = true;
    doorGroup.castShadow = true;
    
    this.scene.add(doorGroup);
  }

  private createProceduralFloorTexture() {
    if (!this.floor) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const plankWidth = 64;
    const plankHeight = 8;
    
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const plankY = Math.floor(y / plankHeight);
        const localX = x % plankWidth;
        const localY = y % plankHeight;
        
        const grain = Math.sin(localX * 0.3 + plankY * 13) * 8;
        const knots = Math.sin(localX * 0.1) * Math.sin(localY * 0.5) * 5;
        
        const base = 120 + grain + knots + (Math.random() - 0.5) * 15;
        
        const borderSize = 2;
        const isBorder = localX < borderSize || localX >= plankWidth - borderSize || 
                         localY < borderSize || localY >= plankHeight - borderSize;
        
        const r = isBorder ? base * 0.5 : base * 0.7;
        const g = isBorder ? base * 0.4 : base * 0.5;
        const b = isBorder ? base * 0.3 : base * 0.35;
        
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 10);
    
    const material = this.floor.material as THREE.MeshStandardMaterial;
    material.map = texture;
    material.needsUpdate = true;
  }

  private createProceduralWallTexture() {
    if (!this.walls) return;
    
    const texture = this.createProceduralTexture('brick');
    if (!texture) return;
    
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    const brickWidth = 1.5;
    const brickHeight = 1.5;
    
    this.walls.children.forEach(child => {
      if (child instanceof THREE.Mesh) {
        const geometry = child.geometry as THREE.PlaneGeometry;
        const material = child.material as THREE.MeshPhongMaterial;
        
        const wallWidth = geometry.parameters.width;
        const wallHeight = geometry.parameters.height;
        
        const repeatX = wallWidth / brickWidth;
        const repeatY = wallHeight / brickHeight;
        
        material.map = texture.clone();
        material.map.repeat.set(repeatX, repeatY);
        material.needsUpdate = true;
      }
    });
  }

  private initializeSceneObjects() {
    if (this.floor) {
      this.sceneObjects.push({
        id: 'floor',
        name: 'Floor',
        type: 'floor',
        object: this.floor,
        selected: false
      });
    }

    if (this.walls) {
      this.sceneObjects.push({
        id: 'walls',
        name: 'Walls',
        type: 'walls',
        object: this.walls,
        selected: false
      });
    }
  }

  public updateAspect() {
    this.camera.aspect = this.canvas.width / this.canvas.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvas.width, this.canvas.height);
  }

  public render() {
    this.renderer.render(this.scene, this.camera);
  }

  public setCamera(position: THREE.Vector3, target: THREE.Vector3) {
    this.camera.position.copy(position);
    this.camera.lookAt(target);
  }

  public getCameraPosition(): THREE.Vector3 {
    return this.camera.position;
  }

  public getCameraTarget(): THREE.Vector3 {
    const target = new THREE.Vector3();
    this.camera.getWorldDirection(target);
    target.add(this.camera.position);
    return target;
  }

  public getCamera(): THREE.Camera {
    return this.camera;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  public getScene(): THREE.Scene {
    return this.scene;
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
        furniture.group.traverse((child) => {
          if (child instanceof THREE.PointLight) {
            child.visible = true;
          }
        });
        break;
    }

    this.furniture.push(furniture);
    this.scene.add(furniture.group);
    
    const sceneObj: SceneObject = {
      id: furniture.id,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} #${furniture.id.split('_')[1]}`,
      type: 'furniture',
      object: furniture.group,
      selected: false,
      furnitureRef: furniture
    };
    this.sceneObjects.push(sceneObj);
    
    return furniture;
  }

  public removeFurniture(furniture: FurnitureObject) {
    const index = this.furniture.indexOf(furniture);
    if (index > -1) {
      this.furniture.splice(index, 1);
      this.scene.remove(furniture.group);
      
      const objIndex = this.sceneObjects.findIndex(obj => obj.furnitureRef === furniture);
      if (objIndex > -1) {
        this.sceneObjects.splice(objIndex, 1);
      }
      
      if (this.selectedObject?.furnitureRef === furniture) {
        this.selectedObject = null;
      }
    }
  }

  public selectObject(mouseX: number, mouseY: number): SceneObject | null {
    this.mouse.x = (mouseX / this.canvas.width) * 2 - 1;
    this.mouse.y = -(mouseY / this.canvas.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    this.sceneObjects.forEach(obj => {
      obj.selected = false;
      this.updateSelectionHighlight(obj, false);
    });

    const intersectableObjects: THREE.Object3D[] = [];
    
    if (this.floor) {
      intersectableObjects.push(this.floor);
    }
    
    if (this.walls) {
      this.walls.children.forEach(child => {
        intersectableObjects.push(child);
      });
    }
    
    this.furniture.forEach(item => {
      intersectableObjects.push(item.group);
    });

    const intersects = this.raycaster.intersectObjects(intersectableObjects, true);

    if (intersects.length > 0) {
      let hitObject = intersects[0].object;
      
      while (hitObject.parent && hitObject.parent !== this.scene) {
        hitObject = hitObject.parent;
      }
      
      const sceneObj = this.sceneObjects.find(obj => {
        if (obj.type === 'floor') {
          return hitObject === this.floor;
        } else if (obj.type === 'walls') {
          return this.walls?.children.includes(hitObject as THREE.Object3D);
        } else if (obj.type === 'furniture') {
          return obj.furnitureRef?.group === hitObject;
        }
        return false;
      });
      
      if (sceneObj) {
        sceneObj.selected = true;
        this.selectedObject = sceneObj;
        this.updateSelectionHighlight(sceneObj, true);
        console.log(`Selected: ${sceneObj.name}`);
        return sceneObj;
      }
    }

    this.selectedObject = null;
    return null;
  }

  private updateSelectionHighlight(obj: SceneObject, selected: boolean) {
    const highlightColor = selected ? 0.3 : 0;
    
    if (obj.type === 'floor' && this.floor) {
      const material = this.floor.material as THREE.MeshStandardMaterial;
      material.emissive.setHex(selected ? 0xffff77 : 0x000000);
      material.emissiveIntensity = highlightColor;
    } else if (obj.type === 'walls' && this.walls) {
      this.walls.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          const material = child.material as THREE.MeshPhongMaterial;
          material.emissive.setHex(selected ? 0xffff77 : 0x000000);
          material.emissiveIntensity = highlightColor;
        }
      });
    } else if (obj.type === 'furniture' && obj.furnitureRef) {
      obj.furnitureRef.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const material = child.material as any;
          if (material.emissive) {
            material.emissive.setHex(selected ? 0xffff77 : 0x000000);
            material.emissiveIntensity = highlightColor;
          }
        }
      });
    }
  }

  public getSelectedObject(): SceneObject | null {
    return this.selectedObject;
  }

  public clearSelection() {
    this.sceneObjects.forEach(obj => {
      obj.selected = false;
      this.updateSelectionHighlight(obj, false);
    });
    this.selectedObject = null;
  }

  private createProceduralTexture(type: string): THREE.Texture | null {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    switch (type) {
      case 'wood-parquet': {
        const plankWidth = 64;
        const plankHeight = 8;
        
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const plankY = Math.floor(y / plankHeight);
            const localX = x % plankWidth;
            const localY = y % plankHeight;
            
            const grain = Math.sin(localX * 0.3 + plankY * 13) * 8;
            const knots = Math.sin(localX * 0.1) * Math.sin(localY * 0.5) * 5;
            const base = 120 + grain + knots + (Math.random() - 0.5) * 15;
            
            const borderSize = 2;
            const isBorder = localX < borderSize || localX >= plankWidth - borderSize || 
                             localY < borderSize || localY >= plankHeight - borderSize;
            
            const r = isBorder ? base * 0.5 : base * 0.7;
            const g = isBorder ? base * 0.4 : base * 0.5;
            const b = isBorder ? base * 0.3 : base * 0.35;
            
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(x, y, 1, 1);
          }
        }
        break;
      }

      case 'painted-wall': {
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const baseR = 235, baseG = 225, baseB = 210;
            const variation = (Math.sin(x * 0.02) * Math.cos(y * 0.03) + 
                              Math.sin(x * 0.05 + y * 0.04)) * 8;
            const noise = (Math.random() - 0.5) * 10;
            
            const r = Math.max(0, Math.min(255, baseR + variation + noise));
            const g = Math.max(0, Math.min(255, baseG + variation + noise));
            const b = Math.max(0, Math.min(255, baseB + variation + noise));
            
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(x, y, 1, 1);
          }
        }
        break;
      }

      case 'brick': {
        const brickW = 128, brickH = 32, mortarSize = 4;
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const row = Math.floor(y / brickH);
            const offsetX = (row % 2) * (brickW / 2);
            const localX = (x + offsetX) % brickW;
            const localY = y % brickH;
            
            const isMortar = localX < mortarSize || localY < mortarSize;
            
            if (isMortar) {
              ctx.fillStyle = `rgb(180,180,180)`;
            } else {
              const variation = (Math.random() - 0.5) * 30;
              const r = 150 + variation;
              const g = 80 + variation;
              const b = 60 + variation;
              ctx.fillStyle = `rgb(${r},${g},${b})`;
            }
            ctx.fillRect(x, y, 1, 1);
          }
        }
        break;
      }

      case 'checkerboard': {
        const size = 64;
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const checkX = Math.floor(x / size);
            const checkY = Math.floor(y / size);
            const isWhite = (checkX + checkY) % 2 === 0;
            const value = isWhite ? 240 : 40;
            ctx.fillStyle = `rgb(${value},${value},${value})`;
            ctx.fillRect(x, y, 1, 1);
          }
        }
        break;
      }

      case 'oak': {
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const grain = Math.sin(x * 0.1) * 15 + Math.sin(y * 0.05) * 8;
            const base = 160 + grain;
            const r = Math.max(0, Math.min(255, base * 0.65));
            const g = Math.max(0, Math.min(255, base * 0.45));
            const b = Math.max(0, Math.min(255, base * 0.30));
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(x, y, 1, 1);
          }
        }
        break;
      }

      case 'fabric': {
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const weave = Math.sin(x * 0.5) * Math.sin(y * 0.5) * 20;
            const base = 120 + weave + (Math.random() - 0.5) * 30;
            ctx.fillStyle = `rgb(${base},${base * 0.9},${base * 0.8})`;
            ctx.fillRect(x, y, 1, 1);
          }
        }
        break;
      }

      case 'metal': {
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const brushed = Math.sin(x * 0.2) * 10;
            const base = 180 + brushed + (Math.random() - 0.5) * 20;
            ctx.fillStyle = `rgb(${base},${base},${base})`;
            ctx.fillRect(x, y, 1, 1);
          }
        }
        break;
      }

      default:
        return null;
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  public async loadTextureToSelected(url: string): Promise<boolean> {
    if (!this.selectedObject) {
      console.warn('No object selected');
      return false;
    }

    try {
      console.log(`Loading texture from: ${url}`);
      
      let texture: THREE.Texture;

      if (url.startsWith('procedural://')) {
        const type = url.replace('procedural://', '');
        const proceduralTexture = this.createProceduralTexture(type);
        if (!proceduralTexture) {
          console.error('Unknown procedural texture type:', type);
          return false;
        }
        texture = proceduralTexture;
        console.log('✅ Procedural texture created successfully!');
      } else {
        texture = await new Promise<THREE.Texture>((resolve, reject) => {
          this.textureLoader.load(
            url,
            (loadedTexture) => {
              console.log('✅ Texture loaded successfully!');
              resolve(loadedTexture);
            },
            (progress) => {
              if (progress.total > 0) {
                console.log(`Loading progress: ${(progress.loaded / progress.total * 100).toFixed(0)}%`);
              }
            },
            (error) => {
              console.error('❌ Texture loading error:', error);
              reject(error);
            }
          );
        });

        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
      }
      
      if (this.selectedObject.type === 'floor' && this.floor) {
        texture.repeat.set(10, 10);
        const material = this.floor.material as THREE.MeshStandardMaterial;
        material.map = texture;
        material.needsUpdate = true;
        console.log(`✅ Texture applied to floor`);
      } else if (this.selectedObject.type === 'walls' && this.walls) {
        const brickWidth = 0.25;
        const brickHeight = 0.08;
        
        this.walls.children.forEach(child => {
          if (child instanceof THREE.Mesh) {
            const geometry = child.geometry as THREE.PlaneGeometry;
            const material = child.material as THREE.MeshPhongMaterial;
            
            const wallWidth = geometry.parameters.width;
            const wallHeight = geometry.parameters.height;
            
            const isBrickTexture = url.includes('brick') || url === 'procedural://brick';
            const baseWidth = isBrickTexture ? brickWidth : 1.0;
            const baseHeight = isBrickTexture ? brickHeight : 1.0;
            
            const repeatX = wallWidth / baseWidth;
            const repeatY = wallHeight / baseHeight;
            
            material.map = texture.clone();
            material.map.repeat.set(repeatX, repeatY);
            material.needsUpdate = true;
          }
        });
        console.log(`✅ Texture applied to walls`);
      } else if (this.selectedObject.type === 'furniture' && this.selectedObject.furnitureRef) {
        texture.repeat.set(1, 1);
        this.selectedObject.furnitureRef.group.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const material = child.material as THREE.MeshPhongMaterial;
            material.map = texture.clone();
            material.needsUpdate = true;
          }
        });
        console.log(`✅ Texture applied to furniture`);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to load texture:', error);
      return false;
    }
  }

  public getAllFurniture(): FurnitureObject[] {
    return this.furniture;
  }

  public setLightDirection(x: number, y: number, z: number) {
    this.directionalLight.position.set(-x * 10, -y * 10, -z * 10);
    if (this.floor && this.floor.material instanceof THREE.ShaderMaterial) {
      const shaderMaterial = this.floor.material as THREE.ShaderMaterial;
      const lightDir = new THREE.Vector3(-x, -y, -z).normalize();
      shaderMaterial.uniforms.uLightDirection.value = lightDir;
    }
  }

  public setLightIntensity(intensity: number) {
    this.directionalLight.intensity = intensity;
  }

  public setShadowsEnabled(enabled: boolean) {
    this.shadowsEnabled = enabled;
    this.renderer.shadowMap.enabled = enabled;
    this.directionalLight.castShadow = enabled;
    
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object !== this.floor && !(this.walls && this.walls.children.includes(object))) {
          object.castShadow = enabled;
        }
        if (object === this.floor || (this.walls && this.walls.children.includes(object))) {
          object.receiveShadow = enabled;
        }
      }
    });
  }

  public dispose() {
    this.renderer.dispose();
    this.scene.clear();
  }
}
