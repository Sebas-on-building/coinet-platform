/**
 * L7.4 — DAG Edge Model
 *
 * §7.4.1.5 — Legal edge classes. Any pairing not listed in
 * `LEGAL_EDGE_TRANSITIONS` must be rejected at DAG-build time
 * (§7.4.1.5 illegal-pairings rule).
 */

import { L7DagNodeClass } from './l7-dag-node';

export enum L7DagEdgeClass {
  INPUT_TO_SUBJECT = 'INPUT_TO_SUBJECT',
  SUBJECT_TO_SUPPORT = 'SUBJECT_TO_SUPPORT',
  SUBJECT_TO_CHALLENGE = 'SUBJECT_TO_CHALLENGE',
  SUPPORT_TO_CONTRADICTION = 'SUPPORT_TO_CONTRADICTION',
  CHALLENGE_TO_CONTRADICTION = 'CHALLENGE_TO_CONTRADICTION',
  CONTRADICTION_TO_CLUSTER = 'CONTRADICTION_TO_CLUSTER',
  CLUSTER_TO_EVALUATION = 'CLUSTER_TO_EVALUATION',
  SUPPORT_TO_EVALUATION = 'SUPPORT_TO_EVALUATION',
  CHALLENGE_TO_EVALUATION = 'CHALLENGE_TO_EVALUATION',
  EVALUATION_TO_CLASSIFICATION = 'EVALUATION_TO_CLASSIFICATION',
  CLUSTER_TO_CLASSIFICATION = 'CLUSTER_TO_CLASSIFICATION',
  SUPPORT_TO_CLASSIFICATION = 'SUPPORT_TO_CLASSIFICATION',
  CLASSIFICATION_TO_CONFIDENCE = 'CLASSIFICATION_TO_CONFIDENCE',
  CLUSTER_TO_CONFIDENCE = 'CLUSTER_TO_CONFIDENCE',
  CONFIDENCE_TO_RESTRICTION = 'CONFIDENCE_TO_RESTRICTION',
  CLASSIFICATION_TO_RESTRICTION = 'CLASSIFICATION_TO_RESTRICTION',
  CLUSTER_TO_RESTRICTION = 'CLUSTER_TO_RESTRICTION',
  CLASSIFICATION_TO_EVIDENCE = 'CLASSIFICATION_TO_EVIDENCE',
  CLUSTER_TO_EVIDENCE = 'CLUSTER_TO_EVIDENCE',
  CONFIDENCE_TO_EVIDENCE = 'CONFIDENCE_TO_EVIDENCE',
  RESTRICTION_TO_MATERIALIZATION = 'RESTRICTION_TO_MATERIALIZATION',
  EVIDENCE_TO_MATERIALIZATION = 'EVIDENCE_TO_MATERIALIZATION',
  CLASSIFICATION_TO_MATERIALIZATION = 'CLASSIFICATION_TO_MATERIALIZATION',
}

export const ALL_DAG_EDGE_CLASSES: readonly L7DagEdgeClass[] =
  Object.values(L7DagEdgeClass);

export interface L7DagEdge {
  readonly edge_id: string;
  readonly edge_class: L7DagEdgeClass;
  readonly from_node_id: string;
  readonly to_node_id: string;
}

/**
 * §7.4.1.5 — Legal (from_class → to_class) transitions per edge class.
 * A builder that attempts any other transition must reject the edge.
 */
export const LEGAL_EDGE_TRANSITIONS: Readonly<
  Record<L7DagEdgeClass, readonly { from: L7DagNodeClass; to: L7DagNodeClass }[]>
> = {
  [L7DagEdgeClass.INPUT_TO_SUBJECT]: [
    { from: L7DagNodeClass.INPUT_SURFACE_NODE, to: L7DagNodeClass.VALIDATION_SUBJECT_NODE },
  ],
  [L7DagEdgeClass.SUBJECT_TO_SUPPORT]: [
    { from: L7DagNodeClass.VALIDATION_SUBJECT_NODE, to: L7DagNodeClass.SUPPORT_RESOLUTION_NODE },
  ],
  [L7DagEdgeClass.SUBJECT_TO_CHALLENGE]: [
    { from: L7DagNodeClass.VALIDATION_SUBJECT_NODE, to: L7DagNodeClass.CHALLENGE_RESOLUTION_NODE },
  ],
  [L7DagEdgeClass.SUPPORT_TO_CONTRADICTION]: [
    { from: L7DagNodeClass.SUPPORT_RESOLUTION_NODE, to: L7DagNodeClass.CONTRADICTION_CANDIDATE_NODE },
  ],
  [L7DagEdgeClass.CHALLENGE_TO_CONTRADICTION]: [
    { from: L7DagNodeClass.CHALLENGE_RESOLUTION_NODE, to: L7DagNodeClass.CONTRADICTION_CANDIDATE_NODE },
  ],
  [L7DagEdgeClass.CONTRADICTION_TO_CLUSTER]: [
    { from: L7DagNodeClass.CONTRADICTION_CANDIDATE_NODE, to: L7DagNodeClass.CONTRADICTION_CLUSTER_NODE },
  ],
  [L7DagEdgeClass.CLUSTER_TO_EVALUATION]: [
    { from: L7DagNodeClass.CONTRADICTION_CLUSTER_NODE, to: L7DagNodeClass.EVALUATION_NODE },
  ],
  [L7DagEdgeClass.SUPPORT_TO_EVALUATION]: [
    { from: L7DagNodeClass.SUPPORT_RESOLUTION_NODE, to: L7DagNodeClass.EVALUATION_NODE },
  ],
  [L7DagEdgeClass.CHALLENGE_TO_EVALUATION]: [
    { from: L7DagNodeClass.CHALLENGE_RESOLUTION_NODE, to: L7DagNodeClass.EVALUATION_NODE },
  ],
  [L7DagEdgeClass.EVALUATION_TO_CLASSIFICATION]: [
    { from: L7DagNodeClass.EVALUATION_NODE, to: L7DagNodeClass.VALIDATION_CLASSIFICATION_NODE },
  ],
  [L7DagEdgeClass.CLUSTER_TO_CLASSIFICATION]: [
    { from: L7DagNodeClass.CONTRADICTION_CLUSTER_NODE, to: L7DagNodeClass.VALIDATION_CLASSIFICATION_NODE },
  ],
  [L7DagEdgeClass.SUPPORT_TO_CLASSIFICATION]: [
    { from: L7DagNodeClass.SUPPORT_RESOLUTION_NODE, to: L7DagNodeClass.VALIDATION_CLASSIFICATION_NODE },
  ],
  [L7DagEdgeClass.CLASSIFICATION_TO_CONFIDENCE]: [
    { from: L7DagNodeClass.VALIDATION_CLASSIFICATION_NODE, to: L7DagNodeClass.CONFIDENCE_NODE },
  ],
  [L7DagEdgeClass.CLUSTER_TO_CONFIDENCE]: [
    { from: L7DagNodeClass.CONTRADICTION_CLUSTER_NODE, to: L7DagNodeClass.CONFIDENCE_NODE },
  ],
  [L7DagEdgeClass.CONFIDENCE_TO_RESTRICTION]: [
    { from: L7DagNodeClass.CONFIDENCE_NODE, to: L7DagNodeClass.RESTRICTION_NODE },
  ],
  [L7DagEdgeClass.CLASSIFICATION_TO_RESTRICTION]: [
    { from: L7DagNodeClass.VALIDATION_CLASSIFICATION_NODE, to: L7DagNodeClass.RESTRICTION_NODE },
  ],
  [L7DagEdgeClass.CLUSTER_TO_RESTRICTION]: [
    { from: L7DagNodeClass.CONTRADICTION_CLUSTER_NODE, to: L7DagNodeClass.RESTRICTION_NODE },
  ],
  [L7DagEdgeClass.CLASSIFICATION_TO_EVIDENCE]: [
    { from: L7DagNodeClass.VALIDATION_CLASSIFICATION_NODE, to: L7DagNodeClass.EVIDENCE_PACK_NODE },
  ],
  [L7DagEdgeClass.CLUSTER_TO_EVIDENCE]: [
    { from: L7DagNodeClass.CONTRADICTION_CLUSTER_NODE, to: L7DagNodeClass.EVIDENCE_PACK_NODE },
  ],
  [L7DagEdgeClass.CONFIDENCE_TO_EVIDENCE]: [
    { from: L7DagNodeClass.CONFIDENCE_NODE, to: L7DagNodeClass.EVIDENCE_PACK_NODE },
  ],
  [L7DagEdgeClass.RESTRICTION_TO_MATERIALIZATION]: [
    { from: L7DagNodeClass.RESTRICTION_NODE, to: L7DagNodeClass.MATERIALIZATION_NODE },
  ],
  [L7DagEdgeClass.EVIDENCE_TO_MATERIALIZATION]: [
    { from: L7DagNodeClass.EVIDENCE_PACK_NODE, to: L7DagNodeClass.MATERIALIZATION_NODE },
  ],
  [L7DagEdgeClass.CLASSIFICATION_TO_MATERIALIZATION]: [
    { from: L7DagNodeClass.VALIDATION_CLASSIFICATION_NODE, to: L7DagNodeClass.MATERIALIZATION_NODE },
  ],
};

/**
 * Returns true iff the given (from, to) pair is legal for `edge_class`.
 */
export function isLegalEdge(
  edgeClass: L7DagEdgeClass,
  fromClass: L7DagNodeClass,
  toClass: L7DagNodeClass,
): boolean {
  const legal = LEGAL_EDGE_TRANSITIONS[edgeClass] ?? [];
  return legal.some(t => t.from === fromClass && t.to === toClass);
}

export function buildDagEdgeId(edgeClass: L7DagEdgeClass, fromNodeId: string, toNodeId: string): string {
  return `${edgeClass}:${fromNodeId}->${toNodeId}`;
}
