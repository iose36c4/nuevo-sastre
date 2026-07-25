# Implementation Plan — SASTRE Patternmaking System

> **Status:** Research deliverable (TASK-007, PHASE-10)
> **Date:** 2026-07-25
> **Scope:** Actionable plan for implementing the patternmaking system from zero source code.
> **Input:** TASK-002 (Audit), TASK-003 (Geometry), TASK-004 (Domain Model), TASK-005 (DSL), TASK-006 (First Slice)

---

## 0. Current State Summary

**What exists:** Kanban engine (13 TypeScript files in `src/kanban/engine/`), project infrastructure (package.json, tsconfig.json, vitest, eslint), and 7 planning documents.

**What does NOT exist:** Any geometry code, DSL code, SVG rendering, pattern models, CLI commands, or validation logic. The 192 tasks marked "done" in kanban.json are PLANNING tasks, not implementation tasks.

**Reusable infrastructure from Kanban engine (~180 lines):**
- Graph algorithms: `buildDependencyGraph`, `topologicalSort`, `detectCycles` — directly reusable for pattern entity DAG
- Atomic write pattern: `KanbanPersistence` — reusable for file output
- NDJSON audit log: `KanbanHistory` — reusable for pattern generation audit trail
- Architectural patterns: CQRS queries/mutations, Repository abstraction, DTO separation, singleton loader with mtime cache

---

## 1. Architectural Decisions

Every decision references the existing research document where full rationale is recorded.

| ID | Decision | Choice | Justification | References |
|----|----------|--------|---------------|------------|
| A01 | **Language** | TypeScript (strict, ESM, ES2022) | Existing project setup. Discriminated unions for AST. Vitest testing. | D01 |
| A02 | **Parser** | Hand-written recursive descent + Pratt for expressions | ~30-40 grammar rules. Full error message control. No build step. | D02 |
| A03 | **Geometry library** | Custom implementation | Pattern geometry uses small specific set of primitives. Zero dependency risk. | D03 |
| A04 | **SVG generation** | Template-literal string building + optional SVGO post-processing | Static output, zero runtime deps, readable output. | D04 |
| A05 | **Internal unit** | Millimeters (IEEE-754 binary64 / JS number) | Avoids fractional-cm floating-point issues. Explicit units in DSL. | D05 |
| A06 | **Floating-point** | Epsilon comparisons: 0.001mm (geometric), 0.01mm (intersection) | 100x safety margin over practical cutting precision. | D06 |
| A07 | **AST representation** | Discriminated unions with `kind` tag + source spans | TypeScript exhaustive checking. Spans for error reporting. | D07 |
| A08 | **Coordinate system** | Y-up internally, Y-down at SVG render (`svgY = h - internalY`) | Intuitive construction. Single transform at render. | D08 |
| A09 | **Entity model** | Immutable definitions, append-only registry, lazy evaluation via topological sort | Prevents mutation bugs. Change = new definition + re-evaluate. | D09 |
| A10 | **Testing** | Unit + integration + reference patterns + property-based (fast-check) | Tests accompany every implementation task, never separate. | D10 |
| A11 | **Project structure** | Single package, modular `src/` directories | Simple for early dev. Can extract to monorepo later. | D11 |
| A12 | **Build order** | Vertical slices — each increment produces verifiable SVG | Early visual verification. Prevents "big bang" integration. | D13 |
| A13 | **DSL versions** | v0.1 (POINT/LINE/CURVE/PATH/EXPORT) → v0.2 (+INPUT/LET/units) → v0.3 (+intersections) → v1.0 (+PATTERN/PIECE) | Strict gates prevent complexity creep. | D14 |
| A14 | **Seam allowance offset** | Sample-then-fit for curves, exact for straight | Approximation sufficient for pattern tolerances. Validate for self-intersection. | D15 |
| A15 | **First target pattern** | A-line skirt front panel (revised from D12's boxer shorts) | Exercises all domain concepts (measurements, ease, darts, seam allowance, notches, grainline, labels) with minimum complexity. Single piece. Straight + one curve. | TASK-006 |
| A16 | **Module dependency direction** | geometry → model → dsl/svg → pattern → cli | No circular deps. Enforce with ESLint. | R10, architecture.md |
| A17 | **Error strategy** | Source spans + panic-mode recovery | Clear error messages with file/line/column. Graceful recovery for multi-error reporting. | architecture.md |
| A18 | **Kanban data management** | New kanban.json (separate from planning kanban) for implementation tasks | Keeps planning history intact. Clean slate for implementation tracking. | — |

---

## 2. Components to Implement

### 2.1 Geometry Layer (`src/geometry/`)

| Module | Description | Files | Key Types |
|--------|-------------|-------|-----------|
| **Point** | 2D point in mm, Y-up. Equality with epsilon. | `Point.ts` | `Point2D` |
| **Vector** | 2D vector. Add, subtract, scale, normalize, dot/cross, angle, rotate. | `Vector.ts` | `Vector2D` |
| **Segment** | Finite line segment (from, to). Length, midpoint, parameterization. | `Segment.ts` | `Segment` |
| **Path** | Ordered chain of segments (line/bezier/arc). Open or closed. Length, bounding box. | `Path.ts` | `Path`, `PathSegment` |
| **Polygon** | Closed path with area. Point-in-polygon, winding. | `Polygon.ts` | `Polygon` |
| **Line** | Infinite line (ax+by+c=0). From two points, from point+direction. | `Line.ts` | `Line` |
| **Ray** | Half-infinite line. | `Ray.ts` | `Ray` |
| **Circle** | Center + radius. | `Circle.ts` | `Circle` |
| **Arc** | Circular arc (center, radius, start/end angle, ccw). | `Arc.ts` | `Arc` |
| **Bezier** | Quadratic + cubic Bezier curves. Evaluate, subdivide, flatten. | `Bezier.ts` | `BezierCurve` |
| **Transform** | Translate, rotate, scale, reflect (across axis/line). | `Transform.ts` | `TransformFn` |
| **Measure** | Distance, angle, area, path length, bounding box. | `Measure.ts` | utility functions |
| **Offset** | Parallel curve: straight offset (exact), Bezier offset (sample-then-fit). | `Offset.ts` | `offsetPath()` |
| **Intersection** | Line-Line, Segment-Segment, Line-Circle, Circle-Circle, Line-Bezier, Bezier-Bezier. | `Intersection.ts` | `IntersectionResult` |
| **Projection** | Point-on-line, point-on-segment, point-on-curve. Tangent lines. | `Projection.ts` | `ProjectionResult` |
| **Constants** | `GEOMETRIC_EPSILON`, `INTERSECTION_EPSILON`, `LENGTH_EPSILON`, `SVG_PRECISION` | `constants.ts` | — |
| **Index** | Barrel exports | `index.ts` | — |

**Minimum for first slice:** Point2D, Vector2D, Segment, Path, Polygon, translate, reflect, SVG rendering.

### 2.2 Model Layer (`src/model/`)

| Module | Description | Key Types |
|--------|-------------|-----------|
| **Entity** | Base interface for all named geometry entities | `GeometryEntity` |
| **PointEntity** | Named point with resolved position | `PointEntity` |
| **CurveEntity** | Named curve (line, bezier, arc) | `CurveEntity` |
| **PathEntity** | Named path (sequence of entity refs) | `PathEntity` |
| **Registry** | Append-only name→entity store. Duplicate/forward-ref detection. | `EntityRegistry` |
| **DAG** | Dependency graph builder, topological sort, change propagation | `PatternGraph` |

**Reusable from Kanban engine:** `buildDependencyGraph`, `topologicalSort`, `detectCycles` from `src/kanban/engine/dependency-graph.ts`. Copy and adapt — do NOT import across module boundaries.

### 2.3 DSL Layer (`src/dsl/`)

| Module | Description | Key Types |
|--------|-------------|-----------|
| **Token** | Token types and interface | `Token`, `TokenType` |
| **Lexer** | Tokenizer with source position tracking | `Lexer` |
| **AST** | AST node types (discriminated unions with spans) | `Program`, `Statement`, `Expression` |
| **Parser** | Recursive descent (no expressions in v0.1) | `Parser` |
| **Pratt** | Expression parser (v0.2+) | `PrattParser` |
| **Units** | Unit parsing and conversion (`cm`, `mm`, `in` → mm) | `parseUnit()` |
| **Interpreter** | AST → Registry execution | `Interpreter` |
| **Errors** | Error types with source spans | `ParseError`, `RuntimeError` |
| **Index** | Barrel exports | — |

### 2.4 SVG Layer (`src/svg/`)

| Module | Description | Key Types |
|--------|-------------|-----------|
| **Renderer** | Geometry → SVG string (direct rendering, no model) | `renderSVG()` |
| **ModelRenderer** | Named entity registry → SVG string | `renderModelSVG()` |
| **Elements** | SVG element builders (path, line, text, group, marker) | builder functions |
| **Styles** | CSS classes for pattern elements (cut-line, seam-allowance, grainline, etc.) | `PATTERN_STYLES` |
| **Layout** | ViewBox calculation from geometry bounding box | `computeViewBox()` |
| **Export** | File writing | `writeSVG()` |
| **Index** | Barrel exports | — |

### 2.5 Pattern Layer (`src/pattern/`)

| Module | Description | Key Types |
|--------|-------------|-----------|
| **Measurement** | Body measurement entity + ease modifier | `Measurement`, `Ease`, `MeasurementSet` |
| **DerivedMeasurement** | Formula-based measurement (e.g., `bust_width = bust / 2`) | `DerivedMeasurement` |
| **NamedPoint** | Semantic construction point with dependencies | `NamedPoint` |
| **ConstructionLine** | Drafting reference line | `ConstructionLine` |
| **Piece** | Pattern piece model (contour, grainline, notches, darts, labels, SA) | `Piece` |
| **Contour** | Closed path with semantic type (seam/cut/fold) | `Contour` |
| **SeamAllowance** | Offset transformation on contour | `addSeamAllowance()` |
| **Notch** | Match marks (type, depth, angle, count) | `Notch` |
| **Grainline** | Fabric grain direction | `Grainline` |
| **Dart** | Triangular fold (apex, legs, intake, fold_line) | `Dart` |
| **PieceLabel** | Text annotation on piece | `PieceLabel` |
| **Index** | Barrel exports | — |

**Deferred to later slices:** Gather, Pleat, Seam (piece-to-piece), per-edge SA overrides, double-pointed darts, sewing relationships.

### 2.6 Validation Layer (`src/validation/`)

| Module | Description |
|--------|-------------|
| **ReferenceValidator** | Checks all named references resolve, no forward refs, no shadows |
| **GeometryValidator** | Checks closed paths, non-self-intersecting, valid dimensions |
| **PathValidator** | Checks path continuity, endpoint matching, winding order |

### 2.7 CLI Layer (`src/cli/`)

| Module | Description |
|--------|-------------|
| **index** | Commander.js entry point |
| **commands/build** | Parse .sastre → SVG |
| **commands/validate** | Validate .sastre file (syntax + geometry) |
| **commands/inspect** | Show pattern graph / entity tree |

### 2.8 Tests

| Location | Scope |
|----------|-------|
| `src/geometry/__tests__/` | Unit tests per geometry module |
| `src/dsl/__tests__/` | Lexer, parser, interpreter tests |
| `src/svg/__tests__/` | Renderer snapshot + assertion tests |
| `src/pattern/__tests__/` | Pattern entity tests |
| `tests/integration/` | Pipeline tests (DSL→Geometry→SVG) |
| `tests/patterns/` | Reference .sastre files with expected SVG |

---

## 3. Implementation Order

### 3.1 Dependency Graph (Module Level)

```
Phase A: Geometry Core (no deps)
    ↓
Phase B: Model (depends on geometry)
    ↓                          ↓
Phase C: SVG Renderer      Phase D: DSL v0.1
(depends on geometry)       (depends on geometry, model)
    ↓                          ↓
Phase E: DSL v0.2 (depends on DSL v0.1 + model)
    ↓                          ↓
Phase F: Pattern Layer    Phase G: Validation
(depends on geometry,      (depends on model, geometry)
 SVG, model)
    ↓
Phase H: CLI + Integration
(depends on everything)
```

### 3.2 Phase Breakdown

| Phase | Name | Depends On | Parallelizable Within | Est. Tasks |
|-------|------|------------|----------------------|------------|
| **A** | Geometry Core | — | Yes (Point/Vector parallel, Segment after Point) | 12 |
| **B** | Model Layer | A (Point, Segment, Path) | Yes (Registry parallel with Entity types) | 4 |
| **C** | SVG Renderer | A (Point, Segment, Path, Polygon) | Single stream | 4 |
| **D** | DSL v0.1 | A (Point, Segment, Path) + B | Single stream | 5 |
| **E** | DSL v0.2 | D + A (Vector, Transform) | Single stream | 5 |
| **F** | Pattern Layer | A (Offset, Segment, Path) + B + C | Partial (entities parallel, operations serial) | 8 |
| **G** | Validation | B + A (Intersection) | Single stream | 3 |
| **H** | CLI + Integration | All above | Single stream | 4 |

**Total estimated tasks: ~45** (each completable in one agent session)

### 3.3 Critical Path

```
Point → Segment → Path → Polygon → SVG Renderer → DSL v0.1 → DSL v0.2 → Pattern Layer → A-line Skirt
```

**Fastest path to first visual output:** Point → Segment → SVG Renderer → render a rectangle (2-3 tasks).

---

## 4. First Vertical Slice — A-Line Skirt Front Panel

### 4.1 Pattern Specification

The A-line skirt front panel is a single piece that exercises every core domain concept:

**Measurements required:**
- `waist` (circumference, user-provided, e.g. 72cm)
- `hip` (circumference, user-provided, e.g. 96cm)
- `skirt_length` (user-provided, e.g. 60cm)
- `waist_ease` (wearing ease, e.g. 2cm)
- `hip_ease` (wearing ease, e.g. 4cm)

**Derived measurements:**
- `waist_half = (waist + waist_ease) / 2`
- `hip_half = (hip + hip_ease) / 2`
- `waist_dart_intake = waist_half - hip_half / (hip_length/skirt_length)` (simplified)
- `a_line_sweep = (hip_half - waist_half) / 2` (flare at hem)

**Named points (construction):**
- `waist_center` (0, 0) — center front at waist
- `waist_side` — waist_half from center
- `hip_center` — (0, -hip_depth) where hip_depth = 20cm standard
- `hip_side` — hip_half from center at hip level
- `hem_center` — (0, -skirt_length)
- `hem_side` — (hip_side.x + a_line_sweep, -skirt_length)
- `dart_apex`, `dart_leg1`, `dart_leg2` — waist dart

**Geometry operations:**
- Point construction from coordinates
- Segment construction (straight edges only for A-line)
- Path construction (closed loop of segments)
- Polygon from path
- Reflect across center front (for full skirt, if needed)
- Translation

**Pattern operations:**
- Seam allowance offset (constant 15mm)
- Single waist dart (single-pointed)
- One notch at hip level (side seam matching)
- Grainline (vertical, parallel to center front)
- Piece label

**SVG output:**
- 7 layers: seam allowance (dashed), cut line (solid), construction lines (light), dart interior, notches (triangle marks), grainline (blue arrow), labels (text)
- ViewBox calculated from bounding box + margin
- 1 user unit = 1mm

### 4.2 DSL Code (Hybrid Syntax)

```
PATTERN "A-Line Skirt"

INPUT waist: 72cm
INPUT hip: 96cm
INPUT skirt_length: 60cm
INPUT waist_ease: 2cm
INPUT hip_ease: 4cm

LET waist_half = (waist + waist_ease) / 2
LET hip_half = (hip + hip_ease) / 2
LET hip_depth = 20cm

PIECE "Front Panel" {
  GRAINLINE VERTICAL

  POINT waist_center = (0, 0)
  POINT waist_side = (waist_half, 0)
  POINT hip_center = (0, -hip_depth)
  POINT hip_side = (hip_half, -hip_depth)
  POINT hem_center = (0, -skirt_length)
  POINT hem_side = (hip_side.x + (hip_half - waist_half) / 2, -skirt_length)

  PATH outline = waist_center → waist_side → hip_side → hem_side → hem_center → waist_center

  DART FROM waist_side TO dart_apex WIDTH dart_intake
  NOTCH AT hip_side DEPTH 5mm
  SEAM_ALLOWANCE 15mm

  LABEL "Front" AT (waist_half/2, -skirt_length/2)
}
```

### 4.3 PatternGraph (~25 nodes, ~40 edges)

```
Layer 0: INPUT waist, INPUT hip, INPUT skirt_length, INPUT waist_ease, INPUT hip_ease
Layer 1: waist_half, hip_half, hip_depth, dart_intake
Layer 2: waist_center, waist_side, hip_center, hip_side, hem_center, hem_side, dart_apex, dart_leg1, dart_leg2
Layer 3: outline (Path), dart_fold (Segment)
Layer 4: cutting_outline (offset path)
Layer 5: grainline, notch, label
Layer 6: piece (Piece container)
```

### 4.4 Success Criteria (24 checks)

1. SVG file is valid XML with `xmlns`, `viewBox`, `width`/`height` in mm
2. 1 user unit = 1mm (coordinates match input measurements)
3. Center front line is vertical at x=0
4. Waist width matches `(waist + waist_ease) / 2`
5. Hip width matches `(hip + hip_ease) / 2`
6. Hem width is wider than hip (A-line flare)
7. Skirt length matches input `skirt_length`
8. Dart legs are at waist, apex points downward
9. Dart intake matches calculated value
10. Seam allowance is constant 15mm around entire contour
11. Seam allowance path does not self-intersect
12. Notch mark is at hip level on side seam
13. Notch extends perpendicular to seam line
14. Grainline is vertical, parallel to center front
15. Grainline has arrow markers at both ends
16. Piece label is present with correct text
17. Cut line is solid stroke, seam allowance is dashed
18. All CSS classes match the style specification
19. SVG renders correctly in Chrome and Firefox
20. SVG prints at correct physical dimensions (A4)
21. Parametric: changing INPUT waist changes SVG output
22. Parametric: changing INPUT skirt_length changes SVG output
23. No floating-point gaps at path endpoints (epsilon check)
24. Construction lines are visible but lighter weight

---

## 5. Implementation Tasks

### Phase A: Geometry Core

#### A01: Point2D + Vector2D Primitives
**Dependencies:** None (first task)
**Description:** Implement `src/geometry/Point.ts` and `src/geometry/Vector.ts`. Point2D with x,y readonly fields. Vector2D with add, subtract, scale, normalize, dot, cross, magnitude, angle, fromAngle, perpendicular. Both with epsilon equality. Constants file with GEOMETRIC_EPSILON=0.001.
**Acceptance Criteria:**
- `Point.ts` exports `Point2D` interface with `readonly x: number; readonly y: number`
- `createPoint(x, y)` factory function
- `pointsEqual(a, b, epsilon?)` using GEOMETRIC_EPSILON default
- `Vector.ts` exports `Vector2D` with all operations listed above
- `addVectors`, `subtractVectors`, `scaleVector`, `normalizeVector`, `dotProduct`, `crossProduct`, `vectorMagnitude`, `vectorAngle`, `vectorFromAngle`, `perpendicularVector`
- 100% test coverage for both modules
- Tests cover: equality edge cases, zero-length vectors, normalization of unit vectors, perpendicular correctness
**Deliverables:** `src/geometry/Point.ts`, `src/geometry/Vector.ts`, `src/geometry/constants.ts`, `src/geometry/__tests__/Point.test.ts`, `src/geometry/__tests__/Vector.test.ts`
**Estimated complexity:** small

#### A02: Segment + Line + Ray Primitives
**Dependencies:** A01
**Description:** Implement `src/geometry/Segment.ts`, `Line.ts`, `Ray.ts`. Segment from two points with length, midpoint, pointAt(t), direction vector. Line from two points or point+direction (ax+by+c=0 form). Ray from point+direction. LineFromSegment, SegmentToLine conversions.
**Acceptance Criteria:**
- `Segment` has `from`, `to`, `length()`, `midpoint()`, `pointAt(t)`, `direction()`, `reverse()`
- `Line` has `fromTwoPoints(p1, p2)`, `fromPointDirection(p, v)`, `evaluate(x)` returning y (for non-vertical)
- `lineFromSegment()` and `segmentToLine()` conversions
- Tests for collinearity, degenerate (zero-length) segment, vertical line
**Deliverables:** `src/geometry/Segment.ts`, `src/geometry/Line.ts`, `src/geometry/Ray.ts`, tests
**Estimated complexity:** small

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
**Estimated complexity:** small

#### A04: Bezier Curve Primitive
**Dependencies:** A01
**Description:** Implement `src/geometry/Bezier.ts`. Quadratic and cubic Bezier. `evaluate(t)`, `subdivide(t)`, `flatten(tolerance)`, `controlPoints()`, `boundingBox()`.
**Acceptance Criteria:**
- `BezierCurve` discriminated union: `quadratic | cubic`
- `evaluateBezier(curve, t)` returns Point2D
- `subdivideBezier(curve, t)` returns two curves
- `flattenBezier(curve, tolerance)` returns Point2D[]
- Tests: endpoints correct, midpoint at t=0.5, flatten produces correct number of points for given tolerance
**Deliverables:** `src/geometry/Bezier.ts`, tests
**Estimated complexity:** medium

#### A05: Polygon Primitive
**Dependencies:** A03
**Description:** Implement `src/geometry/Polygon.ts`. Closed path wrapper. `area()`, `centroid()`, `windingOrder()`, `isConvex()`, `containsPoint()`.
**Acceptance Criteria:**
- `Polygon` wraps a closed `Path`
- `polygonArea()` — signed area (positive = CCW)
- `polygonCentroid()` — geometric center
- `windingOrder()` returns 'cw' | 'ccw'
- `containsPoint()` — ray casting algorithm
- Tests: square, triangle, concave polygon, point inside/outside/boundary
**Deliverables:** `src/geometry/Polygon.ts`, tests
**Estimated complexity:** small

#### A06: Transform Operations
**Dependencies:** A01
**Description:** Implement `src/geometry/Transform.ts`. `translate(point, delta)`, `rotate(point, angle, center)`, `scale(point, factor, center)`, `reflectAcrossX(point)`, `reflectAcrossY(point)`, `reflectAcrossLine(point, line)`.
**Acceptance Criteria:**
- All transform functions return new Point2D (immutable)
- `translate(p, {x:5, y:3})` → correct result
- `rotate(p, Math.PI, origin)` → correct 180° rotation
- `reflectAcrossY(p)` → `(-p.x, p.y)`
- Tests for identity transforms, composition order, round-trip (rotate + rotate back)
**Deliverables:** `src/geometry/Transform.ts`, tests
**Estimated complexity:** small

#### A07: Measurement Utilities
**Dependencies:** A01, A02
**Description:** Implement `src/geometry/Measure.ts`. `distance(a, b)`, `angle(a, b)`, `angleBetween(v1, v2)`, `pathArea(points)`, `pathLength(points)`.
**Acceptance Criteria:**
- `distance()` Euclidean distance in mm
- `angle()` angle in radians between two points (atan2)
- `angleBetween()` angle between two vectors
- `pathLength()` total length of Point2D array
- Tests with known values
**Deliverables:** `src/geometry/Measure.ts`, tests
**Estimated complexity:** small

#### A08: Circle + Arc Primitives
**Dependencies:** A01
**Description:** Implement `src/geometry/Circle.ts` and `Arc.ts`. Circle: center, radius, pointAt(angle), boundingBox. Arc: center, radius, startAngle, endAngle, ccw, pointAt(t), length().
**Acceptance Criteria:**
- Circle `pointAt(angle)` returns correct point
- Arc `length()` returns arc length
- Arc with startAngle > endAngle wraps correctly
- Tests: full circle, semicircle, quarter arc
**Deliverables:** `src/geometry/Circle.ts`, `src/geometry/Arc.ts`, tests
**Estimated complexity:** small

#### A09: Offset (Seam Allowance Core)
**Dependencies:** A02, A03
**Description:** Implement `src/geometry/Offset.ts`. `offsetSegment(segment, distance)` — exact for straight. `offsetPath(path, distance)` — polyline approximation for curves. `joinOffsets()` — corner treatment (miter/bevel).
**Acceptance Criteria:**
- Straight segment offset is exact parallel at given distance
- Path offset produces closed offset for closed paths
- Corner joins are clean (no gaps, no overlaps)
- Offset inward and outward both work
- Tests: rectangle offset, known distance verification
**Deliverables:** `src/geometry/Offset.ts`, tests
**Estimated complexity:** medium

#### A10: Intersection Operations
**Dependencies:** A02, A03, A04
**Description:** Implement `src/geometry/Intersection.ts`. `lineLineIntersect()`, `segmentSegmentIntersect()`, `lineCircleIntersect()`, `lineBezierIntersect()`.
**Acceptance Criteria:**
- Returns `IntersectionResult` with points and parameters
- Handles parallel/coincident lines
- Handles tangent cases (single point)
- Uses INTERSECTION_EPSILON (0.01mm)
- Tests with known geometric configurations
**Deliverables:** `src/geometry/Intersection.ts`, tests
**Estimated complexity:** medium

#### A11: Projection Operations
**Dependencies:** A02, A03
**Description:** Implement `src/geometry/Projection.ts`. `pointOnLine()`, `pointOnSegment()`, `projectPointOntoPath()`, `closestPointOnSegment()`.
**Acceptance Criteria:**
- Returns closest point and parameter t
- Handles endpoints (clamping to segment range)
- Tests: perpendicular projection, endpoint projection, degenerate segment
**Deliverables:** `src/geometry/Projection.ts`, tests
**Estimated complexity:** small

#### A12: Geometry Index + Barrel Exports
**Dependencies:** A01-A11
**Description:** Create `src/geometry/index.ts` barrel export. Ensure all modules are importable from `src/geometry`. Run full test suite to verify nothing is broken.
**Acceptance Criteria:**
- `import { Point2D, Segment, Path, ... } from './geometry'` works
- All existing tests pass
- No circular dependencies within geometry
**Deliverables:** `src/geometry/index.ts`, validation run
**Estimated complexity:** trivial

---

### Phase B: Model Layer

#### B01: Entity Base + PointEntity + CurveEntity
**Dependencies:** A01, A02
**Description:** Implement `src/model/Entity.ts`, `PointEntity.ts`, `CurveEntity.ts`. Base `GeometryEntity` interface with `name`, `kind`, `dependencies`. PointEntity wraps a resolved Point2D. CurveEntity wraps a line/segment/bezier.
**Acceptance Criteria:**
- `GeometryEntity` interface: `{ name: string; kind: string; dependencies: string[] }`
- `PointEntity` has resolved position computed from dependencies
- `CurveEntity` has geometry type and control points
- TypeScript discriminated unions for entity kinds
**Deliverables:** `src/model/Entity.ts`, `src/model/PointEntity.ts`, `src/model/CurveEntity.ts`
**Estimated complexity:** small

#### B02: Entity Registry
**Dependencies:** B01
**Description:** Implement `src/model/Registry.ts`. Append-only name→entity store. `register()`, `get()`, `has()`, `all()`, `byKind()`. Detects duplicates and forward references.
**Acceptance Criteria:**
- `register(name, entity)` — throws on duplicate name
- `get(name)` — returns entity or undefined
- `has(name)` — boolean check
- Immutable: no `update()` or `delete()` methods
- Tests: register, get, duplicate detection, iteration order
**Deliverables:** `src/model/Registry.ts`, tests
**Estimated complexity:** small

#### B03: Pattern Graph (DAG)
**Dependencies:** B02, A01
**Description:** Implement `src/model/DAG.ts`. Builds dependency graph from entities. Topological sort for evaluation order. `buildGraph()`, `evaluationOrder()`, `dependentsOf()`, `dependenciesOf()`. Adapt logic from `src/kanban/engine/dependency-graph.ts`.
**Acceptance Criteria:**
- `buildGraph(registry)` returns adjacency and reverse adjacency maps
- `evaluationOrder(graph)` returns topologically sorted entity names
- `dependentsOf(name)` returns entities that depend on given entity
- Cycle detection with clear error message
- Tests: linear chain, diamond dependency, cycle detection
**Deliverables:** `src/model/DAG.ts`, tests
**Estimated complexity:** small

#### B04: Model Index + Barrel Exports
**Dependencies:** B01-B03
**Description:** Create `src/model/index.ts`. Validate no circular deps.
**Acceptance Criteria:** Barrel exports work. No circular deps.
**Deliverables:** `src/model/index.ts`
**Estimated complexity:** trivial

---

### Phase C: SVG Renderer

#### C01: SVG Element Builders
**Dependencies:** A01
**Description:** Implement `src/svg/Elements.ts`. Functions: `svgPath(d, attrs)`, `svgLine(x1,y1,x2,y2,attrs)`, `svgText(content, x, y, attrs)`, `svgGroup(children, attrs)`, `svgDefs(content)`, `svgSvg(children, viewBox, size)`. All return strings.
**Acceptance Criteria:**
- Each function returns a valid SVG element string
- Proper XML escaping for text content
- Attribute ordering is consistent
- Tests: output matches expected SVG strings
**Deliverables:** `src/svg/Elements.ts`, tests
**Estimated complexity:** small

#### C02: SVG Styles + Layout
**Dependencies:** C01
**Description:** Implement `src/svg/Styles.ts` (CSS classes for cut-line, seam-allowance, grainline, notch, label, construction) and `src/svg/Layout.ts` (viewBox calculation from bounding box with margin).
**Acceptance Criteria:**
- `PATTERN_STYLES` string contains all required CSS classes
- `computeViewBox(boundingBox, margin)` returns `{ x, y, width, height }`
- Margin is in mm (default 10mm)
- Tests: known bounding box → known viewBox
**Deliverables:** `src/svg/Styles.ts`, `src/svg/Layout.ts`, tests
**Estimated complexity:** small

#### C03: Geometry SVG Renderer
**Dependencies:** C01, C02, A01-A03
**Description:** Implement `src/svg/Renderer.ts`. `renderPoint()`, `renderSegment()`, `renderPath()`, `renderPolygon()`. Converts geometry to SVG path data strings with Y-flip transform.
**Acceptance Criteria:**
- `renderSegment(segment)` returns `M x1 y1 L x2 y2` (Y-flipped)
- `renderPath(path)` returns complete `d` attribute string
- All coordinates rounded to 2 decimal places (SVG_PRECISION)
- Y-flip: `svgY = viewBoxHeight - internalY`
- Tests: known geometry → known SVG string
**Deliverables:** `src/svg/Renderer.ts`, tests
**Estimated complexity:** small

#### C04: Full SVG Sheet Renderer
**Dependencies:** C03, C02
**Description:** Implement `src/svg/ModelRenderer.ts`. Takes a Piece (or collection of geometry) and produces a complete SVG document with all layers (seam allowance, cut line, construction, annotations).
**Acceptance Criteria:**
- Output is valid SVG 1.1 with xmlns, viewBox, width/height in mm
- Contains `<defs>` with styles and arrow markers
- Contains grouped layers with correct CSS classes
- A test rectangle renders as valid SVG
- SVG file opens correctly in browser
**Deliverables:** `src/svg/ModelRenderer.ts`, `src/svg/Export.ts`, tests
**Estimated complexity:** medium

---

### Phase D: DSL v0.1 (Minimal)

#### D01: Token Types + Lexer
**Dependencies:** A01
**Description:** Implement `src/dsl/Token.ts` and `Lexer.ts`. Token types: KEYWORD (POINT, LINE, CURVE, PATH, EXPORT), IDENTIFIER, NUMBER, LPAREN, RPAREN, LBRACE, RBRACE, COMMA, EQUALS, ARROW, DOT, NEWLINE, EOF. Lexer produces token array with source positions.
**Acceptance Criteria:**
- All token types defined as discriminated union
- Lexer handles whitespace/newline separation
- Lexer tracks line and column for each token
- Error on unrecognized characters
- Tests: tokenize simple expressions, error cases
**Deliverables:** `src/dsl/Token.ts`, `src/dsl/Lexer.ts`, tests
**Estimated complexity:** small

#### D02: AST Node Types
**Dependencies:** D01
**Description:** Implement `src/dsl/AST.ts`. AST nodes as discriminated unions with `kind` tag and `span`. Nodes: `Program`, `PointDecl`, `LineDecl`, `CurveDecl`, `PathDecl`, `ExportDecl`, `NumberLiteral`, `Identifier`, `BinaryExpr`, `CallExpr`.
**Acceptance Criteria:**
- Every node has `span: { start, end, line, column }`
- Discriminated union with `kind` field
- TypeScript types enforce exhaustive checking
- Tests: construct AST nodes, verify span tracking
**Deliverables:** `src/dsl/AST.ts`, tests
**Estimated complexity:** small

#### D03: Parser (Recursive Descent)
**Dependencies:** D02, D01
**Description:** Implement `src/dsl/Parser.ts`. Recursive descent parser. Grammar (v0.1): program → statement*. statement → pointDecl | lineDecl | curveDecl | pathDecl | exportDecl. Expressions: numbers and identifiers only (no arithmetic in v0.1).
**Acceptance Criteria:**
- Parses valid .sastre files into AST
- Clear error messages with source spans
- Panic-mode recovery (skip to next newline on error)
- Tests: parse point declarations, path declarations, error cases
**Deliverables:** `src/dsl/Parser.ts`, `src/dsl/Errors.ts`, tests
**Estimated complexity:** medium

#### D04: Interpreter (AST → Registry)
**Dependencies:** D03, B02, B03
**Description:** Implement `src/dsl/Interpreter.ts`. Walks AST, creates entities, registers in registry. Evaluates expressions (raw numbers only in v0.1). Builds PatternGraph from registrations.
**Acceptance Criteria:**
- `interpret(ast, registry)` populates registry with entities
- Evaluates numeric expressions (addition, subtraction in v0.1)
- Throws on undefined references
- Builds correct dependency graph
- Tests: interpret simple point → registry has point entity
**Deliverables:** `src/dsl/Interpreter.ts`, tests
**Estimated complexity:** medium

#### D05: DSL SVG Pipeline
**Dependencies:** D04, C04
**Description:** Wire DSL → Registry → SVG output. `renderFromSource(source: string): string` end-to-end function. Produces complete SVG from DSL source.
**Acceptance Criteria:**
- `renderFromSource("POINT a = (10, 20)\nEXPORT a")` produces valid SVG
- SVG contains rendered point at correct position
- End-to-end test with A-line skirt DSL code (partial — without pattern commands)
**Deliverables:** Pipeline integration, tests
**Estimated complexity:** medium

---

### Phase E: DSL v0.2 (Parametric)

#### E01: Unit Parsing
**Dependencies:** D01
**Description:** Extend lexer/parser to recognize unit suffixes: `cm`, `mm`, `in`. Implement `src/dsl/Units.ts` with `parseUnit(value, unit): number` converting to mm.
**Acceptance Criteria:**
- `parseUnit(72, 'cm')` → 720 (mm)
- `parseUnit(3, 'in')` → 76.2 (mm)
- Lexer tokenizes `72cm` as single NUMBER token with unit
- Tests: all unit conversions, error on invalid unit
**Deliverables:** `src/dsl/Units.ts`, extended lexer/parser, tests
**Estimated complexity:** small

#### E02: Pratt Expression Parser
**Dependencies:** D03
**Description:** Implement `src/dsl/Pratt.ts`. Operator precedence parser for arithmetic expressions. Supports: `+`, `-`, `*`, `/`, `()`. Integrates with existing parser for expression contexts.
**Acceptance Criteria:**
- Parses `2 + 3 * 4` correctly (precedence)
- Parses `(2 + 3) * 4` correctly (grouping)
- Parses `waist / 2 + 1cm` (mixing identifiers and units)
- Error on mismatched parentheses
- Tests: precedence, associativity, nested expressions
**Deliverables:** `src/dsl/Pratt.ts`, tests
**Estimated complexity:** medium

#### E03: INPUT/LET Declarations
**Dependencies:** D03, E01, E02
**Description:** Add `INPUT` and `LET` keywords to grammar. `INPUT name: value [unit]` declares a parametric input. `LET name = expression` declares a derived value.
**Acceptance Criteria:**
- `INPUT waist: 72cm` parsed as InputDecl with name, value, unit
- `LET half = waist / 2` parsed as LetDecl with name and expression
- Tests: parse both forms, error on missing value
**Deliverables:** Extended parser, AST nodes, tests
**Estimated complexity:** small

#### E04: Point Methods (.UP, .DOWN, .LEFT, .RIGHT)
**Dependencies:** D03, E01
**Description:** Add syntactic sugar for relative point construction. `point.UP(10mm)` → `createPoint(point.x, point.y + 10)`.
**Acceptance Criteria:**
- Lexer recognizes `.UP`, `.DOWN`, `.LEFT`, `.RIGHT` as method tokens
- Parser creates MethodCall AST node
- Interpreter evaluates as relative point construction
- Tests: all four directions, chaining
**Deliverables:** Extended lexer, parser, interpreter, tests
**Estimated complexity:** small

#### E05: DSL v0.2 Pipeline
**Dependencies:** E01-E04, D05
**Description:** Wire INPUT/LET into the evaluation pipeline. Changing INPUT value re-evaluates all derived entities. Verify parametric behavior: change INPUT → output SVG changes.
**Acceptance Criteria:**
- Input with `waist: 72cm` produces different SVG than `waist: 80cm`
- LET expressions evaluate correctly with input dependencies
- Topological sort respects INPUT → LET → POINT dependency order
- Integration test: A-line skirt DSL with parametric inputs
**Deliverables:** Extended interpreter, integration tests
**Estimated complexity:** medium

---

### Phase F: Pattern Layer

#### F01: Measurement + Ease Entities
**Dependencies:** B01
**Description:** Implement `src/pattern/Measurement.ts`, `Ease.ts`. Measurement: name, value (mm), unit. Ease: type (wearing/design/stretch), value (mm). MeasurementSet: collection of measurements.
**Acceptance Criteria:**
- `Measurement` type: `{ name: string; value: number; unit: 'mm' | 'cm' | 'in' }`
- `Ease` type: `{ type: 'wearing' | 'design' | 'stretch'; value: number }`
- `MeasurementSet` with `add()`, `get()`, `all()`
- Conversion: `toMm()` method
- Tests: creation, conversion, set operations
**Deliverables:** `src/pattern/Measurement.ts`, tests
**Estimated complexity:** small

#### F02: DerivedMeasurement
**Dependencies:** F01, B03
**Description:** Implement `src/pattern/DerivedMeasurement.ts`. Formula-based: `waist_half = (waist + waist_ease) / 2`. Stored as expression + dependency list. Evaluates via DAG.
**Acceptance Criteria:**
- `DerivedMeasurement` stores formula function + dependency names
- `evaluate(registry)` computes value from dependencies
- Incorrect dependencies produce clear error
- Tests: simple derivation, chained derivation
**Deliverables:** `src/pattern/DerivedMeasurement.ts`, tests
**Estimated complexity:** small

#### F03: NamedPoint + ConstructionLine
**Dependencies:** F01, B01, A01
**Description:** Implement `src/pattern/NamedPoint.ts`, `ConstructionLine.ts`. NamedPoint: name, position (from measurements/other points), dependencies. ConstructionLine: name, type (reference/structural), endpoints.
**Acceptance Criteria:**
- `NamedPoint` with `resolve(registry)` → Point2D
- `ConstructionLine` with start/end point references
- Both participate in dependency DAG
- Tests: resolve from measurements, resolve from other points
**Deliverables:** `src/pattern/NamedPoint.ts`, `src/pattern/ConstructionLine.ts`, tests
**Estimated complexity:** small

#### F04: Contour Entity
**Dependencies:** A03, B01
**Description:** Implement `src/pattern/Contour.ts`. Wraps a `Path` with semantic type: `seam_line | cutting_line | fold_line`. Winding direction. Closed (always for piece boundaries).
**Acceptance Criteria:**
- `Contour` interface: `{ path: Path; type: 'seam_line' | 'cutting_line' | 'fold_line'; direction: 'cw' | 'ccw' }`
- Factory functions for each contour type
- `toSVGPathData()` for rendering
- Tests: create contour, verify winding, SVG output
**Deliverables:** `src/pattern/Contour.ts`, tests
**Estimated complexity:** small

#### F05: Piece Entity
**Dependencies:** F04, F03
**Description:** Implement `src/pattern/Piece.ts`. Core entity: name, contour, grainline, notches, darts, labels, seam_allowance_width. This is the primary output entity.
**Acceptance Criteria:**
- `Piece` interface with all fields from domain model (§1.7)
- For v1.0 slice: contour, grainline, notches, darts, labels, seam_allowance_width
- Deferred fields: cutting_contour (derived), internal_paths, mirror, on_fold, sewing relationships
- `toSVG()` renders complete piece with all layers
- Tests: create piece, verify all fields, render to SVG
**Deliverables:** `src/pattern/Piece.ts`, tests
**Estimated complexity:** medium

#### F06: SeamAllowance + Offset Integration
**Dependencies:** F04, A09
**Description:** Implement `src/pattern/SeamAllowance.ts`. `addSeamAllowance(piece, width)` → new Piece with cutting contour. Uses `offsetPath()` from geometry.
**Acceptance Criteria:**
- Returns new Piece (does not mutate original)
- Cutting contour is offset inward by `width` mm
- Constant width for first version
- No self-intersections (validated)
- Tests: rectangular piece → known offset dimensions
**Deliverables:** `src/pattern/SeamAllowance.ts`, tests
**Estimated complexity:** medium

#### F07: Notch + Grainline + Dart + Label
**Dependencies:** F05, A01, A02
**Description:** Implement `src/pattern/Notch.ts`, `Grainline.ts`, `Dart.ts`, `PieceLabel.ts`. Each as a separate entity referenced by Piece.
**Acceptance Criteria:**
- `Notch`: `{ position: Point2D, depth: number, angle: number, type: 'v' | 'slit' }`
- `Grainline`: `{ start: Point2D, end: Point2D }` with arrow rendering
- `Dart`: `{ apex: Point2D, leg1: Point2D, leg2: Point2D, intake: number }`
- `PieceLabel`: `{ text: string, position: Point2D, fontSize: number }`
- Each renders to SVG (notch as triangle, grainline as arrow, dart as triangle fill, label as text)
- Tests: SVG output for each
**Deliverables:** `src/pattern/Notch.ts`, `Grainline.ts`, `Dart.ts`, `PieceLabel.ts`, tests
**Estimated complexity:** medium

#### F08: Pattern Index + Barrel Exports
**Dependencies:** F01-F07
**Description:** Create `src/pattern/index.ts`. Full barrel export.
**Acceptance Criteria:** All pattern modules importable from single path.
**Deliverables:** `src/pattern/index.ts`
**Estimated complexity:** trivial

---

### Phase G: Validation

#### G01: Reference Validator
**Dependencies:** B02, B03
**Description:** Implement `src/validation/ReferenceValidator.ts`. Checks: all references resolve, no forward references, no shadowing, no orphan entities.
**Acceptance Criteria:**
- Returns `{ valid: boolean; errors: string[] }`
- Detects: undefined reference, forward reference, duplicate name
- Tests: valid graph, each error type
**Deliverables:** `src/validation/ReferenceValidator.ts`, tests
**Estimated complexity:** small

#### G02: Geometry Validator
**Dependencies:** A03, A05, A10
**Description:** Implement `src/validation/GeometryValidator.ts`. Checks: closed paths are actually closed (endpoints match within epsilon), no self-intersections, positive area, valid dimensions.
**Acceptance Criteria:**
- Detects open paths, self-intersections, zero/negative area
- Uses GEOMETRIC_EPSILON for endpoint matching
- Tests: valid polygon, open path, self-intersecting path
**Deliverables:** `src/validation/GeometryValidator.ts`, tests
**Estimated complexity:** medium

#### G03: Path Validator
**Dependencies:** A02, A03
**Description:** Implement `src/validation/PathValidator.ts`. Checks: path continuity (each segment starts where previous ended), endpoint matching for closed paths, minimum segment count.
**Acceptance Criteria:**
- Detects discontinuous paths
- Verifies closed path endpoints match
- Tests: continuous path, gap in path, closed path with gap
**Deliverables:** `src/validation/PathValidator.ts`, tests
**Estimated complexity:** small

---

### Phase H: CLI + Integration

#### H01: CLI Entry Point
**Dependencies:** C04, D05
**Description:** Implement `src/cli/index.ts` with Commander.js. Commands: `build <file.sastre> [--output <file.svg>]`, `validate <file.sastre>`, `inspect <file.sastre>`.
**Acceptance Criteria:**
- `sastre build input.sastre -o output.svg` produces SVG file
- `sastre validate input.sastre` reports errors or "valid"
- `sastre inspect input.sastre` prints entity tree
- --json flag on all commands
**Deliverables:** `src/cli/index.ts`, `src/cli/commands/build.ts`, `validate.ts`, `inspect.ts`
**Estimated complexity:** medium

#### H02: A-Line Skirt Reference Pattern
**Dependencies:** H01, F05, F06, F07
**Description:** Write the complete A-line skirt .sastre file using DSL v0.2 syntax. Create reference SVG output. Create integration test that builds from DSL and compares output.
**Acceptance Criteria:**
- `.sastre` file parses without errors
- Generated SVG passes all 24 success criteria (§4.4)
- Integration test: `build(sastreFile) === expectedSVG` (or structural comparison)
- SVG opens correctly in browser and prints at correct size
**Deliverables:** `tests/patterns/a-line-skirt.sastre`, `tests/integration/a-line-skirt.test.ts`, reference SVG
**Estimated complexity:** medium

#### H03: Validation CLI Integration
**Dependencies:** H01, G01-G03
**Description:** Wire validation layer into CLI validate command. Run all validators and report results.
**Acceptance Criteria:**
- `sastre validate` runs reference, geometry, and path validators
- Errors reported with source location (if available)
- Exit code 0 on valid, 1 on errors
- Tests: validate valid file, validate file with reference error
**Deliverables:** Validation integration, tests
**Estimated complexity:** small

#### H04: Full Integration Test Suite
**Dependencies:** H02, H03
**Description:** End-to-end tests: parse → evaluate → validate → render → compare. Property-based tests with fast-check for geometry invariants.
**Acceptance Criteria:**
- Pipeline test: DSL source → valid SVG
- Round-trip test: changing INPUT → SVG changes predictably
- Property test: all paths are closed, all seam allowances are positive
- All tests pass with `npm test`
**Deliverables:** `tests/integration/pipeline.test.ts`, `tests/properties/geometry.test.ts`
**Estimated complexity:** medium

---

## 6. Dependencies Between Tasks

### 6.1 Hard Dependencies (must complete before starting)

```
A01 → A02, A04, A06, A07
A02 → A03, A09, A11
A03 → A05, A09, A10
A04 → A10
A01+A02 → B01
B01 → B02
B02 → B03
A01+A02+A03+C01 → C03
C01+C02+C03 → C04
C04+D04 → D05
D01 → D02 → D03 → D04
D04+B02+B03 → D05
D01 → E01, E02
D03+E01+E02 → E03
E03+E04 → E05
B01 → F01
F01+B03 → F02
F01+B01+A01 → F03
A03+B01 → F04
F04+F03 → F05
F04+A09 → F06
F05+A01+A02 → F07
B02+B03 → G01
A03+A05+A10 → G02
A02+A03 → G03
C04+D05 → H01
H01+F05+F06+F07 → H02
H01+G01+G02+G03 → H03
H02+H03 → H04
```

### 6.2 Parallelization Opportunities

| After completing | Can run in parallel |
|-----------------|---------------------|
| A01 | A04, A06, A07 (all depend only on A01) |
| A02 | A03, A08, A11 |
| A03 | A05, A09 |
| A01+A02 | B01 |
| B02 | B03, B04 |
| C01 | C02 |
| D01 | D02 |
| E01 | E02, E03 |
| F01 | F03 |
| F04 | F05, F06 |
| G01, G02, G03 | All three are independent |
| Phase B, C, D | Can start as soon as their geometry deps are met |

### 6.3 Minimum Viable Chain (Fastest to First SVG)

```
A01 (Point+Vector) → A02 (Segment) → A03 (Path) → A05 (Polygon)
                                ↓
                    C01 (SVG Elements) → C02 (Styles/Layout)
                                ↓
                    C03 (Geometry Renderer) → C04 (Full SVG)
                                ↓
                    H02 (A-Line Skirt test)
```

**6-7 tasks to first visual output.** Pattern operations (Phase F) and DSL (Phase D) can start as soon as geometry is ready.

---

## 7. Acceptance Criteria Summary

Each task in §5 has individual acceptance criteria. Global acceptance criteria for the entire implementation:

| Criterion | Description |
|-----------|-------------|
| **G1** | `npm run build` compiles without errors |
| **G2** | `npm test` passes all tests |
| **G3** | `npm run lint` produces no errors (warnings acceptable) |
| **G4** | `npm run typecheck` passes |
| **G5** | A-line skirt .sastre file parses and produces valid SVG |
| **G6** | SVG renders correctly in Chrome, Firefox, and Inkscape |
| **G7** | SVG prints at correct physical dimensions on A4 paper |
| **G8** | Changing INPUT measurements changes SVG output parametrically |
| **G9** | No file in `src/geometry/` imports from `src/dsl/` or `src/svg/` (enforce A16) |
| **G10** | Every source file has corresponding test file with >90% line coverage |
| **G11** | No `any` types in production code (only in test helpers if needed) |
| **G12** | All functions have explicit return types |

---

## 8. Risks and Mitigations

| ID | Risk | Severity | Probability | Mitigation |
|----|------|----------|-------------|------------|
| **R1** | **Bezier offset produces self-intersections** — mathematical offset of Bezier is not a Bezier. Approximation may fail for tight concave curves. | High | High | Start with straight-only offset. Add curve offset incrementally. Validate for self-intersection after every offset operation. Use configurable sample count. Document as known limitation. See R02. |
| **R2** | **Floating-point precision causes gaps** — path endpoints don't match, areas are slightly negative, intersections are slightly off. | High | High | Epsilon comparisons everywhere (0.001mm geometric, 0.01mm intersection). Test with known edge cases. Separate tolerances per operation type. See R01. |
| **R3** | **Module boundary violations / circular deps** — geometry imports from DSL, DSL imports from SVG, etc. | Medium | Medium | Enforce A16 dependency direction. ESLint rule for import paths. Run `madge --circular` in CI. Fix immediately if detected. See R10. |
| **R4** | **DSL complexity creep** — parser grows beyond minimal scope, features added without gates. | Medium | Medium | Strict DSL version gates (A13). v0.1 has NO INPUT/LET. Each version must be complete before next begins. Document scope in each version's acceptance criteria. See R03. |
| **R5** | **Pattern geometry correctness** — A-line skirt measurements don't match real-world expectations, dart placement is wrong, seam allowance is incorrect. | High | Medium | Reference measurements from pattern drafting resources. Cross-check with Seamly2D for validation. Human review of SVG output. Start simple, validate each concept before advancing. See R04. |
| **R6** | **Scope creep to AI integration** — temptation to add NLP/AI before core is solid. This was the failure mode of the previous SASTRE project. | High | High | Strict build order. No AI/NLP code until geometry + SVG + DSL + CLI + A-line skirt all complete. Document in README. See R06. |
| **R7** | **Seam allowance corner treatment** — simple offset seems easy but corners require miter/bevel/round decisions, variable widths create complexity. | Medium | High | Start with constant-width, simple corners (extend and intersect). Defer variable-width, French seams, flat-felled to later slices. Document deferred edge cases. See R07. |
| **R8** | **Agent implementation errors** — future agents implementing tasks may introduce subtle bugs or deviate from architecture. | High | Medium | Every task has concrete, verifiable acceptance criteria. Tests included in every task. Clear file paths and deliverables. Architecture constraints documented in this plan. See R11. |
| **R9** | **SVG compatibility across renderers** — SVG may render differently in Chrome vs Firefox vs Inkscape vs print. | Medium | Low | Use SVG 1.1 basic features only. Test in Chrome, Firefox, Inkscape. Avoid unsupported CSS. Use inline styles as fallback. See R05. |
| **R10** | **Offset strategy validation failure** — sample-then-fit may not produce adequate results for complex pattern curves (armholes, crotch). | Medium | Medium | Mark offset tasks as "needs validation". Implement with configurable sample count. Test on A-line skirt first (simple curves). Document accuracy limitations. Defer complex curves to later patterns. See R12. |

---

## 9. Discarded Alternatives

| Alternative | Considered For | Reason for Rejection |
|-------------|---------------|---------------------|
| **Use JSTS/Clipper2 for geometry** | A03 (Geometry library) | Pattern geometry uses small specific set of primitives. Full dependency risk of large geometry libraries. Custom implementation is small, testable, purpose-built. (D03) |
| **Use svg.js library for SVG** | C01 (SVG generation) | Template-literal string building is simpler, produces cleaner output, zero runtime dependencies. svg.js adds DOM abstraction unnecessary for static output. (D04) |
| **Use Chevrotain/Peggy parser** | D03 (Parser) | ~30-40 grammar rules — small enough to hand-write. Full control over error messages. No build step required. (D02) |
| **Mutable entity registry** | B02 (Model) | Mutable state causes subtle mutation bugs in parametric evaluation. Immutable definitions with append-only registry is safer. Change = new definition + re-evaluate. (D09) |
| **Y-down internally (SVG standard)** | A08 (Coordinate system) | "UP" means negative Y. Angles are inverted. Confusing for pattern construction. Y-up with single flip at render is clearer. (D08) |
| **Boxer shorts as first pattern** | First vertical slice | Boxer shorts require multiple pieces, curves (crotch), and more complex construction. A-line skirt is single piece, exercises all concepts with minimum complexity. (Revised from D12 per TASK-006) |
| **Monorepo with separate packages** | A11 (Project structure) | Premature for early development. Single package with modular src/ directories is simpler. Can extract later. (D11) |
| **Visual regression testing** | A10 (Testing) | SVG rendering varies across viewers. Reference pattern tests with geometric assertions are more reliable. Visual regression deferred. (D10) |
| **Use TypeScript `number` as `f64` terminology** | A05 (Units) | "f64" is Rust terminology. In TypeScript, the internal numeric type is JavaScript `number` (IEEE-754 binary64). Use correct terminology. (D05 note) |
| **Horizontal build order (all geometry → all DSL → all SVG)** | A12 (Build order) | Builds large subsystems that don't connect until late. "Big bang" integration risk. Vertical slices produce verifiable output at each step. (D13) |

---

## 10. Migration Plan: How to Create Kanban Tasks

To convert this plan into Kanban tasks:

1. **Create a new kanban.json** (or extend the existing one with new phases PHASE-11 through PHASE-18 mapping to phases A through H above)
2. **Task ID prefix scheme:** Use new prefixes to distinguish from planning tasks:
   - `GEO-XXX` for geometry tasks (A01-A12) — reuse prefix since planning GEO tasks are "done"
   - `MDL-XXX` for model tasks (B01-B04)
   - `SVG-XXX` for SVG tasks (C01-C04)
   - `DSL-XXX` for DSL tasks (D01-D05, E01-E05)
   - `PAT-XXX` for pattern tasks (F01-F08)
   - `VAL-XXX` for validation tasks (G01-G03)
   - `CLI-XXX` for CLI tasks (H01-H04)
3. **Each task** gets: id, title, description (from §5), acceptance_criteria, dependencies (from §6), deliverables, phase, priority, type="feature", tests (list test files)
4. **Milestones:** M1=first SVG (after C04), M2=DSL v0.1 (after D05), M3=DSL v0.2 (after E05), M4=Pattern Piece (after F05), M5=A-Line Skirt (after H02), M6=CLI+Validation (after H04)
5. **Run validation:** `npm run validate:kanban` to verify task graph integrity before starting implementation

---

## Appendix: Quick Reference — File Paths

| Phase | Files Created | Tests Created |
|-------|--------------|---------------|
| A | `src/geometry/*.ts` (12 files) | `src/geometry/__tests__/*.test.ts` |
| B | `src/model/*.ts` (4 files) | `src/model/__tests__/*.test.ts` |
| C | `src/svg/*.ts` (6 files) | `src/svg/__tests__/*.test.ts` |
| D | `src/dsl/*.ts` (8 files) | `src/dsl/__tests__/*.test.ts` |
| E | `src/dsl/*.ts` (extended) | `src/dsl/__tests__/*.test.ts` |
| F | `src/pattern/*.ts` (8 files) | `src/pattern/__tests__/*.test.ts` |
| G | `src/validation/*.ts` (3 files) | `src/validation/__tests__/*.test.ts` |
| H | `src/cli/**/*.ts` (4 files) | `tests/integration/*.test.ts` |

**Total estimated:** ~50 source files, ~35 test files, ~45 implementation tasks.
