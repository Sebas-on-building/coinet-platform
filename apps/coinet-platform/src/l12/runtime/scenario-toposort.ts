/**
 * L12.4 — Deterministic toposort (§12.4.10).
 *
 * Kahn's algorithm with deterministic tie-break on (stage ASC, node_id ASC).
 */

import { detectL12DagCycles } from './scenario-cycle-detector';
import { L12ScenarioDagEdge } from './scenario-dag-edge';
import { L12ScenarioDagNode } from './scenario-dag-node';

export interface L12ToposortResult {
  readonly ok: boolean;
  readonly order: readonly string[];
  readonly reason?: 'CYCLE' | 'MISSING_DEPENDENCY';
}

export function l12ToposortDeterministic(
  nodes: readonly L12ScenarioDagNode[],
  edges: readonly L12ScenarioDagEdge[],
): L12ToposortResult {
  const cycle = detectL12DagCycles(nodes, edges);
  if (!cycle.ok) {
    return { ok: false, order: [], reason: 'CYCLE' };
  }
  const nodeById: Map<string, L12ScenarioDagNode> = new Map();
  for (const n of nodes) nodeById.set(n.node_id, n);
  const inDeg: Map<string, number> = new Map();
  for (const n of nodes) inDeg.set(n.node_id, 0);
  for (const e of edges) {
    if (!nodeById.has(e.from_node_id) || !nodeById.has(e.to_node_id)) {
      return { ok: false, order: [], reason: 'MISSING_DEPENDENCY' };
    }
    inDeg.set(e.to_node_id, (inDeg.get(e.to_node_id) ?? 0) + 1);
  }
  const compare = (a: string, b: string): number => {
    const na = nodeById.get(a)!;
    const nb = nodeById.get(b)!;
    if (na.stage !== nb.stage) return na.stage - nb.stage;
    return a < b ? -1 : a > b ? 1 : 0;
  };
  const ready: string[] = [];
  for (const [id, d] of inDeg) if (d === 0) ready.push(id);
  ready.sort(compare);
  const order: string[] = [];
  while (ready.length > 0) {
    const id = ready.shift()!;
    order.push(id);
    for (const e of edges) {
      if (e.from_node_id !== id) continue;
      const remaining = (inDeg.get(e.to_node_id) ?? 0) - 1;
      inDeg.set(e.to_node_id, remaining);
      if (remaining === 0) {
        const idx = ready.findIndex(x => compare(e.to_node_id, x) < 0);
        if (idx === -1) ready.push(e.to_node_id);
        else ready.splice(idx, 0, e.to_node_id);
      }
    }
  }
  if (order.length !== nodes.length) {
    return { ok: false, order, reason: 'CYCLE' };
  }
  return { ok: true, order };
}
