# Architectural Decisions — SASTRE DSL

## D01: Programming Language — TypeScript

**Problem:** Choose host language for implementation.
**Options considered:**
- TypeScript: strong typing, modern tooling, good for DSLs, accessible
- Rust: zero-cost abstractions, steeper learning curve, compile times
- Python: fast prototyping, weak typing, slower runtime
- Haskell: excellent for parsers, less accessible for contributors
**Decision:** TypeScript (strict mode)
**Motivo:** Type safety with discriminated unions for AST nodes, excellent test tooling (Vitest), fast iteration, wide ecosystem. Pattern geometry is not performance-critical enough to require Rust.
**Consecuencias:** Runtime overhead negligible for this domain. Must enforce strict null checks and no implicit any.

## D02: Parser Architecture — Hand-Written Recursive Descent + Pratt

**Problem:** Choose parsing approach for DSL.
**Options considered:**
- Hand-written recursive descent: full control, no dependencies, good error messages
- Chevrotain: library-based, error recovery built-in, moderate learning curve
- PEG (Peggy): declarative grammar, limited error recovery
- Tree-sitter: overkill, designed for editor integration
**Decision:** Hand-written recursive descent with Pratt parsing for expressions.
**Motivo:** A pattern DSL has ~30-40 grammar rules — small enough to hand-write. Full control over error messages is critical for a tool used by designers. No build step or codegen required. Pratt parsing is the industry standard for expression sub-parsers.
**Consecuencias:** Must implement error recovery manually (panic mode to semicolons/braces). More initial code but more maintainable long-term.

## D03: Geometry Library — Custom Implementation

**Problem:** Use existing geometry library or build custom?
**Options considered:**
- Custom implementation: full control, no dependencies, exactly what we need
- JSTS (JavaScript Topology Suite): heavy, 2D拓扑 focused, overkill
- Clipper/Clipper2: polygon boolean operations, not general geometry
- Turf.js: GIS-oriented, not pattern-oriented
**Decision:** Custom geometry library.
**Motivo:** Pattern geometry uses a small set of primitives (Point, Vector, Line, Segment, Bezier, Arc). The operations needed are specific to pattern-making (offset for seam allowances, curve splitting for notches). Existing libraries either lack precision control or bring unnecessary dependencies. Full control over floating-point tolerance is essential.
**Consecuencias:** More code to write and maintain, but each module is small, testable, and purpose-built. No dependency risk.

## D04: SVG Generation — Template-Based String Building

**Problem:** How to generate SVG output?
**Options considered:**
- Template literals: zero dependencies, full control, readable output
- svg.js: DOM-like API, adds dependency, overkill for static output
- svgo: post-processing optimizer, useful as pipeline stage (not generator)
- DOMParser (Node.js): heavy, creates full DOM tree for what's essentially string output
**Decision:** Template-literal based string building with SVGO for optional post-processing.
**Motivo:** SVG for patterns is static and predictable — template strings produce clean, human-readable output. SVGO can optionally optimize for file size. Zero runtime dependencies for generation.
**Consecuencias:** Must manually handle XML escaping. SVG structure must be carefully designed for readability (indentation, comments, data attributes).

## D05: Unit System — Explicit Units in DSL, Internal Millimeters

**Problem:** How to handle physical units?
**Options considered:**
- Explicit units in DSL (92cm, 15mm, 3in): prevents catastrophic errors
- Default unit with suffixes: simpler but error-prone
- Internal SI (meters): unnecessary precision
- Unitless (assume mm): simple but risky for mixed-unit users
**Decision:** Explicit units in DSL syntax. Internal representation in millimeters (f64).
**Motivo:** Mixing cm and inches is the most catastrophic pattern error. Explicit units force the user to be intentional. Internal mm representation avoids floating-point issues with fractional centimeters.
**Consecuencias:** Lexer must tokenize unit suffixes. Parser must convert to internal mm. Error messages should report in user's original units when possible.

## D06: Floating-Point Precision — Epsilon Comparisons with Configurable Tolerance

**Problem:** Handle floating-point comparison in geometry operations.
**Options considered:**
- Epsilon comparisons (absolute tolerance): simple, sufficient for 2D geometry
- Relative tolerance: complex, unnecessary for mm-scale geometry
- Exact rational arithmetic: slow, overkill
- Interval arithmetic: complex, not needed
**Decision:** Epsilon comparisons with configurable tolerance (default: 0.001mm).
**Motivo:** Pattern geometry operates at mm scale with ~0.1mm practical precision. Absolute epsilon of 0.001mm provides 100x safety margin. Simple to implement and reason about.
**Consecuencias:** All intersection and comparison functions accept optional tolerance parameter. Must document that geometry closer than tolerance is considered coincident.

## D07: AST Design — Discriminated Unions with Source Spans

**Problem:** How to represent parsed DSL code?
**Options considered:**
- Discriminated unions: TypeScript-native, exhaustive checking, clean pattern matching
- Class hierarchy: OOP approach, more boilerplate, less TypeScript-idiomatic
- Interface-only: no runtime type information, harder to match
**Decision:** Discriminated unions with `kind` tag and `span: { start, end, line, column }`.
**Motivo:** TypeScript discriminated unions enable exhaustive switch/case checking. Source spans are essential for error reporting. Every AST node carries its source location.
**Consecuencias:** Must maintain span tracking through lexer and parser. AST node types file will be the single source of truth for DSL structure.

## D08: Geometry Model — Named Entity Registry with DAG Dependencies

**Problem:** How to store and reference geometry entities?
**Options considered:**
- Named registry: entities stored by name, dependency graph enforced
- Mutable state: simpler but harder to debug, no dependency tracking
- Immutable persistent: efficient for undo, complex implementation
- Database-style: overkill for in-memory model
**Decision:** Named entity registry with immutable-style creation (each entity created once, never modified). DAG dependency graph enforced at creation time.
**Motivo:** Pattern geometry is inherently sequential — point N can only reference points 0..N-1. Named references are essential for DSL readability. Immutable creation prevents subtle bugs from entity mutation.
**Consecuencias:** Entity creation must validate dependencies exist. Must support topological sort for evaluation order. Registry is the bridge between DSL execution and SVG rendering.

## D09: SVG Coordinate System — Origin Top-Left, Y-Down, viewBox in mm

**Problem:** SVG coordinate system for pattern output.
**Options considered:**
- Origin top-left, Y-down (SVG standard): simplest, matches SVG convention
- Origin bottom-left, Y-up (math standard): requires Y-flip, confusing with SVG
- Center origin: complex positioning
**Decision:** SVG standard — origin top-left, Y-down. viewBox in mm. 1 user unit = 1mm.
**Motivo:** Direct mapping to SVG coordinate system avoids transform confusion. viewBox="0 0 {w} {h}" with mm units means 1 SVG unit = 1mm. No coordinate transforms needed between internal model and SVG output.
**Consecuencias:** Pattern construction must account for Y-down convention (e.g., "down" in pattern = positive Y). Documentation must clearly explain this to users.

## D10: Testing Strategy — Unit + Integration + Reference Patterns

**Problem:** How to verify correctness?
**Options considered:**
- Unit tests only: insufficient for geometry correctness
- Unit + integration: good coverage of individual components and their interaction
- Visual regression (SVG comparison): useful but fragile, environment-dependent
- Property-based testing: powerful for geometry invariants
- Reference patterns: pattern files that must produce specific geometry
**Decision:** Unit tests (Vitest) + integration tests + reference pattern tests. Visual regression as optional enhancement.
**Motivo:** Unit tests verify individual geometry operations. Integration tests verify DSL→SVG pipeline. Reference patterns serve as end-to-end regression tests. Property-based testing (fast-check) for geometry invariants (e.g., offset preserves distance).
**Consecuencias:** Must define reference patterns as geometry assertions, not visual comparisons. Each phase must include tests before moving to next phase.

## D11: Project Structure — Monorepo with src/ Modules

**Problem:** How to organize source code?
**Options considered:**
- Monorepo with src/ modules: simple, good for small-medium projects
- Multi-package monorepo (pnpm workspaces): overkill for initial development
- Flat structure: doesn't scale
**Decision:** Single package with modular src/ structure.
```
src/
  geometry/       # Core primitives and operations
  model/          # Named entities, registry, DAG
  dsl/            # Lexer, parser, AST, interpreter
  svg/            # Renderer, styles, export
  pattern/        # Pattern-specific concepts
  cli/            # Terminal interface
  validation/     # Validators
```
**Motivo:** Simple enough for early development. Clear module boundaries. Can extract to multi-package later if needed.
**Consecuencias:** Must enforce module boundaries via imports (no circular dependencies). Each module has its own test directory.

## D12: First Target Pattern — Boxer Shorts

**Problem:** What is the first complete pattern to implement?
**Options considered:**
- Rectangle (trivial, validates basics)
- Skirt block (simple but curved seams)
- Boxer shorts (4 pieces, simple geometry, good variety)
- Bodice block (complex, many measurements)
**Decision:** Progressive: Rectangle → Polygon → Curves → Simple piece → Boxer pieces → Complete boxer.
**Motivo:** Each step validates accumulated capabilities. Boxer shorts have straight lines, curves (crotch), multiple pieces, and simple seam allowances — ideal first real pattern.
**Consecuencias:** Must plan test patterns at each stage. Boxer pattern requires: front piece, back piece, waistband, fly pieces.
