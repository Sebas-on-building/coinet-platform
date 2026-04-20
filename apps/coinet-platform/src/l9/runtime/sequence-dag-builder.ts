/**
 * L9.4 — Sequence DAG Builder
 *
 * §9.4.4 — Assembles a deterministic, cycle-free, stage-legal DAG for
 * a given `L9SequenceRun` and the set of in-scope sequence subjects.
 * The builder does not execute engines — it produces the node/edge
 * structure the runtime will walk.
 */

import {
  L9DagNode,
  L9DagNodeClass,
  L9_NODE_CLASS_STAGE,
  buildL9DagNodeId,
} from './sequence-dag-node';
import {
  L9DagEdge,
  L9DagEdgeClass,
  isLegalL9Edge,
  buildL9DagEdgeId,
} from './sequence-dag-edge';
import { detectL9Cycles } from './sequence-cycle-detector';
import { l9Toposort } from './sequence-toposort';
import type { L9SequenceRun } from './sequence-compute-run';
import type {
  L9SequenceSubjectContract,
} from '../contracts/sequence-subject.contract';
import {
  L9RuntimeViolation,
  L9RuntimeViolationCode,
} from '../validation/l9-runtime-violation-codes';

export interface L9SequenceDag {
  readonly sequence_run_id: string;
  readonly nodes: readonly L9DagNode[];
  readonly edges: readonly L9DagEdge[];
  readonly topological_order: readonly string[];
}

export interface L9DagBuildResult {
  readonly dag: L9SequenceDag | null;
  readonly violations: readonly L9RuntimeViolation[];
}

/**
 * §9.4.4.2 — Emit the canonical 14-stage DAG for every subject bound
 * to the run.
 */
export function buildL9SequenceDag(
  run: L9SequenceRun,
  subjects: readonly L9SequenceSubjectContract[],
  engineVersions: Readonly<Record<string, string>>,
): L9DagBuildResult {
  const violations: L9RuntimeViolation[] = [];
  const nodes: L9DagNode[] = [];
  const edges: L9DagEdge[] = [];
  let ordinal = 0;

  const sortedSubjects = [...subjects].sort((a, b) =>
    a.sequence_subject_id < b.sequence_subject_id ? -1 : 1,
  );

  for (const subject of sortedSubjects) {
    const common = {
      sequence_run_id: run.sequence_run_id,
      sequence_subject_id: subject.sequence_subject_id,
      sequence_family: subject.sequence_family,
      scope_type: subject.scope_type,
      scope_id: subject.scope_id,
    };

    const input = emit(nodes, L9DagNodeClass.INPUT_NODE, common,
      'sequence-assembly-engine', engineVersions, ordinal++);
    const subjectNode = emit(nodes, L9DagNodeClass.SUBJECT_NODE, common,
      'sequence-assembly-engine', engineVersions, ordinal++);
    const inputResolution = emit(nodes, L9DagNodeClass.INPUT_RESOLUTION_NODE,
      common, 'temporal-input-resolver', engineVersions, ordinal++);
    const ordered = emit(nodes, L9DagNodeClass.ORDERED_SIGNAL_NODE, common,
      'ordered-signal-resolver', engineVersions, ordinal++);
    const leadLag = emit(nodes, L9DagNodeClass.LEAD_LAG_NODE, common,
      'lead-lag-engine', engineVersions, ordinal++);
    const phase = emit(nodes, L9DagNodeClass.PHASE_NODE, common,
      'phase-progression-engine', engineVersions, ordinal++);
    const changePoint = emit(nodes, L9DagNodeClass.CHANGE_POINT_NODE, common,
      'change-point-engine', engineVersions, ordinal++);
    const decay = emit(nodes, L9DagNodeClass.DECAY_NODE, common,
      'decay-engine', engineVersions, ordinal++);
    const postEvent = emit(nodes, L9DagNodeClass.POST_EVENT_WINDOW_NODE, common,
      'post-event-window-engine', engineVersions, ordinal++);
    const classification = emit(nodes, L9DagNodeClass.CLASSIFICATION_NODE,
      common, 'sequence-classification-engine', engineVersions, ordinal++);
    const confidence = emit(nodes, L9DagNodeClass.CONFIDENCE_NODE, common,
      'sequence-confidence-engine', engineVersions, ordinal++);
    const restriction = emit(nodes, L9DagNodeClass.RESTRICTION_NODE, common,
      'sequence-restriction-engine', engineVersions, ordinal++);
    const evidence = emit(nodes, L9DagNodeClass.EVIDENCE_NODE, common,
      'sequence-evidence-pack-builder', engineVersions, ordinal++);
    const materialization = emit(nodes, L9DagNodeClass.MATERIALIZATION_NODE,
      common, 'sequence-materializer', engineVersions, ordinal++);

    addEdge(edges, violations, L9DagEdgeClass.INPUT_TO_SUBJECT,
      input, subjectNode);
    addEdge(edges, violations, L9DagEdgeClass.SUBJECT_TO_INPUT_RESOLUTION,
      subjectNode, inputResolution);
    addEdge(edges, violations,
      L9DagEdgeClass.INPUT_RESOLUTION_TO_ORDERED_SIGNAL,
      inputResolution, ordered);
    addEdge(edges, violations, L9DagEdgeClass.ORDERED_SIGNAL_TO_LEAD_LAG,
      ordered, leadLag);
    addEdge(edges, violations, L9DagEdgeClass.ORDERED_SIGNAL_TO_PHASE,
      ordered, phase);
    addEdge(edges, violations, L9DagEdgeClass.LEAD_LAG_TO_PHASE,
      leadLag, phase);
    addEdge(edges, violations, L9DagEdgeClass.PHASE_TO_CHANGE_POINT,
      phase, changePoint);
    addEdge(edges, violations, L9DagEdgeClass.CHANGE_POINT_TO_DECAY,
      changePoint, decay);
    addEdge(edges, violations,
      L9DagEdgeClass.CHANGE_POINT_TO_POST_EVENT_WINDOW,
      changePoint, postEvent);
    addEdge(edges, violations, L9DagEdgeClass.PHASE_TO_CLASSIFICATION,
      phase, classification);
    addEdge(edges, violations, L9DagEdgeClass.DECAY_TO_CLASSIFICATION,
      decay, classification);
    addEdge(edges, violations,
      L9DagEdgeClass.POST_EVENT_WINDOW_TO_CLASSIFICATION,
      postEvent, classification);
    addEdge(edges, violations, L9DagEdgeClass.CLASSIFICATION_TO_CONFIDENCE,
      classification, confidence);
    addEdge(edges, violations, L9DagEdgeClass.CLASSIFICATION_TO_RESTRICTION,
      classification, restriction);
    addEdge(edges, violations, L9DagEdgeClass.CONFIDENCE_TO_EVIDENCE,
      confidence, evidence);
    addEdge(edges, violations, L9DagEdgeClass.RESTRICTION_TO_EVIDENCE,
      restriction, evidence);
    addEdge(edges, violations, L9DagEdgeClass.CLASSIFICATION_TO_EVIDENCE,
      classification, evidence);
    addEdge(edges, violations, L9DagEdgeClass.EVIDENCE_TO_MATERIALIZATION,
      evidence, materialization);
  }

  // Duplicate node ids
  const seen = new Set<string>();
  for (const n of nodes) {
    if (seen.has(n.node_id)) {
      violations.push({
        code: L9RuntimeViolationCode.DAG_DUPLICATE_NODE_ID,
        source: 'l9-dag-builder',
        nodeId: n.node_id,
        sequence_run_id: run.sequence_run_id,
        sequence_subject_id: n.sequence_subject_id,
        detail: `duplicate node id ${n.node_id}`,
        context: {},
      });
    }
    seen.add(n.node_id);
  }

  // Stage must match node class
  for (const n of nodes) {
    const expected = L9_NODE_CLASS_STAGE[n.node_class];
    if (n.stage !== expected) {
      violations.push({
        code: L9RuntimeViolationCode.DAG_NODE_STAGE_MISMATCH,
        source: 'l9-dag-builder',
        nodeId: n.node_id,
        sequence_run_id: run.sequence_run_id,
        sequence_subject_id: n.sequence_subject_id,
        detail: `node ${n.node_id} stage ${n.stage} != expected ${expected}`,
        context: { node_class: n.node_class, stage: n.stage, expected },
      });
    }
  }

  // Cycle detection
  const cycles = detectL9Cycles(nodes.map(n => n.node_id), edges);
  if (!cycles.acyclic) {
    violations.push({
      code: L9RuntimeViolationCode.DAG_CYCLE_DETECTED,
      source: 'l9-dag-builder',
      nodeId: null,
      sequence_run_id: run.sequence_run_id,
      sequence_subject_id: null,
      detail: `cycles detected: ${cycles.cycles.length}`,
      context: { cycles: cycles.cycles },
    });
  }

  if (violations.length > 0) {
    return { dag: null, violations };
  }

  const ts = l9Toposort(nodes, edges);
  if (!ts.ok) {
    violations.push({
      code: L9RuntimeViolationCode.DAG_UNRESOLVED_DEPENDENCY,
      source: 'l9-dag-builder',
      nodeId: null,
      sequence_run_id: run.sequence_run_id,
      sequence_subject_id: null,
      detail: `toposort failed: ${ts.reason}`,
      context: {},
    });
    return { dag: null, violations };
  }

  return {
    dag: {
      sequence_run_id: run.sequence_run_id,
      nodes,
      edges,
      topological_order: ts.order,
    },
    violations,
  };
}

function emit(
  nodes: L9DagNode[],
  cls: L9DagNodeClass,
  common: {
    sequence_run_id: string;
    sequence_subject_id: string;
    sequence_family: string;
    scope_type: string;
    scope_id: string;
  },
  engineId: string,
  engineVersions: Readonly<Record<string, string>>,
  ordinal: number,
): L9DagNode {
  const node: L9DagNode = {
    node_id: buildL9DagNodeId({
      node_class: cls,
      sequence_run_id: common.sequence_run_id,
      sequence_subject_id: common.sequence_subject_id,
      scope_type: common.scope_type,
      scope_id: common.scope_id,
    }),
    node_class: cls,
    stage: L9_NODE_CLASS_STAGE[cls],
    sequence_subject_id: common.sequence_subject_id,
    sequence_family: common.sequence_family,
    scope_type: common.scope_type,
    scope_id: common.scope_id,
    deterministic_inputs: [],
    engine_id: engineId,
    engine_version: engineVersions[engineId] ?? '0.0.0',
    created_at_ordinal: ordinal,
  };
  nodes.push(node);
  return node;
}

function addEdge(
  edges: L9DagEdge[],
  violations: L9RuntimeViolation[],
  edgeClass: L9DagEdgeClass,
  from: L9DagNode,
  to: L9DagNode,
): void {
  if (!isLegalL9Edge(edgeClass, from.node_class, to.node_class)) {
    violations.push({
      code: L9RuntimeViolationCode.DAG_ILLEGAL_EDGE_TRANSITION,
      source: 'l9-dag-builder',
      nodeId: from.node_id,
      sequence_run_id: null,
      sequence_subject_id: from.sequence_subject_id,
      detail:
        `illegal edge ${edgeClass} ${from.node_class}→${to.node_class}`,
      context: {
        edgeClass, fromClass: from.node_class, toClass: to.node_class,
      },
    });
    return;
  }
  edges.push({
    edge_id: buildL9DagEdgeId(edgeClass, from.node_id, to.node_id),
    edge_class: edgeClass,
    from_node_id: from.node_id,
    to_node_id: to.node_id,
  });
}
