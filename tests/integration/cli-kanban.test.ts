import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { resolve } from 'path';
import { mkdirSync, cpSync, rmSync, existsSync } from 'fs';
import { mkdtempSync } from 'fs';
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

function runFail(cmd: string): { stdout: string; stderr: string; status: number | null } {
  try {
    const stdout = execSync(`node "${CLI}" ${cmd}`, { encoding: 'utf-8', cwd: TMP_DIR, stdio: 'pipe' });
    return { stdout: stdout.trim(), stderr: '', status: 0 };
  } catch (e: any) {
    return { stdout: e.stdout?.trim() || '', stderr: e.stderr?.trim() || '', status: e.status };
  }
}

beforeAll(() => {
  TMP_DIR = mkdtempSync(resolve(tmpdir(), 'kanban-cli-test-'));
  mkdirSync(resolve(TMP_DIR, 'planning'), { recursive: true });
  cpSync(KANBAN_JSON, resolve(TMP_DIR, 'planning/kanban.json'));
});

afterAll(() => {
  if (TMP_DIR && existsSync(TMP_DIR)) {
    rmSync(TMP_DIR, { recursive: true, force: true });
  }
});

describe('CLI query commands', () => {
  it('ready --json returns valid JSON array', () => {
    const result = runJson('kanban ready');
    expect(Array.isArray(result)).toBe(true);
  });

  it('next --json returns valid JSON array', () => {
    const result = runJson('kanban next');
    expect(Array.isArray(result)).toBe(true);
  });

  it('show FND-001 --json returns task with required fields', () => {
    const result = runJson('kanban show FND-001');
    expect(result.id).toBe('FND-001');
    expect(result.title).toBeDefined();
    expect(result.status).toBeDefined();
    expect(result.priority).toBeDefined();
    expect(result.phase).toBeDefined();
  });

  it('context FND-001 --json --level 3 returns full context', () => {
    const result = runJson('kanban context FND-001 --level 3');
    expect(result.task).toBeDefined();
    expect(result.task.id).toBe('FND-001');
    expect(result.dependencies).toBeDefined();
    expect(result.dependents).toBeDefined();
    expect(result.acceptance_criteria).toBeDefined();
  });

  it('context FND-001 --json --level 1 returns minimal context', () => {
    const result = runJson('kanban context FND-001 --level 1');
    expect(result.task).toBeDefined();
    expect(result.task.id).toBe('FND-001');
  });

  it('deps FND-001 --json returns array', () => {
    const result = runJson('kanban deps FND-001');
    expect(Array.isArray(result)).toBe(true);
  });

  it('dependents FND-001 --json returns array', () => {
    const result = runJson('kanban dependents FND-001');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('tree FND-001 --json returns tree structure', () => {
    const result = runJson('kanban tree FND-001');
    expect(result.task).toBeDefined();
    expect(result.task.id).toBe('FND-001');
    expect(result.children).toBeDefined();
    expect(Array.isArray(result.children)).toBe(true);
  });

  it('search "offset" --json returns matching results', () => {
    const result = runJson('kanban search "offset"');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result.some((t: any) => t.title.toLowerCase().includes('offset'))).toBe(true);
  });

  it('validate --json returns {valid: true}', () => {
    const result = runJson('kanban validate');
    expect(result.valid).toBe(true);
    expect(result.errors).toBeDefined();
    expect(Array.isArray(result.errors)).toBe(true);
  });

  it('history --json returns array', () => {
    const result = runJson('kanban history');
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('CLI error handling', () => {
  it('show with nonexistent task exits with error', () => {
    const r = runFail('kanban show NONEXISTENT-999');
    expect(r.status).not.toBe(0);
  });

  it('context with nonexistent task exits with error', () => {
    const r = runFail('kanban context NONEXISTENT-999');
    expect(r.status).not.toBe(0);
  });

  it('start on done task fails with invalid transition', () => {
    const r = runFail('kanban start FND-001');
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('Invalid status transition');
  });

  it('help displays available commands', () => {
    const out = run('kanban --help');
    expect(out).toContain('ready');
    expect(out).toContain('show');
    expect(out).toContain('context');
    expect(out).toContain('start');
    expect(out).toContain('complete');
    expect(out).toContain('validate');
  });
});

describe('CLI mutation commands', () => {
  let createdTaskId: string;

  it('add creates a new task', () => {
    const result = runJson('kanban add --title "CLI Test Task" --type test --phase PHASE-KANBAN --priority low');
    expect(result.success).toBe(true);
    expect(result.taskId).toBeDefined();
    createdTaskId = result.taskId;
    const task = runJson(`kanban show ${createdTaskId}`);
    expect(task.title).toBe('CLI Test Task');
  });

  it('show displays the created task', () => {
    const task = runJson(`kanban show ${createdTaskId}`);
    expect(task.id).toBe(createdTaskId);
    expect(task.status).toBe('backlog');
  });

  it('update modifies task fields', () => {
    const result = runJson(`kanban update ${createdTaskId} --title "Updated CLI Task" --priority high`);
    expect(result.success).toBe(true);
    const task = runJson(`kanban show ${createdTaskId}`);
    expect(task.title).toBe('Updated CLI Task');
    expect(task.priority).toBe('high');
  });

  it('add-dependency and remove-dependency work', () => {
    const addResult = runJson(`kanban add-dependency ${createdTaskId} FND-001`);
    expect(addResult.success).toBe(true);
    const deps = runJson(`kanban deps ${createdTaskId}`);
    expect(deps.some((d: any) => d.id === 'FND-001')).toBe(true);

    const removeResult = runJson(`kanban remove-dependency ${createdTaskId} FND-001`);
    expect(removeResult.success).toBe(true);
    const depsAfter = runJson(`kanban deps ${createdTaskId}`);
    expect(depsAfter.every((d: any) => d.id !== 'FND-001')).toBe(true);
  });
});
