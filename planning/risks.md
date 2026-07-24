# Risks — SASTRE DSL

## R01: Floating-Point Precision Issues
**Severity:** High
**Probability:** High
**Description:** Geometry operations (intersections, offsets) produce slightly different results due to floating-point arithmetic. Can cause: gaps in paths, incorrect intersections, self-intersecting offsets.
**Mitigation:** Epsilon comparisons (0.001mm tolerance). All geometry operations accept optional tolerance parameter. Test with known edge cases (parallel lines, tangent curves, coincident points).
**Status:** Identified

## R02: Bezier Offset Non-Exactness
**Severity:** High
**Probability:** High
**Description:** The mathematical offset of a Bezier curve is NOT a Bezier curve. Approximation introduces error. For tight concave curves (crotch curves, armholes), offset can produce self-intersections.
**Mitigation:** Use high sample count (50 points) for curve offset. Validate offset results for self-intersection. Implement fallback: subdivide original curve before offsetting. Document as known limitation for extreme curvatures.
**Status:** Identified

## R03: DSL Complexity Creep
**Severity:** Medium
**Probability:** Medium
**Description:** The DSL may grow beyond its minimal scope, making parser/interpreter harder to maintain. Features like constraint solving, functions, and modules can add significant complexity.
**Mitigation:** Strict phase gates: v0.1 DSL only supports POINT, LINE, CURVE, PATH, CUT, EXPORT. No variables initially (constants only). Add features incrementally. Each feature must have clear use case before implementation.
**Status:** Identified

## R04: Pattern Geometry Correctness
**Severity:** High
**Probability:** Medium
**Description:** Clothing patterns have strict geometric requirements (matching seam lengths, closed contours, correct dart angles). Incorrect geometry produces unwearable patterns.
**Mitigation:** Progressive validation: start with simple geometric checks, add pattern-specific validators. Reference pattern tests (boxer pieces must have specific properties). Human review of SVG output in Inkscape/Illustrator.
**Status:** Identified

## R05: SVG Compatibility Issues
**Severity:** Medium
**Probability:** Low
**Description:** SVG output may render differently across viewers (browsers, Inkscape, Illustrator). viewBox interpretation, font rendering, and CSS support vary.
**Mitigation:** Use only SVG 1.1 basic features. Test output in: Chrome, Firefox, Inkscape, Illustrator. Avoid CSS features not universally supported. Use inline styles as fallback.
**Status:** Identified

## R06: Scope Creep to AI Integration
**Severity:** High
**Probability:** High
**Description:** Temptation to add natural language processing or AI features before core geometry and DSL are solid. This was the failure mode of the previous SASTRE project.
**Mitigation:** Strict build order enforcement. No AI/NLP code until: geometry + SVG + DSL + CLI + boxer pattern all complete and tested. Document this constraint in project README and AGENTS.md.
**Status:** Identified

## R07: Seam Allowance Complexity
**Severity:** Medium
**Probability:** High
**Description:** Seam allowances seem simple (parallel offset) but involve complex corner treatments, variable widths, and self-intersection handling. Can consume disproportionate development time.
**Mitigation:** Start with constant-width seam allowance on straight edges only. Add variable width later. Use simple corner joins initially. Document which edge cases are deferred.
**Status:** Identified

## R08: Test Pattern Accuracy
**Severity:** Medium
**Probability:** Medium
**Description:** Boxer shorts pattern dimensions may not match real-world measurements, leading to incorrect pattern validation.
**Mitigation:** Reference measurements from established pattern drafting resources. Cross-check with Seamly2D examples. Allow manual verification step (export → print at scale → measure).
**Status:** Identified

## R09: TypeScript Build Complexity
**Severity:** Low
**Probability:** Low
**Description:** TypeScript configuration, module resolution, and build pipeline may add unnecessary complexity for what is essentially a computational tool.
**Mitigation:** Use minimal tsconfig (strict mode, ESM, no decorators). Single build step (tsc). No bundler needed for initial development. Add bundler only when CLI distribution is needed.
**Status:** Identified

## R10: Module Boundary Violations
**Severity:** Medium
**Probability:** Medium
**Description:** Circular dependencies between modules (e.g., geometry depending on model, model depending on geometry) can cause import issues and architectural degradation.
**Mitigation:** Strict dependency direction enforced: geometry → model → dsl/svg → pattern → cli. No upward imports. ESLint rule for circular dependencies. Architecture tests (import graph validation).
**Status:** Identified
