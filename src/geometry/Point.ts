import { GEOMETRIC_EPSILON } from './constants.js';

export { GEOMETRIC_EPSILON } from './constants.js';

export interface Point2D {
  readonly x: number;
  readonly y: number;
}

export function createPoint(x: number, y: number): Point2D {
  return { x, y };
}

export function pointsEqual(
  a: Point2D,
  b: Point2D,
  epsilon: number = GEOMETRIC_EPSILON
): boolean {
  return Math.abs(a.x - b.x) < epsilon && Math.abs(a.y - b.y) < epsilon;
}

export function pointToString(p: Point2D): string {
  return `(${p.x.toFixed(3)}, ${p.y.toFixed(3)})`;
}