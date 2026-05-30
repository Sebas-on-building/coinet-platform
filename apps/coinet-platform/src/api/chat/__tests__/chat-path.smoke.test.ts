/**
 * Chat Path Smoke Test — BTAR-002
 *
 * Minimal smoke test for the active chat backend path:
 *   /api/chat/message
 *     → chatController.sendMessage
 *     → chatService.sendMessage(userId, request)
 *       → buildSignalSnapshot / produceJudgment / formatJudgmentForAI
 *       → aiService.analyze
 *
 * Design: Service-level (Option C per BTAR-002 §12.4).
 * Mocks: prisma (DB boundary), services/ai-service (LLM boundary).
 * Asserts: structural existence + invocation observability.
 *
 * Per BTAR-002 §17.2: if this test reveals silent fallback behavior in the
 * chat path, that is a Phase 2 finding (BTAR-003's job), NOT a BTAR-002 fix.
 * Per BTAR-002 §10: this test must not modify any V1_CORE source, must not
 * remove silent fallback, must not add an output safety gate, and must not
 * call any real provider.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock the database boundary BEFORE importing the chat service ────────────
// Minimal stubs for the conversation + message tables that ChatService.sendMessage
// touches on the happy path.
vi.mock('../../../db/client', () => ({
  prisma: {
    conversation: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: 'smoke-conv-id',
        userId: 'smoke-test-user',
        title: 'Smoke Test',
        agentId: null,
        createdAt: new Date('2026-05-22T00:00:00Z'),
        updatedAt: new Date('2026-05-22T00:00:00Z'),
      }),
      update: vi.fn().mockResolvedValue({}),
    },
    message: {
      create: vi.fn().mockResolvedValue({
        id: 'smoke-msg-id',
        conversationId: 'smoke-conv-id',
        role: 'user',
        content: 'hello',
        createdAt: new Date('2026-05-22T00:00:00Z'),
      }),
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

// ── Mock the AI boundary so no real provider call is made ───────────────────
// The exact return shape of aiService.analyze is opaque to this smoke test;
// the test asserts on the OUTER ChatMessageResponse shape, not the inner AI
// response shape. Cast to any to keep the mock minimal.
vi.mock('../../../services/ai-service', () => ({
  aiService: {
    analyze: vi.fn().mockResolvedValue({
      success: true,
      content: 'mocked smoke response',
      sources: [],
      tokens: 0,
      model: 'smoke-mock',
    } as any),
  },
}));

// ── Mock the external-calling intelligence services ─────────────────────────
// The chat service imports ~30 intelligence modules; most of these make their
// own HTTP / provider calls during sendMessage's "live context fetch" phase.
// Without these mocks, the smoke test makes real external calls (CoinGecko,
// alternative.me, RSS aggregators, social, etc.). Per BTAR-002 §10 line 6
// "no real provider calls", we silence those boundaries here.
// These are MOCKS for test isolation, NOT source modifications.
vi.mock('../../../services/market-data', () => ({
  fetchPricesForMessage: vi.fn().mockResolvedValue([]),
  formatMarketDataForAI: vi.fn().mockReturnValue(''),
}));
vi.mock('../../../services/enterprise-market-data-pipeline', () => ({
  fetchCachedEnterpriseMarketPrices: vi.fn().mockResolvedValue([]),
  formatEnterpriseMarketDataForAI: vi.fn().mockReturnValue(''),
}));
vi.mock('../../../services/whale-data', () => ({
  getWhaleContextForAI: vi.fn().mockResolvedValue(''),
}));
vi.mock('../../../services/news-service', () => ({
  getEnrichedNewsForCoins: vi.fn().mockResolvedValue([]),
  formatEnrichedNewsForAI: vi.fn().mockReturnValue(''),
}));
vi.mock('../../../services/sentiment-service', () => ({
  getMarketSentiment: vi.fn().mockResolvedValue({ value: 50, classification: 'neutral' }),
  formatSentimentForAI: vi.fn().mockReturnValue(''),
}));
vi.mock('../../../services/social-service', () => ({
  getSocialSentiment: vi.fn().mockResolvedValue({}),
  formatSocialForAI: vi.fn().mockReturnValue(''),
}));
vi.mock('../../../services/social-intelligence', () => ({
  getSocialIntelligence: vi.fn().mockResolvedValue({}),
  formatSocialIntelligenceForAI: vi.fn().mockReturnValue(''),
}));
vi.mock('../../../services/social-intelligence-orchestrator', () => ({
  getComprehensiveSocialIntelligence: vi.fn().mockResolvedValue({}),
  formatComprehensiveSocialIntelligenceForAI: vi.fn().mockReturnValue(''),
}));
vi.mock('../../../services/social-intelligence-v2', () => ({
  calculateSocialIntelligenceV2: vi.fn().mockResolvedValue({}),
  formatSocialIntelligenceV2ForAI: vi.fn().mockReturnValue(''),
}));
vi.mock('../../../services/coinet-sentiment-index', () => ({
  calculateCSI: vi.fn().mockResolvedValue({}),
  formatCSIForAI: vi.fn().mockReturnValue(''),
}));
vi.mock('../../../services/composite-social-score', () => ({
  calculateCompositeSocialScore: vi.fn().mockResolvedValue({}),
  formatCSSForAI: vi.fn().mockReturnValue(''),
}));
vi.mock('../../../services/news-intelligence-v2', () => ({
  calculateNewsIntelligenceV2: vi.fn().mockResolvedValue({}),
  formatNewsIntelligenceV2ForAI: vi.fn().mockReturnValue(''),
}));
vi.mock('../../../services/liquidation-service', () => ({
  getPerpsSnapshot: vi.fn().mockResolvedValue({}),
  formatPerpsForAI: vi.fn().mockReturnValue(''),
}));
vi.mock('../../../services/derivatives-intelligence-v2', () => ({
  calculateDerivativesIntelligenceV2: vi.fn().mockResolvedValue({}),
  formatDerivativesIntelligenceV2ForAI: vi.fn().mockReturnValue(''),
}));
vi.mock('../../../services/comprehensive-derivatives-intelligence', () => ({
  calculateComprehensiveDerivativesIntelligence: vi.fn().mockResolvedValue({}),
  formatComprehensiveDerivativesForAI: vi.fn().mockReturnValue(''),
}));
vi.mock('../../../services/derivatives-intelligence-final', () => ({
  calculateDerivativesIntelligenceFinal: vi.fn().mockResolvedValue({}),
  formatDerivativesIntelligenceFinalForAI: vi.fn().mockReturnValue(''),
}));
vi.mock('../../../services/behavioral-finance-intelligence', () => ({
  calculateBehavioralFinanceIntelligence: vi.fn().mockReturnValue({}),
}));
vi.mock('../../../services/neuroeconomic-intelligence', () => ({
  calculateNeuroeconomicIntelligence: vi.fn().mockReturnValue({}),
  formatNeuroeconomicForAI: vi.fn().mockReturnValue(''),
}));
vi.mock('../../../services/influencer-tracking', () => ({
  getInfluencerSnapshot: vi.fn().mockResolvedValue({}),
  formatInfluencerIntelligenceForAI: vi.fn().mockReturnValue(''),
}));
vi.mock('../../../services/influencer-analytics', () => ({
  analyzeContrarianIndicator: vi.fn().mockReturnValue({}),
  analyzeConsensus: vi.fn().mockReturnValue({}),
  formatAdvancedAnalyticsForAI: vi.fn().mockReturnValue(''),
}));
vi.mock('../../../services/project-research-intelligence', () => ({
  calculateProjectTrustScore: vi.fn().mockResolvedValue({}),
  formatTrustScoreForAI: vi.fn().mockReturnValue(''),
}));
vi.mock('../../../services/source-systems', () => ({
  runBtcQuantumRisk: vi.fn().mockResolvedValue({}),
}));
vi.mock('../../../services/intent-classifier', () => ({
  classifyIntent: vi.fn().mockResolvedValue({ intent: 'general', confidence: 0.5, suggestedDepth: 'quick' }),
  getResponseFormatInstructions: vi.fn().mockReturnValue(''),
}));
vi.mock('../../../services/intent-handlers', () => ({
  executeHandler: vi.fn().mockResolvedValue(null),
}));
vi.mock('../../../services/memory-service', () => ({
  buildUserContextForAI: vi.fn().mockResolvedValue(''),
  extractMemoriesFromMessage: vi.fn().mockResolvedValue([]),
}));

// vitest hoists vi.mock() above imports automatically, so static imports below
// see the mocked modules.
import { chatService } from '../service';
import { aiService } from '../../../services/ai-service';

describe('chat path smoke test (BTAR-002)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('chatService is importable and exposes sendMessage', () => {
    expect(chatService).toBeDefined();
    expect(typeof chatService.sendMessage).toBe('function');
  });

  it(
    'sendMessage invocation surfaces a result or a visible error (no silent swallow)',
    async () => {
      let result: any;
      let error: any;

      try {
        result = await chatService.sendMessage('smoke-test-user', {
          message: 'hello',
        });
      } catch (e) {
        error = e;
      }

      // Per BTAR-002 §13/§17.2 discipline: either the path returns the
      // ChatMessageResponse shape (V1_CORE healthy on current code) OR the
      // path throws a visible error. Silent return of undefined / null with
      // no error is the failure mode we explicitly reject.
      const surfaced = result !== undefined || error !== undefined;
      expect(surfaced).toBe(true);

      if (error) {
        // Failure-mode visibility — the throw must be an actual Error instance,
        // not a swallowed undefined. The presence/absence of silent fallback
        // is recorded but NOT fixed in BTAR-002 (Phase 2 finding per §17.2).
        expect(error).toBeInstanceOf(Error);
      } else {
        // Outer shape sanity per ChatMessageResponse (types.ts).
        expect(result).toBeDefined();
        // Use loose checks because the exact field availability depends on
        // which code path inside sendMessage was traversed under the mocks.
        // The smoke is structural, not semantic.
        const hasShape =
          Object.prototype.hasOwnProperty.call(result, 'success') ||
          Object.prototype.hasOwnProperty.call(result, 'data') ||
          Object.prototype.hasOwnProperty.call(result, 'message');
        expect(hasShape).toBe(true);
      }
    },
    30000,
  );
});
