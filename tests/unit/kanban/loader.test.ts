import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { KanbanLoader } from '../../../src/kanban/engine/loader.js';
import { makeKanbanData } from './fixtures.js';

const TMP_DIR = join('/tmp', 'kanban-loader-test');
const KANBAN_PATH = join(TMP_DIR, 'kanban.json');

describe('KanbanLoader', () => {
  beforeAll(() => {
    if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });
  });

  afterAll(() => {
    if (existsSync(TMP_DIR)) rmSync(TMP_DIR, { recursive: true });
  });

  beforeEach(() => {
    writeFileSync(KANBAN_PATH, JSON.stringify(makeKanbanData(), null, 2), 'utf-8');
  });

  it('throws on missing file', () => {
    const loader = KanbanLoader.getInstance(KANBAN_PATH);
    loader.invalidateCache();
    unlinkSync(KANBAN_PATH);
    expect(() => loader.load(true)).toThrow('Kanban file not found');
  });

  it('loads valid kanban.json successfully', () => {
    const loader = KanbanLoader.getInstance(KANBAN_PATH);
    loader.invalidateCache();
    const data = loader.load(true);
    expect(data.project.name).toBe('test-project');
    expect(data.tasks.length).toBe(5);
    expect(data.phases.length).toBe(3);
  });

  it('throws on invalid JSON', () => {
    writeFileSync(KANBAN_PATH, 'not valid json {{{', 'utf-8');
    const loader = KanbanLoader.getInstance(KANBAN_PATH);
    loader.invalidateCache();
    expect(() => loader.load(true)).toThrow('Failed to parse kanban.json');
  });

  it('throws on missing project field', () => {
    writeFileSync(KANBAN_PATH, JSON.stringify({ phases: [], tasks: [], milestones: [], decisions: [] }), 'utf-8');
    const loader = KanbanLoader.getInstance(KANBAN_PATH);
    loader.invalidateCache();
    expect(() => loader.load(true)).toThrow('missing project');
  });

  it('throws on duplicate task ids', () => {
    const data = makeKanbanData();
    data.tasks.push({ ...data.tasks[0], id: 'T-001' });
    writeFileSync(KANBAN_PATH, JSON.stringify(data, null, 2), 'utf-8');
    const loader = KanbanLoader.getInstance(KANBAN_PATH);
    loader.invalidateCache();
    expect(() => loader.load(true)).toThrow('duplicate task id T-001');
  });

  it('builds KanbanModel with all indexes', () => {
    const loader = KanbanLoader.getInstance(KANBAN_PATH);
    loader.invalidateCache();
    const model = loader.getModel();

    expect(model.tasks.size).toBe(5);
    expect(model.phases.size).toBe(3);
    expect(model.milestones.size).toBe(1);
    expect(model.decisions.size).toBe(1);

    expect(model.taskByPhase.get('phase-1')).toEqual(['T-001', 'T-002']);
    expect(model.taskByPhase.get('phase-2')).toEqual(['T-003', 'T-004']);
    expect(model.taskByPhase.get('phase-3')).toEqual(['T-005']);

    expect(model.taskByStatus.get('done')).toEqual(['T-001']);
    expect(model.taskByStatus.get('todo')).toEqual(['T-002', 'T-004']);
    expect(model.taskByStatus.get('ready')).toEqual(['T-003']);
    expect(model.taskByStatus.get('backlog')).toEqual(['T-005']);

    expect(model.taskByParent.get('T-003')).toEqual(['T-004']);
  });

  it('invalidateCache forces reload from disk', () => {
    const loader = KanbanLoader.getInstance(KANBAN_PATH);
    loader.load(true);
    loader.invalidateCache();

    const modifiedData = makeKanbanData();
    modifiedData.project.name = 'modified-project';
    writeFileSync(KANBAN_PATH, JSON.stringify(modifiedData, null, 2), 'utf-8');

    const reloaded = loader.load(true);
    expect(reloaded.project.name).toBe('modified-project');
  });

  it('uses cache when file unchanged', () => {
    const loader = KanbanLoader.getInstance(KANBAN_PATH);
    loader.invalidateCache();
    const first = loader.load(true);
    const second = loader.load();
    expect(first).toBe(second);
  });

  it('builds correct dependency and dependent graphs', () => {
    const loader = KanbanLoader.getInstance(KANBAN_PATH);
    loader.invalidateCache();
    const model = loader.getModel();

    expect(model.dependencyGraph.get('T-001')).toEqual([]);
    expect(model.dependencyGraph.get('T-002')).toEqual(['T-001']);
    expect(model.dependencyGraph.get('T-003')).toEqual(['T-001', 'T-002']);
    expect(model.dependencyGraph.get('T-004')).toEqual([]);
    expect(model.dependencyGraph.get('T-005')).toEqual(['T-003']);

    expect(model.dependentGraph.get('T-001')).toEqual(['T-002', 'T-003']);
    expect(model.dependentGraph.get('T-002')).toEqual(['T-003']);
    expect(model.dependentGraph.get('T-003')).toEqual(['T-005']);
  });
});
