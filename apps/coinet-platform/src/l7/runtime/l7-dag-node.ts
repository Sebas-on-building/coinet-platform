/**
 * L7.4 — DAG Node Model
 *
 * §7.4.1.4 — Typed, versioned node classes for the deterministic Layer 7
 * validation runtime. Nodes are the unit of work within a single
 * `L7ValidationRun`; every concrete engine emits artifacts bound to the
 * node that produced them.
 *
 * Node ids are deterministic: `<class>:<run_id>:<ordinal>` where `ordinal`
 * is derived from a stable sort of the subject/scope tuple. No engine may
 * mint random ids for semantic objects (§7.4.9.2).
 */

/**
 * §7.4.1.4 — The full set of legal DAG node classes. Any node that is
 * not of a class declared here is illegal and must be rejected at
 * DAG-build time.
 */
export enum L7DagNodeClass {
  INPUT_SURFACE_NODE = 'INPUT_SURFACE_NODE',
  VALIDATION_SUBJECT_NODE = 'VALIDATION_SUBJECT_NODE',
  SUPPORT_RESOLUTION_NODE = 'SUPPORT_RESOLUTION_NODE',
  CHALLENGE_RESOLUTION_NODE = 'CHALLENGE_RESOLUTION_NODE',
  CONTRADICTION_CANDIDATE_NODE = 'CONTRADICTION_CANDIDATE_NODE',
  CONTRADICTION_CLUSTER_NODE = 'CONTRADICTION_CLUSTER_NODE',
  EVALUATION_NODE = 'EVALUATION_NODE',
  VALIDATION_CLASSIFICATION_NODE = 'VALIDATION_CLASSIFICATION_NODE',
  CONFIDENCE_NODE = 'CONFIDENCE_NODE',
  RESTRICTION_NODE = 'RESTRICTION_NODE',
  EVIDENCE_PACK_NODE = 'EVIDENCE_PACK_NODE',
  MATERIALIZATION_NODE = 'MATERIALIZATION_NODE',
}

export const ALL_DAG_NODE_CLASSES: readonly L7DagNodeClass[] =
  Object.values(L7DagNodeClass);

/**
 * §7.4.1.3 — Each node class is anchored to a specific execution stage.
 * Stages are monotonically ordered, and no later-stage node may execute
 * before its prerequisites (§7.4.1.7 deterministic ordering law).
 */
export enum L7DagStage {
  S01_SUBJECT_INTAKE = 'S01_SUBJECT_INTAKE',
  S02_SUPPORT_RESOLUTION = 'S02_SUPPORT_RESOLUTION',
  S03_CHALLENGE_RESOLUTION = 'S03_CHALLENGE_RESOLUTION',
  S04_CONTRADICTION_DETECTION = 'S04_CONTRADICTION_DETECTION',
  S05_CONTRADICTION_CLUSTERING = 'S05_CONTRADICTION_CLUSTERING',
  S06_INCOMPLETENESS_EVAL = 'S06_INCOMPLETENESS_EVAL',
  S07_STALENESS_EVAL = 'S07_STALENESS_EVAL',
  S08_AMBIGUITY_EVAL = 'S08_AMBIGUITY_EVAL',
  S09_DEGRADATION_EVAL = 'S09_DEGRADATION_EVAL',
  S10_CLASSIFICATION = 'S10_CLASSIFICATION',
  S11_CONFIDENCE = 'S11_CONFIDENCE',
  S12_RESTRICTION = 'S12_RESTRICTION',
  S13_EVIDENCE_PACK = 'S13_EVIDENCE_PACK',
  S14_MATERIALIZATION_PREP = 'S14_MATERIALIZATION_PREP',
  S15_L5_HANDOFF = 'S15_L5_HANDOFF',
}

export const STAGE_ORDER: readonly L7DagStage[] = [
  L7DagStage.S01_SUBJECT_INTAKE,
  L7DagStage.S02_SUPPORT_RESOLUTION,
  L7DagStage.S03_CHALLENGE_RESOLUTION,
  L7DagStage.S04_CONTRADICTION_DETECTION,
  L7DagStage.S05_CONTRADICTION_CLUSTERING,
  L7DagStage.S06_INCOMPLETENESS_EVAL,
  L7DagStage.S07_STALENESS_EVAL,
  L7DagStage.S08_AMBIGUITY_EVAL,
  L7DagStage.S09_DEGRADATION_EVAL,
  L7DagStage.S10_CLASSIFICATION,
  L7DagStage.S11_CONFIDENCE,
  L7DagStage.S12_RESTRICTION,
  L7DagStage.S13_EVIDENCE_PACK,
  L7DagStage.S14_MATERIALIZATION_PREP,
  L7DagStage.S15_L5_HANDOFF,
];

export const STAGE_INDEX: Readonly<Record<L7DagStage, number>> =
  Object.fromEntries(STAGE_ORDER.map((s, i) => [s, i])) as Record<L7DagStage, number>;

/**
 * Bind each node class to its canonical stage. A DAG builder that places a
 * node outside this stage is rejected (§7.4.1.5 illegal pairings).
 */
export const NODE_CLASS_STAGE: Readonly<Record<L7DagNodeClass, L7DagStage>> = {
  [L7DagNodeClass.INPUT_SURFACE_NODE]: L7DagStage.S01_SUBJECT_INTAKE,
  [L7DagNodeClass.VALIDATION_SUBJECT_NODE]: L7DagStage.S01_SUBJECT_INTAKE,
  [L7DagNodeClass.SUPPORT_RESOLUTION_NODE]: L7DagStage.S02_SUPPORT_RESOLUTION,
  [L7DagNodeClass.CHALLENGE_RESOLUTION_NODE]: L7DagStage.S03_CHALLENGE_RESOLUTION,
  [L7DagNodeClass.CONTRADICTION_CANDIDATE_NODE]: L7DagStage.S04_CONTRADICTION_DETECTION,
  [L7DagNodeClass.CONTRADICTION_CLUSTER_NODE]: L7DagStage.S05_CONTRADICTION_CLUSTERING,
  // Evaluation nodes cover stages 6–9; callers decorate `evaluation_domain`
  // so the toposort can break ties deterministically.
  [L7DagNodeClass.EVALUATION_NODE]: L7DagStage.S06_INCOMPLETENESS_EVAL,
  [L7DagNodeClass.VALIDATION_CLASSIFICATION_NODE]: L7DagStage.S10_CLASSIFICATION,
  [L7DagNodeClass.CONFIDENCE_NODE]: L7DagStage.S11_CONFIDENCE,
  [L7DagNodeClass.RESTRICTION_NODE]: L7DagStage.S12_RESTRICTION,
  [L7DagNodeClass.EVIDENCE_PACK_NODE]: L7DagStage.S13_EVIDENCE_PACK,
  [L7DagNodeClass.MATERIALIZATION_NODE]: L7DagStage.S14_MATERIALIZATION_PREP,
};

/**
 * Evaluation engines share a single node class but occupy four distinct
 * stages. The domain tag distinguishes them deterministically.
 */
export type L7EvaluationDomain =
  | 'INCOMPLETENESS'
  | 'STALENESS'
  | 'AMBIGUITY'
  | 'DEGRADATION';

export const EVALUATION_DOMAIN_STAGE: Readonly<Record<L7EvaluationDomain, L7DagStage>> = {
  INCOMPLETENESS: L7DagStage.S06_INCOMPLETENESS_EVAL,
  STALENESS: L7DagStage.S07_STALENESS_EVAL,
  AMBIGUITY: L7DagStage.S08_AMBIGUITY_EVAL,
  DEGRADATION: L7DagStage.S09_DEGRADATION_EVAL,
};

/**
 * Every DAG node is a contract-shaped record. Nodes do not carry their
 * own compute functions — engines consume the node's inputs and emit
 * artifacts bound to the node id.
 */
export interface L7DagNode {
  readonly node_id: string;
  readonly node_class: L7DagNodeClass;
  readonly stage: L7DagStage;
  readonly validation_subject_id: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly evaluation_domain: L7EvaluationDomain | null;
  readonly deterministic_inputs: readonly string[];
  readonly engine_id: string;
  readonly engine_version: string;
  readonly created_at_ordinal: number;
}

/**
 * Build a deterministic node id. The same (class, run_id, subject_id,
 * scope, domain) tuple must always produce the same id — this is one of
 * the §7.4.9.2 deterministic-identity guarantees.
 */
export function buildDagNodeId(args: {
  node_class: L7DagNodeClass;
  validation_run_id: string;
  validation_subject_id: string;
  scope_type: string;
  scope_id: string;
  evaluation_domain: L7EvaluationDomain | null;
}): string {
  const domainTag = args.evaluation_domain ? `:${args.evaluation_domain}` : '';
  return `${args.node_class}${domainTag}:${args.validation_run_id}:${args.validation_subject_id}:${args.scope_type}:${args.scope_id}`;
}

/**
 * §7.4.1.7 — Deterministic tie-break ordering. Nodes with identical stage
 * rank are compared on node_id lexicographically so the scheduler can
 * never diverge across runs.
 */
export function compareNodesDeterministic(a: L7DagNode, b: L7DagNode): number {
  const sa = STAGE_INDEX[a.stage];
  const sb = STAGE_INDEX[b.stage];
  if (sa !== sb) return sa - sb;
  if (a.node_id < b.node_id) return -1;
  if (a.node_id > b.node_id) return 1;
  return 0;
}
