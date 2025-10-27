import { vec3 } from 'gl-matrix';

export class OrbitControls {
  private element: HTMLElement;
  private enabled = true;

  private target = vec3.fromValues(0, 0, 0);
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

  constructor(element: HTMLElement, onUpdate: () => void) {
    this.element = element;

    this.element.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.element.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.element.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.element.addEventListener('wheel', this.onWheel.bind(this));
    this.element.addEventListener('contextmenu', (e) => e.preventDefault());

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

  public getPosition(): vec3 {
    return this.position;
  }

  public getTarget(): vec3 {
    return this.target;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
}