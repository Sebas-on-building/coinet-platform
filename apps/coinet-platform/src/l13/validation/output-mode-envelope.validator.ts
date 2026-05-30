/**
 * L13.7 — Output Mode Envelope Validator
 *
 * §13.7.7 / §13.7.21 — Validates the canonical mode envelope and
 * refuses to authorise emission when the envelope contradicts the
 * mode registry, when DEBUG_EXPLANATION is wrapped for the user
 * surface, or when readiness is blocking.
 */

import {
  L13ModePayloadClass,
  L13ModeReadinessClass,
  isL13BlockingModeReadiness,
  type L13OutputModeEnvelope,
} from '../contracts/output-mode-envelope';
import {
  L13AnswerModeStatus,
  L13ProductAnswerMode,
} from '../contracts/product-answer-mode';
import { getL13AnswerModeDefinition } from '../outputs/answer-mode.registry';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13ModeViolationCode } from './l13-mode-violation-codes';
import {
  l13ModeResult,
  type L13ModeIssue,
  type L13ModeValidationResult,
} from './_l13-mode-issue';

const SEV = L13ViolationSeverity;

export interface L13OutputModeEnvelopeValidationContext {
  /**
   * True when the envelope is being emitted to the end-user
   * product surface (as opposed to an internal log).
   */
  readonly user_emission: boolean;
}

export function validateL13OutputModeEnvelope(
  env: L13OutputModeEnvelope,
  ctx: L13OutputModeEnvelopeValidationContext,
): L13ModeValidationResult {
  const issues: L13ModeIssue[] = [];
  if (!env.mode_envelope_id) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_ENVELOPE_MISSING,
      severity: SEV.CRITICAL,
      message: 'mode_envelope_id missing',
    });
  }
  if (!env.replay_hash) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'replay_hash missing',
    });
  }
  if (env.lineage_refs.length === 0) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_LINEAGE_MISSING,
      severity: SEV.CRITICAL,
      message: 'lineage_refs empty',
    });
  }

  const def = getL13AnswerModeDefinition(env.answer_mode);
  if (!def) {
    issues.push({
      code: L13ModeViolationCode.L13M_ANSWER_MODE_UNREGISTERED,
      severity: SEV.CRITICAL,
      message: `answer_mode ${env.answer_mode} not registered`,
    });
  } else {
    // §13.7.4 — INTERNAL_ONLY modes (DEBUG_EXPLANATION) are
    // not bound to the user-facing intent taxonomy; their
    // intent compatibility is enforced by the internal caller.
    // For user-emittable modes the intent must be declared in
    // the registry.
    const isInternalOnly =
      def.answer_mode_status === L13AnswerModeStatus.INTERNAL_ONLY;
    if (
      !isInternalOnly &&
      !def.supported_intents.includes(env.intent_class)
    ) {
      issues.push({
        code: L13ModeViolationCode.L13M_CHAT_IGNORES_USER_INTENT,
        severity: SEV.CRITICAL,
        message: `envelope intent ${env.intent_class} not supported by mode ${env.answer_mode}`,
      });
    }
    if (
      !def.supported_output_classes.includes(env.output_class)
    ) {
      issues.push({
        code: L13ModeViolationCode.L13M_ANSWER_MODE_UNREGISTERED,
        severity: SEV.CRITICAL,
        message: `envelope output_class ${env.output_class} not supported by mode ${env.answer_mode}`,
      });
    }
  }

  // Debug mode law — never user-emittable.
  if (
    env.answer_mode === L13ProductAnswerMode.DEBUG_EXPLANATION &&
    ctx.user_emission
  ) {
    issues.push({
      code: L13ModeViolationCode.L13M_DEBUG_MODE_USER_EMITTED,
      severity: SEV.CRITICAL,
      message:
        'DEBUG_EXPLANATION envelope marked for user emission',
    });
  }
  if (
    env.mode_payload_class === L13ModePayloadClass.DEBUG_EXPLANATION &&
    ctx.user_emission
  ) {
    issues.push({
      code: L13ModeViolationCode.L13M_DEBUG_MODE_USER_EMITTED,
      severity: SEV.CRITICAL,
      message:
        'DEBUG_EXPLANATION payload class marked for user emission',
    });
  }
  if (
    def &&
    def.answer_mode_status === L13AnswerModeStatus.INTERNAL_ONLY &&
    ctx.user_emission
  ) {
    issues.push({
      code: L13ModeViolationCode.L13M_DEBUG_MODE_USER_EMITTED,
      severity: SEV.CRITICAL,
      message:
        'INTERNAL_ONLY mode marked for user emission',
    });
  }

  // Readiness consistency.
  if (
    isL13BlockingModeReadiness(env.mode_readiness) &&
    ctx.user_emission
  ) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_READINESS_ILLEGAL,
      severity: SEV.CRITICAL,
      message: `blocking mode_readiness ${env.mode_readiness} cannot be user-emitted`,
    });
  }
  if (
    env.forbidden_omissions_detected &&
    env.mode_readiness === L13ModeReadinessClass.MODE_READY
  ) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_READINESS_ILLEGAL,
      severity: SEV.CRITICAL,
      message:
        'forbidden_omissions_detected=true but mode_readiness=MODE_READY',
    });
  }
  if (
    !env.required_disclosures_satisfied &&
    env.mode_readiness === L13ModeReadinessClass.MODE_READY
  ) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_READINESS_ILLEGAL,
      severity: SEV.CRITICAL,
      message:
        'required_disclosures_satisfied=false but mode_readiness=MODE_READY',
    });
  }
  if (!env.mode_payload_ref) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_PAYLOAD_MISSING,
      severity: SEV.CRITICAL,
      message: 'mode_payload_ref missing',
    });
  }

  return l13ModeResult(issues);
}
