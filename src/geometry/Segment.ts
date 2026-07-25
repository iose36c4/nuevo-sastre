import { GEOMETRIC_EPSILON } from './constants.js';
import type { Point2D } from './Point.js';
import { createPoint } from './Point.js';
import type { Vector2D } from './Vector.js';
import { vectorFromPoints, vectorMagnitude } from './Vector.js';
import { createLine, type Line } from './Line.js';

export interface Segment {
  readonly from: Point2D;
  readonly to: Point2D;
}

export function createSegment(from: Point2D, to: Point2D): Segment {
  return { from, to };
}

export function segmentLength(segment: Segment): number {
  const dx = segment.to.x - segment.from.x;
  const dy = segment.to.y - segment.from.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function segmentMidpoint(segment: Segment): Point2D {
  return createPoint(
    (segment.from.x + segment.to.x) / 2,
    (segment.from.y + segment.to.y) / 2
  );
}

export function segmentPointAt(segment: Segment, t: number): Point2D {
  return createPoint(
    segment.from.x + (segment.to.x - segment.from.x) * t,
    segment.from.y + (segment.to.y - segment.from.y) * t
  );
}

export function segmentDirection(segment: Segment): Vector2D {
  return vectorFromPoints(segment.from, segment.to);
}

export function segmentReverse(segment: Segment): Segment {
  return { from: segment.to, to: segment.from };
}

export function isDegenerate(segment: Segment, epsilon: number = GEOMETRIC_EPSILON): boolean {
  return segmentLength(segment) < epsilon;
}

export function segmentToLine(segment: Segment): Line {
  const direction = segmentDirection(segment);
  const magnitude = vectorMagnitude(direction);
  if (magnitude < GEOMETRIC_EPSILON) {
    throw new Error('Cannot convert degenerate segment to line');
  }
  return createLine(segment.from, direction);
}