/**
 * L13.9 — Output Safety Classification Contract
 *
 * §13.9.17 — Unifies the safety scan, non-recommendation assessment,
 * multilingual safety hits, guarantee/certainty detection, market-
 * manipulation detection, and tax/legal advice detection into a
 * single classification consumed by the final safety gate.
 */

import type { L13SafetyAction } from './safety-action';
import type { L13SafetyRiskClass } from './safety-risk-class';
import type { L13SafetyReasonCode } from './safety-reason-code';

export interface L13OutputSafetyClassification {
  readonly safety_classification_id: string;
  readonly output_id: string;
  readonly styled_response_ref: string;

  readonly highest_risk_class: L13SafetyRiskClass;
  readonly all_risk_classes: readonly L13SafetyRiskClass[];

  readonly safe_informational: boolean;
  readonly advice_adjacent: boolean;
  readonly blocked_financial_advice: boolean;
  readonly blocked_manipulation: boolean;
  readonly blocked_guarantee: boolean;
  readonly blocked_tax_legal: boolean;

  readonly required_action: L13SafetyAction;

  readonly rewrite_allowed: boolean;
  readonly refusal_required: boolean;
  readonly hard_block_required: boolean;

  readonly reason_codes: readonly L13SafetyReasonCode[];

  readonly policy_version: string;
  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
}
