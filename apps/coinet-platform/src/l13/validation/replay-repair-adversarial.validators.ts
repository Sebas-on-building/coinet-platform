/**
 * L13.11 — Replay / Repair / Adversarial Validators
 *
 * §13.11.8 / §13.11.12 / §13.11.18 — Per-shape validators
 * enforcing the replay law, repair may/may-not law, and
 * adversarial expectation law.
 */

import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import {
  L13ReplayMode,
  L13ReplayStatus,
  type L13ReplayResult,
} from '../contracts/l13-replay-result';
import type { L13RepairResult } from '../contracts/l13-repair-request';
import {
  L13ActualAdversarialOutcome,
  L13ExpectedAdversarialOutcome,
  L13RegressionSeverity,
  type L13AdversarialCaseResult,
  type L13AdversarialSuiteResult,
  type L13PromptInjectionAssessment,
  type L13RegressionCheckResult,
} from '../contracts/l13-adversarial';
import type { L13SemanticDriftAssessment } from '../contracts/l13-semantic-drift-assessment';
import { L13ReplayRepairAdversarialViolationCode as C } from './l13-replay-repair-adversarial-violation-codes';

const SEV = L13ViolationSeverity;

export interface L13RPAIssue {
  readonly code: L13ReplayRepairAdversarialViolationCode;
  readonly severity: L13ViolationSeverity;
  readonly message: string;
}

export interface L13RPAValidationResult {
  readonly clean: boolean;
  readonly issues: readonly L13RPAIssue[];
}

import { L13ReplayRepairAdversarialViolationCode } from './l13-replay-repair-adversarial-violation-codes';

function result(issues: readonly L13RPAIssue[]): L13RPAValidationResult {
  return { clean: issues.length === 0, issues };
}

// ── Replay result ───────────────────────────────────────────────────

export function validateL13ReplayResult(
  r: L13ReplayResult,
): L13RPAValidationResult {
  const issues: L13RPAIssue[] = [];
  if (!r.replay_result_id) {
    issues.push({ code: C.L13RPA_REPLAY_RESULT_MISSING, severity: SEV.CRITICAL, message: 'replay_result_id missing' });
  }
  if (!r.replay_hash) {
    issues.push({ code: C.L13RPA_REPLAY_HASH_MISSING, severity: SEV.CRITICAL, message: 'replay replay_hash missing' });
  }
  if (r.lineage_refs.length === 0) {
    issues.push({ code: C.L13RPA_LINEAGE_MISSING, severity: SEV.ERROR, message: 'replay lineage_refs empty' });
  }
  if (
    r.replay_mode === L13ReplayMode.CAPTURED_RESPONSE_REPLAY &&
    !r.captured_provider_artifact_match &&
    r.replay_status === L13ReplayStatus.CAPTURED_REPLAY_MATCH
  ) {
    issues.push({
      code: C.L13RPA_CAPTURED_REPLAY_WITHOUT_PROVIDER_ARTIFACT,
      severity: SEV.CRITICAL,
      message: 'captured replay match claimed without provider artifact match',
    });
  }
  if (
    r.legal_drift_detected &&
    r.mismatch_reason_codes.length === 0
  ) {
    issues.push({
      code: C.L13RPA_REPLAY_MISMATCH_REASON_MISSING,
      severity: SEV.CRITICAL,
      message: 'legal drift declared without mismatch reason codes',
    });
  }
  if (r.replay_status === L13ReplayStatus.REPLAY_FAILED_INCOMPLETE_SUBSTRATE) {
    issues.push({
      code: C.L13RPA_REPLAY_SUBSTRATE_INCOMPLETE,
      severity: SEV.CRITICAL,
      message: 'replay substrate incomplete',
    });
  }
  return result(issues);
}

// ── Repair result ──────────────────────────────────────────────────

export function validateL13RepairResult(
  r: L13RepairResult,
): L13RPAValidationResult {
  const issues: L13RPAIssue[] = [];
  if (!r.repair_result_id) {
    issues.push({ code: C.L13RPA_REPAIR_REQUEST_MISSING, severity: SEV.CRITICAL, message: 'repair_result_id missing' });
  }
  if (!r.replay_hash) {
    issues.push({ code: C.L13RPA_REPLAY_HASH_MISSING, severity: SEV.CRITICAL, message: 'repair replay_hash missing' });
  }
  if (!r.original_output_preserved) {
    issues.push({ code: C.L13RPA_REPAIR_MUTATED_OLD_OUTPUT, severity: SEV.CRITICAL, message: 'original output not preserved' });
  }
  if (r.invented_evidence_detected) {
    issues.push({ code: C.L13RPA_REPAIR_INVENTED_EVIDENCE, severity: SEV.CRITICAL, message: 'repair invented evidence' });
  }
  if (!r.contradiction_disclosure_preserved) {
    issues.push({ code: C.L13RPA_REPAIR_REMOVED_CONTRADICTION, severity: SEV.CRITICAL, message: 'repair removed contradiction disclosure' });
  }
  if (r.confidence_upgrade_without_support_detected) {
    issues.push({ code: C.L13RPA_REPAIR_UPGRADED_CONFIDENCE_WITHOUT_SUPPORT, severity: SEV.CRITICAL, message: 'repair upgraded confidence without lower-layer support' });
  }
  return result(issues);
}

// ── Prompt injection ───────────────────────────────────────────────

export function validateL13PromptInjectionAssessment(
  a: L13PromptInjectionAssessment,
): L13RPAValidationResult {
  const issues: L13RPAIssue[] = [];
  if (!a.replay_hash) {
    issues.push({ code: C.L13RPA_REPLAY_HASH_MISSING, severity: SEV.CRITICAL, message: 'injection assessment replay_hash missing' });
  }
  if (a.detected && a.matched_patterns.length === 0) {
    issues.push({
      code: C.L13RPA_PROMPT_INJECTION_NOT_DETECTED,
      severity: SEV.CRITICAL,
      message: 'detected=true but no matched patterns',
    });
  }
  return result(issues);
}

// ── Adversarial case ───────────────────────────────────────────────

export function validateL13AdversarialCase(
  c: L13AdversarialCaseResult,
): L13RPAValidationResult {
  const issues: L13RPAIssue[] = [];
  if (!c.adversarial_case_result_id) {
    issues.push({ code: C.L13RPA_REPLAY_HASH_MISSING, severity: SEV.CRITICAL, message: 'case id missing' });
  }
  if (!c.replay_hash) {
    issues.push({ code: C.L13RPA_REPLAY_HASH_MISSING, severity: SEV.CRITICAL, message: 'case replay_hash missing' });
  }
  // Expectation NOT met → emit the most-specific RPA code for the class.
  if (!c.expectation_met && c.expected_outcome !== L13ExpectedAdversarialOutcome.SAFELY_ANSWER) {
    if (c.actual_outcome === L13ActualAdversarialOutcome.SAFELY_ANSWERED) {
      issues.push({
        code: C.L13RPA_BUY_SELL_ADVERSARIAL_NOT_BLOCKED,
        severity: SEV.CRITICAL,
        message: `adversarial fixture ${c.fixture_id} not rejected`,
      });
    }
  }
  return result(issues);
}

export function validateL13AdversarialSuite(
  s: L13AdversarialSuiteResult,
): L13RPAValidationResult {
  const issues: L13RPAIssue[] = [];
  if (!s.suite_green) {
    for (const c of s.case_results) {
      if (!c.expectation_met) {
        const r = validateL13AdversarialCase(c);
        issues.push(...r.issues);
      }
    }
  }
  return result(issues);
}

// ── Regression ─────────────────────────────────────────────────────

export function validateL13RegressionResult(
  r: L13RegressionCheckResult,
): L13RPAValidationResult {
  const issues: L13RPAIssue[] = [];
  if (!r.regression_check_result_id) {
    issues.push({ code: C.L13RPA_REGRESSION_RESULT_MISSING, severity: SEV.CRITICAL, message: 'regression result id missing' });
  }
  if (
    r.severity === L13RegressionSeverity.ROLLOUT_BLOCKING &&
    !r.blocks_rollout
  ) {
    issues.push({
      code: C.L13RPA_ROLLOUT_BLOCKING_REGRESSION_IGNORED,
      severity: SEV.CRITICAL,
      message: 'rollout-blocking severity but blocks_rollout=false',
    });
  }
  return result(issues);
}

// ── Semantic drift ─────────────────────────────────────────────────

export function validateL13SemanticDriftAssessment(
  a: L13SemanticDriftAssessment,
): L13RPAValidationResult {
  const issues: L13RPAIssue[] = [];
  if (!a.semantic_drift_assessment_id) {
    issues.push({ code: C.L13RPA_SEMANTIC_DRIFT_HIDDEN, severity: SEV.CRITICAL, message: 'drift assessment id missing' });
  }
  if (a.drift_detected && a.drift_classes.length === 0) {
    issues.push({ code: C.L13RPA_SEMANTIC_DRIFT_HIDDEN, severity: SEV.CRITICAL, message: 'drift_detected=true with no drift_classes' });
  }
  if (!a.replay_hash) {
    issues.push({ code: C.L13RPA_REPLAY_HASH_MISSING, severity: SEV.CRITICAL, message: 'drift replay_hash missing' });
  }
  return result(issues);
}
