/**
 * L8.4 — Deterministic Topological Sort
 *
 * §8.4.2.6 — Kahn's algorithm with stable (stage, node_id) tie-break.
 */

import { L8DagNode, L8_STAGE_INDEX } from './regime-dag-node';
import type { L8DagEdge } from './regime-dag-edge';

export interface L8ToposortResult {
  readonly order: readonly string[];
  readonly ok: boolean;
  readonly reason: string | null;
}

export function l8Toposort(
  nodes: readonly L8DagNode[],
  edges: readonly L8DagEdge[],
): L8ToposortResult {
  const byId = new Map<string, L8DagNode>();
  for (const n of nodes) byId.set(n.node_id, n);

  const indegree = new Map<string, number>();
  for (const n of nodes) indegree.set(n.node_id, 0);
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.node_id, []);

  for (const e of edges) {
    if (!byId.has(e.from_node_id) || !byId.has(e.to_node_id)) {
      return {
        order: [],
        ok: false,
        reason: `edge references unknown node: ${e.edge_id}`,
      };
    }
    adj.get(e.from_node_id)!.push(e.to_node_id);
    indegree.set(e.to_node_id, (indegree.get(e.to_node_id) ?? 0) + 1);
  }

  const ready: L8DagNode[] = [];
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

function sortReady(ready: L8DagNode[]): void {
  ready.sort((a, b) => {
    const sa = L8_STAGE_INDEX[a.stage];
    const sb = L8_STAGE_INDEX[b.stage];
    if (sa !== sb) return sa - sb;
    if (a.node_id < b.node_id) return -1;
    if (a.node_id > b.node_id) return 1;
    return 0;
  });
}
