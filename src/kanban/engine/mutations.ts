import type { KanbanRepository, Task, TaskStatus, TaskPriority, TaskType, KanbanModel } from '../engine/index.js';
import { detectCycles } from './dependency-graph.js';
import { VALID_PRIORITIES, VALID_TYPES, isValidStatusTransition, generateTaskId } from './types.js';

export interface MutationResult {
  success: boolean;
  taskId?: string;
  error?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  type?: TaskType;
  parent_id?: string;
  phase?: string;
  priority?: TaskPriority;
  vertical_slice?: string;
  parallel_group?: string;
  dependencies?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  type?: TaskType;
  priority?: TaskPriority;
  vertical_slice?: string;
  parallel_group?: string;
  acceptance_criteria?: string[];
  deliverables?: string[];
  tests?: string[];
  documentation?: string[];
  estimated_complexity?: string;
  can_parallelize?: boolean;
  notes?: string[];
}

export function createMutations(
  repo: KanbanRepository, 
  model: KanbanModel, 
  persist: (model: KanbanModel) => void
) {
  return {
    createTask: (input: CreateTaskInput): MutationResult => {
      const existingIds = new Set(model.tasks.keys());
      const prefix = input.parent_id ? input.parent_id.split('-')[0] : 'TASK';
      const id = generateTaskId(prefix, existingIds);

      const parent = input.parent_id ? repo.getTask(input.parent_id) : null;
      if (input.parent_id && !parent) {
        return { success: false, error: `Parent task ${input.parent_id} not found` };
      }

      const phase = input.phase || (parent?.phase || 'PHASE-00');
      const verticalSlice = input.vertical_slice || (parent?.vertical_slice || 'VS-01');
      const parallelGroup = input.parallel_group || 'default';

      const newTask: Task = {
        id,
        parent_id: input.parent_id || null,
        phase,
        title: input.title,
        description: input.description || '',
        status: 'backlog',
        priority: input.priority || 'medium',
        type: input.type || 'feature',
        vertical_slice: verticalSlice,
        parallel_group: parallelGroup,
        dependencies: input.dependencies || [],
        children: [],
        acceptance_criteria: [],
        deliverables: [],
        tests: [],
        documentation: [],
        estimated_complexity: 'small',
        can_parallelize: false,
        notes: []
      };

      if (input.dependencies) {
        for (const depId of input.dependencies) {
          if (!repo.getTask(depId)) {
            return { success: false, error: `Dependency ${depId} not found` };
          }
          if (depId === id) {
            return { success: false, error: 'Cannot add self-dependency' };
          }
        }

        const testGraph = new Map(model.dependencyGraph);
        testGraph.set(id, [...(input.dependencies || [])]);
        for (const depId of input.dependencies || []) {
          const deps = testGraph.get(depId) || [];
          deps.push(id);
          testGraph.set(depId, deps);
        }

        const cycles = detectCycles(testGraph);
        if (cycles.length > 0) {
          return { success: false, error: `Adding dependencies would create cycle: ${cycles[0].join(' -> ')}` };
        }
      }

      model.tasks.set(id, newTask);
      model.dependencyGraph.set(id, [...(input.dependencies || [])]);
      model.dependentGraph.set(id, []);

      for (const depId of input.dependencies || []) {
        const deps = model.dependentGraph.get(depId) || [];
        deps.push(id);
        model.dependentGraph.set(depId, deps);
      }

      if (input.parent_id) {
        const children = model.taskByParent.get(input.parent_id) || [];
        children.push(id);
        model.taskByParent.set(input.parent_id, children);

        const parentTask = model.tasks.get(input.parent_id);
        if (parentTask) {
          parentTask.children.push(id);
        }
      }

      const phaseTasks = model.taskByPhase.get(phase) || [];
      phaseTasks.push(id);
      model.taskByPhase.set(phase, phaseTasks);

      const statusTasks = model.taskByStatus.get('backlog') || [];
      statusTasks.push(id);
      model.taskByStatus.set('backlog', statusTasks);

      persist(model);
      return { success: true, taskId: id };
    },

    createSubtask: (parentId: string, input: CreateTaskInput): MutationResult => {
      return createMutations(repo, model, persist).createTask({
        ...input,
        parent_id: parentId,
        phase: input.phase || undefined
      });
    },

    updateTask: (taskId: string, input: UpdateTaskInput): MutationResult => {
      const task = repo.getTask(taskId);
      if (!task) {
        return { success: false, error: `Task ${taskId} not found` };
      }

      if (input.type && !VALID_TYPES.includes(input.type)) {
        return { success: false, error: `Invalid type: ${input.type}` };
      }
      if (input.priority && !VALID_PRIORITIES.includes(input.priority)) {
        return { success: false, error: `Invalid priority: ${input.priority}` };
      }

      const updated: Task = { ...task };
      if (input.title !== undefined) updated.title = input.title;
      if (input.description !== undefined) updated.description = input.description;
      if (input.type !== undefined) updated.type = input.type;
      if (input.priority !== undefined) updated.priority = input.priority;
      if (input.vertical_slice !== undefined) updated.vertical_slice = input.vertical_slice;
      if (input.parallel_group !== undefined) updated.parallel_group = input.parallel_group;
      if (input.acceptance_criteria !== undefined) updated.acceptance_criteria = input.acceptance_criteria;
      if (input.deliverables !== undefined) updated.deliverables = input.deliverables;
      if (input.tests !== undefined) updated.tests = input.tests;
      if (input.documentation !== undefined) updated.documentation = input.documentation;
      if (input.estimated_complexity !== undefined) updated.estimated_complexity = input.estimated_complexity;
      if (input.can_parallelize !== undefined) updated.can_parallelize = input.can_parallelize;
      if (input.notes !== undefined) updated.notes = input.notes;

      model.tasks.set(taskId, updated);
      persist(model);
      return { success: true, taskId };
    },

    changeStatus: (taskId: string, newStatus: TaskStatus): MutationResult => {
      const task = repo.getTask(taskId);
      if (!task) {
        return { success: false, error: `Task ${taskId} not found` };
      }

      if (!isValidStatusTransition(task.status as TaskStatus, newStatus)) {
        return { success: false, error: `Invalid status transition: ${task.status} -> ${newStatus}` };
      }

      if (newStatus === 'in_progress' && task.status === 'ready') {
        task.agent_id = 'agent-' + Date.now();
        task.started_at = new Date().toISOString();
      }

      if (newStatus === 'blocked') {
        return { success: false, error: 'Use blockTask to set blocked status with reason' };
      }

      const oldStatus = task.status;
      task.status = newStatus;

      const oldStatusTasks = model.taskByStatus.get(oldStatus) || [];
      model.taskByStatus.set(oldStatus, oldStatusTasks.filter(id => id !== taskId));

      const newStatusTasks = model.taskByStatus.get(newStatus) || [];
      newStatusTasks.push(taskId);
      model.taskByStatus.set(newStatus, newStatusTasks);

      persist(model);
      return { success: true, taskId };
    },

    addDependency: (taskId: string, dependencyId: string): MutationResult => {
      const task = repo.getTask(taskId);
      const dependency = repo.getTask(dependencyId);
      if (!task || !dependency) {
        return { success: false, error: `Task ${taskId} or dependency ${dependencyId} not found` };
      }

      if (taskId === dependencyId) {
        return { success: false, error: 'Cannot add self-dependency' };
      }

      if (task.dependencies.includes(dependencyId)) {
        return { success: false, error: 'Dependency already exists' };
      }

      const testGraph = new Map(model.dependencyGraph);
      testGraph.set(taskId, [...task.dependencies, dependencyId]);
      const deps = testGraph.get(dependencyId) || [];
      deps.push(taskId);
      testGraph.set(dependencyId, deps);

      const cycles = detectCycles(testGraph);
      if (cycles.length > 0) {
        return { success: false, error: `Adding dependency would create cycle: ${cycles[0].join(' -> ')}` };
      }

      task.dependencies.push(dependencyId);
      model.dependencyGraph.set(taskId, [...task.dependencies]);

      const dependents = model.dependentGraph.get(dependencyId) || [];
      dependents.push(taskId);
      model.dependentGraph.set(dependencyId, dependents);

      persist(model);
      return { success: true, taskId };
    },

    removeDependency: (taskId: string, dependencyId: string): MutationResult => {
      const task = repo.getTask(taskId);
      if (!task) {
        return { success: false, error: `Task ${taskId} not found` };
      }

      if (!task.dependencies.includes(dependencyId)) {
        return { success: false, error: 'Dependency does not exist' };
      }

      task.dependencies = task.dependencies.filter(d => d !== dependencyId);
      model.dependencyGraph.set(taskId, [...task.dependencies]);

      const dependents = model.dependentGraph.get(dependencyId) || [];
      model.dependentGraph.set(dependencyId, dependents.filter(d => d !== taskId));

      persist(model);
      return { success: true, taskId };
    },

    blockTask: (taskId: string, reason: string): MutationResult => {
      const task = repo.getTask(taskId);
      if (!task) {
        return { success: false, error: `Task ${taskId} not found` };
      }

      if (task.status === 'done' || task.status === 'cancelled') {
        return { success: false, error: 'Cannot block completed or cancelled task' };
      }

      task.status = 'blocked';
      task.blocked_reason = reason;

      const blockedTasks = model.taskByStatus.get('blocked') || [];
      blockedTasks.push(taskId);
      model.taskByStatus.set('blocked', blockedTasks);

      persist(model);
      return { success: true, taskId };
    },

    unblockTask: (taskId: string): MutationResult => {
      const task = repo.getTask(taskId);
      if (!task) {
        return { success: false, error: `Task ${taskId} not found` };
      }

      if (task.status !== 'blocked') {
        return { success: false, error: 'Task is not blocked' };
      }

      const deps = repo.getDependencies(taskId);
      const allDepsDone = deps.every((depId: string) => repo.getTask(depId)?.status === 'done');
      const newStatus = allDepsDone ? 'ready' : 'todo';

      task.status = newStatus;
      delete task.blocked_reason;

      const blockedTasks = model.taskByStatus.get('blocked') || [];
      model.taskByStatus.set('blocked', blockedTasks.filter(id => id !== taskId));

      const newStatusTasks = model.taskByStatus.get(newStatus) || [];
      newStatusTasks.push(taskId);
      model.taskByStatus.set(newStatus, newStatusTasks);

      persist(model);
      return { success: true, taskId };
    },

    addAcceptanceCriteria: (taskId: string, criteria: string): MutationResult => {
      const task = repo.getTask(taskId);
      if (!task) {
        return { success: false, error: `Task ${taskId} not found` };
      }

      if (!task.acceptance_criteria.includes(criteria)) {
        task.acceptance_criteria.push(criteria);
      }
      persist(model);
      return { success: true, taskId };
    },

    addTest: (taskId: string, testId: string): MutationResult => {
      const task = repo.getTask(taskId);
      const test = repo.getTask(testId);
      if (!task) {
        return { success: false, error: `Task ${taskId} not found` };
      }
      if (!test) {
        return { success: false, error: `Test task ${testId} not found` };
      }
      if (test.type !== 'test') {
        return { success: false, error: `Task ${testId} is not a test type` };
      }

      if (!task.tests.includes(testId)) {
        task.tests.push(testId);
      }
      persist(model);
      return { success: true, taskId };
    },

    recordEvidence: (taskId: string, evidence: string): MutationResult => {
      const task = repo.getTask(taskId);
      if (!task) {
        return { success: false, error: `Task ${taskId} not found` };
      }

      if (!task.evidence) task.evidence = [];
      task.evidence.push(evidence);
      persist(model);
      return { success: true, taskId };
    },

    completeTask: (taskId: string): MutationResult => {
      const task = repo.getTask(taskId);
      if (!task) {
        return { success: false, error: `Task ${taskId} not found` };
      }

      if (task.status === 'done') {
        return { success: false, error: 'Task already completed' };
      }

      if (task.status !== 'review' && task.status !== 'in_progress') {
        return { success: false, error: `Cannot complete task in status ${task.status}` };
      }

      for (const criteria of task.acceptance_criteria) {
        if (!criteria.startsWith('[x]') && !criteria.startsWith('[X]')) {
          return { success: false, error: `Acceptance criteria not met: ${criteria}` };
        }
      }

      for (const testId of task.tests) {
        const test = repo.getTask(testId);
        if (test && test.status !== 'done') {
          return { success: false, error: `Required test ${testId} not completed` };
        }
      }

      const deps = repo.getDependencies(taskId);
      const incompleteDeps = deps.filter((depId: string) => repo.getTask(depId)?.status !== 'done');
      if (incompleteDeps.length > 0) {
        return { success: false, error: `Incomplete dependencies: ${incompleteDeps.join(', ')}` };
      }

      const oldStatus = task.status;
      task.status = 'done';

      const oldStatusTasks = model.taskByStatus.get(oldStatus) || [];
      model.taskByStatus.set(oldStatus, oldStatusTasks.filter(id => id !== taskId));

      const doneTasks = model.taskByStatus.get('done') || [];
      doneTasks.push(taskId);
      model.taskByStatus.set('done', doneTasks);

      for (const childId of task.children) {
        const child = repo.getTask(childId);
        if (child && child.status !== 'done' && child.status !== 'cancelled') {
          child.status = 'cancelled';
          const childOldStatusTasks = model.taskByStatus.get(child.status) || [];
          model.taskByStatus.set(child.status, childOldStatusTasks.filter(id => id !== childId));
          const cancelledTasks = model.taskByStatus.get('cancelled') || [];
          cancelledTasks.push(childId);
          model.taskByStatus.set('cancelled', cancelledTasks);
        }
      }

      persist(model);
      return { success: true, taskId };
    }
  };
}