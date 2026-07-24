# Architecture — SASTRE DSL (V2)

## Overview

SASTRE creates clothing patterns via a DSL and exports them as SVG. The architecture follows a vertical-slice build order: each increment produces something visually verifiable.

## System Architecture (Final State)

```
                    ┌──────────────┐
                    │  DSL Source   │
                    │  (.sastre)    │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │    Lexer     │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │    Parser    │
                    │  (AST)       │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  Interpreter │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   Geometry   │
                    │   Model      │
                    │ (named DAG)  │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ SVG Renderer │
                    │  (generate)  │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  SVG File    │
                    └──────────────┘
```

## Build Order (Vertical Slices)

```
VS-01: Foundations + Kanban Validator
VS-02: Point → Segment → SVG Renderer → RECTANGLE SVG (MINIMAL: no Vector, no Line)
VS-03: Bezier → Path → SVG → CURVED SVG (M2A)
VS-03b: Vector, Line, Circle, Arc, Polygon, Transform, Measure (parallel to VS-03) (M2B)
VS-03c: Intersections (decomposed: Line-Line, Segment-Segment, Line-Circle, etc.) (M2C)
VS-04: DSL v0.1 (no expressions, no units, no INPUT/LET) → DSL SVG
VS-05: DSL v0.2 (INPUT, LET, Pratt, Units, Point methods) → PARAMETRIC SVG
VS-06: Pattern Piece → PIECE SVG (parallel to DSL, depends only on geometry+SVG)
VS-07: Offset (decomposed), SeamAllowance, Notch, Grainline → PATTERN SVG
VS-08: CLI + Validation
VS-09: Boxer progressive patterns
VS-10: Integration tests + Documentation
```

## Module Map

```
src/
├── geometry/
│   ├── Point.ts          # Point2D {x, y} in mm, Y-up
│   ├── Vector.ts         # Vector2D, operations
│   ├── Line.ts           # Infinite line (ax + by + c = 0)
│   ├── Segment.ts        # Finite segment {from, to}
│   ├── Bezier.ts         # Quadratic + Cubic Bezier
│   ├── Path.ts           # Ordered segments, closed flag
│   ├── Polygon.ts        # Closed path with area
│   ├── Circle.ts         # Circle {center, radius}
│   ├── Arc.ts            # Circular arc
│   ├── Ray.ts            # Half-infinite line
│   ├── Transform.ts      # rotate, translate, scale, reflect
│   ├── Intersection.ts   # Line-Line, Segment-Segment, Line-Bezier
│   ├── Measure.ts        # distance, angle, area, pathLength
│   ├── Offset.ts         # Parallel curve (for seam allowance)
│   └── index.ts
│
├── model/
│   ├── Entity.ts         # GeometryEntity base interface
│   ├── PointEntity.ts    # Named point (resolved position)
│   ├── CurveEntity.ts    # Named curve (line, bezier, arc)
│   ├── PathEntity.ts     # Named path (sequence of refs)
│   ├── Registry.ts       # Append-only name→entity store
│   ├── DAG.ts            # Dependency graph, topological sort
│   └── index.ts
│
├── dsl/
│   ├── Token.ts          # Token types and interface
│   ├── Lexer.ts          # Tokenizer
│   ├── AST.ts            # AST node types (discriminated unions)
│   ├── Parser.ts         # Recursive descent parser
│   ├── Pratt.ts          # Expression parser
│   ├── Interpreter.ts    # AST → Registry execution
│   ├── Units.ts          # Unit parsing and conversion
│   ├── Errors.ts         # Error types with source spans
│   └── index.ts
│
├── svg/
│   ├── Renderer.ts       # Geometry → SVG string (direct rendering)
│   ├── ModelRenderer.ts  # Registry → SVG string (named entity rendering)
│   ├── Styles.ts         # CSS classes for pattern elements
│   ├── Elements.ts       # SVG element builders
│   ├── Layout.ts         # ViewBox calculation
│   ├── Export.ts         # File writing
│   └── index.ts
│
├── pattern/
│   ├── Piece.ts          # Pattern piece model
│   ├── SeamAllowance.ts  # Seam allowance offset
│   ├── Notch.ts          # Notch marks
│   ├── Grainline.ts      # Grainline arrows
│   ├── Dart.ts           # Dart geometry
│   └── index.ts
│
├── cli/
│   ├── index.ts          # CLI entry point
│   └── commands/         # build, validate, inspect
│
└── validation/
    ├── ReferenceValidator.ts
    ├── GeometryValidator.ts
    ├── PathValidator.ts
    └── index.ts
```

## Coordinate System

- **Internal:** Y-up, standard Cartesian. Origin configurable per pattern.
- **SVG output:** Y-down. Transform: `svgY = viewBoxHeight - internalY`
- **Units:** All internal values in millimeters (JavaScript `number`, IEEE-754 binary64)
- **SVG viewBox:** `0 0 {width_mm} {height_mm}` where 1 user unit = 1mm

## Floating-Point Conventions

| Constant | Value | Usage |
|----------|-------|-------|
| GEOMETRIC_EPSILON | 0.001mm | Point equality, general comparisons |
| INTERSECTION_EPSILON | 0.01mm | Line/curve intersection detection |
| LENGTH_EPSILON | 0.001mm | Path length comparisons |
| SVG_PRECISION | 2 decimal places | Output coordinate rounding |
| BEZIER_FLATTEN_TOLERANCE | 0.01mm | Adaptive flatten for length calculation |

## Core Types

```typescript
// All values in mm, Y-up coordinate system
interface Point2D { readonly x: number; readonly y: number; }
interface Vector2D { readonly x: number; readonly y: number; }

// Bezier curves
type BezierCurve =
  | { kind: 'quadratic'; p0: Point2D; p1: Point2D; p2: Point2D }
  | { kind: 'cubic'; p0: Point2D; p1: Point2D; p2: Point2D; p3: Point2D };

// Path: ordered segments forming a line/curve chain
interface Path { readonly segments: PathSegment[]; readonly closed: boolean; }
type PathSegment =
  | { kind: 'line'; from: Point2D; to: Point2D }
  | { kind: 'bezier'; curve: BezierCurve }
  | { kind: 'arc'; center: Point2D; radius: number; startAngle: number; endAngle: number; ccw: boolean };
```

## Entity Model

- **Definitions are immutable** once registered — never modified in place
- Registry is append-only
- Forward references NOT allowed
- Shadowing NOT allowed
- Evaluation via topological sort (lazy, on demand)
- **Change propagation:** Create new definition → re-evaluate downstream. Do NOT modify existing entities.
  - Model: Definitions → Evaluation Context → Computed Values (functional pipeline)

## Testing Architecture

```
src/geometry/__tests__/       # Unit tests per geometry module
src/dsl/__tests__/            # Lexer, parser, interpreter tests
src/svg/__tests__/            # Renderer tests (snapshot + assertion)
src/pattern/__tests__/        # Pattern concept tests
src/validation/__tests__/     # Validator tests
tests/integration/            # Pipeline tests (DSL→Geometry→SVG)
tests/patterns/               # Reference pattern .sastre files
tests/properties/             # Property-based tests (fast-check)
```
