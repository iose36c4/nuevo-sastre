# Dependency Graph — SASTRE DSL

## Module-Level Dependencies

```
                    ┌─────────────┐
                    │   CLI       │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼─────┐ ┌───▼────┐ ┌────▼─────┐
        │ Validation │ │Pattern │ │   DSL    │
        └─────┬──────┘ └───┬────┘ └────┬─────┘
              │            │            │
              │      ┌─────┼────────────┘
              │      │     │
              │  ┌───▼──┐ ┌▼─────────┐
              │  │  SVG │ │  Model   │
              │  └──┬───┘ └──┬───────┘
              │     │        │
              └─────┼────────┘
                    │
              ┌─────▼──────┐
              │  Geometry  │
              └────────────┘
```

## Task-Level Dependencies (Key Chains)

### Chain 1: Core Geometry
```
Point → Vector → Line → Segment → Intersection(Line,Line) → Circle → Arc
    ↓
Bezier → Path → Polygon
    ↓
Transform → Offset
    ↓
Measure (distance, angle, area, arc length)
```

### Chain 2: Geometry Model
```
Point → Entity → PointEntity → Registry
    ↓
CurveEntity → PathEntity → DAG
```

### Chain 3: SVG Renderer
```
Geometry Model → Layout → Elements → Renderer → Export
```

### Chain 4: DSL
```
Token → Lexer → Parser (recursive descent)
    ↓
AST Types → Pratt (expression parser) → Parser
    ↓
Interpreter → (writes to Geometry Model)
```

### Chain 5: Validation
```
ReferenceValidator ← Geometry Model
GeometryValidator ← Geometry
PathValidator ← Path, Polygon
```

### Chain 6: CLI
```
Commands → CLI entry → (build, inspect, validate, export)
```

## Parallelization Opportunities

### After Core Geometry (Point, Vector, Line, Segment)
These can be developed in parallel:
- Bezier curves
- Circle and Arc
- Transformations
- SVG renderer (using Point, Line, Segment)

### After Geometry Model
These can be developed in parallel:
- SVG renderer (full)
- DSL lexer and parser
- Validation framework

### After DSL Parser
These can be developed in parallel:
- DSL interpreter
- CLI commands
- Reference pattern tests

## Blocking Dependencies

| Blocked Task | Blocked By | Notes |
|---|---|---|
| SVG Renderer | All geometry types | Needs Point, Line, Segment, Bezier at minimum |
| DSL Parser | Token types, AST types | Needs lexer first |
| DSL Interpreter | Parser, Geometry Model | Needs both AST and entity creation |
| CLI | Interpreter, Renderer | Needs full pipeline |
| Validation | Geometry Model | Needs entity registry and DAG |
| Pattern Concepts | Geometry Model, SVG | Needs both model and rendering |
| Seam Allowance | Offset algorithm, Path | Needs curve offset capability |
| Reference Patterns | Full pipeline | Needs DSL → Geometry → SVG working |

## Critical Path

The critical path (longest dependency chain) is:

```
Point → Vector → Line → Segment → Bezier → Path
  → Geometry Model → DSL Parser → Interpreter
  → SVG Renderer → CLI → Reference Patterns
```

Any delay on this chain delays the entire project. All other work (transforms, circle, arc, validation, pattern concepts) can be parallelized around this core.

## Phase Dependency Summary

```
Phase 0 (Foundation) ──→ All subsequent phases
    ↓
Phase 1 (Geometry) ──→ Phase 2, Phase 3
    ↓
Phase 2 (Model) ──→ Phase 4, Phase 6, Phase 8
    ↓
Phase 3 (SVG) ──→ Phase 6, Phase 11
    ↓
Phase 4 (DSL) ──→ Phase 5, Phase 9
    ↓
Phase 5 (Parametric DSL) ──→ Phase 6
    ↓
Phase 6 (Pattern Model) ──→ Phase 7, Phase 11
    ↓
Phase 7 (Pattern Operations) ──→ Phase 11
    ↓
Phase 8 (Validation) ──→ Phase 9, Phase 11
    ↓
Phase 9 (CLI) ──→ Phase 10
    ↓
Phase 10 (Inspection) ──→ Phase 11
    ↓
Phase 11 (Reference Patterns) ──→ Phase 12
    ↓
Phase 12 (Testing) ──→ Phase 13
    ↓
Phase 13 (Documentation) ──→ Done
```
