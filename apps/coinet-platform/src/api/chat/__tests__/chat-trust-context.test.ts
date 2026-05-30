/**
 * BTAR-006 — Chat Trust Context Builder Unit Tests
 *
 * Authority:
 *   Plan 2.2 §14 (test boundary) / §14.3 (no-real-provider-call)
 *   BTAR-006 §10.1 (this test file)
 *
 * Test boundary discipline:
 *   Uses ZERO module mocks. Does NOT import `chat/service.ts`. Imports only
 *   the extracted trust-context helper plus the BTAR-003 availability
 *   constructors. This file is the F-2 / F-5 partial-resolution proof: the
 *   trust-context behavior is now testable in isolation without the 27-mock
 *   cascade.
 *
 * No real provider calls occurred (no provider import; nothing to mock).
 */

import { describe, it, expect } from 'vitest';

import { buildChatTrustContext } from '../chat-trust-context';
import {
  createAvailableJudgmentState,
  createDegradedJudgmentState,
  createUnavailableJudgmentState,
} from '../judgment-availability';

describe('chat trust context (BTAR-006)', () => {
  describe('AVAILABLE', () => {
    it('builds AVAILABLE trust context without importing chat service', () => {
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
      expect(ctx.judgment_status).toBe('AVAILABLE');
    });

    it('AVAILABLE context contains promptPackage with judgment_status AVAILABLE', () => {
      const ctx = buildChatTrustContext({
        availability: createAvailableJudgmentState(),
        judgment: { state: { primary: 'Accumulation' } },
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
        source_refs: ['produceJudgment'],
      });
      expect(ctx.promptPackage.judgment_status).toBe('AVAILABLE');
    });

    it('AVAILABLE context renderedAIContext contains STRUCTURED COINET JUDGMENT PACKAGE', () => {
      const ctx = buildChatTrustContext({
        availability: createAvailableJudgmentState(),
        judgment: undefined,
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(ctx.renderedAIContext).toContain('STRUCTURED COINET JUDGMENT PACKAGE');
    });

    it('AVAILABLE context has judgment_available=true', () => {
      const ctx = buildChatTrustContext({
        availability: createAvailableJudgmentState(),
        judgment: undefined,
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(ctx.judgment_available).toBe(true);
    });

    it('AVAILABLE context has disclosure_required=false', () => {
      const ctx = buildChatTrustContext({
        availability: createAvailableJudgmentState(),
        judgment: undefined,
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(ctx.disclosure_required).toBe(false);
    });
  });

  describe('DEGRADED', () => {
    it('builds DEGRADED trust context without importing chat service', () => {
      const ctx = buildChatTrustContext({
        availability: createDegradedJudgmentState({
          reason: 'PARTIAL_CONTEXT_FAILURE',
          component: 'sentiment',
        }),
        judgment: undefined,
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(ctx.judgment_status).toBe('DEGRADED');
    });

    it('DEGRADED context has disclosure_required=true', () => {
      const ctx = buildChatTrustContext({
        availability: createDegradedJudgmentState({
          reason: 'STALE_CONTEXT',
          component: 'market-data',
        }),
        judgment: undefined,
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(ctx.disclosure_required).toBe(true);
    });

    it('DEGRADED context preserves degraded_components', () => {
      const ctx = buildChatTrustContext({
        availability: createDegradedJudgmentState({
          reason: 'LOW_CONFIDENCE_INPUTS',
          component: 'sentiment-aggregator',
        }),
        judgment: undefined,
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(ctx.degraded_components).toContain('sentiment-aggregator');
    });
  });

  describe('UNAVAILABLE', () => {
    it('builds UNAVAILABLE trust context without importing chat service', () => {
      const ctx = buildChatTrustContext({
        availability: createUnavailableJudgmentState({
          reason: 'JUDGMENT_ENGINE_THROW',
          component: 'produceJudgment',
        }),
        judgment: undefined,
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(ctx.judgment_status).toBe('UNAVAILABLE');
    });

    it('UNAVAILABLE context has judgment_available=false', () => {
      const ctx = buildChatTrustContext({
        availability: createUnavailableJudgmentState({
          reason: 'JUDGMENT_RESULT_EMPTY',
          component: 'produceJudgment',
        }),
        judgment: undefined,
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(ctx.judgment_available).toBe(false);
    });

    it('UNAVAILABLE promptPackage contains no fake judgment fields even when judgment provided', () => {
      const ctx = buildChatTrustContext({
        availability: createUnavailableJudgmentState({
          reason: 'JUDGMENT_ENGINE_THROW',
          component: 'produceJudgment',
        }),
        judgment: {
          state: { primary: 'IGNORED' },
          thesis: { primary: { hypothesis: 'IGNORED' } },
          confidence: { overall: 0.99 },
        },
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(ctx.promptPackage.judgment).toBeUndefined();
    });

    it('UNAVAILABLE renderedAIContext forbids governed thesis/confidence/scenario claims', () => {
      const ctx = buildChatTrustContext({
        availability: createUnavailableJudgmentState({
          reason: 'JUDGMENT_ENGINE_TIMEOUT',
          component: 'produceJudgment',
        }),
        judgment: undefined,
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      const forbidden = ctx.promptPackage.expression_rules.forbidden_claims.join('\n');
      expect(forbidden).toMatch(/structured thesis/i);
      expect(forbidden).toMatch(/structured confidence/i);
      expect(forbidden).toMatch(/structured contradiction or scenario/i);
    });
  });

  describe('Policy versions', () => {
    it('exposes policy versions for both BTAR-003 (availability) and BTAR-004 (prompt package)', () => {
      const ctx = buildChatTrustContext({
        availability: createAvailableJudgmentState(),
        judgment: undefined,
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(ctx.policy_versions.availability).toBe('judgment-availability.v1');
      expect(ctx.policy_versions.prompt_package).toBe('coinet-judgment-prompt-package.v1');
    });
  });

  describe('Determinism', () => {
    it('produces semantically identical contexts for the same input', () => {
      const input = {
        availability: createAvailableJudgmentState(),
        judgment: {
          state: { primary: 'Accumulation' },
          thesis: { primary: { hypothesis: 'X' } },
          confidence: { overall: 0.5 },
        },
        scope: { kind: 'ASSET' as const, asset_symbol: 'BTC' },
        source_refs: ['produceJudgment'],
      };
      const a = buildChatTrustContext(input);
      const b = buildChatTrustContext(input);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });
  });
});
