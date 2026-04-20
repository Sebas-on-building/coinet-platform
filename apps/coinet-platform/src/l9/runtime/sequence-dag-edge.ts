/**
 * L9.4 — DAG Edge Model
 *
 * §9.4.4.4-5 — Legal edge classes. Any pairing not listed in
 * `L9_LEGAL_EDGE_TRANSITIONS` must be rejected at DAG-build time
 * (§9.4.4.5 illegal-edge doctrine).
 */

import { L9DagNodeClass } from './sequence-dag-node';

export enum L9DagEdgeClass {
  INPUT_TO_SUBJECT = 'INPUT_TO_SUBJECT',
  SUBJECT_TO_INPUT_RESOLUTION = 'SUBJECT_TO_INPUT_RESOLUTION',
  INPUT_RESOLUTION_TO_ORDERED_SIGNAL = 'INPUT_RESOLUTION_TO_ORDERED_SIGNAL',
  ORDERED_SIGNAL_TO_LEAD_LAG = 'ORDERED_SIGNAL_TO_LEAD_LAG',
  ORDERED_SIGNAL_TO_PHASE = 'ORDERED_SIGNAL_TO_PHASE',
  LEAD_LAG_TO_PHASE = 'LEAD_LAG_TO_PHASE',
  PHASE_TO_CHANGE_POINT = 'PHASE_TO_CHANGE_POINT',
  CHANGE_POINT_TO_DECAY = 'CHANGE_POINT_TO_DECAY',
  CHANGE_POINT_TO_POST_EVENT_WINDOW = 'CHANGE_POINT_TO_POST_EVENT_WINDOW',
  PHASE_TO_CLASSIFICATION = 'PHASE_TO_CLASSIFICATION',
  DECAY_TO_CLASSIFICATION = 'DECAY_TO_CLASSIFICATION',
  POST_EVENT_WINDOW_TO_CLASSIFICATION = 'POST_EVENT_WINDOW_TO_CLASSIFICATION',
  CLASSIFICATION_TO_CONFIDENCE = 'CLASSIFICATION_TO_CONFIDENCE',
  CLASSIFICATION_TO_RESTRICTION = 'CLASSIFICATION_TO_RESTRICTION',
  CONFIDENCE_TO_EVIDENCE = 'CONFIDENCE_TO_EVIDENCE',
  RESTRICTION_TO_EVIDENCE = 'RESTRICTION_TO_EVIDENCE',
  CLASSIFICATION_TO_EVIDENCE = 'CLASSIFICATION_TO_EVIDENCE',
  EVIDENCE_TO_MATERIALIZATION = 'EVIDENCE_TO_MATERIALIZATION',
}

export const ALL_L9_DAG_EDGE_CLASSES: readonly L9DagEdgeClass[] =
  Object.values(L9DagEdgeClass);

export interface L9DagEdge {
  readonly edge_id: string;
  readonly edge_class: L9DagEdgeClass;
  readonly from_node_id: string;
  readonly to_node_id: string;
}

/**
 * §9.4.4.4 — Legal (from_class → to_class) transitions per edge class.
 * Every other pairing is an `DAG_ILLEGAL_EDGE_TRANSITION` (§9.4.4.5).
 */
export const L9_LEGAL_EDGE_TRANSITIONS: Readonly<
  Record<L9DagEdgeClass, readonly { from: L9DagNodeClass; to: L9DagNodeClass }[]>
> = {
  [L9DagEdgeClass.INPUT_TO_SUBJECT]: [
    { from: L9DagNodeClass.INPUT_NODE, to: L9DagNodeClass.SUBJECT_NODE },
  ],
  [L9DagEdgeClass.SUBJECT_TO_INPUT_RESOLUTION]: [
    { from: L9DagNodeClass.SUBJECT_NODE, to: L9DagNodeClass.INPUT_RESOLUTION_NODE },
  ],
  [L9DagEdgeClass.INPUT_RESOLUTION_TO_ORDERED_SIGNAL]: [
    {
      from: L9DagNodeClass.INPUT_RESOLUTION_NODE,
      to: L9DagNodeClass.ORDERED_SIGNAL_NODE,
    },
  ],
  [L9DagEdgeClass.ORDERED_SIGNAL_TO_LEAD_LAG]: [
    {
      from: L9DagNodeClass.ORDERED_SIGNAL_NODE,
      to: L9DagNodeClass.LEAD_LAG_NODE,
    },
  ],
  [L9DagEdgeClass.ORDERED_SIGNAL_TO_PHASE]: [
    {
      from: L9DagNodeClass.ORDERED_SIGNAL_NODE,
      to: L9DagNodeClass.PHASE_NODE,
    },
  ],
  [L9DagEdgeClass.LEAD_LAG_TO_PHASE]: [
    { from: L9DagNodeClass.LEAD_LAG_NODE, to: L9DagNodeClass.PHASE_NODE },
  ],
  [L9DagEdgeClass.PHASE_TO_CHANGE_POINT]: [
    { from: L9DagNodeClass.PHASE_NODE, to: L9DagNodeClass.CHANGE_POINT_NODE },
  ],
  [L9DagEdgeClass.CHANGE_POINT_TO_DECAY]: [
    { from: L9DagNodeClass.CHANGE_POINT_NODE, to: L9DagNodeClass.DECAY_NODE },
  ],
  [L9DagEdgeClass.CHANGE_POINT_TO_POST_EVENT_WINDOW]: [
    {
      from: L9DagNodeClass.CHANGE_POINT_NODE,
      to: L9DagNodeClass.POST_EVENT_WINDOW_NODE,
    },
  ],
  [L9DagEdgeClass.PHASE_TO_CLASSIFICATION]: [
    { from: L9DagNodeClass.PHASE_NODE, to: L9DagNodeClass.CLASSIFICATION_NODE },
  ],
  [L9DagEdgeClass.DECAY_TO_CLASSIFICATION]: [
    { from: L9DagNodeClass.DECAY_NODE, to: L9DagNodeClass.CLASSIFICATION_NODE },
  ],
  [L9DagEdgeClass.POST_EVENT_WINDOW_TO_CLASSIFICATION]: [
    {
      from: L9DagNodeClass.POST_EVENT_WINDOW_NODE,
      to: L9DagNodeClass.CLASSIFICATION_NODE,
    },
  ],
  [L9DagEdgeClass.CLASSIFICATION_TO_CONFIDENCE]: [
    {
      from: L9DagNodeClass.CLASSIFICATION_NODE,
      to: L9DagNodeClass.CONFIDENCE_NODE,
    },
  ],
  [L9DagEdgeClass.CLASSIFICATION_TO_RESTRICTION]: [
    {
      from: L9DagNodeClass.CLASSIFICATION_NODE,
      to: L9DagNodeClass.RESTRICTION_NODE,
    },
  ],
  [L9DagEdgeClass.CONFIDENCE_TO_EVIDENCE]: [
    { from: L9DagNodeClass.CONFIDENCE_NODE, to: L9DagNodeClass.EVIDENCE_NODE },
  ],
  [L9DagEdgeClass.RESTRICTION_TO_EVIDENCE]: [
    { from: L9DagNodeClass.RESTRICTION_NODE, to: L9DagNodeClass.EVIDENCE_NODE },
  ],
  [L9DagEdgeClass.CLASSIFICATION_TO_EVIDENCE]: [
    {
      from: L9DagNodeClass.CLASSIFICATION_NODE,
      to: L9DagNodeClass.EVIDENCE_NODE,
    },
  ],
  [L9DagEdgeClass.EVIDENCE_TO_MATERIALIZATION]: [
    {
      from: L9DagNodeClass.EVIDENCE_NODE,
      to: L9DagNodeClass.MATERIALIZATION_NODE,
    },
  ],
};

export function isLegalL9Edge(
  edgeClass: L9DagEdgeClass,
  fromClass: L9DagNodeClass,
  toClass: L9DagNodeClass,
): boolean {
  const legal = L9_LEGAL_EDGE_TRANSITIONS[edgeClass] ?? [];
  return legal.some(t => t.from === fromClass && t.to === toClass);
}

export function buildL9DagEdgeId(
  edgeClass: L9DagEdgeClass,
  fromNodeId: string,
  toNodeId: string,
): string {
  return `${edgeClass}:${fromNodeId}->${toNodeId}`;
}
