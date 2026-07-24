# Planning Validation — SASTRE DSL (V2)

This document describes the validation checks applied to the kanban.json file.

## Validation Schema

```json
{
  "schema_version": "2.0",
  "checks": [
    "all_task_ids_unique",
    "all_dependency_ids_exist",
    "all_block_ids_exist",
    "no_dependency_cycles",
    "all_parent_ids_exist_or_null",
    "all_child_ids_exist",
    "no_orphan_tasks",
    "all_milestone_task_ids_exist",
    "all_critical_tasks_have_acceptance_criteria",
    "all_implementation_tasks_have_test_children_or_inline_tests",
    "all_blocked_tasks_have_blocking_dependencies",
    "all_tasks_have_phase_reference",
    "all_tasks_have_priority",
    "all_tasks_have_type",
    "all_tasks_have_status",
    "all_vertical_slice_refs_valid",
    "no_task_has_more_than_15_acceptance_criteria"
  ]
}
```

## Check Descriptions

| Check | Description |
|-------|-------------|
| all_task_ids_unique | No two tasks share the same `id` |
| all_dependency_ids_exist | Every ID in `dependencies` array exists as a task `id` |
| all_block_ids_exist | Every ID in `blocks` array exists as a task `id` |
| no_dependency_cycles | Topological sort succeeds (no circular dependency chains) |
| all_parent_ids_exist_or_null | Every `parent_id` is null or references an existing task |
| all_child_ids_exist | Every ID in `children` array exists as a task `id` |
| no_orphan_tasks | Every task is referenced by at least one milestone or parent |
| all_milestone_task_ids_exist | Every task ID in milestones exists as a task |
| all_critical_tasks_have_acceptance_criteria | Tasks with priority=critical have ≥1 acceptance criteria |
| all_implementation_tasks_have_tests | Tasks with type=feature have test children or tests in their list |
| all_blocked_tasks_have_blocking_dependencies | Tasks with blocks[] are referenced by blocked tasks |
| all_tasks_have_phase_reference | Every task references a valid phase |
| all_tasks_have_priority | Every task has a priority field |
| all_tasks_have_type | Every task has a type field |
| all_tasks_have_status | Every task has a status field |
| all_vertical_slice_refs_valid | Every vertical_slice reference is valid |
| no_task_has_more_than_15_acceptance_criteria | Max 15 acceptance criteria per task |

## Automated Validation

A validation script should be created at `scripts/validate-kanban.ts` that:
1. Loads `planning/kanban.json`
2. Runs all checks above
3. Reports pass/fail for each check
4. Exits with code 0 if all pass, 1 if any fail
5. Can be run via `npm run validate:kanban`

This script should be included in CI/CD if applicable.

## V2 Audit Summary

### What Changed from V1

1. **Vertical slices introduced** — tasks organized by verifiable slices, not horizontal layers
2. **SVG decoupled from Model** — SVG renderer can render geometry directly, no model dependency for basic rendering
3. **Coordinate system corrected** — Y-up internally, Y-down at SVG render only
4. **Precision terminology fixed** — no more "f64", clear IEEE-754 binary64 / JavaScript Number
5. **Tests integrated into tasks** — every implementation task includes test children
6. **Offset decomposed** — single hard task split into research, straight, curve, path, validation
7. **Intersections decomposed** — each type is a separate task with tests
8. **Parallel groups added** — tasks indicate parallelizable groups
9. **Milestones moved earlier** — first SVG at M1 (was M2 in V1)
10. **Entity model clarified** — immutable entities, append-only registry, no shadowing, no forward refs
11. **DSL versions formalized** — v0.1, v0.2, v0.3, v1.0 with gates
12. **New decisions added** — D13 (vertical slices), D14 (DSL versions), D15 (offset strategy)
13. **New risks added** — R09 (coordinate confusion), R11 (agent errors), R12 (offset validation)
14. **Planning validation section added** — formal schema for kanban integrity

### What Was Preserved

1. All original architectural decisions (D01-D12) — corrected and expanded
2. TypeScript/Vitest/ESLint stack
3. Custom geometry library approach
4. Template-based SVG generation
5. Recursive descent + Pratt parser
6. Boxer shorts as target pattern
7. Progressive pattern development
8. Error strategy (source spans, panic mode recovery)
9. Testing strategy (unit + integration + reference patterns)
