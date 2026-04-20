/**
 * L10.4 — Hypothesis Cycle Detector
 *
 * §10.4.4 — Runtime acyclicity law. Any cyclic dependency must be
 * rejected before runtime (INV-10.4-A). Implemented as iterative
 * three-colour DFS so there is no recursion-depth limit and the
 * traversal is deterministic (§10.4.16).
 */

import type { L10DagEdge } from './hypothesis-dag-edge';

export interface L10CycleDetectionResult {
  readonly acyclic: boolean;
  readonly cycles: readonly (readonly string[])[];
}

export function detectL10Cycles(
  nodeIds: readonly string[],
  edges: readonly L10DagEdge[],
): L10CycleDetectionResult {
  const adj = new Map<string, string[]>();
  for (const id of nodeIds) adj.set(id, []);
  for (const e of edges) {
    const list = adj.get(e.from_node_id);
    if (list) list.push(e.to_node_id);
  }
  for (const list of adj.values()) list.sort();

  const color = new Map<string, 0 | 1 | 2>();
  for (const id of nodeIds) color.set(id, 0);

  const cycles: string[][] = [];
  const sortedNodes = [...nodeIds].sort();

  for (const start of sortedNodes) {
    if ((color.get(start) ?? 0) !== 0) continue;
    const stack: { node: string; cursor: number; path: string[] }[] = [
      { node: start, cursor: 0, path: [start] },
    ];
    color.set(start, 1);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const nexts = adj.get(frame.node) ?? [];
      if (frame.cursor >= nexts.length) {
        color.set(frame.node, 2);
        stack.pop();
        if (stack.length > 0) {
          stack[stack.length - 1].path.pop();
        }
        continue;
      }
      const next = nexts[frame.cursor++];
      const c = color.get(next) ?? 0;
      if (c === 1) {
        const startIdx = frame.path.indexOf(next);
        const cyclePath = startIdx >= 0
          ? [...frame.path.slice(startIdx), next]
          : [...frame.path, next];
        cycles.push(cyclePath);
      } else if (c === 0) {
        color.set(next, 1);
        stack.push({ node: next, cursor: 0, path: [...frame.path, next] });
      }
    }
  }

  return { acyclic: cycles.length === 0, cycles };
}
