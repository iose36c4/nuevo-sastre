import { Command } from 'commander';
import { createKanbanCommand } from './commands/kanban.js';

const program = new Command()
  .name('sastre')
  .description('SASTRE DSL - Clothing pattern generation tool')
  .version('0.3.0');

program.addCommand(createKanbanCommand());

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});