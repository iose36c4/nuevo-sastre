import { describe, it, expect } from 'vitest';
import { createPoint, pointsEqual, GEOMETRIC_EPSILON } from '../Point.js';

describe('Point2D', () => {
  describe('createPoint', () => {
    it('creates a point with given coordinates', () => {
      const p = createPoint(10, 20);
      expect(p.x).toBe(10);
      expect(p.y).toBe(20);
    });

    it('creates point with zero coordinates', () => {
      const p = createPoint(0, 0);
      expect(p.x).toBe(0);
      expect(p.y).toBe(0);
    });

    it('creates point with negative coordinates', () => {
      const p = createPoint(-5, -3);
      expect(p.x).toBe(-5);
      expect(p.y).toBe(-3);
    });

    it('creates point with decimal coordinates', () => {
      const p = createPoint(1.5, 2.5);
      expect(p.x).toBe(1.5);
      expect(p.y).toBe(2.5);
    });
  });

  describe('pointsEqual', () => {
    it('returns true for identical points', () => {
      const a = createPoint(10, 20);
      const b = createPoint(10, 20);
      expect(pointsEqual(a, b)).toBe(true);
    });

    it('returns true for points within epsilon', () => {
      const a = createPoint(10, 20);
      const b = createPoint(10.0005, 20.0005);
      expect(pointsEqual(a, b)).toBe(true);
    });

    it('returns false for points outside epsilon', () => {
      const a = createPoint(10, 20);
      const b = createPoint(10.01, 20);
      expect(pointsEqual(a, b)).toBe(false);
    });

    it('respects custom epsilon', () => {
      const a = createPoint(10, 20);
      const b = createPoint(10.005, 20);
      expect(pointsEqual(a, b, 0.01)).toBe(true);
      expect(pointsEqual(a, b, 0.001)).toBe(false);
    });

    it('handles zero-length vectors', () => {
      const a = createPoint(0, 0);
      const b = createPoint(0, 0);
      expect(pointsEqual(a, b)).toBe(true);
    });

    it('handles negative coordinates', () => {
      const a = createPoint(-10, -20);
      const b = createPoint(-10, -20);
      expect(pointsEqual(a, b)).toBe(true);
    });
  });

  describe('GEOMETRIC_EPSILON', () => {
    it('is 0.001', () => {
      expect(GEOMETRIC_EPSILON).toBe(0.001);
    });
  });
});