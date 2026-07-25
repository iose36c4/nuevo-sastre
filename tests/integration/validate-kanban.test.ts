import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { resolve } from 'path';
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';

const SCRIPT = resolve(process.cwd(), 'scripts/validate-kanban.ts');
const TMP_DIR = resolve(process.cwd(), '.test-validate-kanban');
const TMP_KANBAN = resolve(TMP_DIR, 'planning/kanban.json');

function runWithFixture(data: any): { stdout: string; stderr: string; status: number | null } {
  mkdirSync(resolve(TMP_DIR, 'planning'), { recursive: true });
  writeFileSync(TMP_KANBAN, JSON.stringify(data, null, 2));

  try {
    const stdout = execSync(`npx tsx "${SCRIPT}"`, { encoding: 'utf-8', cwd: TMP_DIR, stdio: 'pipe' });
    return { stdout: stdout.trim(), stderr: '', status: 0 };
  } catch (e: any) {
    return { stdout: e.stdout?.trim() || '', stderr: e.stderr?.trim() || '', status: e.status };
  }
}

function validKanban() {
  return {
    project: { name: 'test', version: '1.0', description: '', language: 'ts', runtime: 'node', testing_framework: 'vitest', linter: 'eslint', type_checker: 'tsc', coordinate_system: 'y-up', internal_unit: 'mm', build_order: '', created: '', repository: '', dsl_versions: [], floating_point: {} },
    phases: [{ id: 'PHASE-00', title: 'Test', description: '', order: 0, status: 'done', vertical_slice: 'VS-01', blocks: [] }],
    tasks: [
      { id: 'T-001', parent_id: null, phase: 'PHASE-00', title: 'Task 1', description: '', status: 'done', priority: 'high', type: 'feature', vertical_slice: 'VS-01', parallel_group: 'default', dependencies: [], children: ['T-002'], acceptance_criteria: [], deliverables: [], tests: ['T-002'], documentation: [], estimated_complexity: 'small', can_parallelize: false, notes: [] },
      { id: 'T-002', parent_id: 'T-001', phase: 'PHASE-00', title: 'Test for Task 1', description: '', status: 'done', priority: 'high', type: 'test', vertical_slice: 'VS-01', parallel_group: 'default', dependencies: ['T-001'], children: [], acceptance_criteria: [], deliverables: [], tests: [], documentation: [], estimated_complexity: 'small', can_parallelize: false, notes: [] }
    ],
    milestones: [{ id: 'M-001', title: 'M1', description: '', tasks: ['T-001'], status: 'done' }],
    decisions: []
  };
}

afterAll(() => {
  if (existsSync(TMP_DIR)) rmSync(TMP_DIR, { recursive: true });
});

describe('validate-kanban script', () => {
  it('passes with valid data', () => {
    const r = runWithFixture(validKanban());
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('passed');
  });

  it('fails with duplicate IDs', () => {
    const data = validKanban();
    data.tasks.push({ ...data.tasks[0], id: 'T-001' });
    const r = runWithFixture(data);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('unique_ids');
  });

  it('fails with nonexistent dependency', () => {
    const data = validKanban();
    data.tasks[0].dependencies = ['NONEXISTENT'];
    const r = runWithFixture(data);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('all_dependency_ids_exist');
  });

  it('fails with circular dependency', () => {
    const data = validKanban();
    data.tasks = [
      { id: 'A', parent_id: null, phase: 'PHASE-00', title: 'A', description: '', status: 'done', priority: 'high', type: 'feature', vertical_slice: 'VS-01', parallel_group: 'default', dependencies: ['B'], children: [], acceptance_criteria: [], deliverables: [], tests: [], documentation: [], estimated_complexity: 'small', can_parallelize: false, notes: [] },
      { id: 'B', parent_id: null, phase: 'PHASE-00', title: 'B', description: '', status: 'done', priority: 'high', type: 'feature', vertical_slice: 'VS-01', parallel_group: 'default', dependencies: ['A'], children: [], acceptance_criteria: [], deliverables: [], tests: [], documentation: [], estimated_complexity: 'small', can_parallelize: false, notes: [] }
    ];
    const r = runWithFixture(data);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('no_dependency_cycles');
  });

  it('fails with asymmetric parent-child', () => {
    const data = validKanban();
    data.tasks[0].children = ['T-002'];
    data.tasks[1].parent_id = null;
    const r = runWithFixture(data);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('parent_child_references_are_symmetric');
  });

  it('fails with nonexistent phase reference', () => {
    const data = validKanban();
    data.tasks[0].phase = 'NONEXISTENT';
    const r = runWithFixture(data);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('all_tasks_have_phase_reference');
  });

  it('fails with nonexistent milestone task', () => {
    const data = validKanban();
    data.milestones[0].tasks = ['NONEXISTENT'];
    const r = runWithFixture(data);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('all_milestone_task_ids_exist');
  });
});
