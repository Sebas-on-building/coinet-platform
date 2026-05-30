/**
 * BTAR-008 — Runtime Trust Evidence Type Contract
 *
 * Minimal inspectable evidence object that summarizes what happened in a
 * chat response. Metadata only. No raw prompt, no rendered context, no
 * user message, no provider keys, no private headers, no provider payloads.
 *
 * Authority:
 *   Plan 2.1 §1.2 ("testable" + "user-facing response behavior … explicit")
 *   Plan 2.2 §7.5 (P2-S12 new file class) / §15 (telemetry boundary cap)
 *   BTAR-008 §12 (this contract)
 *
 * SCOPE LIMITS (per Plan 2.3 OOS):
 *   - No L13/L14 imports.
 *   - No L14 telemetry.
 *   - No persistence layer.
 *   - No analytics platform.
 *   - All values are pure / metadata-only.
 *
 * This is minimal runtime trust evidence, not L14 telemetry, not analytics,
 * and not a calibration system.
 */

import type { JudgmentAvailabilityState } from './judgment-availability.types';
import type {
  AIOutputGateDecision,
  AIOutputSafetyViolation,
} from './ai-output-safety-gate.types';
import type { ChatTrustContext } from './chat-trust-context';
import type { FinalizeChatAIResponseResult } from './chat-ai-response-finalizer';

export type ChatRuntimeTrustEvidencePolicyVersion =
  'chat-runtime-trust-evidence.v1';

export type ChatJudgmentSource = 'structured' | 'partial' | 'unavailable';

export interface ChatRuntimeTrustEvidencePolicyVersions {
  availability: string;
  prompt_package: string;
  output_safety_gate: string;
  runtime_evidence: ChatRuntimeTrustEvidencePolicyVersion;
}

export interface ChatRuntimeTrustEvidence {
  policy_version: ChatRuntimeTrustEvidencePolicyVersion;
  judgment_status: JudgmentAvailabilityState;
  judgment_source: ChatJudgmentSource;
  judgment_duration_ms?: number;
  judgment_failure_reason?: string;
  degraded_components: string[];
  failed_components: string[];
  ai_provider_used?: string;
  safety_gate_result: AIOutputGateDecision;
  safety_gate_violations: AIOutputSafetyViolation[];
  safety_gate_changed_output: boolean;
  fallback_used: boolean;
  degradation_disclosed: boolean;
  unavailable_disclosed: boolean;
  policy_versions: ChatRuntimeTrustEvidencePolicyVersions;
  /**
   * Type-pinned to the literal `false`. This is the structural guarantee that
   * the evidence object never carries raw prompt / rendered context / user
   * message / API keys / provider payloads.
   */
  sensitive_fields_stored: false;
}

export interface BuildChatRuntimeTrustEvidenceInput {
  trustContext: ChatTrustContext;
  finalization: FinalizeChatAIResponseResult;
  judgment_duration_ms?: number;
  judgment_failure_reason?: string;
  ai_provider_used?: string;
  fallback_used?: boolean;
}
