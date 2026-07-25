import { KanbanLoader } from '../src/kanban/engine/loader.js';
import { KanbanRepository } from '../src/kanban/engine/repository.js';
import { createMutations } from '../src/kanban/engine/mutations.js';
import { KanbanPersistence } from '../src/kanban/engine/persistence.js';
import { resolve } from 'path';

const taskId = process.argv[2];
const status = process.argv[3];

if (!taskId || !status) {
  console.error('Usage: tsx scripts/set-task-status.ts <taskId> <status>');
  process.exit(1);
}

const loader = KanbanLoader.getInstance();
const model = loader.getModel();
const repo = new KanbanRepository(model);
const persistence = new KanbanPersistence({
  kanbanPath: resolve(process.cwd(), 'planning/kanban.json'),
  historyPath: resolve(process.cwd(), '.kanban-history.json'),
  validateBeforeWrite: true
});
const mutations = createMutations(repo, model, (m) => persistence.write(m));

console.log('Current status:', repo.getTask(taskId)?.status);
const result = mutations.changeStatus(taskId, status as any);
console.log('Result:', result);
console.log('New status:', repo.getTask(taskId)?.status);