import { GEOMETRIC_EPSILON } from './constants.js';
import type { Path } from './Path.js';
import { pathGetPoints, pathIsClosed } from './Path.js';
import type { Point2D } from './Point.js';
import { createPoint, pointsEqual } from './Point.js';
import { createVector, crossProduct } from './Vector.js';

export interface Polygon {
  readonly path: Path;
}

const AREA_EPSILON = 1e-6;
const CONVEXITY_EPSILON = 1e-9;

export function createPolygon(path: Path): Polygon {
  if (!pathIsClosed(path)) {
    throw new Error('createPolygon: path must be closed');
  }
  for (const seg of path.segments) {
    if (seg.kind !== 'line') {
      throw new Error(
        `createPolygon: unsupported segment kind '${seg.kind}' — only 'line' supported in v1`
      );
    }
  }
  return { path };
}

function _polygonVertices(poly: Polygon): Point2D[] {
  const pts = pathGetPoints(poly.path);
  if (pts.length > 1 && pointsEqual(pts[0]!, pts[pts.length - 1]!)) {
    return pts.slice(0, -1);
  }
  return pts;
}

export function polygonArea(poly: Polygon): number {
  const verts = _polygonVertices(poly);
  if (verts.length < 3) {
    throw new Error('polygonArea: polygon must have at least 3 vertices');
  }
  let area = 0;
  for (let i = 0; i < verts.length; i++) {
    const j = (i + 1) % verts.length;
    area += verts[i]!.x * verts[j]!.y - verts[j]!.x * verts[i]!.y;
  }
  return area * 0.5;
}

export function polygonCentroid(poly: Polygon): Point2D {
  const verts = _polygonVertices(poly);
  if (verts.length < 3) {
    throw new Error('polygonCentroid: polygon must have at least 3 vertices');
  }
  const A = polygonArea(poly);
  if (Math.abs(A) < AREA_EPSILON) {
    throw new Error('polygonCentroid: degenerate polygon (zero area)');
  }
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < verts.length; i++) {
    const j = (i + 1) % verts.length;
    const cross = verts[i]!.x * verts[j]!.y - verts[j]!.x * verts[i]!.y;
    cx += (verts[i]!.x + verts[j]!.x) * cross;
    cy += (verts[i]!.y + verts[j]!.y) * cross;
  }
  cx /= 6 * A;
  cy /= 6 * A;
  return createPoint(cx, cy);
}

export function polygonWindingOrder(poly: Polygon): 'cw' | 'ccw' | 'degenerate' {
  const A = polygonArea(poly);
  if (Math.abs(A) < AREA_EPSILON) return 'degenerate';
  return A > 0 ? 'ccw' : 'cw';
}

export function polygonIsConvex(poly: Polygon): boolean {
  const verts = _polygonVertices(poly);
  if (verts.length < 3) {
    throw new Error('polygonIsConvex: polygon must have at least 3 vertices');
  }
  let sign = 0;
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i]!;
    const b = verts[(i + 1) % verts.length]!;
    const c = verts[(i + 2) % verts.length]!;
    const v1 = createVector(b.x - a.x, b.y - a.y);
    const v2 = createVector(c.x - b.x, c.y - b.y);
    const cross = crossProduct(v1, v2);
    if (Math.abs(cross) <= CONVEXITY_EPSILON) continue;
    const currentSign = cross > 0 ? 1 : -1;
    if (sign === 0) {
      sign = currentSign;
    } else if (sign !== currentSign) {
      return false;
    }
  }
  return true;
}

/**
 * @internal
 * Exported for test coverage of degenerate segment handling.
 * Not part of the public API.
 */
export function _pointOnSegment(p: Point2D, a: Point2D, b: Point2D): boolean {
  const eps = GEOMETRIC_EPSILON;

  const minX = Math.min(a.x, b.x) - eps;
  const maxX = Math.max(a.x, b.x) + eps;
  const minY = Math.min(a.y, b.y) - eps;
  const maxY = Math.max(a.y, b.y) + eps;
  if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) return false;

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < eps * eps) {
    return pointsEqual(p, a, eps);
  }

  const cross = dx * (p.y - a.y) - dy * (p.x - a.x);
  const crossTol = eps * Math.sqrt(len2);
  if (Math.abs(cross) > crossTol) return false;

  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  if (t < -eps) return false;
  if (t > 1 + eps) return false;
  return true;
}

export function polygonContainsPoint(poly: Polygon, point: Point2D): boolean {
  const verts = _polygonVertices(poly);
  if (verts.length < 3) return false;

  for (let i = 0; i < verts.length; i++) {
    if (pointsEqual(point, verts[i]!)) return true;
    const j = (i + 1) % verts.length;
    if (_pointOnSegment(point, verts[i]!, verts[j]!)) return true;
  }

  let inside = false;
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const yi = verts[i]!.y;
    const yj = verts[j]!.y;
    const xi = verts[i]!.x;
    const xj = verts[j]!.x;

    const straddles = (yi > point.y) !== (yj > point.y);
    if (!straddles) continue;

    const xInt = xi + (point.y - yi) * (xj - xi) / (yj - yi);
    if (xInt > point.x) inside = !inside;
  }
  return inside;
}