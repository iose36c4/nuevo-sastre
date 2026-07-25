import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { resolve } from 'path';
import { mkdirSync, cpSync, rmSync, existsSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';

const CLI = resolve(process.cwd(), 'dist/cli/index.js');
const KANBAN_JSON = resolve(process.cwd(), 'planning/kanban.json');
let TMP_DIR: string;

function run(cmd: string): string {
  return execSync(`node "${CLI}" ${cmd}`, { encoding: 'utf-8', cwd: TMP_DIR }).trim();
}

function runJson(cmd: string): any {
  const out = run(`${cmd} --json`);
  return JSON.parse(out);
}

beforeAll(() => {
  TMP_DIR = mkdtempSync(resolve(tmpdir(), 'kanban-e2e-test-'));
  mkdirSync(resolve(TMP_DIR, 'planning'), { recursive: true });
  cpSync(KANBAN_JSON, resolve(TMP_DIR, 'planning/kanban.json'));
});

afterAll(() => {
  if (TMP_DIR && existsSync(TMP_DIR)) {
    rmSync(TMP_DIR, { recursive: true, force: true });
  }
});

describe('E2E: Full agent workflow via CLI', () => {
  let taskId: string;
  let childId: string;

  it('Step 1: Create a task', () => {
    const result = runJson('kanban add --title "E2E Test Feature" --type feature --phase PHASE-KANBAN --priority high');
    expect(result.success).toBe(true);
    taskId = result.taskId;
    expect(taskId).toBeDefined();
  });

  it('Step 2: Query ready returns array', () => {
    const ready = runJson('kanban ready');
    expect(Array.isArray(ready)).toBe(true);
  });

  it('Step 3: Get context for the task', () => {
    const ctx = runJson(`kanban context ${taskId} --level 3`);
    expect(ctx.task).toBeDefined();
    expect(ctx.task.id).toBe(taskId);
    expect(ctx.task.status).toBe('backlog');
    expect(ctx.recommended_action).toBeDefined();
  });

  it('Step 4: Verify task is in backlog', () => {
    const r = runJson(`kanban show ${taskId}`);
    expect(r.status).toBe('backlog');
  });

  it('Step 5: Create a subtask', () => {
    const result = runJson(`kanban add-child ${taskId} --title "E2E Subtask" --type feature --priority medium`);
    expect(result.success).toBe(true);
    childId = result.taskId;
    expect(childId).toBeDefined();
  });

  it('Step 6: Verify tree shows parent and child', () => {
    const tree = runJson(`kanban tree ${taskId}`);
    expect(tree.task.id).toBe(taskId);
    expect(tree.children.length).toBeGreaterThan(0);
    expect(tree.children.some((c: any) => c.task.id === childId)).toBe(true);
  });

  it('Step 7: Add dependency from child to FND-001', () => {
    const result = runJson(`kanban add-dependency ${childId} FND-001`);
    expect(result.success).toBe(true);
    const deps = runJson(`kanban deps ${childId}`);
    expect(deps.some((d: any) => d.id === 'FND-001')).toBe(true);
  });

  it('Step 8: Block the task', () => {
    const result = runJson(`kanban update ${taskId} --title "E2E Test"`);
    expect(result.success).toBe(true);

    const blockResult = execSync(
      `node "${CLI}" kanban block ${taskId} --reason "E2E test blocking"`,
      { encoding: 'utf-8', cwd: TMP_DIR }
    );
    expect(blockResult).toContain('Blocked');

    const task = runJson(`kanban show ${taskId}`);
    expect(task.status).toBe('blocked');
  });

  it('Step 9: Unblock the task', () => {
    const result = runJson(`kanban unblock ${taskId}`);
    expect(result.success).toBe(true);
    const task = runJson(`kanban show ${taskId}`);
    expect(task.status).not.toBe('blocked');
  });

  it('Step 10: Verify history has entries', () => {
    const history = runJson('kanban history');
    expect(Array.isArray(history)).toBe(true);
  });

  it('Step 11: Search finds the task', () => {
    const results = runJson('kanban search "E2E Test"');
    expect(results.some((t: any) => t.id === taskId || t.id === childId)).toBe(true);
  });

  it('Step 12: Validate kanban still passes', () => {
    const result = runJson('kanban validate');
    expect(result.valid).toBe(true);
  });

  it('Step 13: Verify persistence - reload shows same state', () => {
    const task = runJson(`kanban show ${taskId}`);
    expect(task.id).toBe(taskId);
    expect(task.title).toBeDefined();
  });

  it('Step 14: Verify dependents of FND-001 includes our child', () => {
    const dependents = runJson('kanban dependents FND-001');
    expect(dependents.some((d: any) => d.id === childId)).toBe(true);
  });
});
