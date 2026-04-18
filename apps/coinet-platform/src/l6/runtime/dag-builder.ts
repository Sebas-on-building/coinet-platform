/**
 * L6.4 — DAG Builder
 *
 * §6.4.2 — Constructs an executable DAG from nodes + edges, validating
 * edge legality and reachability and surfacing structural violations
 * before compute begins.
 */

import {
  L6DagNode,
  L6DagNodeClass,
  canonicalNodeId,
} from './dag-node';
import {
  L6DagEdge,
  L6EdgeClass,
  canonicalEdgeKey,
  isLegalEdge,
} from './dag-edge';

export enum L6DagStructuralViolationCode {
  DUPLICATE_NODE = 'L6DAG_DUPLICATE_NODE',
  DUPLICATE_EDGE = 'L6DAG_DUPLICATE_EDGE',
  UNKNOWN_FROM_NODE = 'L6DAG_UNKNOWN_FROM',
  UNKNOWN_TO_NODE = 'L6DAG_UNKNOWN_TO',
  ILLEGAL_EDGE_PAIR = 'L6DAG_ILLEGAL_EDGE_PAIR',
  ORPHAN_NODE = 'L6DAG_ORPHAN_NODE',
  SELF_LOOP = 'L6DAG_SELF_LOOP',
}

export interface L6DagStructuralViolation {
  readonly code: L6DagStructuralViolationCode;
  readonly detail: string;
  readonly node_id?: string;
  readonly edge_key?: string;
}

export interface L6Dag {
  readonly nodes: ReadonlyMap<string, L6DagNode>;
  readonly edges: readonly L6DagEdge[];
  readonly adjacency: ReadonlyMap<string, readonly string[]>;
  readonly reverseAdjacency: ReadonlyMap<string, readonly string[]>;
}

export interface L6DagBuildResult {
  readonly dag: L6Dag | null;
  readonly violations: readonly L6DagStructuralViolation[];
}

export function buildL6Dag(
  nodeList: readonly L6DagNode[],
  edgeList: readonly L6DagEdge[],
): L6DagBuildResult {
  const violations: L6DagStructuralViolation[] = [];

  const nodes = new Map<string, L6DagNode>();
  for (const n of nodeList) {
    if (nodes.has(n.node_id)) {
      violations.push({
        code: L6DagStructuralViolationCode.DUPLICATE_NODE,
        detail: `Duplicate node_id "${n.node_id}".`,
        node_id: n.node_id,
      });
      continue;
    }
    nodes.set(n.node_id, n);
  }

  const adjacency = new Map<string, string[]>();
  const reverseAdjacency = new Map<string, string[]>();
  for (const id of nodes.keys()) {
    adjacency.set(id, []);
    reverseAdjacency.set(id, []);
  }

  const seenEdgeKeys = new Set<string>();
  const edges: L6DagEdge[] = [];

  for (const e of edgeList) {
    const key = canonicalEdgeKey(e);
    if (seenEdgeKeys.has(key)) {
      violations.push({
        code: L6DagStructuralViolationCode.DUPLICATE_EDGE,
        detail: `Duplicate edge "${key}".`, edge_key: key,
      });
      continue;
    }
    if (e.from_node_id === e.to_node_id) {
      violations.push({
        code: L6DagStructuralViolationCode.SELF_LOOP,
        detail: `Self-loop on node "${e.from_node_id}".`, edge_key: key,
      });
      continue;
    }
    const from = nodes.get(e.from_node_id);
    const to = nodes.get(e.to_node_id);
    if (!from) {
      violations.push({
        code: L6DagStructuralViolationCode.UNKNOWN_FROM_NODE,
        detail: `Edge references unknown from_node "${e.from_node_id}".`, edge_key: key,
      });
      continue;
    }
    if (!to) {
      violations.push({
        code: L6DagStructuralViolationCode.UNKNOWN_TO_NODE,
        detail: `Edge references unknown to_node "${e.to_node_id}".`, edge_key: key,
      });
      continue;
    }
    if (!isLegalEdge(e.edge_class, from.node_class, to.node_class)) {
      violations.push({
        code: L6DagStructuralViolationCode.ILLEGAL_EDGE_PAIR,
        detail: `Edge class ${e.edge_class} is not legal between ${from.node_class} → ${to.node_class}.`,
        edge_key: key,
      });
      continue;
    }
    seenEdgeKeys.add(key);
    edges.push(e);
    adjacency.get(e.from_node_id)!.push(e.to_node_id);
    reverseAdjacency.get(e.to_node_id)!.push(e.from_node_id);
  }

  for (const id of nodes.keys()) {
    const out = adjacency.get(id) ?? [];
    const inn = reverseAdjacency.get(id) ?? [];
    if (out.length === 0 && inn.length === 0) {
      violations.push({
        code: L6DagStructuralViolationCode.ORPHAN_NODE,
        detail: `Node "${id}" has no incoming or outgoing edges.`,
        node_id: id,
      });
    }
  }

  if (violations.length > 0) {
    return { dag: null, violations };
  }

  const frozenAdj = new Map<string, readonly string[]>();
  const frozenRev = new Map<string, readonly string[]>();
  for (const [k, v] of adjacency) frozenAdj.set(k, Object.freeze([...v]));
  for (const [k, v] of reverseAdjacency) frozenRev.set(k, Object.freeze([...v]));

  return {
    dag: {
      nodes,
      edges,
      adjacency: frozenAdj,
      reverseAdjacency: frozenRev,
    },
    violations: [],
  };
}

export function legalNodeClassesForPrimitive(
  primitive_id: string,
  isEvent: boolean,
): readonly L6DagNodeClass[] {
  return isEvent
    ? [L6DagNodeClass.EVENT_CANDIDATE, L6DagNodeClass.EVENT_LIFECYCLE]
    : [L6DagNodeClass.PRIMITIVE_FEATURE, L6DagNodeClass.COMPOSITE_FEATURE];
}

export { canonicalNodeId };
