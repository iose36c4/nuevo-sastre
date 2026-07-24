import { readFileSync, existsSync, statSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import type { KanbanData, KanbanModel, Task, Phase, Milestone, Decision } from './types.js';

export class KanbanLoader {
  private static instance: KanbanLoader;
  private cachedData: KanbanData | null = null;
  private cacheTimestamp: number = 0;
  private readonly kanbanPath: string;

  private constructor(kanbanPath?: string) {
    this.kanbanPath = kanbanPath || resolve(process.cwd(), 'planning/kanban.json');
  }

  static getInstance(kanbanPath?: string): KanbanLoader {
    if (!KanbanLoader.instance) {
      KanbanLoader.instance = new KanbanLoader(kanbanPath);
    }
    return KanbanLoader.instance;
  }

  load(forceReload = false): KanbanData {
    if (!forceReload && this.cachedData && this.isCacheValid()) {
      return this.cachedData;
    }

    if (!existsSync(this.kanbanPath)) {
      throw new Error(`Kanban file not found: ${this.kanbanPath}`);
    }

    const content = readFileSync(this.kanbanPath, 'utf-8');
    let data: KanbanData;

    try {
      data = JSON.parse(content);
    } catch (e) {
      throw new Error(`Failed to parse kanban.json: ${e instanceof Error ? e.message : String(e)}`);
    }

    this.validateStructure(data);
    this.cachedData = data;
    this.cacheTimestamp = Date.now();
    return data;
  }

  private isCacheValid(): boolean {
    try {
      const stats = statSync(this.kanbanPath);
      return stats.mtimeMs <= this.cacheTimestamp;
    } catch {
      return false;
    }
  }

  private validateStructure(data: unknown): asserts data is KanbanData {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid kanban.json: root must be an object');
    }

    const d = data as Record<string, unknown>;

    if (!d.project || typeof d.project !== 'object') {
      throw new Error('Invalid kanban.json: missing project');
    }

    if (!Array.isArray(d.phases)) {
      throw new Error('Invalid kanban.json: phases must be an array');
    }

    if (!Array.isArray(d.tasks)) {
      throw new Error('Invalid kanban.json: tasks must be an array');
    }

    if (!Array.isArray(d.milestones)) {
      throw new Error('Invalid kanban.json: milestones must be an array');
    }

    if (!Array.isArray(d.decisions)) {
      throw new Error('Invalid kanban.json: decisions must be an array');
    }

    const taskIds = new Set<string>();
    for (const task of d.tasks as Task[]) {
      if (!task.id || typeof task.id !== 'string') {
        throw new Error('Invalid kanban.json: task missing id');
      }
      if (taskIds.has(task.id)) {
        throw new Error(`Invalid kanban.json: duplicate task id ${task.id}`);
      }
      taskIds.add(task.id);
    }

    for (const task of d.tasks as Task[]) {
      for (const dep of task.dependencies) {
        if (!taskIds.has(dep)) {
          throw new Error(`Invalid kanban.json: task ${task.id} depends on non-existent task ${dep}`);
        }
      }
      for (const child of task.children) {
        if (!taskIds.has(child)) {
          throw new Error(`Invalid kanban.json: task ${task.id} has non-existent child ${child}`);
        }
      }
      if (task.parent_id && !taskIds.has(task.parent_id)) {
        throw new Error(`Invalid kanban.json: task ${task.id} has non-existent parent ${task.parent_id}`);
      }
    }

    for (const task of d.tasks as Task[]) {
      if (task.parent_id) {
        const parent = (d.tasks as Task[]).find(t => t.id === task.parent_id);
        if (parent && !parent.children.includes(task.id)) {
          throw new Error(`Invalid kanban.json: parent-child asymmetry ${task.id} <-> ${task.parent_id}`);
        }
      }
    }
  }

  getModel(): KanbanModel {
    const data = this.load();
    return this.buildModel(data);
  }

  private buildModel(data: KanbanData): KanbanModel {
    const phases = new Map<string, Phase>();
    const tasks = new Map<string, Task>();
    const milestones = new Map<string, Milestone>();
    const decisions = new Map<string, Decision>();
    const taskByPhase = new Map<string, string[]>();
    const taskByStatus = new Map<string, string[]>();
    const taskByParent = new Map<string, string[]>();
    const dependencyGraph = new Map<string, string[]>();
    const dependentGraph = new Map<string, string[]>();

    for (const phase of data.phases) {
      phases.set(phase.id, phase);
    }

    for (const task of data.tasks) {
      tasks.set(task.id, task);

      if (!taskByPhase.has(task.phase)) {
        taskByPhase.set(task.phase, []);
      }
      taskByPhase.get(task.phase)!.push(task.id);

      if (!taskByStatus.has(task.status)) {
        taskByStatus.set(task.status, []);
      }
      taskByStatus.get(task.status)!.push(task.id);

      if (task.parent_id) {
        if (!taskByParent.has(task.parent_id)) {
          taskByParent.set(task.parent_id, []);
        }
        taskByParent.get(task.parent_id)!.push(task.id);
      }

      dependencyGraph.set(task.id, [...task.dependencies]);
      for (const dep of task.dependencies) {
        if (!dependentGraph.has(dep)) {
          dependentGraph.set(dep, []);
        }
        dependentGraph.get(dep)!.push(task.id);
      }
    }

    for (const milestone of data.milestones) {
      milestones.set(milestone.id, milestone);
    }

    for (const decision of data.decisions) {
      decisions.set(decision.id, decision);
    }

    return {
      project: data.project,
      phases,
      tasks,
      milestones,
      decisions,
      taskByPhase,
      taskByStatus,
      taskByParent,
      dependencyGraph,
      dependentGraph
    };
  }

  invalidateCache(): void {
    this.cachedData = null;
    this.cacheTimestamp = 0;
  }
}