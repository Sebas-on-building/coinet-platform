/**
 * L7.4 — Deterministic Topological Sort
 *
 * §7.4.1.7 — When multiple nodes are equally available, resolve by:
 *   1. stage index (ascending)
 *   2. lexicographic node id
 *
 * Any scheduler randomness is illegal. Ties are broken by stable
 * priority-queue ordering, not by iteration order of a Set/Map.
 */

import {
  L7DagNode,
  STAGE_INDEX,
} from './l7-dag-node';
import type { L7DagEdge } from './l7-dag-edge';

export interface ToposortResult {
  readonly order: readonly string[];
  readonly ok: boolean;
  readonly reason: string | null;
}

/**
 * Kahn's algorithm with deterministic tie-break by (stage, node_id).
 */
export function toposort(
  nodes: readonly L7DagNode[],
  edges: readonly L7DagEdge[],
): ToposortResult {
  const byId = new Map<string, L7DagNode>();
  for (const n of nodes) byId.set(n.node_id, n);

  const indegree = new Map<string, number>();
  for (const n of nodes) indegree.set(n.node_id, 0);
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.node_id, []);

  for (const e of edges) {
    if (!byId.has(e.from_node_id) || !byId.has(e.to_node_id)) {
      return { order: [], ok: false, reason: `edge references unknown node: ${e.edge_id}` };
    }
    adj.get(e.from_node_id)!.push(e.to_node_id);
    indegree.set(e.to_node_id, (indegree.get(e.to_node_id) ?? 0) + 1);
  }

  const ready: L7DagNode[] = [];
  for (const n of nodes) {
    if ((indegree.get(n.node_id) ?? 0) === 0) ready.push(n);
  }
  sortReady(ready);

  const order: string[] = [];
  while (ready.length > 0) {
    const next = ready.shift()!;
    order.push(next.node_id);
    for (const succ of adj.get(next.node_id) ?? []) {
      const d = (indegree.get(succ) ?? 0) - 1;
      indegree.set(succ, d);
      if (d === 0) {
        const node = byId.get(succ);
        if (node) {
          ready.push(node);
          sortReady(ready);
        }
      }
    }
  }

  if (order.length !== nodes.length) {
    return { order: [], ok: false, reason: 'cycle-or-unresolved-dependency' };
  }
  return { order, ok: true, reason: null };
}

function sortReady(ready: L7DagNode[]): void {
  ready.sort((a, b) => {
    const sa = STAGE_INDEX[a.stage];
    const sb = STAGE_INDEX[b.stage];
    if (sa !== sb) return sa - sb;
    if (a.node_id < b.node_id) return -1;
    if (a.node_id > b.node_id) return 1;
    return 0;
  });
}
