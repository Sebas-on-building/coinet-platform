/**
 * L7.9 — Completion Standard
 *
 * §7.9.3 — Four completion dimensions, the hard completion rule, and
 * the three final completion states.
 */

export enum L7CompletionDimension {
  CONSTITUTIONAL = 'CONSTITUTIONAL',
  RUNTIME = 'RUNTIME',
  PERSISTENCE = 'PERSISTENCE',
  ASSURANCE = 'ASSURANCE',
}

export const ALL_L7_COMPLETION_DIMENSIONS: readonly L7CompletionDimension[] =
  Object.values(L7CompletionDimension);

/**
 * §7.9.3.3 — Final layer completion states.
 */
export enum L7CompletionState {
  L7_NOT_READY = 'L7_NOT_READY',
  L7_CONSTITUTIONALLY_READY = 'L7_CONSTITUTIONALLY_READY',
  L7_PRODUCTION_READY = 'L7_PRODUCTION_READY',
}

export const ALL_L7_COMPLETION_STATES: readonly L7CompletionState[] =
  Object.values(L7CompletionState);

/**
 * §7.9.3.5 — Typed ratification violation codes emitted by the
 * completion validator, ratification builder, freeze activator,
 * extension classifier, and handoff validator.
 */
export enum L7RatificationViolationCode {
  MISSING_SUBLAYER = 'MISSING_SUBLAYER',
  SUBLAYER_CERT_FAILED = 'SUBLAYER_CERT_FAILED',
  CERTIFICATION_NOT_GREEN = 'CERTIFICATION_NOT_GREEN',
  INVARIANT_FAILED = 'INVARIANT_FAILED',
  CRITICAL_OBSERVABILITY_BREACH = 'CRITICAL_OBSERVABILITY_BREACH',
  CRITICAL_MIGRATION_BLOCK = 'CRITICAL_MIGRATION_BLOCK',
  UNRESOLVED_REPAIR_INSTABILITY = 'UNRESOLVED_REPAIR_INSTABILITY',
  CONSTITUTIONAL_INCOMPLETE = 'CONSTITUTIONAL_INCOMPLETE',
  RUNTIME_INCOMPLETE = 'RUNTIME_INCOMPLETE',
  PERSISTENCE_CONSTITUTION_INCOMPLETE = 'PERSISTENCE_CONSTITUTION_INCOMPLETE',
  ASSURANCE_INCOMPLETE = 'ASSURANCE_INCOMPLETE',
  MISSING_HANDOFF_SURFACE = 'MISSING_HANDOFF_SURFACE',
  DOWNSTREAM_DEPENDENCY_UNSAFE = 'DOWNSTREAM_DEPENDENCY_UNSAFE',
  ILLEGAL_DOWNSTREAM_DEPENDENCY = 'ILLEGAL_DOWNSTREAM_DEPENDENCY',
  FREEZE_WITHOUT_RATIFICATION = 'FREEZE_WITHOUT_RATIFICATION',
  UNCLASSIFIED_BREAKING_CHANGE = 'UNCLASSIFIED_BREAKING_CHANGE',
  CONTRADICTS_FINAL_DEFINITION = 'CONTRADICTS_FINAL_DEFINITION',
  EXECUTION_ORDER_VIOLATION = 'EXECUTION_ORDER_VIOLATION',
}

export const ALL_L7_RATIFICATION_VIOLATION_CODES:
  readonly L7RatificationViolationCode[] =
  Object.values(L7RatificationViolationCode);

/**
 * §7.9.3.2 — Machine-readable requirements per completion dimension.
 */
export interface L7DimensionRequirement {
  readonly dimension: L7CompletionDimension;
  readonly description: string;
  readonly bullets: readonly string[];
}

export const L7_COMPLETION_REQUIREMENTS:
  Readonly<Record<L7CompletionDimension, L7DimensionRequirement>> =
  Object.freeze({
    [L7CompletionDimension.CONSTITUTIONAL]: {
      dimension: L7CompletionDimension.CONSTITUTIONAL,
      description:
        'mission, boundary, semantic law, and prohibition law fully encoded',
      bullets: Object.freeze([
        'L7.1 mission + boundary + capability policy frozen',
        'L7.5 semantic lawbook frozen (classes, modifiers, contradiction ' +
          'families, templates, families, rollout)',
        'L7.6 confidence + restriction law frozen',
        'no ungoverned validation path',
        'no undefined authority for current/historical/evidence',
        'no ambiguous replay/repair behaviour',
      ]),
    },
    [L7CompletionDimension.RUNTIME]: {
      dimension: L7CompletionDimension.RUNTIME,
      description:
        'subject assembly, resolution, contradiction handling, ' +
        'classification, confidence, restriction, and evidence all ' +
        'execute deterministically',
      bullets: Object.freeze([
        'validation subject assembly deterministic',
        'support/challenge resolution deterministic',
        'contradiction clustering deterministic',
        'validation classification legal and deterministic',
        'confidence derivation deterministic and cap-bound',
        'restriction derivation deterministic and law-bound',
        'evidence pack generation deterministic',
      ]),
    },
    [L7CompletionDimension.PERSISTENCE]: {
      dimension: L7CompletionDimension.PERSISTENCE,
      description:
        'current state, historical state, evidence, lineage, replay, ' +
        'repair, and downstream serving all obey L5 and read-surface law',
      bullets: Object.freeze([
        'L5-only persistence authority',
        'current ↔ historical alignment preserved',
        'evidence archive linked and discoverable',
        'lineage complete and replay-compatible',
        'replay semantics safe under all modes',
        'repair-only recompute cannot invent new truth',
        'read surfaces governed and consumer-safe',
      ]),
    },
    [L7CompletionDimension.ASSURANCE]: {
      dimension: L7CompletionDimension.ASSURANCE,
      description:
        'certification, migration, rollout, rollback, and observability ' +
        'all green',
      bullets: Object.freeze([
        'L7.8 certification at PRODUCTION_GREEN',
        'no blocking L7.8 violations',
        'no critical observability breach',
        'no critical migration block',
        'rollout and rollback discipline active',
        'family rollout gated and reversible',
      ]),
    },
  });

export interface L7DimensionEvaluation {
  readonly dimension: L7CompletionDimension;
  readonly satisfied: boolean;
  readonly violations: readonly L7RatificationViolationCode[];
  readonly notes: readonly string[];
}

export interface L7CompletionEvaluation {
  readonly overall_state: L7CompletionState;
  readonly dimensions: readonly L7DimensionEvaluation[];
  readonly violations: readonly L7RatificationViolationCode[];
}
