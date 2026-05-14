/**
 * L12.4 — DAG builder (§12.4.8).
 *
 * Builds the canonical 14-node, 21-edge L12 runtime DAG for a given scenario
 * subject and policy version. Output is deterministic, cycle-free, and
 * stage-ordered.
 */

import { buildL12ScenarioReplayHash } from '../contracts/scenario-ids';
import { detectL12DagCycles } from './scenario-cycle-detector';
import {
  ALL_L12_DAG_EDGE_CLASSES,
  buildL12ScenarioDagEdge,
  L12_LEGAL_EDGE_TRANSITIONS,
  L12DagEdgeClass,
  L12ScenarioDagEdge,
} from './scenario-dag-edge';
import {
  ALL_L12_DAG_NODE_CLASSES,
  buildL12ScenarioDagNode,
  L12DagNodeClass,
  L12ScenarioDagNode,
} from './scenario-dag-node';

export interface L12ScenarioDag {
  readonly dag_id: string;
  readonly scenario_subject_id: string;
  readonly nodes: readonly L12ScenarioDagNode[];
  readonly edges: readonly L12ScenarioDagEdge[];
  readonly build_policy_version: string;
  readonly replay_hash: string;
}

export const L12_CANONICAL_DAG_NODE_COUNT = 14;
export const L12_CANONICAL_DAG_EDGE_COUNT = 21;

export interface L12DagBuildResult {
  readonly ok: boolean;
  readonly dag?: L12ScenarioDag;
  readonly errors: readonly string[];
}

/**
 * Build the canonical L12 runtime DAG.
 */
export function buildCanonicalL12ScenarioDag(input: {
  scenario_subject_id: string;
  policy_version: string;
}): L12DagBuildResult {
  const errors: string[] = [];

  // 1) Build all 14 nodes (one per class)
  const nodes: L12ScenarioDagNode[] = ALL_L12_DAG_NODE_CLASSES.map(cls =>
    buildL12ScenarioDagNode({
      scenario_subject_id: input.scenario_subject_id,
      node_class: cls,
      policy_version: input.policy_version,
    }),
  );

  // Detect duplicate node ids
  const nodeIdSet = new Set<string>();
  for (const n of nodes) {
    if (nodeIdSet.has(n.node_id)) errors.push(`duplicate node id: ${n.node_id}`);
    nodeIdSet.add(n.node_id);
  }

  // Index nodes by class
  const nodeByClass: Map<L12DagNodeClass, L12ScenarioDagNode> = new Map();
  for (const n of nodes) nodeByClass.set(n.node_class, n);

  // 2) Build edges from registered transitions
  const edges: L12ScenarioDagEdge[] = [];
  const edgeIdSet = new Set<string>();
  for (const cls of ALL_L12_DAG_EDGE_CLASSES) {
    const reg = L12_LEGAL_EDGE_TRANSITIONS[cls];
    const fromNode = nodeByClass.get(reg.from);
    const toNode = nodeByClass.get(reg.to);
    if (!fromNode || !toNode) {
      errors.push(`edge ${cls} missing endpoint node(s)`);
      continue;
    }
    const edge = buildL12ScenarioDagEdge({
      edge_class: cls,
      from_node_id: fromNode.node_id,
      to_node_id: toNode.node_id,
      policy_version: input.policy_version,
    });
    if (edgeIdSet.has(edge.edge_id)) errors.push(`duplicate edge id: ${edge.edge_id}`);
    edgeIdSet.add(edge.edge_id);
    edges.push(edge);
  }

  if (nodes.length !== L12_CANONICAL_DAG_NODE_COUNT) {
    errors.push(`expected ${L12_CANONICAL_DAG_NODE_COUNT} nodes, got ${nodes.length}`);
  }
  if (edges.length !== L12_CANONICAL_DAG_EDGE_COUNT) {
    errors.push(`expected ${L12_CANONICAL_DAG_EDGE_COUNT} edges, got ${edges.length}`);
  }

  // 3) Stage-order check on every edge
  for (const e of edges) {
    if (e.from_stage >= e.to_stage) {
      errors.push(`edge ${e.edge_class} violates stage order (from=${e.from_stage}, to=${e.to_stage})`);
    }
  }

  // 4) Cycle check
  const cycle = detectL12DagCycles(nodes, edges);
  if (!cycle.ok) {
    errors.push(`cycle detected: ${cycle.cycle_path.join(' → ')}`);
  }

  // 5) Required orderings
  const ranking = nodeByClass.get(L12DagNodeClass.SCENARIO_RANKING);
  const confidence = nodeByClass.get(L12DagNodeClass.PATH_CONFIDENCE);
  const path_construction = nodeByClass.get(L12DagNodeClass.PATH_CONSTRUCTION);
  const triggers = nodeByClass.get(L12DagNodeClass.TRIGGER_RESOLUTION);
  const invalidations = nodeByClass.get(L12DagNodeClass.INVALIDATION_RESOLUTION);
  const evidence = nodeByClass.get(L12DagNodeClass.EVIDENCE_PACK);
  const materialization = nodeByClass.get(L12DagNodeClass.MATERIALIZATION);
  if (ranking && confidence && ranking.stage <= confidence.stage) {
    errors.push('SCENARIO_RANKING must come after PATH_CONFIDENCE');
  }
  if (path_construction && triggers && path_construction.stage <= triggers.stage) {
    errors.push('PATH_CONSTRUCTION must come after TRIGGER_RESOLUTION');
  }
  if (path_construction && invalidations && path_construction.stage <= invalidations.stage) {
    errors.push('PATH_CONSTRUCTION must come after INVALIDATION_RESOLUTION');
  }
  if (materialization && evidence && materialization.stage <= evidence.stage) {
    errors.push('MATERIALIZATION must come after EVIDENCE_PACK');
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const replay_hash = buildL12ScenarioReplayHash({
    domain: 'l12.dag',
    policy_version: input.policy_version,
    material: {
      scenario_subject_id: input.scenario_subject_id,
      node_ids: [...nodes.map(n => n.node_id)].sort(),
      edge_ids: [...edges.map(e => e.edge_id)].sort(),
    },
  });
  const dag: L12ScenarioDag = {
    dag_id: `l12.dag.${replay_hash}`,
    scenario_subject_id: input.scenario_subject_id,
    nodes,
    edges,
    build_policy_version: input.policy_version,
    replay_hash,
  };
  return { ok: true, dag, errors: [] };
}
