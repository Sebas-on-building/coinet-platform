/**
 * L9.4 — DAG Node Model
 *
 * §9.4.4.1 — Typed, versioned node classes for the deterministic Layer 9
 * sequence-runtime. Nodes are the unit of work within a single
 * `L9SequenceRun`; every concrete engine emits artifacts bound to the
 * node that produced them.
 *
 * §9.4.4.2 — The node-to-stage mapping is one-to-one and monotonic,
 * which is what gives the runtime its determinism guarantee.
 *
 * Node ids are deterministic:
 *   `<class>:<run_id>:<subject_id>:<scope_type>:<scope_id>`
 * No engine may mint random ids for semantic objects (§9.4.16).
 */

/**
 * §9.4.4.1 — The full set of legal DAG node classes.
 */
export enum L9DagNodeClass {
  INPUT_NODE = 'INPUT_NODE',
  SUBJECT_NODE = 'SUBJECT_NODE',
  INPUT_RESOLUTION_NODE = 'INPUT_RESOLUTION_NODE',
  ORDERED_SIGNAL_NODE = 'ORDERED_SIGNAL_NODE',
  LEAD_LAG_NODE = 'LEAD_LAG_NODE',
  PHASE_NODE = 'PHASE_NODE',
  CHANGE_POINT_NODE = 'CHANGE_POINT_NODE',
  DECAY_NODE = 'DECAY_NODE',
  POST_EVENT_WINDOW_NODE = 'POST_EVENT_WINDOW_NODE',
  CLASSIFICATION_NODE = 'CLASSIFICATION_NODE',
  CONFIDENCE_NODE = 'CONFIDENCE_NODE',
  RESTRICTION_NODE = 'RESTRICTION_NODE',
  EVIDENCE_NODE = 'EVIDENCE_NODE',
  MATERIALIZATION_NODE = 'MATERIALIZATION_NODE',
}

export const ALL_L9_DAG_NODE_CLASSES: readonly L9DagNodeClass[] =
  Object.values(L9DagNodeClass);

/**
 * §9.4.4.2 — Execution stages. Stages are monotonically ordered, and
 * no later-stage node may execute before its prerequisites (§9.4.4.3).
 *
 * The 14-stage spine is the canonical ordering the production plan
 * declares. The prefix `S01..S14` exists so that alphabetical tie-break
 * is also valid temporal tie-break (§9.4.16.3).
 */
export enum L9DagStage {
  S01_INPUT = 'S01_INPUT',
  S02_SUBJECT = 'S02_SUBJECT',
  S03_INPUT_RESOLUTION = 'S03_INPUT_RESOLUTION',
  S04_ORDERED_SIGNAL = 'S04_ORDERED_SIGNAL',
  S05_LEAD_LAG = 'S05_LEAD_LAG',
  S06_PHASE = 'S06_PHASE',
  S07_CHANGE_POINT = 'S07_CHANGE_POINT',
  S08_DECAY = 'S08_DECAY',
  S09_POST_EVENT_WINDOW = 'S09_POST_EVENT_WINDOW',
  S10_CLASSIFICATION = 'S10_CLASSIFICATION',
  S11_CONFIDENCE = 'S11_CONFIDENCE',
  S12_RESTRICTION = 'S12_RESTRICTION',
  S13_EVIDENCE = 'S13_EVIDENCE',
  S14_MATERIALIZATION = 'S14_MATERIALIZATION',
}

export const L9_STAGE_ORDER: readonly L9DagStage[] = [
  L9DagStage.S01_INPUT,
  L9DagStage.S02_SUBJECT,
  L9DagStage.S03_INPUT_RESOLUTION,
  L9DagStage.S04_ORDERED_SIGNAL,
  L9DagStage.S05_LEAD_LAG,
  L9DagStage.S06_PHASE,
  L9DagStage.S07_CHANGE_POINT,
  L9DagStage.S08_DECAY,
  L9DagStage.S09_POST_EVENT_WINDOW,
  L9DagStage.S10_CLASSIFICATION,
  L9DagStage.S11_CONFIDENCE,
  L9DagStage.S12_RESTRICTION,
  L9DagStage.S13_EVIDENCE,
  L9DagStage.S14_MATERIALIZATION,
];

export const L9_STAGE_INDEX: Readonly<Record<L9DagStage, number>> =
  Object.fromEntries(L9_STAGE_ORDER.map((s, i) => [s, i])) as
    Record<L9DagStage, number>;

/**
 * §9.4.4.1 — Bind each node class to its canonical stage. A DAG builder
 * that places a node outside this stage is rejected with
 * `DAG_NODE_STAGE_MISMATCH` (§9.4.18.1).
 */
export const L9_NODE_CLASS_STAGE:
  Readonly<Record<L9DagNodeClass, L9DagStage>> = {
  [L9DagNodeClass.INPUT_NODE]: L9DagStage.S01_INPUT,
  [L9DagNodeClass.SUBJECT_NODE]: L9DagStage.S02_SUBJECT,
  [L9DagNodeClass.INPUT_RESOLUTION_NODE]: L9DagStage.S03_INPUT_RESOLUTION,
  [L9DagNodeClass.ORDERED_SIGNAL_NODE]: L9DagStage.S04_ORDERED_SIGNAL,
  [L9DagNodeClass.LEAD_LAG_NODE]: L9DagStage.S05_LEAD_LAG,
  [L9DagNodeClass.PHASE_NODE]: L9DagStage.S06_PHASE,
  [L9DagNodeClass.CHANGE_POINT_NODE]: L9DagStage.S07_CHANGE_POINT,
  [L9DagNodeClass.DECAY_NODE]: L9DagStage.S08_DECAY,
  [L9DagNodeClass.POST_EVENT_WINDOW_NODE]: L9DagStage.S09_POST_EVENT_WINDOW,
  [L9DagNodeClass.CLASSIFICATION_NODE]: L9DagStage.S10_CLASSIFICATION,
  [L9DagNodeClass.CONFIDENCE_NODE]: L9DagStage.S11_CONFIDENCE,
  [L9DagNodeClass.RESTRICTION_NODE]: L9DagStage.S12_RESTRICTION,
  [L9DagNodeClass.EVIDENCE_NODE]: L9DagStage.S13_EVIDENCE,
  [L9DagNodeClass.MATERIALIZATION_NODE]: L9DagStage.S14_MATERIALIZATION,
};

/**
 * §9.4.4.1 — Every DAG node is a contract-shaped record. Nodes do not
 * carry their own compute functions — engines consume the node's inputs
 * and emit artifacts bound to the node id.
 */
export interface L9DagNode {
  readonly node_id: string;
  readonly node_class: L9DagNodeClass;
  readonly stage: L9DagStage;
  readonly sequence_subject_id: string;
  readonly sequence_family: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly deterministic_inputs: readonly string[];
  readonly engine_id: string;
  readonly engine_version: string;
  readonly created_at_ordinal: number;
}

/**
 * §9.4.16.3 — Deterministic node id. The same
 * (class, run_id, subject_id, scope) tuple must always produce the
 * same id.
 */
export function buildL9DagNodeId(args: {
  node_class: L9DagNodeClass;
  sequence_run_id: string;
  sequence_subject_id: string;
  scope_type: string;
  scope_id: string;
}): string {
  return `${args.node_class}:${args.sequence_run_id}:${args.sequence_subject_id}:${args.scope_type}:${args.scope_id}`;
}

/**
 * §9.4.16.3 — Deterministic tie-break ordering for equal-stage nodes.
 */
export function compareL9NodesDeterministic(
  a: L9DagNode,
  b: L9DagNode,
): number {
  const sa = L9_STAGE_INDEX[a.stage];
  const sb = L9_STAGE_INDEX[b.stage];
  if (sa !== sb) return sa - sb;
  if (a.node_id < b.node_id) return -1;
  if (a.node_id > b.node_id) return 1;
  return 0;
}
