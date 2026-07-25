import { describe, it, expect, beforeEach } from 'vitest';
import type { KanbanData, KanbanModel, Task } from '../../../src/kanban/engine/types.js';
import { KanbanRepository } from '../../../src/kanban/engine/repository.js';
import { createQueries } from '../../../src/kanban/engine/queries.js';
import { makeKanbanData, buildModel } from './fixtures.js';

let model: KanbanModel;
let repo: KanbanRepository;
let queries: ReturnType<typeof createQueries>;

function rebuild(data?: KanbanData) {
  model = buildModel(data ?? makeKanbanData());
  repo = new KanbanRepository(model);
  queries = createQueries(repo);
}

function makeTestTask(overrides: Partial<Task> & { id: string }): Task {
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

function makeCustomData(tasks: Task[]): KanbanData {
  const data = makeKanbanData();
  data.tasks = tasks;
  return data;
}

beforeEach(() => {
  rebuild();
});

describe('getTask', () => {
  it('returns correct task by id', () => {
    const task = queries.getTask('T-001');
    expect(task).toBeDefined();
    expect(task!.id).toBe('T-001');
    expect(task!.status).toBe('done');
  });

  it('returns undefined for nonexistent task', () => {
    expect(queries.getTask('NONEXISTENT')).toBeUndefined();
  });
});

describe('getReadyTasks', () => {
  it('returns tasks with all deps done, excludes done/cancelled/blocked', () => {
    const ready = queries.getReadyTasks();
    const ids = ready.map(t => t.id);
    expect(ids).toContain('T-002');
    expect(ids).not.toContain('T-001');
    expect(ids).not.toContain('T-005');
  });

  it('excludes tasks whose dependencies are not all done', () => {
    const ready = queries.getReadyTasks();
    const ids = ready.map(t => t.id);
    expect(ids).not.toContain('T-003');
    expect(ids).not.toContain('T-005');
  });

  it('sorts by priority descending', () => {
    const ready = queries.getReadyTasks();
    const priorities = ready.map(t => t.priority);
    const priorityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    for (let i = 1; i < priorities.length; i++) {
      expect(priorityOrder[priorities[i]]).toBeLessThanOrEqual(priorityOrder[priorities[i - 1]]);
    }
  });
});

describe('getBlockedTasks', () => {
  it('returns only blocked tasks with reason', () => {
    const task = model.tasks.get('T-002')!;
    task.status = 'blocked';
    task.blocked_reason = 'Waiting for API';
    const todoIds = model.taskByStatus.get('todo')!;
    todoIds.splice(todoIds.indexOf('T-002'), 1);
    const blockedIds = model.taskByStatus.get('blocked') || [];
    blockedIds.push('T-002');
    model.taskByStatus.set('blocked', blockedIds);

    const blocked = queries.getBlockedTasks();
    expect(blocked.length).toBe(1);
    expect(blocked[0].id).toBe('T-002');
    expect(blocked[0].blocked_reason).toBe('Waiting for API');
  });

  it('uses default reason when blocked_reason is missing', () => {
    const task = model.tasks.get('T-002')!;
    task.status = 'blocked';
    delete task.blocked_reason;
    const todoIds = model.taskByStatus.get('todo')!;
    todoIds.splice(todoIds.indexOf('T-002'), 1);
    const blockedIds = model.taskByStatus.get('blocked') || [];
    blockedIds.push('T-002');
    model.taskByStatus.set('blocked', blockedIds);

    const blocked = queries.getBlockedTasks();
    expect(blocked[0].blocked_reason).toBe('No reason provided');
  });
});

describe('getTaskContext', () => {
  it('returns full context with parent, deps, dependents, tests, criteria, recommended_action', () => {
    const ctx = queries.getTaskContext('T-004');
    expect(ctx).toBeDefined();
    expect(ctx!.task.id).toBe('T-004');
    expect(ctx!.parent).toBeDefined();
    expect(ctx!.parent!.id).toBe('T-003');
    expect(ctx!.dependencies).toEqual([]);
    expect(ctx!.dependents).toEqual([]);
    expect(Array.isArray(ctx!.tests)).toBe(true);
    expect(Array.isArray(ctx!.acceptance_criteria)).toBe(true);
    expect(Array.isArray(ctx!.relevant_decisions)).toBe(true);
  });

  it('returns dependencies with id/title/status', () => {
    const ctx = queries.getTaskContext('T-003');
    expect(ctx).toBeDefined();
    expect(ctx!.dependencies.length).toBe(2);
    const depIds = ctx!.dependencies.map(d => d.id);
    expect(depIds).toContain('T-001');
    expect(depIds).toContain('T-002');
  });

  it('returns dependents with id/title/status', () => {
    const ctx = queries.getTaskContext('T-001');
    expect(ctx).toBeDefined();
    expect(ctx!.dependents.length).toBe(2);
    const depIds = ctx!.dependents.map(d => d.id);
    expect(depIds).toContain('T-002');
    expect(depIds).toContain('T-003');
  });

  it('returns undefined for nonexistent task', () => {
    expect(queries.getTaskContext('NONEXISTENT')).toBeUndefined();
  });

  it('sets recommended_action based on status', () => {
    model.tasks.get('T-002')!.status = 'ready';
    expect(queries.getTaskContext('T-002')!.recommended_action).toBe('start');

    model.tasks.get('T-002')!.status = 'in_progress';
    expect(queries.getTaskContext('T-002')!.recommended_action).toBe('complete');

    model.tasks.get('T-002')!.status = 'blocked';
    expect(queries.getTaskContext('T-002')!.recommended_action).toBe('block');

    model.tasks.get('T-002')!.status = 'backlog';
    expect(queries.getTaskContext('T-002')!.recommended_action).toBe('wait');
  });
});

describe('getDependencies', () => {
  it('returns TaskDependency[] with id/title/status', () => {
    const deps = queries.getDependencies('T-003');
    expect(deps.length).toBe(2);
    const ids = deps.map(d => d.id);
    expect(ids).toContain('T-001');
    expect(ids).toContain('T-002');
    for (const dep of deps) {
      expect(dep).toHaveProperty('id');
      expect(dep).toHaveProperty('title');
      expect(dep).toHaveProperty('status');
    }
  });

  it('returns empty array for task with no deps', () => {
    expect(queries.getDependencies('T-001')).toEqual([]);
  });
});

describe('getDependents', () => {
  it('returns TaskDependent[] with id/title/status', () => {
    const deps = queries.getDependents('T-001');
    expect(deps.length).toBe(2);
    const ids = deps.map(d => d.id);
    expect(ids).toContain('T-002');
    expect(ids).toContain('T-003');
    for (const dep of deps) {
      expect(dep).toHaveProperty('id');
      expect(dep).toHaveProperty('title');
      expect(dep).toHaveProperty('status');
    }
  });

  it('returns empty array when no dependents', () => {
    expect(queries.getDependents('T-005')).toEqual([]);
  });
});

describe('getChildren', () => {
  it('returns child tasks', () => {
    const children = queries.getChildren('T-003');
    expect(children.length).toBe(1);
    expect(children[0].id).toBe('T-004');
  });

  it('returns empty array for leaf task', () => {
    expect(queries.getChildren('T-004')).toEqual([]);
  });
});

describe('getParent', () => {
  it('returns parent task', () => {
    const parent = queries.getParent('T-004');
    expect(parent).toBeDefined();
    expect(parent!.id).toBe('T-003');
  });

  it('returns undefined for root task', () => {
    expect(queries.getParent('T-001')).toBeUndefined();
  });
});

describe('getTree', () => {
  it('returns recursive TaskTree structure', () => {
    const tree = queries.getTree('T-003');
    expect(tree).toBeDefined();
    expect(tree!.task.id).toBe('T-003');
    expect(tree!.children.length).toBe(1);
    expect(tree!.children[0].task.id).toBe('T-004');
    expect(tree!.children[0].children).toEqual([]);
  });

  it('returns undefined for nonexistent task', () => {
    expect(queries.getTree('NONEXISTENT')).toBeUndefined();
  });

  it('returns leaf as single node tree', () => {
    const tree = queries.getTree('T-001');
    expect(tree).toBeDefined();
    expect(tree!.task.id).toBe('T-001');
    expect(tree!.children.length).toBe(0);
  });
});

describe('getNextTasks', () => {
  it('returns ready tasks sorted by priority', () => {
    const next = queries.getNextTasks();
    expect(next.length).toBeGreaterThan(0);
    const ids = next.map(t => t.id);
    expect(ids).toContain('T-002');
    for (const t of next) {
      expect(t).toHaveProperty('id');
      expect(t).toHaveProperty('title');
      expect(t).toHaveProperty('status');
      expect(t).toHaveProperty('priority');
      expect(t).toHaveProperty('vertical_slice');
    }
  });
});

describe('searchTasks', () => {
  it('matches title and description case-insensitive', () => {
    const results = queries.searchTasks('task t-001');
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('T-001');
  });

  it('returns empty for no match', () => {
    expect(queries.searchTasks('zzznonexistent')).toEqual([]);
  });

  it('returns SearchResult with correct fields', () => {
    const results = queries.searchTasks('T-002');
    expect(results.length).toBe(1);
    expect(results[0]).toHaveProperty('id');
    expect(results[0]).toHaveProperty('title');
    expect(results[0]).toHaveProperty('status');
    expect(results[0]).toHaveProperty('priority');
    expect(results[0]).toHaveProperty('vertical_slice');
  });
});
