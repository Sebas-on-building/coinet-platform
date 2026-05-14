/**
 * L13.2 — Restriction Binding Engine
 *
 * §13.2.15 — Merges L7–L12 restrictions into the L13 explanation
 * restriction profile. Composition law: most restrictive wins;
 * blocked answer modes can never be reopened by L13. Always-blocked
 * modes (trade recommendation, prediction, certainty, final
 * judgment, position sizing, leverage guidance, ungrounded analysis)
 * are constitutional and cannot be unset regardless of inputs.
 */

import {
  ALL_L13_ANSWER_MODES,
  L13_ALWAYS_BLOCKED_ANSWER_MODES,
  L13AnswerMode,
  L13BlockedAnswerMode,
  L13BlockedClaimType,
  L13RequiredDisclosure,
  type L13ExplanationRestrictionProfile,
} from '../contracts/explanation-restriction-profile';
import { fnv1a } from './_fnv1a';

const POLICY_V = 'l13.input-package.v1';

export interface L13LowerLayerRestrictionInputs {
  readonly l7_restriction_refs: readonly string[];
  readonly l8_restriction_refs: readonly string[];
  readonly l9_restriction_refs: readonly string[];
  readonly l10_restriction_refs: readonly string[];
  readonly l11_restriction_refs: readonly string[];
  readonly l12_restriction_refs: readonly string[];

  readonly l7_blocks_explanation: boolean;
  readonly l11_blocks_score_explanation: boolean;
  readonly l12_blocks_scenario_explanation: boolean;
  readonly l11_blocks_directional_language: boolean;
  readonly l12_blocks_confident_language: boolean;

  readonly l11_blocks_alert: boolean;
  readonly l11_blocks_report: boolean;
  readonly l11_blocks_comparison: boolean;
}

export interface L13RestrictionBindingInput {
  readonly request_id: string;
  readonly lower_layer: L13LowerLayerRestrictionInputs;

  readonly contradiction_present: boolean;
  readonly active_invalidation_present: boolean;
  readonly missing_data_present: boolean;
  readonly drift_present: boolean;
  readonly narrow_spread_present: boolean;
  readonly confidence_cap_present: boolean;
  readonly unresolved_trigger_present: boolean;

  readonly evidence_refs?: readonly string[];
  readonly lineage_refs?: readonly string[];
}

/**
 * §13.2.15 — Compose the L13 restriction profile.
 */
export function buildL13ExplanationRestrictionProfile(
  input: L13RestrictionBindingInput,
): L13ExplanationRestrictionProfile {
  const l = input.lower_layer;
  const lowerRefs = [
    ...l.l7_restriction_refs,
    ...l.l8_restriction_refs,
    ...l.l9_restriction_refs,
    ...l.l10_restriction_refs,
    ...l.l11_restriction_refs,
    ...l.l12_restriction_refs,
  ].sort();

  // §13.2.15 — most restrictive wins.
  const mayExplainScenario = !l.l12_blocks_scenario_explanation;
  const mayExplainScore = !l.l11_blocks_score_explanation;
  const mayCompareAssets = !l.l11_blocks_comparison;
  const mayWriteAlert = !l.l11_blocks_alert;
  const mayGenerateReport = !l.l11_blocks_report;

  const mayUseDirectionalLanguage =
    !l.l11_blocks_directional_language &&
    !l.l12_blocks_confident_language &&
    !input.active_invalidation_present;

  const mayUseConfidentLanguage =
    !l.l12_blocks_confident_language &&
    !input.contradiction_present &&
    !input.active_invalidation_present &&
    !input.missing_data_present &&
    !input.drift_present &&
    !input.narrow_spread_present &&
    !input.confidence_cap_present;

  // Allowed answer modes: filter by whether each explanation mode is
  // permitted given the binding above. Always-allowed safe modes:
  // EXPLAIN, SUMMARIZE, REFUSE, DISCLOSE_*.
  const allowed: L13AnswerMode[] = [];
  for (const mode of ALL_L13_ANSWER_MODES) {
    let ok = true;
    if (
      mode === L13AnswerMode.EXPLAIN_SCENARIO &&
      !mayExplainScenario
    ) {
      ok = false;
    }
    if (mode === L13AnswerMode.EXPLAIN_SCORE && !mayExplainScore) {
      ok = false;
    }
    if (
      (mode === L13AnswerMode.COMPARE_ASSETS ||
        mode === L13AnswerMode.COMPARE_THESES) &&
      !mayCompareAssets
    ) {
      ok = false;
    }
    if (mode === L13AnswerMode.WRITE_ALERT && !mayWriteAlert) {
      ok = false;
    }
    if (mode === L13AnswerMode.WRITE_REPORT && !mayGenerateReport) {
      ok = false;
    }
    if (l.l7_blocks_explanation && mode !== L13AnswerMode.REFUSE_UNSUPPORTED) {
      // L7 hard block: only refusal is allowed.
      ok = false;
    }
    if (ok) allowed.push(mode);
  }
  // Refusal is always permitted.
  if (!allowed.includes(L13AnswerMode.REFUSE_UNSUPPORTED)) {
    allowed.push(L13AnswerMode.REFUSE_UNSUPPORTED);
  }

  // Blocked answer modes: always-blocked + nothing else.
  const blocked: L13BlockedAnswerMode[] = [
    ...L13_ALWAYS_BLOCKED_ANSWER_MODES,
  ];

  const blockedClaimTypes: L13BlockedClaimType[] = [
    L13BlockedClaimType.TRADE_INSTRUCTION,
    L13BlockedClaimType.PREDICTION_OUTCOME,
    L13BlockedClaimType.CERTAINTY,
    L13BlockedClaimType.WINNER_DECLARATION,
    L13BlockedClaimType.FINAL_JUDGMENT,
    L13BlockedClaimType.RECOMMENDATION_FROM_SCORE,
    L13BlockedClaimType.REBUILT_LOWER_LAYER,
    L13BlockedClaimType.INVENTED_SUPPORT,
    L13BlockedClaimType.HIDDEN_CONTRADICTION,
    L13BlockedClaimType.HIDDEN_RESTRICTION,
  ];

  const required: L13RequiredDisclosure[] = [
    L13RequiredDisclosure.EVIDENCE_REFS,
    L13RequiredDisclosure.LINEAGE_REFS,
    L13RequiredDisclosure.RESTRICTION,
  ];
  if (input.contradiction_present) {
    required.push(L13RequiredDisclosure.CONTRADICTION);
  }
  if (input.active_invalidation_present) {
    required.push(L13RequiredDisclosure.ACTIVE_INVALIDATION);
  }
  if (input.unresolved_trigger_present) {
    required.push(L13RequiredDisclosure.UNRESOLVED_TRIGGER);
  }
  if (input.narrow_spread_present) {
    required.push(L13RequiredDisclosure.NARROW_SCENARIO_SPREAD);
  }
  if (input.missing_data_present) {
    required.push(L13RequiredDisclosure.MISSING_DATA);
  }
  if (input.drift_present) {
    required.push(L13RequiredDisclosure.DRIFT);
  }
  if (input.confidence_cap_present) {
    required.push(L13RequiredDisclosure.CONFIDENCE_CAP);
  }

  const profileId = `l13d.restriction.${fnv1a(
    [
      input.request_id,
      lowerRefs.join(','),
      String(mayExplainScenario),
      String(mayExplainScore),
      String(mayCompareAssets),
      String(mayUseConfidentLanguage),
      String(mayUseDirectionalLanguage),
    ].join('|'),
  )}`;

  return {
    restriction_profile_id: profileId,
    lower_layer_restriction_refs: lowerRefs,
    allowed_answer_modes: [...new Set(allowed)].sort(),
    blocked_answer_modes: [...new Set(blocked)].sort(),
    blocked_claim_types: [...new Set(blockedClaimTypes)].sort(),
    required_disclosures: [...new Set(required)].sort(),
    may_explain_scenario: mayExplainScenario,
    may_explain_score: mayExplainScore,
    may_compare_assets: mayCompareAssets,
    may_write_alert: mayWriteAlert,
    may_generate_report: mayGenerateReport,
    may_use_directional_language: mayUseDirectionalLanguage,
    may_use_confident_language: mayUseConfidentLanguage,
    must_avoid_recommendation_language: true,
    must_avoid_prediction_language: true,
    must_avoid_final_judgment_language: true,
    evidence_refs: [...(input.evidence_refs ?? [])].sort(),
    lineage_refs: [...(input.lineage_refs ?? [])].sort(),
    policy_version: POLICY_V,
  };
}
