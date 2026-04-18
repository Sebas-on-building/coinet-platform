/**
 * L6.4 — DAG Topological Sort
 *
 * §6.4.2 — Produces a deterministic execution order. Ties are broken by
 * node_id lexicographic order so the planner is reproducible across runs.
 */

import { L6Dag } from './dag-builder';
import { detectCycle } from './dag-cycle-detector';

export interface L6TopoResult {
  readonly order: readonly string[];
  readonly cyclePath: readonly string[];
}

export function topoSort(dag: L6Dag): L6TopoResult {
  const cycle = detectCycle(dag);
  if (cycle.hasCycle) {
    return { order: [], cyclePath: cycle.cyclePath };
  }

  const indegree = new Map<string, number>();
  for (const id of dag.nodes.keys()) indegree.set(id, 0);
  for (const e of dag.edges) {
    indegree.set(e.to_node_id, (indegree.get(e.to_node_id) ?? 0) + 1);
  }

  const ready: string[] = [];
  for (const [id, d] of indegree) if (d === 0) ready.push(id);
  ready.sort();

  const order: string[] = [];
  while (ready.length > 0) {
    const next = ready.shift()!;
    order.push(next);
    for (const nb of dag.adjacency.get(next) ?? []) {
      const d = (indegree.get(nb) ?? 0) - 1;
      indegree.set(nb, d);
      if (d === 0) {
        const insertAt = lowerBound(ready, nb);
        ready.splice(insertAt, 0, nb);
      }
    }
  }

  if (order.length !== dag.nodes.size) {
    return { order: [], cyclePath: [] };
  }

  return { order, cyclePath: [] };
}

function lowerBound(arr: string[], v: string): number {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid] < v) lo = mid + 1; else hi = mid;
  }
  return lo;
}
