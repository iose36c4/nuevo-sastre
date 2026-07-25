import { describe, it, expect } from 'vitest';
import { createLine, lineFromTwoPoints, lineFromPointDirection, linePointAt, lineEvaluateX, lineEvaluateY, lineContainsPoint, isVertical, isHorizontal, lineToNormalForm, lineFromSegment } from '../Line.js';
import { createPoint } from '../Point.js';
import { createVector } from '../Vector.js';
import { createSegment } from '../Segment.js';

describe('Line', () => {
  describe('createLine', () => {
    it('creates a line from point and direction', () => {
      const point = createPoint(1, 2);
      const direction = createVector(3, 4);
      const line = createLine(point, direction);
      expect(line.point).toEqual(point);
      expect(line.direction).toEqual(direction);
    });

    it('throws for zero direction vector', () => {
      const point = createPoint(0, 0);
      const direction = createVector(0, 0);
      expect(() => createLine(point, direction)).toThrow('Line direction vector must be non-zero');
    });
  });

  describe('lineFromTwoPoints', () => {
    it('creates line from two distinct points', () => {
      const p1 = createPoint(0, 0);
      const p2 = createPoint(3, 4);
      const line = lineFromTwoPoints(p1, p2);
      expect(line.point).toEqual(p1);
      expect(line.direction.x).toBe(3);
      expect(line.direction.y).toBe(4);
    });

    it('throws for identical points', () => {
      const p = createPoint(1, 1);
      expect(() => lineFromTwoPoints(p, p)).toThrow('Cannot create line from identical points');
    });

    it('handles vertical line', () => {
      const p1 = createPoint(2, 0);
      const p2 = createPoint(2, 5);
      const line = lineFromTwoPoints(p1, p2);
      expect(line.point).toEqual(p1);
      expect(line.direction.x).toBe(0);
      expect(line.direction.y).toBe(5);
    });

    it('handles horizontal line', () => {
      const p1 = createPoint(0, 3);
      const p2 = createPoint(7, 3);
      const line = lineFromTwoPoints(p1, p2);
      expect(line.point).toEqual(p1);
      expect(line.direction.x).toBe(7);
      expect(line.direction.y).toBe(0);
    });
  });

  describe('lineFromPointDirection', () => {
    it('creates line from point and direction', () => {
      const point = createPoint(1, 2);
      const direction = createVector(5, 12);
      const line = lineFromPointDirection(point, direction);
      expect(line.point).toEqual(point);
      expect(line.direction).toEqual(direction);
    });
  });

  describe('linePointAt', () => {
    it('returns point at t=0', () => {
      const line = lineFromTwoPoints(createPoint(0, 0), createPoint(10, 10));
      const p = linePointAt(line, 0);
      expect(p.x).toBe(0);
      expect(p.y).toBe(0);
    });

    it('returns point at t=1', () => {
      const line = lineFromTwoPoints(createPoint(0, 0), createPoint(10, 10));
      const p = linePointAt(line, 1);
      expect(p.x).toBe(10);
      expect(p.y).toBe(10);
    });

    it('returns point at t=-1 (opposite direction)', () => {
      const line = lineFromTwoPoints(createPoint(0, 0), createPoint(10, 10));
      const p = linePointAt(line, -1);
      expect(p.x).toBe(-10);
      expect(p.y).toBe(-10);
    });

    it('returns point at fractional t', () => {
      const line = lineFromTwoPoints(createPoint(0, 0), createPoint(10, 0));
      const p = linePointAt(line, 0.5);
      expect(p.x).toBe(5);
      expect(p.y).toBe(0);
    });
  });

  describe('lineEvaluateX', () => {
    it('returns y for given x on diagonal line', () => {
      const line = lineFromTwoPoints(createPoint(0, 0), createPoint(10, 10));
      expect(lineEvaluateX(line, 5)).toBe(5);
      expect(lineEvaluateX(line, 0)).toBe(0);
      expect(lineEvaluateX(line, 10)).toBe(10);
    });

    it('returns undefined for vertical line', () => {
      const line = lineFromTwoPoints(createPoint(5, 0), createPoint(5, 10));
      expect(lineEvaluateX(line, 5)).toBeUndefined();
      expect(lineEvaluateX(line, 0)).toBeUndefined();
    });

    it('returns correct y for horizontal line', () => {
      const line = lineFromTwoPoints(createPoint(0, 3), createPoint(10, 3));
      expect(lineEvaluateX(line, 5)).toBe(3);
    });

    it('returns correct y for negative slope', () => {
      const line = lineFromTwoPoints(createPoint(0, 10), createPoint(10, 0));
      expect(lineEvaluateX(line, 5)).toBe(5);
    });
  });

  describe('lineEvaluateY', () => {
    it('returns x for given y on diagonal line', () => {
      const line = lineFromTwoPoints(createPoint(0, 0), createPoint(10, 10));
      expect(lineEvaluateY(line, 5)).toBe(5);
    });

    it('returns undefined for horizontal line', () => {
      const line = lineFromTwoPoints(createPoint(0, 5), createPoint(10, 5));
      expect(lineEvaluateY(line, 5)).toBeUndefined();
    });

    it('returns correct x for vertical line', () => {
      const line = lineFromTwoPoints(createPoint(3, 0), createPoint(3, 10));
      expect(lineEvaluateY(line, 5)).toBe(3);
    });
  });

  describe('lineContainsPoint', () => {
    it('returns true for point on line', () => {
      const line = lineFromTwoPoints(createPoint(0, 0), createPoint(10, 10));
      expect(lineContainsPoint(line, createPoint(5, 5))).toBe(true);
      expect(lineContainsPoint(line, createPoint(0, 0))).toBe(true);
      expect(lineContainsPoint(line, createPoint(-5, -5))).toBe(true);
    });

    it('returns false for point off line', () => {
      const line = lineFromTwoPoints(createPoint(0, 0), createPoint(10, 10));
      expect(lineContainsPoint(line, createPoint(5, 6))).toBe(false);
      expect(lineContainsPoint(line, createPoint(1, 2))).toBe(false);
    });

    it('works for vertical line', () => {
      const line = lineFromTwoPoints(createPoint(3, 0), createPoint(3, 10));
      expect(lineContainsPoint(line, createPoint(3, 5))).toBe(true);
      expect(lineContainsPoint(line, createPoint(3, -5))).toBe(true);
      expect(lineContainsPoint(line, createPoint(4, 5))).toBe(false);
    });
  });

  describe('isVertical', () => {
    it('returns true for vertical line', () => {
      const line = lineFromTwoPoints(createPoint(5, 0), createPoint(5, 10));
      expect(isVertical(line)).toBe(true);
    });

    it('returns false for horizontal line', () => {
      const line = lineFromTwoPoints(createPoint(0, 5), createPoint(10, 5));
      expect(isVertical(line)).toBe(false);
    });

    it('returns false for diagonal line', () => {
      const line = lineFromTwoPoints(createPoint(0, 0), createPoint(10, 10));
      expect(isVertical(line)).toBe(false);
    });
  });

  describe('isHorizontal', () => {
    it('returns true for horizontal line', () => {
      const line = lineFromTwoPoints(createPoint(0, 5), createPoint(10, 5));
      expect(isHorizontal(line)).toBe(true);
    });

    it('returns false for vertical line', () => {
      const line = lineFromTwoPoints(createPoint(5, 0), createPoint(5, 10));
      expect(isHorizontal(line)).toBe(false);
    });

    it('returns false for diagonal line', () => {
      const line = lineFromTwoPoints(createPoint(0, 0), createPoint(10, 10));
      expect(isHorizontal(line)).toBe(false);
    });
  });

  describe('lineToNormalForm', () => {
    it('returns normalized normal form for horizontal line', () => {
      const line = lineFromTwoPoints(createPoint(0, 3), createPoint(10, 3));
      const { a, b, c } = lineToNormalForm(line);
      expect(a).toBeCloseTo(0, 10);
      expect(b).toBeCloseTo(1, 10);
      expect(c).toBeCloseTo(-3, 10);
    });

    it('returns normalized normal form for vertical line', () => {
      const line = lineFromTwoPoints(createPoint(4, 0), createPoint(4, 10));
      const { a, b, c } = lineToNormalForm(line);
      // Normal form is not unique; both (a=1, c=-4) and (a=-1, c=4) represent x=4
      expect(Math.abs(a)).toBeCloseTo(1, 10);
      expect(Math.abs(b)).toBeCloseTo(0, 10);
      expect(Math.abs(c)).toBeCloseTo(4, 10);
      // Verify the line equation is correct: a*x + b*y + c = 0 should hold for point on line
      expect(a * 4 + b * 0 + c).toBeCloseTo(0, 10);
    });

    it('returns normalized normal form for diagonal line', () => {
      const line = lineFromTwoPoints(createPoint(0, 0), createPoint(10, 10));
      const { a, b, c } = lineToNormalForm(line);
      expect(a).toBeCloseTo(-0.7071, 3);
      expect(b).toBeCloseTo(0.7071, 3);
      expect(c).toBeCloseTo(0, 10);
    });
  });

  describe('lineFromSegment', () => {
    it('converts segment to line', () => {
      const seg = createSegment(createPoint(1, 2), createPoint(4, 6));
      const line = lineFromSegment(seg);
      expect(line.point).toEqual(seg.from);
      expect(line.direction.x).toBe(3);
      expect(line.direction.y).toBe(4);
    });

    it('preserves direction', () => {
      const seg = createSegment(createPoint(0, 0), createPoint(5, 5));
      const line = lineFromSegment(seg);
      expect(line.point).toEqual(createPoint(0, 0));
      expect(line.direction.x).toBe(5);
      expect(line.direction.y).toBe(5);
    });
  });
});