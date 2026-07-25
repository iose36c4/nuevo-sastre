import { describe, it, expect, beforeEach } from 'vitest';
import { KanbanLoader } from '@/kanban/engine/loader.js';
import { KanbanRepository } from '@/kanban/engine/repository.js';
import { createMutations } from '@/kanban/engine/mutations.js';
import { KanbanPersistence } from '@/kanban/engine/persistence.js';
import type { KanbanModel, Task } from '@/kanban/engine/types.js';
import { writeFileSync, mkdirSync, cpSync, rmSync } from 'fs';
import { resolve } from 'path';

const TMP_DIR = resolve(process.cwd(), '.test-kanban-status-tracking');
const TMP_KANBAN = resolve(TMP_DIR, 'planning/kanban.json');

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'TEST-001',
    parent_id: null,
    phase: 'PHASE-KANBAN',
    title: 'Test Task',
    description: '',
    status: 'ready',
    priority: 'medium',
    type: 'feature',
    vertical_slice: 'VS-01',
    parallel_group: 'default',
    dependencies: [],
    children: [],
    acceptance_criteria: [],
    deliverables: [],
    tests: [],
    documentation: [],
    estimated_complexity: 'small',
    can_parallelize: false,
    notes: [],
    ...overrides
  };
}

function buildModel(tasks: Task[]): KanbanModel {
  const taskMap = new Map<string, Task>();
  const taskByPhase = new Map<string, string[]>();
  const taskByStatus = new Map<string, string[]>();
  const taskByParent = new Map<string, string[]>();
  const dependencyGraph = new Map<string, string[]>();
  const dependentGraph = new Map<string, string[]>();

  for (const t of tasks) {
    taskMap.set(t.id, t);
    const phaseTasks = taskByPhase.get(t.phase) || [];
    phaseTasks.push(t.id);
    taskByPhase.set(t.phase, phaseTasks);
    const statusTasks = taskByStatus.get(t.status) || [];
    statusTasks.push(t.id);
    taskByStatus.set(t.status, statusTasks);
    if (t.parent_id) {
      const parentChildren = taskByParent.get(t.parent_id) || [];
      parentChildren.push(t.id);
      taskByParent.set(t.parent_id, parentChildren);
    }
    dependencyGraph.set(t.id, [...t.dependencies]);
    dependentGraph.set(t.id, []);
    for (const depId of t.dependencies) {
      const deps = dependentGraph.get(depId) || [];
      deps.push(t.id);
      dependentGraph.set(depId, deps);
    }
  }

  return {
    project: { name: 'test', version: '1.0', description: '', language: 'ts', runtime: 'node', testing_framework: 'vitest', linter: 'eslint', type_checker: 'tsc', coordinate_system: 'y-up', internal_unit: 'mm', build_order: '', created: '', repository: '', dsl_versions: [], floating_point: {} },
    phases: new Map(),
    tasks: taskMap,
    milestones: new Map(),
    decisions: new Map(),
    taskByPhase,
    taskByStatus,
    taskByParent,
    dependencyGraph,
    dependentGraph
  };
}

describe('blockTask status tracking', () => {
  let model: KanbanModel;
  let repo: KanbanRepository;
  let mutations: ReturnType<typeof createMutations>;
  let writtenModel: KanbanModel | null;

  beforeEach(() => {
    const task = makeTask({ id: 'B-001', status: 'ready' });
    model = buildModel([task]);
    repo = new KanbanRepository(model);
    writtenModel = null;
    mutations = createMutations(repo, model, (m) => { writtenModel = m; });
  });

  it('should remove task from old status list after blocking', () => {
    const result = mutations.blockTask('B-001', 'Test reason');
    expect(result.success).toBe(true);

    const readyTasks = model.taskByStatus.get('ready') || [];
    expect(readyTasks).not.toContain('B-001');

    const blockedTasks = model.taskByStatus.get('blocked') || [];
    expect(blockedTasks).toContain('B-001');
  });

  it('should not leave task in multiple status lists', () => {
    mutations.blockTask('B-001', 'Test reason');

    let foundIn: string[] = [];
    for (const [status, taskIds] of model.taskByStatus) {
      if (taskIds.includes('B-001')) foundIn.push(status);
    }
    expect(foundIn).toEqual(['blocked']);
  });

  it('should handle blocking from in_progress status', () => {
    const task = makeTask({ id: 'B-002', status: 'in_progress' });
    model.tasks.set('B-002', task);
    const statusTasks = model.taskByStatus.get('in_progress') || [];
    statusTasks.push('B-002');
    model.taskByStatus.set('in_progress', statusTasks);

    mutations.blockTask('B-002', 'Blocked from progress');

    const inProgressTasks = model.taskByStatus.get('in_progress') || [];
    expect(inProgressTasks).not.toContain('B-002');
    const blockedTasks = model.taskByStatus.get('blocked') || [];
    expect(blockedTasks).toContain('B-002');
  });

  it('should handle blocking from todo status', () => {
    const task = makeTask({ id: 'B-003', status: 'todo' });
    model.tasks.set('B-003', task);
    const statusTasks = model.taskByStatus.get('todo') || [];
    statusTasks.push('B-003');
    model.taskByStatus.set('todo', statusTasks);

    mutations.blockTask('B-003', 'Blocked from todo');

    const todoTasks = model.taskByStatus.get('todo') || [];
    expect(todoTasks).not.toContain('B-003');
    const blockedTasks = model.taskByStatus.get('blocked') || [];
    expect(blockedTasks).toContain('B-003');
  });

  it('should persist after blocking', () => {
    mutations.blockTask('B-001', 'Persist test');
    expect(writtenModel).not.toBeNull();
  });
});

describe('completeTask child status removal', () => {
  let model: KanbanModel;
  let repo: KanbanRepository;
  let mutations: ReturnType<typeof createMutations>;

  beforeEach(() => {
    const parent = makeTask({ id: 'P-001', status: 'in_progress', children: ['C-001', 'C-002'], acceptance_criteria: ['[x] done'] });
    const child1 = makeTask({ id: 'C-001', parent_id: 'P-001', status: 'in_progress' });
    const child2 = makeTask({ id: 'C-002', parent_id: 'P-001', status: 'todo' });
    model = buildModel([parent, child1, child2]);
    repo = new KanbanRepository(model);
    mutations = createMutations(repo, model, () => {});
  });

  it('should remove children from their original status, not cancelled', () => {
    const result = mutations.completeTask('P-001');
    expect(result.success).toBe(true);

    const inProgressTasks = model.taskByStatus.get('in_progress') || [];
    expect(inProgressTasks).not.toContain('C-001');

    const todoTasks = model.taskByStatus.get('todo') || [];
    expect(todoTasks).not.toContain('C-002');

    const cancelledTasks = model.taskByStatus.get('cancelled') || [];
    expect(cancelledTasks).toContain('C-001');
    expect(cancelledTasks).toContain('C-002');
  });

  it('should not corrupt in_progress list with cancelled entries', () => {
    mutations.completeTask('P-001');

    const inProgressTasks = model.taskByStatus.get('in_progress') || [];
    expect(inProgressTasks).not.toContain('C-001');
    expect(inProgressTasks).not.toContain('C-002');
  });

  it('should correctly track parent in done status', () => {
    mutations.completeTask('P-001');

    const doneTasks = model.taskByStatus.get('done') || [];
    expect(doneTasks).toContain('P-001');

    const inProgressTasks = model.taskByStatus.get('in_progress') || [];
    expect(inProgressTasks).not.toContain('P-001');
  });

  it('should handle parent with children in same status', () => {
    const parent = makeTask({ id: 'P-002', status: 'in_progress', children: ['C-010'], acceptance_criteria: ['[x] done'] });
    const child = makeTask({ id: 'C-010', parent_id: 'P-002', status: 'in_progress' });
    const m = buildModel([parent, child]);
    const r = new KanbanRepository(m);
    const mut = createMutations(r, m, () => {});

    mut.completeTask('P-002');

    const inProgressTasks = m.taskByStatus.get('in_progress') || [];
    expect(inProgressTasks).not.toContain('C-010');
    expect(inProgressTasks).not.toContain('P-002');

    const cancelledTasks = m.taskByStatus.get('cancelled') || [];
    expect(cancelledTasks).toContain('C-010');

    const doneTasks = m.taskByStatus.get('done') || [];
    expect(doneTasks).toContain('P-002');
  });
});

describe('taskByStatus integrity after multiple mutations', () => {
  it('should maintain consistent status tracking through a full lifecycle', () => {
    const task = makeTask({ id: 'L-001', status: 'ready' });
    const model = buildModel([task]);
    const repo = new KanbanRepository(model);
    const mutations = createMutations(repo, model, () => {});

    mutations.changeStatus('L-001', 'in_progress');
    let foundIn: string[] = [];
    for (const [status, ids] of model.taskByStatus) {
      if (ids.includes('L-001')) foundIn.push(status);
    }
    expect(foundIn).toEqual(['in_progress']);

    mutations.blockTask('L-001', 'blocked');
    foundIn = [];
    for (const [status, ids] of model.taskByStatus) {
      if (ids.includes('L-001')) foundIn.push(status);
    }
    expect(foundIn).toEqual(['blocked']);

    mutations.unblockTask('L-001');
    foundIn = [];
    for (const [status, ids] of model.taskByStatus) {
      if (ids.includes('L-001')) foundIn.push(status);
    }
    expect(foundIn.length).toBe(1);
    expect(foundIn[0]).toBe('ready');
  });
});
