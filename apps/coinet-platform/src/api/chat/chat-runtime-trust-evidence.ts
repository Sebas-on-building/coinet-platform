/**
 * BTAR-008 — Runtime Trust Evidence Builder + Sanitizer + Assertion
 *
 * Pure, deterministic builder that converts a BTAR-006 `ChatTrustContext` +
 * BTAR-006 `FinalizeChatAIResponseResult` into a metadata-only
 * `ChatRuntimeTrustEvidence` object. Reuses BTAR-003 / BTAR-004 / BTAR-005
 * outputs without duplicating any logic.
 *
 * Authority:
 *   Plan 2.1 §1.2 ("testable" + "user-facing response behavior … explicit")
 *   Plan 2.2 §7.5 (P2-S12) / §15 (telemetry boundary cap)
 *   BTAR-008 §§14–15
 *
 * SCOPE LIMITS (per Plan 2.3 OOS):
 *   - No L13/L14 imports.
 *   - No I/O, no time, no randomness — pure / deterministic.
 *   - No raw prompt / rendered context / user message / API keys / provider
 *     payloads ever stored. `sensitive_fields_stored` is the literal `false`.
 *
 * This is minimal runtime trust evidence, not L14 telemetry, not analytics,
 * and not a calibration system.
 */

import type { JudgmentAvailabilityState } from './judgment-availability.types';
import type {
  BuildChatRuntimeTrustEvidenceInput,
  ChatJudgmentSource,
  ChatRuntimeTrustEvidence,
  ChatRuntimeTrustEvidencePolicyVersion,
} from './chat-runtime-trust-evidence.types';

const RUNTIME_EVIDENCE_POLICY_VERSION: ChatRuntimeTrustEvidencePolicyVersion =
  'chat-runtime-trust-evidence.v1';

const OUTPUT_SAFETY_GATE_POLICY_VERSION = 'ai-output-safety-gate.v1';

// ──────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────

export function buildChatRuntimeTrustEvidence(
  input: BuildChatRuntimeTrustEvidenceInput,
): ChatRuntimeTrustEvidence {
  const { trustContext, finalization } = input;

  const judgment_source = inferJudgmentSource(trustContext.judgment_status);
  const degradation_disclosed =
    trustContext.judgment_status !== 'DEGRADED' ||
    detectDegradationDisclosure(finalization.finalOutput);
  const unavailable_disclosed =
    trustContext.judgment_status !== 'UNAVAILABLE' ||
    detectUnavailableDisclosure(finalization.finalOutput);

  const evidence: ChatRuntimeTrustEvidence = {
    policy_version: RUNTIME_EVIDENCE_POLICY_VERSION,
    judgment_status: trustContext.judgment_status,
    judgment_source,
    degraded_components: [...trustContext.degraded_components],
    failed_components: [...trustContext.failed_components],
    safety_gate_result: finalization.gate.decision,
    safety_gate_violations: [...finalization.gate.violations],
    safety_gate_changed_output: finalization.changed,
    fallback_used: input.fallback_used ?? false,
    degradation_disclosed,
    unavailable_disclosed,
    policy_versions: {
      availability: trustContext.policy_versions.availability,
      prompt_package: trustContext.policy_versions.prompt_package,
      output_safety_gate: OUTPUT_SAFETY_GATE_POLICY_VERSION,
      runtime_evidence: RUNTIME_EVIDENCE_POLICY_VERSION,
    },
    sensitive_fields_stored: false,
    ...(input.judgment_duration_ms !== undefined
      ? { judgment_duration_ms: input.judgment_duration_ms }
      : {}),
    ...(input.judgment_failure_reason !== undefined
      ? { judgment_failure_reason: input.judgment_failure_reason }
      : {}),
    ...(input.ai_provider_used !== undefined
      ? { ai_provider_used: input.ai_provider_used }
      : {}),
  };

  // Self-check sanitization invariants before returning.
  assertNoSensitiveRuntimeEvidence(evidence);
  return evidence;
}

/**
 * Returns a defensive copy with only the allowed fields. Drops any unknown
 * property that may have been added later (forward-compatibility safety).
 */
export function sanitizeChatRuntimeTrustEvidence(
  evidence: ChatRuntimeTrustEvidence,
): ChatRuntimeTrustEvidence {
  const sanitized: ChatRuntimeTrustEvidence = {
    policy_version: evidence.policy_version,
    judgment_status: evidence.judgment_status,
    judgment_source: evidence.judgment_source,
    degraded_components: [...evidence.degraded_components],
    failed_components: [...evidence.failed_components],
    safety_gate_result: evidence.safety_gate_result,
    safety_gate_violations: [...evidence.safety_gate_violations],
    safety_gate_changed_output: evidence.safety_gate_changed_output,
    fallback_used: evidence.fallback_used,
    degradation_disclosed: evidence.degradation_disclosed,
    unavailable_disclosed: evidence.unavailable_disclosed,
    policy_versions: { ...evidence.policy_versions },
    sensitive_fields_stored: false,
    ...(evidence.judgment_duration_ms !== undefined
      ? { judgment_duration_ms: evidence.judgment_duration_ms }
      : {}),
    ...(evidence.judgment_failure_reason !== undefined
      ? { judgment_failure_reason: evidence.judgment_failure_reason }
      : {}),
    ...(evidence.ai_provider_used !== undefined
      ? { ai_provider_used: evidence.ai_provider_used }
      : {}),
  };
  return sanitized;
}

/**
 * Sanity guard: throws if evidence accidentally carries a forbidden field
 * (raw prompt, rendered context, raw user message, API key, etc.) or if
 * `sensitive_fields_stored` is not literal `false`.
 */
export function assertNoSensitiveRuntimeEvidence(
  evidence: ChatRuntimeTrustEvidence,
): void {
  if (evidence.policy_version !== RUNTIME_EVIDENCE_POLICY_VERSION) {
    throw new Error(
      `ChatRuntimeTrustEvidence invariant: policy_version must be '${RUNTIME_EVIDENCE_POLICY_VERSION}', got '${evidence.policy_version}'.`,
    );
  }
  if ((evidence as unknown as { sensitive_fields_stored: unknown }).sensitive_fields_stored !== false) {
    throw new Error(
      'ChatRuntimeTrustEvidence invariant: sensitive_fields_stored must be literal false.',
    );
  }
  const forbiddenKeys: string[] = [
    'raw_prompt',
    'rendered_context',
    'raw_user_message',
    'user_message',
    'ai_api_key',
    'api_key',
    'authorization',
    'cookies',
    'wallet_address',
    'wallet_private_key',
    'provider_payload',
    'raw_provider_response',
  ];
  const evidenceKeys = Object.keys(evidence as unknown as Record<string, unknown>);
  for (const k of forbiddenKeys) {
    if (evidenceKeys.includes(k)) {
      throw new Error(
        `ChatRuntimeTrustEvidence invariant: forbidden field '${k}' must not appear in evidence.`,
      );
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers (testable in isolation)
// ──────────────────────────────────────────────────────────────────────────

export function inferJudgmentSource(
  status: JudgmentAvailabilityState,
): ChatJudgmentSource {
  if (status === 'AVAILABLE') return 'structured';
  if (status === 'DEGRADED') return 'partial';
  return 'unavailable';
}

const DEGRADATION_DISCLOSURE_PATTERNS: RegExp[] = [
  /\bdegraded\b/i,
  /\bpartial(ly)?\b/i,
  /\blimited\b/i,
  /\bconfidence\s+(should|must|is)\s+(be\s+)?capped\b/i,
  /\bnot\s+(a\s+)?complete\s+read\b/i,
  /\bsome\s+context\s+is\s+(unavailable|missing)\b/i,
];

const UNAVAILABLE_DISCLOSURE_PATTERNS: RegExp[] = [
  /\bstructured\s+coinet\s+judgment\s+is\s+unavailable\b/i,
  /\bgoverned\s+judgment\s+is\s+unavailable\b/i,
  /\bcannot\s+produce\s+a\s+structured\s+coinet\s+judgment\b/i,
  /\bnot\s+a\s+governed\s+coinet\s+read\b/i,
  /\bstructured\s+coinet\s+judgment\s+is\s+not\s+available\b/i,
];

export function detectDegradationDisclosure(output: string): boolean {
  return DEGRADATION_DISCLOSURE_PATTERNS.some((re) => re.test(output));
}

export function detectUnavailableDisclosure(output: string): boolean {
  return UNAVAILABLE_DISCLOSURE_PATTERNS.some((re) => re.test(output));
}
