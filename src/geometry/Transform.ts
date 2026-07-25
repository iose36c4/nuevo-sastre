import { GEOMETRIC_EPSILON, DETERMINANT_EPSILON } from './constants.js';
import type { Point2D } from './Point.js';
import type { Vector2D } from './Vector.js';
import type { Segment } from './Segment.js';
import type { Line } from './Line.js';
import type { Ray } from './Ray.js';
import type { BezierCurve } from './Bezier.js';
import type { Path } from './Path.js';
import type { Polygon } from './Polygon.js';
import { createPoint } from './Point.js';
import { createVector } from './Vector.js';
import { createSegment } from './Segment.js';
import { createLine, lineToNormalForm } from './Line.js';
import { createRay } from './Ray.js';
import { createBezierQuadratic, createBezierCubic } from './Bezier.js';
import { createPolygon } from './Polygon.js';


export interface Transform {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly e: number;
  readonly f: number;
}

function assertFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number`);
  }
}

export function identity(): Transform {
  return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
}

export function translation(dx: number, dy: number): Transform {
  assertFinite('dx', dx);
  assertFinite('dy', dy);
  return { a: 1, b: 0, c: 0, d: 1, e: dx, f: dy };
}

export function rotation(angle: number, center?: Point2D): Transform {
  assertFinite('angle', angle);
  const cx = center?.x ?? 0;
  const cy = center?.y ?? 0;
  if (center) {
    assertFinite('center.x', cx);
    assertFinite('center.y', cy);
  }
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    a: cos,
    b: sin,
    c: -sin,
    d: cos,
    e: cx - cos * cx + sin * cy,
    f: cy - sin * cx - cos * cy,
  };
}

export function scale(sx: number, sy?: number, center?: Point2D): Transform {
  assertFinite('sx', sx);
  const syValue = sy ?? sx;
  assertFinite('sy', syValue);
  const cx = center?.x ?? 0;
  const cy = center?.y ?? 0;
  if (center) {
    assertFinite('center.x', cx);
    assertFinite('center.y', cy);
  }
  return {
    a: sx,
    b: 0,
    c: 0,
    d: syValue,
    e: cx - sx * cx,
    f: cy - syValue * cy,
  };
}

export function reflectAcrossX(centerY?: number): Transform {
  const cy = centerY ?? 0;
  assertFinite('centerY', cy);
  return { a: 1, b: 0, c: 0, d: -1, e: 0, f: 2 * cy };
}

export function reflectAcrossY(centerX?: number): Transform {
  const cx = centerX ?? 0;
  assertFinite('centerX', cx);
  return { a: -1, b: 0, c: 0, d: 1, e: 2 * cx, f: 0 };
}

export function reflectAcrossLine(line: Line): Transform {
  assertFinite('line.point.x', line.point.x);
  assertFinite('line.point.y', line.point.y);
  assertFinite('line.direction.x', line.direction.x);
  assertFinite('line.direction.y', line.direction.y);
  const { a, b, c } = lineToNormalForm(line);
  return {
    a: 1 - 2 * a * a,
    b: -2 * a * b,
    c: -2 * a * b,
    d: 1 - 2 * b * b,
    e: -2 * a * c,
    f: -2 * b * c,
  };
}

export function compose(a: Transform, b: Transform): Transform {
  return {
    a: b.a * a.a + b.c * a.b,
    b: b.b * a.a + b.d * a.b,
    c: b.a * a.c + b.c * a.d,
    d: b.b * a.c + b.d * a.d,
    e: b.a * a.e + b.c * a.f + b.e,
    f: b.b * a.e + b.d * a.f + b.f,
  };
}

export function invert(t: Transform): Transform {
  const det = t.a * t.d - t.b * t.c;
  if (Math.abs(det) < DETERMINANT_EPSILON) {
    throw new Error('Transform is not invertible (determinant near zero)');
  }
  const invDet = 1 / det;
  return {
    a: t.d * invDet,
    b: -t.b * invDet,
    c: -t.c * invDet,
    d: t.a * invDet,
    e: (t.c * t.f - t.d * t.e) * invDet,
    f: (t.b * t.e - t.a * t.f) * invDet,
  };
}

export function determinant(t: Transform): number {
  return t.a * t.d - t.b * t.c;
}

export function isIdentity(t: Transform, epsilon: number = GEOMETRIC_EPSILON): boolean {
  return (
    Math.abs(t.a - 1) < epsilon &&
    Math.abs(t.b) < epsilon &&
    Math.abs(t.c) < epsilon &&
    Math.abs(t.d - 1) < epsilon &&
    Math.abs(t.e) < epsilon &&
    Math.abs(t.f) < epsilon
  );
}

export function transformPoint(t: Transform, p: Point2D): Point2D {
  return createPoint(
    t.a * p.x + t.c * p.y + t.e,
    t.b * p.x + t.d * p.y + t.f
  );
}

export function transformVector(t: Transform, v: Vector2D): Vector2D {
  return createVector(
    t.a * v.x + t.c * v.y,
    t.b * v.x + t.d * v.y
  );
}

export function transformSegment(t: Transform, seg: Segment): Segment {
  return createSegment(
    transformPoint(t, seg.from),
    transformPoint(t, seg.to)
  );
}

export function transformLine(t: Transform, line: Line): Line {
  const p = transformPoint(t, line.point);
  const dir = transformVector(t, line.direction);
  return createLine(p, dir);
}

export function transformRay(t: Transform, ray: Ray): Ray {
  const origin = transformPoint(t, ray.origin);
  const direction = transformVector(t, ray.direction);
  return createRay(origin, direction);
}

export function transformBezier(t: Transform, curve: BezierCurve): BezierCurve {
  if (curve.kind === 'quadratic') {
    return createBezierQuadratic(
      transformPoint(t, curve.p0),
      transformPoint(t, curve.p1),
      transformPoint(t, curve.p2)
    );
  }
  return createBezierCubic(
    transformPoint(t, curve.p0),
    transformPoint(t, curve.p1),
    transformPoint(t, curve.p2),
    transformPoint(t, curve.p3)
  );
}

export function transformPath(t: Transform, path: Path): Path {
  const start = path.startPoint ? transformPoint(t, path.startPoint) : undefined;
  const segments = path.segments.map(seg => {
    if (seg.kind === 'line') {
      return {
        kind: 'line' as const,
        from: transformPoint(t, seg.from),
        to: transformPoint(t, seg.to),
      };
    }
    if (seg.kind === 'bezier') {
      return {
        kind: 'bezier' as const,
        curve: transformBezier(t, seg.curve),
      };
    }
    throw new Error(`transformPath: unsupported segment kind '${seg.kind}'`);
  });
  return { startPoint: start, segments, closed: path.closed };
}

export function transformPolygon(t: Transform, poly: Polygon): Polygon {
  return createPolygon(transformPath(t, poly.path));
}