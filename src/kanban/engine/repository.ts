import type { KanbanModel, Task, Phase, Milestone, Decision, TaskStatus } from './types.js';

export class KanbanRepository {
  private model: KanbanModel;

  constructor(model: KanbanModel) {
    this.model = model;
  }

  getTask(id: string): Task | undefined {
    return this.model.tasks.get(id);
  }

  getAllTasks(): Task[] {
    return Array.from(this.model.tasks.values());
  }

  getTasksByPhase(phase: string): Task[] {
    const ids = this.model.taskByPhase.get(phase) || [];
    return ids.map(id => this.model.tasks.get(id)!).filter(Boolean);
  }

  getTasksByStatus(status: TaskStatus): Task[] {
    const ids = this.model.taskByStatus.get(status) || [];
    return ids.map(id => this.model.tasks.get(id)!).filter(Boolean);
  }

  getTasksByParent(parentId: string): Task[] {
    const ids = this.model.taskByParent.get(parentId) || [];
    return ids.map(id => this.model.tasks.get(id)!).filter(Boolean);
  }

  getRootTasks(): Task[] {
    return this.getAllTasks().filter(t => !t.parent_id);
  }

  getPhase(id: string): Phase | undefined {
    return this.model.phases.get(id);
  }

  getAllPhases(): Phase[] {
    return Array.from(this.model.phases.values());
  }

  getMilestone(id: string): Milestone | undefined {
    return this.model.milestones.get(id);
  }

  getAllMilestones(): Milestone[] {
    return Array.from(this.model.milestones.values());
  }

  getDecision(id: string): Decision | undefined {
    return this.model.decisions.get(id);
  }

  getAllDecisions(): Decision[] {
    return Array.from(this.model.decisions.values());
  }

  getDependencies(taskId: string): string[] {
    return this.model.dependencyGraph.get(taskId) || [];
  }

  getDependents(taskId: string): string[] {
    return this.model.dependentGraph.get(taskId) || [];
  }

  getDependencyGraph(): Map<string, string[]> {
    return new Map(this.model.dependencyGraph);
  }

  getDependentGraph(): Map<string, string[]> {
    return new Map(this.model.dependentGraph);
  }

  getProject(): KanbanModel['project'] {
    return this.model.project;
  }
}