/**
 * BTAR-008 — Runtime Trust Evidence Unit Tests
 *
 * Authority:
 *   Plan 2.2 §14 (test boundary), §14.3 (no-real-provider-call)
 *   BTAR-008 §18 (this test file)
 *
 * Test boundary discipline:
 *   - 0 module mocks.
 *   - No `chat/service.ts` import.
 *   - No provider imports.
 *   - Uses only Phase 2 trust seams + the BTAR-008 evidence module.
 *
 * No real provider calls occurred (no provider import).
 */

import { describe, it, expect } from 'vitest';

import {
  buildChatRuntimeTrustEvidence,
  sanitizeChatRuntimeTrustEvidence,
  assertNoSensitiveRuntimeEvidence,
  inferJudgmentSource,
  detectDegradationDisclosure,
  detectUnavailableDisclosure,
} from '../chat-runtime-trust-evidence';
import type { ChatRuntimeTrustEvidence } from '../chat-runtime-trust-evidence.types';
import { buildChatTrustContext } from '../chat-trust-context';
import { finalizeChatAIResponse } from '../chat-ai-response-finalizer';
import {
  createAvailableJudgmentState,
  createDegradedJudgmentState,
  createUnavailableJudgmentState,
} from '../judgment-availability';

const buildAvailableEvidence = () => {
  const ctx = buildChatTrustContext({
    availability: createAvailableJudgmentState(),
    judgment: {
      state: { primary: 'Accumulation' },
      thesis: { primary: { hypothesis: 'Trend reversal in early stage' } },
      confidence: { overall: 0.62 },
    },
    scope: { kind: 'ASSET', asset_symbol: 'BTC' },
    source_refs: ['produceJudgment'],
  });
  const finalization = finalizeChatAIResponse({
    rawOutput:
      "Coinet's read is constructive, but confidence depends on continued demand. This is not a recommendation to buy or sell.",
    judgmentPackage: ctx.promptPackage,
  });
  return buildChatRuntimeTrustEvidence({
    trustContext: ctx,
    finalization,
    ai_provider_used: 'mock-provider',
  });
};

const buildDegradedEvidence = (rawOutput: string) => {
  const ctx = buildChatTrustContext({
    availability: createDegradedJudgmentState({
      reason: 'PARTIAL_CONTEXT_FAILURE',
      component: 'sentiment-aggregator',
    }),
    judgment: undefined,
    scope: { kind: 'ASSET', asset_symbol: 'BTC' },
  });
  const finalization = finalizeChatAIResponse({
    rawOutput,
    judgmentPackage: ctx.promptPackage,
  });
  return buildChatRuntimeTrustEvidence({
    trustContext: ctx,
    finalization,
  });
};

const buildUnavailableEvidence = (rawOutput: string) => {
  const ctx = buildChatTrustContext({
    availability: createUnavailableJudgmentState({
      reason: 'JUDGMENT_ENGINE_THROW',
      component: 'produceJudgment',
    }),
    judgment: undefined,
    scope: { kind: 'ASSET', asset_symbol: 'BTC' },
  });
  const finalization = finalizeChatAIResponse({
    rawOutput,
    judgmentPackage: ctx.promptPackage,
  });
  return buildChatRuntimeTrustEvidence({
    trustContext: ctx,
    finalization,
    judgment_failure_reason: 'JUDGMENT_ENGINE_THROW',
  });
};

describe('chat runtime trust evidence (BTAR-008)', () => {
  describe('AVAILABLE evidence', () => {
    it('judgment_status is AVAILABLE and judgment_source is structured', () => {
      const e = buildAvailableEvidence();
      expect(e.judgment_status).toBe('AVAILABLE');
      expect(e.judgment_source).toBe('structured');
    });

    it('AVAILABLE evidence allows ai_provider_used pass-through', () => {
      const e = buildAvailableEvidence();
      expect(e.ai_provider_used).toBe('mock-provider');
    });

    it('AVAILABLE evidence: degradation_disclosed and unavailable_disclosed are true (no obligation)', () => {
      const e = buildAvailableEvidence();
      expect(e.degradation_disclosed).toBe(true);
      expect(e.unavailable_disclosed).toBe(true);
    });
  });

  describe('DEGRADED evidence', () => {
    it('judgment_status is DEGRADED and judgment_source is partial', () => {
      const e = buildDegradedEvidence(
        "Coinet's read is partially degraded; confidence is limited.",
      );
      expect(e.judgment_status).toBe('DEGRADED');
      expect(e.judgment_source).toBe('partial');
    });

    it('DEGRADED evidence preserves degraded_components', () => {
      const e = buildDegradedEvidence(
        "Coinet's read is partially degraded; confidence is limited.",
      );
      expect(e.degraded_components).toContain('sentiment-aggregator');
    });

    it('DEGRADED with cautious output → degradation_disclosed=true', () => {
      const e = buildDegradedEvidence(
        "Coinet's read is partially degraded and confidence is limited.",
      );
      expect(e.degradation_disclosed).toBe(true);
    });

    it('DEGRADED with a substantive violation gets rewritten → final output now discloses', () => {
      // Disclosure-only no longer clobbers; a substantive violation (confidence
      // inflation) still drives the DEGRADED rewrite to a disclosing safe output.
      const e = buildDegradedEvidence('BTC is set up for a strong move higher with high confidence.');
      expect(e.safety_gate_changed_output).toBe(true);
      expect(e.degradation_disclosed).toBe(true);
    });
  });

  describe('UNAVAILABLE evidence', () => {
    it('judgment_status is UNAVAILABLE and judgment_source is unavailable', () => {
      const e = buildUnavailableEvidence(
        "I can't present a governed Coinet thesis right now because structured Coinet judgment is unavailable.",
      );
      expect(e.judgment_status).toBe('UNAVAILABLE');
      expect(e.judgment_source).toBe('unavailable');
    });

    it('UNAVAILABLE evidence preserves failed_components and failure reason', () => {
      const e = buildUnavailableEvidence(
        "I can't present a governed Coinet thesis right now because structured Coinet judgment is unavailable.",
      );
      expect(e.failed_components).toContain('produceJudgment');
      expect(e.judgment_failure_reason).toBe('JUDGMENT_ENGINE_THROW');
    });

    it('UNAVAILABLE with proper disclosure → unavailable_disclosed=true', () => {
      const e = buildUnavailableEvidence(
        'structured Coinet judgment is unavailable for this request.',
      );
      expect(e.unavailable_disclosed).toBe(true);
    });

    it('UNAVAILABLE with raw governed-claim output that gets rewritten → final output now discloses', () => {
      // Raw governed-claim → gate rewrites → final output contains canonical disclosure
      const e = buildUnavailableEvidence("Coinet's thesis is bullish on SOL.");
      expect(e.safety_gate_changed_output).toBe(true);
      expect(e.unavailable_disclosed).toBe(true);
    });
  });

  describe('Safety-gate capture', () => {
    it('captures gate decision', () => {
      const e = buildAvailableEvidence();
      expect(e.safety_gate_result).toBe('ALLOW');
    });

    it('captures gate violations array', () => {
      const e = buildUnavailableEvidence("Coinet's thesis is bullish on SOL.");
      expect(e.safety_gate_violations).toContain('GOVERNED_JUDGMENT_CLAIM_WHEN_UNAVAILABLE');
      expect(e.safety_gate_violations).toContain('MISSING_UNAVAILABLE_DISCLOSURE');
    });

    it('captures safety_gate_changed_output boolean', () => {
      const allowed = buildAvailableEvidence();
      expect(allowed.safety_gate_changed_output).toBe(false);
      const rewritten = buildUnavailableEvidence("Coinet's thesis is bullish on SOL.");
      expect(rewritten.safety_gate_changed_output).toBe(true);
    });
  });

  describe('Policy versions', () => {
    it('exposes all 4 policy versions', () => {
      const e = buildAvailableEvidence();
      expect(e.policy_version).toBe('chat-runtime-trust-evidence.v1');
      expect(e.policy_versions.availability).toBe('judgment-availability.v1');
      expect(e.policy_versions.prompt_package).toBe('coinet-judgment-prompt-package.v1');
      expect(e.policy_versions.output_safety_gate).toBe('ai-output-safety-gate.v1');
      expect(e.policy_versions.runtime_evidence).toBe('chat-runtime-trust-evidence.v1');
    });
  });

  describe('Sensitive-data prohibition', () => {
    it('sensitive_fields_stored is literal false', () => {
      const e = buildAvailableEvidence();
      expect(e.sensitive_fields_stored).toBe(false);
    });

    it('evidence keys do not include raw_prompt / rendered_context / api_key / user_message', () => {
      const e = buildAvailableEvidence();
      const keys = Object.keys(e);
      for (const forbidden of [
        'raw_prompt',
        'rendered_context',
        'raw_user_message',
        'user_message',
        'api_key',
        'ai_api_key',
        'authorization',
        'cookies',
        'provider_payload',
        'raw_provider_response',
      ]) {
        expect(keys).not.toContain(forbidden);
      }
    });

    it('assertNoSensitiveRuntimeEvidence rejects evidence with raw_prompt-like field', () => {
      const e = buildAvailableEvidence();
      const tampered = { ...e, raw_prompt: 'SECRET PROMPT' } as unknown as ChatRuntimeTrustEvidence;
      expect(() => assertNoSensitiveRuntimeEvidence(tampered)).toThrow(/raw_prompt/i);
    });

    it('assertNoSensitiveRuntimeEvidence rejects evidence with sensitive_fields_stored !== false', () => {
      const e = buildAvailableEvidence();
      const tampered = { ...e, sensitive_fields_stored: true as unknown as false };
      expect(() => assertNoSensitiveRuntimeEvidence(tampered)).toThrow(/sensitive_fields_stored/i);
    });

    it('assertNoSensitiveRuntimeEvidence rejects evidence with wrong policy_version', () => {
      const e = buildAvailableEvidence();
      const tampered = { ...e, policy_version: 'wrong.v0' as unknown as ChatRuntimeTrustEvidence['policy_version'] };
      expect(() => assertNoSensitiveRuntimeEvidence(tampered)).toThrow(/policy_version/i);
    });
  });

  describe('Sanitizer', () => {
    it('preserves all allowed fields', () => {
      const e = buildAvailableEvidence();
      const sanitized = sanitizeChatRuntimeTrustEvidence(e);
      expect(sanitized.policy_version).toBe(e.policy_version);
      expect(sanitized.judgment_status).toBe(e.judgment_status);
      expect(sanitized.safety_gate_result).toBe(e.safety_gate_result);
      expect(sanitized.sensitive_fields_stored).toBe(false);
    });

    it('drops unknown extra properties', () => {
      const e = buildAvailableEvidence();
      const tampered = { ...e, raw_prompt: 'SECRET' } as unknown as ChatRuntimeTrustEvidence;
      const sanitized = sanitizeChatRuntimeTrustEvidence(tampered);
      expect((sanitized as unknown as { raw_prompt?: string }).raw_prompt).toBeUndefined();
    });
  });

  describe('Determinism', () => {
    it('produces semantically identical evidence for the same input', () => {
      const a = buildAvailableEvidence();
      const b = buildAvailableEvidence();
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });
  });

  describe('Detector helpers', () => {
    it('inferJudgmentSource maps the three states', () => {
      expect(inferJudgmentSource('AVAILABLE')).toBe('structured');
      expect(inferJudgmentSource('DEGRADED')).toBe('partial');
      expect(inferJudgmentSource('UNAVAILABLE')).toBe('unavailable');
    });

    it('detectDegradationDisclosure positive cases', () => {
      expect(detectDegradationDisclosure('the read is partially degraded')).toBe(true);
      expect(detectDegradationDisclosure('confidence should be capped')).toBe(true);
      expect(detectDegradationDisclosure('some context is unavailable')).toBe(true);
    });

    it('detectDegradationDisclosure negative case', () => {
      expect(detectDegradationDisclosure('clean confident thesis with no notes')).toBe(false);
    });

    it('detectUnavailableDisclosure positive cases', () => {
      expect(detectUnavailableDisclosure('structured Coinet judgment is unavailable')).toBe(true);
      expect(detectUnavailableDisclosure('I cannot produce a structured Coinet judgment.')).toBe(true);
    });

    it('detectUnavailableDisclosure negative case', () => {
      expect(detectUnavailableDisclosure('clean confident thesis with no notes')).toBe(false);
    });
  });
});
