/**
 * L13.9 — Safety Validators
 *
 * §13.9.25 — Per-shape validators for safety policy, safety scan,
 * non-recommendation assessment, advice-adjacent rewrite, output
 * safety classification, and final safety gate result.
 */

import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import type { L13SafetyPolicy } from '../contracts/safety-policy';
import type { L13SafetyScanResult } from '../contracts/safety-scan-result';
import type { L13NonRecommendationAssessment } from '../contracts/non-recommendation-assessment';
import type { L13AdviceAdjacentRewriteResult } from '../contracts/advice-adjacent-rewrite-result';
import type { L13OutputSafetyClassification } from '../contracts/output-safety-classification';
import type { L13FinalSafetyGateResult } from '../contracts/final-safety-gate-result';
import {
  L13SafetyAction,
  L13SafetyEmissionDecision,
  l13IsUserEmittingSafetyDecision,
} from '../contracts/safety-action';
import {
  L13SafetyRiskClass,
} from '../contracts/safety-risk-class';
import { L13SafetyViolationCode } from './l13-safety-violation-codes';
import {
  l13SafetyResult,
  type L13SafetyIssue,
  type L13SafetyValidationResult,
} from './_l13-safety-issue';

const SEV = L13ViolationSeverity;

// ── Safety policy validator ─────────────────────────────────────────

export function validateL13SafetyPolicy(
  policy: L13SafetyPolicy,
): L13SafetyValidationResult {
  const issues: L13SafetyIssue[] = [];
  if (!policy.safety_policy_id) {
    issues.push({
      code: L13SafetyViolationCode.L13Y_SAFETY_POLICY_MISSING,
      severity: SEV.CRITICAL,
      message: 'safety_policy_id missing',
    });
  }
  if (!policy.replay_hash) {
    issues.push({
      code: L13SafetyViolationCode.L13Y_SAFETY_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'safety policy replay_hash missing',
    });
  }
  // Every block_* flag must be true (immutable by contract).
  const trueFlags: Array<keyof L13SafetyPolicy> = [
    'allow_informational_analysis',
    'allow_conditional_scenarios',
    'allow_evidence_based_explanations',
    'allow_risk_disclosures',
    'allow_what_to_watch_triggers',
    'allow_educational_framing',
    'block_personalized_financial_advice',
    'block_buy_sell_hold_avoid_instruction',
    'block_position_sizing_instruction',
    'block_leverage_recommendation',
    'block_liquidation_target_advice',
    'block_guaranteed_outcomes',
    'block_tax_legal_advice',
    'block_market_manipulation_assistance',
  ];
  for (const field of trueFlags) {
    if (policy[field] !== true) {
      issues.push({
        code: L13SafetyViolationCode.L13Y_SAFETY_POLICY_MISSING,
        severity: SEV.CRITICAL,
        message: `policy field ${String(field)} must be true`,
      });
    }
  }
  if (policy.language_scope.length === 0) {
    issues.push({
      code: L13SafetyViolationCode.L13Y_SAFETY_POLICY_MISSING,
      severity: SEV.ERROR,
      message: 'language_scope empty',
    });
  }
  return l13SafetyResult(issues);
}

// ── Safety scan validator ───────────────────────────────────────────

export function validateL13SafetyScanResult(
  scan: L13SafetyScanResult,
): L13SafetyValidationResult {
  const issues: L13SafetyIssue[] = [];
  if (!scan.safety_scan_id) {
    issues.push({
      code: L13SafetyViolationCode.L13Y_SAFETY_SCAN_MISSING,
      severity: SEV.CRITICAL,
      message: 'safety_scan_id missing',
    });
  }
  if (!scan.replay_hash) {
    issues.push({
      code: L13SafetyViolationCode.L13Y_SAFETY_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'safety scan replay_hash missing',
    });
  }
  if (scan.lineage_refs.length === 0) {
    issues.push({
      code: L13SafetyViolationCode.L13Y_SAFETY_LINEAGE_MISSING,
      severity: SEV.ERROR,
      message: 'safety scan lineage_refs empty',
    });
  }
  return l13SafetyResult(issues);
}

// ── Non-recommendation validator ────────────────────────────────────

export function validateL13NonRecommendationAssessment(
  assessment: L13NonRecommendationAssessment,
): L13SafetyValidationResult {
  const issues: L13SafetyIssue[] = [];
  if (!assessment.non_recommendation_assessment_id) {
    issues.push({
      code: L13SafetyViolationCode.L13Y_SAFETY_CLASSIFICATION_MISSING,
      severity: SEV.CRITICAL,
      message: 'non_recommendation_assessment_id missing',
    });
  }
  if (!assessment.replay_hash) {
    issues.push({
      code: L13SafetyViolationCode.L13Y_SAFETY_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'non_recommendation replay_hash missing',
    });
  }
  if (
    assessment.recommendation_detected &&
    assessment.required_action === L13SafetyAction.ALLOW
  ) {
    issues.push({
      code: L13SafetyViolationCode.L13Y_REWRITE_REQUIRED_BUT_EMITTED,
      severity: SEV.CRITICAL,
      message:
        'recommendation_detected=true but required_action=ALLOW',
    });
  }
  return l13SafetyResult(issues);
}

// ── Advice-adjacent rewrite validator ───────────────────────────────

export function validateL13AdviceAdjacentRewriteResult(
  result: L13AdviceAdjacentRewriteResult,
): L13SafetyValidationResult {
  const issues: L13SafetyIssue[] = [];
  if (!result.rewrite_result_id) {
    issues.push({
      code: L13SafetyViolationCode.L13Y_ADVICE_ADJACENT_OUTPUT_NOT_REWRITTEN,
      severity: SEV.CRITICAL,
      message: 'rewrite_result_id missing',
    });
  }
  if (!result.replay_hash) {
    issues.push({
      code: L13SafetyViolationCode.L13Y_SAFETY_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'rewrite replay_hash missing',
    });
  }
  // §13.9.16.1 — successful rewrite must demand revalidation
  // through L13.3..L13.8.
  if (result.rewrite_successful) {
    const allRevalidations =
      result.requires_revalidation_from_l13_3 &&
      result.requires_revalidation_from_l13_4 &&
      result.requires_revalidation_from_l13_5 &&
      result.requires_revalidation_from_l13_7 &&
      result.requires_revalidation_from_l13_8;
    if (!allRevalidations) {
      issues.push({
        code: L13SafetyViolationCode.L13Y_ADVICE_ADJACENT_OUTPUT_NOT_REWRITTEN,
        severity: SEV.CRITICAL,
        message:
          'successful rewrite must require revalidation through L13.3..L13.8',
      });
    }
  }
  return l13SafetyResult(issues);
}

// ── Output safety classifier validator ──────────────────────────────

export function validateL13OutputSafetyClassification(
  cls: L13OutputSafetyClassification,
): L13SafetyValidationResult {
  const issues: L13SafetyIssue[] = [];
  if (!cls.safety_classification_id) {
    issues.push({
      code: L13SafetyViolationCode.L13Y_SAFETY_CLASSIFICATION_MISSING,
      severity: SEV.CRITICAL,
      message: 'safety_classification_id missing',
    });
  }
  if (!cls.replay_hash) {
    issues.push({
      code: L13SafetyViolationCode.L13Y_SAFETY_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'classification replay_hash missing',
    });
  }
  if (cls.lineage_refs.length === 0) {
    issues.push({
      code: L13SafetyViolationCode.L13Y_SAFETY_LINEAGE_MISSING,
      severity: SEV.ERROR,
      message: 'classification lineage_refs empty',
    });
  }
  // hard_block_required implies action=BLOCK_OUTPUT.
  if (
    cls.hard_block_required &&
    cls.required_action !== L13SafetyAction.BLOCK_OUTPUT
  ) {
    issues.push({
      code: L13SafetyViolationCode.L13Y_BLOCK_REQUIRED_BUT_OUTPUT_CONTINUED,
      severity: SEV.CRITICAL,
      message:
        'hard_block_required=true but required_action != BLOCK_OUTPUT',
    });
  }
  if (
    cls.refusal_required &&
    cls.required_action === L13SafetyAction.ALLOW
  ) {
    issues.push({
      code: L13SafetyViolationCode.L13Y_REFUSAL_REQUIRED_BUT_NOT_EMITTED,
      severity: SEV.CRITICAL,
      message: 'refusal_required=true but required_action=ALLOW',
    });
  }
  if (
    cls.safe_informational &&
    cls.highest_risk_class !== L13SafetyRiskClass.SAFE_INFORMATIONAL
  ) {
    issues.push({
      code: L13SafetyViolationCode.L13Y_SAFETY_CLASSIFICATION_MISSING,
      severity: SEV.CRITICAL,
      message:
        'safe_informational=true but highest_risk_class differs',
    });
  }
  return l13SafetyResult(issues);
}

// ── Final safety gate validator ─────────────────────────────────────

export function validateL13FinalSafetyGateResult(
  gate: L13FinalSafetyGateResult,
): L13SafetyValidationResult {
  const issues: L13SafetyIssue[] = [];
  if (!gate.safety_gate_result_id) {
    issues.push({
      code: L13SafetyViolationCode.L13Y_FINAL_SAFETY_GATE_MISSING,
      severity: SEV.CRITICAL,
      message: 'safety_gate_result_id missing',
    });
  }
  if (!gate.replay_hash) {
    issues.push({
      code: L13SafetyViolationCode.L13Y_SAFETY_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'safety gate replay_hash missing',
    });
  }
  if (gate.lineage_refs.length === 0) {
    issues.push({
      code: L13SafetyViolationCode.L13Y_SAFETY_LINEAGE_MISSING,
      severity: SEV.ERROR,
      message: 'safety gate lineage_refs empty',
    });
  }
  const userEmitting = l13IsUserEmittingSafetyDecision(
    gate.safety_emission_decision,
  );
  if (gate.may_continue_to_l13_6_final_gate !== userEmitting) {
    issues.push({
      code: L13SafetyViolationCode.L13Y_SAFETY_GATE_NOT_CONSUMED_BY_FINAL_GATE,
      severity: SEV.CRITICAL,
      message:
        'may_continue_to_l13_6_final_gate does not match emission decision',
    });
  }
  if (
    gate.safety_emission_decision ===
      L13SafetyEmissionDecision.SAFETY_BLOCK_OUTPUT &&
    !gate.block_required
  ) {
    issues.push({
      code: L13SafetyViolationCode.L13Y_BLOCK_REQUIRED_BUT_OUTPUT_CONTINUED,
      severity: SEV.CRITICAL,
      message:
        'SAFETY_BLOCK_OUTPUT decision but block_required=false',
    });
  }
  if (
    gate.safety_emission_decision ===
      L13SafetyEmissionDecision.SAFETY_REFUSAL_REQUIRED &&
    !gate.refusal_required
  ) {
    issues.push({
      code: L13SafetyViolationCode.L13Y_REFUSAL_REQUIRED_BUT_NOT_EMITTED,
      severity: SEV.CRITICAL,
      message:
        'SAFETY_REFUSAL_REQUIRED decision but refusal_required=false',
    });
  }
  if (
    gate.safety_emission_decision ===
      L13SafetyEmissionDecision.SAFETY_REWRITE_REQUIRED &&
    !gate.rewrite_required
  ) {
    issues.push({
      code: L13SafetyViolationCode.L13Y_REWRITE_REQUIRED_BUT_EMITTED,
      severity: SEV.CRITICAL,
      message:
        'SAFETY_REWRITE_REQUIRED decision but rewrite_required=false',
    });
  }
  return l13SafetyResult(issues);
}
