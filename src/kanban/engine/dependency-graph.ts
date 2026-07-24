export interface DependencyGraph {
  adjacency: Map<string, string[]>;
  reverseAdjacency: Map<string, string[]>;
}

export function buildDependencyGraph(taskIds: string[], getDependencies: (id: string) => string[]): DependencyGraph {
  const adjacency = new Map<string, string[]>();
  const reverseAdjacency = new Map<string, string[]>();

  for (const id of taskIds) {
    const deps = getDependencies(id);
    adjacency.set(id, [...deps]);

    for (const dep of deps) {
      const rev = reverseAdjacency.get(dep) || [];
      rev.push(id);
      reverseAdjacency.set(dep, rev);
    }
  }

  return { adjacency, reverseAdjacency };
}

export function detectCycles(adjacency: Map<string, string[]>): string[][] {
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(node: string, path: string[]): void {
    visited.add(node);
    recStack.add(node);
    path.push(node);

    const neighbors = adjacency.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path]);
      } else if (recStack.has(neighbor)) {
        const cycleStart = path.indexOf(neighbor);
        cycles.push([...path.slice(cycleStart), neighbor]);
      }
    }

    recStack.delete(node);
  }

  for (const node of adjacency.keys()) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }

  return cycles;
}

export function topologicalSort(adjacency: Map<string, string[]>): string[] {
  const inDegree = new Map<string, number>();
  const queue: string[] = [];
  const result: string[] = [];

  for (const [node, deps] of adjacency) {
    inDegree.set(node, (inDegree.get(node) || 0) + deps.length);
    for (const dep of deps) {
      inDegree.set(dep, (inDegree.get(dep) || 0));
    }
  }

  for (const [node, degree] of inDegree) {
    if (degree === 0) {
      queue.push(node);
    }
  }

  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);

    const neighbors = adjacency.get(node) || [];
    for (const neighbor of neighbors) {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (result.length !== adjacency.size) {
    const cycles = detectCycles(adjacency);
    throw new Error(`Cycle detected: ${cycles[0]?.join(' -> ') || 'unknown'}`);
  }

  return result;
}

export function getBlockedTasks(
  taskIds: string[],
  getStatus: (id: string) => string,
  getDependencies: (id: string) => string[]
): string[] {
  const blocked: string[] = [];

  for (const id of taskIds) {
    const status = getStatus(id);
    if (status === 'done' || status === 'cancelled' || status === 'blocked') continue;

    const deps = getDependencies(id);
    const incompleteDeps = deps.filter(depId => getStatus(depId) !== 'done');
    if (incompleteDeps.length > 0) {
      blocked.push(id);
    }
  }

  return blocked;
}

export function getReadyTasks(
  taskIds: string[],
  getStatus: (id: string) => string,
  getDependencies: (id: string) => string[]
): string[] {
  const ready: string[] = [];

  for (const id of taskIds) {
    const status = getStatus(id);
    if (status !== 'backlog' && status !== 'todo' && status !== 'ready') continue;

    const deps = getDependencies(id);
    const allDone = deps.every(depId => getStatus(depId) === 'done');
    if (allDone) {
      ready.push(id);
    }
  }

  return ready;
}

export function getUnblockedBy(
  completedId: string,
  taskIds: string[],
  getStatus: (id: string) => string,
  getDependencies: (id: string) => string[]
): string[] {
  const unblocked: string[] = [];

  for (const id of taskIds) {
    const status = getStatus(id);
    if (status === 'done' || status === 'cancelled') continue;

    const deps = getDependencies(id);
    if (!deps.includes(completedId)) continue;

    const otherDeps = deps.filter(d => d !== completedId);
    const allOtherDone = otherDeps.every(depId => getStatus(depId) === 'done');

    if (allOtherDone && status !== 'ready') {
      unblocked.push(id);
    }
  }

  return unblocked;
}

export function validateGraph(
  taskIds: string[],
  getDependencies: (id: string) => string[]
): { valid: boolean; errors: string[] } {
  const adjacency = new Map<string, string[]>();
  for (const id of taskIds) {
    adjacency.set(id, getDependencies(id));
  }

  const errors: string[] = [];

  const cycles = detectCycles(adjacency);
  if (cycles.length > 0) {
    for (const cycle of cycles) {
      errors.push(`Cycle detected: ${cycle.join(' -> ')}`);
    }
  }

  for (const [id, deps] of adjacency) {
    for (const dep of deps) {
      if (!adjacency.has(dep)) {
        errors.push(`Task ${id} depends on non-existent task ${dep}`);
      }
    }
  }

  for (const [id, deps] of adjacency) {
    if (deps.includes(id)) {
      errors.push(`Task ${id} depends on itself`);
    }
  }

  return { valid: errors.length === 0, errors };
}