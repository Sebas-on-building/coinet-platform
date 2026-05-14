/**
 * L10.9 — Completion Standard
 *
 * §10.9.4 / §10.9.13 INV-10.9-A — Four completion dimensions, the
 * hard completion rule, and the three final completion states for
 * Layer 10.
 */

export enum L10CompletionDimension {
  CONSTITUTIONAL = 'CONSTITUTIONAL',
  RUNTIME = 'RUNTIME',
  PERSISTENCE = 'PERSISTENCE',
  SERVING = 'SERVING',
}

export const ALL_L10_COMPLETION_DIMENSIONS: readonly L10CompletionDimension[] =
  Object.values(L10CompletionDimension);

/**
 * §10.9.4.2 / §10.9.15 — Final layer completion states.
 */
export enum L10CompletionState {
  L10_NOT_READY = 'L10_NOT_READY',
  L10_CONSTITUTIONALLY_READY = 'L10_CONSTITUTIONALLY_READY',
  L10_PRODUCTION_READY = 'L10_PRODUCTION_READY',
}

export const ALL_L10_COMPLETION_STATES: readonly L10CompletionState[] =
  Object.values(L10CompletionState);

/**
 * §10.9.1.4 / §10.9.12 — Typed ratification violation codes emitted
 * by the completion validator, ratification builder, freeze
 * activator, extension classifier, and handoff validator. Codes are
 * disjoint from L10.1–L10.8 persistence/reliance/constitutional
 * codes.
 */
export enum L10RatificationViolationCode {
  MISSING_SUBLAYER = 'L109_MISSING_SUBLAYER',
  SUBLAYER_CERT_FAILED = 'L109_SUBLAYER_CERT_FAILED',
  CERTIFICATION_NOT_GREEN = 'L109_CERTIFICATION_NOT_GREEN',
  INVARIANT_FAILED = 'L109_INVARIANT_FAILED',
  CRITICAL_OBSERVABILITY_BREACH = 'L109_CRITICAL_OBSERVABILITY_BREACH',
  UNRESOLVED_REPAIR_INSTABILITY = 'L109_UNRESOLVED_REPAIR_INSTABILITY',

  CONSTITUTIONAL_INCOMPLETE = 'L109_CONSTITUTIONAL_INCOMPLETE',
  RUNTIME_INCOMPLETE = 'L109_RUNTIME_INCOMPLETE',
  PERSISTENCE_CONSTITUTION_INCOMPLETE =
    'L109_PERSISTENCE_CONSTITUTION_INCOMPLETE',
  SERVING_INCOMPLETE = 'L109_SERVING_INCOMPLETE',

  MISSING_HANDOFF_SURFACE = 'L109_MISSING_HANDOFF_SURFACE',
  DOWNSTREAM_DEPENDENCY_UNSAFE = 'L109_DOWNSTREAM_DEPENDENCY_UNSAFE',
  ILLEGAL_DOWNSTREAM_DEPENDENCY = 'L109_ILLEGAL_DOWNSTREAM_DEPENDENCY',

  FREEZE_WITHOUT_RATIFICATION = 'L109_FREEZE_WITHOUT_RATIFICATION',
  UNCLASSIFIED_BREAKING_CHANGE = 'L109_UNCLASSIFIED_BREAKING_CHANGE',

  CONTRADICTS_FINAL_DEFINITION = 'L109_CONTRADICTS_FINAL_DEFINITION',
  EXECUTION_ORDER_VIOLATION = 'L109_EXECUTION_ORDER_VIOLATION',

  ARTIFACT_FINGERPRINT_DRIFT = 'L109_ARTIFACT_FINGERPRINT_DRIFT',
  IMPLICIT_FREEZE_SCOPE = 'L109_IMPLICIT_FREEZE_SCOPE',
  INTERNAL_SURFACE_EXPOSED = 'L109_INTERNAL_SURFACE_EXPOSED',

  ROLLOUT_WITHOUT_CERTIFICATION = 'L109_ROLLOUT_WITHOUT_CERTIFICATION',
  ROLLBACK_ERASES_HISTORY = 'L109_ROLLBACK_ERASES_HISTORY',
  ROLLBACK_BREAKS_LINEAGE = 'L109_ROLLBACK_BREAKS_LINEAGE',
  FAILURE_PLAYBOOK_MISSING = 'L109_FAILURE_PLAYBOOK_MISSING',
}

export const ALL_L10_RATIFICATION_VIOLATION_CODES:
  readonly L10RatificationViolationCode[] =
  Object.values(L10RatificationViolationCode);

/**
 * §10.9.4.3 — Machine-readable requirements per completion dimension.
 * Each bullet is a requirement the completion validator checks
 * against its evidence bundle.
 */
export interface L10DimensionRequirement {
  readonly dimension: L10CompletionDimension;
  readonly description: string;
  readonly bullets: readonly string[];
}

export const L10_COMPLETION_REQUIREMENTS:
  Readonly<Record<L10CompletionDimension, L10DimensionRequirement>> =
  Object.freeze({
    [L10CompletionDimension.CONSTITUTIONAL]: {
      dimension: L10CompletionDimension.CONSTITUTIONAL,
      description:
        'L10.1/L10.2/L10.6 mission, boundary, object model, and ' +
        'family/template law frozen; no judgment/scenario/scoring/' +
        'recommendation leakage; L7/L8/L9 posture preserved',
      bullets: Object.freeze([
        'L10.1 mission + boundary + capability policy frozen',
        'L10.2 hypothesis subject + candidate + assessment object ' +
          'model frozen',
        'L10.6 hypothesis family + template + rollout law frozen',
        'no ungoverned hypothesis path',
        'no judgment/scenario/scoring/recommendation semantics in L10',
        'L7 contradiction/restriction posture consumed, not laundered',
        'L8 regime posture consumed, not laundered',
        'L9 sequence posture consumed, not laundered',
        'no single-story collapse permitted',
      ]),
    },
    [L10CompletionDimension.RUNTIME]: {
      dimension: L10CompletionDimension.RUNTIME,
      description:
        'L10.3/L10.4/L10.5/L10.7 contract-complete, deterministic ' +
        'runtime, evidence semantics, and reliance governance all ' +
        'execute legally',
      bullets: Object.freeze([
        'hypothesis subject contracts legal and deterministic',
        'hypothesis outputs contract-complete (assessment, ranking, ' +
          'spread, restriction, shift-condition, reliance)',
        'hypothesis runtime DAG deterministic end-to-end',
        'evidence semantics (support/contradiction/confirmation/' +
          'invalidation/shift-condition) legal',
        'hypothesis confidence deterministic and cap-bound',
        'restriction rights and readiness explicit and queryable',
        'spread between primary and secondary always preserved',
      ]),
    },
    [L10CompletionDimension.PERSISTENCE]: {
      dimension: L10CompletionDimension.PERSISTENCE,
      description:
        'L10.8 persistence, read surfaces, replay, repair, and ' +
        'lower-layer integration all obey L5 and read-surface law',
      bullets: Object.freeze([
        'L5-only persistence authority',
        'Postgres-only current authority (Redis never authority)',
        'historical surfaces append-safe + replay-identity-bearing',
        'evidence archive-linked, deterministic-path compliant, ' +
          'manifest-linked, checksum-bearing',
        'lineage complete and replay-compatible',
        'replay and repair preserve meaning or mark divergence',
      ]),
    },
    [L10CompletionDimension.SERVING]: {
      dimension: L10CompletionDimension.SERVING,
      description:
        'Governed read surfaces expose current/historical/evidence/' +
        'lineage truth; later layers consume only stable handoff ' +
        'surfaces and never rebuild hypotheses from L6/L7/L8/L9',
      bullets: Object.freeze([
        'current/historical/evidence/lineage read surfaces governed',
        'read modes validated (LIVE/HISTORICAL/REPLAY/REPAIR/EVIDENCE/' +
          'LINEAGE)',
        'no raw-store bypass',
        'stable handoff surfaces enumerated for L11+',
        'forbidden downstream access kinds rejected',
        'internal runtime surfaces never exposed as dependencies',
        'no-rebuild law enforced against later layers',
      ]),
    },
  });

export interface L10DimensionEvaluation {
  readonly dimension: L10CompletionDimension;
  readonly satisfied: boolean;
  readonly violations: readonly L10RatificationViolationCode[];
  readonly notes: readonly string[];
}

export interface L10CompletionEvaluation {
  readonly overall_state: L10CompletionState;
  readonly dimensions: readonly L10DimensionEvaluation[];
  readonly violations: readonly L10RatificationViolationCode[];
}
