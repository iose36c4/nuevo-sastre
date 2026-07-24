import { Command } from 'commander';
import { resolve } from 'path';
import { KanbanLoader } from '../../kanban/engine/loader.js';
import { KanbanRepository } from '../../kanban/engine/repository.js';
import { createQueries } from '../../kanban/engine/queries.js';
import { createMutations } from '../../kanban/engine/mutations.js';
import { KanbanPersistence } from '../../kanban/engine/persistence.js';
import { KanbanCacheManager } from '../../kanban/engine/persistence.js';
import { ContextBuilder } from '../../kanban/engine/context.js';
import { KanbanHistory } from '../../kanban/engine/history.js';
import { 
  toReadyTaskSchema, 
  toTaskSchema, 
  toTaskContextSchema, 
  toSearchResultSchema 
} from '../../kanban/engine/json-schemas.js';

function createKanbanCommand(): Command {
  const kanban = new Command('kanban')
    .description('Kanban operations for AI agents');

  kanban.addCommand(createReadyCommand());
  kanban.addCommand(createNextCommand());
  kanban.addCommand(createShowCommand());
  kanban.addCommand(createContextCommand());
  kanban.addCommand(createDepsCommand());
  kanban.addCommand(createDependentsCommand());
  kanban.addCommand(createTreeCommand());
  kanban.addCommand(createSearchCommand());
  kanban.addCommand(createStartCommand());
  kanban.addCommand(createCompleteCommand());
  kanban.addCommand(createBlockCommand());
  kanban.addCommand(createUnblockCommand());
  kanban.addCommand(createAddCommand());
  kanban.addCommand(createAddChildCommand());
  kanban.addCommand(createAddDependencyCommand());
  kanban.addCommand(createRemoveDependencyCommand());
  kanban.addCommand(createUpdateCommand());
  kanban.addCommand(createValidateCommand());
  kanban.addCommand(createHistoryCommand());

  return kanban;
}

function getEngine() {
  const loader = KanbanLoader.getInstance();
  const model = loader.getModel();
  const repo = new KanbanRepository(model);
  const queries = createQueries(repo);
  const cache = new KanbanCacheManager();
  const persistence = new KanbanPersistence({
    kanbanPath: resolve(process.cwd(), 'planning/kanban.json'),
    historyPath: resolve(process.cwd(), '.kanban-history.json'),
    validateBeforeWrite: true
  });
  const mutations = createMutations(repo, model, (m) => {
    persistence.write(m);
    cache.invalidate();
    loader.invalidateCache();
  });
  const contextBuilder = new ContextBuilder(repo);
  const history = new KanbanHistory();

  return { loader, model, repo, queries, mutations, contextBuilder, history, cache, persistence };
}

function outputJson(data: any): void {
  console.log(JSON.stringify(data, null, 2));
}

function outputHuman(data: any, formatter: (d: any) => string): void {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    console.log('No results');
    return;
  }
  console.log(formatter(data));
}

function createReadyCommand(): Command {
  const cmd = new Command('ready')
    .description('Show tasks ready to work on (all dependencies complete)')
    .option('--json', 'Output as JSON')
    .action((options) => {
      const { queries } = getEngine();
      const ready = queries.getReadyTasks();
      if (options.json) {
        outputJson(ready.map(toReadyTaskSchema));
      } else {
        outputHuman(ready, (tasks: typeof ready) => tasks.map((t) => `  ${t.id} [${t.priority}] ${t.title} (${t.vertical_slice})`).join('\n'));
      }
    });
  return cmd;
}

function createNextCommand(): Command {
  const cmd = new Command('next')
    .description('Show next recommended tasks (alias for ready)')
    .option('--json', 'Output as JSON')
    .action((options) => {
      const { queries } = getEngine();
      const next = queries.getNextTasks();
      if (options.json) {
        outputJson(next.map(toReadyTaskSchema));
      } else {
        outputHuman(next, (tasks: typeof next) => tasks.map((t) => `  ${t.id} [${t.priority}] ${t.title} (${t.vertical_slice})`).join('\n'));
      }
    });
  return cmd;
}

function createShowCommand(): Command {
  const cmd = new Command('show')
    .description('Show task details')
    .argument('<taskId>')
    .option('--json', 'Output as JSON')
    .action((taskId, options) => {
      const { repo } = getEngine();
      const task = repo.getTask(taskId);
      if (!task) {
        console.error(`Task ${taskId} not found`);
        process.exit(1);
      }
      if (options.json) {
        outputJson(toTaskSchema(task));
      } else {
        console.log(`${task.id}: ${task.title}`);
        console.log(`  Status: ${task.status}`);
        console.log(`  Priority: ${task.priority}`);
        console.log(`  Phase: ${task.phase}`);
        console.log(`  Type: ${task.type}`);
        console.log(`  Vertical Slice: ${task.vertical_slice}`);
        console.log(`  Dependencies: ${task.dependencies.join(', ') || 'none'}`);
        console.log(`  Children: ${task.children.join(', ') || 'none'}`);
        console.log(`  Tests: ${task.tests.join(', ') || 'none'}`);
        console.log(`  Acceptance Criteria:`);
        for (const c of task.acceptance_criteria) console.log(`    - ${c}`);
      }
    });
  return cmd;
}

function createContextCommand(): Command {
  const cmd = new Command('context')
    .description('Get operational context for a task')
    .argument('<taskId>')
    .option('--json', 'Output as JSON')
    .option('--level <1-5>', 'Context level (1=minimal, 3=operational default, 5=architecture)', '3')
    .action((taskId, options) => {
      const { contextBuilder } = getEngine();
      const level = parseInt(options.level) as 1 | 2 | 3 | 4 | 5;
      const context = contextBuilder.buildContext(taskId, { level });
      if (!context) {
        console.error(`Task ${taskId} not found`);
        process.exit(1);
      }
      if (options.json) {
        outputJson(toTaskContextSchema(context));
      } else {
        console.log(`=== Context for ${context.task.id}: ${context.task.title} ===`);
        console.log(`Recommended action: ${context.recommended_action}`);
        console.log(`\nTask: ${context.task.status} [${context.task.priority}] ${context.task.phase}`);
        if (context.parent) console.log(`Parent: ${context.parent.id} ${context.parent.title}`);
        if (context.dependencies.length) {
          console.log(`Dependencies:`);
          for (const d of context.dependencies) console.log(`  - ${d.id} [${d.status}] ${d.title}`);
        }
        if (context.dependents.length) {
          console.log(`Dependents:`);
          for (const d of context.dependents) console.log(`  - ${d.id} [${d.status}] ${d.title}`);
        }
        if (context.tests.length) console.log(`Tests: ${context.tests.join(', ')}`);
        if (context.acceptance_criteria.length) {
          console.log(`Acceptance Criteria:`);
          for (const c of context.acceptance_criteria) console.log(`  - ${c}`);
        }
        if (context.relevant_decisions.length) {
          console.log(`Relevant Decisions:`);
          for (const d of context.relevant_decisions) console.log(`  - ${d.id}: ${d.title}`);
        }
      }
    });
  return cmd;
}

function createDepsCommand(): Command {
  const cmd = new Command('deps')
    .description('Show task dependencies')
    .argument('<taskId>')
    .option('--json', 'Output as JSON')
    .action((taskId, options) => {
      const { queries } = getEngine();
      const deps = queries.getDependencies(taskId);
      if (options.json) {
        outputJson(deps);
      } else {
        outputHuman(deps, (d: typeof deps) => d.map((x) => `  ${x.id} [${x.status}] ${x.title}`).join('\n') || '  none');
      }
    });
  return cmd;
}

function createDependentsCommand(): Command {
  const cmd = new Command('dependents')
    .description('Show tasks that depend on this task')
    .argument('<taskId>')
    .option('--json', 'Output as JSON')
    .action((taskId, options) => {
      const { queries } = getEngine();
      const deps = queries.getDependents(taskId);
      if (options.json) {
        outputJson(deps);
      } else {
        outputHuman(deps, (d: typeof deps) => d.map((x) => `  ${x.id} [${x.status}] ${x.title}`).join('\n') || '  none');
      }
    });
  return cmd;
}

function createTreeCommand(): Command {
  const cmd = new Command('tree')
    .description('Show task tree (subtasks)')
    .argument('<taskId>')
    .option('--json', 'Output as JSON')
    .action((taskId, options) => {
      const { queries } = getEngine();
      const tree = queries.getTree(taskId);
      if (!tree) {
        console.error(`Task ${taskId} not found`);
        process.exit(1);
      }
      if (options.json) {
        outputJson(tree);
      } else {
        printTree(tree, 0);
      }
    });
  return cmd;
}

function printTree(tree: any, indent: number): void {
  const prefix = '  '.repeat(indent);
  console.log(`${prefix}${tree.task.id} [${tree.task.status}] ${tree.task.title}`);
  for (const child of tree.children) {
    printTree(child, indent + 1);
  }
}

function createSearchCommand(): Command {
  const cmd = new Command('search')
    .description('Search tasks by title/description')
    .argument('<query>')
    .option('--json', 'Output as JSON')
    .action((query, options) => {
      const { queries } = getEngine();
      const results = queries.searchTasks(query);
      if (options.json) {
        outputJson(results.map(toSearchResultSchema));
      } else {
        outputHuman(results, (r: typeof results) => r.map((t) => `  ${t.id} [${t.status}/${t.priority}] ${t.title} (${t.vertical_slice})`).join('\n'));
      }
    });
  return cmd;
}

function createStartCommand(): Command {
  const cmd = new Command('start')
    .description('Start working on a task (sets status to in_progress)')
    .argument('<taskId>')
    .option('--json', 'Output as JSON')
    .action((taskId, options) => {
      const { mutations } = getEngine();
      const result = mutations.changeStatus(taskId, 'in_progress');
      if (options.json) {
        outputJson(result);
      } else if (result.success) {
        console.log(`Started task ${taskId}`);
      } else {
        console.error(`Error: ${result.error}`);
        process.exit(1);
      }
    });
  return cmd;
}

function createCompleteCommand(): Command {
  const cmd = new Command('complete')
    .description('Complete a task (validates criteria, tests, dependencies)')
    .argument('<taskId>')
    .option('--evidence <text>', 'Evidence of completion')
    .option('--json', 'Output as JSON')
    .action((taskId, options) => {
      const { mutations } = getEngine();
      if (options.evidence) {
        mutations.recordEvidence(taskId, options.evidence);
      }
      const result = mutations.completeTask(taskId);
      if (options.json) {
        outputJson(result);
      } else if (result.success) {
        console.log(`Completed task ${taskId}`);
      } else {
        console.error(`Error: ${result.error}`);
        process.exit(1);
      }
    });
  return cmd;
}

function createBlockCommand(): Command {
  const cmd = new Command('block')
    .description('Block a task with a reason')
    .argument('<taskId>')
    .requiredOption('--reason <text>', 'Reason for blocking')
    .option('--json', 'Output as JSON')
    .action((taskId, options) => {
      const { mutations } = getEngine();
      const result = mutations.blockTask(taskId, options.reason);
      if (options.json) {
        outputJson(result);
      } else if (result.success) {
        console.log(`Blocked task ${taskId}: ${options.reason}`);
      } else {
        console.error(`Error: ${result.error}`);
        process.exit(1);
      }
    });
  return cmd;
}

function createUnblockCommand(): Command {
  const cmd = new Command('unblock')
    .description('Unblock a task (auto-sets to ready/todo based on deps)')
    .argument('<taskId>')
    .option('--json', 'Output as JSON')
    .action((taskId, options) => {
      const { mutations } = getEngine();
      const result = mutations.unblockTask(taskId);
      if (options.json) {
        outputJson(result);
      } else if (result.success) {
        console.log(`Unblocked task ${taskId}`);
      } else {
        console.error(`Error: ${result.error}`);
        process.exit(1);
      }
    });
  return cmd;
}

function createAddCommand(): Command {
  const cmd = new Command('add')
    .description('Create a new task')
    .requiredOption('--title <text>', 'Task title')
    .option('--description <text>', 'Task description')
    .option('--type <type>', 'Task type (feature, test, setup, documentation)', 'feature')
    .option('--parent <id>', 'Parent task ID')
    .option('--phase <id>', 'Phase ID')
    .option('--priority <priority>', 'Priority (critical, high, medium, low)', 'medium')
    .option('--vertical-slice <id>', 'Vertical slice ID')
    .option('--parallel-group <name>', 'Parallel group name')
    .option('--dependency <id>', 'Dependency task ID (can repeat)')
    .option('--json', 'Output as JSON')
    .action((options) => {
      const { mutations } = getEngine();
      const result = mutations.createTask({
        title: options.title,
        description: options.description,
        type: options.type as any,
        parent_id: options.parent,
        phase: options.phase,
        priority: options.priority as any,
        vertical_slice: options.verticalSlice,
        parallel_group: options.parallelGroup,
        dependencies: options.dependency ? [options.dependency] : undefined
      });
      if (options.json) {
        outputJson(result);
      } else if (result.success) {
        console.log(`Created task ${result.taskId}`);
      } else {
        console.error(`Error: ${result.error}`);
        process.exit(1);
      }
    });
  return cmd;
}

function createAddChildCommand(): Command {
  const cmd = new Command('add-child')
    .description('Create a subtask under a parent task')
    .argument('<parentId>')
    .requiredOption('--title <text>', 'Task title')
    .option('--description <text>', 'Task description')
    .option('--type <type>', 'Task type (feature, test, setup, documentation)', 'feature')
    .option('--priority <priority>', 'Priority (critical, high, medium, low)', 'medium')
    .option('--json', 'Output as JSON')
    .action((parentId, options) => {
      const { mutations } = getEngine();
      const result = mutations.createSubtask(parentId, {
        title: options.title,
        description: options.description,
        type: options.type as any,
        priority: options.priority as any
      });
      if (options.json) {
        outputJson(result);
      } else if (result.success) {
        console.log(`Created subtask ${result.taskId} under ${parentId}`);
      } else {
        console.error(`Error: ${result.error}`);
        process.exit(1);
      }
    });
  return cmd;
}

function createAddDependencyCommand(): Command {
  const cmd = new Command('add-dependency')
    .description('Add a dependency between tasks')
    .argument('<taskId>')
    .argument('<dependencyId>')
    .option('--json', 'Output as JSON')
    .action((taskId, dependencyId, options) => {
      const { mutations } = getEngine();
      const result = mutations.addDependency(taskId, dependencyId);
      if (options.json) {
        outputJson(result);
      } else if (result.success) {
        console.log(`Added dependency: ${taskId} depends on ${dependencyId}`);
      } else {
        console.error(`Error: ${result.error}`);
        process.exit(1);
      }
    });
  return cmd;
}

function createRemoveDependencyCommand(): Command {
  const cmd = new Command('remove-dependency')
    .description('Remove a dependency between tasks')
    .argument('<taskId>')
    .argument('<dependencyId>')
    .option('--json', 'Output as JSON')
    .action((taskId, dependencyId, options) => {
      const { mutations } = getEngine();
      const result = mutations.removeDependency(taskId, dependencyId);
      if (options.json) {
        outputJson(result);
      } else if (result.success) {
        console.log(`Removed dependency: ${taskId} no longer depends on ${dependencyId}`);
      } else {
        console.error(`Error: ${result.error}`);
        process.exit(1);
      }
    });
  return cmd;
}

function createUpdateCommand(): Command {
  const cmd = new Command('update')
    .description('Update task fields')
    .argument('<taskId>')
    .option('--title <text>', 'Task title')
    .option('--description <text>', 'Task description')
    .option('--type <type>', 'Task type')
    .option('--priority <priority>', 'Priority (critical, high, medium, low)')
    .option('--vertical-slice <id>', 'Vertical slice ID')
    .option('--parallel-group <name>', 'Parallel group name')
    .option('--json', 'Output as JSON')
    .action((taskId, options) => {
      const { mutations } = getEngine();
      const input: any = {};
      if (options.title) input.title = options.title;
      if (options.description) input.description = options.description;
      if (options.type) input.type = options.type;
      if (options.priority) input.priority = options.priority;
      if (options.verticalSlice) input.vertical_slice = options.verticalSlice;
      if (options.parallelGroup) input.parallel_group = options.parallelGroup;

      const result = mutations.updateTask(taskId, input);
      if (options.json) {
        outputJson(result);
      } else if (result.success) {
        console.log(`Updated task ${taskId}`);
      } else {
        console.error(`Error: ${result.error}`);
        process.exit(1);
      }
    });
  return cmd;
}

function createValidateCommand(): Command {
  const cmd = new Command('validate')
    .description('Validate kanban.json structure')
    .option('--json', 'Output as JSON')
    .action((options) => {
      const { loader } = getEngine();
      try {
        loader.load(true);
        const result = { valid: true, errors: [] };
        if (options.json) outputJson(result);
        else console.log('Kanban validation passed');
      } catch (e) {
        const result = { valid: false, errors: [e instanceof Error ? e.message : String(e)] };
        if (options.json) outputJson(result);
        else {
          console.error('Kanban validation failed:');
          for (const err of result.errors) console.error(`  - ${err}`);
          process.exit(1);
        }
      }
    });
  return cmd;
}

function createHistoryCommand(): Command {
  const cmd = new Command('history')
    .description('Show mutation history')
    .argument('[taskId]', 'Filter by task ID')
    .option('--json', 'Output as JSON')
    .option('--limit <n>', 'Limit results', '50')
    .action((taskId, options) => {
      const { history } = getEngine();
      const entries = history.query(taskId, parseInt(options.limit));
      if (options.json) {
        outputJson(entries);
      } else {
        outputHuman(entries, (e: typeof entries) => e.map((x) => `  ${x.timestamp} ${x.operation} ${x.taskId} ${x.success ? 'OK' : 'FAIL'} ${x.error || ''}`).join('\n'));
      }
    });
  return cmd;
}

export { createKanbanCommand };