import type { Task, TaskContext, Phase, Milestone } from './types.js';

export interface ReadyTaskSchema {
  id: string;
  title: string;
  status: string;
  priority: string;
  vertical_slice: string;
}

export interface BlockedTaskSchema {
  id: string;
  title: string;
  status: string;
  blocked_reason: string;
}

export interface TaskDependencySchema {
  id: string;
  title: string;
  status: string;
}

export interface TaskDependentSchema {
  id: string;
  title: string;
  status: string;
}

export interface TaskSchema {
  id: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  phase: string;
  vertical_slice: string;
  parallel_group: string;
  dependencies: string[];
  children: string[];
  tests: string[];
  acceptance_criteria: string[];
  deliverables: string[];
  documentation: string[];
  estimated_complexity: string;
  can_parallelize: boolean;
  notes: string[];
}

export interface TaskContextSchema {
  task: TaskSchema;
  parent: TaskSchema | null;
  dependencies: TaskDependencySchema[];
  dependents: TaskDependentSchema[];
  tests: string[];
  acceptance_criteria: string[];
  relevant_decisions: { id: string; title: string }[];
  recommended_action: 'start' | 'block' | 'wait' | 'complete' | 'split';
}

export interface PhaseSchema {
  id: string;
  title: string;
  description: string;
  order: number;
  status: string;
  vertical_slice: string;
  blocks: string[];
}

export interface MilestoneSchema {
  id: string;
  title: string;
  description: string;
  tasks: string[];
  status: string;
}

export interface SearchResultSchema {
  id: string;
  title: string;
  status: string;
  priority: string;
  vertical_slice: string;
}

export function toReadyTaskSchema(task: any): ReadyTaskSchema {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    vertical_slice: task.vertical_slice
  };
}

export function toBlockedTaskSchema(task: any): BlockedTaskSchema {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    blocked_reason: task.blocked_reason || ''
  };
}

export function toTaskSchema(task: Task): TaskSchema {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    type: task.type,
    phase: task.phase,
    vertical_slice: task.vertical_slice,
    parallel_group: task.parallel_group,
    dependencies: [...task.dependencies],
    children: [...task.children],
    tests: [...task.tests],
    acceptance_criteria: [...task.acceptance_criteria],
    deliverables: [...task.deliverables],
    documentation: [...task.documentation],
    estimated_complexity: task.estimated_complexity,
    can_parallelize: task.can_parallelize,
    notes: [...task.notes]
  };
}

export function toTaskContextSchema(context: TaskContext): TaskContextSchema {
  return {
    task: toTaskSchema(context.task),
    parent: context.parent ? toTaskSchema(context.parent) : null,
    dependencies: context.dependencies,
    dependents: context.dependents,
    tests: [...context.tests],
    acceptance_criteria: [...context.acceptance_criteria],
    relevant_decisions: [...context.relevant_decisions],
    recommended_action: context.recommended_action
  };
}

export function toPhaseSchema(phase: Phase): PhaseSchema {
  return {
    id: phase.id,
    title: phase.title,
    description: phase.description,
    order: phase.order,
    status: phase.status,
    vertical_slice: phase.vertical_slice,
    blocks: [...phase.blocks]
  };
}

export function toMilestoneSchema(milestone: Milestone): MilestoneSchema {
  return {
    id: milestone.id,
    title: milestone.title,
    description: milestone.description,
    tasks: [...milestone.tasks],
    status: milestone.status
  };
}

export function toSearchResultSchema(task: any): SearchResultSchema {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    vertical_slice: task.vertical_slice
  };
}