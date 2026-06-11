/**
 * BTAR-006 — Chat AI Response Finalizer Unit Tests
 *
 * Authority:
 *   Plan 2.2 §14 (test boundary) / §14.3 (no-real-provider-call)
 *   BTAR-006 §10.2 (this test file)
 *
 * Test boundary discipline:
 *   Uses ZERO module mocks. Does NOT import `chat/service.ts`. Imports only
 *   the extracted finalizer, the BTAR-004 prompt-package builder, and the
 *   BTAR-003 availability constructors. This file is the F-2 / F-5 partial-
 *   resolution proof for the AI output finalization seam: the BTAR-005 safety
 *   gate behavior is now testable in isolation without the 27-mock cascade.
 *
 * No real provider calls occurred (no provider import; nothing to mock).
 */

import { describe, it, expect } from 'vitest';

import { finalizeChatAIResponse } from '../chat-ai-response-finalizer';
import { buildCoinetJudgmentPromptPackage } from '../judgment-prompt-package';
import {
  createAvailableJudgmentState,
  createDegradedJudgmentState,
  createUnavailableJudgmentState,
} from '../judgment-availability';

const availablePkg = () =>
  buildCoinetJudgmentPromptPackage({
    availability: createAvailableJudgmentState(),
    judgment: {
      state: { primary: 'Accumulation' },
      thesis: { primary: { hypothesis: 'Trend reversal in early stage' } },
      confidence: { overall: 0.62 },
    },
    scope: { kind: 'ASSET', asset_symbol: 'BTC' },
    source_refs: ['produceJudgment'],
  });

const degradedPkg = () =>
  buildCoinetJudgmentPromptPackage({
    availability: createDegradedJudgmentState({
      reason: 'PARTIAL_CONTEXT_FAILURE',
      component: 'sentiment',
    }),
    judgment: undefined,
    scope: { kind: 'ASSET', asset_symbol: 'BTC' },
    source_refs: [],
  });

const unavailablePkg = () =>
  buildCoinetJudgmentPromptPackage({
    availability: createUnavailableJudgmentState({
      reason: 'JUDGMENT_ENGINE_THROW',
      component: 'produceJudgment',
    }),
    judgment: undefined,
    scope: { kind: 'ASSET', asset_symbol: 'BTC' },
    source_refs: [],
  });

describe('chat AI response finalizer (BTAR-006)', () => {
  describe('ALLOW path', () => {
    it('keeps output unchanged + changed=false', () => {
      const rawOutput =
        "Coinet's current read is constructive, but confidence depends on continued spot demand. This is not a recommendation to buy or sell.";
      const result = finalizeChatAIResponse({
        rawOutput,
        judgmentPackage: availablePkg(),
      });
      expect(result.finalOutput).toBe(rawOutput);
      expect(result.changed).toBe(false);
      expect(result.gate.decision).toBe('ALLOW');
    });

    it('returns originalOutput unchanged on ALLOW', () => {
      const rawOutput = 'This is not a recommendation to buy or sell.';
      const result = finalizeChatAIResponse({
        rawOutput,
        judgmentPackage: availablePkg(),
      });
      expect(result.originalOutput).toBe(rawOutput);
    });
  });

  describe('REWRITE_REQUIRED path', () => {
    it('produces safe_output + changed=true for direct buy/sell language', () => {
      const result = finalizeChatAIResponse({
        rawOutput: 'You should buy SOL now. The setup is strong.',
        judgmentPackage: availablePkg(),
      });
      expect(result.changed).toBe(true);
      expect(result.gate.decision).toBe('REWRITE_REQUIRED');
      expect(result.finalOutput).not.toMatch(/you should buy sol now/i);
    });

    it('removes direct buy/sell language from the final output', () => {
      const result = finalizeChatAIResponse({
        rawOutput: 'You should buy SOL now. Sell now if it drops.',
        judgmentPackage: availablePkg(),
      });
      expect(result.finalOutput).toMatch(/can'?t provide buy or sell instructions/i);
    });

    it('replaces UNAVAILABLE misrepresentation with unavailable disclosure', () => {
      const result = finalizeChatAIResponse({
        rawOutput: "Coinet's thesis is bullish on SOL with high confidence.",
        judgmentPackage: unavailablePkg(),
      });
      expect(result.changed).toBe(true);
      expect(result.finalOutput).toMatch(/structured Coinet judgment is unavailable/i);
    });

    it('produces cautious degraded rewrite when a substantive violation co-occurs under DEGRADED', () => {
      // Disclosure-only no longer clobbers; a substantive violation (confidence
      // inflation) still drives the DEGRADED rewrite.
      const result = finalizeChatAIResponse({
        rawOutput: 'BTC is set up for a strong move higher with high confidence.',
        judgmentPackage: degradedPkg(),
      });
      expect(result.changed).toBe(true);
      expect(result.finalOutput).toMatch(/partially degraded/i);
    });
  });

  describe('BLOCK_OR_CLARIFY path', () => {
    it('produces safe_output + changed=true for guaranteed outcome language', () => {
      const result = finalizeChatAIResponse({
        rawOutput: 'SOL will pump 40% by Friday — guaranteed.',
        judgmentPackage: availablePkg(),
      });
      expect(result.gate.decision).toBe('BLOCK_OR_CLARIFY');
      expect(result.changed).toBe(true);
      expect(result.finalOutput).not.toMatch(/will pump/i);
    });
  });

  describe('Envelope contract', () => {
    it('returns the gate result', () => {
      const result = finalizeChatAIResponse({
        rawOutput: 'You should buy SOL now.',
        judgmentPackage: availablePkg(),
      });
      expect(result.gate).toBeDefined();
      expect(result.gate.policy_version).toBe('ai-output-safety-gate.v1');
      expect(result.gate.violations).toContain('DIRECT_FINANCIAL_ADVICE');
    });

    it('is deterministic (same input → same final output)', () => {
      const input = {
        rawOutput: "Coinet's thesis is bullish on SOL.",
        judgmentPackage: unavailablePkg(),
      };
      const a = finalizeChatAIResponse(input);
      const b = finalizeChatAIResponse(input);
      expect(a.finalOutput).toBe(b.finalOutput);
      expect(a.changed).toBe(b.changed);
      expect(a.gate.decision).toBe(b.gate.decision);
    });

    it('preserves originalOutput even when changed=true', () => {
      const rawOutput = 'You should buy SOL now.';
      const result = finalizeChatAIResponse({
        rawOutput,
        judgmentPackage: availablePkg(),
      });
      expect(result.originalOutput).toBe(rawOutput);
      expect(result.finalOutput).not.toBe(rawOutput);
    });
  });
});
