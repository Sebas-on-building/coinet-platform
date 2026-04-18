/**
 * L7.6 — Constitutional Invariants
 *
 * §7.6.9.1 — These invariants must be executable and test-covered.
 *
 *   INV-7.6-A  confidence is a separate object from validation class,
 *              contradiction bundle, and restriction profile
 *   INV-7.6-B  every confidence assessment includes complete factor
 *              derivation, band, cap chain, and contradiction-penalty
 *              chain
 *   INV-7.6-C  confidence may not outrun contradiction, staleness,
 *              incompleteness, ambiguity, or degradation law
 *   INV-7.6-D  local regime compatibility may influence confidence but
 *              may not act as final regime classification
 *   INV-7.6-E  every restriction profile explicitly bounds downstream
 *              use rights
 *   INV-7.6-F  no validation result may receive broader downstream
 *              rights than its class, modifiers, confidence, and
 *              contradiction posture justify
 *   INV-7.6-G  replay and repair preserve confidence and restriction
 *              lineage
 */

import {
  L7ValidationConfidenceDecision,
  L7ConfidenceFactorBreakdown,
  L7ConfidenceCapChain,
  L7ContradictionPenaltyChain,
} from '../contracts/validation-confidence.policy';
import {
  L7ConfidenceFactorGroup,
  L7_CONFIDENCE_FACTOR_DESCRIPTORS,
  L7_FACTOR_GROUP_MAX_LEGAL_WEIGHT,
} from '../contracts/confidence-factor';
import {
  reliabilityBandForScore100,
  L7ReliabilityBand,
} from '../contracts/confidence-band';
import {
  L7ReliabilityRight,
  L7ReliabilityRightDerivationInput,
  L7ReliabilityRightDerivationResult,
} from '../contracts/claim-restriction.policy';
import { L7ContradictionSeverity, compareSeverity } from '../contracts/contradiction-bundle';
import { L7PrimaryValidationClass } from '../contracts/validation-class.policy';
import { L7LocalRegimeResult } from '../contracts/local-regime-compatibility';
import {
  L7ConfidenceScoringMaterialState,
  L7ValidationConfidenceScoringValidator,
} from '../validation/validation-confidence-scoring.validator';
import {
  L7CapChainValidationContext,
  L7ConfidenceCapChainValidator,
} from '../validation/confidence-cap-chain.validator';
import { L7ClaimRestrictionValidator } from '../validation/l7_6-claim-restriction.validator';
import {
  L7LocalRegimeValidationContext,
  L7LocalRegimeCompatibilityValidator,
} from '../validation/local-regime-compatibility.validator';

export interface L7_6InvariantResult {
  readonly invariant:
    | 'INV-7.6-A'
    | 'INV-7.6-B'
    | 'INV-7.6-C'
    | 'INV-7.6-D'
    | 'INV-7.6-E'
    | 'INV-7.6-F'
    | 'INV-7.6-G';
  readonly satisfied: boolean;
  readonly evidence: readonly string[];
}

/**
 * Minimal "view" of a fully-resolved L7.6 result. Tests construct one
 * for each scenario instead of having to wire the entire L7.4 pipeline.
 */
export interface L7_6ValidationResultView {
  readonly subject_id: string;
  readonly classification_object_id: string;
  readonly contradiction_bundle_id: string;
  readonly confidence: L7ValidationConfidenceDecision;
  readonly restriction: L7ReliabilityRightDerivationResult;
  readonly restriction_input: L7ReliabilityRightDerivationInput;
  readonly material_state: L7ConfidenceScoringMaterialState;
  readonly cap_triggers: L7CapChainValidationContext['active_triggers'];
  readonly local_regime_result?: L7LocalRegimeResult;
  readonly local_regime_context?: L7LocalRegimeValidationContext;
}

/**
 * INV-7.6-A — Confidence object is distinct from class/bundle/restriction.
 * Verified by checking that the IDs and references inside `confidence`
 * are not the same primary keys used by the classification object,
 * contradiction bundle, or restriction profile.
 */
export function checkInvariantA_confidenceIsSeparateObject(
  views: readonly L7_6ValidationResultView[],
): L7_6InvariantResult {
  const evidence: string[] = [];
  for (const v of views) {
    const c = v.confidence;
    if (c.confidence_assessment_id === v.classification_object_id) {
      evidence.push(
        `subject ${v.subject_id}: confidence_assessment_id collides with classification_object_id`,
      );
    }
    if (c.confidence_assessment_id === v.contradiction_bundle_id) {
      evidence.push(
        `subject ${v.subject_id}: confidence_assessment_id collides with contradiction_bundle_id`,
      );
    }
    if (
      c.restriction_profile_ref !== null &&
      c.restriction_profile_ref === c.confidence_assessment_id
    ) {
      evidence.push(
        `subject ${v.subject_id}: restriction_profile_ref collides with confidence_assessment_id`,
      );
    }
  }
  return {
    invariant: 'INV-7.6-A',
    satisfied: evidence.length === 0,
    evidence,
  };
}

/**
 * INV-7.6-B — Every confidence assessment includes a complete factor
 * derivation, band, cap chain, and contradiction-penalty chain.
 */
export function checkInvariantB_completeStructure(
  views: readonly L7_6ValidationResultView[],
): L7_6InvariantResult {
  const evidence: string[] = [];
  for (const v of views) {
    const c = v.confidence;
    if (!hasCompleteFactorBreakdown(c.factor_breakdown)) {
      evidence.push(`subject ${v.subject_id}: factor breakdown incomplete`);
    }
    if (!c.reliability_band) {
      evidence.push(`subject ${v.subject_id}: reliability band missing`);
    }
    if (!hasCapChain(c.cap_chain)) {
      evidence.push(`subject ${v.subject_id}: cap chain missing or empty`);
    }
    if (!hasPenaltyChain(c.contradiction_penalty_chain)) {
      evidence.push(`subject ${v.subject_id}: penalty chain missing or empty`);
    }
    const expected = reliabilityBandForScore100(
      c.capped_score_100,
      c.policy_version.band_thresholds,
    );
    if (expected !== c.reliability_band) {
      evidence.push(
        `subject ${v.subject_id}: band ${c.reliability_band} does not match score ${c.capped_score_100} (expected ${expected})`,
      );
    }
  }
  return {
    invariant: 'INV-7.6-B',
    satisfied: evidence.length === 0,
    evidence,
  };
}

/**
 * INV-7.6-C — Confidence may not outrun contradiction, staleness,
 * incompleteness, ambiguity, or degradation law.
 *
 * Implemented by running the scoring + cap-chain validators and
 * declaring failure when their CAP, CLEAN_CONFIDENCE, or PENALTY codes
 * fire.
 */
export function checkInvariantC_doesNotOutrunLaw(
  views: readonly L7_6ValidationResultView[],
  scoringValidator: L7ValidationConfidenceScoringValidator = new L7ValidationConfidenceScoringValidator(),
  capValidator: L7ConfidenceCapChainValidator = new L7ConfidenceCapChainValidator(),
): L7_6InvariantResult {
  const evidence: string[] = [];
  for (const v of views) {
    const sv = scoringValidator.validate(v.confidence, v.material_state);
    for (const viol of sv.violations) {
      evidence.push(`subject ${v.subject_id}: ${viol.code} — ${viol.detail}`);
    }
    const cv = capValidator.validate(v.confidence, { active_triggers: v.cap_triggers });
    for (const viol of cv.violations) {
      evidence.push(`subject ${v.subject_id}: ${viol.code} — ${viol.detail}`);
    }
  }
  return {
    invariant: 'INV-7.6-C',
    satisfied: evidence.length === 0,
    evidence,
  };
}

/**
 * INV-7.6-D — Local regime compatibility is bounded.
 *
 * Two checks:
 *   1. the regime weight in policy is ≤
 *      L7_FACTOR_GROUP_MAX_LEGAL_WEIGHT[REGIME_COMPATIBILITY]
 *   2. when a local regime result is provided, the regime validator
 *      must accept it given the supplied context (which encodes whether
 *      callers tried to use the score as final regime).
 */
export function checkInvariantD_localRegimeBounded(
  views: readonly L7_6ValidationResultView[],
  validator: L7LocalRegimeCompatibilityValidator = new L7LocalRegimeCompatibilityValidator(),
): L7_6InvariantResult {
  const evidence: string[] = [];
  const maxWeight = L7_FACTOR_GROUP_MAX_LEGAL_WEIGHT[L7ConfidenceFactorGroup.REGIME_COMPATIBILITY];
  for (const v of views) {
    const w = v.confidence.factor_breakdown.weights[L7ConfidenceFactorGroup.REGIME_COMPATIBILITY];
    if (typeof w !== 'number' || w < 0 || w > maxWeight + 1e-9) {
      evidence.push(
        `subject ${v.subject_id}: regime-compatibility weight ${w} > max ${maxWeight}`,
      );
    }
    if (v.local_regime_result && v.local_regime_context) {
      const r = validator.validate(v.local_regime_result, v.local_regime_context);
      for (const viol of r.violations) {
        evidence.push(`subject ${v.subject_id}: ${viol.code} — ${viol.detail}`);
      }
    }
  }
  return {
    invariant: 'INV-7.6-D',
    satisfied: evidence.length === 0,
    evidence,
  };
}

/**
 * INV-7.6-E — Every restriction profile explicitly bounds downstream
 * use rights.
 *
 * Verified by checking that:
 *   - the rights set is non-empty
 *   - posture flags are coherent
 *   - reasons set is non-empty
 */
export function checkInvariantE_restrictionExplicitlyBoundsRights(
  views: readonly L7_6ValidationResultView[],
): L7_6InvariantResult {
  const evidence: string[] = [];
  for (const v of views) {
    const r = v.restriction;
    if (r.rights.length === 0) {
      evidence.push(`subject ${v.subject_id}: rights set empty`);
    }
    if (r.reasons.length === 0) {
      evidence.push(`subject ${v.subject_id}: reasons set empty`);
    }
    if (
      r.evidence_only_mode &&
      (r.rights.includes(L7ReliabilityRight.DETERMINISTIC_SCORING_ALLOWED) ||
        r.rights.includes(L7ReliabilityRight.FINAL_JUDGMENT_ALLOWED) ||
        r.rights.includes(L7ReliabilityRight.SCENARIO_WEIGHTING_ALLOWED))
    ) {
      evidence.push(`subject ${v.subject_id}: evidence-only with score-driving right`);
    }
    if (
      r.requires_contradiction_disclosure &&
      !r.rights.includes(L7ReliabilityRight.REQUIRES_CONTRADICTION_DISCLOSURE)
    ) {
      evidence.push(`subject ${v.subject_id}: disclosure flag without right`);
    }
    if (
      r.requires_additional_confirmation &&
      !r.rights.includes(L7ReliabilityRight.REQUIRES_ADDITIONAL_CONFIRMATION)
    ) {
      evidence.push(`subject ${v.subject_id}: additional-confirmation flag without right`);
    }
  }
  return {
    invariant: 'INV-7.6-E',
    satisfied: evidence.length === 0,
    evidence,
  };
}

/**
 * INV-7.6-F — Rights never broader than state justifies. Run the
 * claim-restriction validator and fail closed on any
 * `RIGHTS_BROADER_THAN_STATE_JUSTIFIES` finding.
 */
export function checkInvariantF_noBroaderRights(
  views: readonly L7_6ValidationResultView[],
  validator: L7ClaimRestrictionValidator = new L7ClaimRestrictionValidator(),
): L7_6InvariantResult {
  const evidence: string[] = [];
  for (const v of views) {
    const r = validator.validate(v.restriction_input, v.restriction);
    for (const viol of r.violations) {
      evidence.push(`subject ${v.subject_id}: ${viol.code} — ${viol.detail}`);
    }
    // Hard inline guards for high-risk pairings that a loose validator
    // could miss in practice:
    if (
      v.restriction_input.contradiction_severity === L7ContradictionSeverity.BLOCKING &&
      v.restriction.rights.includes(L7ReliabilityRight.DETERMINISTIC_SCORING_ALLOWED)
    ) {
      evidence.push(
        `subject ${v.subject_id}: BLOCKING contradiction with DETERMINISTIC_SCORING_ALLOWED`,
      );
    }
    if (
      (v.restriction_input.primary_class === L7PrimaryValidationClass.STALE ||
        v.restriction_input.primary_class === L7PrimaryValidationClass.DEGRADED_DUE_TO_MISSING_SOURCE) &&
      v.restriction.rights.includes(L7ReliabilityRight.FINAL_JUDGMENT_ALLOWED)
    ) {
      evidence.push(
        `subject ${v.subject_id}: ${v.restriction_input.primary_class} with FINAL_JUDGMENT_ALLOWED`,
      );
    }
  }
  return {
    invariant: 'INV-7.6-F',
    satisfied: evidence.length === 0,
    evidence,
  };
}

/**
 * INV-7.6-G — Replay/repair preserves confidence + restriction lineage.
 *
 * Verified by checking that:
 *   - replay_hash is present and stable for identical inputs (the engine
 *     guarantees this; here we check the produced decision carries one)
 *   - lineage refs (trace_id, manifest_id) are populated
 *   - restriction_profile_ref is set
 */
export function checkInvariantG_replayLineagePreserved(
  views: readonly L7_6ValidationResultView[],
): L7_6InvariantResult {
  const evidence: string[] = [];
  for (const v of views) {
    const c = v.confidence;
    if (!c.replay_hash || !c.replay_hash.startsWith('crh:')) {
      evidence.push(`subject ${v.subject_id}: replay_hash missing or invalid`);
    }
    if (!c.lineage_refs?.trace_id || !c.lineage_refs?.manifest_id) {
      evidence.push(`subject ${v.subject_id}: lineage_refs incomplete`);
    }
    if (c.restriction_profile_ref === null) {
      evidence.push(`subject ${v.subject_id}: restriction_profile_ref unset`);
    }
  }
  return {
    invariant: 'INV-7.6-G',
    satisfied: evidence.length === 0,
    evidence,
  };
}

function hasCompleteFactorBreakdown(b: L7ConfidenceFactorBreakdown): boolean {
  for (const d of L7_CONFIDENCE_FACTOR_DESCRIPTORS) {
    if (typeof b.values[d.group] !== 'number') return false;
    if (typeof b.weights[d.group] !== 'number') return false;
    if (typeof b.weighted_contributions[d.group] !== 'number') return false;
  }
  return true;
}

function hasCapChain(c: L7ConfidenceCapChain): boolean {
  return Array.isArray(c.evaluations) && c.evaluations.length > 0;
}

function hasPenaltyChain(p: L7ContradictionPenaltyChain): boolean {
  return Array.isArray(p.evaluations) && p.evaluations.length > 0;
}

/** Convenience: run all 7 invariants and return ordered results. */
export function runAllL7_6Invariants(
  views: readonly L7_6ValidationResultView[],
): readonly L7_6InvariantResult[] {
  return [
    checkInvariantA_confidenceIsSeparateObject(views),
    checkInvariantB_completeStructure(views),
    checkInvariantC_doesNotOutrunLaw(views),
    checkInvariantD_localRegimeBounded(views),
    checkInvariantE_restrictionExplicitlyBoundsRights(views),
    checkInvariantF_noBroaderRights(views),
    checkInvariantG_replayLineagePreserved(views),
  ];
}

// `L7ReliabilityBand` and `compareSeverity` re-exported for tests.
export { L7ReliabilityBand, compareSeverity };
