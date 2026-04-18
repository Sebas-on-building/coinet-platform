/**
 * L7.6 — Claim Restriction Engine
 *
 * §7.6.5 — Translates a (primary class, modifiers, contradiction
 * posture, reliability band) tuple into a governed set of
 * L7.6 reliability rights + reason codes + posture flags.
 *
 * §7.6.5.5 illustrative law is the basis for the deterministic
 * derivation table here. All decisions are explainable: the result
 * carries reason codes and the posture flags map onto L7.2 runtime
 * restriction rights via `L7_RELIABILITY_RIGHT_TO_RUNTIME_RIGHT`.
 */

import {
  L7ReliabilityRight,
  L7ReliabilityRightDerivationInput,
  L7ReliabilityRightDerivationResult,
} from '../contracts/claim-restriction.policy';
import { L7RestrictionReasonCode } from '../contracts/claim-restriction-profile';
import { L7PrimaryValidationClass } from '../contracts/validation-class.policy';
import { L7ValidationModifierCode } from '../contracts/validation-modifier.policy';
import { L7ContradictionSeverity, compareSeverity } from '../contracts/contradiction-bundle';
import { L7ReliabilityBand } from '../contracts/confidence-band';
import {
  L7ReliabilityRightRegistry,
  getDefaultReliabilityRightRegistry,
} from '../registry/reliability-right.registry';

export class L7ClaimRestrictionEngine {
  constructor(
    private readonly registry: L7ReliabilityRightRegistry = getDefaultReliabilityRightRegistry(),
  ) {}

  derive(
    input: L7ReliabilityRightDerivationInput,
  ): L7ReliabilityRightDerivationResult {
    const reasons = new Set<L7RestrictionReasonCode>();
    const blocked_from_score_driving = computeBlockedFromScoreDriving(input);
    const evidence_only_mode = computeEvidenceOnly(input, blocked_from_score_driving);
    const requires_contradiction_disclosure = computeRequiresDisclosure(input);
    const requires_additional_confirmation =
      computeRequiresAdditionalConfirmation(input);

    const rights = new Set<L7ReliabilityRight>();

    // §7.6.5.5 — illustrative law in deterministic form.
    if (
      input.primary_class === L7PrimaryValidationClass.CONFIRMED &&
      input.reliability_band === L7ReliabilityBand.HIGH &&
      compareSeverity(input.contradiction_severity, L7ContradictionSeverity.MATERIAL) < 0 &&
      !blocked_from_score_driving &&
      !evidence_only_mode
    ) {
      rights.add(L7ReliabilityRight.FINAL_JUDGMENT_ALLOWED);
      rights.add(L7ReliabilityRight.DETERMINISTIC_SCORING_ALLOWED);
      rights.add(L7ReliabilityRight.SCENARIO_WEIGHTING_ALLOWED);
      reasons.add(L7RestrictionReasonCode.CONFIRMED_NO_RISK);
    } else if (
      input.primary_class === L7PrimaryValidationClass.WEAKLY_CONFIRMED &&
      input.reliability_band === L7ReliabilityBand.MEDIUM &&
      !blocked_from_score_driving &&
      !evidence_only_mode
    ) {
      rights.add(L7ReliabilityRight.SCENARIO_WEIGHTING_ALLOWED);
      reasons.add(L7RestrictionReasonCode.WEAK_SUPPORT);
    } else if (
      input.primary_class === L7PrimaryValidationClass.CONFLICTING &&
      !blocked_from_score_driving &&
      !evidence_only_mode &&
      input.reliability_band !== L7ReliabilityBand.UNRESOLVED
    ) {
      rights.add(L7ReliabilityRight.REGIME_INPUT_ONLY);
      reasons.add(L7RestrictionReasonCode.UNRESOLVED_CONTRADICTION);
    }

    if (
      input.primary_class === L7PrimaryValidationClass.STALE ||
      input.staleness_material
    ) {
      reasons.add(L7RestrictionReasonCode.STALE_SUPPORT);
    }
    if (
      input.primary_class === L7PrimaryValidationClass.INSUFFICIENT_EVIDENCE ||
      input.incompleteness_material
    ) {
      reasons.add(L7RestrictionReasonCode.MISSING_REQUIRED_SUPPORT);
    }
    if (input.primary_class === L7PrimaryValidationClass.DEGRADED_DUE_TO_MISSING_SOURCE) {
      reasons.add(L7RestrictionReasonCode.DEGRADED_SOURCE);
    }
    if (input.modifiers.includes(L7ValidationModifierCode.AMBIGUOUS) || input.ambiguity_material) {
      reasons.add(L7RestrictionReasonCode.AMBIGUOUS_DIRECTION);
    }
    if (input.modifiers.includes(L7ValidationModifierCode.CHALLENGED_BY_RISK_OVERHANG)) {
      reasons.add(L7RestrictionReasonCode.MATERIAL_RISK_OVERHANG);
    }
    if (input.modifiers.includes(L7ValidationModifierCode.REGIME_MISMATCH)) {
      reasons.add(L7RestrictionReasonCode.REGIME_INCOMPATIBILITY);
    }
    if (input.degradation_material) {
      reasons.add(L7RestrictionReasonCode.DEGRADED_SOURCE);
    }

    if (requires_contradiction_disclosure) {
      rights.add(L7ReliabilityRight.REQUIRES_CONTRADICTION_DISCLOSURE);
    }
    if (requires_additional_confirmation) {
      rights.add(L7ReliabilityRight.REQUIRES_ADDITIONAL_CONFIRMATION);
    }
    if (evidence_only_mode) {
      rights.add(L7ReliabilityRight.EVIDENCE_ONLY);
      reasons.add(L7RestrictionReasonCode.EVIDENCE_ONLY_REQUIRED);
      // EVIDENCE_ONLY conflicts with score-driving rights.
      rights.delete(L7ReliabilityRight.SCENARIO_WEIGHTING_ALLOWED);
      rights.delete(L7ReliabilityRight.DETERMINISTIC_SCORING_ALLOWED);
      rights.delete(L7ReliabilityRight.FINAL_JUDGMENT_ALLOWED);
    }
    if (blocked_from_score_driving) {
      rights.add(L7ReliabilityRight.BLOCKED_FROM_SCORE_DRIVING);
      rights.delete(L7ReliabilityRight.SCENARIO_WEIGHTING_ALLOWED);
      rights.delete(L7ReliabilityRight.DETERMINISTIC_SCORING_ALLOWED);
      rights.delete(L7ReliabilityRight.FINAL_JUDGMENT_ALLOWED);
      // Regime input is still allowed when not totally undetermined.
    }

    // §7.6.5.6 — band-floor enforcement: every emitted right must
    // satisfy `requiresMinBand`.
    for (const r of [...rights]) {
      if (
        compareBand(input.reliability_band, this.registry.requiresMinBand(r)) < 0
      ) {
        rights.delete(r);
      }
    }

    if (rights.size === 0) {
      reasons.add(L7RestrictionReasonCode.WEAK_SUPPORT);
      rights.add(L7ReliabilityRight.EVIDENCE_ONLY);
      reasons.add(L7RestrictionReasonCode.EVIDENCE_ONLY_REQUIRED);
    }

    // Materiality tightener: HIGH materiality demands an additional
    // confirmation gate when reliance is below MEDIUM.
    if (
      input.materiality_class === 'HIGH' &&
      compareBand(input.reliability_band, L7ReliabilityBand.MEDIUM) < 0
    ) {
      rights.add(L7ReliabilityRight.REQUIRES_ADDITIONAL_CONFIRMATION);
      rights.delete(L7ReliabilityRight.FINAL_JUDGMENT_ALLOWED);
    }

    return {
      subject_id: input.subject_id,
      rights: [...rights].sort() as readonly L7ReliabilityRight[],
      reasons: [...reasons].sort() as readonly L7RestrictionReasonCode[],
      requires_contradiction_disclosure,
      requires_additional_confirmation,
      evidence_only_mode,
      blocked_from_score_driving,
    };
  }
}

function computeBlockedFromScoreDriving(
  input: L7ReliabilityRightDerivationInput,
): boolean {
  if (input.primary_class === L7PrimaryValidationClass.DEGRADED_DUE_TO_MISSING_SOURCE) return true;
  if (
    input.primary_class === L7PrimaryValidationClass.INSUFFICIENT_EVIDENCE &&
    input.reliability_band === L7ReliabilityBand.UNRESOLVED
  ) {
    return true;
  }
  if (input.contradiction_severity === L7ContradictionSeverity.BLOCKING) return true;
  return false;
}

function computeEvidenceOnly(
  input: L7ReliabilityRightDerivationInput,
  blocked: boolean,
): boolean {
  if (input.primary_class === L7PrimaryValidationClass.STALE) return true;
  if (
    input.primary_class === L7PrimaryValidationClass.CONFLICTING &&
    input.reliability_band === L7ReliabilityBand.LOW
  ) {
    return true;
  }
  if (blocked && input.reliability_band !== L7ReliabilityBand.UNRESOLVED) return true;
  return false;
}

function computeRequiresDisclosure(
  input: L7ReliabilityRightDerivationInput,
): boolean {
  if (
    compareSeverity(input.contradiction_severity, L7ContradictionSeverity.MATERIAL) >= 0
  ) {
    return true;
  }
  if (input.unresolved_overhang) return true;
  if (input.modifiers.includes(L7ValidationModifierCode.CHALLENGED_BY_RISK_OVERHANG)) return true;
  return false;
}

function computeRequiresAdditionalConfirmation(
  input: L7ReliabilityRightDerivationInput,
): boolean {
  if (input.primary_class === L7PrimaryValidationClass.WEAKLY_CONFIRMED) return true;
  if (input.primary_class === L7PrimaryValidationClass.INSUFFICIENT_EVIDENCE) return true;
  if (
    input.modifiers.includes(L7ValidationModifierCode.INCOMPLETE) ||
    input.modifiers.includes(L7ValidationModifierCode.MISSING_CONFIRMATION_SURFACE) ||
    input.modifiers.includes(L7ValidationModifierCode.LOW_SAMPLE_QUALITY)
  ) {
    return true;
  }
  return false;
}

const BAND_RANK: Record<L7ReliabilityBand, number> = {
  [L7ReliabilityBand.HIGH]: 3,
  [L7ReliabilityBand.MEDIUM]: 2,
  [L7ReliabilityBand.LOW]: 1,
  [L7ReliabilityBand.UNRESOLVED]: 0,
};

function compareBand(a: L7ReliabilityBand, b: L7ReliabilityBand): number {
  return BAND_RANK[a] - BAND_RANK[b];
}
