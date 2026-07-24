import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { dirname } from 'path';
import type { KanbanModel, TaskStatus, TaskPriority, TaskType } from './types.js';
import { validateGraph } from './dependency-graph.js';
import { VALID_STATUSES, VALID_PRIORITIES, VALID_TYPES } from './types.js';

export interface PersistenceOptions {
  kanbanPath: string;
  historyPath: string;
  validateBeforeWrite: boolean;
}

export class KanbanPersistence {
  private options: PersistenceOptions;

  constructor(options: PersistenceOptions) {
    this.options = options;
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    const kanbanDir = dirname(this.options.kanbanPath);
    const historyDir = dirname(this.options.historyPath);
    if (!existsSync(kanbanDir)) mkdirSync(kanbanDir, { recursive: true });
    if (!existsSync(historyDir)) mkdirSync(historyDir, { recursive: true });
  }

  write(model: KanbanModel): void {
    if (this.options.validateBeforeWrite) {
      const validation = this.validateModel(model);
      if (!validation.valid) {
        throw new Error(`Validation failed before write: ${validation.errors.join(', ')}`);
      }
    }

    const data = this.modelToData(model);
    const tempPath = this.options.kanbanPath + '.tmp';
    const json = JSON.stringify(data, null, 2);

    writeFileSync(tempPath, json, 'utf-8');

    const tempContent = readFileSync(tempPath, 'utf-8');
    JSON.parse(tempContent);

    writeFileSync(this.options.kanbanPath, json, 'utf-8');

    try {
      require('fs').unlinkSync(tempPath);
    } catch {
      // Ignore temp file cleanup errors
    }
  }

  private modelToData(model: KanbanModel): any {
    return {
      project: model.project,
      phases: Array.from(model.phases.values()),
      tasks: Array.from(model.tasks.values()),
      milestones: Array.from(model.milestones.values()),
      decisions: Array.from(model.decisions.values()),
      planning_validation: {
        version: '3.1',
        validation_date: new Date().toISOString().split('T')[0],
        notes: 'Run scripts/validate-kanban.ts for actual automated validation.',
        checks: {},
        task_counts: {
          total: model.tasks.size,
          implementation: Array.from(model.tasks.values()).filter(t => t.type === 'feature').length,
          tests: Array.from(model.tasks.values()).filter(t => t.type === 'test').length,
          setup: Array.from(model.tasks.values()).filter(t => t.type === 'setup').length,
          documentation: Array.from(model.tasks.values()).filter(t => t.type === 'documentation').length,
          test_patterns: Array.from(model.tasks.values()).filter(t => t.type === 'test_pattern').length
        },
        milestone_count: model.milestones.size,
        phase_count: model.phases.size,
        vertical_slice_count: new Set(Array.from(model.tasks.values()).map(t => t.vertical_slice)).size
      }
    };
  }

  private validateModel(model: KanbanModel): { valid: boolean; errors: string[] } {
    const taskIds = Array.from(model.tasks.keys());
    const getDeps = (id: string) => model.tasks.get(id)?.dependencies || [];

    const validation = validateGraph(taskIds, getDeps);
    if (!validation.valid) {
      return validation;
    }

    const errors: string[] = [];

    for (const task of model.tasks.values()) {
      if (!VALID_STATUSES.includes(task.status as TaskStatus)) {
        errors.push(`Task ${task.id}: invalid status ${task.status}`);
      }
      if (!VALID_PRIORITIES.includes(task.priority as TaskPriority)) {
        errors.push(`Task ${task.id}: invalid priority ${task.priority}`);
      }
      if (!VALID_TYPES.includes(task.type as TaskType)) {
        errors.push(`Task ${task.id}: invalid type ${task.type}`);
      }

      for (const dep of task.dependencies) {
        if (!model.tasks.has(dep)) {
          errors.push(`Task ${task.id}: dependency ${dep} does not exist`);
        }
      }

      for (const child of task.children) {
        if (!model.tasks.has(child)) {
          errors.push(`Task ${task.id}: child ${child} does not exist`);
        }
      }

      if (task.parent_id && !model.tasks.has(task.parent_id)) {
        errors.push(`Task ${task.id}: parent ${task.parent_id} does not exist`);
      }

      if (task.parent_id) {
        const parent = model.tasks.get(task.parent_id);
        if (parent && !parent.children.includes(task.id)) {
          errors.push(`Task ${task.id}: parent-child asymmetry with ${task.parent_id}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

export interface KanbanCache {
  model: KanbanModel | null;
  timestamp: number;
  invalidated: boolean;
}

export class KanbanCacheManager {
  private cache: KanbanCache = { model: null, timestamp: 0, invalidated: true };

  get(): KanbanModel | null {
    if (this.cache.invalidated || !this.cache.model) {
      return null;
    }
    return this.cache.model;
  }

  set(model: KanbanModel): void {
    this.cache = {
      model,
      timestamp: Date.now(),
      invalidated: false
    };
  }

  invalidate(): void {
    this.cache.invalidated = true;
  }

  isValid(): boolean {
    return !this.cache.invalidated && !!this.cache.model;
  }
}