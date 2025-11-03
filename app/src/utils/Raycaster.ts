import { vec3, mat4 } from 'gl-matrix';
import { FurnitureObject } from '../types/FurnitureObject';

export class Raycaster {
  private ray: { origin: vec3; direction: vec3 } = {
    origin: vec3.create(),
    direction: vec3.create()
  };

  public setFromCamera(
    mouseX: number,
    mouseY: number,
    width: number,
    height: number,
    projectionMatrix: mat4,
    viewMatrix: mat4,
    cameraPosition: vec3
  ): void {
    // Convert mouse coordinates to NDC (Normalized Device Coordinates)
    const x = (mouseX / width) * 2 - 1;
    const y = -(mouseY / height) * 2 + 1;

    // Create inverse projection-view matrix
    const invMatrix = mat4.create();
    mat4.multiply(invMatrix, projectionMatrix, viewMatrix);
    mat4.invert(invMatrix, invMatrix);

    // Near and far points in NDC
    const nearPoint = vec3.fromValues(x, y, -1);
    const farPoint = vec3.fromValues(x, y, 1);

    // Transform to world space
    vec3.transformMat4(nearPoint, nearPoint, invMatrix);
    vec3.transformMat4(farPoint, farPoint, invMatrix);

    // Set ray
    vec3.copy(this.ray.origin, cameraPosition);
    vec3.subtract(this.ray.direction, farPoint, nearPoint);
    vec3.normalize(this.ray.direction, this.ray.direction);
  }

  public intersectFurniture(furniture: FurnitureObject[]): FurnitureObject | null {
    let closestFurniture: FurnitureObject | null = null;
    let closestDistance = Infinity;

    for (const item of furniture) {
      const distance = this.intersectBox(item);
      if (distance !== null && distance < closestDistance) {
        closestDistance = distance;
        closestFurniture = item;
      }
    }

    return closestFurniture;
  }

  private intersectBox(furniture: FurnitureObject): number | null {
    // Transform bounding box by furniture's transform
    const min = vec3.create();
    const max = vec3.create();

    // Apply scale
    vec3.multiply(min, furniture.boundingBox.min, furniture.scale);
    vec3.multiply(max, furniture.boundingBox.max, furniture.scale);

    // Apply rotation (Y-axis only for simplicity)
    const cos = Math.cos(furniture.rotation);
    const sin = Math.sin(furniture.rotation);

    // Rotate bounding box corners
    const corners = [
      vec3.fromValues(min[0], min[1], min[2]),
      vec3.fromValues(max[0], min[1], min[2]),
      vec3.fromValues(min[0], max[1], min[2]),
      vec3.fromValues(max[0], max[1], min[2]),
      vec3.fromValues(min[0], min[1], max[2]),
      vec3.fromValues(max[0], min[1], max[2]),
      vec3.fromValues(min[0], max[1], max[2]),
      vec3.fromValues(max[0], max[1], max[2])
    ];

    // Rotate each corner and find new AABB
    const rotatedMin = vec3.fromValues(Infinity, Infinity, Infinity);
    const rotatedMax = vec3.fromValues(-Infinity, -Infinity, -Infinity);

    corners.forEach(corner => {
      const x = corner[0] * cos - corner[2] * sin;
      const z = corner[0] * sin + corner[2] * cos;
      const rotated = vec3.fromValues(x, corner[1], z);

      rotatedMin[0] = Math.min(rotatedMin[0], rotated[0]);
      rotatedMin[1] = Math.min(rotatedMin[1], rotated[1]);
      rotatedMin[2] = Math.min(rotatedMin[2], rotated[2]);

      rotatedMax[0] = Math.max(rotatedMax[0], rotated[0]);
      rotatedMax[1] = Math.max(rotatedMax[1], rotated[1]);
      rotatedMax[2] = Math.max(rotatedMax[2], rotated[2]);
    });

    // Apply position
    vec3.add(rotatedMin, rotatedMin, furniture.position);
    vec3.add(rotatedMax, rotatedMax, furniture.position);

    // Ray-AABB intersection test
    return this.intersectAABB(rotatedMin, rotatedMax);
  }

  private intersectAABB(min: vec3, max: vec3): number | null {
    const origin = this.ray.origin;
    const dir = this.ray.direction;

    let tmin = (min[0] - origin[0]) / dir[0];
    let tmax = (max[0] - origin[0]) / dir[0];

    if (tmin > tmax) [tmin, tmax] = [tmax, tmin];

    let tymin = (min[1] - origin[1]) / dir[1];
    let tymax = (max[1] - origin[1]) / dir[1];

    if (tymin > tymax) [tymin, tymax] = [tymax, tymin];

    if (tmin > tymax || tymin > tmax) return null;

    if (tymin > tmin) tmin = tymin;
    if (tymax < tmax) tmax = tymax;

    let tzmin = (min[2] - origin[2]) / dir[2];
    let tzmax = (max[2] - origin[2]) / dir[2];

    if (tzmin > tzmax) [tzmin, tzmax] = [tzmax, tzmin];

    if (tmin > tzmax || tzmin > tmax) return null;

    if (tzmin > tmin) tmin = tzmin;
    if (tzmax < tmax) tmax = tzmax;

    // Return the closest intersection distance
    return tmin > 0 ? tmin : (tmax > 0 ? tmax : null);
  }
}

