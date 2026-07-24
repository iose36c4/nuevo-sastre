# Planning Validation — SASTRE DSL

This document describes the validation checks applied to the kanban.json file.

## Validation Schema

The Kanban Validator (`scripts/validate-kanban.ts`) runs these checks:

| Check | Description |
|-------|-------------|
| unique_ids | No two tasks share the same `id` |
| all_dependency_ids_exist | Every ID in `dependencies` array exists as a task `id` |
| no_dependency_cycles | Topological sort succeeds (no circular dependency chains) |
| all_parent_ids_exist_or_null | Every `parent_id` is null or references an existing task |
| all_child_ids_exist | Every ID in `children` array exists as a task `id` |
| parent_child_references_are_symmetric | `parent_id` ↔ `children` represent exactly the same relationship |
| no_orphan_tasks | Every task is referenced by at least one milestone or parent |
| all_milestone_task_ids_exist | Every task ID in milestones exists as a task |
| all_critical_tasks_have_acceptance_criteria | Tasks with priority=critical have >=1 acceptance criteria |
| all_features_have_tests | Tasks with type=feature have non-empty `tests` array |
| all_tasks_have_phase_reference | Every task references a valid phase |
| all_tasks_have_priority | Every task has a priority field |
| all_tasks_have_type | Every task has a type field |
| all_tasks_have_status | Every task has a status field |
| all_vertical_slice_refs_valid | Every vertical_slice reference is valid |
| no_task_has_more_than_15_acceptance_criteria | Max 15 acceptance criteria per task |
| all_block_ids_exist | Every ID in phase `blocks` array exists as a phase `id` |
| all_blocked_tasks_have_blocking_dependencies | Phase-level blocks reference valid phases |
| dsl_v01_no_input_let | DSL-001 keywords do NOT include INPUT or LET |
| m1_no_vector_line | M1 milestone does NOT contain Vector or Line tasks |
| m2a_no_circle_arc_polygon | M2A milestone does NOT contain Circle, Arc, Polygon, Transform, Measure |
| offset_decomposed | GEO-014 does NOT exist; OFFSET-001 through OFFSET-006 exist |
| intersections_decomposed | GEO-009/010/016 do NOT exist; INTER-001 through INTER-008 exist |
| plan001_exists | PLAN-001 (Kanban Validator) task exists |

## Nomenclature (Canonical)

| Symbol | Meaning |
|--------|---------|
| **PHASE** | Work container (PHASE-00 … PHASE-09) |
| **VS** | Vertical Slice — functional chain producing verifiable output (VS-01 … VS-10) |
| **M** | Milestone — verifiable delivery point (M0 … M9) |
| **TASK** | Executable unit (FND-XXX, GEO-XXX, DSL-XXX, etc.) |

## Running Validation

```bash
npm run validate:kanban
# or
npx tsx scripts/validate-kanban.ts
```

Exits with code 0 if all checks pass, 1 if any fail.

## Current Validation Status

**NOT_VALIDATED** — The validator script (`scripts/validate-kanban.ts`) does not exist yet. It is planned as task **PLAN-001** in **PHASE-00 (M0)**. The `npm run validate:kanban` command is declared in **FND-005** acceptance criteria but requires `package.json` from **FND-001** to be runnable.

> **Rule:** Status is `NOT_VALIDATED` until the validator is implemented and actually executed. Do not mark `PASS` based on plan coherence alone.

## V3 Changes from V2

### Critical Fixes Applied

1. **M1 minimal:** GEO-002 (Vector) and GEO-003 (Line) removed from M1. M1 = Point + Segment + SVG only.
2. **M2 split into M2A/M2B/M2C:**
   - M2A: Bezier → Path → SVG (curved rendering)
   - M2B: Extended Geometry (Vector, Line, Circle, Arc, Polygon, Transform, Measure)
   - M2C: Intersections (decomposed into 8 subtasks with tests)
3. **DSL v0.1 clean:** INPUT and LET keywords removed from DSL-001. DSL-005 (Pratt) and DSL-008 (Units) moved to PHASE-04 (v0.2). DSL-006 (Interpreter) no longer depends on DSL-008.
4. **PLAN-001 created:** Real Kanban Validator task with acceptance criteria and tests.
5. **All features have tests:** Every task with type=feature has non-empty `tests` array and corresponding test child tasks.
6. **Offset decomposed:** GEO-014 replaced with OFFSET-001 through OFFSET-006.
7. **Intersections decomposed:** GEO-009/010/016 replaced with INTER-001 through INTER-008.
8. **D09 fixed:** Immutable definitions model. Change = new definition + re-evaluation (NOT modify entity).
9. **PAT-001 parallel:** Pattern Piece depends only on geometry+SVG, not DSL. Can run in parallel.
10. **Dependencies unified:** `blocks` field removed from all tasks. Dependencies is the single source of truth. `blocks` kept only at phase level.
11. **Validation status:** All checks set to NOT_VALIDATED (requires running actual script).
12. **Parent-child symmetry:** `parent_id` and `children` now symmetric (9 inconsistencies fixed).

### What Was Preserved

1. All architectural decisions D01-D16 (corrected D09)
2. TypeScript/Vitest/ESLint stack
3. Custom geometry library approach
4. Template-based SVG generation
5. Recursive descent + Pratt parser (Pratt in v0.2)
6. Boxer shorts as target pattern
7. Progressive pattern development
8. Error strategy (source spans, panic mode recovery)
9. Testing strategy (unit + integration + reference patterns + property-based)
10. Coordinate system: Y-up internally, Y-down at SVG render
11. Precision: IEEE-754 binary64 / JS number (not f64)
