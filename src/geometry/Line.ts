import { GEOMETRIC_EPSILON } from './constants.js';
import type { Point2D } from './Point.js';
import { createPoint } from './Point.js';
import type { Vector2D } from './Vector.js';
import { vectorMagnitude, perpendicularVector } from './Vector.js';
import type { Segment } from './Segment.js';
import { segmentDirection } from './Segment.js';

export interface Line {
  readonly point: Point2D;
  readonly direction: Vector2D;
}

export function createLine(point: Point2D, direction: Vector2D): Line {
  const mag = vectorMagnitude(direction);
  if (mag < GEOMETRIC_EPSILON) {
    throw new Error('Line direction vector must be non-zero');
  }
  return { point, direction };
}

export function lineFromTwoPoints(p1: Point2D, p2: Point2D): Line {
  const direction = { x: p2.x - p1.x, y: p2.y - p1.y };
  const mag = vectorMagnitude(direction);
  if (mag < GEOMETRIC_EPSILON) {
    throw new Error('Cannot create line from identical points');
  }
  return { point: p1, direction };
}

export function lineFromPointDirection(point: Point2D, direction: Vector2D): Line {
  return createLine(point, direction);
}

export function linePointAt(line: Line, t: number): Point2D {
  return createPoint(
    line.point.x + line.direction.x * t,
    line.point.y + line.direction.y * t
  );
}

export function lineEvaluateX(line: Line, x: number): number | undefined {
  if (Math.abs(line.direction.x) < GEOMETRIC_EPSILON) {
    return undefined;
  }
  const t = (x - line.point.x) / line.direction.x;
  return line.point.y + line.direction.y * t;
}

export function lineEvaluateY(line: Line, y: number): number | undefined {
  if (Math.abs(line.direction.y) < GEOMETRIC_EPSILON) {
    return undefined;
  }
  const t = (y - line.point.y) / line.direction.y;
  return line.point.x + line.direction.x * t;
}

export function lineContainsPoint(line: Line, point: Point2D, epsilon: number = GEOMETRIC_EPSILON): boolean {
  const cross = (point.x - line.point.x) * line.direction.y - (point.y - line.point.y) * line.direction.x;
  return Math.abs(cross) < epsilon * vectorMagnitude(line.direction);
}

export function isVertical(line: Line, epsilon: number = GEOMETRIC_EPSILON): boolean {
  return Math.abs(line.direction.x) < epsilon;
}

export function isHorizontal(line: Line, epsilon: number = GEOMETRIC_EPSILON): boolean {
  return Math.abs(line.direction.y) < epsilon;
}

export function lineToNormalForm(line: Line): { a: number; b: number; c: number } {
  const normal = perpendicularVector(line.direction);
  const mag = vectorMagnitude(normal);
  const a = normal.x / mag;
  const b = normal.y / mag;
  const c = -(a * line.point.x + b * line.point.y);
  return { a, b, c };
}

export function lineFromSegment(segment: Segment): Line {
  const direction = segmentDirection(segment);
  return createLine(segment.from, direction);
}