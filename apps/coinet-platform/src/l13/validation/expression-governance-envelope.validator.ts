/**
 * L13.5 — Expression Governance Envelope Validator
 *
 * §13.5.23 — Validates the final
 * `L13ExpressionGovernanceEnvelope`. The validator cross-checks
 * the envelope against the underlying sub-profiles passed in so it
 * can catch ref mismatch and flag inconsistencies.
 */

import type { L13ExpressionGovernanceEnvelope } from '../contracts/expression-governance-envelope';
import { L13ExpressionReadinessClass } from '../contracts/expression-governance-envelope';
import { L13ExplanationConfidenceBand } from '../contracts/confidence-breakdown';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13PhraseStrengthClass } from '../contracts/phrase-strength';
import type { L13UncertaintyDisclosureProfile } from '../contracts/uncertainty-disclosure-profile';
import type { L13ContradictionDisclosureProfile } from '../contracts/contradiction-disclosure-profile';
import type { L13ConfidencePhrasingProfile } from '../contracts/confidence-phrasing-profile';
import type { L13RestrictionCompositionProfile } from '../contracts/restriction-composition';
import { L13ExpressionViolationCode } from './l13-expression-violation-codes';
import {
  l13ExpressionResult,
  type L13ExpressionIssue,
  type L13ExpressionValidationResult,
} from './_l13-expression-issue';

const SEV = L13ViolationSeverity;

export interface L13EnvelopeValidationContext {
  readonly uncertainty: L13UncertaintyDisclosureProfile;
  readonly contradiction: L13ContradictionDisclosureProfile;
  readonly phrasing: L13ConfidencePhrasingProfile;
  readonly restriction: L13RestrictionCompositionProfile;
}

export function validateL13ExpressionGovernanceEnvelope(
  envelope: L13ExpressionGovernanceEnvelope,
  ctx: L13EnvelopeValidationContext,
): L13ExpressionValidationResult {
  const issues: L13ExpressionIssue[] = [];

  // Identity / replay.
  if (!envelope.expression_governance_id) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_EXPRESSION_READINESS_ILLEGAL,
      severity: SEV.CRITICAL,
      message: 'expression_governance_id missing',
    });
  }
  if (!envelope.replay_hash) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'replay_hash missing',
    });
  }
  if (envelope.lineage_refs.length === 0) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_LINEAGE_MISSING,
      severity: SEV.ERROR,
      message: 'lineage_refs empty',
    });
  }

  // Ref consistency.
  if (
    envelope.uncertainty_disclosure_profile_ref !==
    ctx.uncertainty.uncertainty_profile_id
  ) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_ENVELOPE_REF_MISMATCH,
      severity: SEV.CRITICAL,
      message: 'uncertainty_disclosure_profile_ref does not match',
    });
  }
  if (
    envelope.contradiction_disclosure_profile_ref !==
    ctx.contradiction.contradiction_disclosure_id
  ) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_ENVELOPE_REF_MISMATCH,
      severity: SEV.CRITICAL,
      message: 'contradiction_disclosure_profile_ref does not match',
    });
  }
  if (
    envelope.confidence_phrasing_profile_ref !==
    ctx.phrasing.phrasing_profile_id
  ) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_ENVELOPE_REF_MISMATCH,
      severity: SEV.CRITICAL,
      message: 'confidence_phrasing_profile_ref does not match',
    });
  }
  if (
    envelope.restriction_composition_profile_ref !==
    ctx.restriction.restriction_composition_id
  ) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_ENVELOPE_REF_MISMATCH,
      severity: SEV.CRITICAL,
      message: 'restriction_composition_profile_ref does not match',
    });
  }

  // Ceiling must match phrasing profile.
  if (
    envelope.final_confidence_ceiling !== ctx.phrasing.confidence_ceiling
  ) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_CONFIDENCE_CEILING_MISSING,
      severity: SEV.CRITICAL,
      message:
        'final_confidence_ceiling differs from confidence_phrasing.confidence_ceiling',
    });
  }

  // BLOCKED ceiling + output_allowed=true is illegal.
  if (
    envelope.final_confidence_ceiling ===
      L13ExplanationConfidenceBand.BLOCKED &&
    envelope.output_allowed
  ) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_BLOCK_REQUIRED_BUT_OUTPUT_ALLOWED,
      severity: SEV.CRITICAL,
      message:
        'final_confidence_ceiling=BLOCKED but output_allowed=true',
    });
  }

  // FORBIDDEN_CERTAINTY must not be in final allowed set.
  if (
    envelope.final_allowed_phrase_strength_classes.includes(
      L13PhraseStrengthClass.FORBIDDEN_CERTAINTY,
    )
  ) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_ALLOWED_PHRASE_STRENGTH_EXCEEDS_RESTRICTION,
      severity: SEV.CRITICAL,
      message:
        'FORBIDDEN_CERTAINTY appears in final_allowed_phrase_strength_classes',
    });
  }

  // Readiness/flag consistency.
  switch (envelope.final_expression_readiness) {
    case L13ExpressionReadinessClass.EXPRESSION_BLOCKED:
      if (envelope.output_allowed || !envelope.block_required) {
        issues.push({
          code: L13ExpressionViolationCode.L13U_BLOCK_REQUIRED_BUT_OUTPUT_ALLOWED,
          severity: SEV.CRITICAL,
          message:
            'EXPRESSION_BLOCKED but flags inconsistent (output_allowed or block_required)',
        });
      }
      break;
    case L13ExpressionReadinessClass.EXPRESSION_REWRITE_REQUIRED:
      if (!envelope.rewrite_required) {
        issues.push({
          code: L13ExpressionViolationCode.L13U_REWRITE_REQUIRED_BUT_NOT_MARKED,
          severity: SEV.CRITICAL,
          message:
            'EXPRESSION_REWRITE_REQUIRED but rewrite_required=false',
        });
      }
      break;
    case L13ExpressionReadinessClass.EXPRESSION_REFUSAL_REQUIRED:
      if (!envelope.refusal_required) {
        issues.push({
          code: L13ExpressionViolationCode.L13U_REFUSAL_REQUIRED_BUT_NOT_MARKED,
          severity: SEV.CRITICAL,
          message:
            'EXPRESSION_REFUSAL_REQUIRED but refusal_required=false',
        });
      }
      break;
    case L13ExpressionReadinessClass.EXPRESSION_CLEAN:
    case L13ExpressionReadinessClass.EXPRESSION_CLEAN_WITH_DISCLOSURE:
    case L13ExpressionReadinessClass.EXPRESSION_NARROWED_BY_UNCERTAINTY:
    case L13ExpressionReadinessClass.EXPRESSION_NARROWED_BY_RESTRICTION:
      if (
        envelope.block_required ||
        envelope.rewrite_required ||
        envelope.refusal_required ||
        !envelope.output_allowed
      ) {
        issues.push({
          code: L13ExpressionViolationCode.L13U_EXPRESSION_READINESS_ILLEGAL,
          severity: SEV.CRITICAL,
          message:
            'clean/narrowed readiness inconsistent with rewrite/refusal/block flags',
        });
      }
      break;
    default:
      break;
  }

  return l13ExpressionResult(issues);
}
