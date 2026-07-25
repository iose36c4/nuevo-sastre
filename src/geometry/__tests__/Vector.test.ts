import { describe, it, expect } from 'vitest';
import {
  createVector,
  vectorFromPoints,
  addVectors,
  subtractVectors,
  scaleVector,
  normalizeVector,
  dotProduct,
  crossProduct,
  vectorAngle,
  vectorFromAngle,
  perpendicularVector,
  vectorMagnitude,
  vectorsEqual,
  GEOMETRIC_EPSILON,
} from '../Vector.js';
import { createPoint } from '../Point.js';

describe('Vector2D', () => {
  describe('createVector', () => {
    it('creates a vector with given components', () => {
      const v = createVector(3, 4);
      expect(v.x).toBe(3);
      expect(v.y).toBe(4);
    });
  });

  describe('vectorFromPoints', () => {
    it('creates vector from point A to point B', () => {
      const a = createPoint(1, 2);
      const b = createPoint(4, 6);
      const v = vectorFromPoints(a, b);
      expect(v.x).toBe(3);
      expect(v.y).toBe(4);
    });
  });

  describe('addVectors', () => {
    it('adds two vectors component-wise', () => {
      const a = createVector(1, 2);
      const b = createVector(3, 4);
      const result = addVectors(a, b);
      expect(result.x).toBe(4);
      expect(result.y).toBe(6);
    });
  });

  describe('subtractVectors', () => {
    it('subtracts vector b from vector a', () => {
      const a = createVector(5, 7);
      const b = createVector(2, 3);
      const result = subtractVectors(a, b);
      expect(result.x).toBe(3);
      expect(result.y).toBe(4);
    });
  });

  describe('scaleVector', () => {
    it('scales vector by positive scalar', () => {
      const v = createVector(2, 3);
      const result = scaleVector(v, 3);
      expect(result.x).toBe(6);
      expect(result.y).toBe(9);
    });

    it('scales vector by negative scalar', () => {
      const v = createVector(2, 3);
      const result = scaleVector(v, -2);
      expect(result.x).toBe(-4);
      expect(result.y).toBe(-6);
    });

    it('scales vector by zero', () => {
      const v = createVector(2, 3);
      const result = scaleVector(v, 0);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });
  });

  describe('vectorMagnitude', () => {
    it('returns correct magnitude for 3-4-5 triangle', () => {
      const v = createVector(3, 4);
      expect(vectorMagnitude(v)).toBe(5);
    });

    it('returns zero for zero vector', () => {
      const v = createVector(0, 0);
      expect(vectorMagnitude(v)).toBe(0);
    });

    it('returns correct magnitude for negative components', () => {
      const v = createVector(-3, -4);
      expect(vectorMagnitude(v)).toBe(5);
    });
  });

  describe('normalizeVector', () => {
    it('returns unit vector in same direction', () => {
      const v = createVector(3, 4);
      const result = normalizeVector(v);
      expect(vectorMagnitude(result)).toBeCloseTo(1, 10);
      expect(result.x).toBeCloseTo(0.6, 10);
      expect(result.y).toBeCloseTo(0.8, 10);
    });

    it('returns zero vector for zero-length input', () => {
      const v = createVector(0, 0);
      const result = normalizeVector(v);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('handles very small vectors', () => {
      const v = createVector(1e-10, 1e-10);
      const result = normalizeVector(v);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });
  });

  describe('dotProduct', () => {
    it('returns correct dot product', () => {
      const a = createVector(1, 2);
      const b = createVector(3, 4);
      expect(dotProduct(a, b)).toBe(11);
    });

    it('returns zero for perpendicular vectors', () => {
      const a = createVector(1, 0);
      const b = createVector(0, 1);
      expect(dotProduct(a, b)).toBe(0);
    });

    it('returns negative for obtuse angle', () => {
      const a = createVector(1, 0);
      const b = createVector(-1, 0);
      expect(dotProduct(a, b)).toBe(-1);
    });
  });

  describe('crossProduct', () => {
    it('returns correct 2D cross product (scalar)', () => {
      const a = createVector(1, 2);
      const b = createVector(3, 4);
      expect(crossProduct(a, b)).toBe(-2);
    });

    it('returns positive for counter-clockwise orientation', () => {
      const a = createVector(1, 0);
      const b = createVector(0, 1);
      expect(crossProduct(a, b)).toBe(1);
    });

    it('returns negative for clockwise orientation', () => {
      const a = createVector(0, 1);
      const b = createVector(1, 0);
      expect(crossProduct(a, b)).toBe(-1);
    });

    it('returns zero for parallel vectors', () => {
      const a = createVector(2, 3);
      const b = createVector(4, 6);
      expect(crossProduct(a, b)).toBe(0);
    });
  });

  describe('vectorAngle', () => {
    it('returns 0 for vector along positive X axis', () => {
      const v = createVector(1, 0);
      expect(vectorAngle(v)).toBe(0);
    });

    it('returns PI/2 for vector along positive Y axis', () => {
      const v = createVector(0, 1);
      expect(vectorAngle(v)).toBeCloseTo(Math.PI / 2, 10);
    });

    it('returns -PI/2 for vector along negative Y axis', () => {
      const v = createVector(0, -1);
      expect(vectorAngle(v)).toBeCloseTo(-Math.PI / 2, 10);
    });

    it('returns PI for vector along negative X axis', () => {
      const v = createVector(-1, 0);
      expect(vectorAngle(v)).toBeCloseTo(Math.PI, 10);
    });

    it('returns 45 degrees (PI/4) for (1,1)', () => {
      const v = createVector(1, 1);
      expect(vectorAngle(v)).toBeCloseTo(Math.PI / 4, 10);
    });
  });

  describe('vectorFromAngle', () => {
    it('creates unit vector at 0 radians', () => {
      const v = vectorFromAngle(0);
      expect(v.x).toBeCloseTo(1, 10);
      expect(v.y).toBeCloseTo(0, 10);
    });

    it('creates unit vector at PI/2 radians', () => {
      const v = vectorFromAngle(Math.PI / 2);
      expect(v.x).toBeCloseTo(0, 10);
      expect(v.y).toBeCloseTo(1, 10);
    });

    it('creates unit vector at PI radians', () => {
      const v = vectorFromAngle(Math.PI);
      expect(v.x).toBeCloseTo(-1, 10);
      expect(v.y).toBeCloseTo(0, 10);
    });

    it('always creates unit vector', () => {
      for (const angle of [0, Math.PI / 4, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        const v = vectorFromAngle(angle);
        expect(vectorMagnitude(v)).toBeCloseTo(1, 10);
      }
    });
  });

  describe('perpendicularVector', () => {
    it('returns 90-degree counter-clockwise rotation', () => {
      const v = createVector(1, 0);
      const perp = perpendicularVector(v);
      expect(perp.x).toBe(0);
      expect(perp.y).toBe(1);
    });

    it('returns perpendicular vector for arbitrary input', () => {
      const v = createVector(3, 4);
      const perp = perpendicularVector(v);
      expect(dotProduct(v, perp)).toBeCloseTo(0, 10);
      expect(vectorMagnitude(perp)).toBeCloseTo(vectorMagnitude(v), 10);
    });

    it('preserves magnitude', () => {
      const v = createVector(5, 12);
      const perp = perpendicularVector(v);
      expect(vectorMagnitude(perp)).toBeCloseTo(13, 10);
    });
  });

  describe('vectorsEqual', () => {
    it('returns true for identical vectors', () => {
      const a = createVector(1, 2);
      const b = createVector(1, 2);
      expect(vectorsEqual(a, b)).toBe(true);
    });

    it('returns true for vectors within epsilon', () => {
      const a = createVector(1, 2);
      const b = createVector(1.0005, 2.0005);
      expect(vectorsEqual(a, b)).toBe(true);
    });

    it('returns false for vectors outside epsilon', () => {
      const a = createVector(1, 2);
      const b = createVector(1.01, 2);
      expect(vectorsEqual(a, b)).toBe(false);
    });

    it('respects custom epsilon', () => {
      const a = createVector(1, 2);
      const b = createVector(1.005, 2);
      expect(vectorsEqual(a, b, 0.01)).toBe(true);
      expect(vectorsEqual(a, b, 0.001)).toBe(false);
    });
  });
});