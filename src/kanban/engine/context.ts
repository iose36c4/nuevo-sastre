import type { KanbanRepository } from './repository.js';
import type { Task, TaskStatus, TaskContext, Decision } from './types.js';

export interface ContextLevel {
  level: 1 | 2 | 3 | 4 | 5;
  name: string;
  description: string;
}

export const CONTEXT_LEVELS: ContextLevel[] = [
  { level: 1, name: 'minimal', description: 'Task only' },
  { level: 2, name: 'direct', description: 'Task + parent + direct dependencies' },
  { level: 3, name: 'operational', description: 'Task + parent + deps + dependents + tests + criteria (DEFAULT)' },
  { level: 4, name: 'decisions', description: 'Operational + relevant architectural decisions' },
  { level: 5, name: 'architecture', description: 'Decisions + related architecture sections' }
];

export interface ContextOptions {
  level?: 1 | 2 | 3 | 4 | 5;
  includeDecisions?: boolean;
  includeArchitecture?: boolean;
}

export class ContextBuilder {
  private repo: KanbanRepository;

  constructor(repo: KanbanRepository) {
    this.repo = repo;
  }

  buildContext(taskId: string, options: ContextOptions = {}): TaskContext | undefined {
    const level = options.level || 3;
    const task = this.repo.getTask(taskId);
    if (!task) return undefined;

    const parent = task.parent_id ? this.repo.getTask(task.parent_id) || null : null;
    const dependencies = this.repo.getDependencies(taskId).map((depId: string) => {
      const dep = this.repo.getTask(depId);
      return dep ? { id: dep.id, title: dep.title, status: dep.status as TaskStatus } : null;
    }).filter(Boolean) as { id: string; title: string; status: TaskStatus }[];

    const dependents = this.repo.getDependents(taskId).map((depId: string) => {
      const dep = this.repo.getTask(depId);
      return dep ? { id: dep.id, title: dep.title, status: dep.status as TaskStatus } : null;
    }).filter(Boolean) as { id: string; title: string; status: TaskStatus }[];

    const tests = task.tests.map((testId: string) => this.repo.getTask(testId)?.title || testId).filter(Boolean);

    let relevantDecisions: { id: string; title: string }[] = [];
    if (level >= 4 || options.includeDecisions) {
      relevantDecisions = this.getRelevantDecisions(task);
    }

    let recommendedAction: TaskContext['recommended_action'] = 'wait';
    if (task.status === 'ready') recommendedAction = 'start';
    else if (task.status === 'blocked') recommendedAction = 'block';
    else if (task.status === 'in_progress' || task.status === 'review') recommendedAction = 'complete';
    else if (task.children.length > 0) recommendedAction = 'split';
    else if (task.status === 'backlog' || task.status === 'todo') recommendedAction = 'wait';

    return {
      task,
      parent,
      dependencies,
      dependents,
      tests,
      acceptance_criteria: task.acceptance_criteria,
      relevant_decisions: relevantDecisions,
      recommended_action: recommendedAction
    };
  }

  private getRelevantDecisions(task: Task): { id: string; title: string }[] {
    const allDecisions = this.repo.getAllDecisions();
    const taskKeywords = this.extractKeywords(task.title + ' ' + task.description);

    return allDecisions
      .filter((d: Decision) => {
        const decisionKeywords = this.extractKeywords(d.title);
        return decisionKeywords.some(kw => taskKeywords.includes(kw)) ||
               taskKeywords.some(kw => decisionKeywords.includes(kw)) ||
               d.title.toLowerCase().includes(task.phase.toLowerCase());
      })
      .slice(0, 5)
      .map((d: Decision) => ({ id: d.id, title: d.title }));
  }

  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 20);
  }

  getContextSizeEstimate(taskId: string, level: 1 | 2 | 3 | 4 | 5): number {
    const context = this.buildContext(taskId, { level });
    if (!context) return 0;
    return JSON.stringify(context).length;
  }
}