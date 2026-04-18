/**
 * L8.9 — Completion Standard
 *
 * §8.9.3 / §8.9.9.1 INV-8.9-A — Four completion dimensions, the hard
 * completion rule, and the three final completion states for Layer 8.
 */

export enum L8CompletionDimension {
  CONSTITUTIONAL = 'CONSTITUTIONAL',
  RUNTIME = 'RUNTIME',
  PERSISTENCE = 'PERSISTENCE',
  SERVING = 'SERVING',
}

export const ALL_L8_COMPLETION_DIMENSIONS: readonly L8CompletionDimension[] =
  Object.values(L8CompletionDimension);

/**
 * §8.9.10 — Final layer completion states.
 */
export enum L8CompletionState {
  L8_NOT_READY = 'L8_NOT_READY',
  L8_CONSTITUTIONALLY_READY = 'L8_CONSTITUTIONALLY_READY',
  L8_PRODUCTION_READY = 'L8_PRODUCTION_READY',
}

export const ALL_L8_COMPLETION_STATES: readonly L8CompletionState[] =
  Object.values(L8CompletionState);

/**
 * §8.9.4.3 — Typed ratification violation codes emitted by the
 * completion validator, ratification builder, freeze activator,
 * extension classifier, and handoff validator. Codes are disjoint from
 * L8.1–L8.8 persistence/reliance/constitutional codes.
 */
export enum L8RatificationViolationCode {
  MISSING_SUBLAYER = 'L89_MISSING_SUBLAYER',
  SUBLAYER_CERT_FAILED = 'L89_SUBLAYER_CERT_FAILED',
  CERTIFICATION_NOT_GREEN = 'L89_CERTIFICATION_NOT_GREEN',
  INVARIANT_FAILED = 'L89_INVARIANT_FAILED',
  CRITICAL_OBSERVABILITY_BREACH = 'L89_CRITICAL_OBSERVABILITY_BREACH',
  UNRESOLVED_REPAIR_INSTABILITY = 'L89_UNRESOLVED_REPAIR_INSTABILITY',

  CONSTITUTIONAL_INCOMPLETE = 'L89_CONSTITUTIONAL_INCOMPLETE',
  RUNTIME_INCOMPLETE = 'L89_RUNTIME_INCOMPLETE',
  PERSISTENCE_CONSTITUTION_INCOMPLETE = 'L89_PERSISTENCE_CONSTITUTION_INCOMPLETE',
  SERVING_INCOMPLETE = 'L89_SERVING_INCOMPLETE',

  MISSING_HANDOFF_SURFACE = 'L89_MISSING_HANDOFF_SURFACE',
  DOWNSTREAM_DEPENDENCY_UNSAFE = 'L89_DOWNSTREAM_DEPENDENCY_UNSAFE',
  ILLEGAL_DOWNSTREAM_DEPENDENCY = 'L89_ILLEGAL_DOWNSTREAM_DEPENDENCY',

  FREEZE_WITHOUT_RATIFICATION = 'L89_FREEZE_WITHOUT_RATIFICATION',
  UNCLASSIFIED_BREAKING_CHANGE = 'L89_UNCLASSIFIED_BREAKING_CHANGE',

  CONTRADICTS_FINAL_DEFINITION = 'L89_CONTRADICTS_FINAL_DEFINITION',
  EXECUTION_ORDER_VIOLATION = 'L89_EXECUTION_ORDER_VIOLATION',

  ARTIFACT_FINGERPRINT_DRIFT = 'L89_ARTIFACT_FINGERPRINT_DRIFT',
  IMPLICIT_FREEZE_SCOPE = 'L89_IMPLICIT_FREEZE_SCOPE',
  INTERNAL_SURFACE_EXPOSED = 'L89_INTERNAL_SURFACE_EXPOSED',
}

export const ALL_L8_RATIFICATION_VIOLATION_CODES:
  readonly L8RatificationViolationCode[] =
  Object.values(L8RatificationViolationCode);

/**
 * §8.9.3.2 — Machine-readable requirements per completion dimension.
 * Each bullet is a requirement the completion validator checks against
 * its evidence bundle.
 */
export interface L8DimensionRequirement {
  readonly dimension: L8CompletionDimension;
  readonly description: string;
  readonly bullets: readonly string[];
}

export const L8_COMPLETION_REQUIREMENTS:
  Readonly<Record<L8CompletionDimension, L8DimensionRequirement>> =
  Object.freeze({
    [L8CompletionDimension.CONSTITUTIONAL]: {
      dimension: L8CompletionDimension.CONSTITUTIONAL,
      description:
        'L8.1/L8.2/L8.5/L8.6 mission, boundary, object model, input ' +
        'law, and template law frozen',
      bullets: Object.freeze([
        'L8.1 mission + boundary + capability policy frozen',
        'L8.2 regime family + class + coexistence law frozen',
        'L8.5 regime input admissibility law frozen',
        'L8.6 family template + rollout law frozen',
        'no ungoverned regime path',
        'no judgment/scenario/scoring semantics in L8',
        'ambiguity, contradiction, restriction, staleness posture ' +
          'consumed, not laundered',
      ]),
    },
    [L8CompletionDimension.RUNTIME]: {
      dimension: L8CompletionDimension.RUNTIME,
      description:
        'L8.3/L8.4/L8.7 contract-complete, deterministic runtime, and ' +
        'reliance governance all execute legally',
      bullets: Object.freeze([
        'regime subject contracts legal and deterministic',
        'regime outputs contract-complete (regime, confidence, ' +
          'transition, multipliers)',
        'regime runtime deterministic end-to-end',
        'confidence derivation deterministic and cap-bound',
        'transition risk independent of confidence',
        'multiplier profiles interpretive, not determinative',
        'cap chains explicit, dominant, queryable',
      ]),
    },
    [L8CompletionDimension.PERSISTENCE]: {
      dimension: L8CompletionDimension.PERSISTENCE,
      description:
        'L8.8 persistence, read surfaces, replay, repair, and ' +
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
    [L8CompletionDimension.SERVING]: {
      dimension: L8CompletionDimension.SERVING,
      description:
        'Governed read surfaces expose current/historical/evidence/' +
        'lineage truth; later layers consume only stable handoff ' +
        'surfaces',
      bullets: Object.freeze([
        'current/historical/evidence/lineage read surfaces governed',
        'read modes validated (LIVE/HISTORICAL/REPLAY/REPAIR/...)',
        'no raw-store bypass',
        'stable handoff surfaces enumerated for L9+',
        'forbidden downstream access kinds rejected',
        'internal runtime surfaces never exposed as dependencies',
      ]),
    },
  });

export interface L8DimensionEvaluation {
  readonly dimension: L8CompletionDimension;
  readonly satisfied: boolean;
  readonly violations: readonly L8RatificationViolationCode[];
  readonly notes: readonly string[];
}

export interface L8CompletionEvaluation {
  readonly overall_state: L8CompletionState;
  readonly dimensions: readonly L8DimensionEvaluation[];
  readonly violations: readonly L8RatificationViolationCode[];
}
