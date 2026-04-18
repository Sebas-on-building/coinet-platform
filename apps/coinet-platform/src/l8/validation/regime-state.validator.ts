/**
 * L8.2 — Regime State Validator
 *
 * §8.2.8 — Full object-model validator for a governed regime state.
 *
 * Enforces:
 *   - identity and template completeness
 *   - family + class legality (§8.2.3 / §8.2.3.7)
 *   - scope legality for family AND class (§8.2.3.6 / §8.2.4.3 / …)
 *   - evidence, validation, evidence_pack, and input_snapshot refs
 *   - confidence score + band consistency
 *   - transition score + class consistency
 *   - coexistence class consistency with primary/secondary
 *   - lineage, replay hash, compute run identity, policy version
 *   - no forbidden judgment/scenario/recommendation semantics in name or
 *     description (§8.2.1.5 / §8.2.9 linkage via L8.1 boundary law)
 */

import {
  L8RegimeState,
  L8RegimeConfidenceBand,
  L8TransitionRiskClass,
  L8RegimeCoexistenceClass,
} from '../contracts/regime-state';
import { L8RegimeObjectViolationCode } from '../contracts/regime-output-class';
import { containsL8ForbiddenNaming } from '../contracts/l8-boundary';
import {
  L8RegimeFamilyRegistry,
  getDefaultL8RegimeFamilyRegistry,
} from '../registry/regime-family.registry';
import {
  L8RegimeClassRegistry,
  getDefaultL8RegimeClassRegistry,
} from '../registry/regime-class.registry';
import {
  L8RegimeCoexistenceRegistry,
  getDefaultL8CoexistenceRegistry,
} from '../registry/regime-coexistence.registry';
import { validateIntraFamilyCoexistence } from './regime-coexistence.validator';

export interface L8RegimeStateIssue {
  readonly code: L8RegimeObjectViolationCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface L8RegimeStateReport {
  readonly valid: boolean;
  readonly issues: readonly L8RegimeStateIssue[];
}

function isInUnitInterval(x: number): boolean {
  return Number.isFinite(x) && x >= 0 && x <= 1;
}

function confidenceBandMatchesScore(
  score: number,
  band: L8RegimeConfidenceBand,
): boolean {
  if (score < 0.25) return band === L8RegimeConfidenceBand.LOW;
  if (score < 0.55) return band === L8RegimeConfidenceBand.MODERATE;
  if (score < 0.85) return band === L8RegimeConfidenceBand.HIGH;
  return band === L8RegimeConfidenceBand.FULL;
}

function transitionClassMatchesScore(
  score: number,
  cls: L8TransitionRiskClass,
): boolean {
  if (score < 0.15) return cls === L8TransitionRiskClass.STABLE;
  if (score < 0.35) return cls === L8TransitionRiskClass.MILD;
  if (score < 0.6) return cls === L8TransitionRiskClass.ELEVATED;
  if (score < 0.85) return cls === L8TransitionRiskClass.HIGH;
  return cls === L8TransitionRiskClass.CRITICAL;
}

export function validateRegimeState(
  state: L8RegimeState,
  familyRegistry:
    L8RegimeFamilyRegistry = getDefaultL8RegimeFamilyRegistry(),
  classRegistry:
    L8RegimeClassRegistry = getDefaultL8RegimeClassRegistry(),
  coexistenceRegistry:
    L8RegimeCoexistenceRegistry = getDefaultL8CoexistenceRegistry(),
): L8RegimeStateReport {
  const issues: L8RegimeStateIssue[] = [];

  // Identity
  if (!state.regime_state_id) {
    issues.push({
      code: L8RegimeObjectViolationCode.STATE_MISSING_STATE_ID,
      message: 'regime_state_id missing',
    });
  }
  if (!state.regime_subject_id) {
    issues.push({
      code: L8RegimeObjectViolationCode.SUBJECT_MISSING_IDENTITY,
      message: 'regime_subject_id missing',
    });
  }
  if (!state.regime_template_id) {
    issues.push({
      code: L8RegimeObjectViolationCode.STATE_MISSING_TEMPLATE,
      message: 'regime_template_id missing',
    });
  }
  if (!state.regime_version) {
    issues.push({
      code: L8RegimeObjectViolationCode.STATE_MISSING_VERSION,
      message: 'regime_version missing',
    });
  }

  // Family / primary / secondary legality
  if (!familyRegistry.isRegistered(state.regime_family)) {
    issues.push({
      code: L8RegimeObjectViolationCode.FAMILY_UNREGISTERED,
      message: `regime_family ${state.regime_family} not registered`,
    });
  }

  if (!state.primary_regime) {
    issues.push({
      code: L8RegimeObjectViolationCode.STATE_MISSING_PRIMARY_REGIME,
      message: 'primary_regime missing',
    });
  } else if (!classRegistry.isRegistered(state.primary_regime)) {
    issues.push({
      code: L8RegimeObjectViolationCode.CLASS_UNREGISTERED,
      message: `primary_regime ${state.primary_regime} not registered`,
    });
  } else if (!classRegistry.belongsToFamily(state.primary_regime, state.regime_family)) {
    issues.push({
      code: L8RegimeObjectViolationCode.CLASS_NOT_IN_FAMILY,
      message:
        `primary_regime ${state.primary_regime} not in family ${state.regime_family}`,
    });
  }

  if (state.secondary_regime !== null) {
    if (!classRegistry.isRegistered(state.secondary_regime)) {
      issues.push({
        code: L8RegimeObjectViolationCode.CLASS_UNREGISTERED,
        message: `secondary_regime ${state.secondary_regime} not registered`,
      });
    } else if (!classRegistry.belongsToFamily(state.secondary_regime, state.regime_family)) {
      issues.push({
        code: L8RegimeObjectViolationCode.STATE_SECONDARY_WRONG_FAMILY,
        message:
          `secondary_regime ${state.secondary_regime} does not belong to family ${state.regime_family}`,
      });
    }
  }

  // Scope
  if (!state.scope_type) {
    issues.push({
      code: L8RegimeObjectViolationCode.STATE_MISSING_SCOPE,
      message: 'scope_type missing',
    });
  }
  if (!state.scope_id) {
    issues.push({
      code: L8RegimeObjectViolationCode.STATE_MISSING_SCOPE,
      message: 'scope_id missing',
    });
  }
  if (state.scope_type && !familyRegistry.allowsScope(state.regime_family, state.scope_type)) {
    issues.push({
      code: L8RegimeObjectViolationCode.SUBJECT_SCOPE_ILLEGAL_FOR_FAMILY,
      message:
        `scope ${state.scope_type} illegal for family ${state.regime_family}`,
    });
  }
  if (
    state.scope_type &&
    state.primary_regime &&
    classRegistry.isRegistered(state.primary_regime) &&
    !classRegistry.allowsScope(state.primary_regime, state.scope_type)
  ) {
    issues.push({
      code: L8RegimeObjectViolationCode.CLASS_SCOPE_ILLEGAL,
      message:
        `scope ${state.scope_type} illegal for class ${state.primary_regime}`,
    });
  }

  // Time
  if (!state.as_of) {
    issues.push({
      code: L8RegimeObjectViolationCode.STATE_MISSING_TIME_ANCHOR,
      message: 'as_of missing',
    });
  }

  // Evidence / validation / evidence_pack / input_snapshot
  if (!state.supporting_surface_refs || state.supporting_surface_refs.length === 0) {
    issues.push({
      code: L8RegimeObjectViolationCode.STATE_MISSING_EVIDENCE,
      message: 'supporting_surface_refs empty',
    });
  }
  if (!state.validation_refs || state.validation_refs.length === 0) {
    issues.push({
      code: L8RegimeObjectViolationCode.STATE_MISSING_VALIDATION_REFS,
      message: 'validation_refs empty (L7 stable-handoff refs required)',
    });
  }
  if (!state.evidence_pack_ref) {
    issues.push({
      code: L8RegimeObjectViolationCode.STATE_MISSING_EVIDENCE_PACK,
      message: 'evidence_pack_ref missing',
    });
  }
  if (!state.input_snapshot_ref) {
    issues.push({
      code: L8RegimeObjectViolationCode.STATE_MISSING_INPUT_SNAPSHOT,
      message: 'input_snapshot_ref missing',
    });
  }
  if (!state.multiplier_profile_ref) {
    issues.push({
      code: L8RegimeObjectViolationCode.STATE_MISSING_MULTIPLIER_PROFILE,
      message: 'multiplier_profile_ref missing (§8.2.8.1)',
    });
  }

  // Confidence
  if (!isInUnitInterval(state.regime_confidence_score)) {
    issues.push({
      code: L8RegimeObjectViolationCode.STATE_CONFIDENCE_OUT_OF_RANGE,
      message:
        `regime_confidence_score out of range: ${state.regime_confidence_score}`,
    });
  } else if (!confidenceBandMatchesScore(
    state.regime_confidence_score,
    state.regime_confidence_band,
  )) {
    issues.push({
      code: L8RegimeObjectViolationCode.STATE_CONFIDENCE_BAND_INCONSISTENT,
      message:
        `regime_confidence_band ${state.regime_confidence_band} does not match score ${state.regime_confidence_score}`,
    });
  }

  if (state.secondary_regime !== null && state.secondary_regime_confidence === null) {
    issues.push({
      code: L8RegimeObjectViolationCode.STATE_SECONDARY_CONFIDENCE_MISSING,
      message:
        'secondary_regime present but secondary_regime_confidence is null',
    });
  }
  if (state.secondary_regime === null && state.secondary_regime_confidence !== null) {
    issues.push({
      code:
        L8RegimeObjectViolationCode.STATE_SECONDARY_CONFIDENCE_PRESENT_BUT_NO_SECONDARY,
      message:
        'secondary_regime_confidence present without a secondary_regime',
    });
  }
  if (
    state.secondary_regime_confidence !== null &&
    !isInUnitInterval(state.secondary_regime_confidence)
  ) {
    issues.push({
      code: L8RegimeObjectViolationCode.STATE_CONFIDENCE_OUT_OF_RANGE,
      message:
        `secondary_regime_confidence out of range: ${state.secondary_regime_confidence}`,
    });
  }

  // Transition
  if (!isInUnitInterval(state.transition_risk_score)) {
    issues.push({
      code: L8RegimeObjectViolationCode.STATE_TRANSITION_SCORE_OUT_OF_RANGE,
      message:
        `transition_risk_score out of range: ${state.transition_risk_score}`,
    });
  } else if (!transitionClassMatchesScore(
    state.transition_risk_score,
    state.transition_risk_class,
  )) {
    issues.push({
      code: L8RegimeObjectViolationCode.STATE_TRANSITION_CLASS_INCONSISTENT,
      message:
        `transition_risk_class ${state.transition_risk_class} does not match score ${state.transition_risk_score}`,
    });
  }

  // Coexistence signal scores
  if (!isInUnitInterval(state.ambiguity_score)) {
    issues.push({
      code: L8RegimeObjectViolationCode.STATE_AMBIGUITY_SCORE_OUT_OF_RANGE,
      message: `ambiguity_score out of range: ${state.ambiguity_score}`,
    });
  }
  if (!isInUnitInterval(state.staleness_score)) {
    issues.push({
      code: L8RegimeObjectViolationCode.STATE_STALENESS_SCORE_OUT_OF_RANGE,
      message: `staleness_score out of range: ${state.staleness_score}`,
    });
  }
  if (!isInUnitInterval(state.degradation_score)) {
    issues.push({
      code: L8RegimeObjectViolationCode.STATE_DEGRADATION_SCORE_OUT_OF_RANGE,
      message: `degradation_score out of range: ${state.degradation_score}`,
    });
  }

  // Intra-family coexistence (only when primary+family are valid)
  if (
    familyRegistry.isRegistered(state.regime_family) &&
    classRegistry.isRegistered(state.primary_regime) &&
    (state.secondary_regime === null ||
      classRegistry.isRegistered(state.secondary_regime))
  ) {
    const coexReport = validateIntraFamilyCoexistence(
      {
        family: state.regime_family,
        primary: state.primary_regime,
        secondary: state.secondary_regime,
        coexistence_class: state.coexistence_class,
      },
      coexistenceRegistry,
      familyRegistry,
    );
    for (const i of coexReport.issues) {
      issues.push(i);
    }
  }

  // Ambiguity posture: if ambiguity_score is high and coexistence says
  // CLEAN_SINGLE, that's a laundering attempt.
  if (
    state.ambiguity_score >= 0.4 &&
    state.coexistence_class === L8RegimeCoexistenceClass.CLEAN_SINGLE
  ) {
    issues.push({
      code: L8RegimeObjectViolationCode.OUTPUT_MISSING_AMBIGUITY_POSTURE,
      message:
        `ambiguity_score=${state.ambiguity_score} but coexistence_class=CLEAN_SINGLE`,
    });
  }

  // Lineage / replay / run / policy / materialization
  if (
    !state.lineage_refs ||
    !state.lineage_refs.trace_id ||
    !state.lineage_refs.manifest_id
  ) {
    issues.push({
      code: L8RegimeObjectViolationCode.STATE_MISSING_LINEAGE,
      message: 'lineage_refs.trace_id and lineage_refs.manifest_id required',
    });
  }
  if (!state.replay_hash) {
    issues.push({
      code: L8RegimeObjectViolationCode.STATE_MISSING_REPLAY_HASH,
      message: 'replay_hash missing',
    });
  }
  if (!state.compute_run_id) {
    issues.push({
      code: L8RegimeObjectViolationCode.STATE_MISSING_COMPUTE_RUN_ID,
      message: 'compute_run_id missing',
    });
  }
  if (!state.policy_version) {
    issues.push({
      code: L8RegimeObjectViolationCode.STATE_MISSING_POLICY_VERSION,
      message: 'policy_version missing',
    });
  }
  if (!state.materialization_mode) {
    issues.push({
      code: L8RegimeObjectViolationCode.STATE_MISSING_MATERIALIZATION_MODE,
      message: 'materialization_mode missing',
    });
  }

  // Judgment / scenario / recommendation leak via naming
  if (
    containsL8ForbiddenNaming(state.description) ||
    containsL8ForbiddenNaming(state.created_by)
  ) {
    issues.push({
      code: L8RegimeObjectViolationCode.OUTPUT_JUDGMENT_LEAK,
      message:
        'regime state contains forbidden judgment/scenario/recommendation semantics',
    });
  }

  return { valid: issues.length === 0, issues };
}
