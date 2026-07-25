import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { writeFileSync, readFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { KanbanHistory } from '../../../src/kanban/engine/history.js';

const TMP_DIR = join('/tmp', 'kanban-history-test');
const HISTORY_PATH = join(TMP_DIR, 'history.json');

describe('KanbanHistory', () => {
  beforeAll(() => {
    if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });
  });

  afterAll(() => {
    if (existsSync(TMP_DIR)) rmSync(TMP_DIR, { recursive: true });
  });

  beforeEach(() => {
    if (existsSync(HISTORY_PATH)) rmSync(HISTORY_PATH);
  });

  it('record creates entry with timestamp', () => {
    const history = new KanbanHistory(HISTORY_PATH);
    history.record({
      operation: 'start',
      taskId: 'T-001',
      success: true,
    });

    const content = readFileSync(HISTORY_PATH, 'utf-8');
    const entry = JSON.parse(content.trim());
    expect(entry.timestamp).toBeDefined();
    expect(entry.operation).toBe('start');
    expect(entry.taskId).toBe('T-001');
    expect(entry.success).toBe(true);
  });

  it('record appends multiple entries', () => {
    const history = new KanbanHistory(HISTORY_PATH);
    history.record({ operation: 'start', taskId: 'T-001', success: true });
    history.record({ operation: 'complete', taskId: 'T-001', success: true });

    const lines = readFileSync(HISTORY_PATH, 'utf-8').trim().split('\n');
    expect(lines.length).toBe(2);
  });

  it('query returns entries in reverse file order', () => {
    const history = new KanbanHistory(HISTORY_PATH);

    writeFileSync(
      HISTORY_PATH,
      [
        JSON.stringify({ timestamp: '2024-01-01T00:00:00.000Z', operation: 'first', taskId: 'T-001', success: true }),
        JSON.stringify({ timestamp: '2024-01-02T00:00:00.000Z', operation: 'second', taskId: 'T-001', success: true }),
        JSON.stringify({ timestamp: '2024-01-03T00:00:00.000Z', operation: 'third', taskId: 'T-001', success: true }),
      ].join('\n') + '\n',
      'utf-8',
    );

    const entries = history.query();
    expect(entries.length).toBe(3);
    expect(entries[0].operation).toBe('third');
    expect(entries[1].operation).toBe('second');
    expect(entries[2].operation).toBe('first');
  });

  it('query with taskId filter works', () => {
    const history = new KanbanHistory(HISTORY_PATH);

    writeFileSync(
      HISTORY_PATH,
      [
        JSON.stringify({ timestamp: '2024-01-01T00:00:00.000Z', operation: 'op1', taskId: 'T-001', success: true }),
        JSON.stringify({ timestamp: '2024-01-02T00:00:00.000Z', operation: 'op2', taskId: 'T-002', success: true }),
        JSON.stringify({ timestamp: '2024-01-03T00:00:00.000Z', operation: 'op3', taskId: 'T-001', success: true }),
      ].join('\n') + '\n',
      'utf-8',
    );

    const entries = history.query('T-001');
    expect(entries.length).toBe(2);
    expect(entries.every(e => e.taskId === 'T-001')).toBe(true);
  });

  it('query with limit works', () => {
    const history = new KanbanHistory(HISTORY_PATH);

    const lines = [];
    for (let i = 1; i <= 5; i++) {
      lines.push(JSON.stringify({ timestamp: `2024-01-0${i}T00:00:00.000Z`, operation: `op${i}`, taskId: 'T-001', success: true }));
    }
    writeFileSync(HISTORY_PATH, lines.join('\n') + '\n', 'utf-8');

    const entries = history.query(undefined, 2);
    expect(entries.length).toBe(2);
    expect(entries[0].operation).toBe('op5');
  });

  it('getAll returns all entries', () => {
    const history = new KanbanHistory(HISTORY_PATH);

    writeFileSync(
      HISTORY_PATH,
      [
        JSON.stringify({ timestamp: '2024-01-01T00:00:00.000Z', operation: 'op1', taskId: 'T-001', success: true }),
        JSON.stringify({ timestamp: '2024-01-02T00:00:00.000Z', operation: 'op2', taskId: 'T-002', success: true }),
      ].join('\n') + '\n',
      'utf-8',
    );

    const entries = history.getAll();
    expect(entries.length).toBe(2);
  });

  it('query returns empty for nonexistent file', () => {
    const history = new KanbanHistory('/tmp/nonexistent-history-file.json');
    expect(history.query()).toEqual([]);
  });

  it('query skips malformed lines', () => {
    const history = new KanbanHistory(HISTORY_PATH);

    writeFileSync(
      HISTORY_PATH,
      [
        JSON.stringify({ timestamp: '2024-01-01T00:00:00.000Z', operation: 'valid', taskId: 'T-001', success: true }),
        'this is not json',
        JSON.stringify({ timestamp: '2024-01-02T00:00:00.000Z', operation: 'also-valid', taskId: 'T-002', success: true }),
      ].join('\n') + '\n',
      'utf-8',
    );

    const entries = history.query();
    expect(entries.length).toBe(2);
  });

  it('record includes agentId when provided', () => {
    const history = new KanbanHistory(HISTORY_PATH);
    history.record({
      operation: 'start',
      taskId: 'T-001',
      agentId: 'agent-1',
      success: true,
    });

    const entry = JSON.parse(readFileSync(HISTORY_PATH, 'utf-8').trim());
    expect(entry.agentId).toBe('agent-1');
  });
});
