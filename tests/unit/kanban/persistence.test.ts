import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { writeFileSync, readFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { KanbanPersistence, KanbanCacheManager } from '../../../src/kanban/engine/persistence.js';
import { makeKanbanData, buildModel, makeTask } from './fixtures.js';
import type { KanbanModel } from '../../../src/kanban/engine/types.js';

const TMP_DIR = join('/tmp', 'kanban-persistence-test');

function makeSimpleModel(): KanbanModel {
  const tasks = [
    makeTask({ id: 'P-001', phase: 'p1', dependencies: [] }),
    makeTask({ id: 'P-002', phase: 'p1', dependencies: ['P-001'] }),
  ];
  return buildModel({
    project: makeKanbanData().project,
    phases: [{ id: 'p1', title: 'P1', description: '', order: 1, status: 'todo', vertical_slice: 'vs-1', blocks: [] }],
    tasks,
    milestones: [],
    decisions: [],
  });
}

describe('KanbanPersistence', () => {
  const kanbanPath = join(TMP_DIR, 'kanban.json');
  const historyPath = join(TMP_DIR, 'history.json');

  beforeAll(() => {
    if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });
  });

  afterAll(() => {
    if (existsSync(TMP_DIR)) rmSync(TMP_DIR, { recursive: true });
  });

  beforeEach(() => {
    if (existsSync(kanbanPath)) rmSync(kanbanPath);
    if (existsSync(historyPath)) rmSync(historyPath);
  });

  it('write creates valid JSON file', () => {
    const persistence = new KanbanPersistence({ kanbanPath, historyPath, validateBeforeWrite: false });
    const model = makeSimpleModel();

    persistence.write(model);
    expect(existsSync(kanbanPath)).toBe(true);

    const content = readFileSync(kanbanPath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed.project.name).toBe('test-project');
    expect(parsed.tasks.length).toBe(2);
    expect(parsed.phases.length).toBe(1);
  });

  it('write with validateBeforeWrite validates model', () => {
    const persistence = new KanbanPersistence({ kanbanPath, historyPath, validateBeforeWrite: true });
    const model = makeSimpleModel();

    expect(() => persistence.write(model)).not.toThrow();
    expect(existsSync(kanbanPath)).toBe(true);
  });

  it('write with validateBeforeWrite rejects invalid model', () => {
    const persistence = new KanbanPersistence({ kanbanPath, historyPath, validateBeforeWrite: true });
    const model = makeSimpleModel();

    const badTask = makeTask({ id: 'BAD-1', phase: 'p1', status: 'invalid_status', dependencies: [] });
    model.tasks.set('BAD-1', badTask);

    expect(() => persistence.write(model)).toThrow('Validation failed before write');
  });

  it('atomic write pattern produces correct temp file and final file', () => {
    const persistence = new KanbanPersistence({ kanbanPath, historyPath, validateBeforeWrite: false });
    const model = makeSimpleModel();

    persistence.write(model);

    const tempPath = kanbanPath + '.tmp';
    expect(existsSync(tempPath)).toBe(false);

    const content = readFileSync(kanbanPath, 'utf-8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it('write generates planning_validation', () => {
    const persistence = new KanbanPersistence({ kanbanPath, historyPath, validateBeforeWrite: false });
    const model = makeSimpleModel();

    persistence.write(model);

    const parsed = JSON.parse(readFileSync(kanbanPath, 'utf-8'));
    expect(parsed.planning_validation).toBeDefined();
    expect(parsed.planning_validation.task_counts.total).toBe(2);
  });

  it('creates directories if they do not exist', () => {
    const deepDir = join(TMP_DIR, 'deep', 'nested');
    const deepKanban = join(deepDir, 'kanban.json');
    const deepHistory = join(deepDir, 'history.json');

    const persistence = new KanbanPersistence({ kanbanPath: deepKanban, historyPath: deepHistory, validateBeforeWrite: false });
    persistence.write(makeSimpleModel());
    expect(existsSync(deepKanban)).toBe(true);

    rmSync(join(TMP_DIR, 'deep'), { recursive: true });
  });
});

describe('KanbanCacheManager', () => {
  it('get returns null when cache is invalidated', () => {
    const cache = new KanbanCacheManager();
    expect(cache.get()).toBeNull();
  });

  it('set stores model and get returns it', () => {
    const cache = new KanbanCacheManager();
    const model = makeSimpleModel();

    cache.set(model);
    expect(cache.get()).toBe(model);
  });

  it('invalidate clears cache', () => {
    const cache = new KanbanCacheManager();
    cache.set(makeSimpleModel());
    expect(cache.isValid()).toBe(true);

    cache.invalidate();
    expect(cache.isValid()).toBe(false);
    expect(cache.get()).toBeNull();
  });

  it('isValid returns false for new cache', () => {
    const cache = new KanbanCacheManager();
    expect(cache.isValid()).toBe(false);
  });

  it('isValid returns true after set', () => {
    const cache = new KanbanCacheManager();
    cache.set(makeSimpleModel());
    expect(cache.isValid()).toBe(true);
  });

  it('isValid returns false after invalidate', () => {
    const cache = new KanbanCacheManager();
    cache.set(makeSimpleModel());
    cache.invalidate();
    expect(cache.isValid()).toBe(false);
  });
});
