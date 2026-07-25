import { describe, it, expect, beforeEach } from 'vitest';
import type { KanbanModel } from '../../../src/kanban/engine/types.js';
import { KanbanRepository } from '../../../src/kanban/engine/repository.js';
import { ContextBuilder } from '../../../src/kanban/engine/context.js';
import { makeKanbanData, buildModel } from './fixtures.js';

let model: KanbanModel;
let repo: KanbanRepository;
let builder: ContextBuilder;

function rebuild(data?: ReturnType<typeof makeKanbanData>) {
  model = buildModel(data ?? makeKanbanData());
  repo = new KanbanRepository(model);
  builder = new ContextBuilder(repo);
}

beforeEach(() => {
  rebuild();
});

describe('buildContext level 1', () => {
  it('returns task data without decisions', () => {
    const ctx = builder.buildContext('T-003', { level: 1 });
    expect(ctx).toBeDefined();
    expect(ctx!.task.id).toBe('T-003');
    expect(ctx!.relevant_decisions).toEqual([]);
  });

  it('includes parent at level 1 (code always computes it)', () => {
    const ctx = builder.buildContext('T-004', { level: 1 });
    expect(ctx).toBeDefined();
    expect(ctx!.parent).toBeDefined();
    expect(ctx!.parent!.id).toBe('T-003');
  });
});

describe('buildContext level 2', () => {
  it('includes parent and dependencies', () => {
    const ctx = builder.buildContext('T-004', { level: 2 });
    expect(ctx).toBeDefined();
    expect(ctx!.parent).toBeDefined();
    expect(ctx!.parent!.id).toBe('T-003');
    expect(ctx!.dependencies).toEqual([]);
  });
});

describe('buildContext level 3 (default)', () => {
  it('includes dependents, tests, criteria, no decisions', () => {
    const ctx = builder.buildContext('T-001');
    expect(ctx).toBeDefined();
    expect(ctx!.dependents.length).toBeGreaterThan(0);
    const ids = ctx!.dependents.map(d => d.id);
    expect(ids).toContain('T-002');
    expect(Array.isArray(ctx!.tests)).toBe(true);
    expect(Array.isArray(ctx!.acceptance_criteria)).toBe(true);
    expect(ctx!.relevant_decisions).toEqual([]);
  });
});

describe('buildContext level 4', () => {
  it('includes relevant decisions', () => {
    const ctx = builder.buildContext('T-001', { level: 4 });
    expect(ctx).toBeDefined();
    expect(Array.isArray(ctx!.relevant_decisions)).toBe(true);
  });
});

describe('recommended_action', () => {
  it('start when status=ready', () => {
    model.tasks.get('T-003')!.status = 'ready';
    const ctx = builder.buildContext('T-003');
    expect(ctx!.recommended_action).toBe('start');
  });

  it('complete when status=in_progress', () => {
    model.tasks.get('T-003')!.status = 'in_progress';
    const ctx = builder.buildContext('T-003');
    expect(ctx!.recommended_action).toBe('complete');
  });

  it('block when status=blocked', () => {
    model.tasks.get('T-003')!.status = 'blocked';
    const ctx = builder.buildContext('T-003');
    expect(ctx!.recommended_action).toBe('block');
  });

  it('wait when status=backlog', () => {
    const ctx = builder.buildContext('T-005');
    expect(ctx!.recommended_action).toBe('wait');
  });
});

describe('getContextSizeEstimate', () => {
  it('returns reasonable byte count', () => {
    const size = builder.getContextSizeEstimate('T-003', 3);
    expect(size).toBeGreaterThan(0);
    expect(typeof size).toBe('number');
  });

  it('returns 0 for nonexistent task', () => {
    expect(builder.getContextSizeEstimate('NONEXISTENT', 3)).toBe(0);
  });
});

describe('buildContext for nonexistent task', () => {
  it('returns undefined', () => {
    expect(builder.buildContext('NONEXISTENT')).toBeUndefined();
  });
});
