/**
 * L8.4 — DAG Edge Model
 *
 * §8.4.2.4 — Legal edge classes. Any pairing not listed in
 * `L8_LEGAL_EDGE_TRANSITIONS` must be rejected at DAG-build time
 * (§8.4.2.5 illegal-pairings rule).
 */

import { L8DagNodeClass } from './regime-dag-node';

export enum L8DagEdgeClass {
  INPUT_TO_SUBJECT = 'INPUT_TO_SUBJECT',
  SUBJECT_TO_INPUT_RESOLUTION = 'SUBJECT_TO_INPUT_RESOLUTION',
  INPUT_RESOLUTION_TO_CANDIDATE = 'INPUT_RESOLUTION_TO_CANDIDATE',
  CANDIDATE_TO_TRANSITION = 'CANDIDATE_TO_TRANSITION',
  CANDIDATE_TO_QUALITY = 'CANDIDATE_TO_QUALITY',
  TRANSITION_TO_QUALITY = 'TRANSITION_TO_QUALITY',
  QUALITY_TO_CLASSIFICATION = 'QUALITY_TO_CLASSIFICATION',
  CANDIDATE_TO_CLASSIFICATION = 'CANDIDATE_TO_CLASSIFICATION',
  TRANSITION_TO_CLASSIFICATION = 'TRANSITION_TO_CLASSIFICATION',
  CLASSIFICATION_TO_CONFIDENCE = 'CLASSIFICATION_TO_CONFIDENCE',
  TRANSITION_TO_CONFIDENCE = 'TRANSITION_TO_CONFIDENCE',
  CLASSIFICATION_TO_MULTIPLIER = 'CLASSIFICATION_TO_MULTIPLIER',
  CONFIDENCE_TO_MULTIPLIER = 'CONFIDENCE_TO_MULTIPLIER',
  CONFIDENCE_TO_EVIDENCE = 'CONFIDENCE_TO_EVIDENCE',
  MULTIPLIER_TO_EVIDENCE = 'MULTIPLIER_TO_EVIDENCE',
  CLASSIFICATION_TO_EVIDENCE = 'CLASSIFICATION_TO_EVIDENCE',
  EVIDENCE_TO_MATERIALIZATION = 'EVIDENCE_TO_MATERIALIZATION',
  CLASSIFICATION_TO_MATERIALIZATION = 'CLASSIFICATION_TO_MATERIALIZATION',
}

export const ALL_L8_DAG_EDGE_CLASSES: readonly L8DagEdgeClass[] =
  Object.values(L8DagEdgeClass);

export interface L8DagEdge {
  readonly edge_id: string;
  readonly edge_class: L8DagEdgeClass;
  readonly from_node_id: string;
  readonly to_node_id: string;
}

/**
 * §8.4.2.5 — Legal (from_class → to_class) transitions per edge class.
 */
export const L8_LEGAL_EDGE_TRANSITIONS: Readonly<
  Record<L8DagEdgeClass, readonly { from: L8DagNodeClass; to: L8DagNodeClass }[]>
> = {
  [L8DagEdgeClass.INPUT_TO_SUBJECT]: [
    { from: L8DagNodeClass.INPUT_NODE, to: L8DagNodeClass.SUBJECT_NODE },
  ],
  [L8DagEdgeClass.SUBJECT_TO_INPUT_RESOLUTION]: [
    { from: L8DagNodeClass.SUBJECT_NODE, to: L8DagNodeClass.INPUT_RESOLUTION_NODE },
  ],
  [L8DagEdgeClass.INPUT_RESOLUTION_TO_CANDIDATE]: [
    { from: L8DagNodeClass.INPUT_RESOLUTION_NODE, to: L8DagNodeClass.CANDIDATE_NODE },
  ],
  [L8DagEdgeClass.CANDIDATE_TO_TRANSITION]: [
    { from: L8DagNodeClass.CANDIDATE_NODE, to: L8DagNodeClass.TRANSITION_NODE },
  ],
  [L8DagEdgeClass.CANDIDATE_TO_QUALITY]: [
    { from: L8DagNodeClass.CANDIDATE_NODE, to: L8DagNodeClass.QUALITY_NODE },
  ],
  [L8DagEdgeClass.TRANSITION_TO_QUALITY]: [
    { from: L8DagNodeClass.TRANSITION_NODE, to: L8DagNodeClass.QUALITY_NODE },
  ],
  [L8DagEdgeClass.QUALITY_TO_CLASSIFICATION]: [
    { from: L8DagNodeClass.QUALITY_NODE, to: L8DagNodeClass.CLASSIFICATION_NODE },
  ],
  [L8DagEdgeClass.CANDIDATE_TO_CLASSIFICATION]: [
    { from: L8DagNodeClass.CANDIDATE_NODE, to: L8DagNodeClass.CLASSIFICATION_NODE },
  ],
  [L8DagEdgeClass.TRANSITION_TO_CLASSIFICATION]: [
    { from: L8DagNodeClass.TRANSITION_NODE, to: L8DagNodeClass.CLASSIFICATION_NODE },
  ],
  [L8DagEdgeClass.CLASSIFICATION_TO_CONFIDENCE]: [
    { from: L8DagNodeClass.CLASSIFICATION_NODE, to: L8DagNodeClass.CONFIDENCE_NODE },
  ],
  [L8DagEdgeClass.TRANSITION_TO_CONFIDENCE]: [
    { from: L8DagNodeClass.TRANSITION_NODE, to: L8DagNodeClass.CONFIDENCE_NODE },
  ],
  [L8DagEdgeClass.CLASSIFICATION_TO_MULTIPLIER]: [
    { from: L8DagNodeClass.CLASSIFICATION_NODE, to: L8DagNodeClass.MULTIPLIER_NODE },
  ],
  [L8DagEdgeClass.CONFIDENCE_TO_MULTIPLIER]: [
    { from: L8DagNodeClass.CONFIDENCE_NODE, to: L8DagNodeClass.MULTIPLIER_NODE },
  ],
  [L8DagEdgeClass.CONFIDENCE_TO_EVIDENCE]: [
    { from: L8DagNodeClass.CONFIDENCE_NODE, to: L8DagNodeClass.EVIDENCE_NODE },
  ],
  [L8DagEdgeClass.MULTIPLIER_TO_EVIDENCE]: [
    { from: L8DagNodeClass.MULTIPLIER_NODE, to: L8DagNodeClass.EVIDENCE_NODE },
  ],
  [L8DagEdgeClass.CLASSIFICATION_TO_EVIDENCE]: [
    { from: L8DagNodeClass.CLASSIFICATION_NODE, to: L8DagNodeClass.EVIDENCE_NODE },
  ],
  [L8DagEdgeClass.EVIDENCE_TO_MATERIALIZATION]: [
    { from: L8DagNodeClass.EVIDENCE_NODE, to: L8DagNodeClass.MATERIALIZATION_NODE },
  ],
  [L8DagEdgeClass.CLASSIFICATION_TO_MATERIALIZATION]: [
    { from: L8DagNodeClass.CLASSIFICATION_NODE, to: L8DagNodeClass.MATERIALIZATION_NODE },
  ],
};

export function isLegalL8Edge(
  edgeClass: L8DagEdgeClass,
  fromClass: L8DagNodeClass,
  toClass: L8DagNodeClass,
): boolean {
  const legal = L8_LEGAL_EDGE_TRANSITIONS[edgeClass] ?? [];
  return legal.some(t => t.from === fromClass && t.to === toClass);
}

export function buildL8DagEdgeId(
  edgeClass: L8DagEdgeClass,
  fromNodeId: string,
  toNodeId: string,
): string {
  return `${edgeClass}:${fromNodeId}->${toNodeId}`;
}
