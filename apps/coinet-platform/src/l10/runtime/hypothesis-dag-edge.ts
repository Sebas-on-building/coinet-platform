/**
 * L10.4 — DAG Edge Model
 *
 * §10.4.4.4-5 — Legal edge classes. Any pairing not listed in
 * `L10_LEGAL_EDGE_TRANSITIONS` must be rejected at DAG-build time
 * (§10.4.4.5 illegal-edge doctrine).
 */

import { L10DagNodeClass } from './hypothesis-dag-node';

export enum L10DagEdgeClass {
  INPUT_TO_SUBJECT = 'INPUT_TO_SUBJECT',
  SUBJECT_TO_CANDIDATE = 'SUBJECT_TO_CANDIDATE',
  CANDIDATE_TO_SUPPORT = 'CANDIDATE_TO_SUPPORT',
  CANDIDATE_TO_CONTRADICTION = 'CANDIDATE_TO_CONTRADICTION',
  SUPPORT_TO_CONFIRMATION = 'SUPPORT_TO_CONFIRMATION',
  CONTRADICTION_TO_CONFIRMATION = 'CONTRADICTION_TO_CONFIRMATION',
  SUPPORT_TO_INVALIDATION = 'SUPPORT_TO_INVALIDATION',
  CONTRADICTION_TO_INVALIDATION = 'CONTRADICTION_TO_INVALIDATION',
  SUPPORT_TO_CONFIDENCE = 'SUPPORT_TO_CONFIDENCE',
  CONTRADICTION_TO_CONFIDENCE = 'CONTRADICTION_TO_CONFIDENCE',
  CONFIRMATION_TO_CONFIDENCE = 'CONFIRMATION_TO_CONFIDENCE',
  INVALIDATION_TO_CONFIDENCE = 'INVALIDATION_TO_CONFIDENCE',
  CONFIDENCE_TO_RANKING = 'CONFIDENCE_TO_RANKING',
  RANKING_TO_SPREAD = 'RANKING_TO_SPREAD',
  SPREAD_TO_SHIFT_CONDITION = 'SPREAD_TO_SHIFT_CONDITION',
  RANKING_TO_EVIDENCE = 'RANKING_TO_EVIDENCE',
  SHIFT_CONDITION_TO_EVIDENCE = 'SHIFT_CONDITION_TO_EVIDENCE',
  EVIDENCE_TO_MATERIALIZATION = 'EVIDENCE_TO_MATERIALIZATION',
}

export const ALL_L10_DAG_EDGE_CLASSES: readonly L10DagEdgeClass[] =
  Object.values(L10DagEdgeClass);

export interface L10DagEdge {
  readonly edge_id: string;
  readonly edge_class: L10DagEdgeClass;
  readonly from_node_id: string;
  readonly to_node_id: string;
}

/**
 * §10.4.4.4 — Legal (from_class → to_class) transitions per edge
 * class. Every other pairing is an `DAG_ILLEGAL_EDGE_TRANSITION`
 * (§10.4.4.5).
 */
export const L10_LEGAL_EDGE_TRANSITIONS: Readonly<
  Record<L10DagEdgeClass, readonly { from: L10DagNodeClass; to: L10DagNodeClass }[]>
> = {
  [L10DagEdgeClass.INPUT_TO_SUBJECT]: [
    { from: L10DagNodeClass.INPUT_NODE, to: L10DagNodeClass.SUBJECT_NODE },
  ],
  [L10DagEdgeClass.SUBJECT_TO_CANDIDATE]: [
    { from: L10DagNodeClass.SUBJECT_NODE, to: L10DagNodeClass.CANDIDATE_NODE },
  ],
  [L10DagEdgeClass.CANDIDATE_TO_SUPPORT]: [
    { from: L10DagNodeClass.CANDIDATE_NODE, to: L10DagNodeClass.SUPPORT_NODE },
  ],
  [L10DagEdgeClass.CANDIDATE_TO_CONTRADICTION]: [
    {
      from: L10DagNodeClass.CANDIDATE_NODE,
      to: L10DagNodeClass.CONTRADICTION_NODE,
    },
  ],
  [L10DagEdgeClass.SUPPORT_TO_CONFIRMATION]: [
    {
      from: L10DagNodeClass.SUPPORT_NODE,
      to: L10DagNodeClass.CONFIRMATION_NODE,
    },
  ],
  [L10DagEdgeClass.CONTRADICTION_TO_CONFIRMATION]: [
    {
      from: L10DagNodeClass.CONTRADICTION_NODE,
      to: L10DagNodeClass.CONFIRMATION_NODE,
    },
  ],
  [L10DagEdgeClass.SUPPORT_TO_INVALIDATION]: [
    {
      from: L10DagNodeClass.SUPPORT_NODE,
      to: L10DagNodeClass.INVALIDATION_NODE,
    },
  ],
  [L10DagEdgeClass.CONTRADICTION_TO_INVALIDATION]: [
    {
      from: L10DagNodeClass.CONTRADICTION_NODE,
      to: L10DagNodeClass.INVALIDATION_NODE,
    },
  ],
  [L10DagEdgeClass.SUPPORT_TO_CONFIDENCE]: [
    {
      from: L10DagNodeClass.SUPPORT_NODE,
      to: L10DagNodeClass.CONFIDENCE_NODE,
    },
  ],
  [L10DagEdgeClass.CONTRADICTION_TO_CONFIDENCE]: [
    {
      from: L10DagNodeClass.CONTRADICTION_NODE,
      to: L10DagNodeClass.CONFIDENCE_NODE,
    },
  ],
  [L10DagEdgeClass.CONFIRMATION_TO_CONFIDENCE]: [
    {
      from: L10DagNodeClass.CONFIRMATION_NODE,
      to: L10DagNodeClass.CONFIDENCE_NODE,
    },
  ],
  [L10DagEdgeClass.INVALIDATION_TO_CONFIDENCE]: [
    {
      from: L10DagNodeClass.INVALIDATION_NODE,
      to: L10DagNodeClass.CONFIDENCE_NODE,
    },
  ],
  [L10DagEdgeClass.CONFIDENCE_TO_RANKING]: [
    {
      from: L10DagNodeClass.CONFIDENCE_NODE,
      to: L10DagNodeClass.RANKING_NODE,
    },
  ],
  [L10DagEdgeClass.RANKING_TO_SPREAD]: [
    { from: L10DagNodeClass.RANKING_NODE, to: L10DagNodeClass.SPREAD_NODE },
  ],
  [L10DagEdgeClass.SPREAD_TO_SHIFT_CONDITION]: [
    {
      from: L10DagNodeClass.SPREAD_NODE,
      to: L10DagNodeClass.SHIFT_CONDITION_NODE,
    },
  ],
  [L10DagEdgeClass.RANKING_TO_EVIDENCE]: [
    { from: L10DagNodeClass.RANKING_NODE, to: L10DagNodeClass.EVIDENCE_NODE },
  ],
  [L10DagEdgeClass.SHIFT_CONDITION_TO_EVIDENCE]: [
    {
      from: L10DagNodeClass.SHIFT_CONDITION_NODE,
      to: L10DagNodeClass.EVIDENCE_NODE,
    },
  ],
  [L10DagEdgeClass.EVIDENCE_TO_MATERIALIZATION]: [
    {
      from: L10DagNodeClass.EVIDENCE_NODE,
      to: L10DagNodeClass.MATERIALIZATION_NODE,
    },
  ],
};

export function isLegalL10Edge(
  edgeClass: L10DagEdgeClass,
  fromClass: L10DagNodeClass,
  toClass: L10DagNodeClass,
): boolean {
  const legal = L10_LEGAL_EDGE_TRANSITIONS[edgeClass] ?? [];
  return legal.some(t => t.from === fromClass && t.to === toClass);
}

export function buildL10DagEdgeId(
  edgeClass: L10DagEdgeClass,
  fromNodeId: string,
  toNodeId: string,
): string {
  return `${edgeClass}:${fromNodeId}->${toNodeId}`;
}
