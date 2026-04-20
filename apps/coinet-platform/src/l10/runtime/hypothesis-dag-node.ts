/**
 * L10.4 — DAG Node Model
 *
 * §10.4.4.1 — Typed, versioned node classes for the deterministic
 * Layer 10 hypothesis runtime. Nodes are the unit of work within a
 * single `L10HypothesisRun`; every concrete engine emits artifacts
 * bound to the node that produced them.
 *
 * §10.4.4.2 — The node-to-stage mapping is one-to-one and monotonic,
 * which is what gives the hypothesis runtime its determinism
 * guarantee.
 *
 * Node ids are deterministic:
 *   `<class>:<run_id>:<subject_id>:<scope_type>:<scope_id>[:<candidate_id>]`
 * No engine may mint random ids for semantic objects (§10.4.16).
 */

/**
 * §10.4.4.1 — The full set of legal DAG node classes.
 */
export enum L10DagNodeClass {
  INPUT_NODE = 'INPUT_NODE',
  SUBJECT_NODE = 'SUBJECT_NODE',
  CANDIDATE_NODE = 'CANDIDATE_NODE',
  SUPPORT_NODE = 'SUPPORT_NODE',
  CONTRADICTION_NODE = 'CONTRADICTION_NODE',
  CONFIRMATION_NODE = 'CONFIRMATION_NODE',
  INVALIDATION_NODE = 'INVALIDATION_NODE',
  CONFIDENCE_NODE = 'CONFIDENCE_NODE',
  RANKING_NODE = 'RANKING_NODE',
  SPREAD_NODE = 'SPREAD_NODE',
  SHIFT_CONDITION_NODE = 'SHIFT_CONDITION_NODE',
  EVIDENCE_NODE = 'EVIDENCE_NODE',
  MATERIALIZATION_NODE = 'MATERIALIZATION_NODE',
}

export const ALL_L10_DAG_NODE_CLASSES: readonly L10DagNodeClass[] =
  Object.values(L10DagNodeClass);

/**
 * §10.4.4.2 — Execution stages. Stages are monotonically ordered, and
 * no later-stage node may execute before its prerequisites (§10.4.4.3).
 *
 * The 13-stage spine is the canonical ordering the production plan
 * declares. The prefix `S01..S13` exists so that alphabetical tie-break
 * is also valid temporal tie-break (§10.4.16.3).
 */
export enum L10DagStage {
  S01_INPUT = 'S01_INPUT',
  S02_SUBJECT = 'S02_SUBJECT',
  S03_CANDIDATE = 'S03_CANDIDATE',
  S04_SUPPORT = 'S04_SUPPORT',
  S05_CONTRADICTION = 'S05_CONTRADICTION',
  S06_CONFIRMATION = 'S06_CONFIRMATION',
  S07_INVALIDATION = 'S07_INVALIDATION',
  S08_CONFIDENCE = 'S08_CONFIDENCE',
  S09_RANKING = 'S09_RANKING',
  S10_SPREAD = 'S10_SPREAD',
  S11_SHIFT_CONDITION = 'S11_SHIFT_CONDITION',
  S12_EVIDENCE = 'S12_EVIDENCE',
  S13_MATERIALIZATION = 'S13_MATERIALIZATION',
}

export const L10_STAGE_ORDER: readonly L10DagStage[] = [
  L10DagStage.S01_INPUT,
  L10DagStage.S02_SUBJECT,
  L10DagStage.S03_CANDIDATE,
  L10DagStage.S04_SUPPORT,
  L10DagStage.S05_CONTRADICTION,
  L10DagStage.S06_CONFIRMATION,
  L10DagStage.S07_INVALIDATION,
  L10DagStage.S08_CONFIDENCE,
  L10DagStage.S09_RANKING,
  L10DagStage.S10_SPREAD,
  L10DagStage.S11_SHIFT_CONDITION,
  L10DagStage.S12_EVIDENCE,
  L10DagStage.S13_MATERIALIZATION,
];

export const L10_STAGE_INDEX: Readonly<Record<L10DagStage, number>> =
  Object.fromEntries(L10_STAGE_ORDER.map((s, i) => [s, i])) as
    Record<L10DagStage, number>;

/**
 * §10.4.4.1 — Bind each node class to its canonical stage. A DAG
 * builder that places a node outside this stage is rejected with
 * `DAG_NODE_STAGE_MISMATCH` (§10.4.18.1).
 */
export const L10_NODE_CLASS_STAGE:
  Readonly<Record<L10DagNodeClass, L10DagStage>> = {
    [L10DagNodeClass.INPUT_NODE]: L10DagStage.S01_INPUT,
    [L10DagNodeClass.SUBJECT_NODE]: L10DagStage.S02_SUBJECT,
    [L10DagNodeClass.CANDIDATE_NODE]: L10DagStage.S03_CANDIDATE,
    [L10DagNodeClass.SUPPORT_NODE]: L10DagStage.S04_SUPPORT,
    [L10DagNodeClass.CONTRADICTION_NODE]: L10DagStage.S05_CONTRADICTION,
    [L10DagNodeClass.CONFIRMATION_NODE]: L10DagStage.S06_CONFIRMATION,
    [L10DagNodeClass.INVALIDATION_NODE]: L10DagStage.S07_INVALIDATION,
    [L10DagNodeClass.CONFIDENCE_NODE]: L10DagStage.S08_CONFIDENCE,
    [L10DagNodeClass.RANKING_NODE]: L10DagStage.S09_RANKING,
    [L10DagNodeClass.SPREAD_NODE]: L10DagStage.S10_SPREAD,
    [L10DagNodeClass.SHIFT_CONDITION_NODE]: L10DagStage.S11_SHIFT_CONDITION,
    [L10DagNodeClass.EVIDENCE_NODE]: L10DagStage.S12_EVIDENCE,
    [L10DagNodeClass.MATERIALIZATION_NODE]: L10DagStage.S13_MATERIALIZATION,
  };

/**
 * §10.4.4.1 — Every DAG node is a contract-shaped record. Nodes do not
 * carry their own compute functions — engines consume the node's
 * inputs and emit artifacts bound to the node id.
 *
 * Candidate-scoped nodes (SUPPORT, CONTRADICTION, CONFIRMATION,
 * INVALIDATION, CONFIDENCE) carry a `hypothesis_candidate_id` so one
 * subject can legally produce multiple parallel evidence-posture
 * nodes — one per candidate — while SUBJECT/RANKING/SPREAD/SHIFT/
 * EVIDENCE/MATERIALIZATION are subject-scoped only.
 */
export interface L10DagNode {
  readonly node_id: string;
  readonly node_class: L10DagNodeClass;
  readonly stage: L10DagStage;
  readonly hypothesis_subject_id: string;
  readonly hypothesis_candidate_id: string | null;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly deterministic_inputs: readonly string[];
  readonly engine_id: string;
  readonly engine_version: string;
  readonly created_at_ordinal: number;
}

/**
 * §10.4.16.3 — Deterministic node id. The same
 * (class, run_id, subject_id, scope[, candidate]) tuple must always
 * produce the same id.
 */
export function buildL10DagNodeId(args: {
  node_class: L10DagNodeClass;
  hypothesis_run_id: string;
  hypothesis_subject_id: string;
  scope_type: string;
  scope_id: string;
  hypothesis_candidate_id?: string | null;
}): string {
  const suffix = args.hypothesis_candidate_id
    ? `:${args.hypothesis_candidate_id}`
    : '';
  return `${args.node_class}:${args.hypothesis_run_id}:${args.hypothesis_subject_id}:${args.scope_type}:${args.scope_id}${suffix}`;
}

/**
 * §10.4.16.3 — Deterministic tie-break ordering for equal-stage nodes.
 */
export function compareL10NodesDeterministic(
  a: L10DagNode,
  b: L10DagNode,
): number {
  const sa = L10_STAGE_INDEX[a.stage];
  const sb = L10_STAGE_INDEX[b.stage];
  if (sa !== sb) return sa - sb;
  if (a.node_id < b.node_id) return -1;
  if (a.node_id > b.node_id) return 1;
  return 0;
}

/**
 * §10.4.4.1 — Classes that must be candidate-scoped. Used by the DAG
 * builder to reject mis-scoped nodes deterministically.
 */
export const L10_CANDIDATE_SCOPED_CLASSES: ReadonlySet<L10DagNodeClass> =
  new Set<L10DagNodeClass>([
    L10DagNodeClass.CANDIDATE_NODE,
    L10DagNodeClass.SUPPORT_NODE,
    L10DagNodeClass.CONTRADICTION_NODE,
    L10DagNodeClass.CONFIRMATION_NODE,
    L10DagNodeClass.INVALIDATION_NODE,
    L10DagNodeClass.CONFIDENCE_NODE,
  ]);

export function isL10CandidateScopedClass(cls: L10DagNodeClass): boolean {
  return L10_CANDIDATE_SCOPED_CLASSES.has(cls);
}
