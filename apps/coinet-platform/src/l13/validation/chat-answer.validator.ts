/**
 * L13.7 — Chat Answer Validator
 *
 * §13.7.10 / §13.7.18 — Validates an `L13ChatAnswerOutput`. Returns
 * structured issues and never mutates the payload.
 */

import type { L13ChatAnswerOutput } from '../contracts/chat-answer-output';
import { L13UserIntentClass } from '../contracts/user-intent-binding';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13ProductAnswerMode } from '../contracts/product-answer-mode';
import { L13RawMetricDisclosurePolicy } from '../contracts/product-answer-mode';
import { getL13AnswerModeDefinition } from '../outputs/answer-mode.registry';
import { L13ModeViolationCode } from './l13-mode-violation-codes';
import {
  l13ModeResult,
  type L13ModeIssue,
  type L13ModeValidationResult,
} from './_l13-mode-issue';

const SEV = L13ViolationSeverity;

export interface L13ChatAnswerValidationContext {
  readonly active_contradiction_required: boolean;
  readonly active_uncertainty_required: boolean;
  readonly active_invalidation_present: boolean;
  readonly unresolved_trigger_present: boolean;
}

export function validateL13ChatAnswer(
  payload: L13ChatAnswerOutput,
  ctx: L13ChatAnswerValidationContext,
): L13ModeValidationResult {
  const issues: L13ModeIssue[] = [];
  if (!payload.chat_answer_id) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_PAYLOAD_MISSING,
      severity: SEV.CRITICAL,
      message: 'chat_answer_id missing',
    });
  }
  if (!payload.replay_hash) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'replay_hash missing',
    });
  }
  if (payload.lineage_refs.length === 0) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_LINEAGE_MISSING,
      severity: SEV.CRITICAL,
      message: 'lineage_refs empty',
    });
  }
  if (
    !payload.direct_answer ||
    payload.direct_answer.trim().length === 0
  ) {
    issues.push({
      code: L13ModeViolationCode.L13M_CHAT_DIRECT_ANSWER_MISSING,
      severity: SEV.CRITICAL,
      message: 'direct_answer missing',
    });
  }
  const def = getL13AnswerModeDefinition(payload.answer_mode);
  if (!def) {
    issues.push({
      code: L13ModeViolationCode.L13M_ANSWER_MODE_UNREGISTERED,
      severity: SEV.CRITICAL,
      message: `answer_mode ${payload.answer_mode} not registered`,
    });
  } else {
    if (!def.supported_intents.includes(payload.intent_class)) {
      issues.push({
        code: L13ModeViolationCode.L13M_CHAT_IGNORES_USER_INTENT,
        severity: SEV.CRITICAL,
        message: `answer_mode ${payload.answer_mode} does not support intent ${payload.intent_class}`,
      });
    }
    // Raw-metric policy enforcement.
    if (
      payload.raw_metrics_included &&
      def.raw_metric_disclosure_policy ===
        L13RawMetricDisclosurePolicy.FORBIDDEN_BY_DEFAULT
    ) {
      issues.push({
        code: L13ModeViolationCode.L13M_CHAT_RAW_METRIC_DUMP_UNREQUESTED,
        severity: SEV.CRITICAL,
        message: `raw_metrics_included=true but mode policy is FORBIDDEN_BY_DEFAULT`,
      });
    }
    if (
      payload.raw_metrics_included &&
      def.raw_metric_disclosure_policy ===
        L13RawMetricDisclosurePolicy.ALLOWED_ONLY_WHEN_USER_REQUESTS &&
      !payload.raw_metric_disclosure_reason
    ) {
      issues.push({
        code: L13ModeViolationCode.L13M_CHAT_RAW_METRIC_DUMP_UNREQUESTED,
        severity: SEV.CRITICAL,
        message:
          'raw metrics included under ALLOWED_ONLY_WHEN_USER_REQUESTS but no raw_metric_disclosure_reason recorded',
      });
    }
  }

  // §13.7.10.4 — WHATS_NEXT must include scenario + triggers +
  // invalidations.
  if (payload.intent_class === L13UserIntentClass.WHATS_NEXT) {
    if (payload.scenario_watchpoints.length === 0) {
      issues.push({
        code: L13ModeViolationCode.L13M_WHAT_NEXT_WITHOUT_SCENARIO,
        severity: SEV.CRITICAL,
        message:
          'WHATS_NEXT chat answer missing scenario watchpoints',
      });
    }
    if (payload.trigger_lines.length === 0) {
      issues.push({
        code: L13ModeViolationCode.L13M_WHAT_NEXT_WITHOUT_TRIGGER,
        severity: SEV.CRITICAL,
        message: 'WHATS_NEXT chat answer missing trigger lines',
      });
    }
    if (
      ctx.active_invalidation_present &&
      payload.invalidation_lines.length === 0
    ) {
      issues.push({
        code: L13ModeViolationCode.L13M_WHAT_NEXT_WITHOUT_INVALIDATION,
        severity: SEV.CRITICAL,
        message:
          'WHATS_NEXT chat answer missing invalidation lines while invalidation is active',
      });
    }
  }

  // Disclosure obligations.
  if (
    ctx.active_contradiction_required &&
    payload.contradiction_lines.length === 0
  ) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_REQUIRED_DISCLOSURE_MISSING,
      severity: SEV.CRITICAL,
      message:
        'active contradiction present but chat contradiction_lines empty',
    });
  }
  if (
    ctx.active_uncertainty_required &&
    payload.uncertainty_lines.length === 0
  ) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_REQUIRED_DISCLOSURE_MISSING,
      severity: SEV.CRITICAL,
      message:
        'uncertainty disclosure required but chat uncertainty_lines empty',
    });
  }

  // §13.7.10.5 — Length guidance (advisory).
  const totalLen = payload.direct_answer.length;
  if (
    payload.answer_mode === L13ProductAnswerMode.SHORT_CHAT &&
    totalLen > 600
  ) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_READINESS_ILLEGAL,
      severity: SEV.WARNING,
      message:
        'SHORT_CHAT direct_answer materially exceeds concise length target',
    });
  }

  return l13ModeResult(issues);
}
