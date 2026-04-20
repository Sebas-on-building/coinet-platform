/**
 * L10.4 — Deterministic Topological Sort
 *
 * §10.4.16.3 — Kahn's algorithm with stable (stage, node_id)
 * tie-break. Given identical DAGs the output order is identical,
 * which is what gives the L10 runtime replay stability.
 */

import { L10DagNode, L10_STAGE_INDEX } from './hypothesis-dag-node';
import type { L10DagEdge } from './hypothesis-dag-edge';

export interface L10ToposortResult {
  readonly order: readonly string[];
  readonly ok: boolean;
  readonly reason: string | null;
}

export function l10Toposort(
  nodes: readonly L10DagNode[],
  edges: readonly L10DagEdge[],
): L10ToposortResult {
  const byId = new Map<string, L10DagNode>();
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

  const ready: L10DagNode[] = [];
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

function sortReady(ready: L10DagNode[]): void {
  ready.sort((a, b) => {
    const sa = L10_STAGE_INDEX[a.stage];
    const sb = L10_STAGE_INDEX[b.stage];
    if (sa !== sb) return sa - sb;
    if (a.node_id < b.node_id) return -1;
    if (a.node_id > b.node_id) return 1;
    return 0;
  });
}
