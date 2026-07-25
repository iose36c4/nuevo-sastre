import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { KanbanLoader } from '../../src/kanban/engine/loader.js';
import { KanbanRepository } from '../../src/kanban/engine/repository.js';
import { createQueries } from '../../src/kanban/engine/queries.js';
import { createMutations } from '../../src/kanban/engine/mutations.js';
import { KanbanHistory } from '../../src/kanban/engine/history.js';
import { KanbanPersistence } from '../../src/kanban/engine/persistence.js';
import type { KanbanModel } from '../../src/kanban/engine/types.js';

describe('Complete Kanban Workflow (Engine API)', () => {
  let model: KanbanModel;
  let repo: KanbanRepository;
  let queries: ReturnType<typeof createQueries>;
  let mutations: ReturnType<typeof createMutations>;
  let history: KanbanHistory;
  let tmpDir: string;
  let mainTaskId: string;
  let subtaskId: string;
  let testTaskId: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'kanban-integration-'));
    const loader = KanbanLoader.getInstance();
    loader.invalidateCache();
    model = loader.getModel();
    repo = new KanbanRepository(model);
    queries = createQueries(repo);
    history = new KanbanHistory(join(tmpDir, '.kanban-history.json'));
    mutations = createMutations(repo, model, () => {});
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('1. loads kanban.json and builds model via KanbanLoader', () => {
    expect(model).toBeDefined();
    expect(model.tasks.size).toBeGreaterThan(0);
    expect(model.phases.size).toBeGreaterThan(0);
    expect(model.project.name).toBe('SASTRE DSL');
    expect(model.milestones.size).toBeGreaterThan(0);
    expect(model.decisions.size).toBeGreaterThan(0);
  });

  it('2. discovers ready tasks via getReadyTasks()', () => {
    const ready = queries.getReadyTasks();
    // With all tasks in "done" state, no tasks should be ready
    // Create a fresh task to verify ready detection works
    const createResult = mutations.createTask({
      title: 'Ready detection test',
      phase: 'PHASE-00',
      priority: 'medium',
    });
    expect(createResult.success).toBe(true);
    const newId = createResult.taskId!;
    mutations.changeStatus(newId, 'todo');
    mutations.changeStatus(newId, 'ready');
    model.tasks.get(newId)!.dependencies = []; // no deps
    const readyAfter = queries.getReadyTasks();
    expect(readyAfter.some(t => t.id === newId)).toBe(true);
    for (const t of readyAfter) {
      expect(t).toHaveProperty('id');
      expect(t).toHaveProperty('title');
      expect(t).toHaveProperty('status');
      expect(t).toHaveProperty('priority');
      expect(t).toHaveProperty('vertical_slice');
    }
  });

  it('3. gets full task context via getTaskContext()', () => {
    const ctx = queries.getTaskContext('FND-001');
    expect(ctx).toBeDefined();
    expect(ctx!.task.id).toBe('FND-001');
    expect(ctx!.parent).toBeNull();
    expect(ctx!.dependencies).toEqual([]);
    expect(ctx!.dependents.length).toBeGreaterThan(0);
    expect(ctx!.recommended_action).toBe('split');
    expect(Array.isArray(ctx!.acceptance_criteria)).toBe(true);
    expect(ctx!.acceptance_criteria.length).toBeGreaterThan(0);
    expect(Array.isArray(ctx!.relevant_decisions)).toBe(true);
    expect(ctx!.task.phase).toBe('PHASE-00');
  });

  it('4. starts task: backlog -> todo -> ready -> in_progress', () => {
    const createResult = mutations.createTask({
      title: 'Integration Test Task',
      description: 'A task created for integration testing',
      priority: 'high',
      type: 'feature',
      phase: 'PHASE-00',
      vertical_slice: 'VS-01',
    });
    expect(createResult.success).toBe(true);
    mainTaskId = createResult.taskId!;
    const task = model.tasks.get(mainTaskId)!;
    expect(task.status).toBe('backlog');
    expect(task.title).toBe('Integration Test Task');
    expect(task.priority).toBe('high');
    expect(task.type).toBe('feature');

    let r = mutations.changeStatus(mainTaskId, 'todo');
    expect(r.success).toBe(true);
    expect(model.tasks.get(mainTaskId)!.status).toBe('todo');

    r = mutations.changeStatus(mainTaskId, 'ready');
    expect(r.success).toBe(true);
    expect(model.tasks.get(mainTaskId)!.status).toBe('ready');

    r = mutations.changeStatus(mainTaskId, 'in_progress');
    expect(r.success).toBe(true);
    expect(model.tasks.get(mainTaskId)!.status).toBe('in_progress');
    expect(model.tasks.get(mainTaskId)!.agent_id).toBeDefined();
    expect(model.tasks.get(mainTaskId)!.started_at).toBeDefined();

    const ctx = queries.getTaskContext(mainTaskId);
    expect(ctx!.recommended_action).toBe('complete');
  });

  it('5. creates subtask under existing task', () => {
    const r = mutations.createSubtask(mainTaskId, {
      title: 'Subtask for integration test',
      type: 'feature',
      phase: 'PHASE-00',
    });
    expect(r.success).toBe(true);
    subtaskId = r.taskId!;
    expect(model.tasks.get(subtaskId)!.parent_id).toBe(mainTaskId);
    expect(model.tasks.get(mainTaskId)!.children).toContain(subtaskId);
    const children = queries.getChildren(mainTaskId);
    expect(children.some(c => c.id === subtaskId)).toBe(true);
    const parent = queries.getParent(subtaskId);
    expect(parent).toBeDefined();
    expect(parent!.id).toBe(mainTaskId);
  });

  it('6. addDependency detects cycles and self-dependencies', () => {
    const r1 = mutations.addDependency(mainTaskId, mainTaskId);
    expect(r1.success).toBe(false);
    expect(r1.error).toContain('self-dependency');

    const r2 = mutations.addDependency(mainTaskId, 'FND-001');
    expect(r2.success).toBe(false);
    expect(r2.error).toContain('cycle');

    const deps = queries.getDependencies(mainTaskId);
    expect(deps.some(d => d.id === 'FND-001')).toBe(false);

    const existingDeps = queries.getDependencies('FND-002');
    expect(existingDeps.length).toBe(1);
    expect(existingDeps[0].id).toBe('FND-001');
    expect(existingDeps[0].status).toBe('done');
  });

  it('7. updates task with priority change via updateTask()', () => {
    const r = mutations.updateTask(mainTaskId, { priority: 'critical' });
    expect(r.success).toBe(true);
    expect(model.tasks.get(mainTaskId)!.priority).toBe('critical');

    const r2 = mutations.updateTask(mainTaskId, { description: 'Updated description for integration test' });
    expect(r2.success).toBe(true);
    expect(model.tasks.get(mainTaskId)!.description).toBe('Updated description for integration test');

    const r3 = mutations.updateTask(mainTaskId, { priority: 'invalid' as any });
    expect(r3.success).toBe(false);
    expect(r3.error).toContain('Invalid priority');

    expect(model.tasks.get(mainTaskId)!.priority).toBe('critical');
  });

  it('8. blocks task with reason via blockTask()', () => {
    const r = mutations.blockTask(mainTaskId, 'Waiting for external API');
    expect(r.success).toBe(true);
    expect(model.tasks.get(mainTaskId)!.status).toBe('blocked');
    expect(model.tasks.get(mainTaskId)!.blocked_reason).toBe('Waiting for external API');

    const blocked = queries.getBlockedTasks();
    expect(blocked.some(b => b.id === mainTaskId)).toBe(true);
    const blockedEntry = blocked.find(b => b.id === mainTaskId)!;
    expect(blockedEntry.blocked_reason).toBe('Waiting for external API');

    const ctx = queries.getTaskContext(mainTaskId);
    expect(ctx!.recommended_action).toBe('block');
  });

  it('9. unblocks task via unblockTask()', () => {
    const r = mutations.unblockTask(mainTaskId);
    expect(r.success).toBe(true);
    expect(model.tasks.get(mainTaskId)!.status).toBe('ready');
    expect(model.tasks.get(mainTaskId)!.blocked_reason).toBeUndefined();

    const blocked = queries.getBlockedTasks();
    expect(blocked.some(b => b.id === mainTaskId)).toBe(false);

    const ctx = queries.getTaskContext(mainTaskId);
    expect(ctx!.recommended_action).toBe('start');
  });

  it('10. adds acceptance criteria via addAcceptanceCriteria()', () => {
    const r1 = mutations.addAcceptanceCriteria(mainTaskId, '[x] All unit tests pass');
    expect(r1.success).toBe(true);
    expect(model.tasks.get(mainTaskId)!.acceptance_criteria).toContain('[x] All unit tests pass');

    const r2 = mutations.addAcceptanceCriteria(mainTaskId, '[x] Code review approved');
    expect(r2.success).toBe(true);
    expect(model.tasks.get(mainTaskId)!.acceptance_criteria).toContain('[x] Code review approved');

    const r3 = mutations.addAcceptanceCriteria(mainTaskId, '[x] All unit tests pass');
    expect(r3.success).toBe(true);
    const count = model.tasks.get(mainTaskId)!.acceptance_criteria.filter(c => c === '[x] All unit tests pass').length;
    expect(count).toBe(1);

    expect(model.tasks.get(mainTaskId)!.acceptance_criteria.length).toBe(2);
  });

  it('11. adds test via addTest()', () => {
    const createResult = mutations.createTask({
      title: 'Unit tests for integration task',
      type: 'test',
      phase: 'PHASE-00',
    });
    expect(createResult.success).toBe(true);
    testTaskId = createResult.taskId!;
    expect(model.tasks.get(testTaskId)!.type).toBe('test');

    mutations.changeStatus(testTaskId, 'todo');
    mutations.changeStatus(testTaskId, 'ready');
    mutations.changeStatus(testTaskId, 'in_progress');
    const completeResult = mutations.completeTask(testTaskId);
    expect(completeResult.success).toBe(true);
    expect(model.tasks.get(testTaskId)!.status).toBe('done');

    const r = mutations.addTest(mainTaskId, testTaskId);
    expect(r.success).toBe(true);
    expect(model.tasks.get(mainTaskId)!.tests).toContain(testTaskId);

    const r2 = mutations.addTest(mainTaskId, 'NONEXISTENT');
    expect(r2.success).toBe(false);

    const r3 = mutations.addTest(mainTaskId, 'FND-001');
    expect(r3.success).toBe(false);
    expect(r3.error).toContain('not a test type');
  });

  it('12. records evidence via recordEvidence()', () => {
    const r1 = mutations.recordEvidence(mainTaskId, 'All tests passing with 95% coverage');
    expect(r1.success).toBe(true);
    expect(model.tasks.get(mainTaskId)!.evidence).toContain('All tests passing with 95% coverage');

    const r2 = mutations.recordEvidence(mainTaskId, 'Performance benchmarks within thresholds');
    expect(r2.success).toBe(true);
    expect(model.tasks.get(mainTaskId)!.evidence!.length).toBe(2);

    const r3 = mutations.recordEvidence('NONEXISTENT', 'Nope');
    expect(r3.success).toBe(false);
  });

  it('13. completes task with all validations via completeTask()', () => {
    mutations.changeStatus(mainTaskId, 'in_progress');
    expect(model.tasks.get(mainTaskId)!.status).toBe('in_progress');

    const incompleteCriteriaTask = mutations.createTask({ title: 'Incomplete task' });
    expect(incompleteCriteriaTask.success).toBe(true);
    mutations.changeStatus(incompleteCriteriaTask.taskId!, 'todo');
    mutations.changeStatus(incompleteCriteriaTask.taskId!, 'ready');
    mutations.changeStatus(incompleteCriteriaTask.taskId!, 'in_progress');
    mutations.addAcceptanceCriteria(incompleteCriteriaTask.taskId!, '[ ] Not done');
    const failResult = mutations.completeTask(incompleteCriteriaTask.taskId!);
    expect(failResult.success).toBe(false);
    expect(failResult.error).toContain('Acceptance criteria not met');

    const r = mutations.completeTask(mainTaskId);
    expect(r.success).toBe(true);
    expect(model.tasks.get(mainTaskId)!.status).toBe('done');

    expect(model.tasks.get(subtaskId)!.status).toBe('cancelled');

    const doneTasks = queries.getReadyTasks().filter(t => t.id === mainTaskId);
    expect(doneTasks.length).toBe(0);
  });

  it('14. persists and reloads state via KanbanPersistence', () => {
    const persistence = new KanbanPersistence({
      kanbanPath: join(tmpDir, 'kanban-persist-test.json'),
      historyPath: join(tmpDir, 'history-persist-test.json'),
      validateBeforeWrite: false,
    });
    persistence.write(model);

    const reloaded = JSON.parse(readFileSync(join(tmpDir, 'kanban-persist-test.json'), 'utf-8'));
    expect(reloaded.tasks).toBeDefined();
    expect(reloaded.phases).toBeDefined();
    expect(reloaded.project).toBeDefined();

    const reloadedMainTask = reloaded.tasks.find((t: any) => t.id === mainTaskId);
    expect(reloadedMainTask).toBeDefined();
    expect(reloadedMainTask.status).toBe('done');
    expect(reloadedMainTask.priority).toBe('critical');
    expect(reloadedMainTask.evidence).toContain('All tests passing with 95% coverage');

    const reloadedSubtask = reloaded.tasks.find((t: any) => t.id === subtaskId);
    expect(reloadedSubtask).toBeDefined();
    expect(reloadedSubtask.status).toBe('cancelled');
    expect(reloadedSubtask.parent_id).toBe(mainTaskId);

    const reloadedTestTask = reloaded.tasks.find((t: any) => t.id === testTaskId);
    expect(reloadedTestTask).toBeDefined();
    expect(reloadedTestTask.status).toBe('done');
    expect(reloadedTestTask.type).toBe('test');

    expect(reloaded.planning_validation).toBeDefined();
    expect(reloaded.planning_validation.task_counts.total).toBe(model.tasks.size);
  });

  it('15. records and queries history entries', () => {
    history.record({
      operation: 'createTask',
      taskId: mainTaskId,
      agentId: 'integration-test',
      success: true,
    });
    history.record({
      operation: 'completeTask',
      taskId: mainTaskId,
      agentId: 'integration-test',
      success: true,
    });
    history.record({
      operation: 'blockTask',
      taskId: mainTaskId,
      agentId: 'integration-test',
      before: { status: 'in_progress' },
      after: { status: 'blocked' },
      success: true,
    });

    const allEntries = history.getAll();
    expect(allEntries.length).toBeGreaterThanOrEqual(3);

    const taskEntries = history.query(mainTaskId);
    expect(taskEntries.length).toBeGreaterThanOrEqual(3);
    expect(taskEntries.some(e => e.operation === 'completeTask')).toBe(true);
    expect(taskEntries.some(e => e.operation === 'createTask')).toBe(true);
    expect(taskEntries.some(e => e.operation === 'blockTask')).toBe(true);

    for (const entry of taskEntries) {
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('operation');
      expect(entry).toHaveProperty('taskId');
      expect(entry).toHaveProperty('success');
      expect(entry.taskId).toBe(mainTaskId);
      expect(entry.success).toBe(true);
    }

    const noEntries = history.query('NONEXISTENT');
    expect(noEntries).toEqual([]);
  });
});
