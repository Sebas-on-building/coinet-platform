/**
 * L12.4 — Scenario DAG validator (§12.4.29).
 */

import {
  ALL_L12_DAG_EDGE_CLASSES,
  L12_LEGAL_EDGE_TRANSITIONS,
  L12DagEdgeClass,
} from '../runtime/scenario-dag-edge';
import {
  ALL_L12_DAG_NODE_CLASSES,
  L12_NODE_CLASS_STAGE,
  L12DagNodeClass,
} from '../runtime/scenario-dag-node';
import {
  L12_CANONICAL_DAG_EDGE_COUNT,
  L12_CANONICAL_DAG_NODE_COUNT,
  L12ScenarioDag,
} from '../runtime/scenario-dag-builder';
import { detectL12DagCycles } from '../runtime/scenario-cycle-detector';
import { l12ToposortDeterministic } from '../runtime/scenario-toposort';

import {
  L12RuntimeViolationCode,
  L12RuntimeViolationIssue,
  l12IssueOf,
} from './l12-runtime-violation-codes';

export interface ValidateL12DagResult {
  readonly ok: boolean;
  readonly issues: readonly L12RuntimeViolationIssue[];
}

export function validateL12ScenarioDag(dag: L12ScenarioDag): ValidateL12DagResult {
  const issues: L12RuntimeViolationIssue[] = [];

  if (dag.nodes.length !== L12_CANONICAL_DAG_NODE_COUNT) {
    issues.push(
      l12IssueOf(
        L12RuntimeViolationCode.L12R_DAG_NODE_COUNT_INVALID,
        `node count ${dag.nodes.length} ≠ ${L12_CANONICAL_DAG_NODE_COUNT}`,
      ),
    );
  }
  if (dag.edges.length !== L12_CANONICAL_DAG_EDGE_COUNT) {
    issues.push(
      l12IssueOf(
        L12RuntimeViolationCode.L12R_DAG_EDGE_COUNT_INVALID,
        `edge count ${dag.edges.length} ≠ ${L12_CANONICAL_DAG_EDGE_COUNT}`,
      ),
    );
  }

  // All node classes present, no duplicates, valid stage binding
  const presentNodeClasses = new Set<L12DagNodeClass>();
  const seenNodeIds = new Set<string>();
  for (const n of dag.nodes) {
    if (presentNodeClasses.has(n.node_class)) {
      issues.push(
        l12IssueOf(L12RuntimeViolationCode.L12R_DAG_NODE_DUPLICATE, `duplicate class ${n.node_class}`, n.node_id),
      );
    }
    presentNodeClasses.add(n.node_class);
    if (seenNodeIds.has(n.node_id)) {
      issues.push(
        l12IssueOf(L12RuntimeViolationCode.L12R_DAG_NODE_DUPLICATE, `duplicate node id ${n.node_id}`, n.node_id),
      );
    }
    seenNodeIds.add(n.node_id);
    const expected = L12_NODE_CLASS_STAGE[n.node_class];
    if (n.stage !== expected) {
      issues.push(
        l12IssueOf(
          L12RuntimeViolationCode.L12R_DAG_NODE_CLASS_STAGE_MISMATCH,
          `node ${n.node_class} stage ${n.stage} ≠ expected ${expected}`,
          n.node_id,
          n.stage,
        ),
      );
    }
  }
  for (const cls of ALL_L12_DAG_NODE_CLASSES) {
    if (!presentNodeClasses.has(cls)) {
      issues.push(
        l12IssueOf(L12RuntimeViolationCode.L12R_DAG_NODE_MISSING, `missing node class ${cls}`),
      );
    }
  }

  // Edge legality
  const seenEdgeIds = new Set<string>();
  const presentEdgeClasses = new Set<L12DagEdgeClass>();
  const nodeById = new Map(dag.nodes.map(n => [n.node_id, n]));
  for (const e of dag.edges) {
    if (seenEdgeIds.has(e.edge_id)) {
      issues.push(
        l12IssueOf(L12RuntimeViolationCode.L12R_DAG_EDGE_DUPLICATE, `duplicate edge id ${e.edge_id}`, e.edge_id),
      );
    }
    seenEdgeIds.add(e.edge_id);
    presentEdgeClasses.add(e.edge_class);
    const reg = L12_LEGAL_EDGE_TRANSITIONS[e.edge_class];
    if (!reg) {
      issues.push(
        l12IssueOf(L12RuntimeViolationCode.L12R_DAG_EDGE_UNREGISTERED, `unregistered edge class ${e.edge_class}`, e.edge_id),
      );
      continue;
    }
    const fromNode = nodeById.get(e.from_node_id);
    const toNode = nodeById.get(e.to_node_id);
    if (!fromNode || !toNode) {
      issues.push(
        l12IssueOf(L12RuntimeViolationCode.L12R_DAG_EDGE_ILLEGAL, `edge ${e.edge_class} endpoint missing`, e.edge_id),
      );
      continue;
    }
    if (fromNode.node_class !== reg.from || toNode.node_class !== reg.to) {
      issues.push(
        l12IssueOf(
          L12RuntimeViolationCode.L12R_DAG_EDGE_ILLEGAL,
          `edge ${e.edge_class} endpoints (${fromNode.node_class}→${toNode.node_class}) ≠ registered`,
          e.edge_id,
        ),
      );
    }
    if (fromNode.stage >= toNode.stage) {
      issues.push(
        l12IssueOf(
          L12RuntimeViolationCode.L12R_DAG_EDGE_BACKWARD,
          `edge ${e.edge_class} stage ${fromNode.stage}→${toNode.stage} not forward`,
          e.edge_id,
        ),
      );
    }
  }
  for (const cls of ALL_L12_DAG_EDGE_CLASSES) {
    if (!presentEdgeClasses.has(cls)) {
      issues.push(
        l12IssueOf(L12RuntimeViolationCode.L12R_DAG_EDGE_ILLEGAL, `missing edge class ${cls}`),
      );
    }
  }

  // Cycle / toposort
  const cycle = detectL12DagCycles(dag.nodes, dag.edges);
  if (!cycle.ok) {
    issues.push(
      l12IssueOf(
        L12RuntimeViolationCode.L12R_DAG_CYCLE_DETECTED,
        `cycle path: ${cycle.cycle_path.join(' → ')}`,
      ),
    );
  }
  const topo = l12ToposortDeterministic(dag.nodes, dag.edges);
  if (!topo.ok) {
    issues.push(
      l12IssueOf(L12RuntimeViolationCode.L12R_TOPO_ORDER_UNSTABLE, `toposort failed: ${topo.reason}`),
    );
  }

  return { ok: issues.length === 0, issues };
}
