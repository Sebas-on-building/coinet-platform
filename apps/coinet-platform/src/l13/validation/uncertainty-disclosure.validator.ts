/**
 * L13.5 — Uncertainty Disclosure Validator
 *
 * §13.5.23 — Validates the `L13UncertaintyDisclosureProfile`.
 * Returns structured issues and never mutates the profile.
 */

import {
  L13DisclosureReadinessClass,
  type L13UncertaintyDisclosureProfile,
} from '../contracts/uncertainty-disclosure-profile';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13RequiredDisclosurePhraseCode } from '../contracts/required-disclosure-phrase';
import { L13ExpressionViolationCode } from './l13-expression-violation-codes';
import {
  l13ExpressionResult,
  type L13ExpressionIssue,
  type L13ExpressionValidationResult,
} from './_l13-expression-issue';

const SEV = L13ViolationSeverity;

export function validateL13UncertaintyDisclosureProfile(
  profile: L13UncertaintyDisclosureProfile,
): L13ExpressionValidationResult {
  const issues: L13ExpressionIssue[] = [];

  if (!profile.uncertainty_profile_id) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_UNCERTAINTY_PROFILE_MISSING,
      severity: SEV.CRITICAL,
      message: 'uncertainty_profile_id missing',
    });
  }
  if (!profile.confidence_ceiling) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_CONFIDENCE_CEILING_MISSING,
      severity: SEV.CRITICAL,
      message: 'confidence_ceiling missing',
    });
  }
  if (!profile.replay_hash) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'replay_hash missing',
    });
  }
  if (profile.lineage_refs.length === 0) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_LINEAGE_MISSING,
      severity: SEV.ERROR,
      message: 'lineage_refs empty',
    });
  }

  // Mandatory disclosure checks — booleans must imply required
  // phrase codes and section refs.
  if (profile.must_mention_contradiction) {
    if (
      !profile.required_disclosure_phrases.includes(
        L13RequiredDisclosurePhraseCode.CONTRADICTION_REMAINS_ACTIVE,
      )
    ) {
      issues.push({
        code: L13ExpressionViolationCode.L13U_CONTRADICTION_DISCLOSURE_MISSING,
        severity: SEV.CRITICAL,
        message:
          'must_mention_contradiction=true but CONTRADICTION_REMAINS_ACTIVE phrase missing',
      });
    }
  }
  if (profile.must_mention_invalidation) {
    if (
      !profile.required_disclosure_phrases.includes(
        L13RequiredDisclosurePhraseCode.ACTIVE_INVALIDATION_LIMITS_CONFIDENCE,
      )
    ) {
      issues.push({
        code: L13ExpressionViolationCode.L13U_ACTIVE_INVALIDATION_NOT_DISCLOSED,
        severity: SEV.CRITICAL,
        message:
          'must_mention_invalidation=true but ACTIVE_INVALIDATION_LIMITS_CONFIDENCE phrase missing',
      });
    }
  }
  if (profile.must_mention_unresolved_trigger) {
    if (
      !profile.required_disclosure_phrases.includes(
        L13RequiredDisclosurePhraseCode.TRIGGERS_REMAIN_UNRESOLVED,
      )
    ) {
      issues.push({
        code: L13ExpressionViolationCode.L13U_UNRESOLVED_TRIGGER_NOT_DISCLOSED,
        severity: SEV.CRITICAL,
        message:
          'must_mention_unresolved_trigger=true but TRIGGERS_REMAIN_UNRESOLVED phrase missing',
      });
    }
  }
  if (profile.must_mention_missing_data) {
    if (
      !profile.required_disclosure_phrases.includes(
        L13RequiredDisclosurePhraseCode.MISSING_VISIBILITY_NARROWS_ANSWER,
      )
    ) {
      issues.push({
        code: L13ExpressionViolationCode.L13U_MISSING_DATA_NOT_DISCLOSED,
        severity: SEV.CRITICAL,
        message:
          'must_mention_missing_data=true but MISSING_VISIBILITY_NARROWS_ANSWER phrase missing',
      });
    }
  }
  if (profile.must_mention_drift) {
    if (
      !profile.required_disclosure_phrases.includes(
        L13RequiredDisclosurePhraseCode.DRIFT_LIMITS_SCORE_CONTEXT,
      )
    ) {
      issues.push({
        code: L13ExpressionViolationCode.L13U_DRIFT_NOT_DISCLOSED,
        severity: SEV.CRITICAL,
        message:
          'must_mention_drift=true but DRIFT_LIMITS_SCORE_CONTEXT phrase missing',
      });
    }
  }
  if (profile.must_mention_narrow_scenario_spread) {
    if (
      !profile.required_disclosure_phrases.includes(
        L13RequiredDisclosurePhraseCode.SCENARIO_COMPETITION_REMAINS_OPEN,
      )
    ) {
      issues.push({
        code: L13ExpressionViolationCode.L13U_SCENARIO_SPREAD_NOT_DISCLOSED,
        severity: SEV.ERROR,
        message:
          'must_mention_narrow_scenario_spread=true but SCENARIO_COMPETITION_REMAINS_OPEN phrase missing',
      });
    }
  }
  if (profile.must_mention_narrow_hypothesis_spread) {
    if (
      !profile.required_disclosure_phrases.includes(
        L13RequiredDisclosurePhraseCode.HYPOTHESIS_COMPETITION_REMAINS_OPEN,
      )
    ) {
      issues.push({
        code: L13ExpressionViolationCode.L13U_HYPOTHESIS_SPREAD_NOT_DISCLOSED,
        severity: SEV.ERROR,
        message:
          'must_mention_narrow_hypothesis_spread=true but HYPOTHESIS_COMPETITION_REMAINS_OPEN phrase missing',
      });
    }
  }
  if (profile.must_mention_transition_risk) {
    if (
      !profile.required_disclosure_phrases.includes(
        L13RequiredDisclosurePhraseCode.REGIME_TRANSITION_RISK_NARROWS_INTERPRETATION,
      )
    ) {
      issues.push({
        code: L13ExpressionViolationCode.L13U_TRANSITION_RISK_NOT_DISCLOSED,
        severity: SEV.ERROR,
        message:
          'must_mention_transition_risk=true but REGIME_TRANSITION_RISK_NARROWS_INTERPRETATION phrase missing',
      });
    }
  }
  if (profile.must_mention_sequence_ambiguity) {
    if (
      !profile.required_disclosure_phrases.includes(
        L13RequiredDisclosurePhraseCode.SEQUENCE_AMBIGUITY_NARROWS_INTERPRETATION,
      )
    ) {
      issues.push({
        code: L13ExpressionViolationCode.L13U_SEQUENCE_AMBIGUITY_NOT_DISCLOSED,
        severity: SEV.ERROR,
        message:
          'must_mention_sequence_ambiguity=true but SEQUENCE_AMBIGUITY_NARROWS_INTERPRETATION phrase missing',
      });
    }
  }

  // Disclosure readiness must match required-vs-satisfied state.
  if (
    profile.required_disclosure_phrases.length > 0 &&
    profile.disclosure_readiness ===
      L13DisclosureReadinessClass.DISCLOSURE_CLEAN
  ) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_EXPRESSION_READINESS_ILLEGAL,
      severity: SEV.CRITICAL,
      message:
        'disclosure_readiness=DISCLOSURE_CLEAN illegal when required_disclosure_phrases non-empty',
    });
  }

  return l13ExpressionResult(issues);
}
