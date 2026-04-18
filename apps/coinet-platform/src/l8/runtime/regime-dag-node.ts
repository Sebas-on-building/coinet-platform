/**
 * L8.4 — DAG Node Model
 *
 * §8.4.2.3 — Typed, versioned node classes for the deterministic Layer 8
 * regime runtime. Nodes are the unit of work within a single
 * `L8RegimeRun`; every concrete engine emits artifacts bound to the
 * node that produced them.
 *
 * Node ids are deterministic: `<class>:<run_id>:<subject_id>:<scope>` with
 * optional domain suffix for quality nodes. No engine may mint random
 * ids for semantic objects.
 */

/**
 * §8.4.2.3 — The full set of legal DAG node classes.
 */
export enum L8DagNodeClass {
  INPUT_NODE = 'INPUT_NODE',
  SUBJECT_NODE = 'SUBJECT_NODE',
  INPUT_RESOLUTION_NODE = 'INPUT_RESOLUTION_NODE',
  CANDIDATE_NODE = 'CANDIDATE_NODE',
  TRANSITION_NODE = 'TRANSITION_NODE',
  QUALITY_NODE = 'QUALITY_NODE',
  CLASSIFICATION_NODE = 'CLASSIFICATION_NODE',
  CONFIDENCE_NODE = 'CONFIDENCE_NODE',
  MULTIPLIER_NODE = 'MULTIPLIER_NODE',
  EVIDENCE_NODE = 'EVIDENCE_NODE',
  MATERIALIZATION_NODE = 'MATERIALIZATION_NODE',
}

export const ALL_L8_DAG_NODE_CLASSES: readonly L8DagNodeClass[] =
  Object.values(L8DagNodeClass);

/**
 * §8.4.2.3 — Execution stages. Stages are monotonically ordered, and no
 * later-stage node may execute before its prerequisites (§8.4.6.6).
 */
export enum L8DagStage {
  S01_INPUT = 'S01_INPUT',
  S02_SUBJECT = 'S02_SUBJECT',
  S03_INPUT_RESOLUTION = 'S03_INPUT_RESOLUTION',
  S04_CANDIDATE = 'S04_CANDIDATE',
  S05_TRANSITION = 'S05_TRANSITION',
  S06_AMBIGUITY = 'S06_AMBIGUITY',
  S07_STALENESS = 'S07_STALENESS',
  S08_DEGRADATION = 'S08_DEGRADATION',
  S09_CLASSIFICATION = 'S09_CLASSIFICATION',
  S10_CONFIDENCE = 'S10_CONFIDENCE',
  S11_MULTIPLIER = 'S11_MULTIPLIER',
  S12_EVIDENCE = 'S12_EVIDENCE',
  S13_MATERIALIZATION = 'S13_MATERIALIZATION',
}

export const L8_STAGE_ORDER: readonly L8DagStage[] = [
  L8DagStage.S01_INPUT,
  L8DagStage.S02_SUBJECT,
  L8DagStage.S03_INPUT_RESOLUTION,
  L8DagStage.S04_CANDIDATE,
  L8DagStage.S05_TRANSITION,
  L8DagStage.S06_AMBIGUITY,
  L8DagStage.S07_STALENESS,
  L8DagStage.S08_DEGRADATION,
  L8DagStage.S09_CLASSIFICATION,
  L8DagStage.S10_CONFIDENCE,
  L8DagStage.S11_MULTIPLIER,
  L8DagStage.S12_EVIDENCE,
  L8DagStage.S13_MATERIALIZATION,
];

export const L8_STAGE_INDEX: Readonly<Record<L8DagStage, number>> =
  Object.fromEntries(L8_STAGE_ORDER.map((s, i) => [s, i])) as
    Record<L8DagStage, number>;

/**
 * §8.4.2.3 — Bind each node class to its canonical stage. A DAG builder
 * that places a node outside this stage is rejected (§8.4.2.5).
 *
 * The `QUALITY_NODE` class covers stages 6–8; callers decorate each
 * quality node with a `quality_domain` tag so the toposort can break
 * ties deterministically.
 */
export const L8_NODE_CLASS_STAGE: Readonly<Record<L8DagNodeClass, L8DagStage>> = {
  [L8DagNodeClass.INPUT_NODE]: L8DagStage.S01_INPUT,
  [L8DagNodeClass.SUBJECT_NODE]: L8DagStage.S02_SUBJECT,
  [L8DagNodeClass.INPUT_RESOLUTION_NODE]: L8DagStage.S03_INPUT_RESOLUTION,
  [L8DagNodeClass.CANDIDATE_NODE]: L8DagStage.S04_CANDIDATE,
  [L8DagNodeClass.TRANSITION_NODE]: L8DagStage.S05_TRANSITION,
  [L8DagNodeClass.QUALITY_NODE]: L8DagStage.S06_AMBIGUITY,
  [L8DagNodeClass.CLASSIFICATION_NODE]: L8DagStage.S09_CLASSIFICATION,
  [L8DagNodeClass.CONFIDENCE_NODE]: L8DagStage.S10_CONFIDENCE,
  [L8DagNodeClass.MULTIPLIER_NODE]: L8DagStage.S11_MULTIPLIER,
  [L8DagNodeClass.EVIDENCE_NODE]: L8DagStage.S12_EVIDENCE,
  [L8DagNodeClass.MATERIALIZATION_NODE]: L8DagStage.S13_MATERIALIZATION,
};

/**
 * §8.4.5.9 — Quality-domain separation. Ambiguity, staleness, and
 * degradation must remain distinct evaluation domains.
 */
export type L8QualityDomain = 'AMBIGUITY' | 'STALENESS' | 'DEGRADATION';

export const L8_QUALITY_DOMAIN_STAGE: Readonly<Record<L8QualityDomain, L8DagStage>> = {
  AMBIGUITY: L8DagStage.S06_AMBIGUITY,
  STALENESS: L8DagStage.S07_STALENESS,
  DEGRADATION: L8DagStage.S08_DEGRADATION,
};

/**
 * Every DAG node is a contract-shaped record. Nodes do not carry their
 * own compute functions — engines consume the node's inputs and emit
 * artifacts bound to the node id.
 */
export interface L8DagNode {
  readonly node_id: string;
  readonly node_class: L8DagNodeClass;
  readonly stage: L8DagStage;
  readonly regime_subject_id: string;
  readonly regime_family: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly quality_domain: L8QualityDomain | null;
  readonly deterministic_inputs: readonly string[];
  readonly engine_id: string;
  readonly engine_version: string;
  readonly created_at_ordinal: number;
}

/**
 * §8.4.2.6 / §8.4.2.8 — Deterministic node id. The same (class, run_id,
 * subject_id, scope, domain) tuple must always produce the same id.
 */
export function buildL8DagNodeId(args: {
  node_class: L8DagNodeClass;
  regime_run_id: string;
  regime_subject_id: string;
  scope_type: string;
  scope_id: string;
  quality_domain: L8QualityDomain | null;
}): string {
  const domainTag = args.quality_domain ? `:${args.quality_domain}` : '';
  return `${args.node_class}${domainTag}:${args.regime_run_id}:${args.regime_subject_id}:${args.scope_type}:${args.scope_id}`;
}

/**
 * §8.4.2.6 — Deterministic tie-break ordering for equal-stage nodes.
 */
export function compareL8NodesDeterministic(a: L8DagNode, b: L8DagNode): number {
  const sa = L8_STAGE_INDEX[a.stage];
  const sb = L8_STAGE_INDEX[b.stage];
  if (sa !== sb) return sa - sb;
  if (a.node_id < b.node_id) return -1;
  if (a.node_id > b.node_id) return 1;
  return 0;
}
