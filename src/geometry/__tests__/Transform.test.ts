import { describe, it, expect } from 'vitest';
import {
  identity,
  translation,
  rotation,
  scale,
  reflectAcrossX,
  reflectAcrossY,
  reflectAcrossLine,
  compose,
  invert,
  determinant,
  isIdentity,
  transformPoint,
  transformVector,
  transformSegment,
  transformLine,
  transformRay,
  transformBezier,
  transformPath,
  transformPolygon,
  type Transform,
} from '../Transform.js';
import { createPoint, pointsEqual, GEOMETRIC_EPSILON } from '../Point.js';
import { createVector, vectorsEqual } from '../Vector.js';
import { createSegment } from '../Segment.js';
import { createLine, lineFromTwoPoints } from '../Line.js';
import { createRay } from '../Ray.js';
import { createBezierQuadratic, createBezierCubic } from '../Bezier.js';
import { createPath, pathAddLine, pathClose, pathGetPoints } from '../Path.js';
import { createPolygon, polygonArea, polygonWindingOrder } from '../Polygon.js';

const PI = Math.PI;
const EPS = GEOMETRIC_EPSILON;

function approxTransform(t: Transform, expected: Transform, eps: number = EPS): void {
  expect(Math.abs(t.a - expected.a)).toBeLessThan(eps);
  expect(Math.abs(t.b - expected.b)).toBeLessThan(eps);
  expect(Math.abs(t.c - expected.c)).toBeLessThan(eps);
  expect(Math.abs(t.d - expected.d)).toBeLessThan(eps);
  expect(Math.abs(t.e - expected.e)).toBeLessThan(eps);
  expect(Math.abs(t.f - expected.f)).toBeLessThan(eps);
}

function approxPoint(p: { x: number; y: number }, expected: { x: number; y: number }, eps: number = EPS): void {
  expect(Math.abs(p.x - expected.x)).toBeLessThan(eps);
  expect(Math.abs(p.y - expected.y)).toBeLessThan(eps);
}

describe('Transform', () => {
  describe('identity', () => {
    it('returns identity matrix', () => {
      const t = identity();
      expect(t.a).toBe(1);
      expect(t.b).toBe(0);
      expect(t.c).toBe(0);
      expect(t.d).toBe(1);
      expect(t.e).toBe(0);
      expect(t.f).toBe(0);
    });

    it('isIdentity returns true', () => {
      expect(isIdentity(identity())).toBe(true);
    });

    it('isIdentity with custom epsilon', () => {
      const t = { ...identity(), e: 0.0005 };
      expect(isIdentity(t, 0.01)).toBe(true);
      expect(isIdentity(t, 0.0001)).toBe(false);
    });
  });

  describe('translation', () => {
    it('creates translation matrix', () => {
      const t = translation(10, 20);
      expect(t.a).toBe(1);
      expect(t.b).toBe(0);
      expect(t.c).toBe(0);
      expect(t.d).toBe(1);
      expect(t.e).toBe(10);
      expect(t.f).toBe(20);
    });

    it('transforms points', () => {
      const t = translation(10, 20);
      const p = transformPoint(t, createPoint(1, 2));
      approxPoint(p, { x: 11, y: 22 });
    });

    it('does not affect vectors', () => {
      const t = translation(10, 20);
      const v = transformVector(t, createVector(1, 2));
      expect(v.x).toBe(1);
      expect(v.y).toBe(2);
    });

    it('composes additively', () => {
      const t1 = translation(1, 2);
      const t2 = translation(3, 4);
      const composed = compose(t1, t2);
      expect(composed.e).toBe(4);
      expect(composed.f).toBe(6);
    });

    it('inverse is negative translation', () => {
      const t = translation(10, 20);
      const inv = invert(t);
      expect(inv.e).toBe(-10);
      expect(inv.f).toBe(-20);
    });

    it('validates dx is finite', () => {
      expect(() => translation(NaN, 1)).toThrow('dx must be a finite number');
      expect(() => translation(Infinity, 1)).toThrow('dx must be a finite number');
      expect(() => translation(-Infinity, 1)).toThrow('dx must be a finite number');
    });

    it('validates dy is finite', () => {
      expect(() => translation(1, NaN)).toThrow('dy must be a finite number');
      expect(() => translation(1, Infinity)).toThrow('dy must be a finite number');
      expect(() => translation(1, -Infinity)).toThrow('dy must be a finite number');
    });
  });

  describe('rotation', () => {
    it('creates rotation matrix for 90 degrees', () => {
      const t = rotation(PI / 2);
      expect(Math.abs(t.a)).toBeLessThan(EPS); // cos(π/2) ≈ 0
      expect(Math.abs(t.b - 1)).toBeLessThan(EPS); // sin(π/2) = 1
      expect(Math.abs(t.c + 1)).toBeLessThan(EPS); // -sin(π/2) = -1
      expect(Math.abs(t.d)).toBeLessThan(EPS); // cos(π/2) ≈ 0
      expect(Math.abs(t.e)).toBeLessThan(EPS);
      expect(Math.abs(t.f)).toBeLessThan(EPS);
    });

    it('rotates (1,0) to (0,1) at 90 degrees', () => {
      const t = rotation(PI / 2);
      const p = transformPoint(t, createPoint(1, 0));
      approxPoint(p, { x: 0, y: 1 });
    });

    it('rotates (0,1) to (-1,0) at 90 degrees', () => {
      const t = rotation(PI / 2);
      const p = transformPoint(t, createPoint(0, 1));
      approxPoint(p, { x: -1, y: 0 });
    });

    it('rotates around center', () => {
      const center = createPoint(1, 1);
      const t = rotation(PI / 2, center);
      const p = transformPoint(t, createPoint(2, 1));
      approxPoint(p, { x: 1, y: 2 });
    });

    it('has determinant 1', () => {
      const t = rotation(PI / 3);
      expect(determinant(t)).toBeCloseTo(1, 10);
    });

    it('inverse is negative angle', () => {
      const t = rotation(PI / 4);
      const inv = invert(t);
      const composed = compose(t, inv);
      expect(isIdentity(composed)).toBe(true);
    });

    it('validates angle is finite', () => {
      expect(() => rotation(NaN)).toThrow('angle must be a finite number');
      expect(() => rotation(Infinity)).toThrow('angle must be a finite number');
      expect(() => rotation(-Infinity)).toThrow('angle must be a finite number');
    });

    it('validates center.x is finite', () => {
      expect(() => rotation(0, createPoint(NaN, 0))).toThrow('center.x must be a finite number');
    });

    it('validates center.y is finite', () => {
      expect(() => rotation(0, createPoint(0, NaN))).toThrow('center.y must be a finite number');
    });
  });

  describe('scale', () => {
    it('creates uniform scale matrix', () => {
      const t = scale(2);
      expect(t.a).toBe(2);
      expect(t.d).toBe(2);
      expect(t.b).toBe(0);
      expect(t.c).toBe(0);
    });

    it('creates non-uniform scale matrix', () => {
      const t = scale(2, 3);
      expect(t.a).toBe(2);
      expect(t.d).toBe(3);
    });

    it('scales point from origin', () => {
      const t = scale(2, 3);
      const p = transformPoint(t, createPoint(1, 2));
      approxPoint(p, { x: 2, y: 6 });
    });

    it('scales vector', () => {
      const t = scale(2, 3);
      const v = transformVector(t, createVector(1, 2));
      expect(v.x).toBe(2);
      expect(v.y).toBe(6);
    });

    it('scales around center', () => {
      const center = createPoint(1, 1);
      const t = scale(2, 2, center);
      const p = transformPoint(t, createPoint(2, 1));
      approxPoint(p, { x: 3, y: 1 });
    });

    it('has determinant sx*sy', () => {
      const t = scale(2, 3);
      expect(determinant(t)).toBe(6);
    });

    it('allows negative scale', () => {
      const t = scale(-1, 2);
      expect(t.a).toBe(-1);
      expect(t.d).toBe(2);
      expect(determinant(t)).toBe(-2);
    });

    it('inverse is reciprocal scale', () => {
      const t = scale(2, 3);
      const inv = invert(t);
      expect(inv.a).toBeCloseTo(0.5, 10);
      expect(inv.d).toBeCloseTo(1 / 3, 10);
    });

    it('throws on zero scale', () => {
      expect(() => invert(scale(0, 1))).toThrow('Transform is not invertible (determinant near zero)');
    });

    it('throws on near-zero scale', () => {
      expect(() => invert(scale(0.0005, 1))).toThrow('Transform is not invertible (determinant near zero)');
    });

    it('does not throw on scale just above epsilon', () => {
      const t = scale(0.0011, 1);
      expect(() => invert(t)).not.toThrow();
    });

    it('validates sx is finite', () => {
      expect(() => scale(NaN)).toThrow('sx must be a finite number');
      expect(() => scale(Infinity)).toThrow('sx must be a finite number');
      expect(() => scale(-Infinity)).toThrow('sx must be a finite number');
    });

    it('validates sy is finite', () => {
      expect(() => scale(1, NaN)).toThrow('sy must be a finite number');
      expect(() => scale(1, Infinity)).toThrow('sy must be a finite number');
    });

    it('validates center.x is finite', () => {
      expect(() => scale(1, undefined, createPoint(NaN, 0))).toThrow('center.x must be a finite number');
    });

    it('validates center.y is finite', () => {
      expect(() => scale(1, undefined, createPoint(0, NaN))).toThrow('center.y must be a finite number');
    });
  });

  describe('reflectAcrossX', () => {
    it('reflects across X axis', () => {
      const t = reflectAcrossX();
      const p = transformPoint(t, createPoint(1, 2));
      approxPoint(p, { x: 1, y: -2 });
    });

    it('reflects across custom horizontal line', () => {
      const t = reflectAcrossX(5);
      const p = transformPoint(t, createPoint(1, 8));
      approxPoint(p, { x: 1, y: 2 });
    });

    it('has determinant -1', () => {
      expect(determinant(reflectAcrossX())).toBe(-1);
    });

    it('is involution', () => {
      const t = reflectAcrossX();
      const composed = compose(t, t);
      expect(isIdentity(composed)).toBe(true);
    });

    it('validates centerY is finite', () => {
      expect(() => reflectAcrossX(NaN)).toThrow('centerY must be a finite number');
    });
  });

  describe('reflectAcrossY', () => {
    it('reflects across Y axis', () => {
      const t = reflectAcrossY();
      const p = transformPoint(t, createPoint(1, 2));
      approxPoint(p, { x: -1, y: 2 });
    });

    it('reflects across custom vertical line', () => {
      const t = reflectAcrossY(5);
      const p = transformPoint(t, createPoint(8, 1));
      approxPoint(p, { x: 2, y: 1 });
    });

    it('has determinant -1', () => {
      expect(determinant(reflectAcrossY())).toBe(-1);
    });

    it('is involution', () => {
      const t = reflectAcrossY();
      const composed = compose(t, t);
      expect(isIdentity(composed)).toBe(true);
    });

    it('validates centerX is finite', () => {
      expect(() => reflectAcrossY(NaN)).toThrow('centerX must be a finite number');
    });
  });

  describe('reflectAcrossLine', () => {
    it('reflects across X axis (y=0)', () => {
      const line = lineFromTwoPoints(createPoint(0, 0), createPoint(1, 0));
      const t = reflectAcrossLine(line);
      const p = transformPoint(t, createPoint(1, 2));
      approxPoint(p, { x: 1, y: -2 });
    });

    it('reflects across Y axis (x=0)', () => {
      const line = lineFromTwoPoints(createPoint(0, 0), createPoint(0, 1));
      const t = reflectAcrossLine(line);
      const p = transformPoint(t, createPoint(1, 2));
      approxPoint(p, { x: -1, y: 2 });
    });

    it('reflects across diagonal y=x', () => {
      const line = lineFromTwoPoints(createPoint(0, 0), createPoint(1, 1));
      const t = reflectAcrossLine(line);
      const p = transformPoint(t, createPoint(1, 2));
      approxPoint(p, { x: 2, y: 1 });
    });

    it('reflects across translated line', () => {
      const line = lineFromTwoPoints(createPoint(0, 1), createPoint(1, 2)); // y = x + 1
      const t = reflectAcrossLine(line);
      const p = transformPoint(t, createPoint(1, 2));
      approxPoint(p, { x: 1, y: 2 }); // Point on line
    });

    it('has determinant -1', () => {
      const line = lineFromTwoPoints(createPoint(0, 0), createPoint(1, 1));
      expect(determinant(reflectAcrossLine(line))).toBeCloseTo(-1, 10);
    });

    it('is involution', () => {
      const line = lineFromTwoPoints(createPoint(0, 0), createPoint(1, 1));
      const t = reflectAcrossLine(line);
      const composed = compose(t, t);
      expect(isIdentity(composed)).toBe(true);
    });

    it('validates line.point.x is finite', () => {
      expect(() => reflectAcrossLine(createLine(createPoint(NaN, 0), createVector(1, 0)))).toThrow('line.point.x must be a finite number');
    });

    it('validates line.point.y is finite', () => {
      expect(() => reflectAcrossLine(createLine(createPoint(0, NaN), createVector(1, 0)))).toThrow('line.point.y must be a finite number');
    });

    it('validates line.direction.x is finite', () => {
      expect(() => reflectAcrossLine(createLine(createPoint(0, 0), createVector(NaN, 0)))).toThrow('line.direction.x must be a finite number');
    });

    it('validates line.direction.y is finite', () => {
      expect(() => reflectAcrossLine(createLine(createPoint(0, 0), createVector(0, NaN)))).toThrow('line.direction.y must be a finite number');
    });
  });

  describe('compose', () => {
    it('identity is neutral on left', () => {
      const t = translation(10, 20);
      const composed = compose(identity(), t);
      approxTransform(composed, t);
    });

    it('identity is neutral on right', () => {
      const t = translation(10, 20);
      const composed = compose(t, identity());
      approxTransform(composed, t);
    });

    it('order: compose(a,b) applies a then b', () => {
      const a = translation(10, 0);
      const b = rotation(PI / 2);
      const p = createPoint(0, 0);
      const composed = compose(a, b);
      const result = transformPoint(composed, p);
      // First translate to (10, 0), then rotate 90° -> (0, 10)
      approxPoint(result, { x: 0, y: 10 });
    });

    it('associativity', () => {
      const a = translation(1, 2);
      const b = rotation(PI / 4);
      const c = scale(2);
      const left = compose(compose(a, b), c);
      const right = compose(a, compose(b, c));
      expect(isIdentity(compose(left, invert(right)))).toBe(true);
    });

    it('is not commutative', () => {
      const a = translation(10, 0);
      const b = rotation(PI / 2);
      const ab = compose(a, b);
      const ba = compose(b, a);
      const p = createPoint(0, 0);
      const p1 = transformPoint(ab, p);
      const p2 = transformPoint(ba, p);
      expect(Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y)).toBeGreaterThan(EPS);
    });
  });

  describe('invert', () => {
    it('inverts identity', () => {
      const inv = invert(identity());
      expect(isIdentity(inv)).toBe(true);
    });

    it('inverts translation', () => {
      const t = translation(10, 20);
      const inv = invert(t);
      const composed = compose(t, inv);
      expect(isIdentity(composed)).toBe(true);
    });

    it('inverts rotation', () => {
      const t = rotation(PI / 3);
      const inv = invert(t);
      const composed = compose(t, inv);
      expect(isIdentity(composed)).toBe(true);
    });

    it('inverts scale', () => {
      const t = scale(2, 3);
      const inv = invert(t);
      const composed = compose(t, inv);
      expect(isIdentity(composed)).toBe(true);
    });

    it('inverts reflection', () => {
      const t = reflectAcrossX();
      const inv = invert(t);
      const composed = compose(t, inv);
      expect(isIdentity(composed)).toBe(true);
    });

    it('inverts composition', () => {
      const a = translation(1, 2);
      const b = rotation(PI / 4);
      const c = scale(2);
      const t = compose(compose(a, b), c);
      const inv = invert(t);
      const composed = compose(t, inv);
      expect(isIdentity(composed)).toBe(true);
    });

    it('inverse of composition is reversed order of inverses', () => {
      const a = translation(1, 2);
      const b = rotation(PI / 4);
      const t = compose(a, b);
      const inv = invert(t);
      const expected = compose(invert(b), invert(a));
      expect(isIdentity(compose(inv, invert(expected)))).toBe(true);
    });

    it('throws on singular transform', () => {
      expect(() => invert(scale(0, 1))).toThrow('Transform is not invertible (determinant near zero)');
    });
  });

  describe('determinant', () => {
    it('identity has det 1', () => {
      expect(determinant(identity())).toBe(1);
    });

    it('rotation has det 1', () => {
      expect(determinant(rotation(PI / 3))).toBeCloseTo(1, 10);
    });

    it('reflection has det -1', () => {
      expect(determinant(reflectAcrossX())).toBe(-1);
      expect(determinant(reflectAcrossY())).toBe(-1);
    });

    it('scale has det sx*sy', () => {
      expect(determinant(scale(2, 3))).toBe(6);
    });

    it('is multiplicative under composition', () => {
      const a = translation(1, 2);
      const b = rotation(PI / 4);
      const c = scale(2, 3);
      const t = compose(compose(a, b), c);
      expect(determinant(t)).toBeCloseTo(determinant(a) * determinant(b) * determinant(c), 10);
    });
  });

  describe('isIdentity', () => {
    it('returns true for identity', () => {
      expect(isIdentity(identity())).toBe(true);
    });

    it('returns true for translation(0,0)', () => {
      expect(isIdentity(translation(0, 0))).toBe(true);
    });

    it('returns true for rotation(0)', () => {
      expect(isIdentity(rotation(0))).toBe(true);
    });

    it('returns true for scale(1,1)', () => {
      expect(isIdentity(scale(1, 1))).toBe(true);
    });

    it('respects custom epsilon', () => {
      const t = { ...identity(), e: 0.0005 };
      expect(isIdentity(t, 0.01)).toBe(true);
      expect(isIdentity(t, 0.0001)).toBe(false);
    });

    it('returns false for non-identity', () => {
      expect(isIdentity(translation(0.01, 0))).toBe(false);
    });
  });

  describe('transformPoint', () => {
    it('applies translation', () => {
      const t = translation(10, 20);
      const p = transformPoint(t, createPoint(1, 2));
      approxPoint(p, { x: 11, y: 22 });
    });

    it('applies rotation', () => {
      const t = rotation(PI / 2);
      const p = transformPoint(t, createPoint(1, 0));
      approxPoint(p, { x: 0, y: 1 });
    });

    it('applies scale', () => {
      const t = scale(2, 3);
      const p = transformPoint(t, createPoint(1, 2));
      approxPoint(p, { x: 2, y: 6 });
    });

    it('applies reflection', () => {
      const t = reflectAcrossX();
      const p = transformPoint(t, createPoint(1, 2));
      approxPoint(p, { x: 1, y: -2 });
    });
  });

  describe('transformVector', () => {
    it('does not apply translation', () => {
      const t = translation(10, 20);
      const v = transformVector(t, createVector(1, 2));
      expect(v.x).toBe(1);
      expect(v.y).toBe(2);
    });

    it('applies rotation', () => {
      const t = rotation(PI / 2);
      const v = transformVector(t, createVector(1, 0));
      expect(v.x).toBeCloseTo(0, 10);
      expect(v.y).toBeCloseTo(1, 10);
    });

    it('applies scale', () => {
      const t = scale(2, 3);
      const v = transformVector(t, createVector(1, 2));
      expect(v.x).toBe(2);
      expect(v.y).toBe(6);
    });

    it('applies reflection', () => {
      const t = reflectAcrossX();
      const v = transformVector(t, createVector(1, 2));
      expect(v.x).toBe(1);
      expect(v.y).toBe(-2);
    });
  });

  describe('transformSegment', () => {
    it('transforms both endpoints', () => {
      const seg = createSegment(createPoint(0, 0), createPoint(1, 1));
      const t = translation(10, 20);
      const transformed = transformSegment(t, seg);
      approxPoint(transformed.from, { x: 10, y: 20 });
      approxPoint(transformed.to, { x: 11, y: 21 });
    });
  });

  describe('transformLine', () => {
    it('transforms point and direction', () => {
      const line = createLine(createPoint(1, 2), createVector(3, 4));
      const t = translation(10, 20);
      const transformed = transformLine(t, line);
      approxPoint(transformed.point, { x: 11, y: 22 });
      expect(transformed.direction.x).toBe(3);
      expect(transformed.direction.y).toBe(4);
    });

    it('throws when direction collapses to zero', () => {
      const line = createLine(createPoint(0, 0), createVector(1, 0));
      const t = scale(0, 1);
      expect(() => transformLine(t, line)).toThrow('Line direction vector must be non-zero');
    });
  });

  describe('transformRay', () => {
    it('transforms origin and direction', () => {
      const ray = createRay(createPoint(1, 2), createVector(3, 4));
      const t = translation(10, 20);
      const transformed = transformRay(t, ray);
      approxPoint(transformed.origin, { x: 11, y: 22 });
      expect(transformed.direction.x).toBe(3);
      expect(transformed.direction.y).toBe(4);
    });

    it('throws when direction collapses to zero', () => {
      const ray = createRay(createPoint(0, 0), createVector(1, 0));
      const t = scale(0, 1);
      expect(() => transformRay(t, ray)).toThrow('Ray direction vector must be non-zero');
    });
  });

  describe('transformBezier', () => {
    it('transforms quadratic bezier', () => {
      const curve = createBezierQuadratic(
        createPoint(0, 0),
        createPoint(1, 1),
        createPoint(2, 0)
      );
      const t = translation(10, 20);
      const transformed = transformBezier(t, curve);
      expect(transformed.kind).toBe('quadratic');
      approxPoint(transformed.p0, { x: 10, y: 20 });
      approxPoint(transformed.p1, { x: 11, y: 21 });
      approxPoint(transformed.p2, { x: 12, y: 20 });
    });

    it('transforms cubic bezier', () => {
      const curve = createBezierCubic(
        createPoint(0, 0),
        createPoint(1, 1),
        createPoint(2, 1),
        createPoint(3, 0)
      );
      const t = translation(10, 20);
      const transformed = transformBezier(t, curve);
      expect(transformed.kind).toBe('cubic');
      approxPoint(transformed.p0, { x: 10, y: 20 });
      approxPoint(transformed.p1, { x: 11, y: 21 });
      approxPoint(transformed.p2, { x: 12, y: 21 });
      approxPoint(transformed.p3, { x: 13, y: 20 });
    });

    it('preserves degree', () => {
      const q = createBezierQuadratic(createPoint(0, 0), createPoint(1, 1), createPoint(2, 0));
      const c = createBezierCubic(createPoint(0, 0), createPoint(1, 1), createPoint(2, 1), createPoint(3, 0));
      expect(transformBezier(identity(), q).kind).toBe('quadratic');
      expect(transformBezier(identity(), c).kind).toBe('cubic');
    });
  });

  describe('transformPath', () => {
    it('transforms startPoint', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(1, 1));
      const t = translation(10, 20);
      const transformed = transformPath(t, path);
      approxPoint(transformed.startPoint!, { x: 10, y: 20 });
    });

    it('transforms line segments', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(1, 1));
      const t = translation(10, 20);
      const transformed = transformPath(t, path);
      expect(transformed.segments[0].kind).toBe('line');
      approxPoint(transformed.segments[0].from, { x: 10, y: 20 });
      approxPoint(transformed.segments[0].to, { x: 11, y: 21 });
    });

    it('transforms bezier segments', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      const curve = createBezierQuadratic(createPoint(1, 1), createPoint(2, 2), createPoint(3, 1));
      path = { ...path, segments: [...path.segments, { kind: 'bezier', curve }] };
      const t = translation(10, 20);
      const transformed = transformPath(t, path);
      expect(transformed.segments[0].kind).toBe('bezier');
      approxPoint((transformed.segments[0] as { curve: { p0: { x: number; y: number } } }).curve.p0, { x: 11, y: 21 });
    });

    it('preserves closed state', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(1, 0));
      path = pathAddLine(path, createPoint(1, 1));
      path = pathClose(path);
      const t = translation(10, 20);
      const transformed = transformPath(t, path);
      expect(transformed.closed).toBe(true);
    });

    it('handles empty path', () => {
      const path = createPath();
      const t = translation(10, 20);
      const transformed = transformPath(t, path);
      expect(transformed.startPoint).toBeUndefined();
      expect(transformed.segments).toHaveLength(0);
      expect(transformed.closed).toBe(false);
    });

    it('throws for arc segment', () => {
      const path: Path = {
        startPoint: createPoint(0, 0),
        segments: [
          {
            kind: 'arc',
            params: {
              center: createPoint(0, 0),
              radius: 10,
              startAngle: 0,
              endAngle: PI / 2,
              ccw: true,
            },
          },
        ],
        closed: false,
      };
      expect(() => transformPath(identity(), path)).toThrow('transformPath: unsupported segment kind arc');
    });
  });

  describe('transformPolygon', () => {
    it('transforms polygon', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      path = pathAddLine(path, createPoint(0, 10));
      path = pathClose(path);
      const poly = createPolygon(path);
      const t = translation(10, 20);
      const transformed = transformPolygon(t, poly);
      const verts = pathGetPoints(transformed.path);
      approxPoint(verts[0], { x: 10, y: 20 });
      approxPoint(verts[1], { x: 20, y: 20 });
    });

    it('scales area by determinant', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      path = pathAddLine(path, createPoint(0, 10));
      path = pathClose(path);
      const poly = createPolygon(path);
      const t = scale(2, 3);
      const transformed = transformPolygon(t, poly);
      expect(polygonArea(transformed)).toBeCloseTo(polygonArea(poly) * 6, 10);
    });

    it('reflection inverts winding order', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      path = pathAddLine(path, createPoint(0, 10));
      path = pathClose(path);
      const poly = createPolygon(path);
      const before = polygonWindingOrder(poly);
      const t = reflectAcrossX();
      const transformed = transformPolygon(t, poly);
      const after = polygonWindingOrder(transformed);
      expect(before).not.toBe(after);
    });
  });
});