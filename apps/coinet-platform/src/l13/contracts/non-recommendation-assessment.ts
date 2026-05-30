/**
 * L13.9 — Non-Recommendation Assessment Contract
 *
 * §13.9.14 — Distinct from the phrase-scan result: this object
 * captures the higher-level "did this output cross from analysis
 * into recommendation?" judgement plus the rewriteability signal.
 */

import type { L13SafetyAction } from './safety-action';
import type { L13SafetyRiskClass } from './safety-risk-class';
import type { L13RecommendationReasonCode } from './market-manipulation-pattern';

export interface L13NonRecommendationAssessment {
  readonly non_recommendation_assessment_id: string;
  readonly output_id: string;

  readonly recommendation_detected: boolean;
  readonly personalized_instruction_detected: boolean;
  readonly action_language_detected: boolean;
  readonly certainty_to_action_link_detected: boolean;

  readonly detected_risk_classes: readonly L13SafetyRiskClass[];
  readonly recommendation_reason_codes:
    readonly L13RecommendationReasonCode[];

  readonly required_action: L13SafetyAction;
  readonly rewrite_candidate_available: boolean;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
  readonly replay_hash: string;
}
