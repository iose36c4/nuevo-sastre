# Risks — SASTRE DSL (V2)

## R01: Floating-Point Precision Issues
**Severity:** High | **Probability:** High
**Description:** Geometry operations produce different results due to floating-point arithmetic. Gaps in paths, incorrect intersections, self-intersecting offsets.
**Mitigation:** Epsilon comparisons (0.001mm default). Configurable tolerance per operation. Test with known edge cases. Separate tolerances for intersection (0.01mm) and comparison (0.001mm).
**Status:** Identified

## R02: Bezier Offset Non-Exactness
**Severity:** High | **Probability:** High
**Description:** Mathematical offset of a Bezier curve is NOT a Bezier curve. Approximation introduces error. Tight concave curves can produce self-intersections.
**Mitigation:** Sample-then-fit approach with adaptive sampling. Validate offset results for self-intersection. Document as known limitation for extreme curvatures. Start with straight-only offset, add curve offset later.
**Status:** Identified

## R03: DSL Complexity Creep
**Severity:** Medium | **Probability:** Medium
**Description:** DSL grows beyond minimal scope, making parser/interpreter unmaintainable.
**Mitigation:** Strict version gates: v0.1 only POINT/LINE/CURVE/PATH/EXPORT. No variables initially. Each feature must have clear use case. Document DSL scope in decisions.
**Status:** Identified

## R04: Pattern Geometry Correctness
**Severity:** High | **Probability:** Medium
**Description:** Clothing patterns have strict geometric requirements. Incorrect geometry produces unwearable patterns.
**Mitigation:** Progressive validation. Reference pattern tests. Human review of SVG output. Start with simple patterns, validate each before advancing.
**Status:** Identified

## R05: SVG Compatibility Issues
**Severity:** Medium | **Probability:** Low
**Description:** SVG renders differently across viewers.
**Mitigation:** Use SVG 1.1 basic features only. Test in Chrome, Firefox, Inkscape. Avoid unsupported CSS. Inline styles as fallback.
**Status:** Identified

## R06: Scope Creep to AI Integration
**Severity:** High | **Probability:** High
**Description:** Temptation to add NLP/AI before core is solid. This was the failure mode of the previous SASTRE project.
**Mitigation:** Strict build order. No AI/NLP code until geometry + SVG + DSL + CLI + boxer pattern all complete. Document in README.
**Status:** Identified

## R07: Seam Allowance Complexity
**Severity:** Medium | **Probability:** High
**Description:** Offset seems simple but involves complex corner treatments, variable widths, self-intersection handling.
**Mitigation:** Start with constant-width, straight edges only. Add variable width later. Simple corners initially. Document deferred edge cases.
**Status:** Identified

## R08: Test Pattern Accuracy
**Severity:** Medium | **Probability:** Medium
**Description:** Boxer pattern dimensions may not match real-world measurements.
**Mitigation:** Reference measurements from pattern drafting resources. Cross-check with Seamly2D. Allow manual verification.
**Status:** Identified

## R09: Coordinate System Confusion
**Severity:** Medium | **Probability:** Medium (NEW)
**Description:** Using Y-down internally (SVG convention) causes confusion in pattern construction. "UP" means negative Y. Angles are inverted.
**Mitigation:** Use Y-up internally, flip to Y-down only at SVG render. All geometry and DSL use standard Cartesian conventions. Single well-defined transform in renderer.
**Status:** Identified, mitigated by D08

## R10: Module Boundary Violations
**Severity:** Medium | **Probability:** Medium
**Description:** Circular dependencies between modules.
**Mitigation:** Strict dependency direction: geometry → model → dsl/svg → pattern → cli. No upward imports. ESLint rule.
**Status:** Identified

## R11: Agent Implementation Errors (NEW)
**Severity:** High | **Probability:** Medium
**Description:** Future agents implementing tasks may introduce subtle bugs, miss acceptance criteria, or deviate from architecture.
**Mitigation:** Every task has concrete, verifiable acceptance criteria. Tests included in every task. Clear file paths and deliverables. Architecture constraints documented.
**Status:** Identified

## R12: Offset Strategy Validation (NEW)
**Severity:** Medium | **Probability:** Medium
**Description:** The sample-then-fit offset strategy may not produce adequate results for complex pattern curves (armholes, crotch curves).
**Mitigation:** Mark offset tasks as "needs validation". Implement with configurable sample count. Test on reference patterns. Document accuracy limitations. Fallback to subdivision approach if needed.
**Status:** Identified
