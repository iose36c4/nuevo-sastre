import {
  GEOMETRIC_EPSILON,
  BEZIER_LENGTH_TOLERANCE,
  BEZIER_LENGTH_MAX_RECURSION,
  BEZIER_ROOT_EPSILON,
  BEZIER_PARAMETER_TOLERANCE,
  BEZIER_DERIVATIVE_EPSILON,
  BEZIER_MAX_NEWTON_ITERATIONS,
} from './constants.js';
import type { Point2D } from './Point.js';
import { createPoint, pointsEqual } from './Point.js';
import type { Vector2D } from './Vector.js';
import { createVector, vectorMagnitude } from './Vector.js';

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

export function createBezierQuadratic(p0: Point2D, p1: Point2D, p2: Point2D): BezierCurve {
  return { kind: 'quadratic', p0, p1, p2 };
}

export function createBezierCubic(p0: Point2D, p1: Point2D, p2: Point2D, p3: Point2D): BezierCurve {
  return { kind: 'cubic', p0, p1, p2, p3 };
}

export function createBezier(points: readonly Point2D[]): BezierCurve {
  if (points.length === 3) {
    return createBezierQuadratic(points[0]!, points[1]!, points[2]!);
  }
  if (points.length === 4) {
    return createBezierCubic(points[0]!, points[1]!, points[2]!, points[3]!);
  }
  throw new Error(`createBezier: expected 3 or 4 points, got ${points.length}`);
}

function evaluateQuadratic(p0: Point2D, p1: Point2D, p2: Point2D, t: number): Point2D {
  const u = 1 - t;
  const uu = u * u;
  const tt = t * t;
  return createPoint(
    uu * p0.x + 2 * u * t * p1.x + tt * p2.x,
    uu * p0.y + 2 * u * t * p1.y + tt * p2.y
  );
}

function evaluateCubic(p0: Point2D, p1: Point2D, p2: Point2D, p3: Point2D, t: number): Point2D {
  const u = 1 - t;
  const uu = u * u;
  const uuu = uu * u;
  const tt = t * t;
  const ttt = tt * t;
  return createPoint(
    uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
  );
}

export function bezierPointAt(curve: BezierCurve, t: number): Point2D {
  if (!Number.isFinite(t) || t < 0 || t > 1) {
    throw new Error('bezierPointAt: t must be a finite number in [0, 1]');
  }
  if (curve.kind === 'quadratic') {
    return evaluateQuadratic(curve.p0, curve.p1, curve.p2, t);
  }
  return evaluateCubic(curve.p0, curve.p1, curve.p2, curve.p3, t);
}

function derivativeCoefficients(curve: BezierCurve): { A: Vector2D; B: Vector2D; C: Vector2D } {
  if (curve.kind === 'quadratic') {
    const B = createVector(
      2 * (curve.p0.x - 2 * curve.p1.x + curve.p2.x),
      2 * (curve.p0.y - 2 * curve.p1.y + curve.p2.y)
    );
    const C = createVector(
      2 * (curve.p1.x - curve.p0.x),
      2 * (curve.p1.y - curve.p0.y)
    );
    return { A: createVector(0, 0), B, C };
  }
  const A = createVector(
    3 * (curve.p3.x - 3 * curve.p2.x + 3 * curve.p1.x - curve.p0.x),
    3 * (curve.p3.y - 3 * curve.p2.y + 3 * curve.p1.y - curve.p0.y)
  );
  const B = createVector(
    6 * (curve.p2.x - 2 * curve.p1.x + curve.p0.x),
    6 * (curve.p2.y - 2 * curve.p1.y + curve.p0.y)
  );
  const C = createVector(
    3 * (curve.p1.x - curve.p0.x),
    3 * (curve.p1.y - curve.p0.y)
  );
  return { A, B, C };
}

function bezierDerivativeAt(curve: BezierCurve, t: number): Vector2D {
  const { A, B, C } = derivativeCoefficients(curve);
  return createVector(
    A.x * t * t + B.x * t + C.x,
    A.y * t * t + B.y * t + C.y
  );
}

function derivativeMagnitude(curve: BezierCurve, t: number): number {
  return vectorMagnitude(bezierDerivativeAt(curve, t));
}

function adaptiveSimpson(
  f: (t: number) => number,
  a: number,
  b: number,
  tol: number,
  maxDepth: number
): number {
  const simpson = (a: number, b: number): number => {
    const m = (a + b) * 0.5;
    return (b - a) / 6 * (f(a) + 4 * f(m) + f(b));
  };

  const recurse = (a: number, b: number, whole: number, depth: number): number => {
    const m = (a + b) * 0.5;
    const left = simpson(a, m);
    const right = simpson(m, b);
    const delta = left + right - whole;
    if (depth <= 0 || Math.abs(delta) <= 15 * tol * Math.max(1, Math.abs(whole))) {
      return left + right + delta / 15;
    }
    return recurse(a, m, left, depth - 1) + recurse(m, b, right, depth - 1);
  };

  return recurse(a, b, simpson(a, b), maxDepth);
}

export function bezierLength(curve: BezierCurve): number {
  if (bezierIsDegenerate(curve)) {
    return 0;
  }
  const f = (t: number) => derivativeMagnitude(curve, t);
  return adaptiveSimpson(f, 0, 1, BEZIER_LENGTH_TOLERANCE, BEZIER_LENGTH_MAX_RECURSION);
}

export function bezierLengthAt(curve: BezierCurve, t: number): number {
  if (!Number.isFinite(t) || t < 0 || t > 1) {
    throw new Error('bezierLengthAt: t must be a finite number in [0, 1]');
  }
  if (t <= 0) return 0;
  if (t >= 1) return bezierLength(curve);
  if (bezierIsDegenerate(curve)) return 0;
  const f = (u: number) => derivativeMagnitude(curve, u);
  return adaptiveSimpson(f, 0, t, BEZIER_LENGTH_TOLERANCE, BEZIER_LENGTH_MAX_RECURSION);
}

export function bezierParameterAtLength(curve: BezierCurve, targetLength: number): number {
  if (!Number.isFinite(targetLength)) {
    throw new Error('bezierParameterAtLength: targetLength must be finite');
  }
  const totalLength = bezierLength(curve);
  if (targetLength <= BEZIER_LENGTH_TOLERANCE) return 0;
  if (targetLength >= totalLength - BEZIER_LENGTH_TOLERANCE) return 1;
  if (totalLength === 0) return 0;

  let low = 0;
  let high = 1;
  let u = targetLength / totalLength;

  for (let iter = 0; iter < BEZIER_MAX_NEWTON_ITERATIONS; iter++) {
    const lengthAtU = bezierLengthAt(curve, u);
    const F = lengthAtU - targetLength;

    if (Math.abs(F) <= BEZIER_LENGTH_TOLERANCE) return u;
    if (high - low <= BEZIER_PARAMETER_TOLERANCE) return (low + high) * 0.5;

    const deriv = bezierDerivativeAt(curve, u);
    const derivMag = vectorMagnitude(deriv);
    let uNext: number;
    const useNewton = derivMag > BEZIER_DERIVATIVE_EPSILON;

    if (useNewton) {
      uNext = u - F / derivMag;
    } else {
      uNext = (low + high) * 0.5;
    }

    if (!Number.isFinite(uNext) || uNext <= low || uNext >= high) {
      uNext = (low + high) * 0.5;
    }

    const Fnext = bezierLengthAt(curve, uNext) - targetLength;
    if (Fnext < 0) {
      low = uNext;
    } else {
      high = uNext;
    }
    u = uNext;
  }

  return u;
}

function solveLinearForBBox(B: number, C: number): number | null {
  if (Math.abs(B) < BEZIER_ROOT_EPSILON) return null;
  const t = -C / B;
  if (t > BEZIER_ROOT_EPSILON && t < 1 - BEZIER_ROOT_EPSILON) return t;
  return null;
}

function solveQuadraticForBBox(A: number, B: number, C: number): number[] {
  const roots: number[] = [];
  if (Math.abs(A) < BEZIER_ROOT_EPSILON) {
    const t = solveLinearForBBox(B, C);
    if (t !== null) roots.push(t);
    return roots;
  }
  const disc = B * B - 4 * A * C;
  if (disc < -BEZIER_ROOT_EPSILON) return roots;
  const discClamped = disc < 0 ? 0 : disc;
  const sqrtDisc = Math.sqrt(discClamped);
  const t1 = (-B - sqrtDisc) / (2 * A);
  const t2 = (-B + sqrtDisc) / (2 * A);
  if (t1 > BEZIER_ROOT_EPSILON && t1 < 1 - BEZIER_ROOT_EPSILON) roots.push(t1);
  if (t2 > BEZIER_ROOT_EPSILON && t2 < 1 - BEZIER_ROOT_EPSILON) roots.push(t2);
  return roots;
}

export function bezierBoundingBox(curve: BezierCurve): { min: Point2D; max: Point2D } {
  const candidates: number[] = [0, 1];
  const { A, B, C } = derivativeCoefficients(curve);

  if (curve.kind === 'quadratic') {
    const tx = solveLinearForBBox(B.x, C.x);
    const ty = solveLinearForBBox(B.y, C.y);
    if (tx !== null) candidates.push(tx);
    if (ty !== null) candidates.push(ty);
  } else {
    candidates.push(...solveQuadraticForBBox(A.x, B.x, C.x));
    candidates.push(...solveQuadraticForBBox(A.y, B.y, C.y));
  }

  const uniqueCandidates = candidates
    .sort((a, b) => a - b)
    .filter((t, i, arr) => i === 0 || t - arr[i - 1]! > BEZIER_ROOT_EPSILON);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const t of uniqueCandidates) {
    const pt = bezierPointAt(curve, t);
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }

  return { min: createPoint(minX, minY), max: createPoint(maxX, maxY) };
}

export function bezierIsDegenerate(curve: BezierCurve): boolean {
  if (curve.kind === 'quadratic') {
    return pointsEqual(curve.p0, curve.p1, GEOMETRIC_EPSILON) && pointsEqual(curve.p1, curve.p2, GEOMETRIC_EPSILON);
  }
  return (
    pointsEqual(curve.p0, curve.p1, GEOMETRIC_EPSILON) &&
    pointsEqual(curve.p1, curve.p2, GEOMETRIC_EPSILON) &&
    pointsEqual(curve.p2, curve.p3, GEOMETRIC_EPSILON)
  );
}

export function bezierIsCollinear(curve: BezierCurve): boolean {
  if (curve.kind === 'quadratic') {
    const v1 = createVector(curve.p1.x - curve.p0.x, curve.p1.y - curve.p0.y);
    const v2 = createVector(curve.p2.x - curve.p0.x, curve.p2.y - curve.p0.y);
    const cross = v1.x * v2.y - v1.y * v2.x;
    return Math.abs(cross) < GEOMETRIC_EPSILON;
  }
  const v1 = createVector(curve.p1.x - curve.p0.x, curve.p1.y - curve.p0.y);
  const v2 = createVector(curve.p2.x - curve.p0.x, curve.p2.y - curve.p0.y);
  const v3 = createVector(curve.p3.x - curve.p0.x, curve.p3.y - curve.p0.y);
  const cross1 = v1.x * v2.y - v1.y * v2.x;
  const cross2 = v1.x * v3.y - v1.y * v3.x;
  return Math.abs(cross1) < GEOMETRIC_EPSILON && Math.abs(cross2) < GEOMETRIC_EPSILON;
}

export function bezierStart(curve: BezierCurve): Point2D {
  return curve.p0;
}

export function bezierEnd(curve: BezierCurve): Point2D {
  return curve.kind === 'quadratic' ? curve.p2 : curve.p3;
}

export function bezierDegree(curve: BezierCurve): 2 | 3 {
  return curve.kind === 'quadratic' ? 2 : 3;
}