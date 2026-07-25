# Implementation Plan: TASK-018 A03 Path Primitive

## 1. Task Identification

- **Task ID**: TASK-018
- **Title**: A03: Path Primitive
- **Status**: backlog (dependencies satisfied: TASK-017 done)
- **Phase**: PHASE-11 (Geometry Core)
- **Priority**: high
- **Dependencies**: TASK-017 (Segment + Line + Ray Primitives) DONE
- **Dependents**: TASK-019 (Bezier), TASK-020 (Polygon), TASK-021 (Offset), TASK-022 (Intersection)

## 2. Current State Analysis

### Existing Implementation (`src/geometry/Path.ts`)
- **Data Structure**: `Path` with `startPoint: Point2D | undefined`, `segments: PathSegment[]`, `isClosed: boolean`
- **PathSegment**: simple `{ from: Point2D; to: Point2D }` (no discriminated union)
- **Functions**: `createPath()`, `pathAddSegment()`, `pathClose()`, `pathGetPoints()`, `pathLength()`, `pathIsEmpty()`, `pathSegmentCount()`, `pathFirstPoint()`, `pathLastPoint()`, `pathPointAt()`, `pathTranslate()`, `pathRotate()`
- **Issues**:
  - TypeScript errors (5 strict mode errors: `Object is possibly 'undefined'`)
  - Does not match implementation plan specification
  - No `boundingBox()`, `endpoints()`, `isClosed()` functions
  - Uses `startPoint` instead of pure `segments[]` approach
  - No discriminated union for segment kinds (line/bezier/arc)

### Existing Tests (`src/geometry/__tests__/Path.test.ts`)
- 46 tests, 1 failing
- Failing test expects "virtual segment" pattern (first point creates `{from: p, to: p}`)
- Tests cover: addSegment, close, getPoints, length, isEmpty, segmentCount, first/last point, pointAt, translate, rotate, edge cases

### Specification Requirements (from `planning/implementation-plan.md` lines 365-376)
```markdown
#### A03: Path Primitive
**Dependencies:** A02
**Description:** Implement `src/geometry/Path.ts`. Ordered chain of PathSegment (line | bezier | arc). Closed flag. Functions: `createPath()`, `pathLength()`, `boundingBox()`, `pointAt(t)`, `isClosed()`, `endpoints()`.
**Acceptance Criteria:**
- `Path` interface with `segments: PathSegment[]; closed: boolean`
- `PathSegment` discriminated union: `{ kind: 'line'; from: Point2D; to: Point2D } | { kind: 'bezier'; curve: BezierCurve } | { kind: 'arc'; ... }`
- For first slice, only `line` kind is needed. Bezier and arc can be stubbed/deferred.
- `pathLength()` returns total length of all segments
- `boundingBox()` returns `{ min: Point2D, max: Point2D }`
- Tests for single-segment path, multi-segment path, closed vs open
**Deliverables:** `src/geometry/Path.ts`, tests
```

## 3. Gap Analysis

| Requirement | Current State | Gap |
|-------------|---------------|-----|
| `Path` interface: `segments: PathSegment[]`, `closed: boolean` | Has `startPoint`, `segments`, `isClosed` | Major redesign needed |
| `PathSegment` discriminated union with `kind` | Plain `{from, to}` | Major redesign needed |
| `kind: 'line'` segments | Implicit (all segments are lines) | Partial |
| `kind: 'bezier'` stub | Not present | Missing |
| `kind: 'arc'` stub | Not present | Missing |
| `createPath()` | Exists | OK |
| `pathLength()` | Exists (works) | OK |
| `boundingBox()` | **Missing** | Missing |
| `pointAt(t)` | Exists (different API) | Needs update for discriminated union |
| `isClosed()` function | Property `isClosed` | Function needed |
| `endpoints()` | `pathFirstPoint`, `pathLastPoint` | Rename/consolidate |
| Tests for single/multi-segment, closed/open | Exist but expect old structure | Need rewrite |

## 4. Architectural Decisions

### 4.1 Data Structure Design

**Decision**: Use pure `segments: PathSegment[]` approach (no separate `startPoint`)

**Rationale**:
- Matches implementation plan specification exactly
- Simpler: first point is `segments[0].from`, subsequent points are `segment.to`
- Aligns with how SVG path data works (M x y L x y L x y Z)
- Eliminates the "virtual segment" hack in current tests
- Easier to serialize/deserialize to SVG path `d` attribute

**PathSegment Discriminated Union**:
```typescript
type PathSegment = 
  | { readonly kind: 'line'; readonly from: Point2D; readonly to: Point2D }
  | { readonly kind: 'bezier'; readonly curve: BezierCurve }  // stub
  | { readonly kind: 'arc'; readonly center: Point2D; readonly radius: number; readonly startAngle: number; readonly endAngle: number; readonly ccw: boolean }; // stub
```

**Path Interface**:
```typescript
interface Path {
  readonly segments: readonly PathSegment[];
  readonly closed: boolean;
}
```

### 4.2 Function Naming Conventions

Follow existing pattern: `path` prefix, camelCase, verb-noun
- `createPath()` 
- `pathAddSegment()` → `pathAddLine()` (since only 'line' kind in first slice)
- `pathClose()` 
- `pathLength()` 
- `pathBoundingBox()` (new)
- `pathPointAt()` 
- `pathIsClosed()` (new function, replaces property access)
- `pathEndpoints()` (new, returns `{ start: Point2D; end: Point2D }`)
- `pathGetPoints()` → keep for utility (returns all vertices)
- `pathTranslate()`, `pathRotate()` → keep for transforms

### 4.3 Bezier/Arc Stubs

Per spec: "For first slice, only `line` kind is needed. Bezier and arc can be stubbed/deferred."

**Decision**: Define types but throw `NotImplementedError` for now. This makes the structure extensible without implementing full curve logic.

```typescript
// Stub types for future expansion
interface BezierCurve { readonly kind: 'quadratic' | 'cubic'; readonly controlPoints: Point2D[]; }

// In PathSegment union:
| { readonly kind: 'bezier'; readonly curve: BezierCurve }
| { readonly kind: 'arc'; readonly center: Point2D; readonly radius: number; readonly startAngle: number; readonly endAngle: number; readonly ccw: boolean }

// In pathLength(), pathPointAt(), pathBoundingBox(): throw if kind !== 'line'
```

### 4.4 Tolerance/Epsilon Handling

Use existing constants from `constants.ts`:
- `GEOMETRIC_EPSILON = 0.001` for point equality
- `LENGTH_EPSILON = 1e-10` for length calculations
- `INTERSECTION_EPSILON = 0.01` not needed here

## 5. Implementation Plan

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/geometry/Path.ts` | **REWRITE** | Complete redesign per spec |
| `src/geometry/__tests__/Path.test.ts` | **REWRITE** | All tests updated for new structure |
| `src/geometry/index.ts` | **CREATE** | Barrel export for geometry module |

### 5.1 Phase 1: Rewrite Path.ts

**Step 1.1**: Define types
```typescript
// BezierCurve stub
// ArcParams stub
// PathSegment discriminated union
// Path interface
```

**Step 1.2**: Implement factory functions
- `createPath(): Path` — returns `{ segments: [], closed: false }`
- `pathAddLine(path: Path, to: Point2D): Path` — adds line segment from last point to `to`
- `pathClose(path: Path): Path` — closes path by adding segment from last point to first point

**Step 1.3**: Implement query functions
- `pathLength(path: Path): number` — sum of all segment lengths (only 'line' implemented)
- `pathBoundingBox(path: Path): { min: Point2D; max: Point2D }` — min/max of all vertices
- `pathPointAt(path: Path, t: number): Point2D` — parameter 0..1 along total path length
- `pathIsClosed(path: Path): boolean` — returns `path.closed`
- `pathEndpoints(path: Path): { start: Point2D; end: Point2D } | null` — null if empty

**Step 1.4**: Implement utility functions
- `pathGetPoints(path: Path): Point2D[]` — all vertices in order
- `pathSegmentCount(path: Path): number` — `path.segments.length`
- `pathIsEmpty(path: Path): boolean` — `path.segments.length === 0`

**Step 1.5**: Implement transforms (immutable)
- `pathTranslate(path: Path, dx: number, dy: number): Path`
- `pathRotate(path: Path, angle: number, center?: Point2D): Path`

**Step 1.6**: Error handling
- Throw descriptive errors for empty path operations
- Throw `NotImplementedError` for bezier/arc segments (future-proofing)

### 5.2 Phase 2: Rewrite Path.test.ts

Test groups matching new API:
1. **createPath** — empty path structure
2. **pathAddLine** — adding first point, second point, multiple segments, negative coords, zero-length
3. **pathClose** — closes open path, idempotent on closed, throws on empty
4. **pathLength** — empty (0), single segment, multi-segment, closed path includes closing segment
5. **pathBoundingBox** — empty (throws?), single point, horizontal, vertical, diagonal, multi-segment, closed
6. **pathPointAt** — t=0 (start), t=1 (end), t=0.5 (midpoint), multi-segment, out of bounds (throws), empty (throws)
7. **pathIsClosed** — open vs closed
8. **pathEndpoints** — empty (null), single point, multi-segment, closed (start=end)
9. **pathGetPoints** — empty [], single point, multi-segment, closed includes closing point
10. **pathSegmentCount** — 0, 1, N, closed includes closing segment
11. **pathIsEmpty** — true/false
12. **pathTranslate** — all points shifted, preserves closed, immutable
13. **pathRotate** — around origin, around custom center, preserves closed, immutable
14. **Edge cases** — zero-length segments, horizontal/vertical, numeric precision

### 5.3 Phase 3: Create src/geometry/index.ts

Barrel export file:
```typescript
export * from './constants.js';
export * from './Point.js';
export * from './Vector.js';
export * from './Segment.js';
export * from './Line.js';
export * from './Ray.js';
export * from './Path.js';
```

### 5.4 Phase 4: Validation

Run in order:
1. `npm run typecheck` — must pass (strict mode)
2. `npm run lint` — must pass
3. `npm test` — all tests pass (including new Path tests)
4. `npm run build` — successful compilation
5. `npm run validate:kanban` — kanban.json integrity

## 6. Detailed API Specification

### Types

```typescript
// Bezier curve stub for future
export interface BezierCurve {
  readonly kind: 'quadratic' | 'cubic';
  readonly controlPoints: readonly Point2D[];
}

// Arc stub for future
export interface ArcParams {
  readonly center: Point2D;
  readonly radius: number;
  readonly startAngle: number;
  readonly endAngle: number;
  readonly ccw: boolean;
}

// Discriminated union
export type PathSegment =
  | { readonly kind: 'line'; readonly from: Point2D; readonly to: Point2D }
  | { readonly kind: 'bezier'; readonly curve: BezierCurve }
  | { readonly kind: 'arc'; readonly params: ArcParams };

export interface Path {
  readonly segments: readonly PathSegment[];
  readonly closed: boolean;
}
```

### Functions

| Function | Signature | Behavior |
|----------|-----------|----------|
| `createPath` | `(): Path` | Returns `{ segments: [], closed: false }` |
| `pathAddLine` | `(path: Path, to: Point2D): Path` | If empty: segment from `to` to `to` (point). Else: line from last vertex to `to`. Returns new Path. |
| `pathClose` | `(path: Path): Path` | If closed: return as-is. If < 2 vertices: throw. If last vertex == first: set `closed: true`. Else: add closing line segment, set `closed: true`. |
| `pathLength` | `(path: Path): number` | Sum of `line` segment lengths. Throws if non-line segment encountered. |
| `pathBoundingBox` | `(path: Path): { min: Point2D; max: Point2D }` | Computes min/max x,y across all vertices. Throws if empty. |
| `pathPointAt` | `(path: Path, t: number): Point2D` | `t` in [0,1] along total length. Returns interpolated point. Throws if empty or t out of bounds. |
| `pathIsClosed` | `(path: Path): boolean` | Returns `path.closed` |
| `pathEndpoints` | `(path: Path): { start: Point2D; end: Point2D } | null` | Null if empty. Else first vertex and last vertex (or first if closed). |
| `pathGetPoints` | `(path: Path): Point2D[]` | All vertices in order. Includes closing vertex if closed. |
| `pathSegmentCount` | `(path: Path): number` | `path.segments.length` |
| `pathIsEmpty` | `(path: Path): boolean` | `path.segments.length === 0` |
| `pathTranslate` | `(path: Path, dx: number, dy: number): Path` | Translates all vertices. Preserves `closed`. |
| `pathRotate` | `(path: Path, angle: number, center?: Point2D): Path` | Rotates all vertices around `center` (default origin). Preserves `closed`. |

## 7. Test Strategy

### Test Coverage Requirements

| Category | Cases |
|----------|-------|
| **Empty path** | createPath, length=0, isEmpty=true, segmentCount=0, isClosed=false, endpoints=null, getPoints=[], boundingBox throws, pointAt throws |
| **Single point** | addLine once → 1 segment (point-to-point), length=0, endpoints same, getPoints=[p], bbox=point |
| **Single segment** | addLine twice → 1 line segment, length=distance, endpoints correct, pointAt(0.5)=midpoint |
| **Multi-segment** | 3+ segments, length=sum, pointAt traverses correctly |
| **Closed path** | close() adds closing segment, length includes it, endpoints.start === endpoints.end, isClosed=true |
| **Transforms** | translate/rotate preserve geometry, preserve closed flag, immutable |
| **Error cases** | close empty, pointAt empty, pointAt t<0, t>1, bbox empty, non-line segment in length/pointAt/bbox |
| **Precision** | Points with GEOMETRIC_EPSILON tolerance |

### Numerical Tolerance Tests
- `pathPointAt` at segment boundaries (t exactly at segment transitions)
- `pathBoundingBox` with nearly-equal coordinates
- `pathLength` with very small segments (near LENGTH_EPSILON)

## 8. Validation Checklist

- [ ] `npm run typecheck` — 0 errors
- [ ] `npm run lint` — 0 errors, 0 warnings (or only allowed warnings)
- [ ] `npm test` — all 390+ tests pass (including new Path tests)
- [ ] `npm run build` — successful, produces dist/
- [ ] `npm run validate:kanban` — passes
- [ ] No TypeScript `any` usage
- [ ] All functions have explicit return types
- [ ] All data structures use `readonly`
- [ ] No console.log in production code
- [ ] Commit includes only: Path.ts, Path.test.ts, index.ts

## 9. Kanban Workflow

### For Implementation Agent:
1. `npm run kanban -- start TASK-018` — claim task
2. Implement per this plan
3. Run validations (typecheck → lint → test → build → validate:kanban)
4. `npm run kanban -- complete TASK-018 --evidence "..."` — with evidence
5. `git add -A && git commit -m "feat(geometry): implement Path primitive (A03)" && git push`

### Evidence to Record:
- Files changed: `src/geometry/Path.ts`, `src/geometry/__tests__/Path.test.ts`, `src/geometry/index.ts`
- Tests added: ~50 new/updated tests
- Validation results: all commands pass
- TypeScript strict mode: no errors

## 10. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking changes to dependent tasks | Medium | High | No other code imports Path yet (verified) |
| TypeScript strict mode errors | High | Medium | Use non-null assertions carefully, handle undefined properly |
| Test failures due to structural change | High | Medium | Rewrite tests to match new API, don't try to preserve old tests |
| Missing barrel export breaks future imports | Low | High | Create index.ts as specified |
| Bezier/arc stubs cause runtime errors | Low | Medium | Throw clear `NotImplementedError` with helpful message |

## 11. Definition of Done

- [ ] `src/geometry/Path.ts` implements all specified types and functions
- [ ] `src/geometry/__tests__/Path.test.ts` covers all acceptance criteria
- [ ] `src/geometry/index.ts` exports all geometry modules
- [ ] All validation commands pass (typecheck, lint, test, build, validate:kanban)
- [ ] Task TASK-018 marked complete in Kanban with evidence
- [ ] Clean git commit pushed to remote

---

*Plan created: 2026-07-25*
*Based on: implementation-plan.md (A03), current repository state, AGENTS.md conventions*
