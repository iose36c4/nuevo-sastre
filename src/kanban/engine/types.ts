export interface ProjectInfo {
  name: string;
  version: string;
  description: string;
  language: string;
  runtime: string;
  testing_framework: string;
  linter: string;
  type_checker: string;
  coordinate_system: string;
  internal_unit: string;
  build_order: string;
  created: string;
  repository: string;
  dsl_versions: string[];
  floating_point: Record<string, string>;
}

export interface Phase {
  id: string;
  title: string;
  description: string;
  order: number;
  status: string;
  vertical_slice: string;
  blocks: string[];
}

export interface Task {
  id: string;
  parent_id: string | null;
  phase: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  type: string;
  vertical_slice: string;
  parallel_group: string;
  dependencies: string[];
  children: string[];
  acceptance_criteria: string[];
  deliverables: string[];
  tests: string[];
  documentation: string[];
  estimated_complexity: string;
  can_parallelize: boolean;
  notes: string[];
  agent_id?: string;
  started_at?: string;
  blocked_reason?: string;
  evidence?: string[];
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  tasks: string[];
  status: string;
}

export interface Decision {
  id: string;
  title: string;
  documented_in: string;
}

export interface KanbanData {
  project: ProjectInfo;
  phases: Phase[];
  tasks: Task[];
  milestones: Milestone[];
  decisions: Decision[];
  planning_validation?: PlanningValidation;
}

export interface KanbanModel {
  project: ProjectInfo;
  phases: Map<string, Phase>;
  tasks: Map<string, Task>;
  milestones: Map<string, Milestone>;
  decisions: Map<string, Decision>;
  taskByPhase: Map<string, string[]>;
  taskByStatus: Map<string, string[]>;
  taskByParent: Map<string, string[]>;
  dependencyGraph: Map<string, string[]>;
  dependentGraph: Map<string, string[]>;
}

export interface PlanningValidation {
  version: string;
  validation_date: string;
  notes: string;
  checks: Record<string, string>;
  task_counts: {
    total: number;
    implementation: number;
    tests: number;
    setup: number;
    documentation: number;
    test_patterns: number;
  };
  milestone_count: number;
  phase_count: number;
  vertical_slice_count: number;
}

export type TaskStatus = 'backlog' | 'todo' | 'ready' | 'in_progress' | 'blocked' | 'review' | 'done' | 'cancelled';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type TaskType = 'feature' | 'test' | 'setup' | 'documentation' | 'test_pattern';

export const VALID_STATUSES: TaskStatus[] = ['backlog', 'todo', 'ready', 'in_progress', 'blocked', 'review', 'done', 'cancelled'];
export const VALID_PRIORITIES: TaskPriority[] = ['critical', 'high', 'medium', 'low'];
export const VALID_TYPES: TaskType[] = ['feature', 'test', 'setup', 'documentation', 'test_pattern'];

export const STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  backlog: ['todo', 'cancelled'],
  todo: ['ready', 'backlog', 'cancelled'],
  ready: ['in_progress', 'todo', 'blocked'],
  in_progress: ['review', 'blocked', 'ready', 'done'],
  blocked: ['ready', 'todo', 'backlog'],
  review: ['done', 'in_progress', 'blocked'],
  done: [],
  cancelled: []
};

export function isValidStatusTransition(from: TaskStatus, to: TaskStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function generateTaskId(prefix: string, existingIds: Set<string>): string {
  let num = 1;
  while (existingIds.has(`${prefix}-${num.toString().padStart(3, '0')}`)) {
    num++;
  }
  return `${prefix}-${num.toString().padStart(3, '0')}`;
}

export interface KanbanHistoryEntry {
  timestamp: string;
  operation: string;
  taskId: string;
  agentId?: string;
  before?: Partial<Task>;
  after?: Partial<Task>;
  success: boolean;
  error?: string;
}