/**
 * L13.5 — Uncertainty Disclosure Engine
 *
 * §13.5.16 — Builds the `L13UncertaintyDisclosureProfile` from the
 * input package, grounding result, confidence-ceiling result, and
 * Layer 13 output. The engine:
 *   1. derives the expression uncertainty source set
 *   2. binds required-disclosure-phrase codes to sources
 *   3. determines the required phrase strength class
 *   4. records forbidden certainty phrases from the catalogue
 *   5. checks whether required disclosures are satisfied by the
 *      output text and records the disclosure readiness class
 *   6. computes a deterministic replay hash
 *
 * The engine is a pure function over its inputs.
 */

import type { L13AIInputPackage } from '../contracts/ai-input-package';
import type { L13AIExplanationOutput } from '../contracts/ai-output';
import type { L13ClaimGroundingResult } from '../contracts/claim-grounding';
import type {
  L13UncertaintyDisclosureProfile,
} from '../contracts/uncertainty-disclosure-profile';
import {
  L13DisclosureReadinessClass,
  L13ExpressionUncertaintySource,
  isL13DisclosureReadinessFailure,
} from '../contracts/uncertainty-disclosure-profile';
import {
  L13ForbiddenCertaintyPhraseCode,
  L13_FORBIDDEN_CERTAINTY_PHRASE_CATALOGUE,
} from '../contracts/forbidden-certainty-phrase';
import {
  L13RequiredDisclosurePhraseCode,
  l13RequiredDisclosurePhraseByCode,
} from '../contracts/required-disclosure-phrase';
import {
  L13PhraseStrengthClass,
  l13RankPhraseStrength,
} from '../contracts/phrase-strength';
import { L13ExplanationConfidenceBand } from '../contracts/confidence-breakdown';
import { l13ConfidenceBandAtOrBelow } from '../contracts/explanation-confidence-band';
import { fnv1a } from '../context/_fnv1a';
import {
  buildL13OutputTextCorpus,
} from './phrase-strength-classifier';
import {
  deriveL13ConfidenceCeiling,
  type L13ConfidenceCeilingResult,
} from './confidence-ceiling-engine';

const POLICY_V = 'l13.expression.v1';

export interface L13UncertaintyDisclosureInput {
  readonly output: L13AIExplanationOutput;
  readonly input_package: L13AIInputPackage;
  readonly grounding_result: L13ClaimGroundingResult;
  /**
   * Optional precomputed ceiling. When omitted, the engine derives
   * the ceiling from the input package + grounding result.
   */
  readonly ceiling?: L13ConfidenceCeilingResult;
  readonly evidence_refs?: readonly string[];
  readonly lineage_refs?: readonly string[];
}

/**
 * §13.5.9.1 — Map an expression uncertainty source to the
 * required-disclosure-phrase codes it forces.
 */
const SOURCE_TO_PHRASE_CODES:
  Readonly<
    Record<L13ExpressionUncertaintySource, readonly L13RequiredDisclosurePhraseCode[]>
  > = {
  [L13ExpressionUncertaintySource.LOW_SIGNAL_CONFIDENCE]: [
    L13RequiredDisclosurePhraseCode.BASE_CASE_CONFIDENCE_CAPPED,
    L13RequiredDisclosurePhraseCode.CURRENT_PATH_REMAINS_CONDITIONAL,
  ],
  [L13ExpressionUncertaintySource.L7_CONTRADICTION]: [
    L13RequiredDisclosurePhraseCode.CONTRADICTION_REMAINS_ACTIVE,
  ],
  [L13ExpressionUncertaintySource.L8_TRANSITION_RISK]: [
    L13RequiredDisclosurePhraseCode.REGIME_TRANSITION_RISK_NARROWS_INTERPRETATION,
  ],
  [L13ExpressionUncertaintySource.L9_SEQUENCE_AMBIGUITY]: [
    L13RequiredDisclosurePhraseCode.SEQUENCE_AMBIGUITY_NARROWS_INTERPRETATION,
  ],
  [L13ExpressionUncertaintySource.L9_SEQUENCE_DECAY]: [
    L13RequiredDisclosurePhraseCode.SEQUENCE_AMBIGUITY_NARROWS_INTERPRETATION,
  ],
  [L13ExpressionUncertaintySource.L10_NARROW_HYPOTHESIS_SPREAD]: [
    L13RequiredDisclosurePhraseCode.HYPOTHESIS_COMPETITION_REMAINS_OPEN,
  ],
  [L13ExpressionUncertaintySource.L10_MISSING_CONFIRMATIONS]: [
    L13RequiredDisclosurePhraseCode.HYPOTHESIS_COMPETITION_REMAINS_OPEN,
    L13RequiredDisclosurePhraseCode.CURRENT_PATH_REMAINS_CONDITIONAL,
  ],
  [L13ExpressionUncertaintySource.L10_ACTIVE_INVALIDATION_RISK]: [
    L13RequiredDisclosurePhraseCode.ACTIVE_INVALIDATION_LIMITS_CONFIDENCE,
  ],
  [L13ExpressionUncertaintySource.L11_MISSING_VISIBILITY]: [
    L13RequiredDisclosurePhraseCode.MISSING_VISIBILITY_NARROWS_ANSWER,
  ],
  [L13ExpressionUncertaintySource.L11_DRIFT]: [
    L13RequiredDisclosurePhraseCode.DRIFT_LIMITS_SCORE_CONTEXT,
  ],
  [L13ExpressionUncertaintySource.L11_SCORE_RESTRICTION]: [
    L13RequiredDisclosurePhraseCode.SCORE_RESTRICTION_LIMITS_USE,
  ],
  [L13ExpressionUncertaintySource.L12_NARROW_SCENARIO_SPREAD]: [
    L13RequiredDisclosurePhraseCode.SCENARIO_COMPETITION_REMAINS_OPEN,
  ],
  [L13ExpressionUncertaintySource.L12_ACTIVE_INVALIDATION]: [
    L13RequiredDisclosurePhraseCode.ACTIVE_INVALIDATION_LIMITS_CONFIDENCE,
  ],
  [L13ExpressionUncertaintySource.L12_UNRESOLVED_TRIGGER]: [
    L13RequiredDisclosurePhraseCode.TRIGGERS_REMAIN_UNRESOLVED,
  ],
  [L13ExpressionUncertaintySource.L12_PATH_CONFIDENCE_CAP]: [
    L13RequiredDisclosurePhraseCode.BASE_CASE_CONFIDENCE_CAPPED,
  ],
  [L13ExpressionUncertaintySource.L13_GROUNDED_CLAIM_NARROWED]: [
    L13RequiredDisclosurePhraseCode.CLAIM_LEVEL_GROUNDING_NARROWED,
  ],
  [L13ExpressionUncertaintySource.L13_GROUNDED_CLAIM_UNCERTAIN_ONLY]: [
    L13RequiredDisclosurePhraseCode.CLAIM_LEVEL_UNCERTAIN_ONLY,
  ],
};

/**
 * §13.5.5 — Map confidence ceiling to the required phrase strength
 * class that the output's *strongest* phrase must meet (i.e., the
 * floor of cautiousness — phrases must be at least this weak).
 *
 * For ceilings ≤ MEDIUM we require disclosure phrasing or weaker.
 * For ceilings > MEDIUM the requirement is permissive
 * (EXPLANATORY_MEDIUM is the floor).
 */
const CEILING_TO_REQUIRED_PHRASE_FLOOR:
  Readonly<Record<L13ExplanationConfidenceBand, L13PhraseStrengthClass>> = {
  [L13ExplanationConfidenceBand.BLOCKED]:
    L13PhraseStrengthClass.REFUSAL_ONLY,
  [L13ExplanationConfidenceBand.VERY_LOW]:
    L13PhraseStrengthClass.UNCERTAIN_ONLY,
  [L13ExplanationConfidenceBand.LOW]:
    L13PhraseStrengthClass.CONDITIONAL_LOW,
  [L13ExplanationConfidenceBand.MEDIUM]:
    L13PhraseStrengthClass.CONDITIONAL_MEDIUM,
  [L13ExplanationConfidenceBand.HIGH]:
    L13PhraseStrengthClass.EXPLANATORY_MEDIUM,
  [L13ExplanationConfidenceBand.VERY_HIGH]:
    L13PhraseStrengthClass.EXPLANATORY_MEDIUM,
};

function l13ForbiddenPhraseStrengthsAboveCeiling(
  ceiling: L13ExplanationConfidenceBand,
): readonly L13PhraseStrengthClass[] {
  // Mirrors the phrasing engine table; kept local so the
  // uncertainty profile is self-contained.
  const CEILING_TO_MAX:
    Readonly<Record<L13ExplanationConfidenceBand, L13PhraseStrengthClass>> = {
    [L13ExplanationConfidenceBand.BLOCKED]:
      L13PhraseStrengthClass.REFUSAL_ONLY,
    [L13ExplanationConfidenceBand.VERY_LOW]:
      L13PhraseStrengthClass.UNCERTAIN_ONLY,
    [L13ExplanationConfidenceBand.LOW]:
      L13PhraseStrengthClass.CONDITIONAL_LOW,
    [L13ExplanationConfidenceBand.MEDIUM]:
      L13PhraseStrengthClass.EXPLANATORY_MEDIUM,
    [L13ExplanationConfidenceBand.HIGH]:
      L13PhraseStrengthClass.EXPLANATORY_HIGH,
    [L13ExplanationConfidenceBand.VERY_HIGH]:
      L13PhraseStrengthClass.ASSERTIVE_HIGH,
  };
  const maxRank = l13RankPhraseStrength(CEILING_TO_MAX[ceiling]);
  return Object.values(L13PhraseStrengthClass).filter(
    cls => l13RankPhraseStrength(cls) > maxRank,
  );
}

/**
 * Returns true when at least one of the keyword anchors for
 * `code` appears in the output text corpus. Case-insensitive.
 */
function l13DisclosurePhraseSatisfied(
  code: L13RequiredDisclosurePhraseCode,
  corpusLower: string,
): boolean {
  const entry = l13RequiredDisclosurePhraseByCode(code);
  for (const anchor of entry.keyword_anchors) {
    if (corpusLower.includes(anchor.toLowerCase())) return true;
  }
  return false;
}

/**
 * §13.5.16 — Run the uncertainty-disclosure engine. Pure function.
 */
export function runL13UncertaintyDisclosureEngine(
  input: L13UncertaintyDisclosureInput,
): L13UncertaintyDisclosureProfile {
  const { output, input_package, grounding_result } = input;
  const ceiling =
    input.ceiling ??
    deriveL13ConfidenceCeiling({
      input_package,
      grounding_result,
    });

  // Required phrase codes — union over sources.
  const requiredCodes = new Set<L13RequiredDisclosurePhraseCode>();
  for (const src of ceiling.contributing_sources) {
    const codes = SOURCE_TO_PHRASE_CODES[src] ?? [];
    for (const c of codes) requiredCodes.add(c);
  }
  // Also bind sources from the broader expression-source set even
  // when they did not narrow the ceiling (they still demand
  // disclosure).
  const profile = input_package.uncertainty_profile;
  if (profile.active_contradiction_present) {
    requiredCodes.add(
      L13RequiredDisclosurePhraseCode.CONTRADICTION_REMAINS_ACTIVE,
    );
  }
  if (profile.active_invalidation_present) {
    requiredCodes.add(
      L13RequiredDisclosurePhraseCode.ACTIVE_INVALIDATION_LIMITS_CONFIDENCE,
    );
  }
  if (profile.unresolved_trigger_present) {
    requiredCodes.add(
      L13RequiredDisclosurePhraseCode.TRIGGERS_REMAIN_UNRESOLVED,
    );
  }
  if (profile.material_missing_data_present) {
    requiredCodes.add(
      L13RequiredDisclosurePhraseCode.MISSING_VISIBILITY_NARROWS_ANSWER,
    );
  }
  if (profile.material_drift_present) {
    requiredCodes.add(
      L13RequiredDisclosurePhraseCode.DRIFT_LIMITS_SCORE_CONTEXT,
    );
  }
  if (profile.narrow_spread_present) {
    requiredCodes.add(
      L13RequiredDisclosurePhraseCode.SCENARIO_COMPETITION_REMAINS_OPEN,
    );
  }
  // Stabilise order per enum declaration.
  const requiredArr: L13RequiredDisclosurePhraseCode[] = [];
  for (const v of Object.values(L13RequiredDisclosurePhraseCode)) {
    if (requiredCodes.has(v)) requiredArr.push(v);
  }

  // Required phrase strength class floor.
  const requiredFloor =
    CEILING_TO_REQUIRED_PHRASE_FLOOR[ceiling.confidence_ceiling];
  const forbiddenStrengths = l13ForbiddenPhraseStrengthsAboveCeiling(
    ceiling.confidence_ceiling,
  );

  // Forbidden certainty phrase set (codes the validator scans for).
  const forbiddenPhraseCodes: L13ForbiddenCertaintyPhraseCode[] =
    L13_FORBIDDEN_CERTAINTY_PHRASE_CATALOGUE.map(
      e => e.phrase_code,
    ).filter(code => {
      const entry = L13_FORBIDDEN_CERTAINTY_PHRASE_CATALOGUE.find(
        x => x.phrase_code === code,
      );
      if (!entry) return false;
      if (entry.forbidden_under_any_condition) return true;
      const thresh =
        entry.forbidden_when_confidence_ceiling_at_or_below;
      if (
        thresh !== undefined &&
        l13ConfidenceBandAtOrBelow(ceiling.confidence_ceiling, thresh)
      ) {
        return true;
      }
      return false;
    });

  // Disclosure readiness: check anchors against corpus.
  const corpusLower = buildL13OutputTextCorpus(output).toLowerCase();
  const satisfied: L13RequiredDisclosurePhraseCode[] = [];
  const missing: L13RequiredDisclosurePhraseCode[] = [];
  for (const code of requiredArr) {
    if (l13DisclosurePhraseSatisfied(code, corpusLower)) {
      satisfied.push(code);
    } else {
      missing.push(code);
    }
  }

  // Mention flags — these are user-facing booleans.
  const must_mention_contradiction =
    profile.active_contradiction_present;
  const must_mention_missing_data = profile.material_missing_data_present;
  const must_mention_drift = profile.material_drift_present;
  const must_mention_invalidation = profile.active_invalidation_present;
  const must_mention_unresolved_trigger = profile.unresolved_trigger_present;
  const must_mention_narrow_scenario_spread =
    profile.narrow_spread_present &&
    profile.uncertainty_sources.some(
      s => String(s) === 'L12_NARROW_SCENARIO_SPREAD',
    );
  const must_mention_narrow_hypothesis_spread =
    profile.narrow_spread_present &&
    profile.uncertainty_sources.some(
      s => String(s) === 'L10_NARROW_HYPOTHESIS_SPREAD',
    );
  const must_mention_transition_risk = profile.uncertainty_sources.some(
    s => String(s) === 'L8_TRANSITION_RISK',
  );
  const must_mention_sequence_ambiguity = profile.uncertainty_sources.some(
    s => String(s) === 'L9_SEQUENCE_AMBIGUITY' || String(s) === 'L9_DECAY',
  );

  // Disclosure readiness classification.
  let disclosureReadiness: L13DisclosureReadinessClass;
  if (
    ceiling.confidence_ceiling === L13ExplanationConfidenceBand.BLOCKED
  ) {
    disclosureReadiness = L13DisclosureReadinessClass.DISCLOSURE_BLOCKED;
  } else if (missing.length === 0 && requiredArr.length === 0) {
    disclosureReadiness = L13DisclosureReadinessClass.DISCLOSURE_CLEAN;
  } else if (missing.length === 0) {
    disclosureReadiness =
      L13DisclosureReadinessClass.DISCLOSURE_REQUIRED_PRESENT;
  } else {
    disclosureReadiness =
      L13DisclosureReadinessClass.DISCLOSURE_REQUIRED_MISSING;
  }

  // Required section refs / claim refs — the validator uses these
  // to confirm that disclosure landed in the right sections.
  const required_section_refs: string[] = [];
  if (must_mention_contradiction) {
    required_section_refs.push('sec.con.1');
  }
  if (
    must_mention_invalidation ||
    must_mention_unresolved_trigger
  ) {
    required_section_refs.push('sec.tri.1');
  }
  if (requiredArr.length > 0) {
    required_section_refs.push('sec.unc.1');
  }
  const required_claim_refs: string[] = [];
  for (const refId of grounding_result.rewrite_required_claim_refs) {
    required_claim_refs.push(refId);
  }

  // Replay material.
  const replayMaterial = [
    output.output_id,
    input_package.input_package_id,
    ceiling.confidence_ceiling,
    ceiling.reason_codes.join(','),
    ceiling.contributing_sources.join(','),
    requiredArr.join(','),
    forbiddenPhraseCodes.join(','),
    requiredFloor,
    forbiddenStrengths.join(','),
    String(must_mention_contradiction),
    String(must_mention_missing_data),
    String(must_mention_drift),
    String(must_mention_invalidation),
    String(must_mention_unresolved_trigger),
    String(must_mention_narrow_scenario_spread),
    String(must_mention_narrow_hypothesis_spread),
    String(must_mention_transition_risk),
    String(must_mention_sequence_ambiguity),
    required_section_refs.join(','),
    required_claim_refs.join(','),
    disclosureReadiness,
    POLICY_V,
  ].join('|');
  const replayHash = fnv1a(replayMaterial);

  return {
    uncertainty_profile_id: `l13.uncertainty.${replayHash}`,
    output_id: output.output_id,
    input_package_id: input_package.input_package_id,
    grounded_output_ref: grounding_result.grounding_result_id,
    uncertainty_sources: ceiling.contributing_sources,
    confidence_ceiling: ceiling.confidence_ceiling,
    confidence_ceiling_reason_codes: ceiling.reason_codes,
    required_disclosure_phrases: requiredArr,
    forbidden_certainty_phrases: forbiddenPhraseCodes,
    required_phrase_strength_class: requiredFloor,
    forbidden_phrase_strength_classes: forbiddenStrengths,
    must_mention_contradiction,
    must_mention_missing_data,
    must_mention_drift,
    must_mention_invalidation,
    must_mention_unresolved_trigger,
    must_mention_narrow_scenario_spread,
    must_mention_narrow_hypothesis_spread,
    must_mention_transition_risk,
    must_mention_sequence_ambiguity,
    required_section_refs,
    required_claim_refs,
    disclosure_readiness: disclosureReadiness,
    evidence_refs: input.evidence_refs ?? [],
    lineage_refs: input.lineage_refs ?? [],
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}

export { isL13DisclosureReadinessFailure };
