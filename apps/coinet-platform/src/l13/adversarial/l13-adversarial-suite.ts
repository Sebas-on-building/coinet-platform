/**
 * L13.11 — Adversarial Suite Runner
 *
 * §13.11.24 / §13.11.25 — Iterates over the fixtures, runs each
 * through prompt-injection detection + the L13.9 safety pipeline,
 * compares actual vs expected, emits the suite result.
 */

import { L13ProductAnswerMode } from '../contracts/product-answer-mode';
import {
  L13ActualAdversarialOutcome,
  L13AdversarialTestClass,
  L13ExpectedAdversarialOutcome,
  L13PromptInjectionRuntimeAction,
  type L13AdversarialCaseResult,
  type L13AdversarialSuiteResult,
} from '../contracts/l13-adversarial';
import {
  classifyL13OutputSafety,
  runL13AdviceAdjacentRewriter,
  runL13FinalSafetyGate,
  runL13NonRecommendationEngine,
  runL13SafetyScan,
} from '../safety';
import { fnv1a } from '../context/_fnv1a';
import { detectL13PromptInjection } from './prompt-injection-detector';
import { L13_ADVERSARIAL_FIXTURES, type L13AdversarialFixture } from './fixtures';

const POLICY_V = 'l13.adversarial.v1';

const SUITE_VERSION = 'l13.adversarial.suite.v1';

function safetyPipeline(corpus: string) {
  const output_id = 'l13.adv.out';
  const styled_response_ref = 'l13.adv.styled';
  const product_answer_mode = L13ProductAnswerMode.STANDARD_CHAT;
  const scan = runL13SafetyScan({
    output_id,
    styled_response_ref,
    product_answer_mode,
    user_visible_corpus: corpus,
  });
  const nonRec = runL13NonRecommendationEngine({
    output_id,
    user_visible_corpus: corpus,
    product_answer_mode,
  });
  const cls = classifyL13OutputSafety({
    output_id,
    styled_response_ref,
    user_visible_corpus: corpus,
    safety_scan: scan,
    non_recommendation: nonRec,
  });
  const rewrite = runL13AdviceAdjacentRewriter({
    original_output_ref: output_id,
    user_visible_corpus: corpus,
    source_risk_classes: cls.all_risk_classes,
  });
  const gate = runL13FinalSafetyGate({
    output_id,
    styled_response_ref,
    safety_classification: cls,
    non_recommendation: nonRec,
    rewrite_result: rewrite,
  });
  return { scan, nonRec, cls, rewrite, gate };
}

function evaluateFixture(
  fixture: L13AdversarialFixture,
): L13AdversarialCaseResult {
  // Run prompt-injection detection on the user request.
  const injection = detectL13PromptInjection({
    request_id: `l13.req.${fixture.fixture_id}`,
    user_request_text: fixture.user_request_text,
  });
  // Run safety pipeline on the synthetic output corpus, if any.
  const corpus = fixture.synthetic_output_corpus ?? '';
  const safety = corpus ? safetyPipeline(corpus) : undefined;

  let actual: L13ActualAdversarialOutcome;

  // Decide the actual outcome. Precedence:
  //   1. injection HARD_BLOCK              → REJECTED_BLOCK
  //   2. safety BLOCK_OUTPUT decision      → REJECTED_BLOCK
  //   3. safety REFUSAL                    → REJECTED_REFUSAL
  //   4. injection ROUTE_TO_REFUSAL        → REJECTED_REFUSAL
  //   5. injection ROUTE_TO_REWRITE        → REJECTED_REWRITE
  //   6. safety REWRITE                    → REJECTED_REWRITE
  //   7. malformed package (empty request) → REJECTED_REFUSAL
  //   8. otherwise                         → SAFELY_ANSWERED
  if (
    injection.recommended_runtime_action ===
    L13PromptInjectionRuntimeAction.HARD_BLOCK
  ) {
    actual = L13ActualAdversarialOutcome.REJECTED_BLOCK;
  } else if (safety && safety.gate.block_required) {
    actual = L13ActualAdversarialOutcome.REJECTED_BLOCK;
  } else if (safety && safety.gate.refusal_required) {
    actual = L13ActualAdversarialOutcome.REJECTED_REFUSAL;
  } else if (
    injection.recommended_runtime_action ===
    L13PromptInjectionRuntimeAction.ROUTE_TO_REFUSAL
  ) {
    actual = L13ActualAdversarialOutcome.REJECTED_REFUSAL;
  } else if (
    injection.recommended_runtime_action ===
    L13PromptInjectionRuntimeAction.ROUTE_TO_REWRITE
  ) {
    actual = L13ActualAdversarialOutcome.REJECTED_REWRITE;
  } else if (safety && safety.gate.rewrite_required) {
    actual = L13ActualAdversarialOutcome.REJECTED_REWRITE;
  } else if (
    fixture.adversarial_test_class ===
      L13AdversarialTestClass.MALFORMED_INPUT_PACKAGE &&
    fixture.user_request_text.trim().length === 0
  ) {
    actual = L13ActualAdversarialOutcome.REJECTED_REFUSAL;
  } else if (
    fixture.adversarial_test_class ===
      L13AdversarialTestClass.MISSING_EVIDENCE &&
    safety &&
    !safety.gate.may_continue_to_l13_6_final_gate
  ) {
    actual = L13ActualAdversarialOutcome.REJECTED_REWRITE;
  } else if (
    safety &&
    !safety.gate.may_continue_to_l13_6_final_gate
  ) {
    actual = L13ActualAdversarialOutcome.REJECTED_REFUSAL;
  } else {
    actual = L13ActualAdversarialOutcome.SAFELY_ANSWERED;
  }

  // Expectation comparison. Any "REJECT_*" expected outcome is
  // satisfied by any REJECTED_* actual outcome (governed rejection
  // is the law; specific rejection class is informational).
  const expected = fixture.expected_outcome;
  const expectationMet =
    expected === L13ExpectedAdversarialOutcome.SAFELY_ANSWER
      ? actual === L13ActualAdversarialOutcome.SAFELY_ANSWERED
      : actual === L13ActualAdversarialOutcome.REJECTED_BLOCK ||
        actual === L13ActualAdversarialOutcome.REJECTED_REFUSAL ||
        actual === L13ActualAdversarialOutcome.REJECTED_REWRITE;

  const replayHash = fnv1a(
    [
      fixture.fixture_id,
      fixture.adversarial_test_class,
      expected,
      actual,
      String(expectationMet),
      safety?.gate.safety_emission_decision ?? '',
      injection.recommended_runtime_action,
      POLICY_V,
    ].join('|'),
  );

  return {
    adversarial_case_result_id: `l13.adv.case.${replayHash}`,
    adversarial_test_class: fixture.adversarial_test_class,
    fixture_id: fixture.fixture_id,
    expected_outcome: expected,
    actual_outcome: actual,
    expectation_met: expectationMet,
    safety_gate_decision: safety?.gate.safety_emission_decision,
    final_gate_decision: undefined,
    replay_result_ref: undefined,
    violation_refs: [],
    lineage_refs: ['l13.adversarial.lineage'],
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}

export interface L13AdversarialSuiteInput {
  readonly fixtures?: readonly L13AdversarialFixture[];
  readonly lineage_refs?: readonly string[];
}

export function runL13AdversarialSuite(
  input: L13AdversarialSuiteInput = {},
): L13AdversarialSuiteResult {
  const fixtures = input.fixtures ?? L13_ADVERSARIAL_FIXTURES;
  const lineage = input.lineage_refs ?? ['l13.adversarial.lineage'];
  const caseResults = fixtures.map(evaluateFixture);
  let passed = 0;
  let failedC = 0;
  let blocked = 0;
  let refused = 0;
  let rewritten = 0;
  let safelyAnswered = 0;
  for (const c of caseResults) {
    if (c.expectation_met) passed += 1;
    else failedC += 1;
    switch (c.actual_outcome) {
      case L13ActualAdversarialOutcome.REJECTED_BLOCK:
        blocked += 1;
        break;
      case L13ActualAdversarialOutcome.REJECTED_REFUSAL:
        refused += 1;
        break;
      case L13ActualAdversarialOutcome.REJECTED_REWRITE:
        rewritten += 1;
        break;
      case L13ActualAdversarialOutcome.SAFELY_ANSWERED:
        safelyAnswered += 1;
        break;
      default:
        break;
    }
  }
  const replayHash = fnv1a(
    [
      SUITE_VERSION,
      String(fixtures.length),
      caseResults
        .map(c => c.adversarial_case_result_id)
        .sort()
        .join(','),
      String(passed),
      String(failedC),
      POLICY_V,
    ].join('|'),
  );
  return {
    adversarial_suite_result_id: `l13.adv.suite.${replayHash}`,
    suite_version: SUITE_VERSION,
    total_cases: fixtures.length,
    passed_cases: passed,
    failed_cases: failedC,
    blocked_cases: blocked,
    refused_cases: refused,
    rewritten_cases: rewritten,
    safely_answered_cases: safelyAnswered,
    case_results: caseResults,
    suite_green: failedC === 0,
    lineage_refs: lineage,
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}
