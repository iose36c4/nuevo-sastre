# Dependency Graph — SASTRE DSL (V2)

## Vertical Slice Dependency Chains

### VS-01: First SVG (Rectangle)
```
FND-001 → FND-004 → GEO-001 → GEO-004 → GEO-SVG-001 → GEO-SVG-001T
                          ↓
                      GEO-002 → GEO-003
```
**Produces:** A valid SVG rectangle. First visual verification.

### VS-02: Curved SVG
```
GEO-008C → GEO-SVG-002 → GEO-SVG-002T
```
**Produces:** An SVG shape with Bezier curves. Second visual verification.

### VS-03: First DSL
```
DSL-001 → DSL-002 → DSL-003 → DSL-004 → DSL-006 → DSL-SVG-001 → DSL-SVG-001T
```
**Produces:** A DSL file that generates SVG. End-to-end verification.

### VS-04: Parametric DSL
```
DSL-008 → DSL-009 → DSL-010 → DSL-SVG-002 → DSL-SVG-002T
```
**Produces:** Changing INPUT changes the SVG. Parametric verification.

### VS-05: Pattern Piece
```
PAT-001 → PAT-SVG-001 → PAT-SVG-001T
```
**Produces:** A recognizable pattern piece in SVG.

### VS-06: Pattern Operations
```
GEO-014A → GEO-014B → GEO-014C → PAT-002 → PAT-003 → PAT-SVG-002 → PAT-SVG-002T
```
**Produces:** Pattern piece with seam allowance, notches, grainline in SVG.

### VS-07: Boxer Progressive
```
PAT-010 → PAT-011 → PAT-012 → PAT-013 → PAT-014 → PAT-015 → PAT-016
```
**Produces:** Complete boxer pattern.

## Module-Level Dependencies (preserved from V1)
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

## Key Change from V1: SVG Does NOT Depend on Model

In V1, SVG-001 depended on MDL-005 (Registry), forcing the entire model layer before any SVG output.

In V2, the SVG renderer has TWO entry points:
1. **Direct geometry rendering** (VS-01, VS-02): renders Point[], Segment[], Path directly
2. **Model-based rendering** (VS-03+): renders from named entity Registry

This allows SVG output as soon as geometry primitives exist.

## Parallelization After Key Milestones

### After M1 (First SVG):
- Agent A: Bezier curves (VS-02)
- Agent B: Additional geometry (Circle, Arc, Polygon, Transform)
- Agent C: Model layer (MDL-001 through MDL-005)

### After M2 (Curved SVG):
- Agent A: DSL v0.1 (VS-03)
- Agent B: Validation framework
- Agent C: Additional geometry (intersections, measure)

### After M3 (First DSL):
- Agent A: DSL v0.2 (VS-04)
- Agent B: CLI base
- Agent C: Pattern model (VS-05)

### After M4 (Parametric DSL):
- Agent A: DSL v0.3 (methods, intersections)
- Agent B: Pattern operations (VS-06)
- Agent C: Boxer patterns (VS-07)

## Critical Path (V2)

```
FND-001 → GEO-001 → GEO-004 → GEO-SVG-001 [M1: First SVG]
    ↓
GEO-008C → GEO-SVG-002 [M2: Curved SVG]
    ↓
DSL-001 → DSL-004 → DSL-006 → DSL-SVG-001 [M3: First DSL]
    ↓
DSL-008 → DSL-009 → DSL-010 → DSL-SVG-002 [M4: Parametric DSL]
    ↓
PAT-001 → PAT-SVG-001 [M5: First Pattern]
    ↓
GEO-014 → PAT-002 → PAT-SVG-002 [M6: Pattern Operations]
    ↓
PAT-010 → ... → PAT-016 [M7: Complete Boxer]
```
