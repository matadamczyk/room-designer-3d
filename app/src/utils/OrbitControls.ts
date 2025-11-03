import { vec3 } from 'gl-matrix';

export class OrbitControls {
  private element: HTMLElement;
  private enabled = true;

  private target = vec3.fromValues(0, 1, 0);
  private position = vec3.fromValues(5, 5, 5);
  
  private spherical = {
    radius: 8.66,
    theta: Math.PI / 4,  // azimuth
    phi: Math.PI / 4     // elevation
  };

  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  private rotateSpeed = 0.005;
  private zoomSpeed = 0.1;
  private minDistance = 2;
  private maxDistance = 50;
  
  // WASD movement
  private moveSpeed = 0.15;
  private keys: { [key: string]: boolean } = {};
  private onUpdate: () => void;

  constructor(element: HTMLElement, onUpdate: () => void) {
    this.element = element;
    this.onUpdate = onUpdate;

    this.element.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.element.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.element.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.element.addEventListener('wheel', this.onWheel.bind(this));
    this.element.addEventListener('contextmenu', (e) => e.preventDefault());

    // Keyboard controls
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));

    this.updatePosition();
    onUpdate();
  }

  private onMouseDown(e: MouseEvent) {
    if (!this.enabled) return;
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private onMouseMove(e: MouseEvent) {
    if (!this.enabled || !this.isDragging) return;

    const deltaX = e.clientX - this.lastMouseX;
    const deltaY = e.clientY - this.lastMouseY;

    this.spherical.theta -= deltaX * this.rotateSpeed;
    this.spherical.phi -= deltaY * this.rotateSpeed;

    // Clamp phi to avoid gimbal lock
    this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi));

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    this.updatePosition();
  }

  private onMouseUp() {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent) {
    if (!this.enabled) return;
    e.preventDefault();

    this.spherical.radius += e.deltaY * this.zoomSpeed * 0.01;
    this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius));

    this.updatePosition();
  }

  private updatePosition() {
    // Convert spherical to cartesian
    const sinPhiRadius = Math.sin(this.spherical.phi) * this.spherical.radius;
    
    this.position[0] = this.target[0] + sinPhiRadius * Math.sin(this.spherical.theta);
    this.position[1] = this.target[1] + Math.cos(this.spherical.phi) * this.spherical.radius;
    this.position[2] = this.target[2] + sinPhiRadius * Math.cos(this.spherical.theta);
  }

  private onKeyDown(e: KeyboardEvent) {
    if (!this.enabled) return;
    this.keys[e.key.toLowerCase()] = true;
  }

  private onKeyUp(e: KeyboardEvent) {
    this.keys[e.key.toLowerCase()] = false;
  }

  public update() {
    if (!this.enabled) return;

    // Calculate forward and right vectors based on camera orientation
    const forward = vec3.create();
    const right = vec3.create();
    
    // Forward direction (on XZ plane)
    forward[0] = -Math.sin(this.spherical.theta);
    forward[1] = 0;
    forward[2] = -Math.cos(this.spherical.theta);
    vec3.normalize(forward, forward);
    
    // Right direction (perpendicular to forward on XZ plane)
    right[0] = Math.cos(this.spherical.theta);
    right[1] = 0;
    right[2] = -Math.sin(this.spherical.theta);
    vec3.normalize(right, right);

    let moved = false;

    // WASD movement
    if (this.keys['w']) {
      vec3.scaleAndAdd(this.target, this.target, forward, this.moveSpeed);
      moved = true;
    }
    if (this.keys['s']) {
      vec3.scaleAndAdd(this.target, this.target, forward, -this.moveSpeed);
      moved = true;
    }
    if (this.keys['a']) {
      vec3.scaleAndAdd(this.target, this.target, right, -this.moveSpeed);
      moved = true;
    }
    if (this.keys['d']) {
      vec3.scaleAndAdd(this.target, this.target, right, this.moveSpeed);
      moved = true;
    }

    // Q/E for vertical movement
    if (this.keys['q']) {
      this.target[1] -= this.moveSpeed;
      moved = true;
    }
    if (this.keys['e']) {
      this.target[1] += this.moveSpeed;
      moved = true;
    }

    if (moved) {
      this.updatePosition();
      this.onUpdate();
    }
  }

  public getPosition(): vec3 {
    return this.position;
  }

  public getTarget(): vec3 {
    return this.target;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public dispose() {
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('keyup', this.onKeyUp.bind(this));
  }
}