import { appendFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { KanbanHistoryEntry } from './types.js';

export class KanbanHistory {
  private historyPath: string;

  constructor(historyPath?: string) {
    this.historyPath = historyPath || resolve(process.cwd(), '.kanban-history.json');
    this.ensureDirectory();
  }

  private ensureDirectory(): void {
    const dir = dirname(this.historyPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  record(entry: Omit<KanbanHistoryEntry, 'timestamp'>): void {
    const fullEntry: KanbanHistoryEntry = {
      ...entry,
      timestamp: new Date().toISOString()
    };

    const line = JSON.stringify(fullEntry) + '\n';
    appendFileSync(this.historyPath, line, 'utf-8');
  }

  query(taskId?: string, limit = 100): KanbanHistoryEntry[] {
    if (!existsSync(this.historyPath)) return [];

    const content = readFileSync(this.historyPath, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l.trim());

    let entries: KanbanHistoryEntry[] = [];
    for (const line of lines) {
      try {
        entries.push(JSON.parse(line));
      } catch {
        // Skip malformed lines
      }
    }

    if (taskId) {
      entries = entries.filter(e => e.taskId === taskId);
    }

    return entries.slice(-limit).reverse();
  }

  getAll(limit = 100): KanbanHistoryEntry[] {
    return this.query(undefined, limit);
  }

  clear(): void {
    if (existsSync(this.historyPath)) {
      require('fs').writeFileSync(this.historyPath, '', 'utf-8');
    }
  }
}