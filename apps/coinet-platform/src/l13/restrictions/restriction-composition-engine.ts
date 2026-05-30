/**
 * L13.5 — Restriction Composition Engine
 *
 * §13.5.19 — Composes restrictions from L7–L12 (carried by the
 * L13.2 explanation restriction profile), the L13.2 answer-mode
 * blocked set, and the L13.4 grounding readiness into the final
 * `L13RestrictionCompositionProfile`.
 *
 * Composition law (§13.5.13.4): most-restrictive-wins. The
 * dominant source is the one that contributed the highest-ranked
 * restriction level. Always-blocked uses (§13.5.13.4) may never
 * be reopened.
 */

import type { L13AIInputPackage } from '../contracts/ai-input-package';
import type { L13ClaimGroundingResult } from '../contracts/claim-grounding';
import { L13GroundingReadinessClass } from '../contracts/claim-grounding';
import {
  L13AnswerMode,
  L13BlockedAnswerMode,
  L13_ALWAYS_BLOCKED_ANSWER_MODES,
  type L13ExplanationRestrictionProfile,
} from '../contracts/explanation-restriction-profile';
import {
  L13AllowedOutputUse,
  L13BlockedOutputUse,
  L13RestrictionLevel,
  L13RestrictionSourceClass,
  L13RequiredRestrictionPhraseCode,
  L13_ALWAYS_BLOCKED_OUTPUT_USES,
  l13StrengthenRestrictionLevel,
  type L13RestrictionCompositionProfile,
} from '../contracts/restriction-composition';
import { L13PhraseStrengthClass } from '../contracts/phrase-strength';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.expression.v1';

export interface L13RestrictionCompositionInput {
  readonly output_id: string;
  readonly input_package: L13AIInputPackage;
  readonly grounding_result: L13ClaimGroundingResult;
  readonly evidence_refs?: readonly string[];
  readonly lineage_refs?: readonly string[];
}

interface SourceContribution {
  readonly source: L13RestrictionSourceClass;
  readonly level: L13RestrictionLevel;
}

/**
 * §13.5.13.2 — Map the blocked answer modes carried by the L13.2
 * restriction profile to L13.5 blocked-use categories.
 */
const ANSWER_MODE_TO_BLOCKED_USE:
  Readonly<Record<L13BlockedAnswerMode, L13BlockedOutputUse>> = {
  [L13BlockedAnswerMode.TRADE_RECOMMENDATION]:
    L13BlockedOutputUse.TRADE_INSTRUCTION,
  [L13BlockedAnswerMode.BUY_SELL_HOLD_AVOID]:
    L13BlockedOutputUse.TRADE_INSTRUCTION,
  [L13BlockedAnswerMode.PREDICTION]: L13BlockedOutputUse.PREDICTION,
  [L13BlockedAnswerMode.CERTAINTY_CLAIM]:
    L13BlockedOutputUse.CERTAINTY_CLAIM,
  [L13BlockedAnswerMode.FINAL_JUDGMENT]:
    L13BlockedOutputUse.FINAL_JUDGMENT,
  [L13BlockedAnswerMode.POSITION_SIZING]:
    L13BlockedOutputUse.POSITION_SIZING,
  [L13BlockedAnswerMode.LEVERAGE_GUIDANCE]:
    L13BlockedOutputUse.LEVERAGE_GUIDANCE,
  [L13BlockedAnswerMode.UNGROUNDED_ANALYSIS]:
    L13BlockedOutputUse.CLEAN_SCENARIO_PATH,
};

/**
 * §13.5.13.2 — Map allowed answer modes to allowed output uses.
 */
const ANSWER_MODE_TO_ALLOWED_USE:
  Readonly<Record<L13AnswerMode, readonly L13AllowedOutputUse[]>> = {
  [L13AnswerMode.EXPLAIN]: [L13AllowedOutputUse.EXPLAIN_STATE],
  [L13AnswerMode.SUMMARIZE_MARKET_STATE]: [
    L13AllowedOutputUse.EXPLAIN_STATE,
  ],
  [L13AnswerMode.EXPLAIN_SCENARIO]: [
    L13AllowedOutputUse.EXPLAIN_SCENARIO,
  ],
  [L13AnswerMode.EXPLAIN_SCORE]: [L13AllowedOutputUse.EXPLAIN_SCORE],
  [L13AnswerMode.EXPLAIN_HYPOTHESIS]: [
    L13AllowedOutputUse.EXPLAIN_HYPOTHESIS,
  ],
  [L13AnswerMode.EXPLAIN_REGIME]: [L13AllowedOutputUse.EXPLAIN_REGIME],
  [L13AnswerMode.EXPLAIN_SEQUENCE]: [
    L13AllowedOutputUse.EXPLAIN_SEQUENCE,
  ],
  [L13AnswerMode.WRITE_ALERT]: [L13AllowedOutputUse.WRITE_ALERT],
  [L13AnswerMode.WRITE_REPORT]: [L13AllowedOutputUse.WRITE_REPORT],
  [L13AnswerMode.COMPARE_ASSETS]: [L13AllowedOutputUse.COMPARE_ASSETS],
  [L13AnswerMode.COMPARE_THESES]: [L13AllowedOutputUse.COMPARE_THESES],
  [L13AnswerMode.DISCLOSE_CONTRADICTION]: [
    L13AllowedOutputUse.EXPLAIN_CONTRADICTION,
  ],
  [L13AnswerMode.DISCLOSE_UNCERTAINTY]: [
    L13AllowedOutputUse.EXPLAIN_UNCERTAINTY,
  ],
  [L13AnswerMode.REFUSE_UNSUPPORTED]: [],
};

/**
 * Derive the L13.2 restriction-profile-implied level. The L13.2
 * profile does not carry a single level; we infer it from the
 * counts of allowed/blocked answer modes and from the `may_*`
 * booleans.
 */
function l13DeriveInputPackageLevel(
  profile: L13ExplanationRestrictionProfile,
): L13RestrictionLevel {
  if (profile.allowed_answer_modes.length === 0) {
    return L13RestrictionLevel.BLOCKED;
  }
  const noStrongModes =
    !profile.may_explain_scenario &&
    !profile.may_explain_score &&
    !profile.may_compare_assets &&
    !profile.may_generate_report;
  const noConfidentLanguage = !profile.may_use_confident_language;
  const noDirectionalLanguage = !profile.may_use_directional_language;
  if (noDirectionalLanguage && noConfidentLanguage && noStrongModes) {
    return L13RestrictionLevel.EVIDENCE_ONLY;
  }
  if (noDirectionalLanguage || noConfidentLanguage || noStrongModes) {
    return L13RestrictionLevel.NARROWED;
  }
  if (profile.required_disclosures.length > 0) {
    return L13RestrictionLevel.DISCLOSURE_ONLY;
  }
  return L13RestrictionLevel.NONE;
}

/**
 * Derive a level for each lower layer by inspecting the L13.2
 * `lower_layer_restriction_refs` array — the present ref encodes
 * which layer contributed. The level itself is approximated from
 * the composed booleans; the L13.2 profile is the authoritative
 * surface for restriction composition.
 *
 * For Phase 1 of L13.5 we record the L13.2-composed level under
 * each present source so the audit can attribute the dominant
 * source by ref prefix.
 */
function l13DeriveContributions(
  profile: L13ExplanationRestrictionProfile,
  groundingReadiness: L13GroundingReadinessClass,
): readonly SourceContribution[] {
  const inputLevel = l13DeriveInputPackageLevel(profile);
  const result: SourceContribution[] = [];
  const seenSources = new Set<L13RestrictionSourceClass>();
  for (const ref of profile.lower_layer_restriction_refs) {
    const refLower = ref.toLowerCase();
    let source: L13RestrictionSourceClass | undefined;
    if (refLower.includes('l7') || refLower.includes('validation')) {
      source = L13RestrictionSourceClass.L7_VALIDATION;
    } else if (refLower.includes('l8') || refLower.includes('regime')) {
      source = L13RestrictionSourceClass.L8_REGIME;
    } else if (
      refLower.includes('l9') ||
      refLower.includes('sequence')
    ) {
      source = L13RestrictionSourceClass.L9_SEQUENCE;
    } else if (
      refLower.includes('l10') ||
      refLower.includes('hypothesis')
    ) {
      source = L13RestrictionSourceClass.L10_HYPOTHESIS;
    } else if (
      refLower.includes('l11') ||
      refLower.includes('score')
    ) {
      source = L13RestrictionSourceClass.L11_SCORE;
    } else if (
      refLower.includes('l12') ||
      refLower.includes('scenario')
    ) {
      source = L13RestrictionSourceClass.L12_SCENARIO;
    }
    if (source && !seenSources.has(source)) {
      result.push({ source, level: inputLevel });
      seenSources.add(source);
    }
  }
  // Always record the L13_INPUT_PACKAGE contribution.
  result.push({
    source: L13RestrictionSourceClass.L13_INPUT_PACKAGE,
    level: inputLevel,
  });
  // Grounding-derived contribution.
  let groundingLevel: L13RestrictionLevel = L13RestrictionLevel.NONE;
  if (
    groundingReadiness ===
      L13GroundingReadinessClass.GROUNDING_BLOCKED_UNSUPPORTED ||
    groundingReadiness ===
      L13GroundingReadinessClass.GROUNDING_BLOCKED_CONTRADICTED
  ) {
    groundingLevel = L13RestrictionLevel.BLOCKED;
  } else if (
    groundingReadiness ===
    L13GroundingReadinessClass.GROUNDING_REWRITE_REQUIRED
  ) {
    groundingLevel = L13RestrictionLevel.NARROWED;
  } else if (
    groundingReadiness ===
      L13GroundingReadinessClass.GROUNDING_REFUSAL_REQUIRED
  ) {
    groundingLevel = L13RestrictionLevel.EVIDENCE_ONLY;
  } else if (
    groundingReadiness ===
    L13GroundingReadinessClass.GROUNDING_CLEAN_WITH_DISCLOSURE
  ) {
    groundingLevel = L13RestrictionLevel.DISCLOSURE_ONLY;
  }
  result.push({
    source: L13RestrictionSourceClass.L13_GROUNDING,
    level: groundingLevel,
  });
  return result;
}

const ALL_PHRASE_CLASSES: readonly L13PhraseStrengthClass[] =
  Object.values(L13PhraseStrengthClass);

/**
 * §13.5.19 — Run the restriction composition engine.
 */
export function runL13RestrictionCompositionEngine(
  input: L13RestrictionCompositionInput,
): L13RestrictionCompositionProfile {
  const { input_package, grounding_result, output_id } = input;
  const profile = input_package.restriction_profile;

  const contributions = l13DeriveContributions(
    profile,
    grounding_result.grounding_readiness_class,
  );

  // Most-restrictive-wins.
  let composedLevel = L13RestrictionLevel.NONE;
  let dominantSource: L13RestrictionSourceClass =
    L13RestrictionSourceClass.L13_INPUT_PACKAGE;
  for (const c of contributions) {
    const strengthened = l13StrengthenRestrictionLevel(
      composedLevel,
      c.level,
    );
    if (strengthened !== composedLevel) {
      composedLevel = strengthened;
      dominantSource = c.source;
    }
  }

  // Allowed output uses — union over the L13.2 allowed_answer_modes
  // intersected with what the composed level permits.
  const allowedSet = new Set<L13AllowedOutputUse>();
  for (const mode of profile.allowed_answer_modes) {
    const uses = ANSWER_MODE_TO_ALLOWED_USE[mode] ?? [];
    for (const use of uses) allowedSet.add(use);
  }
  // Default permitted explanatory uses when none are present in
  // allowed_answer_modes.
  if (allowedSet.size === 0) {
    allowedSet.add(L13AllowedOutputUse.EXPLAIN_STATE);
  }
  // Level-based narrowing.
  if (composedLevel === L13RestrictionLevel.BLOCKED) {
    allowedSet.clear();
  } else if (composedLevel === L13RestrictionLevel.EVIDENCE_ONLY) {
    // Strip directional / what-next / comparison uses.
    allowedSet.delete(L13AllowedOutputUse.STATE_DIRECTIONAL_BIAS);
    allowedSet.delete(L13AllowedOutputUse.STATE_BASE_CASE);
    allowedSet.delete(L13AllowedOutputUse.ANSWER_WHAT_NEXT);
    allowedSet.delete(L13AllowedOutputUse.COMPARE_ASSETS);
    allowedSet.delete(L13AllowedOutputUse.COMPARE_THESES);
    allowedSet.delete(L13AllowedOutputUse.WRITE_ALERT);
  } else if (composedLevel === L13RestrictionLevel.NARROWED) {
    allowedSet.delete(L13AllowedOutputUse.STATE_DIRECTIONAL_BIAS);
  }

  // Blocked output uses — union of L13.2 blocked answer modes
  // plus always-blocked uses.
  const blockedSet = new Set<L13BlockedOutputUse>([
    ...L13_ALWAYS_BLOCKED_OUTPUT_USES,
  ]);
  for (const mode of profile.blocked_answer_modes) {
    const use = ANSWER_MODE_TO_BLOCKED_USE[mode];
    if (use) blockedSet.add(use);
  }
  for (const mode of L13_ALWAYS_BLOCKED_ANSWER_MODES) {
    const use = ANSWER_MODE_TO_BLOCKED_USE[mode];
    if (use) blockedSet.add(use);
  }
  if (composedLevel === L13RestrictionLevel.EVIDENCE_ONLY) {
    blockedSet.add(L13BlockedOutputUse.CLEAN_SCENARIO_PATH);
    blockedSet.add(L13BlockedOutputUse.SCORE_AS_RECOMMENDATION);
    blockedSet.add(L13BlockedOutputUse.SCENARIO_AS_WINNER);
    blockedSet.add(L13BlockedOutputUse.HYPOTHESIS_AS_FINAL_TRUTH);
  }
  if (composedLevel === L13RestrictionLevel.NARROWED) {
    blockedSet.add(L13BlockedOutputUse.SCENARIO_AS_WINNER);
    blockedSet.add(L13BlockedOutputUse.HYPOTHESIS_AS_FINAL_TRUTH);
  }

  // Phrase strength caps.
  let allowedPhrase: L13PhraseStrengthClass[];
  let blockedPhrase: L13PhraseStrengthClass[];
  switch (composedLevel) {
    case L13RestrictionLevel.BLOCKED:
      allowedPhrase = [L13PhraseStrengthClass.REFUSAL_ONLY];
      blockedPhrase = ALL_PHRASE_CLASSES.filter(
        c => c !== L13PhraseStrengthClass.REFUSAL_ONLY,
      );
      break;
    case L13RestrictionLevel.EVIDENCE_ONLY:
      allowedPhrase = [
        L13PhraseStrengthClass.REFUSAL_ONLY,
        L13PhraseStrengthClass.UNCERTAIN_ONLY,
        L13PhraseStrengthClass.CONDITIONAL_LOW,
        L13PhraseStrengthClass.CONDITIONAL_MEDIUM,
      ];
      blockedPhrase = [
        L13PhraseStrengthClass.EXPLANATORY_MEDIUM,
        L13PhraseStrengthClass.EXPLANATORY_HIGH,
        L13PhraseStrengthClass.ASSERTIVE_HIGH,
        L13PhraseStrengthClass.FORBIDDEN_CERTAINTY,
      ];
      break;
    case L13RestrictionLevel.NARROWED:
      allowedPhrase = [
        L13PhraseStrengthClass.REFUSAL_ONLY,
        L13PhraseStrengthClass.UNCERTAIN_ONLY,
        L13PhraseStrengthClass.CONDITIONAL_LOW,
        L13PhraseStrengthClass.CONDITIONAL_MEDIUM,
        L13PhraseStrengthClass.EXPLANATORY_MEDIUM,
      ];
      blockedPhrase = [
        L13PhraseStrengthClass.EXPLANATORY_HIGH,
        L13PhraseStrengthClass.ASSERTIVE_HIGH,
        L13PhraseStrengthClass.FORBIDDEN_CERTAINTY,
      ];
      break;
    case L13RestrictionLevel.DISCLOSURE_ONLY:
      allowedPhrase = ALL_PHRASE_CLASSES.filter(
        c => c !== L13PhraseStrengthClass.FORBIDDEN_CERTAINTY,
      );
      blockedPhrase = [L13PhraseStrengthClass.FORBIDDEN_CERTAINTY];
      break;
    case L13RestrictionLevel.NONE:
    default:
      allowedPhrase = ALL_PHRASE_CLASSES.filter(
        c => c !== L13PhraseStrengthClass.FORBIDDEN_CERTAINTY,
      );
      blockedPhrase = [L13PhraseStrengthClass.FORBIDDEN_CERTAINTY];
      break;
  }

  // Boolean answer-mode summaries.
  const may_state_base_case =
    composedLevel === L13RestrictionLevel.NONE ||
    composedLevel === L13RestrictionLevel.DISCLOSURE_ONLY ||
    composedLevel === L13RestrictionLevel.NARROWED;
  const may_state_directional_bias =
    profile.may_use_directional_language &&
    composedLevel !== L13RestrictionLevel.EVIDENCE_ONLY &&
    composedLevel !== L13RestrictionLevel.BLOCKED &&
    composedLevel !== L13RestrictionLevel.NARROWED;
  const may_compare_assets =
    profile.may_compare_assets &&
    composedLevel !== L13RestrictionLevel.EVIDENCE_ONLY &&
    composedLevel !== L13RestrictionLevel.BLOCKED;
  const may_explain_scores =
    profile.may_explain_score &&
    composedLevel !== L13RestrictionLevel.BLOCKED;
  const may_explain_scenarios =
    profile.may_explain_scenario &&
    composedLevel !== L13RestrictionLevel.BLOCKED;
  const may_write_alert =
    profile.may_write_alert &&
    composedLevel !== L13RestrictionLevel.EVIDENCE_ONLY &&
    composedLevel !== L13RestrictionLevel.BLOCKED;
  const may_answer_what_next =
    composedLevel !== L13RestrictionLevel.EVIDENCE_ONLY &&
    composedLevel !== L13RestrictionLevel.BLOCKED;

  // Required restriction phrases.
  const requiredPhraseCodes: L13RequiredRestrictionPhraseCode[] = [];
  if (
    composedLevel === L13RestrictionLevel.NARROWED ||
    composedLevel === L13RestrictionLevel.EVIDENCE_ONLY ||
    composedLevel === L13RestrictionLevel.BLOCKED
  ) {
    requiredPhraseCodes.push(
      L13RequiredRestrictionPhraseCode.OUTPUT_LIMITED_BY_RESTRICTION,
    );
    requiredPhraseCodes.push(
      L13RequiredRestrictionPhraseCode.INSUFFICIENT_CONTEXT_FOR_STRONGER_CLAIM,
    );
  }
  if (composedLevel === L13RestrictionLevel.EVIDENCE_ONLY) {
    requiredPhraseCodes.push(
      L13RequiredRestrictionPhraseCode.EVIDENCE_SUPPORTS_MONITORING_NOT_ACTION,
    );
    requiredPhraseCodes.push(
      L13RequiredRestrictionPhraseCode.DIRECTIONAL_LANGUAGE_NOT_PERMITTED,
    );
  }
  if (
    composedLevel === L13RestrictionLevel.NARROWED ||
    composedLevel === L13RestrictionLevel.EVIDENCE_ONLY
  ) {
    requiredPhraseCodes.push(
      L13RequiredRestrictionPhraseCode.SCENARIO_PATH_IS_CONDITIONAL_NOT_PREDICTIVE,
    );
  }
  if (
    dominantSource === L13RestrictionSourceClass.L11_SCORE &&
    composedLevel !== L13RestrictionLevel.NONE
  ) {
    requiredPhraseCodes.push(
      L13RequiredRestrictionPhraseCode.SCORE_CONTEXT_SUPPORTS_EXPLANATION_ONLY,
    );
  }

  const outputAllowed = composedLevel !== L13RestrictionLevel.BLOCKED;

  const sourceRefs = profile.lower_layer_restriction_refs.slice();

  const replayMaterial = [
    output_id,
    input_package.input_package_id,
    sourceRefs.sort().join(','),
    composedLevel,
    dominantSource,
    Array.from(allowedSet).sort().join(','),
    Array.from(blockedSet).sort().join(','),
    allowedPhrase.join(','),
    blockedPhrase.join(','),
    String(may_state_base_case),
    String(may_state_directional_bias),
    String(may_compare_assets),
    String(may_explain_scores),
    String(may_explain_scenarios),
    String(may_write_alert),
    String(may_answer_what_next),
    requiredPhraseCodes.join(','),
    String(outputAllowed),
    POLICY_V,
  ].join('|');
  const replayHash = fnv1a(replayMaterial);

  // Stabilise allowed/blocked sets in enum order.
  const allowedOrdered = Object.values(L13AllowedOutputUse).filter(
    v => allowedSet.has(v),
  );
  const blockedOrdered = Object.values(L13BlockedOutputUse).filter(
    v => blockedSet.has(v),
  );

  return {
    restriction_composition_id: `l13.restriction.${replayHash}`,
    output_id,
    input_package_id: input_package.input_package_id,
    source_restriction_refs: sourceRefs,
    composed_restriction_level: composedLevel,
    dominant_restriction_source: dominantSource,
    allowed_output_uses: allowedOrdered,
    blocked_output_uses: blockedOrdered,
    allowed_phrase_strength_classes: allowedPhrase,
    blocked_phrase_strength_classes: blockedPhrase,
    may_state_base_case,
    may_state_directional_bias,
    may_compare_assets,
    may_explain_scores,
    may_explain_scenarios,
    may_write_alert,
    may_answer_what_next,
    must_disclose_restriction: requiredPhraseCodes.length > 0,
    required_restriction_phrases: requiredPhraseCodes,
    output_allowed: outputAllowed,
    evidence_refs: input.evidence_refs ?? [],
    lineage_refs: input.lineage_refs ?? [],
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}
