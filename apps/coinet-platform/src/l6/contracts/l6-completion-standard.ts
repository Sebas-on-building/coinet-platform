/**
 * L6.9 — Completion Standard
 *
 * §6.9.3 — Four completion dimensions, the hard completion rule, and the
 * three final completion states.
 */

export enum L6CompletionDimension {
  CONSTITUTIONAL = 'CONSTITUTIONAL',
  FUNCTIONAL = 'FUNCTIONAL',
  OPERATIONAL = 'OPERATIONAL',
  DEPENDENCY = 'DEPENDENCY',
}

export const ALL_COMPLETION_DIMENSIONS: readonly L6CompletionDimension[] =
  Object.values(L6CompletionDimension);

/**
 * §6.9.4.5 — Final layer completion levels.
 */
export enum L6CompletionState {
  L6_NOT_READY = 'L6_NOT_READY',
  L6_CONSTITUTIONALLY_READY = 'L6_CONSTITUTIONALLY_READY',
  L6_PRODUCTION_READY = 'L6_PRODUCTION_READY',
}

export const ALL_COMPLETION_STATES: readonly L6CompletionState[] =
  Object.values(L6CompletionState);

/**
 * §6.9.8.2 — Violation codes emitted by the completion validator and the
 * ratification builder.
 */
export enum L6RatificationViolationCode {
  MISSING_SUBLAYER = 'MISSING_SUBLAYER',
  SUBLAYER_CERT_FAILED = 'SUBLAYER_CERT_FAILED',
  INVARIANT_FAILED = 'INVARIANT_FAILED',
  CRITICAL_OBSERVABILITY_BREACH = 'CRITICAL_OBSERVABILITY_BREACH',
  CRITICAL_MIGRATION_BLOCK = 'CRITICAL_MIGRATION_BLOCK',
  UNRESOLVED_REPAIR_INSTABILITY = 'UNRESOLVED_REPAIR_INSTABILITY',
  FUNCTIONAL_INCOMPLETE = 'FUNCTIONAL_INCOMPLETE',
  OPERATIONAL_INCOMPLETE = 'OPERATIONAL_INCOMPLETE',
  DEPENDENCY_INCOMPLETE = 'DEPENDENCY_INCOMPLETE',
  CONSTITUTIONAL_INCOMPLETE = 'CONSTITUTIONAL_INCOMPLETE',
  FREEZE_WITHOUT_RATIFICATION = 'FREEZE_WITHOUT_RATIFICATION',
  UNCLASSIFIED_BREAKING_CHANGE = 'UNCLASSIFIED_BREAKING_CHANGE',
  ILLEGAL_DOWNSTREAM_DEPENDENCY = 'ILLEGAL_DOWNSTREAM_DEPENDENCY',
  CONTRADICTS_FINAL_DEFINITION = 'CONTRADICTS_FINAL_DEFINITION',
  EXECUTION_ORDER_VIOLATION = 'EXECUTION_ORDER_VIOLATION',
}

export const ALL_RATIFICATION_VIOLATION_CODES: readonly L6RatificationViolationCode[] =
  Object.values(L6RatificationViolationCode);

/**
 * §6.9.3.3–§6.9.3.6 — Machine-readable requirements per dimension.
 */
export interface L6DimensionRequirement {
  readonly dimension: L6CompletionDimension;
  readonly description: string;
  readonly bullets: readonly string[];
}

export const L6_COMPLETION_REQUIREMENTS: Readonly<Record<L6CompletionDimension, L6DimensionRequirement>> =
  Object.freeze({
    [L6CompletionDimension.CONSTITUTIONAL]: {
      dimension: L6CompletionDimension.CONSTITUTIONAL,
      description: 'laws and boundaries frozen and enforceable',
      bullets: Object.freeze([
        'L6.1–L6.8 all certified',
        'no unresolved critical architectural ambiguity',
        'no ungoverned primitive path',
        'no undefined authority for current/history/evidence',
        'no ambiguous late-data or replay behavior',
        'no unresolved family legality',
      ]),
    },
    [L6CompletionDimension.FUNCTIONAL]: {
      dimension: L6CompletionDimension.FUNCTIONAL,
      description: 'layer can actually build and emit governed primitives',
      bullets: Object.freeze([
        'all first production feature families registered, validated, computable',
        'all first production event families registered, validated, lifecycle-safe',
        'feature current state and history aligned',
        'event current state and history aligned',
        'evidence packs generated for materially important outputs',
        'read surfaces active and legal',
      ]),
    },
    [L6CompletionDimension.OPERATIONAL]: {
      dimension: L6CompletionDimension.OPERATIONAL,
      description: 'layer can run, replay, repair, persist, observe, and recover safely',
      bullets: Object.freeze([
        'deterministic runtime',
        'cycle-free compute DAG',
        'replay-safe recomputation',
        'repair-safe recomputation',
        'late-data policy enforcement',
        'no shadow authority',
        'full observability and SLO coverage',
        'rollback and migration discipline',
        'no critical assurance-band failures',
      ]),
    },
    [L6CompletionDimension.DEPENDENCY]: {
      dimension: L6CompletionDimension.DEPENDENCY,
      description: 'later layers can depend on Layer 6 without re-deriving primitive meaning',
      bullets: Object.freeze([
        'later layers can consume current feature snapshots legally',
        'later layers can consume active events legally',
        'later layers can consume event history and evidence packs legally',
        'later layers forbidden from ad hoc primitive recompute except in replay/repair',
        'L6 outputs stable enough to become frozen upstream dependencies',
      ]),
    },
  });

export interface L6DimensionEvaluation {
  readonly dimension: L6CompletionDimension;
  readonly satisfied: boolean;
  readonly violations: readonly L6RatificationViolationCode[];
  readonly notes: readonly string[];
}

export interface L6CompletionEvaluation {
  readonly overall_state: L6CompletionState;
  readonly dimensions: readonly L6DimensionEvaluation[];
  readonly violations: readonly L6RatificationViolationCode[];
}
