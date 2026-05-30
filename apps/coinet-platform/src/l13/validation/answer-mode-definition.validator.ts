/**
 * L13.7 — Answer Mode Definition Validator
 *
 * §13.7.6 — Validates `L13AnswerModeDefinition` entries from the
 * answer-mode registry. Each production-enabled mode must declare
 * legal intents, required sections, disclosures, and obey the
 * debug-internal-only rule.
 */

import {
  L13AnswerModeStatus,
  L13ProductAnswerMode,
} from '../contracts/product-answer-mode';
import type { L13AnswerModeDefinition } from '../contracts/answer-mode-definition';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13ModeViolationCode } from './l13-mode-violation-codes';
import {
  l13ModeResult,
  type L13ModeIssue,
  type L13ModeValidationResult,
} from './_l13-mode-issue';

const SEV = L13ViolationSeverity;

export function validateL13AnswerModeDefinition(
  def: L13AnswerModeDefinition,
): L13ModeValidationResult {
  const issues: L13ModeIssue[] = [];
  if (!def.replay_hash) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'replay_hash missing on mode definition',
    });
  }
  if (def.answer_mode === L13ProductAnswerMode.DEBUG_EXPLANATION) {
    if (def.answer_mode_status !== L13AnswerModeStatus.INTERNAL_ONLY) {
      issues.push({
        code: L13ModeViolationCode.L13M_ANSWER_MODE_STATUS_ILLEGAL,
        severity: SEV.CRITICAL,
        message: 'DEBUG_EXPLANATION must be INTERNAL_ONLY',
      });
    }
    return l13ModeResult(issues);
  }
  if (
    def.answer_mode_status === L13AnswerModeStatus.PRODUCTION_ENABLED ||
    def.answer_mode_status ===
      L13AnswerModeStatus.PRODUCTION_ENABLED_WITH_RESTRICTIONS
  ) {
    if (def.supported_intents.length === 0) {
      issues.push({
        code: L13ModeViolationCode.L13M_ANSWER_MODE_UNREGISTERED,
        severity: SEV.CRITICAL,
        message:
          'production answer mode must declare at least one supported intent',
      });
    }
    if (def.supported_output_classes.length === 0) {
      issues.push({
        code: L13ModeViolationCode.L13M_ANSWER_MODE_UNREGISTERED,
        severity: SEV.CRITICAL,
        message:
          'production answer mode must declare at least one supported output class',
      });
    }
    if (def.required_l13_output_sections.length === 0) {
      issues.push({
        code: L13ModeViolationCode.L13M_MODE_REQUIRED_SECTION_MISSING,
        severity: SEV.CRITICAL,
        message:
          'production answer mode must declare at least one required output section',
      });
    }
    if (def.required_disclosure_classes.length === 0) {
      issues.push({
        code: L13ModeViolationCode.L13M_MODE_REQUIRED_DISCLOSURE_MISSING,
        severity: SEV.CRITICAL,
        message:
          'production answer mode must declare at least one required disclosure',
      });
    }
  }
  return l13ModeResult(issues);
}
