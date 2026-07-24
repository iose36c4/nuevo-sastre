# Architectural Decisions — SASTRE DSL

## D01: Programming Language — TypeScript (strict mode)

**Problem:** Choose host language.
**Options:** TypeScript, Rust, Python, Haskell.
**Decision:** TypeScript (strict mode, ESM, ES2022).
**Motivo:** Discriminated unions for AST, Vitest test tooling, fast iteration. Geometry not performance-critical enough for Rust.
**Trade-offs:** Runtime overhead negligible. Must enforce `strict: true`, `noImplicitAny`, `strictNullChecks`.

## D02: Parser — Hand-Written Recursive Descent + Pratt for Expressions

**Problem:** Choose parsing approach.
**Options:** Hand-written RD, Chevrotain, Peggy, Tree-sitter.
**Decision:** Hand-written recursive descent with Pratt parsing for expression sub-language.
**Motivo:** ~30-40 grammar rules — small enough to hand-write. Full control over error messages. No build step. Pratt is industry standard for expressions.
**Trade-offs:** Manual error recovery. More code but more maintainable.

## D03: Geometry Library — Custom Implementation

**Problem:** Use existing library or build custom?
**Options:** Custom, JSTS, Clipper2, Turf.js.
**Decision:** Custom implementation.
**Motivo:** Pattern geometry uses a small, specific set of primitives. Operations (offset for seam allowance, splitting for notches) are pattern-specific. Full control over floating-point tolerance.
**Trade-offs:** More code, but each module is small, testable, purpose-built. Zero dependency risk.

## D04: SVG Generation — Template-Literal String Building + Optional SVGO

**Problem:** How to generate SVG?
**Options:** Template literals, svg.js, DOMParser, raw strings.
**Decision:** Template-literal string building with SVGO for optional post-processing.
**Motivo:** SVG is static and predictable. Template strings produce clean, readable output. Zero runtime dependencies.
**Trade-offs:** Manual XML escaping required. Must design SVG structure carefully for readability.

## D05: Unit System — Explicit Units in DSL, Internal Millimeters

**Problem:** How to handle physical units?
**Options:** Explicit units, default unit, SI (meters), unitless.
**Decision:** Explicit units in DSL syntax (`92cm`, `15mm`, `3in`). Internal representation in millimeters as JavaScript `number` (IEEE-754 binary64).
**Motivo:** Mixing cm/inches is catastrophic. Explicit units force intentionality. Internal mm avoids fractional cm floating-point issues.
**Trade-offs:** Lexer must tokenize units. Parser must convert. Error messages should preserve original units.
**Note on terminology:** The internal numeric type is JavaScript `number` (IEEE-754 binary64). The term "f64" is Rust terminology and should not be used in TypeScript code or documentation.

## D06: Floating-Point Precision — Epsilon Comparisons with Configurable Tolerance

**Problem:** Handle floating-point comparison.
**Options:** Epsilon (absolute), relative, rational, interval arithmetic.
**Decision:** Epsilon comparisons with configurable tolerance.
**Conventions:**
- Default geometric tolerance: 0.001mm (GEOMETRIC_EPSILON)
- Intersection tolerance: 0.01mm (slightly wider for robustness)
- Length comparison tolerance: 0.001mm
- SVG output precision: 2 decimal places (0.01mm)
- Tolerance is passed as optional parameter to geometry functions
**Motivo:** Pattern geometry at mm scale. Absolute epsilon of 0.001mm provides 100x safety margin over practical precision.
**Trade-offs:** Must document that geometry closer than tolerance is coincident.

## D07: AST — Discriminated Unions with Source Spans

**Problem:** How to represent parsed DSL code?
**Options:** Discriminated unions, class hierarchy, interfaces only.
**Decision:** Discriminated unions with `kind` tag and `span: { start, end, line, column }`.
**Motivo:** TypeScript exhaustive checking. Source spans for error reporting. Every AST node carries location.
**Trade-offs:** Must maintain span tracking through lexer and parser.

## D08: Coordinate System — Y-Up Internally, Y-Down at Render

**Problem:** Which coordinate system for internal geometry?
**Options:**
1. Y-down (SVG standard) — direct mapping, no transform needed
2. Y-up (Cartesian standard) — intuitive construction, flip at render
3. Center origin — complex positioning
**Decision:** Y-up internally. Transform to Y-down only when rendering to SVG.
**Motivo:** Pattern construction is intuitive with Y-up ("UP" means positive Y). The Y-flip at render is a single well-defined transformation, applied in one place. Avoids confusing every DSL command and every geometry operation with inverted Y.
**Consequences:**
- All geometry operations use standard Cartesian conventions
- All angle calculations use standard math conventions (0=right, 90=up)
- SVG renderer applies Y-flip: `svgY = viewBoxHeight - internalY`
- Documentation can use standard Cartesian diagrams
- No surprises in angle or direction calculations
**Trade-offs:** One transform step at render. Small cost for major clarity gain.

## D09: Named Entity Model — Definitions, Evaluation, Registry

**Problem:** How to store and reference geometry entities?
**Options:** Mutable registry, immutable snapshots, immutable + lazy evaluation, database.
**Decision:** Definitions are immutable. Evaluation produces computed values. Registry is append-only.
**Semantics:**
- Definitions are immutable once registered (never modified in place)
- Registry is append-only (no deletion or modification of existing entries)
- Duplicate names are errors
- Forward references NOT allowed
- Shadowing NOT allowed (re-declaration of existing name is error)
- Evaluation is lazy: entity values are computed on demand via topological sort
- **Change propagation:** Create a new definition + re-evaluate. Do NOT modify an existing entity.
  - Example: If point A changes, create A' (new definition), then re-evaluate all downstream entities B, C, ... that depended on A.
  - The old definitions remain in the registry as history. New evaluation context produces new computed values.
  - Alternative model: Definitions → Evaluation Context → Computed Values (functional pipeline).
- **NOT this:** Modify entity → invalidate downstream → re-evaluate (this violates immutability)
**Motivo:** Pattern geometry is inherently sequential. Named references essential for DSL readability. Immutable definitions prevent subtle mutation bugs. Lazy evaluation avoids computing unused geometry.
**Trade-offs:** More complex than mutable state. Requires topological sort implementation. Change = new version + re-evaluation, not in-place mutation.

## D10: Testing — Unit + Integration + Reference Patterns + Property-Based

**Problem:** How to verify correctness?
**Options:** Unit only, unit+integration, visual regression, property-based, reference patterns.
**Decision:** Unit (Vitest) + integration + reference pattern tests + property-based (fast-check). Visual regression deferred.
**Motivo:** Unit tests verify operations. Integration tests verify pipeline. Reference patterns serve as regression. Property-based for invariants.
**Convention:** Every implementation task MUST include tests as part of the task, not as separate later tasks. Tests are written alongside implementation.
**Trade-offs:** Reference patterns are geometry assertions, not visual comparisons.

## D11: Project Structure — Single Package with src/ Modules

**Problem:** How to organize code?
**Options:** Single package, multi-package monorepo, flat structure.
**Decision:** Single package with modular src/ structure.
```
src/
  geometry/    # Core primitives and operations
  model/       # Named entities, registry, DAG
  dsl/         # Lexer, parser, AST, interpreter
  svg/         # Renderer, styles, export
  pattern/     # Pattern-specific concepts
  cli/         # Terminal interface
  validation/  # Validators
```
**Motivo:** Simple for early development. Clear module boundaries. Can extract to multi-package later.
**Trade-offs:** Must enforce module boundaries (no circular deps). ESLint rule recommended.

## D12: First Target Pattern — Boxer Shorts (Progressive)

**Problem:** What is the first complete pattern?
**Options:** Rectangle, skirt block, boxer shorts, bodice block.
**Decision:** Progressive: Rectangle → Polygon → Curves → Simple piece → Boxer pieces → Complete boxer.
**Motivo:** Each step validates accumulated capabilities. Boxer has straight lines, curves (crotch), multiple pieces, simple seam allowances.
**Trade-offs:** Must plan test patterns at each stage.

## D13: Vertical Slices over Horizontal Layers

**Problem:** Build order strategy.
**Options:**
1. Horizontal: all geometry → all model → all SVG → all DSL
2. Vertical: each feature slice produces verifiable SVG end-to-end
**Decision:** Vertical slices. Each slice builds a complete, verifiable flow.
**Motivo:** Early visual verification catches integration issues. Prevents building large subsystems that don't connect. Enables faster feedback loops. Reduces risk of "big bang" integration.
**Consequence:** Some code may be written twice (e.g., simple SVG before full SVG renderer), but this is acceptable for the risk reduction.
**Trade-offs:** Slightly more code initially. Much less risk of integration failure.

## D14: DSL Incremental Versions

**Problem:** How to evolve the DSL?
**Decision:** Strictly versioned DSL with gates.
**v0.1:** POINT, LINE, CURVE, PATH, EXPORT — creates geometry and SVG
**v0.2:** INPUT, LET, expressions — parametric geometry
**v0.3:** POINT methods (.UP, .DOWN, .LEFT, .RIGHT), intersections
**v1.0:** PATTERN, PIECE, SEAM_ALLOWANCE, NOTCH, GRAINLINE
**Motivo:** Each version must be complete and functional before next begins. Prevents complexity creep.
**Trade-offs:** Delays advanced features, but ensures solid foundation.

## D15: Offset Strategy — Sample-Then-Fit with Validation

**Problem:** How to implement curve offset for seam allowances?
**Options:**
1. Sample N points, compute normals, displace, fit new Bezier
2. Minkowski sum
3. Exact offset (not Bezier in general)
4. Use Clipper2 library
**Decision:** Sample-then-fit with validation. For straight segments, exact offset. For curves, sample N points (adaptive), compute normals, displace, fit new cubic Bezier through displaced points. Validate result for self-intersection.
**Motivo:** Straight segments are exact. Curve offset is inherently approximate. Sampling approach is simple and sufficient for pattern tolerances.
**Known limitation:** For very tight concave curves, offset may produce self-intersections. Document and validate.
**Trade-offs:** Approximation error. Must choose sample count wisely. Validation adds complexity but catches failures.
**Note:** This is a technical decision that requires validation during implementation. Mark as "needs validation" in task metadata.
