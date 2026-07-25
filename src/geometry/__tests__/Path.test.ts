import { describe, it, expect } from 'vitest';
import {
  createPath,
  pathAddLine,
  pathClose,
  pathGetPoints,
  pathLength,
  pathIsEmpty,
  pathSegmentCount,
  pathFirstPoint,
  pathLastPoint,
  pathPointAt,
  pathTranslate,
  pathRotate,
  pathBoundingBox,
  pathIsClosed,
  pathEndpoints,
} from '../Path.js';
import { createPoint } from '../Point.js';

describe('Path', () => {
  describe('createPath', () => {
    it('creates an empty path', () => {
      const path = createPath();
      expect(path.segments).toEqual([]);
      expect(path.startPoint).toBeUndefined();
      expect(path.closed).toBe(false);
    });
  });

  describe('pathAddLine', () => {
    it('adds first point as startPoint (no segment)', () => {
      const path = createPath();
      const p1 = createPoint(0, 0);
      const newPath = pathAddLine(path, p1);
      expect(newPath.startPoint).toEqual(p1);
      expect(newPath.segments).toHaveLength(0);
    });

    it('creates segment on second point', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      expect(path.segments).toHaveLength(1);
      expect(path.segments[0].from).toEqual(createPoint(0, 0));
      expect(path.segments[0].to).toEqual(createPoint(10, 0));
    });

    it('adds segments to a path with points', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      expect(path.segments).toHaveLength(2);
      expect(path.segments[0].from).toEqual(createPoint(0, 0));
      expect(path.segments[0].to).toEqual(createPoint(10, 0));
      expect(path.segments[1].from).toEqual(createPoint(10, 0));
      expect(path.segments[1].to).toEqual(createPoint(10, 10));
    });

    it('handles negative coordinates', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(-5, -5));
      path = pathAddLine(path, createPoint(5, 5));
      expect(path.segments[0].from).toEqual(createPoint(-5, -5));
      expect(path.segments[0].to).toEqual(createPoint(5, 5));
    });

    it('handles zero-length segments', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(0, 0));
      expect(path.segments[0].from).toEqual(createPoint(0, 0));
      expect(path.segments[0].to).toEqual(createPoint(0, 0));
    });
  });

  describe('pathClose', () => {
    it('closes an open path by adding a segment back to start', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      const closed = pathClose(path);
      expect(closed.closed).toBe(true);
      expect(closed.segments).toHaveLength(3);
      expect(closed.segments[2].from).toEqual(createPoint(10, 10));
      expect(closed.segments[2].to).toEqual(createPoint(0, 0));
    });

    it('marks already closed path as closed without adding segment', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      path = pathAddLine(path, createPoint(0, 0));
      const closed = pathClose(path);
      expect(closed.closed).toBe(true);
      expect(closed.segments).toHaveLength(3);
    });

    it('throws for empty path', () => {
      const path = createPath();
      expect(() => pathClose(path)).toThrow('Cannot close empty path or path without segments');
    });

    it('throws for path with startPoint but no segments', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      expect(() => pathClose(path)).toThrow('Cannot close empty path or path without segments');
    });
  });

  describe('pathGetPoints', () => {
    it('returns empty array for empty path', () => {
      const path = createPath();
      expect(pathGetPoints(path)).toEqual([]);
    });

    it('returns single point for path with only startPoint', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(5, 5));
      expect(pathGetPoints(path)).toEqual([createPoint(5, 5)]);
    });

    it('returns all points in order for simple path', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      const points = pathGetPoints(path);
      expect(points).toHaveLength(3);
      expect(points[0]).toEqual(createPoint(0, 0));
      expect(points[1]).toEqual(createPoint(10, 0));
      expect(points[2]).toEqual(createPoint(10, 10));
    });

    it('includes closing point for closed path', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      path = pathClose(path);
      const points = pathGetPoints(path);
      expect(points).toHaveLength(4);
      expect(points[3]).toEqual(createPoint(0, 0));
    });
  });

  describe('pathLength', () => {
    it('returns 0 for empty path', () => {
      const path = createPath();
      expect(pathLength(path)).toBe(0);
    });

    it('returns 0 for single point path', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(5, 5));
      expect(pathLength(path)).toBe(0);
    });

    it('returns correct length for horizontal segment', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      expect(pathLength(path)).toBe(10);
    });

    it('returns correct length for vertical segment', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(0, 7));
      expect(pathLength(path)).toBe(7);
    });

    it('returns correct length for diagonal segment (3-4-5 triangle)', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(3, 4));
      expect(pathLength(path)).toBe(5);
    });

    it('sums lengths for multi-segment path (L-shape)', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(3, 0));
      path = pathAddLine(path, createPoint(3, 4));
      // L-shape: horizontal 3 + vertical 4 = 7
      expect(pathLength(path)).toBe(7);
    });

    it('includes closing segment length', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(3, 0));
      path = pathAddLine(path, createPoint(3, 4));
      path = pathClose(path); // adds segment from (3,4) to (0,0) = length 5
      expect(pathLength(path)).toBe(12); // 3 + 4 + 5
    });
  });

  describe('pathIsEmpty', () => {
    it('returns true for empty path', () => {
      expect(pathIsEmpty(createPath())).toBe(true);
    });

    it('returns false for path with only startPoint', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      expect(pathIsEmpty(path)).toBe(false);
    });

    it('returns false for path with real segments', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(1, 1));
      expect(pathIsEmpty(path)).toBe(false);
    });
  });

  describe('pathSegmentCount', () => {
    it('returns 0 for empty path', () => {
      expect(pathSegmentCount(createPath())).toBe(0);
    });

    it('returns 0 for single point path', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      expect(pathSegmentCount(path)).toBe(0);
    });

    it('returns correct count for simple path', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(1, 1));
      expect(pathSegmentCount(path)).toBe(1);
    });

    it('returns correct count for multi-segment path', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(1, 0));
      path = pathAddLine(path, createPoint(1, 1));
      path = pathAddLine(path, createPoint(0, 1));
      expect(pathSegmentCount(path)).toBe(3);
    });

    it('includes closing segment in count', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(1, 0));
      path = pathAddLine(path, createPoint(1, 1));
      path = pathClose(path);
      expect(pathSegmentCount(path)).toBe(3);
    });
  });

  describe('pathFirstPoint', () => {
    it('returns undefined for empty path', () => {
      expect(pathFirstPoint(createPath())).toBeUndefined();
    });

    it('returns first point of path', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(5, 5));
      path = pathAddLine(path, createPoint(10, 10));
      expect(pathFirstPoint(path)).toEqual(createPoint(5, 5));
    });

    it('returns startPoint for single point path', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(3, 3));
      expect(pathFirstPoint(path)).toEqual(createPoint(3, 3));
    });
  });

  describe('pathLastPoint', () => {
    it('returns undefined for empty path', () => {
      expect(pathLastPoint(createPath())).toBeUndefined();
    });

    it('returns last point of path', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(5, 5));
      path = pathAddLine(path, createPoint(10, 10));
      expect(pathLastPoint(path)).toEqual(createPoint(10, 10));
    });

    it('returns startPoint for single point path', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(7, 7));
      expect(pathLastPoint(path)).toEqual(createPoint(7, 7));
    });

    it('returns closing point for closed path', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      path = pathClose(path);
      expect(pathLastPoint(path)).toEqual(createPoint(0, 0));
    });
  });

  describe('pathPointAt', () => {
    it('returns first point at t=0', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 10));
      const p = pathPointAt(path, 0);
      expect(p).toEqual(createPoint(0, 0));
    });

    it('returns last point at t=1', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 10));
      const p = pathPointAt(path, 1);
      expect(p).toEqual(createPoint(10, 10));
    });

    it('returns midpoint at t=0.5 for single segment', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 10));
      const p = pathPointAt(path, 0.5);
      expect(p).toEqual(createPoint(5, 5));
    });

    it('returns correct point for multi-segment path', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      // Total length = 20, t=0.5 -> 10 units = end of first segment
      const p = pathPointAt(path, 0.5);
      expect(p).toEqual(createPoint(10, 0));
    });

    it('throws for t < 0', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 10));
      expect(() => pathPointAt(path, -0.1)).toThrow('Parameter t must be between 0 and 1');
    });

    it('throws for t > 1', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 10));
      expect(() => pathPointAt(path, 1.1)).toThrow('Parameter t must be between 0 and 1');
    });

    it('throws for empty path', () => {
      expect(() => pathPointAt(createPath(), 0.5)).toThrow('Cannot get point on empty path');
    });
  });

  describe('pathTranslate', () => {
    it('translates all points by dx, dy', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(1, 2));
      path = pathAddLine(path, createPoint(4, 6));
      path = pathAddLine(path, createPoint(7, 2));
      const translated = pathTranslate(path, 10, 20);
      expect(translated.startPoint).toEqual(createPoint(11, 22));
      expect(translated.segments[0].from).toEqual(createPoint(11, 22));
      expect(translated.segments[0].to).toEqual(createPoint(14, 26));
      expect(translated.segments[1].from).toEqual(createPoint(14, 26));
      expect(translated.segments[1].to).toEqual(createPoint(17, 22));
    });

    it('preserves closed state', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      path = pathClose(path);
      const translated = pathTranslate(path, 5, 5);
      expect(translated.closed).toBe(true);
    });

    it('does not mutate original path', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 10));
      const originalStart = path.startPoint;
      pathTranslate(path, 5, 5);
      expect(path.startPoint).toEqual(originalStart);
    });
  });

describe('pathRotate', () => {
    it('rotates points around origin by 90 degrees', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(1, 0));
      path = pathAddLine(path, createPoint(0, 1));
      const rotated = pathRotate(path, Math.PI / 2);
      // (1,0) -> (0,1), (0,1) -> (-1,0)
      // New model: startPoint = (1,0) -> (0,1); segment from (1,0) to (0,1) -> from (0,1) to (-1,0)
      expect(rotated.startPoint!.x).toBeCloseTo(0, 5);
      expect(rotated.startPoint!.y).toBeCloseTo(1, 5);
      expect(rotated.segments[0].from.x).toBeCloseTo(0, 5);
      expect(rotated.segments[0].from.y).toBeCloseTo(1, 5);
      expect(rotated.segments[0].to.x).toBeCloseTo(-1, 5);
      expect(rotated.segments[0].to.y).toBeCloseTo(0, 5);
    });

    it('rotates around custom center point', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(1, 1));
      path = pathAddLine(path, createPoint(2, 1));
      const rotated = pathRotate(path, Math.PI / 2, createPoint(1, 1));
      // Rotate around (1,1): (1,1) stays, (2,1) -> (1,2)
      expect(rotated.startPoint).toEqual(createPoint(1, 1));
      expect(rotated.segments[0].to.x).toBeCloseTo(1, 5);
      expect(rotated.segments[0].to.y).toBeCloseTo(2, 5);
    });

    it('preserves closed state', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      path = pathClose(path);
      const rotated = pathRotate(path, Math.PI / 4);
      expect(rotated.closed).toBe(true);
    });

    it('does not mutate original path', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(1, 0));
      path = pathAddLine(path, createPoint(0, 1));
      const originalStart = path.startPoint;
      pathRotate(path, Math.PI / 2);
      expect(path.startPoint).toEqual(originalStart);
    });
  });

  describe('pathBoundingBox', () => {
    it('throws for empty path', () => {
      expect(() => pathBoundingBox(createPath())).toThrow('Cannot compute bounding box of empty path');
    });

    it('returns point as both min and max for single point', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(5, 5));
      const bbox = pathBoundingBox(path);
      expect(bbox.min).toEqual(createPoint(5, 5));
      expect(bbox.max).toEqual(createPoint(5, 5));
    });

    it('returns correct bbox for horizontal segment', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(2, 3));
      path = pathAddLine(path, createPoint(10, 3));
      const bbox = pathBoundingBox(path);
      expect(bbox.min).toEqual(createPoint(2, 3));
      expect(bbox.max).toEqual(createPoint(10, 3));
    });

    it('returns correct bbox for vertical segment', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(5, 1));
      path = pathAddLine(path, createPoint(5, 9));
      const bbox = pathBoundingBox(path);
      expect(bbox.min).toEqual(createPoint(5, 1));
      expect(bbox.max).toEqual(createPoint(5, 9));
    });

    it('returns correct bbox for multi-segment path', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(1, 2));
      path = pathAddLine(path, createPoint(8, 6));
      path = pathAddLine(path, createPoint(3, 10));
      const bbox = pathBoundingBox(path);
      expect(bbox.min).toEqual(createPoint(1, 2));
      expect(bbox.max).toEqual(createPoint(8, 10));
    });

    it('returns correct bbox for closed path', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      path = pathClose(path);
      const bbox = pathBoundingBox(path);
      expect(bbox.min).toEqual(createPoint(0, 0));
      expect(bbox.max).toEqual(createPoint(10, 10));
    });
  });

  describe('pathIsClosed', () => {
    it('returns false for open path', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 10));
      expect(pathIsClosed(path)).toBe(false);
    });

    it('returns true for closed path', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      path = pathClose(path);
      expect(pathIsClosed(path)).toBe(true);
    });

    it('returns false for empty path', () => {
      expect(pathIsClosed(createPath())).toBe(false);
    });
  });

  describe('pathEndpoints', () => {
    it('returns null for empty path', () => {
      expect(pathEndpoints(createPath())).toBeNull();
    });

    it('returns same start and end for single point', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(5, 5));
      const ep = pathEndpoints(path);
      expect(ep).not.toBeNull();
      expect(ep!.start).toEqual(createPoint(5, 5));
      expect(ep!.end).toEqual(createPoint(5, 5));
    });

    it('returns start and end for multi-segment path', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      const ep = pathEndpoints(path);
      expect(ep).not.toBeNull();
      expect(ep!.start).toEqual(createPoint(0, 0));
      expect(ep!.end).toEqual(createPoint(10, 10));
    });

    it('returns start=end for closed path', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      path = pathClose(path);
      const ep = pathEndpoints(path);
      expect(ep).not.toBeNull();
      expect(ep!.start).toEqual(ep!.end);
      expect(ep!.start).toEqual(createPoint(0, 0));
    });
  });

  describe('edge cases', () => {
    it('handles single point path', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(5, 5));
      expect(pathSegmentCount(path)).toBe(0);
      expect(pathLength(path)).toBe(0);
      expect(pathGetPoints(path)).toEqual([createPoint(5, 5)]);
    });

    it('handles zero-length segments', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      expect(pathSegmentCount(path)).toBe(2);
      expect(pathLength(path)).toBe(10);
    });

    it('handles horizontal and vertical segments correctly', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0)); // horizontal
      path = pathAddLine(path, createPoint(10, 10)); // vertical
      path = pathAddLine(path, createPoint(0, 10)); // horizontal
      path = pathClose(path); // vertical back to start
      expect(pathLength(path)).toBe(40);
      expect(pathIsEmpty(path)).toBe(false);
      expect(pathSegmentCount(path)).toBe(4);
    });
  });
});