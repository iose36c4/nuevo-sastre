import { readFileSync } from 'fs';
import { resolve } from 'path';
import { detectCycles } from '../src/kanban/engine/dependency-graph.js';

interface ValidationError {
  check: string;
  message: string;
  details?: string[];
}

function validate(): ValidationError[] {
  const errors: ValidationError[] = [];
  const kanbanPath = resolve(process.cwd(), 'planning/kanban.json');
  let data: any;

  try {
    data = JSON.parse(readFileSync(kanbanPath, 'utf-8'));
  } catch (e) {
    errors.push({ check: 'parse_json', message: `Failed to parse kanban.json: ${e instanceof Error ? e.message : String(e)}` });
    return errors;
  }

  const tasks: any[] = data.tasks || [];
  const phases: any[] = data.phases || [];
  const milestones: any[] = data.milestones || [];

  const taskIds = new Set(tasks.map((t: any) => t.id));
  const phaseIds = new Set(phases.map((p: any) => p.id));
  const milestoneTaskIds = new Set(milestones.flatMap((m: any) => m.tasks || []));

  const duplicateIds = tasks.reduce((acc: string[], t: any) => {
    if (taskIds.has(t.id)) {
      if (acc.includes(t.id)) return acc;
    }
    const count = tasks.filter((x: any) => x.id === t.id).length;
    if (count > 1 && !acc.includes(t.id)) acc.push(t.id);
    return acc;
  }, []);

  if (duplicateIds.length > 0) {
    errors.push({ check: 'unique_ids', message: 'Duplicate task IDs found', details: duplicateIds });
  }

  for (const task of tasks) {
    for (const depId of task.dependencies || []) {
      if (!taskIds.has(depId)) {
        errors.push({ check: 'all_dependency_ids_exist', message: `Task ${task.id} depends on non-existent ${depId}` });
      }
    }
    if (task.parent_id && !taskIds.has(task.parent_id)) {
      errors.push({ check: 'all_parent_ids_exist_or_null', message: `Task ${task.id} has non-existent parent ${task.parent_id}` });
    }
    for (const childId of task.children || []) {
      if (!taskIds.has(childId)) {
        errors.push({ check: 'all_child_ids_exist', message: `Task ${task.id} references non-existent child ${childId}` });
      }
    }
  }

  for (const task of tasks) {
    const childOf = task.parent_id;
    if (childOf) {
      const parent = tasks.find((t: any) => t.id === childOf);
      if (parent && !(parent.children || []).includes(task.id)) {
        errors.push({ check: 'parent_child_references_are_symmetric', message: `Task ${task.id} has parent ${childOf} but parent does not list it as child` });
      }
    }
    for (const childId of task.children || []) {
      const child = tasks.find((t: any) => t.id === childId);
      if (child && child.parent_id !== task.id) {
        errors.push({ check: 'parent_child_references_are_symmetric', message: `Task ${task.id} lists ${childId} as child but child has parent ${child.parent_id}` });
      }
    }
  }

  const graph = new Map<string, string[]>();
  for (const task of tasks) {
    graph.set(task.id, [...(task.dependencies || [])]);
  }
  const cycles = detectCycles(graph);
  if (cycles.length > 0) {
    errors.push({ check: 'no_dependency_cycles', message: 'Circular dependencies detected', details: cycles.map(c => c.join(' -> ')) });
  }

  for (const task of tasks) {
    if (task.phase && !phaseIds.has(task.phase)) {
      errors.push({ check: 'all_tasks_have_phase_reference', message: `Task ${task.id} references non-existent phase ${task.phase}` });
    }
    if (!task.priority) {
      errors.push({ check: 'all_tasks_have_priority', message: `Task ${task.id} has no priority` });
    }
    if (!task.type) {
      errors.push({ check: 'all_tasks_have_type', message: `Task ${task.id} has no type` });
    }
    if (!task.status) {
      errors.push({ check: 'all_tasks_have_status', message: `Task ${task.id} has no status` });
    }
  }

  for (const milestone of milestones) {
    for (const taskId of milestone.tasks || []) {
      if (!taskIds.has(taskId)) {
        errors.push({ check: 'all_milestone_task_ids_exist', message: `Milestone ${milestone.id} references non-existent task ${taskId}` });
      }
    }
  }

  for (const task of tasks) {
    if (task.priority === 'critical' && (!task.acceptance_criteria || task.acceptance_criteria.length === 0)) {
      errors.push({ check: 'all_critical_tasks_have_acceptance_criteria', message: `Critical task ${task.id} has no acceptance criteria` });
    }
  }

  for (const task of tasks) {
    if (task.type === 'feature' && (!task.tests || task.tests.length === 0)) {
      errors.push({ check: 'all_features_have_tests', message: `Feature task ${task.id} has no linked tests` });
    }
  }

  for (const task of tasks) {
    if (task.vertical_slice && !task.vertical_slice.startsWith('VS-')) {
      errors.push({ check: 'all_vertical_slice_refs_valid', message: `Task ${task.id} has invalid vertical_slice: ${task.vertical_slice}` });
    }
  }

  for (const task of tasks) {
    if ((task.acceptance_criteria || []).length > 15) {
      errors.push({ check: 'no_task_has_more_than_15_acceptance_criteria', message: `Task ${task.id} has ${task.acceptance_criteria.length} acceptance criteria (max 15)` });
    }
  }

  return errors;
}

function main() {
  const errors = validate();
  const valid = errors.length === 0;

  if (valid) {
    console.log('All kanban validation checks passed.');
  } else {
    console.error(`Kanban validation failed with ${errors.length} error(s):`);
    for (const err of errors) {
      console.error(`  [${err.check}] ${err.message}`);
      if (err.details) {
        for (const d of err.details) console.error(`    - ${d}`);
      }
    }
  }

  process.exit(valid ? 0 : 1);
}

main();
