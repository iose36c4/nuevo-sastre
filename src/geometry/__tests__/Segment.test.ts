import { describe, it, expect } from 'vitest';
import { createSegment, segmentLength, segmentMidpoint, segmentPointAt, segmentDirection, segmentReverse, isDegenerate, segmentToLine } from '../Segment.js';
import { createPoint } from '../Point.js';
import { createVector } from '../Vector.js';

describe('Segment', () => {
  describe('createSegment', () => {
    it('creates a segment from two points', () => {
      const from = createPoint(0, 0);
      const to = createPoint(3, 4);
      const seg = createSegment(from, to);
      expect(seg.from).toEqual(from);
      expect(seg.to).toEqual(to);
    });

    it('handles negative coordinates', () => {
      const from = createPoint(-1, -2);
      const to = createPoint(-4, -6);
      const seg = createSegment(from, to);
      expect(seg.from).toEqual(from);
      expect(seg.to).toEqual(to);
    });

    it('handles zero-length segment', () => {
      const p = createPoint(5, 5);
      const seg = createSegment(p, p);
      expect(seg.from).toEqual(p);
      expect(seg.to).toEqual(p);
    });
  });

  describe('segmentLength', () => {
    it('returns correct length for 3-4-5 triangle', () => {
      const seg = createSegment(createPoint(0, 0), createPoint(3, 4));
      expect(segmentLength(seg)).toBe(5);
    });

    it('returns zero for degenerate segment', () => {
      const p = createPoint(2, 3);
      const seg = createSegment(p, p);
      expect(segmentLength(seg)).toBe(0);
    });

    it('returns correct length for horizontal segment', () => {
      const seg = createSegment(createPoint(0, 0), createPoint(10, 0));
      expect(segmentLength(seg)).toBe(10);
    });

    it('returns correct length for vertical segment', () => {
      const seg = createSegment(createPoint(0, 0), createPoint(0, 7));
      expect(segmentLength(seg)).toBe(7);
    });

    it('returns correct length for diagonal segment', () => {
      const seg = createSegment(createPoint(1, 1), createPoint(4, 5));
      expect(segmentLength(seg)).toBe(5);
    });
  });

  describe('segmentMidpoint', () => {
    it('returns midpoint of horizontal segment', () => {
      const seg = createSegment(createPoint(0, 0), createPoint(10, 0));
      const mid = segmentMidpoint(seg);
      expect(mid.x).toBe(5);
      expect(mid.y).toBe(0);
    });

    it('returns midpoint of vertical segment', () => {
      const seg = createSegment(createPoint(0, 0), createPoint(0, 8));
      const mid = segmentMidpoint(seg);
      expect(mid.x).toBe(0);
      expect(mid.y).toBe(4);
    });

    it('returns midpoint of diagonal segment', () => {
      const seg = createSegment(createPoint(1, 2), createPoint(5, 6));
      const mid = segmentMidpoint(seg);
      expect(mid.x).toBe(3);
      expect(mid.y).toBe(4);
    });

    it('returns same point for degenerate segment', () => {
      const p = createPoint(3, 4);
      const seg = createSegment(p, p);
      const mid = segmentMidpoint(seg);
      expect(mid.x).toBe(3);
      expect(mid.y).toBe(4);
    });
  });

  describe('segmentPointAt', () => {
    it('returns from point at t=0', () => {
      const seg = createSegment(createPoint(0, 0), createPoint(10, 10));
      const p = segmentPointAt(seg, 0);
      expect(p.x).toBe(0);
      expect(p.y).toBe(0);
    });

    it('returns to point at t=1', () => {
      const seg = createSegment(createPoint(0, 0), createPoint(10, 10));
      const p = segmentPointAt(seg, 1);
      expect(p.x).toBe(10);
      expect(p.y).toBe(10);
    });

    it('returns midpoint at t=0.5', () => {
      const seg = createSegment(createPoint(0, 0), createPoint(10, 10));
      const p = segmentPointAt(seg, 0.5);
      expect(p.x).toBe(5);
      expect(p.y).toBe(5);
    });

    it('returns correct point for intermediate t values', () => {
      const seg = createSegment(createPoint(0, 0), createPoint(100, 0));
      expect(segmentPointAt(seg, 0.25).x).toBe(25);
      expect(segmentPointAt(seg, 0.75).x).toBe(75);
    });

    it('handles negative coordinates', () => {
      const seg = createSegment(createPoint(-10, -10), createPoint(10, 10));
      expect(segmentPointAt(seg, 0.5).x).toBe(0);
      expect(segmentPointAt(seg, 0.5).y).toBe(0);
    });
  });

  describe('segmentDirection', () => {
    it('returns correct direction vector', () => {
      const seg = createSegment(createPoint(0, 0), createPoint(3, 4));
      const dir = segmentDirection(seg);
      expect(dir.x).toBe(3);
      expect(dir.y).toBe(4);
    });

    it('returns zero vector for degenerate segment', () => {
      const p = createPoint(2, 2);
      const seg = createSegment(p, p);
      const dir = segmentDirection(seg);
      expect(dir.x).toBe(0);
      expect(dir.y).toBe(0);
    });
  });

  describe('segmentReverse', () => {
    it('reverses segment endpoints', () => {
      const seg = createSegment(createPoint(0, 0), createPoint(5, 10));
      const rev = segmentReverse(seg);
      expect(rev.from.x).toBe(5);
      expect(rev.from.y).toBe(10);
      expect(rev.to.x).toBe(0);
      expect(rev.to.y).toBe(0);
    });

    it('preserves length', () => {
      const seg = createSegment(createPoint(1, 2), createPoint(4, 6));
      const rev = segmentReverse(seg);
      expect(segmentLength(rev)).toBe(segmentLength(seg));
    });
  });

  describe('isDegenerate', () => {
    it('returns true for zero-length segment', () => {
      const seg = createSegment(createPoint(5, 5), createPoint(5, 5));
      expect(isDegenerate(seg)).toBe(true);
    });

    it('returns false for non-zero segment', () => {
      const seg = createSegment(createPoint(0, 0), createPoint(1, 0));
      expect(isDegenerate(seg)).toBe(false);
    });

    it('respects custom epsilon', () => {
      const seg = createSegment(createPoint(0, 0), createPoint(0.0005, 0));
      expect(isDegenerate(seg, 0.001)).toBe(true);
      expect(isDegenerate(seg, 0.0001)).toBe(false);
    });
  });

  describe('segmentToLine', () => {
    it('converts non-degenerate segment to line', () => {
      const seg = createSegment(createPoint(0, 0), createPoint(3, 4));
      const line = segmentToLine(seg);
      expect(line.point).toEqual(seg.from);
      expect(line.direction.x).toBe(3);
      expect(line.direction.y).toBe(4);
    });

    it('throws for degenerate segment', () => {
      const seg = createSegment(createPoint(0, 0), createPoint(0, 0));
      expect(() => segmentToLine(seg)).toThrow('Cannot convert degenerate segment to line');
    });
  });
});