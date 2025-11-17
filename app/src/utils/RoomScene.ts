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
  
  // Utilities
  private textureLoader: THREE.TextureLoader;
  private furnitureFactory: FurnitureFactory;
  
  // Scene objects
  private floor: THREE.Mesh | null = null;
  private walls: THREE.Group | null = null;
  private furniture: FurnitureObject[] = [];
  private sceneObjects: SceneObject[] = [];
  private selectedObject: SceneObject | null = null;
  
  // Lights
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  
  // Settings
  public shadowsEnabled = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    
    // Initialize Three.js renderer
    this.renderer = new THREE.WebGLRenderer({ 
      canvas,
      antialias: true 
    });
    this.renderer.setSize(canvas.width, canvas.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows with PCF
    
    // Initialize scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
    
    // Initialize camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      canvas.width / canvas.height,
      0.1,
      100
    );
    this.camera.position.set(8, 6, 8);
    this.camera.lookAt(0, 1, 0);
    
    // Initialize raycaster and mouse
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    // Initialize utilities
    this.textureLoader = new THREE.TextureLoader();
    // Configure CORS for external textures
    this.textureLoader.setCrossOrigin('anonymous');
    
    this.furnitureFactory = new FurnitureFactory();
    
    // Initialize lights
    this.ambientLight = new THREE.AmbientLight(0x4d4d59, 0.6);
    this.scene.add(this.ambientLight);
    
    this.directionalLight = new THREE.DirectionalLight(0xfff2f2, 1.0);
    this.directionalLight.position.set(5, 10, 5);
    this.directionalLight.castShadow = true;
    
    // Configure shadow properties
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
    
    // Create room
    this.createRoom();
    
    // Initialize scene objects
    this.initializeSceneObjects();
  }

  private createRoom() {
    // Create floor
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
    
    // Load procedural floor texture
    this.createProceduralFloorTexture();
    
    // Create walls
    this.walls = new THREE.Group();
    this.walls.name = 'walls';
    
    const wallMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      side: THREE.DoubleSide,
      metalness: 0.0,
      roughness: 1.0
    });
    
    const size = 10;
    const height = 5;
    
    // Back wall
    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(size * 2, height),
      wallMaterial.clone()
    );
    backWall.position.set(0, height / 2, -size);
    backWall.receiveShadow = true;
    this.walls.add(backWall);
    
    // Right wall
    const rightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(size * 2, height),
      wallMaterial.clone()
    );
    rightWall.position.set(size, height / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    this.walls.add(rightWall);
    
    // Left wall
    const leftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(size * 2, height),
      wallMaterial.clone()
    );
    leftWall.position.set(-size, height / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    this.walls.add(leftWall);
    
    // Front wall (with door opening) - split into parts
    // Left part
    const frontLeftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(3.5, height),
      wallMaterial.clone()
    );
    frontLeftWall.position.set(-6.75, height / 2, size);
    frontLeftWall.rotation.y = Math.PI;
    frontLeftWall.receiveShadow = true;
    this.walls.add(frontLeftWall);
    
    // Right part
    const frontRightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(3.5, height),
      wallMaterial.clone()
    );
    frontRightWall.position.set(6.75, height / 2, size);
    frontRightWall.rotation.y = Math.PI;
    frontRightWall.receiveShadow = true;
    this.walls.add(frontRightWall);
    
    // Top part (above door)
    const frontTopWall = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 1.5),
      wallMaterial.clone()
    );
    frontTopWall.position.set(0, height - 0.75, size);
    frontTopWall.rotation.y = Math.PI;
    frontTopWall.receiveShadow = true;
    this.walls.add(frontTopWall);
    
    this.scene.add(this.walls);
    
    // Load procedural wall texture
    this.createProceduralWallTexture();
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
        
        // Wood grain effect
        const grain = Math.sin(localX * 0.3 + plankY * 13) * 8;
        const knots = Math.sin(localX * 0.1) * Math.sin(localY * 0.5) * 5;
        
        // Base wood color (warm brown)
        const base = 120 + grain + knots + (Math.random() - 0.5) * 15;
        
        // Plank borders (darker)
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
    
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        // Base color - warm beige
        const baseR = 235;
        const baseG = 225;
        const baseB = 210;
        
        // Add subtle paint texture variation
        const variation = (Math.sin(x * 0.02) * Math.cos(y * 0.03) + 
                          Math.sin(x * 0.05 + y * 0.04)) * 8;
        
        // Small random imperfections
        const noise = (Math.random() - 0.5) * 10;
        
        const r = Math.max(0, Math.min(255, baseR + variation + noise));
        const g = Math.max(0, Math.min(255, baseG + variation + noise));
        const b = Math.max(0, Math.min(255, baseB + variation + noise));
        
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 2);
    
    // Apply texture to all wall parts
    this.walls.children.forEach(child => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshStandardMaterial;
        material.map = texture.clone();
        material.map.repeat.set(4, 2);
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

  // Public API methods
  
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
        break;
    }

    this.furniture.push(furniture);
    this.scene.add(furniture.group);
    
    // Add to scene objects
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
      
      // Remove from scene objects
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
    // Convert mouse position to normalized device coordinates (-1 to +1)
    this.mouse.x = (mouseX / this.canvas.width) * 2 - 1;
    this.mouse.y = -(mouseY / this.canvas.height) * 2 + 1;

    // Update raycaster
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Clear previous selection highlights
    this.sceneObjects.forEach(obj => {
      obj.selected = false;
      this.updateSelectionHighlight(obj, false);
    });

    // Build list of objects to test (all meshes in the scene)
    const intersectableObjects: THREE.Object3D[] = [];
    
    // Add floor
    if (this.floor) {
      intersectableObjects.push(this.floor);
    }
    
    // Add all wall parts
    if (this.walls) {
      this.walls.children.forEach(child => {
        intersectableObjects.push(child);
      });
    }
    
    // Add all furniture groups (will test all children)
    this.furniture.forEach(item => {
      intersectableObjects.push(item.group);
    });

    // Perform raycasting (recursive to hit children)
    const intersects = this.raycaster.intersectObjects(intersectableObjects, true);

    if (intersects.length > 0) {
      // Get the top-level object (floor, walls, or furniture group)
      let hitObject = intersects[0].object;
      
      // Traverse up to find the top-level object
      while (hitObject.parent && hitObject.parent !== this.scene) {
        hitObject = hitObject.parent;
      }
      
      // Find the corresponding scene object
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
          const material = child.material as THREE.MeshStandardMaterial;
          material.emissive.setHex(selected ? 0xffff77 : 0x000000);
          material.emissiveIntensity = highlightColor;
        }
      });
    } else if (obj.type === 'furniture' && obj.furnitureRef) {
      obj.furnitureRef.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const material = child.material as THREE.MeshStandardMaterial;
          material.emissive.setHex(selected ? 0xffff77 : 0x000000);
          material.emissiveIntensity = highlightColor;
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

      // Check if it's a procedural texture
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
        // Load external texture
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
      
      // Apply texture based on object type
      if (this.selectedObject.type === 'floor' && this.floor) {
        texture.repeat.set(10, 10);
        const material = this.floor.material as THREE.MeshStandardMaterial;
        material.map = texture;
        material.needsUpdate = true;
        console.log(`✅ Texture applied to floor`);
      } else if (this.selectedObject.type === 'walls' && this.walls) {
        texture.repeat.set(4, 2);
        this.walls.children.forEach(child => {
          if (child instanceof THREE.Mesh) {
            const material = child.material as THREE.MeshStandardMaterial;
            material.map = texture.clone();
            material.map.repeat.set(4, 2);
            material.needsUpdate = true;
          }
        });
        console.log(`✅ Texture applied to walls`);
      } else if (this.selectedObject.type === 'furniture' && this.selectedObject.furnitureRef) {
        texture.repeat.set(1, 1);
        this.selectedObject.furnitureRef.group.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const material = child.material as THREE.MeshStandardMaterial;
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
  }

  public setLightIntensity(intensity: number) {
    this.directionalLight.intensity = intensity;
  }

  public dispose() {
    this.renderer.dispose();
    this.scene.clear();
  }
}
