/**
 * L9.9 — Completion Standard
 *
 * §9.9.5 / §9.9.4.1 INV-9.9-A — Four completion dimensions, the hard
 * completion rule, and the three final completion states for Layer 9.
 */

export enum L9CompletionDimension {
  CONSTITUTIONAL = 'CONSTITUTIONAL',
  RUNTIME = 'RUNTIME',
  PERSISTENCE = 'PERSISTENCE',
  SERVING = 'SERVING',
}

export const ALL_L9_COMPLETION_DIMENSIONS: readonly L9CompletionDimension[] =
  Object.values(L9CompletionDimension);

/**
 * §9.9.5.5 — Final layer completion states.
 */
export enum L9CompletionState {
  L9_NOT_READY = 'L9_NOT_READY',
  L9_CONSTITUTIONALLY_READY = 'L9_CONSTITUTIONALLY_READY',
  L9_PRODUCTION_READY = 'L9_PRODUCTION_READY',
}

export const ALL_L9_COMPLETION_STATES: readonly L9CompletionState[] =
  Object.values(L9CompletionState);

/**
 * §9.9.1.4 — Typed ratification violation codes emitted by the
 * completion validator, ratification builder, freeze activator,
 * extension classifier, and handoff validator. Codes are disjoint from
 * L9.1–L9.8 persistence/reliance/constitutional codes.
 */
export enum L9RatificationViolationCode {
  MISSING_SUBLAYER = 'L99_MISSING_SUBLAYER',
  SUBLAYER_CERT_FAILED = 'L99_SUBLAYER_CERT_FAILED',
  CERTIFICATION_NOT_GREEN = 'L99_CERTIFICATION_NOT_GREEN',
  INVARIANT_FAILED = 'L99_INVARIANT_FAILED',
  CRITICAL_OBSERVABILITY_BREACH = 'L99_CRITICAL_OBSERVABILITY_BREACH',
  UNRESOLVED_REPAIR_INSTABILITY = 'L99_UNRESOLVED_REPAIR_INSTABILITY',

  CONSTITUTIONAL_INCOMPLETE = 'L99_CONSTITUTIONAL_INCOMPLETE',
  RUNTIME_INCOMPLETE = 'L99_RUNTIME_INCOMPLETE',
  PERSISTENCE_CONSTITUTION_INCOMPLETE = 'L99_PERSISTENCE_CONSTITUTION_INCOMPLETE',
  SERVING_INCOMPLETE = 'L99_SERVING_INCOMPLETE',

  MISSING_HANDOFF_SURFACE = 'L99_MISSING_HANDOFF_SURFACE',
  DOWNSTREAM_DEPENDENCY_UNSAFE = 'L99_DOWNSTREAM_DEPENDENCY_UNSAFE',
  ILLEGAL_DOWNSTREAM_DEPENDENCY = 'L99_ILLEGAL_DOWNSTREAM_DEPENDENCY',

  FREEZE_WITHOUT_RATIFICATION = 'L99_FREEZE_WITHOUT_RATIFICATION',
  UNCLASSIFIED_BREAKING_CHANGE = 'L99_UNCLASSIFIED_BREAKING_CHANGE',

  CONTRADICTS_FINAL_DEFINITION = 'L99_CONTRADICTS_FINAL_DEFINITION',
  EXECUTION_ORDER_VIOLATION = 'L99_EXECUTION_ORDER_VIOLATION',

  ARTIFACT_FINGERPRINT_DRIFT = 'L99_ARTIFACT_FINGERPRINT_DRIFT',
  IMPLICIT_FREEZE_SCOPE = 'L99_IMPLICIT_FREEZE_SCOPE',
  INTERNAL_SURFACE_EXPOSED = 'L99_INTERNAL_SURFACE_EXPOSED',

  ROLLOUT_WITHOUT_CERTIFICATION = 'L99_ROLLOUT_WITHOUT_CERTIFICATION',
  ROLLBACK_ERASES_HISTORY = 'L99_ROLLBACK_ERASES_HISTORY',
  ROLLBACK_BREAKS_LINEAGE = 'L99_ROLLBACK_BREAKS_LINEAGE',
  FAILURE_PLAYBOOK_MISSING = 'L99_FAILURE_PLAYBOOK_MISSING',
}

export const ALL_L9_RATIFICATION_VIOLATION_CODES:
  readonly L9RatificationViolationCode[] =
  Object.values(L9RatificationViolationCode);

/**
 * §9.9.5.1–§9.9.5.4 — Machine-readable requirements per completion
 * dimension. Each bullet is a requirement the completion validator
 * checks against its evidence bundle.
 */
export interface L9DimensionRequirement {
  readonly dimension: L9CompletionDimension;
  readonly description: string;
  readonly bullets: readonly string[];
}

export const L9_COMPLETION_REQUIREMENTS:
  Readonly<Record<L9CompletionDimension, L9DimensionRequirement>> =
  Object.freeze({
    [L9CompletionDimension.CONSTITUTIONAL]: {
      dimension: L9CompletionDimension.CONSTITUTIONAL,
      description:
        'L9.1/L9.2/L9.6 mission, boundary, object model, and template ' +
        'law frozen; no judgment/scenario/scoring leakage; L7/L8 ' +
        'posture preserved',
      bullets: Object.freeze([
        'L9.1 mission + boundary + capability policy frozen',
        'L9.2 sequence family + state + coexistence law frozen',
        'L9.6 sequence template + rollout law frozen',
        'no ungoverned sequence path',
        'no judgment/scenario/scoring semantics in L9',
        'contradiction, restriction, regime posture consumed, not ' +
          'laundered',
        'no causal laundering from temporal adjacency',
      ]),
    },
    [L9CompletionDimension.RUNTIME]: {
      dimension: L9CompletionDimension.RUNTIME,
      description:
        'L9.3/L9.4/L9.5/L9.7 contract-complete, deterministic runtime, ' +
        'temporal semantics, and reliance governance all execute legally',
      bullets: Object.freeze([
        'sequence subject contracts legal and deterministic',
        'sequence outputs contract-complete (chain, lead-lag, phase, ' +
          'decay, post-event, confidence, restriction)',
        'sequence runtime deterministic end-to-end',
        'temporal semantics (lead-lag, phase, change-point, decay, ' +
          'post-event) legal',
        'sequence confidence deterministic and cap-bound',
        'restriction rights and causal restraint explicit and ' +
          'queryable',
      ]),
    },
    [L9CompletionDimension.PERSISTENCE]: {
      dimension: L9CompletionDimension.PERSISTENCE,
      description:
        'L9.8 persistence, read surfaces, replay, repair, and ' +
        'lower-layer integration all obey L5 and read-surface law',
      bullets: Object.freeze([
        'L5-only persistence authority',
        'Postgres-only current authority (Redis never authority)',
        'historical surfaces append-safe + replay-identity-bearing',
        'evidence archive-linked and deterministic-path compliant',
        'lineage complete and replay-compatible',
        'replay and repair preserve meaning or mark divergence',
      ]),
    },
    [L9CompletionDimension.SERVING]: {
      dimension: L9CompletionDimension.SERVING,
      description:
        'Governed read surfaces expose current/historical/evidence/' +
        'lineage truth; later layers consume only stable handoff ' +
        'surfaces and never rebuild sequence from lower layers',
      bullets: Object.freeze([
        'current/historical/evidence/lineage read surfaces governed',
        'read modes validated (LIVE/HISTORICAL/REPLAY/REPAIR/EVIDENCE)',
        'no raw-store bypass',
        'stable handoff surfaces enumerated for L10+',
        'forbidden downstream access kinds rejected',
        'internal runtime surfaces never exposed as dependencies',
        'no-rebuild law enforced against later layers',
      ]),
    },
  });

export interface L9DimensionEvaluation {
  readonly dimension: L9CompletionDimension;
  readonly satisfied: boolean;
  readonly violations: readonly L9RatificationViolationCode[];
  readonly notes: readonly string[];
}

export interface L9CompletionEvaluation {
  readonly overall_state: L9CompletionState;
  readonly dimensions: readonly L9DimensionEvaluation[];
  readonly violations: readonly L9RatificationViolationCode[];
}
