/**
 * L6.4 — DAG Edge
 *
 * §6.4.2.4 — Every edge represents exactly one of the registered dependency
 * classes. No hidden side-channel dependency is legal.
 */

import { L6DagNodeClass } from './dag-node';

export enum L6EdgeClass {
  DATA = 'DATA',
  WINDOW = 'WINDOW',
  BASELINE = 'BASELINE',
  CONTEXT = 'CONTEXT',
  EVENT_SUPPORT = 'EVENT_SUPPORT',
  MATERIALIZATION = 'MATERIALIZATION',
}

export const ALL_EDGE_CLASSES: readonly L6EdgeClass[] = Object.values(L6EdgeClass);

export interface L6DagEdge {
  readonly from_node_id: string;
  readonly to_node_id: string;
  readonly edge_class: L6EdgeClass;
  readonly required: boolean;
  readonly meta: Readonly<Record<string, unknown>>;
}

/**
 * Edge legality table. Defines which (from_class → to_class) edges are legal
 * for each edge class. Enforced by the DAG builder.
 */
export const EDGE_LEGALITY_TABLE: Readonly<
  Record<L6EdgeClass, readonly [L6DagNodeClass, L6DagNodeClass][]>
> = {
  [L6EdgeClass.DATA]: [
    [L6DagNodeClass.INPUT, L6DagNodeClass.PRIMITIVE_FEATURE],
    [L6DagNodeClass.PRIMITIVE_FEATURE, L6DagNodeClass.COMPOSITE_FEATURE],
    [L6DagNodeClass.PRIMITIVE_FEATURE, L6DagNodeClass.CHANGE_DETECTION],
    [L6DagNodeClass.COMPOSITE_FEATURE, L6DagNodeClass.CHANGE_DETECTION],
    [L6DagNodeClass.COMPOSITE_FEATURE, L6DagNodeClass.COMPOSITE_FEATURE],
  ],
  [L6EdgeClass.WINDOW]: [
    [L6DagNodeClass.INPUT, L6DagNodeClass.PRIMITIVE_FEATURE],
    [L6DagNodeClass.INPUT, L6DagNodeClass.COMPOSITE_FEATURE],
  ],
  [L6EdgeClass.BASELINE]: [
    [L6DagNodeClass.INPUT, L6DagNodeClass.PRIMITIVE_FEATURE],
    [L6DagNodeClass.PRIMITIVE_FEATURE, L6DagNodeClass.PRIMITIVE_FEATURE],
  ],
  [L6EdgeClass.CONTEXT]: [
    [L6DagNodeClass.INPUT, L6DagNodeClass.PRIMITIVE_FEATURE],
    [L6DagNodeClass.INPUT, L6DagNodeClass.COMPOSITE_FEATURE],
    [L6DagNodeClass.INPUT, L6DagNodeClass.EVENT_CANDIDATE],
  ],
  [L6EdgeClass.EVENT_SUPPORT]: [
    [L6DagNodeClass.CHANGE_DETECTION, L6DagNodeClass.EVENT_CANDIDATE],
    [L6DagNodeClass.EVENT_CANDIDATE, L6DagNodeClass.EVENT_LIFECYCLE],
    [L6DagNodeClass.PRIMITIVE_FEATURE, L6DagNodeClass.EVENT_CANDIDATE],
    [L6DagNodeClass.COMPOSITE_FEATURE, L6DagNodeClass.EVENT_CANDIDATE],
  ],
  [L6EdgeClass.MATERIALIZATION]: [
    [L6DagNodeClass.PRIMITIVE_FEATURE, L6DagNodeClass.EVIDENCE_PACK],
    [L6DagNodeClass.COMPOSITE_FEATURE, L6DagNodeClass.EVIDENCE_PACK],
    [L6DagNodeClass.EVENT_LIFECYCLE, L6DagNodeClass.EVIDENCE_PACK],
    [L6DagNodeClass.PRIMITIVE_FEATURE, L6DagNodeClass.MATERIALIZATION],
    [L6DagNodeClass.COMPOSITE_FEATURE, L6DagNodeClass.MATERIALIZATION],
    [L6DagNodeClass.EVENT_LIFECYCLE, L6DagNodeClass.MATERIALIZATION],
    [L6DagNodeClass.EVIDENCE_PACK, L6DagNodeClass.MATERIALIZATION],
  ],
};

export function isLegalEdge(
  edgeClass: L6EdgeClass,
  fromClass: L6DagNodeClass,
  toClass: L6DagNodeClass,
): boolean {
  return EDGE_LEGALITY_TABLE[edgeClass].some(
    ([a, b]) => a === fromClass && b === toClass,
  );
}

export function canonicalEdgeKey(edge: L6DagEdge): string {
  return `${edge.from_node_id}->${edge.to_node_id}|${edge.edge_class}`;
}
