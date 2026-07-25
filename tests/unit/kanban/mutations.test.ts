import { describe, it, expect, beforeEach } from 'vitest';
import type { KanbanModel, Task } from '../../../src/kanban/engine/types.js';
import { KanbanRepository } from '../../../src/kanban/engine/repository.js';
import { createMutations } from '../../../src/kanban/engine/mutations.js';
import { makeKanbanData, buildModel } from './fixtures.js';

let model: KanbanModel;
let repo: KanbanRepository;
let mutations: ReturnType<typeof createMutations>;

function setup(data?: ReturnType<typeof makeKanbanData>) {
  model = buildModel(data ?? makeKanbanData());
  repo = new KanbanRepository(model);
  mutations = createMutations(repo, model, () => {});
}

beforeEach(() => {
  setup();
});

describe('createTask', () => {
  it('generates unique id, sets status=backlog, adds to model', () => {
    const result = mutations.createTask({ title: 'New Task' });
    expect(result.success).toBe(true);
    expect(result.taskId).toBeDefined();
    const task = model.tasks.get(result.taskId!);
    expect(task).toBeDefined();
    expect(task!.title).toBe('New Task');
    expect(task!.status).toBe('backlog');
    expect(task!.priority).toBe('medium');
  });

  it('returns error for nonexistent parent', () => {
    const result = mutations.createTask({ title: 'Orphan', parent_id: 'NONEXISTENT' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('returns error for nonexistent dependency', () => {
    const result = mutations.createTask({ title: 'Bad Dep', dependencies: ['NONEXISTENT'] });
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });
});

describe('createSubtask', () => {
  it('sets parent_id, adds to parent.children', () => {
    const result = mutations.createSubtask('T-003', { title: 'Subtask' });
    expect(result.success).toBe(true);
    const child = model.tasks.get(result.taskId!);
    expect(child!.parent_id).toBe('T-003');
    const parent = model.tasks.get('T-003')!;
    expect(parent.children).toContain(result.taskId);
  });
});

describe('updateTask', () => {
  it('partial update', () => {
    const result = mutations.updateTask('T-001', { title: 'Updated Title' });
    expect(result.success).toBe(true);
    expect(model.tasks.get('T-001')!.title).toBe('Updated Title');
  });

  it('validates priority', () => {
    const result = mutations.updateTask('T-001', { priority: 'invalid' as any });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid priority');
  });

  it('validates type', () => {
    const result = mutations.updateTask('T-001', { type: 'invalid' as any });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid type');
  });

  it('returns error for nonexistent task', () => {
    expect(mutations.updateTask('NONEXISTENT', { title: 'X' }).success).toBe(false);
  });
});

describe('changeStatus', () => {
  it('valid transition ready->in_progress', () => {
    model.tasks.get('T-003')!.status = 'ready';
    const result = mutations.changeStatus('T-003', 'in_progress');
    expect(result.success).toBe(true);
    expect(model.tasks.get('T-003')!.status).toBe('in_progress');
    expect(model.tasks.get('T-003')!.agent_id).toBeDefined();
  });

  it('invalid transition rejected', () => {
    const result = mutations.changeStatus('T-001', 'in_progress');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid status transition');
  });

  it('rejects blocked status with message', () => {
    model.tasks.get('T-003')!.status = 'ready';
    const result = mutations.changeStatus('T-003', 'blocked');
    expect(result.success).toBe(false);
    expect(result.error).toContain('blockTask');
  });

  it('returns error for nonexistent task', () => {
    expect(mutations.changeStatus('NONEXISTENT', 'done').success).toBe(false);
  });
});

describe('addDependency', () => {
  it('allows non-cycle dep between unrelated tasks', () => {
    const result = mutations.addDependency('T-004', 'T-001');
    expect(result.success).toBe(true);
    expect(model.dependencyGraph.get('T-004')).toContain('T-001');
  });

  it('detects self-dep', () => {
    const result = mutations.addDependency('T-001', 'T-001');
    expect(result.success).toBe(false);
    expect(result.error).toContain('self-dependency');
  });

  it('detects cycle', () => {
    const result = mutations.addDependency('T-001', 'T-005');
    expect(result.success).toBe(false);
    expect(result.error).toContain('cycle');
  });

  it('rejects duplicate dependency', () => {
    const result = mutations.addDependency('T-003', 'T-001');
    expect(result.success).toBe(false);
    expect(result.error).toContain('already exists');
  });
});

describe('removeDependency', () => {
  it('removes dep, updates both graphs', () => {
    const result = mutations.removeDependency('T-003', 'T-001');
    expect(result.success).toBe(true);
    expect(model.tasks.get('T-003')!.dependencies).not.toContain('T-001');
    expect(model.dependentGraph.get('T-001')).not.toContain('T-003');
  });

  it('returns error for non-existent dependency', () => {
    const result = mutations.removeDependency('T-003', 'NONEXISTENT');
    expect(result.success).toBe(false);
    expect(result.error).toContain('does not exist');
  });
});

describe('blockTask', () => {
  it('sets status=blocked, sets blocked_reason', () => {
    const result = mutations.blockTask('T-003', 'Need API key');
    expect(result.success).toBe(true);
    expect(model.tasks.get('T-003')!.status).toBe('blocked');
    expect(model.tasks.get('T-003')!.blocked_reason).toBe('Need API key');
  });

  it('cannot block done task', () => {
    const result = mutations.blockTask('T-001', 'reason');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Cannot block');
  });
});

describe('unblockTask', () => {
  it('sets to todo if deps not all done', () => {
    model.tasks.get('T-005')!.status = 'blocked';
    model.tasks.get('T-005')!.blocked_reason = 'blocked';
    const result = mutations.unblockTask('T-005');
    expect(result.success).toBe(true);
    expect(model.tasks.get('T-005')!.status).toBe('todo');
  });

  it('sets to ready if all deps done', () => {
    model.tasks.get('T-003')!.status = 'blocked';
    model.tasks.get('T-003')!.blocked_reason = 'blocked';
    model.tasks.get('T-001')!.status = 'done';
    model.tasks.get('T-002')!.status = 'done';
    const result = mutations.unblockTask('T-003');
    expect(result.success).toBe(true);
    expect(model.tasks.get('T-003')!.status).toBe('ready');
  });

  it('returns error if task not blocked', () => {
    const result = mutations.unblockTask('T-001');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not blocked');
  });
});

describe('recordEvidence', () => {
  it('appends to evidence array', () => {
    const result = mutations.recordEvidence('T-001', 'Evidence text');
    expect(result.success).toBe(true);
    expect(model.tasks.get('T-001')!.evidence).toContain('Evidence text');
  });

  it('returns error for nonexistent task', () => {
    expect(mutations.recordEvidence('NONEXISTENT', 'x').success).toBe(false);
  });
});

describe('addAcceptanceCriteria', () => {
  it('appends to criteria array', () => {
    const result = mutations.addAcceptanceCriteria('T-001', '[ ] New criterion');
    expect(result.success).toBe(true);
    expect(model.tasks.get('T-001')!.acceptance_criteria).toContain('[ ] New criterion');
  });

  it('does not duplicate', () => {
    mutations.addAcceptanceCriteria('T-001', 'Duplicate');
    mutations.addAcceptanceCriteria('T-001', 'Duplicate');
    const count = model.tasks.get('T-001')!.acceptance_criteria.filter(c => c === 'Duplicate').length;
    expect(count).toBe(1);
  });
});

describe('addTest', () => {
  it('appends test id to tests array', () => {
    const task = model.tasks.get('T-002')!;
    task.tests = [];
    const result = mutations.addTest('T-002', 'T-004');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not a test type');
  });

  it('returns error for nonexistent test', () => {
    const result = mutations.addTest('T-001', 'NONEXISTENT');
    expect(result.success).toBe(false);
  });

  it('returns error if test task is not type test', () => {
    const result = mutations.addTest('T-003', 'T-001');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not a test type');
  });
});

describe('completeTask', () => {
  it('validates criteria [x]', () => {
    model.tasks.get('T-001')!.status = 'in_progress';
    model.tasks.get('T-001')!.acceptance_criteria = ['[ ] Not done'];
    const result = mutations.completeTask('T-001');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Acceptance criteria not met');
  });

  it('validates tests done', () => {
    model.tasks.get('T-002')!.status = 'in_progress';
    model.tasks.get('T-002')!.acceptance_criteria = ['[x] Done'];
    model.tasks.get('T-002')!.tests = ['T-004'];
    const result = mutations.completeTask('T-002');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not completed');
  });

  it('validates deps done', () => {
    model.tasks.get('T-003')!.status = 'in_progress';
    model.tasks.get('T-003')!.acceptance_criteria = ['[x] Done'];
    model.tasks.get('T-003')!.tests = [];
    const result = mutations.completeTask('T-003');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Incomplete dependencies');
  });

  it('completes when all criteria met', () => {
    model.tasks.get('T-001')!.status = 'in_progress';
    model.tasks.get('T-001')!.acceptance_criteria = ['[x] Done'];
    model.tasks.get('T-001')!.tests = [];
    const result = mutations.completeTask('T-001');
    expect(result.success).toBe(true);
    expect(model.tasks.get('T-001')!.status).toBe('done');
  });

  it('returns error for already completed task', () => {
    const result = mutations.completeTask('T-001');
    expect(result.success).toBe(false);
    expect(result.error).toContain('already completed');
  });
});
