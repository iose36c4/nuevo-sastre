import { describe, it, expect } from 'vitest';
import {
  createPolygon,
  polygonArea,
  polygonCentroid,
  polygonWindingOrder,
  polygonIsConvex,
  polygonContainsPoint,
} from '../Polygon.js';
import { createPath, pathAddLine, pathClose } from '../Path.js';
import { createPoint } from '../Point.js';
import { createBezierQuadratic } from '../Bezier.js';
import { GEOMETRIC_EPSILON } from '../constants.js';

describe('Polygon', () => {
  describe('createPolygon', () => {
    it('creates a polygon from a valid closed line-only path', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      path = pathAddLine(path, createPoint(0, 10));
      path = pathClose(path);

      const poly = createPolygon(path);
      expect(poly.path).toBe(path);
    });

    it('throws for open path', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));

      expect(() => createPolygon(path)).toThrow('createPolygon: path must be closed');
    });

    it('throws for path with Bezier segment', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      const bezier = createBezierQuadratic(
        createPoint(10, 0),
        createPoint(10, 5),
        createPoint(10, 10)
      );
      path = { ...path, segments: [...path.segments, { kind: 'bezier', curve: bezier }] };
      path = pathAddLine(path, createPoint(0, 10));
      path = pathClose(path);

      expect(() => createPolygon(path)).toThrow(
        "createPolygon: unsupported segment kind 'bezier' — only 'line' supported in v1"
      );
    });

    it('throws for path with arc segment', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = {
        ...path,
        segments: [
          ...path.segments,
          {
            kind: 'arc',
            params: {
              center: createPoint(10, 10),
              radius: 10,
              startAngle: 0,
              endAngle: Math.PI / 2,
              ccw: true,
            },
          },
        ],
      };
      path = pathAddLine(path, createPoint(0, 10));
      path = pathClose(path);

      expect(() => createPolygon(path)).toThrow(
        "createPolygon: unsupported segment kind 'arc' — only 'line' supported in v1"
      );
    });
  });

  describe('polygonArea', () => {
    it('returns positive area for CCW triangle', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(0, 10));
      path = pathClose(path);

      const poly = createPolygon(path);
      expect(polygonArea(poly)).toBe(50);
    });

    it('returns negative area for CW triangle', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(0, 10));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathClose(path);

      const poly = createPolygon(path);
      expect(polygonArea(poly)).toBe(-50);
    });

    it('returns correct area for square', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      path = pathAddLine(path, createPoint(0, 10));
      path = pathClose(path);

      const poly = createPolygon(path);
      expect(polygonArea(poly)).toBe(100);
    });

    it('returns correct area for concave polygon', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 5));
      path = pathAddLine(path, createPoint(5, 5));
      path = pathAddLine(path, createPoint(5, 10));
      path = pathAddLine(path, createPoint(0, 10));
      path = pathClose(path);

      const poly = createPolygon(path);
      expect(polygonArea(poly)).toBe(75);
    });

    it('returns approximately zero for collinear polygon', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(5, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathClose(path);

      const poly = createPolygon(path);
      expect(Math.abs(polygonArea(poly))).toBeLessThan(GEOMETRIC_EPSILON);
    });

    it('throws for fewer than 3 vertices', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathClose(path);

      const poly = createPolygon(path);
      expect(() => polygonArea(poly)).toThrow('polygonArea: polygon must have at least 3 vertices');
    });

    it('handles negative coordinates', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(-10, -10));
      path = pathAddLine(path, createPoint(0, -10));
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(-10, 0));
      path = pathClose(path);

      const poly = createPolygon(path);
      expect(polygonArea(poly)).toBe(100);
    });
  });

  describe('polygonCentroid', () => {
    it('returns correct centroid for square', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      path = pathAddLine(path, createPoint(0, 10));
      path = pathClose(path);

      const poly = createPolygon(path);
      const centroid = polygonCentroid(poly);
      expect(centroid.x).toBe(5);
      expect(centroid.y).toBe(5);
    });

    it('returns correct centroid for triangle', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(0, 10));
      path = pathClose(path);

      const poly = createPolygon(path);
      const centroid = polygonCentroid(poly);
      expect(centroid.x).toBeCloseTo(10 / 3, 5);
      expect(centroid.y).toBeCloseTo(10 / 3, 5);
    });

    it('returns correct centroid for concave polygon', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 5));
      path = pathAddLine(path, createPoint(5, 5));
      path = pathAddLine(path, createPoint(5, 10));
      path = pathAddLine(path, createPoint(0, 10));
      path = pathClose(path);

      const poly = createPolygon(path);
      const centroid = polygonCentroid(poly);
      expect(centroid.x).toBeGreaterThan(0);
      expect(centroid.y).toBeGreaterThan(0);
    });

    it('throws for zero-area polygon', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(5, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathClose(path);

      const poly = createPolygon(path);
      expect(() => polygonCentroid(poly)).toThrow(
        'polygonCentroid: degenerate polygon (zero area)'
      );
    });

    it('throws for fewer than 3 vertices', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathClose(path);

      const poly = createPolygon(path);
      expect(() => polygonCentroid(poly)).toThrow(
        'polygonCentroid: polygon must have at least 3 vertices'
      );
    });
  });

  describe('polygonWindingOrder', () => {
    it('returns ccw for CCW polygon', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(0, 10));
      path = pathClose(path);

      const poly = createPolygon(path);
      expect(polygonWindingOrder(poly)).toBe('ccw');
    });

    it('returns cw for CW polygon', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(0, 10));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathClose(path);

      const poly = createPolygon(path);
      expect(polygonWindingOrder(poly)).toBe('cw');
    });

    it('returns degenerate for zero-area polygon', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(5, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathClose(path);

      const poly = createPolygon(path);
      expect(polygonWindingOrder(poly)).toBe('degenerate');
    });

    it('agrees with polygonArea sign', () => {
      let pathCCW = createPath();
      pathCCW = pathAddLine(pathCCW, createPoint(0, 0));
      pathCCW = pathAddLine(pathCCW, createPoint(10, 0));
      pathCCW = pathAddLine(pathCCW, createPoint(0, 10));
      pathCCW = pathClose(pathCCW);

      let pathCW = createPath();
      pathCW = pathAddLine(pathCW, createPoint(0, 0));
      pathCW = pathAddLine(pathCW, createPoint(0, 10));
      pathCW = pathAddLine(pathCW, createPoint(10, 0));
      pathCW = pathClose(pathCW);

      const polyCCW = createPolygon(pathCCW);
      const polyCW = createPolygon(pathCW);

      expect(Math.sign(polygonArea(polyCCW))).toBe(1);
      expect(Math.sign(polygonArea(polyCW))).toBe(-1);
      expect(polygonWindingOrder(polyCCW)).toBe('ccw');
      expect(polygonWindingOrder(polyCW)).toBe('cw');
    });
  });

  describe('polygonIsConvex', () => {
    it('returns true for triangle', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(0, 10));
      path = pathClose(path);

      const poly = createPolygon(path);
      expect(polygonIsConvex(poly)).toBe(true);
    });

    it('returns true for square', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      path = pathAddLine(path, createPoint(0, 10));
      path = pathClose(path);

      const poly = createPolygon(path);
      expect(polygonIsConvex(poly)).toBe(true);
    });

    it('returns false for concave L-shape', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 5));
      path = pathAddLine(path, createPoint(5, 5));
      path = pathAddLine(path, createPoint(5, 10));
      path = pathAddLine(path, createPoint(0, 10));
      path = pathClose(path);

      const poly = createPolygon(path);
      expect(polygonIsConvex(poly)).toBe(false);
    });

    it('returns false for star polygon', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(5, 0));
      path = pathAddLine(path, createPoint(6, 3));
      path = pathAddLine(path, createPoint(10, 3));
      path = pathAddLine(path, createPoint(7, 5));
      path = pathAddLine(path, createPoint(8, 9));
      path = pathAddLine(path, createPoint(5, 7));
      path = pathAddLine(path, createPoint(2, 9));
      path = pathAddLine(path, createPoint(3, 5));
      path = pathAddLine(path, createPoint(0, 3));
      path = pathAddLine(path, createPoint(4, 3));
      path = pathClose(path);

      const poly = createPolygon(path);
      expect(polygonIsConvex(poly)).toBe(false);
    });

    it('returns true for collinear intermediate vertices', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(5, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      path = pathAddLine(path, createPoint(0, 10));
      path = pathClose(path);

      const poly = createPolygon(path);
      expect(polygonIsConvex(poly)).toBe(true);
    });

    it('returns true for completely collinear polygon', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(5, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathClose(path);

      const poly = createPolygon(path);
      expect(polygonIsConvex(poly)).toBe(true);
    });

    it('handles duplicate internal vertices (deduplication)', () => {
      // Create a path with duplicate internal vertices that should be treated as one
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(5, 0));
      path = pathAddLine(path, createPoint(5, 0)); // duplicate
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      path = pathAddLine(path, createPoint(0, 10));
      path = pathClose(path);

      const poly = createPolygon(path);
      // Should handle duplicate internal vertices gracefully
      expect(polygonArea(poly)).toBe(100);
      expect(polygonIsConvex(poly)).toBe(true);
    });

    it('handles path where closing segment doesn\'t duplicate start point', () => {
      // Create a path where the closing segment ends at a point slightly different from start
      // This tests the fallback branch in _polygonVertices
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      path = pathAddLine(path, createPoint(0, 10));
      path = pathAddLine(path, createPoint(0.002, 0.002)); // slightly different from start
      path = { ...path, closed: true };

      const poly = createPolygon(path);
      expect(polygonArea(poly)).toBeCloseTo(100, 0);
    });

    it('throws for fewer than 3 vertices', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathClose(path);

      const poly = createPolygon(path);
      expect(() => polygonIsConvex(poly)).toThrow(
        'polygonIsConvex: polygon must have at least 3 vertices'
      );
    });
  });

  describe('polygonContainsPoint', () => {
    it('returns true for point inside square', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      path = pathAddLine(path, createPoint(0, 10));
      path = pathClose(path);

      const poly = createPolygon(path);
      expect(polygonContainsPoint(poly, createPoint(5, 5))).toBe(true);
    });

    it('returns false for point outside square', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      path = pathAddLine(path, createPoint(0, 10));
      path = pathClose(path);

      const poly = createPolygon(path);
      expect(polygonContainsPoint(poly, createPoint(15, 15))).toBe(false);
    });

    it('returns true for point on vertex', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      path = pathAddLine(path, createPoint(0, 10));
      path = pathClose(path);

      const poly = createPolygon(path);
      expect(polygonContainsPoint(poly, createPoint(0, 0))).toBe(true);
    });

    it('returns true for point on edge', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      path = pathAddLine(path, createPoint(0, 10));
      path = pathClose(path);

      const poly = createPolygon(path);
      expect(polygonContainsPoint(poly, createPoint(5, 0))).toBe(true);
    });

    it('returns true for point on horizontal edge', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      path = pathAddLine(path, createPoint(0, 10));
      path = pathClose(path);

      const poly = createPolygon(path);
      expect(polygonContainsPoint(poly, createPoint(3, 0))).toBe(true);
      expect(polygonContainsPoint(poly, createPoint(7, 10))).toBe(true);
    });

    it('returns false for point in concave polygon bay', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 5));
      path = pathAddLine(path, createPoint(5, 5));
      path = pathAddLine(path, createPoint(5, 10));
      path = pathAddLine(path, createPoint(0, 10));
      path = pathClose(path);

      const poly = createPolygon(path);
      expect(polygonContainsPoint(poly, createPoint(7, 7))).toBe(false);
    });

    it('returns false for fewer than 3 vertices', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathClose(path);

      const poly = createPolygon(path);
      expect(polygonContainsPoint(poly, createPoint(5, 5))).toBe(false);
    });

    it('handles ray-casting vertex alignment edge cases', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      path = pathAddLine(path, createPoint(0, 10));
      path = pathClose(path);

      const poly = createPolygon(path);
      expect(polygonContainsPoint(poly, createPoint(5, 5))).toBe(true);
      expect(polygonContainsPoint(poly, createPoint(-1, 5))).toBe(false);
      expect(polygonContainsPoint(poly, createPoint(11, 5))).toBe(false);
    });

    it('handles point near boundary with epsilon', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      path = pathAddLine(path, createPoint(0, 10));
      path = pathClose(path);

      const poly = createPolygon(path);
      expect(polygonContainsPoint(poly, createPoint(0 + GEOMETRIC_EPSILON / 2, 5))).toBe(true);
      expect(polygonContainsPoint(poly, createPoint(10 - GEOMETRIC_EPSILON / 2, 5))).toBe(true);
    });
  });

  describe('_polygonVertices internal helper', () => {
    it('returns vertices without duplicate when path closed but first/last points differ', () => {
      // Create a path where pathClose adds a closing segment because points don't match exactly
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      // Don't close - manually add a closing segment that ends at a slightly different point
      path = pathAddLine(path, createPoint(0, 10));
      path = { ...path, segments: [...path.segments, { kind: 'line', from: createPoint(0, 10), to: createPoint(0, 0) }], closed: true };

      const poly = createPolygon(path);
      // _polygonVertices is internal, test via polygonArea which uses it
      expect(polygonArea(poly)).toBe(100);
    });
  });

  describe('_pointOnSegment internal helper', () => {
    it('handles degenerate segment (zero length)', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      path = pathAddLine(path, createPoint(0, 10));
      path = pathClose(path);

      const poly = createPolygon(path);
      // Test point on vertex (which internally uses _pointOnSegment for degenerate case)
      expect(polygonContainsPoint(poly, createPoint(0, 0))).toBe(true);
    });

    it('handles point on degenerate segment (zero-length edge)', () => {
      // Create a path with a zero-length segment (two consecutive identical points)
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 0)); // zero-length segment
      path = pathAddLine(path, createPoint(10, 10));
      path = pathAddLine(path, createPoint(0, 10));
      path = pathClose(path);

      const poly = createPolygon(path);
      // Point on the degenerate segment should be treated as on the polygon boundary
      expect(polygonContainsPoint(poly, createPoint(10, 0))).toBe(true);
    });

    it('covers degenerate segment branch with very short segment', () => {
      // Create a path with a segment shorter than eps (0.001) so len2 < eps*eps
      // This exercises the len2 < eps*eps branch in _pointOnSegment
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      // Add a very short segment (length 0.0005 < eps=0.001)
      path = pathAddLine(path, createPoint(10.00025, 0));
      path = pathAddLine(path, createPoint(10.0005, 0));
      path = pathAddLine(path, createPoint(10, 10));
      path = pathAddLine(path, createPoint(0, 10));
      path = pathClose(path);

      const poly = createPolygon(path);
      // Point on the very short segment (not exactly at vertex)
      // This is caught by vertex check because point is within eps of vertex
      // To cover the degenerate branch, test the internal function directly
      expect(polygonContainsPoint(poly, createPoint(10.0003, 0))).toBe(true);
    });

    it('covers degenerate segment branch in _pointOnSegment directly', async () => {
      // Directly test the internal function with a degenerate segment
      // This covers the len2 < eps*eps branch (lines 119-121)
      const a = createPoint(0, 0);
      const b = createPoint(0.0005, 0); // length 0.0005 < eps=0.001
      const p = createPoint(0.0002, 0); // point on the segment

      // Import the internal function (exported for testing)
      const { _pointOnSegment } = await import('../Polygon.js');
      expect(_pointOnSegment(p, a, b)).toBe(true);
    });

    it('covers t > 1+eps branch in _pointOnSegment', async () => {
      // Test point with t > 1+eps using a diagonal segment
      // Segment from (0,0) to (10,10), point at (11,11) has t=1.1 > 1.001
      const { _pointOnSegment } = await import('../Polygon.js');
      const a = createPoint(0, 0);
      const b = createPoint(10, 10);
      const p = createPoint(11, 11);
      // Point is on line extension but t=1.1 > 1+eps
      expect(_pointOnSegment(p, a, b)).toBe(false);
    });

    it('covers t < -eps branch in _pointOnSegment', async () => {
      // Test point with t < -eps using a diagonal segment
      const { _pointOnSegment } = await import('../Polygon.js');
      const a = createPoint(10, 10);
      const b = createPoint(20, 20);
      // Point at (-1,-1) has t = -0.1 < -eps
      const p = createPoint(-1, -1);
      expect(_pointOnSegment(p, a, b)).toBe(false);
    });

    it('covers cross product false branch in _pointOnSegment', async () => {
      // Test point in bounding box but not on segment line (cross product > tolerance)
      const { _pointOnSegment } = await import('../Polygon.js');
      const a = createPoint(0, 0);
      const b = createPoint(10, 0);
      // Point at (5, 0.02) - in bounding box but off the line by 0.02
      // cross = 10 * 0.02 - 0 * 5 = 0.2
      // crossTol = eps * 10 = 0.01
      // 0.2 > 0.01 so cross check should fail
      const p = createPoint(5, 0.02);
      expect(_pointOnSegment(p, a, b)).toBe(false);
    });
  });

  describe('integration flow', () => {
    it('full flow: createPath → addLine × N → close → createPolygon → all operations', () => {
      let path = createPath();
      path = pathAddLine(path, createPoint(0, 0));
      path = pathAddLine(path, createPoint(10, 0));
      path = pathAddLine(path, createPoint(10, 10));
      path = pathAddLine(path, createPoint(0, 10));
      path = pathClose(path);

      const poly = createPolygon(path);

      expect(polygonArea(poly)).toBe(100);
      const centroid = polygonCentroid(poly);
      expect(centroid.x).toBe(5);
      expect(centroid.y).toBe(5);
      expect(polygonWindingOrder(poly)).toBe('ccw');
      expect(polygonIsConvex(poly)).toBe(true);
      expect(polygonContainsPoint(poly, createPoint(5, 5))).toBe(true);
      expect(polygonContainsPoint(poly, createPoint(15, 15))).toBe(false);
    });

    it('winding order sign agrees with area sign', () => {
      let pathCCW = createPath();
      pathCCW = pathAddLine(pathCCW, createPoint(0, 0));
      pathCCW = pathAddLine(pathCCW, createPoint(10, 0));
      pathCCW = pathAddLine(pathCCW, createPoint(0, 10));
      pathCCW = pathClose(pathCCW);

      let pathCW = createPath();
      pathCW = pathAddLine(pathCW, createPoint(0, 0));
      pathCW = pathAddLine(pathCW, createPoint(0, 10));
      pathCW = pathAddLine(pathCW, createPoint(10, 0));
      pathCW = pathClose(pathCW);

      const polyCCW = createPolygon(pathCCW);
      const polyCW = createPolygon(pathCW);

      expect(polygonArea(polyCCW) > 0).toBe(true);
      expect(polygonWindingOrder(polyCCW)).toBe('ccw');

      expect(polygonArea(polyCW) < 0).toBe(true);
      expect(polygonWindingOrder(polyCW)).toBe('cw');
    });
  });
});