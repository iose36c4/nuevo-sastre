import { describe, it, expect } from 'vitest';
import {
  detectCycles,
  topologicalSort,
  getReadyTasks,
  getBlockedTasks,
  getUnblockedBy,
  validateGraph,
  buildDependencyGraph,
} from '../../../src/kanban/engine/dependency-graph.js';

function makeAdjacency(entries: Record<string, string[]>): Map<string, string[]> {
  return new Map(Object.entries(entries));
}

const statusMap = new Map<string, string>([
  ['A', 'done'],
  ['B', 'todo'],
  ['C', 'todo'],
  ['D', 'backlog'],
  ['E', 'todo'],
  ['F', 'done'],
]);

describe('detectCycles', () => {
  it('returns empty array when no cycle exists', () => {
    const adj = makeAdjacency({ A: ['B'], B: ['C'], C: [] });
    expect(detectCycles(adj)).toEqual([]);
  });

  it('detects simple cycle A -> B -> C -> A', () => {
    const adj = makeAdjacency({ A: ['B'], B: ['C'], C: ['A'] });
    const cycles = detectCycles(adj);
    expect(cycles.length).toBeGreaterThanOrEqual(1);
    const cycle = cycles[0];
    expect(cycle[0]).toBe(cycle[cycle.length - 1]);
  });

  it('detects self-cycle', () => {
    const adj = makeAdjacency({ A: ['A'] });
    const cycles = detectCycles(adj);
    expect(cycles.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty for disconnected graph with no cycles', () => {
    const adj = makeAdjacency({ A: [], B: [], C: [] });
    expect(detectCycles(adj)).toEqual([]);
  });
});

describe('topologicalSort', () => {
  it('returns all nodes for graph with no edges', () => {
    const adj = makeAdjacency({ A: [], B: [], C: [] });
    const result = topologicalSort(adj);
    expect(result.length).toBe(3);
    expect(result).toContain('A');
    expect(result).toContain('B');
    expect(result).toContain('C');
  });

  it('throws on cycle', () => {
    const adj = makeAdjacency({ A: ['B'], B: ['C'], C: ['A'] });
    expect(() => topologicalSort(adj)).toThrow('Cycle detected');
  });

  it('handles single node with no edges', () => {
    const adj = makeAdjacency({ A: [] });
    expect(topologicalSort(adj)).toEqual(['A']);
  });
});

describe('getReadyTasks', () => {
  it('returns tasks with all deps done', () => {
    const taskIds = ['A', 'B', 'C', 'D'];
    const getStatus = (id: string) => statusMap.get(id)!;
    const getDependencies = (id: string) => {
      const deps: Record<string, string[]> = { A: [], B: ['A'], C: ['A', 'B'], D: [] };
      return deps[id] || [];
    };

    const ready = getReadyTasks(taskIds, getStatus, getDependencies);
    expect(ready).toContain('D');
    expect(ready).toContain('B');
    expect(ready).not.toContain('C');
    expect(ready).not.toContain('A');
  });

  it('returns empty when no tasks qualify', () => {
    const taskIds = ['A'];
    const getStatus = () => 'in_progress';
    const getDependencies = () => [];
    expect(getReadyTasks(taskIds, getStatus, getDependencies)).toEqual([]);
  });
});

describe('getBlockedTasks', () => {
  it('returns tasks with incomplete deps', () => {
    const taskIds = ['A', 'B', 'C'];
    const getStatus = (id: string) => {
      if (id === 'A') return 'done';
      if (id === 'B') return 'todo';
      return 'ready';
    };
    const getDependencies = (id: string) => {
      if (id === 'A') return [];
      if (id === 'B') return ['A'];
      return ['B'];
    };

    const blocked = getBlockedTasks(taskIds, getStatus, getDependencies);
    expect(blocked).toContain('C');
    expect(blocked).not.toContain('A');
    expect(blocked).not.toContain('B');
  });

  it('skips tasks already done/cancelled/blocked', () => {
    const taskIds = ['A', 'B'];
    const getStatus = (id: string) => (id === 'A' ? 'done' : 'blocked');
    const getDependencies = () => ['nonexistent'];
    expect(getBlockedTasks(taskIds, getStatus, getDependencies)).toEqual([]);
  });
});

describe('getUnblockedBy', () => {
  it('correctly identifies tasks unblocked by completing a task', () => {
    const taskIds = ['A', 'B', 'C'];
    const getStatus = (id: string) => {
      if (id === 'A') return 'done';
      if (id === 'B') return 'todo';
      return 'todo';
    };
    const getDependencies = (id: string) => {
      if (id === 'A') return [];
      if (id === 'B') return ['A'];
      return ['A', 'B'];
    };

    const unblocked = getUnblockedBy('A', taskIds, getStatus, getDependencies);
    expect(unblocked).toContain('B');
    expect(unblocked).not.toContain('C');
  });

  it('does not return already ready tasks', () => {
    const taskIds = ['A', 'B'];
    const getStatus = (id: string) => {
      if (id === 'A') return 'done';
      return 'ready';
    };
    const getDependencies = (id: string) => {
      if (id === 'A') return [];
      return ['A'];
    };

    const unblocked = getUnblockedBy('A', taskIds, getStatus, getDependencies);
    expect(unblocked).not.toContain('B');
  });

  it('does not return done or cancelled tasks', () => {
    const taskIds = ['A', 'B'];
    const getStatus = (id: string) => (id === 'A' ? 'done' : 'done');
    const getDependencies = (id: string) => {
      if (id === 'A') return [];
      return ['A'];
    };
    const unblocked = getUnblockedBy('A', taskIds, getStatus, getDependencies);
    expect(unblocked).toEqual([]);
  });
});

describe('validateGraph', () => {
  it('returns valid for clean graph', () => {
    const taskIds = ['A', 'B', 'C'];
    const getDeps = (id: string) => {
      if (id === 'A') return [];
      if (id === 'B') return ['A'];
      return ['A', 'B'];
    };
    const result = validateGraph(taskIds, getDeps);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('catches cycles', () => {
    const taskIds = ['A', 'B'];
    const getDeps = (id: string) => (id === 'A' ? ['B'] : ['A']);
    const result = validateGraph(taskIds, getDeps);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Cycle'))).toBe(true);
  });

  it('catches missing deps', () => {
    const taskIds = ['A'];
    const getDeps = () => ['nonexistent'];
    const result = validateGraph(taskIds, getDeps);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('non-existent'))).toBe(true);
  });

  it('catches self-deps', () => {
    const taskIds = ['A'];
    const getDeps = () => ['A'];
    const result = validateGraph(taskIds, getDeps);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('depends on itself'))).toBe(true);
  });
});

describe('buildDependencyGraph', () => {
  it('builds adjacency and reverse adjacency', () => {
    const taskIds = ['A', 'B', 'C'];
    const getDeps = (id: string) => {
      if (id === 'A') return [];
      if (id === 'B') return ['A'];
      return ['A', 'B'];
    };
    const graph = buildDependencyGraph(taskIds, getDeps);

    expect(graph.adjacency.get('A')).toEqual([]);
    expect(graph.adjacency.get('B')).toEqual(['A']);
    expect(graph.adjacency.get('C')).toEqual(['A', 'B']);

    expect(graph.reverseAdjacency.get('A')).toEqual(['B', 'C']);
    expect(graph.reverseAdjacency.get('B')).toEqual(['C']);
  });
});
