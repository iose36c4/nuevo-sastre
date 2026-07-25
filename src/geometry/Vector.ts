import { GEOMETRIC_EPSILON } from './constants.js';
import type { Point2D } from './Point.js';

export interface Vector2D {
  readonly x: number;
  readonly y: number;
}

export function createVector(x: number, y: number): Vector2D {
  return { x, y };
}

export function vectorFromPoints(from: Point2D, to: Point2D): Vector2D {
  return { x: to.x - from.x, y: to.y - from.y };
}

export function addVectors(a: Vector2D, b: Vector2D): Vector2D {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function subtractVectors(a: Vector2D, b: Vector2D): Vector2D {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scaleVector(v: Vector2D, scalar: number): Vector2D {
  return { x: v.x * scalar, y: v.y * scalar };
}

export function vectorMagnitude(v: Vector2D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function normalizeVector(v: Vector2D): Vector2D {
  const mag = vectorMagnitude(v);
  if (mag < GEOMETRIC_EPSILON) {
    return { x: 0, y: 0 };
  }
  return { x: v.x / mag, y: v.y / mag };
}

export function dotProduct(a: Vector2D, b: Vector2D): number {
  return a.x * b.x + a.y * b.y;
}

export function crossProduct(a: Vector2D, b: Vector2D): number {
  return a.x * b.y - a.y * b.x;
}

export function vectorAngle(v: Vector2D): number {
  return Math.atan2(v.y, v.x);
}

export function vectorFromAngle(angle: number): Vector2D {
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

export function perpendicularVector(v: Vector2D): Vector2D {
  return { x: v.y === 0 ? 0 : -v.y, y: v.x };
}

export function vectorsEqual(
  a: Vector2D,
  b: Vector2D,
  epsilon: number = GEOMETRIC_EPSILON
): boolean {
  return Math.abs(a.x - b.x) < epsilon && Math.abs(a.y - b.y) < epsilon;
}