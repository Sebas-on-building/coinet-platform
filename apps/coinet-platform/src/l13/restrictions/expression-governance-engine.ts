/**
 * L13.5 — Expression Governance Engine
 *
 * §13.5.20 — Orchestrates the L13.5 sub-engines (confidence
 * ceiling, restriction composition, uncertainty disclosure,
 * contradiction disclosure, confidence phrasing) into the final
 * `L13ExpressionGovernanceEnvelope`. The envelope is the only
 * legal handoff from L13.5 to the L13.6 runtime.
 *
 * Run order (deterministic):
 *   1. restriction composition         (§13.5.19)
 *   2. confidence ceiling              (§13.5.15)
 *   3. uncertainty disclosure          (§13.5.16)
 *   4. contradiction disclosure        (§13.5.17)
 *   5. confidence phrasing             (§13.5.18)
 *   6. compose envelope                (§13.5.20)
 */

import type { L13AIInputPackage } from '../contracts/ai-input-package';
import type { L13AIExplanationOutput } from '../contracts/ai-output';
import type { L13ClaimGroundingResult } from '../contracts/claim-grounding';
import type { L13ContradictionMatch } from '../contracts/contradiction-match';
import { L13ContradictionDisclosureEffectClass } from '../contracts/contradiction-disclosure-profile';
import {
  L13ExpressionReadinessClass,
  isL13BlockingExpressionReadiness,
  type L13ExpressionGovernanceEnvelope,
} from '../contracts/expression-governance-envelope';
import {
  L13DisclosureReadinessClass,
  isL13DisclosureReadinessFailure,
  type L13UncertaintyDisclosureProfile,
} from '../contracts/uncertainty-disclosure-profile';
import type { L13ContradictionDisclosureProfile } from '../contracts/contradiction-disclosure-profile';
import type { L13ConfidencePhrasingProfile } from '../contracts/confidence-phrasing-profile';
import type { L13RestrictionCompositionProfile } from '../contracts/restriction-composition';
import { L13RestrictionLevel } from '../contracts/restriction-composition';
import { L13ExplanationConfidenceBand } from '../contracts/confidence-breakdown';
import { fnv1a } from '../context/_fnv1a';
import {
  deriveL13ConfidenceCeiling,
  type L13ConfidenceCeilingResult,
} from './confidence-ceiling-engine';
import { runL13UncertaintyDisclosureEngine } from './uncertainty-disclosure-engine';
import { runL13ContradictionDisclosureEngine } from './contradiction-disclosure-engine';
import { runL13ConfidencePhrasingEngine } from './confidence-phrasing-engine';
import { runL13RestrictionCompositionEngine } from './restriction-composition-engine';

const POLICY_V = 'l13.expression.v1';

export interface L13ExpressionGovernanceInput {
  readonly output: L13AIExplanationOutput;
  readonly input_package: L13AIInputPackage;
  readonly grounding_result: L13ClaimGroundingResult;
  readonly contradiction_matches: readonly L13ContradictionMatch[];
  readonly evidence_refs?: readonly string[];
  readonly lineage_refs?: readonly string[];
}

export interface L13ExpressionGovernanceResult {
  readonly envelope: L13ExpressionGovernanceEnvelope;
  readonly ceiling: L13ConfidenceCeilingResult;
  readonly restriction_composition: L13RestrictionCompositionProfile;
  readonly uncertainty_disclosure: L13UncertaintyDisclosureProfile;
  readonly contradiction_disclosure: L13ContradictionDisclosureProfile;
  readonly confidence_phrasing: L13ConfidencePhrasingProfile;
}

/**
 * §13.5.20 — Derive the final expression-readiness class from the
 * five sub-profiles.
 */
function l13DeriveExpressionReadiness(args: {
  readonly composed_level: L13RestrictionLevel;
  readonly ceiling: L13ExplanationConfidenceBand;
  readonly uncertainty: L13UncertaintyDisclosureProfile;
  readonly contradiction: L13ContradictionDisclosureProfile;
  readonly phrasing: L13ConfidencePhrasingProfile;
}): L13ExpressionReadinessClass {
  // Block-required short-circuits.
  if (
    args.composed_level === L13RestrictionLevel.BLOCKED ||
    args.ceiling === L13ExplanationConfidenceBand.BLOCKED ||
    args.phrasing.output_must_be_blocked
  ) {
    return L13ExpressionReadinessClass.EXPRESSION_BLOCKED;
  }
  if (
    args.contradiction.contradiction_effect_class ===
    L13ContradictionDisclosureEffectClass.BLOCKS_OUTPUT
  ) {
    return L13ExpressionReadinessClass.EXPRESSION_BLOCKED;
  }
  if (args.uncertainty.disclosure_readiness ===
    L13DisclosureReadinessClass.DISCLOSURE_BLOCKED
  ) {
    return L13ExpressionReadinessClass.EXPRESSION_BLOCKED;
  }
  if (args.phrasing.output_must_be_rewritten) {
    return L13ExpressionReadinessClass.EXPRESSION_REWRITE_REQUIRED;
  }
  if (
    isL13DisclosureReadinessFailure(
      args.uncertainty.disclosure_readiness,
    )
  ) {
    return L13ExpressionReadinessClass.EXPRESSION_REWRITE_REQUIRED;
  }
  if (
    args.contradiction.contradiction_effect_class ===
    L13ContradictionDisclosureEffectClass.BLOCKS_CLEAN_OUTPUT
  ) {
    return L13ExpressionReadinessClass.EXPRESSION_REWRITE_REQUIRED;
  }
  // Restriction-driven narrowing.
  if (
    args.composed_level === L13RestrictionLevel.EVIDENCE_ONLY ||
    args.composed_level === L13RestrictionLevel.NARROWED
  ) {
    return L13ExpressionReadinessClass.EXPRESSION_NARROWED_BY_RESTRICTION;
  }
  // Uncertainty-driven narrowing.
  if (
    args.uncertainty.required_disclosure_phrases.length > 0 ||
    args.contradiction.contradiction_effect_class !==
      L13ContradictionDisclosureEffectClass.NO_CONTRADICTION
  ) {
    if (
      args.uncertainty.disclosure_readiness ===
      L13DisclosureReadinessClass.DISCLOSURE_REQUIRED_PRESENT
    ) {
      return L13ExpressionReadinessClass.EXPRESSION_CLEAN_WITH_DISCLOSURE;
    }
    return L13ExpressionReadinessClass.EXPRESSION_NARROWED_BY_UNCERTAINTY;
  }
  return L13ExpressionReadinessClass.EXPRESSION_CLEAN;
}

/**
 * §13.5.20 — Run the full expression-governance pipeline and
 * produce the envelope plus the five sub-profiles for downstream
 * audit and replay.
 */
export function runL13ExpressionGovernance(
  input: L13ExpressionGovernanceInput,
): L13ExpressionGovernanceResult {
  const {
    output,
    input_package,
    grounding_result,
    contradiction_matches,
  } = input;
  const evidence_refs = input.evidence_refs ?? [];
  const lineage_refs = input.lineage_refs ?? [];

  // 1. Restriction composition.
  const restriction = runL13RestrictionCompositionEngine({
    output_id: output.output_id,
    input_package,
    grounding_result,
    evidence_refs,
    lineage_refs,
  });

  // 2. Confidence ceiling — pass composed restriction level so
  //    BLOCKED collapsing applies.
  const ceiling = deriveL13ConfidenceCeiling({
    input_package,
    grounding_result,
    composed_restriction_level:
      restriction.composed_restriction_level,
  });

  // 3. Uncertainty disclosure.
  const uncertainty = runL13UncertaintyDisclosureEngine({
    output,
    input_package,
    grounding_result,
    ceiling,
    evidence_refs,
    lineage_refs,
  });

  // 4. Contradiction disclosure.
  const contradiction = runL13ContradictionDisclosureEngine({
    output,
    input_package,
    grounding_result,
    contradiction_matches,
    evidence_refs,
    lineage_refs,
  });

  // 5. Confidence phrasing.
  const phrasing = runL13ConfidencePhrasingEngine({
    output,
    confidence_ceiling: ceiling.confidence_ceiling,
    composed_restriction_level:
      restriction.composed_restriction_level,
    confidence_disclosure_present:
      !!output.confidence_disclosure &&
      (output.confidence_disclosure.confidence_statement?.length ?? 0) > 0,
    required_confidence_disclosure:
      uncertainty.required_disclosure_phrases.length > 0,
    evidence_refs,
    lineage_refs,
  });

  // 6. Compose envelope.
  const readiness = l13DeriveExpressionReadiness({
    composed_level: restriction.composed_restriction_level,
    ceiling: ceiling.confidence_ceiling,
    uncertainty,
    contradiction,
    phrasing,
  });
  const blocking = isL13BlockingExpressionReadiness(readiness);
  const blockRequired =
    readiness === L13ExpressionReadinessClass.EXPRESSION_BLOCKED;
  const refusalRequired =
    readiness === L13ExpressionReadinessClass.EXPRESSION_REFUSAL_REQUIRED;
  const rewriteRequired =
    readiness === L13ExpressionReadinessClass.EXPRESSION_REWRITE_REQUIRED;
  const outputAllowed = !blocking;

  const replayMaterial = [
    output.output_id,
    input_package.input_package_id,
    grounding_result.grounding_result_id,
    uncertainty.uncertainty_profile_id,
    contradiction.contradiction_disclosure_id,
    phrasing.phrasing_profile_id,
    restriction.restriction_composition_id,
    ceiling.confidence_ceiling,
    phrasing.allowed_phrase_strength_classes.join(','),
    readiness,
    String(outputAllowed),
    String(rewriteRequired),
    String(refusalRequired),
    String(blockRequired),
    POLICY_V,
  ].join('|');
  const replayHash = fnv1a(replayMaterial);

  const envelope: L13ExpressionGovernanceEnvelope = {
    expression_governance_id: `l13.expression.${replayHash}`,
    output_id: output.output_id,
    input_package_id: input_package.input_package_id,
    grounded_output_ref: grounding_result.grounding_result_id,
    uncertainty_disclosure_profile_ref:
      uncertainty.uncertainty_profile_id,
    contradiction_disclosure_profile_ref:
      contradiction.contradiction_disclosure_id,
    confidence_phrasing_profile_ref: phrasing.phrasing_profile_id,
    restriction_composition_profile_ref:
      restriction.restriction_composition_id,
    final_confidence_ceiling: ceiling.confidence_ceiling,
    final_allowed_phrase_strength_classes:
      phrasing.allowed_phrase_strength_classes,
    final_expression_readiness: readiness,
    output_allowed: outputAllowed,
    rewrite_required: rewriteRequired,
    refusal_required: refusalRequired,
    block_required: blockRequired,
    evidence_refs,
    lineage_refs,
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };

  return {
    envelope,
    ceiling,
    restriction_composition: restriction,
    uncertainty_disclosure: uncertainty,
    contradiction_disclosure: contradiction,
    confidence_phrasing: phrasing,
  };
}
