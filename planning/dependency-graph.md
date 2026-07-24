# Dependency Graph — SASTRE DSL (V3)

## Vertical Slice Dependency Chains

### VS-01: Foundations
```
FND-001 → FND-002, FND-003, FND-004, FND-005, FND-006, FND-007, FND-008, PLAN-001
```
**Produces:** Project configured, Kanban validator ready.

### VS-02: First SVG (Rectangle) — MINIMAL
```
FND-004 → GEO-001 → GEO-004 → GEO-SVG-001 → GEO-SVG-001T
```
**Produces:** A valid SVG rectangle. First visual verification. NO Vector, NO Line.

### VS-03: Curved SVG (M2A)
```
GEO-001 → GEO-008 → GEO-008C → GEO-011 → GEO-SVG-002 → GEO-SVG-002T
```
**Produces:** An SVG shape with Bezier curves.

### VS-03b: Extended Geometry (M2B) — parallel to VS-03
```
GEO-001 → GEO-002 (Vector)
GEO-001 → GEO-006 (Circle)
GEO-001 + GEO-002 → GEO-003 (Line)
GEO-006 → GEO-007 (Arc)
GEO-011 → GEO-012 (Polygon)
GEO-001 + GEO-002 → GEO-013 (Transform)
GEO-001 + GEO-002 + GEO-004 + GEO-007 + GEO-011 + GEO-012 → GEO-017 (Measure)
```
**Produces:** Richer geometry primitives (no SVG dependency).

### VS-03c: Intersections (M2C) — decomposed
```
GEO-001 → INTER-001 (Result Model)
GEO-003 + INTER-001 → INTER-002 (Line-Line)
GEO-004 + INTER-002 → INTER-003 (Segment-Segment)
GEO-003 + GEO-004 + INTER-002 → INTER-004 (Line-Segment)
GEO-003 + GEO-006 → INTER-005 (Line-Circle)
GEO-006 → INTER-006 (Circle-Circle)
GEO-003 + GEO-008C → INTER-007 (Line-Bezier)
GEO-008C → INTER-008 (Bezier-Bezier)
GEO-004 + GEO-008C + GEO-011 → GEO-015 (Projections/Tangents)
```
**Produces:** All intersection types with tests.

### VS-04: DSL v0.1 (M3) — MINIMAL
```
FND-004 → DSL-001 → DSL-002 → DSL-003 → DSL-004 → DSL-006 → DSL-SVG-001 → DSL-SVG-001T
                    DSL-007 ──↗           MDL-001 → MDL-002 → MDL-005 →↗
```
**No INPUT, No LET, No Pratt, No Units.** Numbers are raw mm.

### VS-05: DSL v0.2 (M4) — Parametric
```
DSL-001 → DSL-008 (Units) ──────────────────────┐
DSL-002 + DSL-003 → DSL-005 (Pratt) ────────────┤
DSL-004 + DSL-006 + DSL-008 → DSL-009 (INPUT) ──┤
DSL-009 + DSL-005 → DSL-010 (LET) ──────────────┤
DSL-004 + DSL-006 → DSL-011 (Point methods) ────┘
                                                 ↓
                                      DSL-SVG-002 → DSL-SVG-002T
```
**Produces:** Changing INPUT changes SVG. Parametric verification.

### VS-06: Pattern Piece (M5) — PARALLEL to DSL
```
GEO-004 + GEO-011 → PAT-001 → PAT-SVG-001 → PAT-SVG-001T
```
**Note:** PAT-001 depends ONLY on geometry (Segment + Path), NOT on DSL. Can run in parallel with VS-04/VS-05.
PAT-SVG-001 depends on GEO-SVG-001 (direct renderer), NOT on ModelRenderer.

### VS-07: Pattern Operations (M6)
```
GEO-001 + GEO-004 → OFFSET-001 (straight) → OFFSET-002 (polyline)
GEO-008C → OFFSET-003 (bezier)
OFFSET-001 + OFFSET-002 → OFFSET-004 (joins)
OFFSET-003 + INTER-003 → OFFSET-005 (self-int)
OFFSET-002 + OFFSET-003 + OFFSET-004 + OFFSET-005 → OFFSET-006 (integration)
OFFSET-006 + PAT-001 → PAT-002 (SeamAllowance)
GEO-001 + GEO-004 → PAT-003 (Notch, Grainline)
GEO-001 + GEO-004 + GEO-013 → PAT-005 (Dart)
PAT-002 + PAT-003 + PAT-SVG-001 → PAT-SVG-002 → PAT-SVG-002T
```

### VS-08: CLI + Validation (M7)
```
DSL-006 + SVG-EXP-001 → CLI-001 → CLI-002, CLI-003, CLI-004
MDL-005 → VAL-001 → CLI-003
GEO-001 + GEO-004 + GEO-011 → VAL-002 → CLI-003
GEO-011 → VAL-003 → CLI-003
CLI-004 → CLI-INS-001
```

### VS-09: Boxer Patterns (M8)
```
DSL-SVG-001 + DSL-006 + MDL-005 → PAT-010 → PAT-011 → PAT-012 → PAT-013 → PAT-014 → PAT-015 → PAT-016
```

### VS-10: Integration Tests + Documentation (M9)
```
GEO-SVG-002 → TST-001
DSL-006 → TST-002
TST-001 + TST-002 → TST-003
GEO-011 + GEO-013 + OFFSET-006 → TST-004
FND-006 → DOC-001
DSL-004 → DOC-002
GEO-017 → DOC-003
DOC-001 + DOC-002 + DOC-003 → DOC-004
```

## Key Changes from V2

1. **M1 minimal:** Point → Segment → SVG only. No Vector, no Line.
2. **M2 split:** M2A (Curved), M2B (Extended Geometry), M2C (Intersections)
3. **Offset decomposed:** 6 subtasks (was 1 monolithic GEO-014)
4. **Intersections decomposed:** 8 subtasks (was 3 underdeveloped)
5. **DSL v0.1 clean:** No INPUT, LET, Pratt, or Units in PHASE-03
6. **PAT-001 parallel:** Pattern Piece does NOT depend on DSL
7. **PLAN-001 exists:** Kanban Validator is a real task
8. **Dependencies only:** No redundant `blocks` field on tasks

## Milestone ↔ Phase ↔ Vertical Slice Mapping

| Milestone | Phase(s) | Vertical Slice | Description |
|-----------|----------|----------------|-------------|
| M0 | PHASE-00 | VS-01 | Foundations + Kanban Validator |
| M1 | PHASE-01 | VS-02 | First SVG — Rectangle |
| M2A | PHASE-02A | VS-03 | Curved SVG |
| M2B | PHASE-02B | VS-03b | Extended Geometry |
| M2C | PHASE-02C | VS-03c | Intersections |
| M3 | PHASE-03 | VS-04 | DSL v0.1 Minimal |
| M4 | PHASE-04 | VS-05 | DSL v0.2 Parametric |
| M5 | PHASE-05 | VS-06 | Pattern Piece |
| M6 | PHASE-06 | VS-07 | Pattern Operations |
| M7 | PHASE-07 | VS-08 | CLI + Validation |
| M8 | PHASE-08 | VS-09 | Boxer Patterns |
| M9 | PHASE-09 | VS-10 | Integration Tests + Docs |

## Module-Level Dependencies
```
geometry (no internal deps)
    ↓
model (depends on geometry)
    ↓
dsl (depends on model, geometry)
svg (depends on geometry — NOT model for basic rendering)
    ↓
pattern (depends on geometry, svg)
    ↓
validation (depends on model, geometry)
    ↓
cli (depends on everything)
```

## Parallelization After Key Milestones

### After M1 (First SVG):
- Agent A: Bezier curves (M2A)
- Agent B: Extended geometry (M2B) — parallel
- Agent C: Pattern Piece model (M5) — parallel

### After M2A (Curved SVG):
- Agent A: DSL v0.1 (M3)
- Agent B: Intersections (M2C)

### After M3 (First DSL):
- Agent A: DSL v0.2 (M4)
- Agent B: Pattern Operations (M6)

### After M4+M5+M6:
- Agent A: CLI + Validation (M7)
- Agent B: Boxer patterns (M8)

## Critical Path (V3)

```
FND-001 → GEO-001 → GEO-004 → GEO-SVG-001 [M0: Foundations + Validator]
    ↓
    GEO-004 → GEO-SVG-001 [M1: First SVG]
    ↓
GEO-008C → GEO-011 → GEO-SVG-002 [M2A: Curved SVG]
    ↓
DSL-001 → DSL-004 → DSL-006 → DSL-SVG-001 [M3: DSL v0.1 Minimal]
    ↓
DSL-009 → DSL-010 → DSL-SVG-002 [M4: DSL v0.2 Parametric]
    ↓ (parallel)
PAT-001 → PAT-SVG-001 [M5: Pattern Piece]
    ↓
OFFSET-001..006 → PAT-002 → PAT-SVG-002 [M6: Pattern Operations]
    ↓
CLI-001 → CLI-002 [M7: CLI + Validation]
    ↓
PAT-010 → ... → PAT-016 [M8: Boxer Pattern]
    ↓
TST-001, TST-002, TST-003, TST-004, DOC-001..004 [M9: Integration Tests + Docs]
```
