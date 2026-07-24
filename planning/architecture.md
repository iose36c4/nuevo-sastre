# Architecture — SASTRE DSL

## Overview

SASTRE is a tool for creating clothing patterns using a domain-specific language and exporting them as SVG. The architecture follows a strict bottom-up build order.

## System Architecture

```
                    ┌──────────────┐
                    │  DSL Source   │
                    │  (.sastre)    │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │    Lexer     │
                    │  (tokens)    │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │    Parser    │
                    │  (AST)       │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  Interpreter │
                    │  (execute)   │
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
                    │  (.svg)      │
                    └──────────────┘
```

## Module Map

```
src/
├── geometry/
│   ├── Point.ts          # Point2D: {x, y} in mm
│   ├── Vector.ts         # Vector2D: direction + magnitude
│   ├── Angle.ts          # Angle utilities (radians, degrees)
│   ├── Line.ts           # Infinite line (ax + by + c = 0)
│   ├── Segment.ts        # Finite line segment (two endpoints)
│   ├── Ray.ts            # Half-infinite line
│   ├── Circle.ts         # Circle (center, radius)
│   ├── Arc.ts            # Circular arc
│   ├── Bezier.ts         # Bezier curves (quadratic, cubic)
│   ├── Path.ts           # Ordered sequence of segments/curves
│   ├── Polygon.ts        # Closed path with area
│   ├── Transform.ts      # Rotation, translation, scale, reflection
│   ├── Intersection.ts   # All intersection algorithms
│   ├── Measure.ts        # Distance, angle, area, arc length
│   ├── Offset.ts         # Parallel curve / seam allowance offset
│   └── index.ts          # Public API
│
├── model/
│   ├── Entity.ts         # Base entity interface
│   ├── PointEntity.ts    # Named point with dependencies
│   ├── CurveEntity.ts    # Named curve (bezier, arc, line)
│   ├── PathEntity.ts     # Named path (sequence of entities)
│   ├── Registry.ts       # Name → Entity storage
│   ├── DAG.ts            # Dependency graph + topological sort
│   └── index.ts
│
├── dsl/
│   ├── Lexer.ts          # Tokenizer
│   ├── Token.ts          # Token types
│   ├── Parser.ts         # Recursive descent parser
│   ├── Pratt.ts          # Expression parser (Pratt)
│   ├── AST.ts            # AST node types (discriminated unions)
│   ├── Interpreter.ts    # AST → Geometry Model execution
│   ├── Units.ts          # Unit parsing and conversion
│   ├── Errors.ts         # Error types with source spans
│   └── index.ts
│
├── svg/
│   ├── Renderer.ts       # Geometry Model → SVG string
│   ├── Styles.ts         # CSS styles for pattern elements
│   ├── Elements.ts       # SVG element builders (path, text, etc.)
│   ├── Layout.ts         # ViewBox calculation, piece positioning
│   ├── Export.ts         # File writing, SVGO optimization
│   └── index.ts
│
├── pattern/
│   ├── Piece.ts          # Pattern piece (contour + construction)
│   ├── SeamAllowance.ts  # Seam allowance offset logic
│   ├── Notch.ts          # Notch marks
│   ├── Grainline.ts      # Grainline arrows
│   ├── Dart.ts           # Dart geometry
│   ├── Label.ts          # Piece labels and annotations
│   ├── Measurements.ts   # Body measurement definitions
│   └── index.ts
│
├── cli/
│   ├── index.ts          # CLI entry point
│   ├── commands/         # build, inspect, validate, export
│   └── args.ts           # Argument parsing
│
├── validation/
│   ├── GeometryValidator.ts   # Geometric validity checks
│   ├── ReferenceValidator.ts  # Reference existence checks
│   ├── PathValidator.ts       # Path closure, self-intersection
│   └── index.ts
│
└── index.ts              # Public API
```

## Core Geometry Types

All geometry is represented in millimeters (f64). The coordinate system follows SVG convention: origin at top-left, X rightward, Y downward.

### Point
```typescript
interface Point2D {
  readonly x: number;  // mm
  readonly y: number;  // mm
}
```

### Vector
```typescript
interface Vector2D {
  readonly x: number;
  readonly y: number;
}
```

### Bezier Curve
```typescript
type BezierCurve =
  | { kind: 'quadratic'; p0: Point2D; p1: Point2D; p2: Point2D }
  | { kind: 'cubic'; p0: Point2D; p1: Point2D; p2: Point2D; p3: Point2D };
```

### Path
```typescript
interface Path {
  readonly segments: PathSegment[];
  readonly closed: boolean;
}

type PathSegment =
  | { kind: 'line'; from: Point2D; to: Point2D }
  | { kind: 'bezier'; curve: BezierCurve }
  | { kind: 'arc'; center: Point2D; radius: number; startAngle: number; endAngle: number; ccw: boolean };
```

## Data Flow

### 1. DSL → Geometry (Execution Phase)
```
Source code
  → Lexer: tokenize into Token[]
  → Parser: parse into AST (Program node)
  → Interpreter: walk AST, create entities in Registry
  → Result: Populated GeometryModel
```

### 2. Geometry → SVG (Render Phase)
```
GeometryModel
  → Layout: calculate viewBox, piece positions
  → Renderer: iterate entities, generate SVG elements
  → Styles: apply CSS classes per element type
  → Export: write to file, optional SVGO optimization
  → Result: .svg file
```

### 3. Validation (Can run at any point)
```
GeometryModel
  → ReferenceValidator: check all references resolve
  → GeometryValidator: check degenerate cases
  → PathValidator: check closure, self-intersection
  → Result: ValidationResult with errors[]
```

## Dependency Graph (Modules)

```
geometry (no internal deps)
    ↓
model (depends on geometry)
    ↓
dsl (depends on model, geometry)
    ↓
svg (depends on model, geometry)
    ↓
pattern (depends on model, geometry, svg)
    ↓
validation (depends on model, geometry)
    ↓
cli (depends on everything)
```

## Key Algorithms

### Bezier Evaluation (De Casteljau)
Numerically stable, uses only convex combinations. Preferred over Bernstein form.

### Bezier Splitting
De Casteljau at parameter t produces left/right sub-curves. Used for notch placement, path subdivision.

### Bezier Length
Adaptive flatten: subdivide until flat (deviation < 0.01mm), sum segment lengths.

### Curve Offset (Seam Allowance)
Sample N points on curve, compute normals, displace by allowance width, fit new Bezier.

### Line-Line Intersection
Determinant-based. Returns null for parallel/coincident lines within epsilon.

### Line-Bezier Intersection
Recursive subdivision with bounding-box pruning.

### Point-in-Polygon
Ray casting algorithm. Sufficient for simple polygons (no holes initially).

## File Format

### DSL File (.sastre)
```
// Comments
INPUT hip = 102cm
INPUT waist = 88cm

LET quarter_hip = hip / 4
LET quarter_waist = waist / 4

POINT origin = (0, 0)
POINT hip_right = origin.RIGHT(quarter_hip)
...

CUT frontPiece FROM contour:
  ... edges ...
END

EXPORT SVG frontPiece → "front.svg"
```

### SVG Output Structure
```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 {width_mm} {height_mm}"
     width="{width_mm}mm" height="{height_mm}mm"
     xmlns="http://www.w3.org/2000/svg">
  <style>/* pattern styles */</style>
  <g id="piece-front" class="piece">
    <g class="seam-allowance"><!-- offset path --></g>
    <g class="cut-lines"><!-- main contour --></g>
    <g class="construction"><!-- internal lines --></g>
    <g class="annotations"><!-- labels, dimensions --></g>
  </g>
</svg>
```

## Error Strategy

1. **Lexer errors**: Include line/column, expected tokens, actual token
2. **Parser errors**: Panic-mode recovery (skip to `;` or `END`), collect multiple errors
3. **Reference errors**: "Undefined point 'X'. Did you mean 'Y'?"
4. **Geometry errors**: "Lines are parallel, no intersection exists"
5. **Validation errors**: "Path is not closed (gap of 0.3mm between last and first point)"

All errors include source span for editor/IDE integration.

## Testing Strategy

| Layer | Tool | Coverage |
|-------|------|----------|
| Geometry primitives | Vitest unit tests | All operations |
| Geometry operations | Vitest + property tests | Intersections, offsets |
| Parser | Vitest | Each grammar rule |
| Interpreter | Vitest integration | DSL → Geometry round-trip |
| SVG renderer | Vitest snapshot + assertion | Geometry → SVG correctness |
| CLI | Vitest + execa | End-to-end command tests |
| Reference patterns | Vitest | Geometry assertions on output |
| Validation | Vitest | Each validator independently |

## Performance Considerations

- Geometry operations are O(1) or O(n) for small n (pattern curves have <100 points)
- Bezier flattening: recursive, typically <10 levels for 0.01mm tolerance
- SVG generation: string concatenation, no DOM manipulation
- No hot paths — interactivity is not a requirement initially
- Future optimization: lazy evaluation of geometry model (only compute what's rendered)
