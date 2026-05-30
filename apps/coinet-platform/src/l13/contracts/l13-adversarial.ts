/**
 * L13.11 — Adversarial + Injection + Regression Contracts
 *
 * §13.11.19–§13.11.27 — Closed sets for adversarial test classes,
 * prompt-injection classes/targets/actions, regression classes
 * and severities, plus the durable result shapes.
 */

export enum L13AdversarialTestClass {
  PROMPT_INJECTION = 'PROMPT_INJECTION',
  TRADE_ADVICE_REQUEST = 'TRADE_ADVICE_REQUEST',
  CERTAINTY_REQUEST = 'CERTAINTY_REQUEST',
  CONTRADICTION_SUPPRESSION_REQUEST = 'CONTRADICTION_SUPPRESSION_REQUEST',
  BULLISH_BEARISH_COLLAPSE_REQUEST = 'BULLISH_BEARISH_COLLAPSE_REQUEST',
  RISK_BYPASS_REQUEST = 'RISK_BYPASS_REQUEST',
  MALFORMED_INPUT_PACKAGE = 'MALFORMED_INPUT_PACKAGE',
  MISSING_EVIDENCE = 'MISSING_EVIDENCE',
  MISSING_L12_SCENARIO = 'MISSING_L12_SCENARIO',
  CONFLICTING_SCENARIO_PATHS = 'CONFLICTING_SCENARIO_PATHS',
  HIDDEN_INVALIDATION = 'HIDDEN_INVALIDATION',
  LANGUAGE_SWITCHING_ATTACK = 'LANGUAGE_SWITCHING_ATTACK',
  UNSUPPORTED_CLAIM_GENERATION = 'UNSUPPORTED_CLAIM_GENERATION',
  RECOMMENDATION_THROUGH_COMPARISON = 'RECOMMENDATION_THROUGH_COMPARISON',
  STYLE_AS_TRUTH_BYPASS = 'STYLE_AS_TRUTH_BYPASS',
  SAFETY_GROUNDING_NON_SUBSTITUTION_ATTACK = 'SAFETY_GROUNDING_NON_SUBSTITUTION_ATTACK',
}

export const ALL_L13_ADVERSARIAL_TEST_CLASSES:
  readonly L13AdversarialTestClass[] =
  Object.values(L13AdversarialTestClass);

export enum L13PromptInjectionClass {
  INSTRUCTION_OVERRIDE = 'INSTRUCTION_OVERRIDE',
  ROLE_REASSIGNMENT = 'ROLE_REASSIGNMENT',
  DISCLOSURE_SUPPRESSION = 'DISCLOSURE_SUPPRESSION',
  CERTAINTY_DEMAND = 'CERTAINTY_DEMAND',
  ADVICE_DEMAND = 'ADVICE_DEMAND',
  RAW_DATA_EXTRACTION = 'RAW_DATA_EXTRACTION',
}

export const ALL_L13_PROMPT_INJECTION_CLASSES:
  readonly L13PromptInjectionClass[] =
  Object.values(L13PromptInjectionClass);

export enum L13PromptInjectionOverrideTarget {
  IGNORE_CONSTITUTION = 'IGNORE_CONSTITUTION',
  IGNORE_RESTRICTIONS = 'IGNORE_RESTRICTIONS',
  IGNORE_CONTRADICTIONS = 'IGNORE_CONTRADICTIONS',
  IGNORE_UNCERTAINTY = 'IGNORE_UNCERTAINTY',
  EMIT_RECOMMENDATION = 'EMIT_RECOMMENDATION',
  EMIT_CERTAINTY = 'EMIT_CERTAINTY',
  BYPASS_SAFETY_GATE = 'BYPASS_SAFETY_GATE',
  BYPASS_GROUNDING_GATE = 'BYPASS_GROUNDING_GATE',
  OUTPUT_RAW_ENGINE_DATA = 'OUTPUT_RAW_ENGINE_DATA',
}

export const ALL_L13_PROMPT_INJECTION_OVERRIDE_TARGETS:
  readonly L13PromptInjectionOverrideTarget[] =
  Object.values(L13PromptInjectionOverrideTarget);

export enum L13PromptInjectionRuntimeAction {
  ALLOW_AFTER_FLAG = 'ALLOW_AFTER_FLAG',
  ROUTE_TO_REFUSAL = 'ROUTE_TO_REFUSAL',
  ROUTE_TO_REWRITE = 'ROUTE_TO_REWRITE',
  HARD_BLOCK = 'HARD_BLOCK',
}

export interface L13PromptInjectionAssessment {
  readonly prompt_injection_assessment_id: string;
  readonly request_id: string;
  readonly detected: boolean;
  readonly injection_classes: readonly L13PromptInjectionClass[];
  readonly matched_patterns: readonly string[];
  readonly attempted_override_targets:
    readonly L13PromptInjectionOverrideTarget[];
  readonly recommended_runtime_action: L13PromptInjectionRuntimeAction;
  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
  readonly replay_hash: string;
}

export enum L13ExpectedAdversarialOutcome {
  REJECT_REFUSAL = 'REJECT_REFUSAL',
  REJECT_BLOCK = 'REJECT_BLOCK',
  REJECT_REWRITE = 'REJECT_REWRITE',
  SAFELY_ANSWER = 'SAFELY_ANSWER',
}

export enum L13ActualAdversarialOutcome {
  REJECTED_REFUSAL = 'REJECTED_REFUSAL',
  REJECTED_BLOCK = 'REJECTED_BLOCK',
  REJECTED_REWRITE = 'REJECTED_REWRITE',
  SAFELY_ANSWERED = 'SAFELY_ANSWERED',
  LEAKED_UNSAFE = 'LEAKED_UNSAFE',
  PIPELINE_ERROR = 'PIPELINE_ERROR',
}

export interface L13AdversarialCaseResult {
  readonly adversarial_case_result_id: string;
  readonly adversarial_test_class: L13AdversarialTestClass;
  readonly fixture_id: string;
  readonly expected_outcome: L13ExpectedAdversarialOutcome;
  readonly actual_outcome: L13ActualAdversarialOutcome;
  readonly expectation_met: boolean;
  readonly safety_gate_decision?: string;
  readonly final_gate_decision?: string;
  readonly replay_result_ref?: string;
  readonly violation_refs: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
  readonly replay_hash: string;
}

export interface L13AdversarialSuiteResult {
  readonly adversarial_suite_result_id: string;
  readonly suite_version: string;
  readonly total_cases: number;
  readonly passed_cases: number;
  readonly failed_cases: number;
  readonly blocked_cases: number;
  readonly refused_cases: number;
  readonly rewritten_cases: number;
  readonly safely_answered_cases: number;
  readonly case_results: readonly L13AdversarialCaseResult[];
  readonly suite_green: boolean;
  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
  readonly replay_hash: string;
}

export enum L13RegressionClass {
  GROUNDING_REGRESSION = 'GROUNDING_REGRESSION',
  DISCLOSURE_REGRESSION = 'DISCLOSURE_REGRESSION',
  SAFETY_REGRESSION = 'SAFETY_REGRESSION',
  STYLE_TRUTH_REGRESSION = 'STYLE_TRUTH_REGRESSION',
  MODE_COMPLETENESS_REGRESSION = 'MODE_COMPLETENESS_REGRESSION',
  REPLAY_STABILITY_REGRESSION = 'REPLAY_STABILITY_REGRESSION',
  REPAIR_AUDITABILITY_REGRESSION = 'REPAIR_AUDITABILITY_REGRESSION',
}

export enum L13RegressionSeverity {
  NONE = 'NONE',
  ADVISORY = 'ADVISORY',
  ERROR = 'ERROR',
  ROLLOUT_BLOCKING = 'ROLLOUT_BLOCKING',
}

export interface L13RegressionCheckResult {
  readonly regression_check_result_id: string;
  readonly baseline_artifact_ref: string;
  readonly candidate_artifact_ref: string;
  readonly regression_class: L13RegressionClass;
  readonly regression_detected: boolean;
  readonly regression_reason_codes: readonly string[];
  readonly severity: L13RegressionSeverity;
  readonly blocks_rollout: boolean;
  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
  readonly replay_hash: string;
}
