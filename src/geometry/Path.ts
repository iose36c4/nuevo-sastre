import { GEOMETRIC_EPSILON } from './constants.js';
import type { Point2D } from './Point.js';
import { createPoint, pointsEqual } from './Point.js';

export type BezierCurve =
  | {
      readonly kind: 'quadratic';
      readonly p0: Point2D;
      readonly p1: Point2D;
      readonly p2: Point2D;
    }
  | {
      readonly kind: 'cubic';
      readonly p0: Point2D;
      readonly p1: Point2D;
      readonly p2: Point2D;
      readonly p3: Point2D;
    };

export interface ArcParams {
  readonly center: Point2D;
  readonly radius: number;
  readonly startAngle: number;
  readonly endAngle: number;
  readonly ccw: boolean;
}

export type PathSegment =
  | { readonly kind: 'line'; readonly from: Point2D; readonly to: Point2D }
  | { readonly kind: 'bezier'; readonly curve: BezierCurve }
  | { readonly kind: 'arc'; readonly params: ArcParams };

export interface Path {
  readonly startPoint: Point2D | undefined;
  readonly segments: readonly PathSegment[];
  readonly closed: boolean;
}

function getSegmentStart(seg: PathSegment): Point2D {
  switch (seg.kind) {
    case 'line':
      return seg.from;
    case 'bezier':
      return seg.curve.p0;
    case 'arc': {
      const { center, radius, startAngle } = seg.params;
      return createPoint(
        center.x + radius * Math.cos(startAngle),
        center.y + radius * Math.sin(startAngle)
      );
    }
  }
}

function getSegmentEnd(seg: PathSegment): Point2D {
  switch (seg.kind) {
    case 'line':
      return seg.to;
    case 'bezier':
      return seg.curve.kind === 'quadratic' ? seg.curve.p2 : seg.curve.p3;
    case 'arc': {
      const { center, radius, endAngle } = seg.params;
      return createPoint(
        center.x + radius * Math.cos(endAngle),
        center.y + radius * Math.sin(endAngle)
      );
    }
  }
}

function getLastPoint(path: Path): Point2D | undefined {
  if (path.segments.length > 0) {
    const last = path.segments[path.segments.length - 1]!;
    return getSegmentEnd(last);
  }
  return path.startPoint;
}

function getFirstPoint(path: Path): Point2D | undefined {
  if (path.segments.length > 0) {
    const first = path.segments[0]!;
    return getSegmentStart(first);
  }
  return path.startPoint;
}

export function createPath(): Path {
  return { startPoint: undefined, segments: [], closed: false };
}

export function pathAddLine(path: Path, to: Point2D): Path {
  if (path.startPoint === undefined) {
    return { ...path, startPoint: to };
  }
  const lastPoint = getLastPoint(path);
  if (!lastPoint) throw new Error('Path has no last point');
  const newSeg: PathSegment = { kind: 'line', from: lastPoint, to };
  return {
    ...path,
    segments: [...path.segments, newSeg],
    closed: false
  };
}

export function pathClose(path: Path): Path {
  if (path.startPoint === undefined || path.segments.length === 0) {
    throw new Error('Cannot close empty path or path without segments');
  }
  if (path.closed) return path;

  const firstPoint = getFirstPoint(path);
  if (!firstPoint) throw new Error('Cannot close path with non-line first segment');

  const lastPoint = getLastPoint(path);
  if (!lastPoint) throw new Error('Path has no last point');

  if (pointsEqual(lastPoint, firstPoint, GEOMETRIC_EPSILON)) {
    return { ...path, closed: true };
  }

  const closingSeg: PathSegment = { kind: 'line', from: lastPoint, to: firstPoint };
  return { startPoint: path.startPoint, segments: [...path.segments, closingSeg], closed: true };
}

export function pathGetPoints(path: Path): Point2D[] {
  if (path.startPoint === undefined) return [];

  const points: Point2D[] = [path.startPoint];
  for (const seg of path.segments) {
    points.push(getSegmentEnd(seg));
  }
  return points;
}

export function pathLength(path: Path): number {
  let total = 0;
  for (const seg of path.segments) {
    if (seg.kind !== 'line') throw new Error('pathLength: non-line segments not implemented');
    const { from, to } = seg as { readonly kind: 'line'; readonly from: Point2D; readonly to: Point2D };
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

export function pathIsEmpty(path: Path): boolean {
  return path.startPoint === undefined && path.segments.length === 0;
}

export function pathSegmentCount(path: Path): number {
  return path.segments.length;
}

export function pathFirstPoint(path: Path): Point2D | undefined {
  return getFirstPoint(path);
}

export function pathLastPoint(path: Path): Point2D | undefined {
  return getLastPoint(path);
}

export function pathPointAt(path: Path, t: number): Point2D {
  if (pathIsEmpty(path)) throw new Error('Cannot get point on empty path');
  if (t < 0 || t > 1) throw new Error('Parameter t must be between 0 and 1');
  if (t === 0) {
    const first = pathFirstPoint(path);
    if (!first) throw new Error('Path has no first point');
    return first;
  }
  if (t === 1) {
    const last = pathLastPoint(path);
    if (!last) throw new Error('Path has no last point');
    return last;
  }

  const totalLength = pathLength(path);
  if (totalLength < GEOMETRIC_EPSILON) return pathFirstPoint(path)!;

  const targetLength = totalLength * t;
  let accumulated = 0;

  for (const seg of path.segments) {
    if (seg.kind !== 'line') throw new Error('pathPointAt: non-line segments not implemented');

    const { from, to } = seg as { readonly kind: 'line'; readonly from: Point2D; readonly to: Point2D };
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const segLen = Math.sqrt(dx * dx + dy * dy);

    if (accumulated + segLen >= targetLength) {
      const localT = segLen > GEOMETRIC_EPSILON ? (targetLength - accumulated) / segLen : 0;
      return createPoint(from.x + dx * localT, from.y + dy * localT);
    }
    accumulated += segLen;
  }

  return pathLastPoint(path)!;
}

export function pathTranslate(path: Path, dx: number, dy: number): Path {
  const translatedStart = path.startPoint
    ? createPoint(path.startPoint.x + dx, path.startPoint.y + dy)
    : undefined;
  const translatedSegments: PathSegment[] = [];
  for (const seg of path.segments) {
    if (seg.kind === 'line') {
      const { from, to } = seg as { readonly kind: 'line'; readonly from: Point2D; readonly to: Point2D };
      translatedSegments.push({
        kind: 'line',
        from: createPoint(from.x + dx, from.y + dy),
        to: createPoint(to.x + dx, to.y + dy),
      });
    } else {
      throw new Error(`pathTranslate: unsupported segment kind ${seg.kind}`);
    }
  }
  return { startPoint: translatedStart, segments: translatedSegments, closed: path.closed };
}

export function pathRotate(path: Path, angle: number, center: Point2D = { x: 0, y: 0 }): Path {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rotatePoint = (p: Point2D): Point2D => {
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    return createPoint(center.x + dx * cos - dy * sin, center.y + dx * sin + dy * cos);
  };

  const rotatedStart = path.startPoint ? rotatePoint(path.startPoint) : undefined;
  const rotatedSegments: PathSegment[] = [];
  for (const seg of path.segments) {
    if (seg.kind === 'line') {
      const { from, to } = seg as { readonly kind: 'line'; readonly from: Point2D; readonly to: Point2D };
      rotatedSegments.push({
        kind: 'line',
        from: rotatePoint(from),
        to: rotatePoint(to),
      });
    } else {
      throw new Error(`pathRotate: unsupported segment kind ${seg.kind}`);
    }
  }
  return { startPoint: rotatedStart, segments: rotatedSegments, closed: path.closed };
}

export function pathBoundingBox(path: Path): { min: Point2D; max: Point2D } {
  if (pathIsEmpty(path)) throw new Error('Cannot compute bounding box of empty path');

  const points = pathGetPoints(path);
  const firstPoint = points[0]!;
  let minX = firstPoint.x;
  let maxX = firstPoint.x;
  let minY = firstPoint.y;
  let maxY = firstPoint.y;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  return { min: createPoint(minX, minY), max: createPoint(maxX, maxY) };
}

export function pathIsClosed(path: Path): boolean {
  return path.closed;
}

export function pathEndpoints(path: Path): { start: Point2D; end: Point2D } | null {
  if (pathIsEmpty(path)) return null;
  const first = pathFirstPoint(path)!;
  const last = pathLastPoint(path)!;
  return { start: first, end: last };
}