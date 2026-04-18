/**
 * L7.4 — DAG Builder
 *
 * §7.4.1.3–§7.4.1.5 — Assembles a deterministic, cycle-free, stage-legal
 * DAG for a given `L7ValidationRun` and the set of in-scope subject
 * contracts. The builder *does not* execute engines — it produces the
 * node / edge structure the runtime will walk.
 */

import {
  L7DagNode,
  L7DagNodeClass,
  L7DagStage,
  NODE_CLASS_STAGE,
  EVALUATION_DOMAIN_STAGE,
  buildDagNodeId,
  type L7EvaluationDomain,
} from './l7-dag-node';
import {
  L7DagEdge,
  L7DagEdgeClass,
  isLegalEdge,
  buildDagEdgeId,
} from './l7-dag-edge';
import { detectCycles } from './l7-cycle-detector';
import { toposort } from './l7-toposort';
import type { L7ValidationRun } from './l7-validation-run';
import type { L7ValidationSubjectContract } from '../contracts/validation-subject.contract';
import {
  L7RuntimeViolation,
  L7RuntimeViolationCode,
} from '../validation/l7-runtime-violation-codes';

export interface L7Dag {
  readonly validation_run_id: string;
  readonly nodes: readonly L7DagNode[];
  readonly edges: readonly L7DagEdge[];
  readonly topological_order: readonly string[];
}

export interface DagBuildResult {
  readonly dag: L7Dag | null;
  readonly violations: readonly L7RuntimeViolation[];
}

const EVAL_DOMAINS: readonly L7EvaluationDomain[] = [
  'INCOMPLETENESS',
  'STALENESS',
  'AMBIGUITY',
  'DEGRADATION',
];

/**
 * §7.4.1.3 — Emit the canonical 15-stage DAG for every subject bound to
 * the run. The emitted graph is guaranteed acyclic and topologically
 * deterministic when legal.
 */
export function buildValidationDag(
  run: L7ValidationRun,
  subjects: readonly L7ValidationSubjectContract[],
  engineVersions: Readonly<Record<string, string>>,
): DagBuildResult {
  const violations: L7RuntimeViolation[] = [];
  const nodes: L7DagNode[] = [];
  const edges: L7DagEdge[] = [];
  let ordinal = 0;

  // Sort subjects deterministically by id so the ordinal is stable.
  const sortedSubjects = [...subjects].sort((a, b) =>
    a.validation_subject_id < b.validation_subject_id ? -1 : 1,
  );

  for (const subject of sortedSubjects) {
    const common = {
      validation_run_id: run.validation_run_id,
      validation_subject_id: subject.validation_subject_id,
      scope_type: subject.scope_type,
      scope_id: subject.scope_id,
    };

    const inputNode = emit(nodes, L7DagNodeClass.INPUT_SURFACE_NODE, common, null, 'claim-assembly-engine', engineVersions, ordinal++);
    const subjectNode = emit(nodes, L7DagNodeClass.VALIDATION_SUBJECT_NODE, common, null, 'claim-assembly-engine', engineVersions, ordinal++);
    const supportNode = emit(nodes, L7DagNodeClass.SUPPORT_RESOLUTION_NODE, common, null, 'support-surface-resolver', engineVersions, ordinal++);
    const challengeNode = emit(nodes, L7DagNodeClass.CHALLENGE_RESOLUTION_NODE, common, null, 'challenge-surface-resolver', engineVersions, ordinal++);
    const candidateNode = emit(nodes, L7DagNodeClass.CONTRADICTION_CANDIDATE_NODE, common, null, 'contradiction-detection-engine', engineVersions, ordinal++);
    const clusterNode = emit(nodes, L7DagNodeClass.CONTRADICTION_CLUSTER_NODE, common, null, 'contradiction-cluster-engine', engineVersions, ordinal++);

    // Four evaluation nodes share node class but have distinct stages via domain tag.
    const evalNodes: L7DagNode[] = [];
    for (const domain of EVAL_DOMAINS) {
      const stage = EVALUATION_DOMAIN_STAGE[domain];
      const node: L7DagNode = {
        node_id: buildDagNodeId({
          node_class: L7DagNodeClass.EVALUATION_NODE,
          validation_run_id: common.validation_run_id,
          validation_subject_id: common.validation_subject_id,
          scope_type: common.scope_type,
          scope_id: common.scope_id,
          evaluation_domain: domain,
        }),
        node_class: L7DagNodeClass.EVALUATION_NODE,
        stage,
        validation_subject_id: common.validation_subject_id,
        scope_type: common.scope_type,
        scope_id: common.scope_id,
        evaluation_domain: domain,
        deterministic_inputs: [supportNode.node_id, challengeNode.node_id, clusterNode.node_id],
        engine_id: `${domain.toLowerCase()}-engine`,
        engine_version: engineVersions[`${domain.toLowerCase()}-engine`] ?? '0.0.0',
        created_at_ordinal: ordinal++,
      };
      nodes.push(node);
      evalNodes.push(node);
    }

    const classificationNode = emit(nodes, L7DagNodeClass.VALIDATION_CLASSIFICATION_NODE, common, null, 'validation-classification-engine', engineVersions, ordinal++);
    const confidenceNode = emit(nodes, L7DagNodeClass.CONFIDENCE_NODE, common, null, 'validation-confidence-engine', engineVersions, ordinal++);
    const restrictionNode = emit(nodes, L7DagNodeClass.RESTRICTION_NODE, common, null, 'restriction-profile-engine', engineVersions, ordinal++);
    const evidenceNode = emit(nodes, L7DagNodeClass.EVIDENCE_PACK_NODE, common, null, 'validation-evidence-pack-builder', engineVersions, ordinal++);
    const materializationNode = emit(nodes, L7DagNodeClass.MATERIALIZATION_NODE, common, null, 'validation-materializer', engineVersions, ordinal++);

    addEdge(edges, violations, L7DagEdgeClass.INPUT_TO_SUBJECT, inputNode, subjectNode);
    addEdge(edges, violations, L7DagEdgeClass.SUBJECT_TO_SUPPORT, subjectNode, supportNode);
    addEdge(edges, violations, L7DagEdgeClass.SUBJECT_TO_CHALLENGE, subjectNode, challengeNode);
    addEdge(edges, violations, L7DagEdgeClass.SUPPORT_TO_CONTRADICTION, supportNode, candidateNode);
    addEdge(edges, violations, L7DagEdgeClass.CHALLENGE_TO_CONTRADICTION, challengeNode, candidateNode);
    addEdge(edges, violations, L7DagEdgeClass.CONTRADICTION_TO_CLUSTER, candidateNode, clusterNode);
    for (const ev of evalNodes) {
      addEdge(edges, violations, L7DagEdgeClass.CLUSTER_TO_EVALUATION, clusterNode, ev);
      addEdge(edges, violations, L7DagEdgeClass.SUPPORT_TO_EVALUATION, supportNode, ev);
      addEdge(edges, violations, L7DagEdgeClass.CHALLENGE_TO_EVALUATION, challengeNode, ev);
      addEdge(edges, violations, L7DagEdgeClass.EVALUATION_TO_CLASSIFICATION, ev, classificationNode);
    }
    addEdge(edges, violations, L7DagEdgeClass.CLUSTER_TO_CLASSIFICATION, clusterNode, classificationNode);
    addEdge(edges, violations, L7DagEdgeClass.SUPPORT_TO_CLASSIFICATION, supportNode, classificationNode);
    addEdge(edges, violations, L7DagEdgeClass.CLASSIFICATION_TO_CONFIDENCE, classificationNode, confidenceNode);
    addEdge(edges, violations, L7DagEdgeClass.CLUSTER_TO_CONFIDENCE, clusterNode, confidenceNode);
    addEdge(edges, violations, L7DagEdgeClass.CONFIDENCE_TO_RESTRICTION, confidenceNode, restrictionNode);
    addEdge(edges, violations, L7DagEdgeClass.CLASSIFICATION_TO_RESTRICTION, classificationNode, restrictionNode);
    addEdge(edges, violations, L7DagEdgeClass.CLUSTER_TO_RESTRICTION, clusterNode, restrictionNode);
    addEdge(edges, violations, L7DagEdgeClass.CLASSIFICATION_TO_EVIDENCE, classificationNode, evidenceNode);
    addEdge(edges, violations, L7DagEdgeClass.CLUSTER_TO_EVIDENCE, clusterNode, evidenceNode);
    addEdge(edges, violations, L7DagEdgeClass.CONFIDENCE_TO_EVIDENCE, confidenceNode, evidenceNode);
    addEdge(edges, violations, L7DagEdgeClass.CLASSIFICATION_TO_MATERIALIZATION, classificationNode, materializationNode);
    addEdge(edges, violations, L7DagEdgeClass.RESTRICTION_TO_MATERIALIZATION, restrictionNode, materializationNode);
    addEdge(edges, violations, L7DagEdgeClass.EVIDENCE_TO_MATERIALIZATION, evidenceNode, materializationNode);
  }

  // Reject duplicate ids.
  const seen = new Set<string>();
  for (const n of nodes) {
    if (seen.has(n.node_id)) {
      violations.push({
        code: L7RuntimeViolationCode.DAG_DUPLICATE_NODE_ID,
        source: 'l7-dag-builder',
        nodeId: n.node_id,
        validation_run_id: run.validation_run_id,
        validation_subject_id: n.validation_subject_id,
        detail: `duplicate node id ${n.node_id}`,
        context: {},
      });
    }
    seen.add(n.node_id);
  }

  // §7.4.1.4 — Stage must match the node class (tests every materialised node).
  for (const n of nodes) {
    const expected = n.evaluation_domain
      ? EVALUATION_DOMAIN_STAGE[n.evaluation_domain]
      : NODE_CLASS_STAGE[n.node_class];
    if (n.stage !== expected) {
      violations.push({
        code: L7RuntimeViolationCode.DAG_NODE_STAGE_MISMATCH,
        source: 'l7-dag-builder',
        nodeId: n.node_id,
        validation_run_id: run.validation_run_id,
        validation_subject_id: n.validation_subject_id,
        detail: `node ${n.node_id} stage ${n.stage} != expected ${expected}`,
        context: { node_class: n.node_class, stage: n.stage, expected },
      });
    }
  }

  // §7.4.1.8 — cycles reject the build.
  const cycles = detectCycles(nodes.map(n => n.node_id), edges);
  if (!cycles.acyclic) {
    violations.push({
      code: L7RuntimeViolationCode.DAG_CYCLE_DETECTED,
      source: 'l7-dag-builder',
      nodeId: null,
      validation_run_id: run.validation_run_id,
      validation_subject_id: null,
      detail: `cycles detected: ${cycles.cycles.length}`,
      context: { cycles: cycles.cycles },
    });
  }

  if (violations.length > 0) {
    return { dag: null, violations };
  }

  // Topological order. Must succeed if we got here.
  const ts = toposort(nodes, edges);
  if (!ts.ok) {
    violations.push({
      code: L7RuntimeViolationCode.DAG_UNRESOLVED_DEPENDENCY,
      source: 'l7-dag-builder',
      nodeId: null,
      validation_run_id: run.validation_run_id,
      validation_subject_id: null,
      detail: `toposort failed: ${ts.reason}`,
      context: {},
    });
    return { dag: null, violations };
  }

  return {
    dag: {
      validation_run_id: run.validation_run_id,
      nodes,
      edges,
      topological_order: ts.order,
    },
    violations,
  };
}

function emit(
  nodes: L7DagNode[],
  cls: L7DagNodeClass,
  common: { validation_run_id: string; validation_subject_id: string; scope_type: string; scope_id: string },
  domain: L7EvaluationDomain | null,
  engineId: string,
  engineVersions: Readonly<Record<string, string>>,
  ordinal: number,
): L7DagNode {
  const node: L7DagNode = {
    node_id: buildDagNodeId({
      node_class: cls,
      validation_run_id: common.validation_run_id,
      validation_subject_id: common.validation_subject_id,
      scope_type: common.scope_type,
      scope_id: common.scope_id,
      evaluation_domain: domain,
    }),
    node_class: cls,
    stage: NODE_CLASS_STAGE[cls],
    validation_subject_id: common.validation_subject_id,
    scope_type: common.scope_type,
    scope_id: common.scope_id,
    evaluation_domain: domain,
    deterministic_inputs: [],
    engine_id: engineId,
    engine_version: engineVersions[engineId] ?? '0.0.0',
    created_at_ordinal: ordinal,
  };
  nodes.push(node);
  return node;
}

function addEdge(
  edges: L7DagEdge[],
  violations: L7RuntimeViolation[],
  edgeClass: L7DagEdgeClass,
  from: L7DagNode,
  to: L7DagNode,
): void {
  if (!isLegalEdge(edgeClass, from.node_class, to.node_class)) {
    violations.push({
      code: L7RuntimeViolationCode.DAG_ILLEGAL_EDGE_TRANSITION,
      source: 'l7-dag-builder',
      nodeId: from.node_id,
      validation_run_id: null,
      validation_subject_id: from.validation_subject_id,
      detail: `illegal edge ${edgeClass} ${from.node_class}→${to.node_class}`,
      context: { edgeClass, fromClass: from.node_class, toClass: to.node_class },
    });
    return;
  }
  edges.push({
    edge_id: buildDagEdgeId(edgeClass, from.node_id, to.node_id),
    edge_class: edgeClass,
    from_node_id: from.node_id,
    to_node_id: to.node_id,
  });
}
