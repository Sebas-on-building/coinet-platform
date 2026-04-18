/**
 * L6.4 — DAG Cycle Detector
 *
 * §6.4.2.5 — Acyclicity is a first-class runtime law. This detector uses an
 * iterative DFS with WHITE/GREY/BLACK coloring to find any cycle and return
 * the node path that forms it.
 */

import { L6Dag } from './dag-builder';

export interface L6CycleReport {
  readonly hasCycle: boolean;
  readonly cyclePath: readonly string[];
}

enum Color { WHITE, GREY, BLACK }

export function detectCycle(dag: L6Dag): L6CycleReport {
  const color = new Map<string, Color>();
  for (const id of dag.nodes.keys()) color.set(id, Color.WHITE);

  for (const start of dag.nodes.keys()) {
    if (color.get(start) !== Color.WHITE) continue;
    const stack: { node: string; iter: Iterator<string> }[] = [];
    const path: string[] = [];

    color.set(start, Color.GREY);
    stack.push({ node: start, iter: (dag.adjacency.get(start) ?? [])[Symbol.iterator]() });
    path.push(start);

    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const step = top.iter.next();
      if (step.done) {
        color.set(top.node, Color.BLACK);
        stack.pop();
        path.pop();
        continue;
      }
      const nxt = step.value;
      const c = color.get(nxt);
      if (c === Color.GREY) {
        const cycleStart = path.indexOf(nxt);
        const cyclePath = cycleStart >= 0
          ? [...path.slice(cycleStart), nxt]
          : [nxt, nxt];
        return { hasCycle: true, cyclePath };
      }
      if (c === Color.WHITE) {
        color.set(nxt, Color.GREY);
        stack.push({ node: nxt, iter: (dag.adjacency.get(nxt) ?? [])[Symbol.iterator]() });
        path.push(nxt);
      }
    }
  }

  return { hasCycle: false, cyclePath: [] };
}

export function assertAcyclic(dag: L6Dag): void {
  const r = detectCycle(dag);
  if (r.hasCycle) {
    throw new Error(`[L6.4] DAG cycle detected: ${r.cyclePath.join(' -> ')}`);
  }
}
