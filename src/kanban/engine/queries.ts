import type { Task, TaskStatus, TaskPriority, Phase, Decision, TaskContext } from './types.js';
import type { KanbanRepository } from './repository.js';

export interface ReadyTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  vertical_slice: string;
}

export interface BlockedTask {
  id: string;
  title: string;
  status: TaskStatus;
  blocked_reason: string;
}

export interface TaskDependency {
  id: string;
  title: string;
  status: TaskStatus;
}

export interface TaskDependent {
  id: string;
  title: string;
  status: TaskStatus;
}

export interface TaskTree {
  task: Task;
  children: TaskTree[];
}

export interface SearchResult {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  vertical_slice: string;
}

export interface NextTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  vertical_slice: string;
}

export interface KanbanQueries {
  getTask(id: string): Task | undefined;
  getReadyTasks(): ReadyTask[];
  getBlockedTasks(): BlockedTask[];
  getTaskContext(taskId: string): TaskContext | undefined;
  getDependencies(taskId: string): TaskDependency[];
  getDependents(taskId: string): TaskDependent[];
  getChildren(taskId: string): Task[];
  getParent(taskId: string): Task | undefined;
  getTree(taskId: string): TaskTree | undefined;
  getNextTasks(): NextTask[];
  searchTasks(query: string): SearchResult[];
  getPhase(id: string): Phase | undefined;
  getAllPhases(): Phase[];
}

export function createQueries(repo: KanbanRepository): KanbanQueries {
  return {
    getTask: (id: string) => repo.getTask(id),

    getReadyTasks: (): ReadyTask[] => {
      const readyTasks: ReadyTask[] = [];
      for (const task of repo.getAllTasks()) {
        if (task.status === 'done' || task.status === 'cancelled') continue;
        if (task.status === 'blocked') continue;

        const deps = repo.getDependencies(task.id);
        const allDepsDone = deps.every((depId: string) => {
          const dep = repo.getTask(depId);
          return dep?.status === 'done';
        });

        if (allDepsDone) {
          readyTasks.push({
            id: task.id,
            title: task.title,
            status: task.status as TaskStatus,
            priority: task.priority as TaskPriority,
            vertical_slice: task.vertical_slice
          });
        }
      }
      return readyTasks.sort((a, b) => priorityOrder(b.priority) - priorityOrder(a.priority));
    },

    getBlockedTasks: (): BlockedTask[] => {
      const blockedTasks: BlockedTask[] = [];
      for (const task of repo.getAllTasks()) {
        if (task.status === 'blocked') {
          blockedTasks.push({
            id: task.id,
            title: task.title,
            status: task.status as TaskStatus,
            blocked_reason: task.blocked_reason || 'No reason provided'
          });
        }
      }
      return blockedTasks;
    },

    getTaskContext: (taskId: string): TaskContext | undefined => {
      const task = repo.getTask(taskId);
      if (!task) return undefined;

      const parent = task.parent_id ? repo.getTask(task.parent_id) || null : null;
      const dependencies = repo.getDependencies(taskId).map((depId: string) => {
        const dep = repo.getTask(depId);
        return dep ? { id: dep.id, title: dep.title, status: dep.status as TaskStatus } : null;
      }).filter(Boolean) as TaskDependency[];

      const dependents = repo.getDependents(taskId).map((depId: string) => {
        const dep = repo.getTask(depId);
        return dep ? { id: dep.id, title: dep.title, status: dep.status as TaskStatus } : null;
      }).filter(Boolean) as TaskDependent[];

      const tests = task.tests.map((testId: string) => repo.getTask(testId)?.title || testId).filter(Boolean);

      const relevantDecisions = repo.getAllDecisions()
        .filter((d: Decision) => task.phase.includes(d.id.replace('D', '')) || d.title.toLowerCase().includes(task.title.toLowerCase().split(' ')[0]))
        .slice(0, 5)
        .map((d: Decision) => ({ id: d.id, title: d.title }));

      let recommendedAction: TaskContext['recommended_action'] = 'wait';
      if (task.status === 'ready') recommendedAction = 'start';
      else if (task.status === 'blocked') recommendedAction = 'block';
      else if (task.status === 'in_progress' || task.status === 'review') recommendedAction = 'complete';
      else if (task.children.length > 0) recommendedAction = 'split';

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
    },

    getDependencies: (taskId: string): TaskDependency[] => {
      return repo.getDependencies(taskId).map((depId: string) => {
        const dep = repo.getTask(depId);
        return dep ? { id: dep.id, title: dep.title, status: dep.status as TaskStatus } : null;
      }).filter(Boolean) as TaskDependency[];
    },

    getDependents: (taskId: string): TaskDependent[] => {
      return repo.getDependents(taskId).map((depId: string) => {
        const dep = repo.getTask(depId);
        return dep ? { id: dep.id, title: dep.title, status: dep.status as TaskStatus } : null;
      }).filter(Boolean) as TaskDependent[];
    },

    getChildren: (taskId: string): Task[] => {
      return repo.getTasksByParent(taskId);
    },

    getParent: (taskId: string): Task | undefined => {
      const task = repo.getTask(taskId);
      return task?.parent_id ? repo.getTask(task.parent_id) : undefined;
    },

    getTree: (taskId: string): TaskTree | undefined => {
      const task = repo.getTask(taskId);
      if (!task) return undefined;

      const buildTree = (t: Task): TaskTree => {
        const children = repo.getTasksByParent(t.id).map(buildTree);
        return { task: t, children };
      };

      return buildTree(task);
    },

    getNextTasks: (): NextTask[] => {
      const ready = createQueries(repo).getReadyTasks();
      return ready.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        vertical_slice: t.vertical_slice
      }));
    },

    searchTasks: (query: string): SearchResult[] => {
      const lowerQuery = query.toLowerCase();
      return repo.getAllTasks()
        .filter((t: Task) => t.title.toLowerCase().includes(lowerQuery) || t.description.toLowerCase().includes(lowerQuery))
        .map((t: Task) => ({
          id: t.id,
          title: t.title,
          status: t.status as TaskStatus,
          priority: t.priority as TaskPriority,
          vertical_slice: t.vertical_slice
        }));
    },

    getPhase: (id: string): Phase | undefined => repo.getPhase(id),

    getAllPhases: (): Phase[] => repo.getAllPhases()
  };
}

function priorityOrder(priority: TaskPriority): number {
  switch (priority) {
    case 'critical': return 4;
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 0;
  }
}