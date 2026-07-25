import { describe, it, expect } from 'vitest';
import { createRay, rayFromPoints, rayPointAt, rayContainsPoint, rayToLine } from '../Ray.js';
import { createPoint } from '../Point.js';
import { createVector } from '../Vector.js';
import { lineFromTwoPoints } from '../Line.js';

describe('Ray', () => {
  describe('createRay', () => {
    it('creates a ray from origin and direction', () => {
      const origin = createPoint(1, 2);
      const direction = createVector(3, 4);
      const ray = createRay(origin, direction);
      expect(ray.origin).toEqual(origin);
      expect(ray.direction).toEqual(direction);
    });

    it('throws for zero direction vector', () => {
      const origin = createPoint(0, 0);
      const direction = createVector(0, 0);
      expect(() => createRay(origin, direction)).toThrow('Ray direction vector must be non-zero');
    });

    it('handles negative direction', () => {
      const origin = createPoint(5, 5);
      const direction = createVector(-1, -1);
      const ray = createRay(origin, direction);
      expect(ray.direction.x).toBe(-1);
      expect(ray.direction.y).toBe(-1);
    });
  });

  describe('rayFromPoints', () => {
    it('creates ray from origin through point', () => {
      const origin = createPoint(0, 0);
      const through = createPoint(3, 4);
      const ray = rayFromPoints(origin, through);
      expect(ray.origin).toEqual(origin);
      expect(ray.direction.x).toBe(3);
      expect(ray.direction.y).toBe(4);
    });

    it('throws for identical points', () => {
      const p = createPoint(1, 1);
      expect(() => rayFromPoints(p, p)).toThrow('Ray direction vector must be non-zero');
    });
  });

  describe('rayPointAt', () => {
    it('returns origin at t=0', () => {
      const ray = createRay(createPoint(0, 0), createVector(10, 10));
      const p = rayPointAt(ray, 0);
      expect(p.x).toBe(0);
      expect(p.y).toBe(0);
    });

    it('returns point along ray at t=1', () => {
      const ray = createRay(createPoint(0, 0), createVector(10, 10));
      const p = rayPointAt(ray, 1);
      expect(p.x).toBe(10);
      expect(p.y).toBe(10);
    });

    it('returns point at fractional t', () => {
      const ray = createRay(createPoint(0, 0), createVector(100, 0));
      const p = rayPointAt(ray, 0.5);
      expect(p.x).toBe(50);
      expect(p.y).toBe(0);
    });

    it('returns point at larger t', () => {
      const ray = createRay(createPoint(0, 0), createVector(1, 1));
      const p = rayPointAt(ray, 5);
      expect(p.x).toBe(5);
      expect(p.y).toBe(5);
    });

    it('throws for negative t', () => {
      const ray = createRay(createPoint(0, 0), createVector(1, 1));
      expect(() => rayPointAt(ray, -1)).toThrow('Ray parameter t must be non-negative');
    });

    it('throws for negative fractional t', () => {
      const ray = createRay(createPoint(0, 0), createVector(1, 1));
      expect(() => rayPointAt(ray, -0.5)).toThrow('Ray parameter t must be non-negative');
    });
  });

  describe('rayContainsPoint', () => {
    it('returns true for origin', () => {
      const ray = createRay(createPoint(0, 0), createVector(1, 1));
      expect(rayContainsPoint(ray, createPoint(0, 0))).toBe(true);
    });

    it('returns true for point along ray direction', () => {
      const ray = createRay(createPoint(0, 0), createVector(10, 10));
      expect(rayContainsPoint(ray, createPoint(5, 5))).toBe(true);
      expect(rayContainsPoint(ray, createPoint(10, 10))).toBe(true);
    });

    it('returns false for point behind origin', () => {
      const ray = createRay(createPoint(0, 0), createVector(1, 1));
      expect(rayContainsPoint(ray, createPoint(-5, -5))).toBe(false);
    });

    it('returns false for point off ray line', () => {
      const ray = createRay(createPoint(0, 0), createVector(1, 0));
      expect(rayContainsPoint(ray, createPoint(5, 1))).toBe(false);
    });

    it('works for vertical ray', () => {
      const ray = createRay(createPoint(2, 0), createVector(0, 1));
      expect(rayContainsPoint(ray, createPoint(2, 5))).toBe(true);
      expect(rayContainsPoint(ray, createPoint(2, -1))).toBe(false);
      expect(rayContainsPoint(ray, createPoint(3, 5))).toBe(false);
    });

    it('works for horizontal ray', () => {
      const ray = createRay(createPoint(0, 3), createVector(1, 0));
      expect(rayContainsPoint(ray, createPoint(5, 3))).toBe(true);
      expect(rayContainsPoint(ray, createPoint(-1, 3))).toBe(false);
    });

    it('works for diagonal ray with negative direction', () => {
      const ray = createRay(createPoint(5, 5), createVector(-1, -1));
      expect(rayContainsPoint(ray, createPoint(3, 3))).toBe(true);
      expect(rayContainsPoint(ray, createPoint(6, 6))).toBe(false);
    });
  });

  describe('rayToLine', () => {
    it('converts ray to line with same origin and direction', () => {
      const ray = createRay(createPoint(1, 2), createVector(3, 4));
      const line = rayToLine(ray);
      expect(line.point).toEqual(ray.origin);
      expect(line.direction).toEqual(ray.direction);
    });

    it('preserves line equivalence', () => {
      const ray = createRay(createPoint(0, 0), createVector(5, 12));
      const line = rayToLine(ray);
      const line2 = lineFromTwoPoints(createPoint(0, 0), createPoint(5, 12));
      expect(line.point).toEqual(line2.point);
      expect(line.direction.x).toEqual(line2.direction.x);
      expect(line.direction.y).toEqual(line2.direction.y);
    });
  });
});