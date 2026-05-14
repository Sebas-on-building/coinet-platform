/**
 * L12.4 — Cycle detector (§12.4.9).
 *
 * Iterative three-color DFS. Returns ok + offending edge refs when a cycle
 * is detected. Used by the DAG validator and the toposort guard.
 */

import { L12ScenarioDagEdge } from './scenario-dag-edge';
import { L12ScenarioDagNode } from './scenario-dag-node';

export interface L12CycleDetectionResult {
  readonly ok: boolean;
  readonly cycle_path: readonly string[];
  readonly offending_edge_ids: readonly string[];
}

type Color = 0 | 1 | 2;
const WHITE: Color = 0;
const GRAY: Color = 1;
const BLACK: Color = 2;

export function detectL12DagCycles(
  nodes: readonly L12ScenarioDagNode[],
  edges: readonly L12ScenarioDagEdge[],
): L12CycleDetectionResult {
  const adj: Map<string, Array<{ to: string; edge_id: string }>> = new Map();
  for (const n of nodes) adj.set(n.node_id, []);
  for (const e of edges) {
    const list = adj.get(e.from_node_id);
    if (list) list.push({ to: e.to_node_id, edge_id: e.edge_id });
  }
  // deterministic order: sort outgoing by (to, edge_id)
  for (const list of adj.values()) {
    list.sort((a, b) => (a.to < b.to ? -1 : a.to > b.to ? 1 : a.edge_id < b.edge_id ? -1 : 1));
  }
  const color: Map<string, Color> = new Map();
  const parent: Map<string, { from: string; edge_id: string }> = new Map();
  for (const n of nodes) color.set(n.node_id, WHITE);

  const rootOrder = [...nodes].map(n => n.node_id).sort();
  for (const start of rootOrder) {
    if (color.get(start) !== WHITE) continue;
    // iterative DFS
    const stack: Array<{ id: string; iter: number }> = [{ id: start, iter: 0 }];
    color.set(start, GRAY);
    while (stack.length > 0) {
      const top = stack[stack.length - 1]!;
      const list = adj.get(top.id) ?? [];
      if (top.iter >= list.length) {
        color.set(top.id, BLACK);
        stack.pop();
        continue;
      }
      const next = list[top.iter]!;
      top.iter += 1;
      const c = color.get(next.to) ?? WHITE;
      if (c === GRAY) {
        // cycle found: reconstruct
        const cyclePath: string[] = [next.to];
        const offending: string[] = [next.edge_id];
        let cur = top.id;
        while (cur !== next.to) {
          cyclePath.push(cur);
          const p = parent.get(cur);
          if (!p) break;
          offending.push(p.edge_id);
          cur = p.from;
        }
        cyclePath.push(next.to);
        return {
          ok: false,
          cycle_path: cyclePath.reverse(),
          offending_edge_ids: offending.reverse(),
        };
      } else if (c === WHITE) {
        parent.set(next.to, { from: top.id, edge_id: next.edge_id });
        color.set(next.to, GRAY);
        stack.push({ id: next.to, iter: 0 });
      }
    }
  }
  return { ok: true, cycle_path: [], offending_edge_ids: [] };
}
