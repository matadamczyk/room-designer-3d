import * as THREE from 'three';

import { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type ControlMode = 'camera' | 'transform';

export class OrbitControls {
  private controls: ThreeOrbitControls;
  private camera: THREE.Camera;
  private enabled = true;
  private mode: ControlMode = 'camera';
  
  // WASD movement
  private moveSpeed = 0.2;
  private verticalSpeed = 0.15;
  private keys: { [key: string]: boolean } = {};
  private onUpdate: () => void;
  private onModeChange?: (mode: ControlMode) => void;

  constructor(
    domElement: HTMLElement,
    camera: THREE.Camera,
    onUpdate: () => void,
    onModeChange?: (mode: ControlMode) => void
  ) {
    this.camera = camera;
    this.onUpdate = onUpdate;
    this.onModeChange = onModeChange;
    
    // Initialize Three.js OrbitControls
    this.controls = new ThreeOrbitControls(camera, domElement);
    
    // Configure controls
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 50;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent going below ground
    this.controls.minPolarAngle = 0.1;
    this.controls.target.set(0, 1, 0);
    this.controls.screenSpacePanning = true; // Better panning
    
    // Disable default keyboard controls (we handle them manually)
    this.controls.keys = {
      LEFT: '',
      UP: '',
      RIGHT: '',
      BOTTOM: ''
    } as any;
    this.controls.listenToKeyEvents(domElement); // Prevent default key handling
    
    // Listen to changes
    this.controls.addEventListener('change', onUpdate);
    
    // Keyboard controls for WASD movement and mode switching
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
  }

  private onKeyDown(e: KeyboardEvent) {
    if (!this.enabled) return;
    
    const key = e.key.toLowerCase();
    
    // Toggle mode with T key
    if (key === 't') {
      this.toggleMode();
      e.preventDefault();
      return;
    }
    
    this.keys[key] = true;
  }

  private onKeyUp(e: KeyboardEvent) {
    this.keys[e.key.toLowerCase()] = false;
  }

  public toggleMode() {
    this.mode = this.mode === 'camera' ? 'transform' : 'camera';
    this.controls.enabled = this.mode === 'camera';
    console.log(`🔄 Mode switched to: ${this.mode.toUpperCase()}`);
    if (this.onModeChange) {
      this.onModeChange(this.mode);
    }
  }

  public setMode(mode: ControlMode) {
    this.mode = mode;
    this.controls.enabled = mode === 'camera';
    if (this.onModeChange) {
      this.onModeChange(this.mode);
    }
  }

  public getMode(): ControlMode {
    return this.mode;
  }

  public update() {
    if (!this.enabled) return;

    // WASD movement only in camera mode
    if (this.mode === 'camera') {
      // Calculate forward and right vectors based on camera orientation
      const forward = new THREE.Vector3();
      const right = new THREE.Vector3();
      
      // Get camera direction on XZ plane (horizontal movement)
      this.camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      
      // Right direction (perpendicular to forward)
      right.crossVectors(forward, new THREE.Vector3(0, 1, 0));
      right.normalize();

      let moved = false;
      const moveVector = new THREE.Vector3();

      // WASD movement (horizontal)
      if (this.keys['w']) {
        moveVector.addScaledVector(forward, this.moveSpeed);
        moved = true;
      }
      if (this.keys['s']) {
        moveVector.addScaledVector(forward, -this.moveSpeed);
        moved = true;
      }
      if (this.keys['a']) {
        moveVector.addScaledVector(right, -this.moveSpeed);
        moved = true;
      }
      if (this.keys['d']) {
        moveVector.addScaledVector(right, this.moveSpeed);
        moved = true;
      }

      // Q/E for vertical movement (flying)
      if (this.keys['q']) {
        moveVector.y -= this.verticalSpeed;
        moved = true;
      }
      if (this.keys['e']) {
        moveVector.y += this.verticalSpeed;
        moved = true;
      }

      if (moved) {
        // Move both camera position and target together
        this.camera.position.add(moveVector);
        this.controls.target.add(moveVector);
        
        // Clamp target position
        this.controls.target.y = Math.max(0.1, Math.min(10, this.controls.target.y));
        this.controls.target.x = Math.max(-20, Math.min(20, this.controls.target.x));
        this.controls.target.z = Math.max(-20, Math.min(20, this.controls.target.z));
        
        // Clamp camera position to match target constraints
        this.camera.position.y = Math.max(0.1, Math.min(10, this.camera.position.y));
        this.camera.position.x = Math.max(-20, Math.min(20, this.camera.position.x));
        this.camera.position.z = Math.max(-20, Math.min(20, this.camera.position.z));
        
        this.onUpdate();
      }
    }

    // Update OrbitControls (for damping and camera position)
    this.controls.update();
  }

  public getPosition(): THREE.Vector3 {
    return this.camera.position;
  }

  public getTarget(): THREE.Vector3 {
    return this.controls.target;
  }

  public getControls(): ThreeOrbitControls {
    return this.controls;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (this.mode === 'camera') {
      this.controls.enabled = enabled;
    }
  }

  public dispose() {
    this.controls.dispose();
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('keyup', this.onKeyUp.bind(this));
  }
}
