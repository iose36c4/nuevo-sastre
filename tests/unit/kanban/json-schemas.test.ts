import { describe, it, expect } from 'vitest';
import type { Task, TaskContext, Phase, Milestone } from '../../../src/kanban/engine/types.js';
import {
  toReadyTaskSchema,
  toTaskSchema,
  toTaskContextSchema,
  toSearchResultSchema,
  toPhaseSchema,
  toMilestoneSchema,
} from '../../../src/kanban/engine/json-schemas.js';
import { makeTask, makeKanbanData } from './fixtures.js';

const sampleTask: Task = makeTask({
  id: 'JS-001',
  phase: 'phase-1',
  status: 'ready',
  priority: 'high',
  type: 'feature',
  acceptance_criteria: ['[x] Done'],
  tests: ['JS-001T'],
  dependencies: ['JS-002'],
  children: ['JS-003'],
});

const samplePhase: Phase = {
  id: 'PH-001',
  title: 'Phase One',
  description: 'First phase',
  order: 1,
  status: 'done',
  vertical_slice: 'vs-1',
  blocks: ['PH-002'],
};

const sampleMilestone: Milestone = {
  id: 'MS-001',
  title: 'Milestone One',
  description: 'First milestone',
  tasks: ['T-001', 'T-002'],
  status: 'done',
};

describe('toReadyTaskSchema', () => {
  it('only id/title/status/priority/vertical_slice', () => {
    const schema = toReadyTaskSchema(sampleTask);
    expect(schema).toEqual({
      id: 'JS-001',
      title: 'Task JS-001',
      status: 'ready',
      priority: 'high',
      vertical_slice: 'vs-1',
    });
    expect(Object.keys(schema)).toEqual(['id', 'title', 'status', 'priority', 'vertical_slice']);
  });
});

describe('toTaskSchema', () => {
  it('all fields from Task', () => {
    const schema = toTaskSchema(sampleTask);
    expect(schema.id).toBe('JS-001');
    expect(schema.title).toBe('Task JS-001');
    expect(schema.status).toBe('ready');
    expect(schema.priority).toBe('high');
    expect(schema.type).toBe('feature');
    expect(schema.phase).toBe('phase-1');
    expect(schema.vertical_slice).toBe('vs-1');
    expect(schema.dependencies).toEqual(['JS-002']);
    expect(schema.children).toEqual(['JS-003']);
    expect(schema.acceptance_criteria).toEqual(['[x] Done']);
    expect(schema.tests).toEqual(['JS-001T']);
    expect(schema.can_parallelize).toBe(false);
  });

  it('returns copies of arrays', () => {
    const schema = toTaskSchema(sampleTask);
    schema.dependencies.push('X');
    expect(sampleTask.dependencies).not.toContain('X');
  });
});

describe('toTaskContextSchema', () => {
  it('task, parent, deps, dependents, tests, criteria, decisions, action', () => {
    const ctx: TaskContext = {
      task: sampleTask,
      parent: null,
      dependencies: [{ id: 'JS-002', title: 'Dep', status: 'todo' }],
      dependents: [],
      tests: ['JS-001T'],
      acceptance_criteria: ['[x] Done'],
      relevant_decisions: [{ id: 'D01', title: 'TypeScript' }],
      recommended_action: 'start',
    };
    const schema = toTaskContextSchema(ctx);
    expect(schema.task.id).toBe('JS-001');
    expect(schema.parent).toBeNull();
    expect(schema.dependencies.length).toBe(1);
    expect(schema.dependents.length).toBe(0);
    expect(schema.tests).toEqual(['JS-001T']);
    expect(schema.acceptance_criteria).toEqual(['[x] Done']);
    expect(schema.relevant_decisions).toEqual([{ id: 'D01', title: 'TypeScript' }]);
    expect(schema.recommended_action).toBe('start');
  });
});

describe('toSearchResultSchema', () => {
  it('only id/title/status/priority/vertical_slice', () => {
    const schema = toSearchResultSchema(sampleTask);
    expect(Object.keys(schema)).toEqual(['id', 'title', 'status', 'priority', 'vertical_slice']);
    expect(schema.id).toBe('JS-001');
  });
});

describe('toPhaseSchema', () => {
  it('all Phase fields', () => {
    const schema = toPhaseSchema(samplePhase);
    expect(schema).toEqual({
      id: 'PH-001',
      title: 'Phase One',
      description: 'First phase',
      order: 1,
      status: 'done',
      vertical_slice: 'vs-1',
      blocks: ['PH-002'],
    });
  });

  it('returns copy of blocks array', () => {
    const schema = toPhaseSchema(samplePhase);
    schema.blocks.push('X');
    expect(samplePhase.blocks).not.toContain('X');
  });
});

describe('toMilestoneSchema', () => {
  it('all Milestone fields', () => {
    const schema = toMilestoneSchema(sampleMilestone);
    expect(schema).toEqual({
      id: 'MS-001',
      title: 'Milestone One',
      description: 'First milestone',
      tasks: ['T-001', 'T-002'],
      status: 'done',
    });
  });

  it('returns copy of tasks array', () => {
    const schema = toMilestoneSchema(sampleMilestone);
    schema.tasks.push('X');
    expect(sampleMilestone.tasks).not.toContain('X');
  });
});
