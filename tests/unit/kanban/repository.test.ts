import { describe, it, expect } from 'vitest';
import { KanbanRepository } from '../../../src/kanban/engine/repository.js';
import { makeKanbanData, buildModel } from './fixtures.js';

describe('KanbanRepository', () => {
  const data = makeKanbanData();
  const model = buildModel(data);
  const repo = new KanbanRepository(model);

  it('getTask returns correct task', () => {
    const task = repo.getTask('T-001');
    expect(task).toBeDefined();
    expect(task!.id).toBe('T-001');
    expect(task!.status).toBe('done');
  });

  it('getTask returns undefined for nonexistent id', () => {
    expect(repo.getTask('NONEXISTENT')).toBeUndefined();
  });

  it('getAllTasks returns all tasks', () => {
    const tasks = repo.getAllTasks();
    expect(tasks.length).toBe(5);
  });

  it('getTasksByPhase returns tasks in given phase', () => {
    const phase1 = repo.getTasksByPhase('phase-1');
    expect(phase1.length).toBe(2);
    expect(phase1.map(t => t.id)).toEqual(['T-001', 'T-002']);

    const phase2 = repo.getTasksByPhase('phase-2');
    expect(phase2.length).toBe(2);
    expect(phase2.map(t => t.id)).toEqual(['T-003', 'T-004']);
  });

  it('getTasksByPhase returns empty for nonexistent phase', () => {
    expect(repo.getTasksByPhase('nonexistent')).toEqual([]);
  });

  it('getTasksByStatus returns tasks with given status', () => {
    const doneTasks = repo.getTasksByStatus('done');
    expect(doneTasks.length).toBe(1);
    expect(doneTasks[0].id).toBe('T-001');

    const todoTasks = repo.getTasksByStatus('todo');
    expect(todoTasks.length).toBe(2);
  });

  it('getTasksByParent returns child tasks', () => {
    const children = repo.getTasksByParent('T-003');
    expect(children.length).toBe(1);
    expect(children[0].id).toBe('T-004');
  });

  it('getTasksByParent returns empty for parentless task', () => {
    expect(repo.getTasksByParent('T-001')).toEqual([]);
  });

  it('getRootTasks returns only parentless tasks', () => {
    const roots = repo.getRootTasks();
    expect(roots.length).toBe(4);
    expect(roots.every(t => !t.parent_id)).toBe(true);
    expect(roots.map(t => t.id)).toContain('T-001');
    expect(roots.map(t => t.id)).not.toContain('T-004');
  });

  it('getDependencies returns dependency ids', () => {
    expect(repo.getDependencies('T-003')).toEqual(['T-001', 'T-002']);
    expect(repo.getDependencies('T-001')).toEqual([]);
  });

  it('getDependencies returns empty array for unknown task', () => {
    expect(repo.getDependencies('NONEXISTENT')).toEqual([]);
  });

  it('getDependents returns dependent task ids', () => {
    expect(repo.getDependents('T-001')).toEqual(['T-002', 'T-003']);
    expect(repo.getDependents('T-003')).toEqual(['T-005']);
    expect(repo.getDependents('T-005')).toEqual([]);
  });

  it('getDependents returns empty array for unknown task', () => {
    expect(repo.getDependents('NONEXISTENT')).toEqual([]);
  });

  it('getPhase returns correct phase', () => {
    const phase = repo.getPhase('phase-1');
    expect(phase).toBeDefined();
    expect(phase!.title).toBe('Phase 1');
  });

  it('getAllPhases returns all phases', () => {
    expect(repo.getAllPhases().length).toBe(3);
  });

  it('getMilestone returns correct milestone', () => {
    const m = repo.getMilestone('M-001');
    expect(m).toBeDefined();
    expect(m!.title).toBe('Milestone 1');
  });

  it('getAllMilestones returns all milestones', () => {
    expect(repo.getAllMilestones().length).toBe(1);
  });

  it('getDecision returns correct decision', () => {
    const d = repo.getDecision('D-001');
    expect(d).toBeDefined();
    expect(d!.title).toBe('Use TypeScript');
  });

  it('getAllDecisions returns all decisions', () => {
    expect(repo.getAllDecisions().length).toBe(1);
  });

  it('getDependencyGraph returns a copy of the graph', () => {
    const g1 = repo.getDependencyGraph();
    const g2 = repo.getDependencyGraph();
    expect(g1).not.toBe(g2);
    expect(g1.get('T-003')).toEqual(['T-001', 'T-002']);
  });

  it('getDependentGraph returns a copy of the graph', () => {
    const g1 = repo.getDependentGraph();
    const g2 = repo.getDependentGraph();
    expect(g1).not.toBe(g2);
    expect(g1.get('T-001')).toEqual(['T-002', 'T-003']);
  });

  it('getProject returns project info', () => {
    expect(repo.getProject().name).toBe('test-project');
  });
});
