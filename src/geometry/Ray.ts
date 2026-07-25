import { GEOMETRIC_EPSILON } from './constants.js';
import type { Point2D } from './Point.js';
import { createPoint } from './Point.js';
import type { Vector2D } from './Vector.js';
import { vectorMagnitude } from './Vector.js';
import { createLine, type Line } from './Line.js';

export interface Ray {
  readonly origin: Point2D;
  readonly direction: Vector2D;
}

export function createRay(origin: Point2D, direction: Vector2D): Ray {
  const mag = vectorMagnitude(direction);
  if (mag < GEOMETRIC_EPSILON) {
    throw new Error('Ray direction vector must be non-zero');
  }
  return { origin, direction };
}

export function rayFromPoints(origin: Point2D, through: Point2D): Ray {
  return createRay(origin, { x: through.x - origin.x, y: through.y - origin.y });
}

export function rayPointAt(ray: Ray, t: number): Point2D {
  if (t < 0) {
    throw new Error('Ray parameter t must be non-negative');
  }
  return createPoint(
    ray.origin.x + ray.direction.x * t,
    ray.origin.y + ray.direction.y * t
  );
}

export function rayContainsPoint(ray: Ray, point: Point2D, epsilon: number = GEOMETRIC_EPSILON): boolean {
  const cross = (point.x - ray.origin.x) * ray.direction.y - (point.y - ray.origin.y) * ray.direction.x;
  if (Math.abs(cross) > epsilon * vectorMagnitude(ray.direction)) {
    return false;
  }
  const dot = (point.x - ray.origin.x) * ray.direction.x + (point.y - ray.origin.y) * ray.direction.y;
  return dot >= -epsilon;
}

export function rayToLine(ray: Ray): Line {
  return createLine(ray.origin, ray.direction);
}