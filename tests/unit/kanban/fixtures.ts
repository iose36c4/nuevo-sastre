import type { KanbanData, KanbanModel, Task } from '../../../src/kanban/engine/types.js';

export function makeTask(overrides: Partial<Task> & { id: string }): Task {
  return {
    parent_id: null,
    phase: 'phase-1',
    title: `Task ${overrides.id}`,
    description: `Description for ${overrides.id}`,
    status: 'todo',
    priority: 'medium',
    type: 'feature',
    vertical_slice: 'vs-1',
    parallel_group: '',
    dependencies: [],
    children: [],
    acceptance_criteria: [],
    deliverables: [],
    tests: [],
    documentation: [],
    estimated_complexity: 'low',
    can_parallelize: false,
    notes: [],
    ...overrides,
  };
}

export function makeKanbanData(): KanbanData {
  const tasks: Task[] = [
    makeTask({ id: 'T-001', phase: 'phase-1', status: 'done', dependencies: [] }),
    makeTask({ id: 'T-002', phase: 'phase-1', status: 'todo', dependencies: ['T-001'] }),
    makeTask({ id: 'T-003', phase: 'phase-2', status: 'ready', dependencies: ['T-001', 'T-002'] }),
    makeTask({
      id: 'T-004',
      phase: 'phase-2',
      status: 'todo',
      parent_id: 'T-003',
      dependencies: [],
    }),
    makeTask({ id: 'T-005', phase: 'phase-3', status: 'backlog', dependencies: ['T-003'] }),
  ];

  // T-003 has child T-004, so we need to set children on T-003
  tasks[2].children = ['T-004'];

  return {
    project: {
      name: 'test-project',
      version: '1.0.0',
      description: 'Test project',
      language: 'typescript',
      runtime: 'node',
      testing_framework: 'vitest',
      linter: 'eslint',
      type_checker: 'tsc',
      coordinate_system: 'cartesian',
      internal_unit: 'mm',
      build_order: 'sequential',
      created: '2024-01-01',
      repository: 'https://example.com/repo',
      dsl_versions: ['1.0'],
      floating_point: { precision: 'double' },
    },
    phases: [
      { id: 'phase-1', title: 'Phase 1', description: 'First phase', order: 1, status: 'done', vertical_slice: 'vs-1', blocks: [] },
      { id: 'phase-2', title: 'Phase 2', description: 'Second phase', order: 2, status: 'in_progress', vertical_slice: 'vs-1', blocks: ['phase-1'] },
      { id: 'phase-3', title: 'Phase 3', description: 'Third phase', order: 3, status: 'backlog', vertical_slice: 'vs-2', blocks: ['phase-2'] },
    ],
    tasks,
    milestones: [
      { id: 'M-001', title: 'Milestone 1', description: 'First milestone', tasks: ['T-001', 'T-002'], status: 'done' },
    ],
    decisions: [
      { id: 'D-001', title: 'Use TypeScript', documented_in: 'docs/decision.md' },
    ],
  };
}

export function buildModel(data: KanbanData): KanbanModel {
  const phases = new Map(data.phases.map(p => [p.id, p]));
  const tasks = new Map(data.tasks.map(t => [t.id, t]));
  const milestones = new Map(data.milestones.map(m => [m.id, m]));
  const decisions = new Map(data.decisions.map(d => [d.id, d]));

  const taskByPhase = new Map<string, string[]>();
  const taskByStatus = new Map<string, string[]>();
  const taskByParent = new Map<string, string[]>();
  const dependencyGraph = new Map<string, string[]>();
  const dependentGraph = new Map<string, string[]>();

  for (const task of data.tasks) {
    if (!taskByPhase.has(task.phase)) taskByPhase.set(task.phase, []);
    taskByPhase.get(task.phase)!.push(task.id);

    if (!taskByStatus.has(task.status)) taskByStatus.set(task.status, []);
    taskByStatus.get(task.status)!.push(task.id);

    if (task.parent_id) {
      if (!taskByParent.has(task.parent_id)) taskByParent.set(task.parent_id, []);
      taskByParent.get(task.parent_id)!.push(task.id);
    }

    dependencyGraph.set(task.id, [...task.dependencies]);
    for (const dep of task.dependencies) {
      if (!dependentGraph.has(dep)) dependentGraph.set(dep, []);
      dependentGraph.get(dep)!.push(task.id);
    }
  }

  return {
    project: data.project,
    phases,
    tasks,
    milestones,
    decisions,
    taskByPhase,
    taskByStatus,
    taskByParent,
    dependencyGraph,
    dependentGraph,
  };
}

export function makeCycleData(): KanbanData {
  const tasks: Task[] = [
    makeTask({ id: 'C-001', phase: 'p1', dependencies: ['C-003'] }),
    makeTask({ id: 'C-002', phase: 'p1', dependencies: ['C-001'] }),
    makeTask({ id: 'C-003', phase: 'p1', dependencies: ['C-002'] }),
  ];

  return {
    project: makeKanbanData().project,
    phases: [],
    tasks,
    milestones: [],
    decisions: [],
  };
}
