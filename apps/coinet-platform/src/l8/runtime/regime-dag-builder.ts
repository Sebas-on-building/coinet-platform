/**
 * L8.4 — DAG Builder
 *
 * §8.4.2.3-5 — Assembles a deterministic, cycle-free, stage-legal DAG
 * for a given `L8RegimeRun` and the set of in-scope regime subjects.
 * The builder does not execute engines — it produces the node/edge
 * structure the runtime will walk.
 */

import {
  L8DagNode,
  L8DagNodeClass,
  L8_NODE_CLASS_STAGE,
  L8_QUALITY_DOMAIN_STAGE,
  buildL8DagNodeId,
  type L8QualityDomain,
} from './regime-dag-node';
import {
  L8DagEdge,
  L8DagEdgeClass,
  isLegalL8Edge,
  buildL8DagEdgeId,
} from './regime-dag-edge';
import { detectL8Cycles } from './regime-cycle-detector';
import { l8Toposort } from './regime-toposort';
import type { L8RegimeRun } from './regime-compute-run';
import type { L8RegimeSubjectContract } from '../contracts/regime-subject.contract';
import {
  L8RuntimeViolation,
  L8RuntimeViolationCode,
} from '../validation/l8-runtime-violation-codes';

export interface L8RegimeDag {
  readonly regime_run_id: string;
  readonly nodes: readonly L8DagNode[];
  readonly edges: readonly L8DagEdge[];
  readonly topological_order: readonly string[];
}

export interface L8DagBuildResult {
  readonly dag: L8RegimeDag | null;
  readonly violations: readonly L8RuntimeViolation[];
}

const QUALITY_DOMAINS: readonly L8QualityDomain[] = [
  'AMBIGUITY',
  'STALENESS',
  'DEGRADATION',
];

/**
 * §8.4.2.3 — Emit the canonical 13-stage DAG for every subject bound to
 * the run.
 */
export function buildL8RegimeDag(
  run: L8RegimeRun,
  subjects: readonly L8RegimeSubjectContract[],
  engineVersions: Readonly<Record<string, string>>,
): L8DagBuildResult {
  const violations: L8RuntimeViolation[] = [];
  const nodes: L8DagNode[] = [];
  const edges: L8DagEdge[] = [];
  let ordinal = 0;

  const sortedSubjects = [...subjects].sort((a, b) =>
    a.regime_subject_id < b.regime_subject_id ? -1 : 1,
  );

  for (const subject of sortedSubjects) {
    const common = {
      regime_run_id: run.regime_run_id,
      regime_subject_id: subject.regime_subject_id,
      regime_family: subject.regime_family,
      scope_type: subject.scope_type,
      scope_id: subject.scope_id,
    };

    const inputNode = emit(nodes, L8DagNodeClass.INPUT_NODE, common,
      null, 'regime-assembly-engine', engineVersions, ordinal++);
    const subjectNode = emit(nodes, L8DagNodeClass.SUBJECT_NODE, common,
      null, 'regime-assembly-engine', engineVersions, ordinal++);
    const inputResolutionNode = emit(nodes, L8DagNodeClass.INPUT_RESOLUTION_NODE,
      common, null, 'regime-input-resolver', engineVersions, ordinal++);
    const candidateNode = emit(nodes, L8DagNodeClass.CANDIDATE_NODE, common,
      null, 'regime-candidate-engine', engineVersions, ordinal++);
    const transitionNode = emit(nodes, L8DagNodeClass.TRANSITION_NODE, common,
      null, 'transition-detection-engine', engineVersions, ordinal++);

    // Three quality nodes share node class but occupy distinct stages.
    const qualityNodes: L8DagNode[] = [];
    for (const domain of QUALITY_DOMAINS) {
      const stage = L8_QUALITY_DOMAIN_STAGE[domain];
      const node: L8DagNode = {
        node_id: buildL8DagNodeId({
          node_class: L8DagNodeClass.QUALITY_NODE,
          regime_run_id: common.regime_run_id,
          regime_subject_id: common.regime_subject_id,
          scope_type: common.scope_type,
          scope_id: common.scope_id,
          quality_domain: domain,
        }),
        node_class: L8DagNodeClass.QUALITY_NODE,
        stage,
        regime_subject_id: common.regime_subject_id,
        regime_family: common.regime_family,
        scope_type: common.scope_type,
        scope_id: common.scope_id,
        quality_domain: domain,
        deterministic_inputs: [candidateNode.node_id, transitionNode.node_id],
        engine_id: `regime-${domain.toLowerCase()}-engine`,
        engine_version:
          engineVersions[`regime-${domain.toLowerCase()}-engine`] ?? '0.0.0',
        created_at_ordinal: ordinal++,
      };
      nodes.push(node);
      qualityNodes.push(node);
    }

    const classificationNode = emit(nodes, L8DagNodeClass.CLASSIFICATION_NODE,
      common, null, 'regime-classification-engine', engineVersions, ordinal++);
    const confidenceNode = emit(nodes, L8DagNodeClass.CONFIDENCE_NODE,
      common, null, 'regime-confidence-engine', engineVersions, ordinal++);
    const multiplierNode = emit(nodes, L8DagNodeClass.MULTIPLIER_NODE,
      common, null, 'regime-multiplier-engine', engineVersions, ordinal++);
    const evidenceNode = emit(nodes, L8DagNodeClass.EVIDENCE_NODE,
      common, null, 'regime-evidence-pack-builder', engineVersions, ordinal++);
    const materializationNode = emit(nodes, L8DagNodeClass.MATERIALIZATION_NODE,
      common, null, 'regime-materializer', engineVersions, ordinal++);

    addEdge(edges, violations, L8DagEdgeClass.INPUT_TO_SUBJECT,
      inputNode, subjectNode);
    addEdge(edges, violations, L8DagEdgeClass.SUBJECT_TO_INPUT_RESOLUTION,
      subjectNode, inputResolutionNode);
    addEdge(edges, violations, L8DagEdgeClass.INPUT_RESOLUTION_TO_CANDIDATE,
      inputResolutionNode, candidateNode);
    addEdge(edges, violations, L8DagEdgeClass.CANDIDATE_TO_TRANSITION,
      candidateNode, transitionNode);

    for (const q of qualityNodes) {
      addEdge(edges, violations, L8DagEdgeClass.CANDIDATE_TO_QUALITY,
        candidateNode, q);
      addEdge(edges, violations, L8DagEdgeClass.TRANSITION_TO_QUALITY,
        transitionNode, q);
      addEdge(edges, violations, L8DagEdgeClass.QUALITY_TO_CLASSIFICATION,
        q, classificationNode);
    }

    addEdge(edges, violations, L8DagEdgeClass.CANDIDATE_TO_CLASSIFICATION,
      candidateNode, classificationNode);
    addEdge(edges, violations, L8DagEdgeClass.TRANSITION_TO_CLASSIFICATION,
      transitionNode, classificationNode);
    addEdge(edges, violations, L8DagEdgeClass.CLASSIFICATION_TO_CONFIDENCE,
      classificationNode, confidenceNode);
    addEdge(edges, violations, L8DagEdgeClass.TRANSITION_TO_CONFIDENCE,
      transitionNode, confidenceNode);
    addEdge(edges, violations, L8DagEdgeClass.CLASSIFICATION_TO_MULTIPLIER,
      classificationNode, multiplierNode);
    addEdge(edges, violations, L8DagEdgeClass.CONFIDENCE_TO_MULTIPLIER,
      confidenceNode, multiplierNode);
    addEdge(edges, violations, L8DagEdgeClass.CLASSIFICATION_TO_EVIDENCE,
      classificationNode, evidenceNode);
    addEdge(edges, violations, L8DagEdgeClass.CONFIDENCE_TO_EVIDENCE,
      confidenceNode, evidenceNode);
    addEdge(edges, violations, L8DagEdgeClass.MULTIPLIER_TO_EVIDENCE,
      multiplierNode, evidenceNode);
    addEdge(edges, violations, L8DagEdgeClass.CLASSIFICATION_TO_MATERIALIZATION,
      classificationNode, materializationNode);
    addEdge(edges, violations, L8DagEdgeClass.EVIDENCE_TO_MATERIALIZATION,
      evidenceNode, materializationNode);
  }

  // Duplicate ids
  const seen = new Set<string>();
  for (const n of nodes) {
    if (seen.has(n.node_id)) {
      violations.push({
        code: L8RuntimeViolationCode.DAG_DUPLICATE_NODE_ID,
        source: 'l8-dag-builder',
        nodeId: n.node_id,
        regime_run_id: run.regime_run_id,
        regime_subject_id: n.regime_subject_id,
        detail: `duplicate node id ${n.node_id}`,
        context: {},
      });
    }
    seen.add(n.node_id);
  }

  // Stage must match node class
  for (const n of nodes) {
    const expected = n.quality_domain
      ? L8_QUALITY_DOMAIN_STAGE[n.quality_domain]
      : L8_NODE_CLASS_STAGE[n.node_class];
    if (n.stage !== expected) {
      violations.push({
        code: L8RuntimeViolationCode.DAG_NODE_STAGE_MISMATCH,
        source: 'l8-dag-builder',
        nodeId: n.node_id,
        regime_run_id: run.regime_run_id,
        regime_subject_id: n.regime_subject_id,
        detail: `node ${n.node_id} stage ${n.stage} != expected ${expected}`,
        context: { node_class: n.node_class, stage: n.stage, expected },
      });
    }
  }

  // Cycle detection
  const cycles = detectL8Cycles(nodes.map(n => n.node_id), edges);
  if (!cycles.acyclic) {
    violations.push({
      code: L8RuntimeViolationCode.DAG_CYCLE_DETECTED,
      source: 'l8-dag-builder',
      nodeId: null,
      regime_run_id: run.regime_run_id,
      regime_subject_id: null,
      detail: `cycles detected: ${cycles.cycles.length}`,
      context: { cycles: cycles.cycles },
    });
  }

  if (violations.length > 0) {
    return { dag: null, violations };
  }

  const ts = l8Toposort(nodes, edges);
  if (!ts.ok) {
    violations.push({
      code: L8RuntimeViolationCode.DAG_UNRESOLVED_DEPENDENCY,
      source: 'l8-dag-builder',
      nodeId: null,
      regime_run_id: run.regime_run_id,
      regime_subject_id: null,
      detail: `toposort failed: ${ts.reason}`,
      context: {},
    });
    return { dag: null, violations };
  }

  return {
    dag: {
      regime_run_id: run.regime_run_id,
      nodes,
      edges,
      topological_order: ts.order,
    },
    violations,
  };
}

function emit(
  nodes: L8DagNode[],
  cls: L8DagNodeClass,
  common: {
    regime_run_id: string;
    regime_subject_id: string;
    regime_family: string;
    scope_type: string;
    scope_id: string;
  },
  domain: L8QualityDomain | null,
  engineId: string,
  engineVersions: Readonly<Record<string, string>>,
  ordinal: number,
): L8DagNode {
  const node: L8DagNode = {
    node_id: buildL8DagNodeId({
      node_class: cls,
      regime_run_id: common.regime_run_id,
      regime_subject_id: common.regime_subject_id,
      scope_type: common.scope_type,
      scope_id: common.scope_id,
      quality_domain: domain,
    }),
    node_class: cls,
    stage: L8_NODE_CLASS_STAGE[cls],
    regime_subject_id: common.regime_subject_id,
    regime_family: common.regime_family,
    scope_type: common.scope_type,
    scope_id: common.scope_id,
    quality_domain: domain,
    deterministic_inputs: [],
    engine_id: engineId,
    engine_version: engineVersions[engineId] ?? '0.0.0',
    created_at_ordinal: ordinal,
  };
  nodes.push(node);
  return node;
}

function addEdge(
  edges: L8DagEdge[],
  violations: L8RuntimeViolation[],
  edgeClass: L8DagEdgeClass,
  from: L8DagNode,
  to: L8DagNode,
): void {
  if (!isLegalL8Edge(edgeClass, from.node_class, to.node_class)) {
    violations.push({
      code: L8RuntimeViolationCode.DAG_ILLEGAL_EDGE_TRANSITION,
      source: 'l8-dag-builder',
      nodeId: from.node_id,
      regime_run_id: null,
      regime_subject_id: from.regime_subject_id,
      detail:
        `illegal edge ${edgeClass} ${from.node_class}→${to.node_class}`,
      context: {
        edgeClass, fromClass: from.node_class, toClass: to.node_class,
      },
    });
    return;
  }
  edges.push({
    edge_id: buildL8DagEdgeId(edgeClass, from.node_id, to.node_id),
    edge_class: edgeClass,
    from_node_id: from.node_id,
    to_node_id: to.node_id,
  });
}
