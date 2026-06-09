/**
 * 💬 Chat Service - Core Logic
 * 
 * Divine chat service that orchestrates all components:
 * - Conversation management
 * - AI integration
 * - Chart detection
 * - Source management
 * - Context preservation
 */

import { prisma } from '../../db/client';
import { aiService } from '../../services/ai-service';
import { fetchPricesForMessage, formatMarketDataForAI, getGlobalMarketData } from '../../services/market-data';
import { getCmcGlobalMetrics, getCmcDerivatives } from '../../services/cmc-agent-hub';
import { produceJudgment, buildSignalSnapshot, type MarketWideInputs } from '../../services/judgment';
import { getAssetSector, type Sector } from '../../services/omniscore_v3';
import { formatJudgmentForAI } from '../../services/judgment/debug-view';
// BTAR-003 — Judgment availability state (Plan 2.1 §4 / Plan 2.2 §7.3 P2-S10).
// This is a bounded live-path trust modification, not a chat service rewrite.
// This is judgment availability/failure classification, not a new judgment engine.
import {
  createAvailableJudgmentState,
  createUnavailableJudgmentState,
  buildUnavailableJudgmentContextForAI,
} from './judgment-availability';
import type { JudgmentAvailabilityResult } from './judgment-availability.types';
// BTAR-004 + FRP-001 — Typed CoinetJudgmentPromptPackage (Plan 2.2 §7.2 P2-S09).
// This is a bounded live-path trust modification, not a chat service rewrite.
// This is a prompt bridge replacement, not a new judgment engine and not a
// new AI service. The LLM still receives text — the text is now deterministically
// rendered from the typed package rather than from ad-hoc ASCII stuffing.
import {
  buildCoinetJudgmentPromptPackage,
  // BTAR-006: renderCoinetJudgmentPromptPackageForAI is no longer called
  // directly from service.ts — buildChatTrustContext now owns rendering.
  // buildCoinetJudgmentPromptPackage remains used for the default-fallback
  // (no-judgment-block-ran) package at the gate site.
} from './judgment-prompt-package';
import type { CoinetJudgmentPromptPackage } from './judgment-prompt-package.types';
// BTAR-005 — AI Output Safety / Expression Gate (Plan 2.2 §7.4 P2-S11).
// BTAR-006 note: applyAIOutputSafetyGate is no longer called directly from
// service.ts — finalizeChatAIResponse now wraps it. The import is preserved
// here as a documentation reference; the symbol is unused at runtime.
//   import { applyAIOutputSafetyGate } from './ai-output-safety-gate';
// BTAR-006 — Bounded trust-seam extraction (Plan 2.2 §7.5 P2-S12).
// This is a bounded live-path trust extraction, not a chat service rewrite.
// These modules extract trust-critical seams only; they do not create a new
// chat runtime, new AI service, or new judgment engine.
import { buildChatTrustContext, type ChatTrustContext } from './chat-trust-context';
import { toChatVerdict } from './chat-verdict';
import { finalizeChatAIResponse } from './chat-ai-response-finalizer';
// BTAR-008 — Runtime trust evidence (Plan 2.2 §7.5 P2-S12 / §15 telemetry cap).
// This is minimal runtime trust evidence, not L14 telemetry, not analytics,
// and not a calibration system. Evidence is metadata-only and never carries
// raw prompt / rendered context / user message / API keys / provider payloads.
import { buildChatRuntimeTrustEvidence } from './chat-runtime-trust-evidence';
import { resolve as resolveCanonical } from '../../services/canonical';
import { graph as knowledgeGraph } from '../../services/knowledge-graph';
import { getWhaleContextForAI, getWhaleActivityForToken, deriveWhaleNetFlowUSD } from '../../services/whale-data';
import { getEnrichedNewsForCoins, formatEnrichedNewsForAI } from '../../services/news-service';
import { getMarketSentiment, formatSentimentForAI } from '../../services/sentiment-service';
import { getSocialSentiment, formatSocialForAI } from '../../services/social-service';
import { getSocialIntelligence, formatSocialIntelligenceForAI } from '../../services/social-intelligence';
import { getInfluencerSnapshot, formatInfluencerIntelligenceForAI } from '../../services/influencer-tracking';
import { analyzeContrarianIndicator, analyzeConsensus, formatAdvancedAnalyticsForAI } from '../../services/influencer-analytics';
import { getComprehensiveSocialIntelligence, formatComprehensiveSocialIntelligenceForAI } from '../../services/social-intelligence-orchestrator';
import { calculateCSI, formatCSIForAI } from '../../services/coinet-sentiment-index';
import { calculateCompositeSocialScore, formatCSSForAI } from '../../services/composite-social-score';
import { calculateSocialIntelligenceV2, formatSocialIntelligenceV2ForAI } from '../../services/social-intelligence-v2';
import { calculateNewsIntelligenceV2, formatNewsIntelligenceV2ForAI } from '../../services/news-intelligence-v2';
import { buildUserContextForAI, extractMemoriesFromMessage } from '../../services/memory-service';
import { getPerpsSnapshot, formatPerpsForAI } from '../../services/liquidation-service';
import { getFreePerps } from '../../services/free-perps';
import { fetchDeFiLlamaAdoption } from '../../services/real-data-sources';
import { calculateDerivativesIntelligenceV2, formatDerivativesIntelligenceV2ForAI } from '../../services/derivatives-intelligence-v2';
import { calculateComprehensiveDerivativesIntelligence, formatComprehensiveDerivativesForAI } from '../../services/comprehensive-derivatives-intelligence';
import { calculateDerivativesIntelligenceFinal, formatDerivativesIntelligenceFinalForAI } from '../../services/derivatives-intelligence-final';
import { calculateBehavioralFinanceIntelligence, BehavioralFinanceInput } from '../../services/behavioral-finance-intelligence';
import { calculateNeuroeconomicIntelligence, formatNeuroeconomicForAI, NeuroeconomicInput } from '../../services/neuroeconomic-intelligence';
import { fetchCachedEnterpriseMarketPrices, formatEnterpriseMarketDataForAI } from '../../services/enterprise-market-data-pipeline';
import { calculateProjectTrustScore, formatTrustScoreForAI } from '../../services/project-research-intelligence';
import { 
  getProjectOmniScoreV23, 
  formatOmniScoreForAI,
  generateQuadrantVisualization,
  type VisualizerProject 
} from '../../services/omniscore';
import { 
  investigateProject, 
  formatInvestigationForAI,
  type ProjectInvestigation 
} from '../../services/project-investigation-service';
import { symbolDetector } from '../../services/symbol-detector';
import { chartDetector } from './chart-detector';
import { clearTrackedSources, getTrackedSources } from './source-manager';
import { logger } from '../../utils/logger';
import { generateMockResponse } from './mock-ai-response';
import { classifyIntent, getResponseFormatInstructions, IntentClassification } from '../../services/intent-classifier';
import { executeHandler, HandlerResult, DataSourceConfig } from '../../services/intent-handlers';
import { 
  enrichMessageWithTokenContext, 
  messageContainsTokenRef,
  TokenContext 
} from '../../services/token-context';
import { runBtcQuantumRisk } from '../../services/source-systems';
import { buildReasoningContext, serializeReasoningContext, validateGrounding } from '../../services/reasoning-context';
import type { ReasoningContext } from '../../services/reasoning-context';
import { logChatAudit } from '../../services/chat-audit';
import {
  ChatMessageRequest,
  ChatMessageResponse,
  ConversationHistoryResponse,
  ChatMessage,
  Source,
  ChartConfig,
  OmniScoreQuadrantData,
} from './types';

export class ChatService {
  // #region agent log helper
  private logDebug(payload: any) {
    try {
      const entry = {
        sessionId: 'debug-session',
        runId: payload.runId || 'pre-fix',
        hypothesisId: payload.hypothesisId || 'H-backend',
        location: payload.location || 'chat/service',
        message: payload.message || 'debug',
        data: payload.data || {},
        timestamp: Date.now(),
      };

      // Prefer HTTP ingest so it works in hosted environments
      const endpoint = 'http://127.0.0.1:7242/ingest/b23bd58d-0401-4047-8e6d-705f7e8b0ea1';
      // #region agent log
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      }).catch(() => {
        try {
          const fs = require('fs');
          const logPath = '/Users/sebastian/Desktop/Arbeit/Coinet v1/coinet-platform/.cursor/debug.log';
          fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
        } catch {
          // swallow fallback errors
        }
      });
      // #endregion
    } catch {
      // swallow all logging errors
    }
  }
  // #endregion

  /**
   * Send a message and get AI response
   */
  async sendMessage(
    userId: string,
    request: ChatMessageRequest
  ): Promise<ChatMessageResponse> {
    const startTime = Date.now();

    // Clear tracked sources at the start of each request
    clearTrackedSources();

    // BTAR-005 — hoisted reference to the CoinetJudgmentPromptPackage built
    // by the judgment block (BTAR-004). The AI output safety gate consumes
    // this at the final-output region around line ~1525. If the judgment
    // block does not run (e.g., no detected coins), this stays undefined and
    // the gate falls back to a default UNAVAILABLE/UNKNOWN-scope package.
    let chatJudgmentPackage: CoinetJudgmentPromptPackage | undefined = undefined;
    // BTAR-008 — hoisted reference to the ChatTrustContext built by the
    // judgment block (BTAR-006). The runtime trust evidence builder consumes
    // this at the final-output region for sanitized observability logging.
    let chatTrustContext: ChatTrustContext | undefined = undefined;

    try {
      logger.info('💬 Processing chat message', {
        userId,
        hasConversationId: !!request.conversationId,
        hasAgentId: !!request.agentId,
      });

      // 1. Get or create conversation
      const conversation = await this.getOrCreateConversation(
        userId,
        request.conversationId,
        request.agentId
      );

      // 2. Store user message
      const userMessage = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'user',
          content: request.message,
        },
      });

      logger.debug('✅ User message stored', { messageId: userMessage.id });

      // 3. Detect chart request
      const chartConfig = chartDetector.detect(request.message);
      if (chartConfig) {
        logger.info('📊 Chart detected', chartConfig);
      }

      // 3.5. 🎯 INTENT CLASSIFICATION - Layer A of Conversation OS
      // Classify user intent to optimize data fetching and response format
      const intentClassification = await classifyIntent(request.message);
      
      logger.info('🎯 Intent classified', {
        intent: intentClassification.intent,
        confidence: intentClassification.confidence.toFixed(2),
        depth: intentClassification.suggestedDepth,
        shape: intentClassification.responseShape,
        processingMs: intentClassification.metadata.processingTimeMs.toFixed(1),
      });

      // 4. Get conversation context (last 10 messages)
      const context = await this.getConversationContext(conversation.id);

      // 4.5. Fetch live context based on INTENT (optimized data fetching)
      let liveContextStr: string | undefined;
      let handlerResult: HandlerResult | null = null;
      let tokenContextResult: { hasTokenContext: boolean; tokenContext: TokenContext | null; injectionText: string | null } | null = null;
      let currentReasoningContext: ReasoningContext | null = null;
      
      try {
        // 🎯 ENTITY-DRIVEN ENRICHMENT: Detect and enrich token entities FIRST
        // This happens regardless of intent classification
        if (messageContainsTokenRef(request.message)) {
          logger.info('🎯 Token reference detected, enriching with token context');
          tokenContextResult = await enrichMessageWithTokenContext(request.message);
          
          if (tokenContextResult.hasTokenContext) {
            logger.info('🎯 Token context built', {
              resolved: tokenContextResult.tokenContext?.resolved,
              needsClarification: tokenContextResult.tokenContext?.needsClarification,
              modulesAvailable: tokenContextResult.tokenContext?.coverage?.available?.join(', ') ?? '',
              symbol: tokenContextResult.tokenContext?.token?.symbol,
            });
          }
        }
        
        // Detect coins mentioned in the message for targeted news
        const detectedCoins = await symbolDetector.detectCoins(request.message);
        const coinSymbols = detectedCoins.map(c => c.symbol.toUpperCase());
        
        // 🚨 CRITICAL FIX: Always fetch at least basic market data, even for simple greetings
        // This prevents empty context which causes generic AI responses
        if (coinSymbols.length === 0 && request.message.toLowerCase().trim() === 'hey') {
          // For simple "hey" greeting, default to BTC to ensure we have SOME context
          coinSymbols.push('BTC');
          logger.debug('🎯 Simple greeting detected, defaulting to BTC for context', {
            message: request.message,
          });
        }
        
        // 🎯 Execute intent handler to determine what data to fetch
        handlerResult = await executeHandler(
          request.message,
          intentClassification,
          { tokens: coinSymbols }
        );
        
        const ds: Record<string, boolean> = (handlerResult as any)?.dataSources || {}; // Data source config from intent handler
        
        logger.debug('🎯 Intent handler executed', {
          intent: intentClassification.intent,
          enabledSources: Object.entries(ds).filter(([_, v]) => v).map(([k]) => k).join(', '),
          maxTokens: (handlerResult as any)?.maxContextTokens,
        });
        
        // Check if this is a trading/leverage question that needs perps data (override handler if explicit)
        const lowerMessage = request.message.toLowerCase();
        const needsPerpsData = lowerMessage.includes('liquidat') || 
                              lowerMessage.includes('funding') || 
                              lowerMessage.includes('leverage') ||
                              lowerMessage.includes('perp') ||
                              lowerMessage.includes('short') ||
                              lowerMessage.includes('long') ||
                              lowerMessage.includes('futures');
        
        // 🎯 INTENT-AWARE DATA FETCHING
        // Only fetch data sources enabled by the intent handler (optimizes for quick_answer vs deep_analysis)
        // 🚨 ENHANCED ERROR TRACKING: Wrap each fetch with error tracking to identify failures
        const dataFetchStartTime = Date.now();
        const fetchResults: Record<string, { success: boolean; error?: string; duration?: number }> = {};
        
        const trackFetch = async <T>(
          name: string,
          promise: Promise<T>,
          enabled: boolean = true
        ): Promise<T | null> => {
          if (!enabled) {
            fetchResults[name] = { success: true, duration: 0 }; // Skipped, not failed
            return null;
          }
          
          const startTime = Date.now();
          try {
            const result = await promise;
            const duration = Date.now() - startTime;
            fetchResults[name] = { success: true, duration };
            return result;
          } catch (error: any) {
            const duration = Date.now() - startTime;
            const errorMsg = error?.message || String(error);
            fetchResults[name] = { success: false, error: errorMsg, duration };
            logger.error(`❌ Data fetch failed: ${name}`, {
              error: errorMsg,
              duration,
              stack: error?.stack,
            });
            return null;
          }
        };
        
        // Special handling for whaleContext since it has a default structure
        const whaleContextPromise = ds.fetchWhaleData
          ? trackFetch('whaleContext', getWhaleContextForAI(), true).then(r => r || { isAvailable: false, contextForAI: null, monitoredChains: [], capabilities: [] })
          : Promise.resolve({ isAvailable: false, contextForAI: null, monitoredChains: [], capabilities: [] });
        
        // 🚨 CRITICAL FIX: Always fetch market data, even if intent handler says not to
        // This ensures AI always has SOME context to work with
        const shouldFetchMarketData = ds.fetchMarketData || coinSymbols.length > 0 || request.message.toLowerCase().trim() === 'hey';
        
        // CMC AI Agent Hub (Layer-1 macro + derivatives). Co-primary with
        // CoinGecko on macro atoms, challenger on derivatives. trackFetch-guarded
        // → null on any failure, so it degrades honestly without aborting judgment.
        const cmcSymbolForDeriv = coinSymbols[0] || 'BTC';
        // DeFiLlama protocol fundamentals for the primary coin (real TVL/fees/
        // revenue). The slug map self-gates: non-DeFi tokens (BTC, memecoins)
        // have no slug → instant {hasAdoptionData:false}, no network call → the
        // snapshot's protocol family stays APPLICABLE_NO_DATA / NOT_APPLICABLE.
        const defiLlamaId = (detectedCoins[0]?.coinGeckoId || coinSymbols[0] || '').toLowerCase();
        const [userContext, marketData, enterpriseMarketData, whaleContext, enrichedNews, sentiment, socialIntel, influencerIntel, csiResult, cssResult, socialV2Result, newsV2Result, perpsData, derivativesV2, comprehensiveDerivatives, derivativesFinal, globalMarket, cmcGlobal, cmcDerivatives, freePerps, defiLlama] = await Promise.all([
          trackFetch('userContext', buildUserContextForAI(userId), true),
          trackFetch('marketData', fetchPricesForMessage(request.message), shouldFetchMarketData),
          trackFetch('enterpriseMarketData', fetchCachedEnterpriseMarketPrices(coinSymbols), (ds.fetchEnterpriseData && coinSymbols.length > 0) || coinSymbols.length > 0),
          whaleContextPromise,
          trackFetch('enrichedNews', getEnrichedNewsForCoins(coinSymbols), ds.fetchNews),
          trackFetch('sentiment', getMarketSentiment(), ds.fetchSentiment),
          trackFetch('socialIntel', getSocialIntelligence(coinSymbols.length > 0 ? coinSymbols : ['BTC', 'ETH', 'SOL']), ds.fetchSocial),
          trackFetch('influencerIntel', getInfluencerSnapshot(), ds.fetchInfluencer),
          trackFetch('csiResult', calculateCSI(), ds.fetchSentiment),
          trackFetch('cssResult', calculateCompositeSocialScore(), ds.fetchSocial),
          trackFetch('socialV2Result', calculateSocialIntelligenceV2(), ds.fetchSocial),
          trackFetch('newsV2Result', calculateNewsIntelligenceV2(), ds.fetchNews),
          trackFetch('perpsData', getPerpsSnapshot(coinSymbols), ds.fetchDerivatives || needsPerpsData),
          trackFetch('derivativesV2', calculateDerivativesIntelligenceV2(), ds.fetchDerivatives),
          trackFetch('comprehensiveDerivatives', calculateComprehensiveDerivativesIntelligence(), ds.fetchDerivatives),
          trackFetch('derivativesFinal', calculateDerivativesIntelligenceFinal(), ds.fetchDerivatives),
          trackFetch('globalMarket', getGlobalMarketData(), coinSymbols.length > 0), // BTAR-011: real CoinGecko /global (dominance + total mcap)
          trackFetch('cmcGlobal', getCmcGlobalMetrics(), coinSymbols.length > 0), // CMC Agent Hub: macro co-primary (F&G, dominance, total mcap, 7d coverage)
          trackFetch('cmcDerivatives', getCmcDerivatives(cmcSymbolForDeriv), (ds.fetchDerivatives || needsPerpsData) && coinSymbols.length > 0), // CMC Agent Hub: derivatives challenger
          trackFetch('freePerps', getFreePerps(coinSymbols), coinSymbols.length > 0), // Path B: free per-token perps (Bybit + OKX, no key) — funding/OI/L-S
          trackFetch('defiLlama', fetchDeFiLlamaAdoption(defiLlamaId), coinSymbols.length > 0), // DeFiLlama: per-token protocol TVL/fees/revenue (slug-gated to DeFi)
        ]);
        
        const dataFetchDuration = Date.now() - dataFetchStartTime;
        const failedFetches = Object.entries(fetchResults).filter(([_, r]) => !r.success);
        const successfulFetches = Object.entries(fetchResults).filter(([_, r]) => r.success && r.duration && r.duration > 0);
        
        if (failedFetches.length > 0) {
          logger.warn('⚠️ Some data sources failed during fetch', {
            failed: failedFetches.map(([name, r]) => ({ name, error: r.error, duration: r.duration })),
            successful: successfulFetches.length,
            totalDuration: dataFetchDuration,
          });
        } else {
          logger.info('✅ All enabled data sources fetched successfully', {
            successful: successfulFetches.length,
            totalDuration: dataFetchDuration,
          });
        }
        
        // Calculate behavioral finance intelligence using derivatives data
        let behavioralFinance = null;
        let neuroeconomicIntel = null;
        
        if (derivativesV2 && csiResult) {
          try {
            const behavioralInput: BehavioralFinanceInput = {
              currentPrice: derivativesV2.marketContext.currentPrice,
              recentHigh: derivativesV2.marketContext.recentHigh,
              priceChange24h: derivativesV2.marketContext.priceChange24h,
              priceChange7d: derivativesV2.marketContext.priceChange7d,
              priceChange30d: derivativesV2.marketContext.priceChange30d,
              fearGreedIndex: csiResult.index.rounded,
              socialSentiment: socialV2Result ? (socialV2Result.headline.socialScore - 50) / 50 : 0,
              herdStrength: cssResult ? cssResult.scores.composite : 50,
              fundingRate: derivativesV2.funding.weightedAvgRate,
              volatility: Math.abs(derivativesV2.marketContext.drawdownFromHigh) * 3,
              newsCount: newsV2Result ? newsV2Result.articles.total : 50,
              cognitiveLoad: derivativesV2.headline.derivativesScore > 70 || derivativesV2.headline.derivativesScore < 30 ? 70 : 40,
            };
            behavioralFinance = await calculateBehavioralFinanceIntelligence(behavioralInput);
          } catch (error) {
            logger.warn('⚠️ Behavioral finance calculation failed, continuing without', { error });
          }
          
          // Calculate neuroeconomic intelligence (neural decision analysis)
          try {
            const neuroInput: NeuroeconomicInput = {
              currentPrice: derivativesV2.marketContext.currentPrice,
              entryPrice: derivativesV2.marketContext.recentHigh * 0.95,
              expectedReturn: 0.05,
              actualReturn: derivativesV2.marketContext.priceChange7d,
              fearGreedIndex: csiResult.index.rounded,
              volatility: Math.abs(derivativesV2.marketContext.drawdownFromHigh) * 2,
              herdStrength: cssResult ? cssResult.scores.composite : 60,
              marketFairness: 0.1,
              influencerSentiment: socialV2Result ? (socialV2Result.headline.socialScore - 50) / 50 : 0.1,
              delayedRewardAmount: derivativesV2.marketContext.currentPrice * 1.20,
              delayPeriods: 12,
              recentLoss: derivativesV2.marketContext.priceChange7d < 0,
              ambiguityLevel: 0.4,
              informationLoad: 8,
              hoursTrading: 4,
              decisionsToday: 5,
            };
            neuroeconomicIntel = await calculateNeuroeconomicIntelligence(neuroInput);
          } catch (error) {
            logger.warn('⚠️ Neuroeconomic intelligence calculation failed, continuing without', { error });
          }
        }
        
        let contextParts: string[] = [];
        
        // 0. Add user profile context (highest priority - personalization!)
        // Null-safe: trackFetch returns null if buildUserContextForAI throws
        // (e.g. a missing / drifted DB table like user_portfolios). This block is
        // BEFORE the BTAR-009 backstop try, so an unguarded deref here would abort
        // the entire context assembly and skip produceJudgment() → surface as
        // "structured judgment unavailable". Judgment does NOT depend on
        // userContext, so degrade gracefully (skip personalization) instead.
        if (userContext?.hasProfile && userContext.contextString) {
          contextParts.push(userContext.contextString);
          logger.debug('🧠 User context added', { 
            hasPortfolio: userContext.portfolio.totalHoldings > 0,
            hasPreferences: !!userContext.preferences.riskTolerance,
            watchlistSize: userContext.watchlist.length
          });
        }
        
        // 0.5 🎯 TOKEN CONTEXT INJECTION (Entity-Driven Enrichment)
        // This takes priority over general market data when user mentions a specific token
        if (tokenContextResult?.hasTokenContext && tokenContextResult.injectionText) {
          contextParts.push(tokenContextResult.injectionText);
          logger.info('🎯 Token context injected', {
            symbol: tokenContextResult.tokenContext?.token?.symbol,
            chain: tokenContextResult.tokenContext?.token?.chain,
            modulesAvailable: tokenContextResult.tokenContext?.coverage?.available,
            needsClarification: tokenContextResult.tokenContext?.needsClarification,
          });
          
          // If token context needs clarification, skip some other data fetching
          // to keep the response focused on asking for the missing info
          if (tokenContextResult.tokenContext?.needsClarification) {
            logger.info('🎯 Token needs clarification - response will ask for address/chain');
          }
        }
        
        // BTAR-009 — Context-assembly backstop. A malformed data source must
        // never abort the whole context block, because the judgment engine runs
        // AFTER this block — an uncaught throw here would skip produceJudgment()
        // and surface as "structured judgment unavailable". Per-section
        // conditions use optional chaining for graceful degradation; this
        // try/catch is the safety net for any other unforeseen formatter throw.
        try {
        // 1. Add market data (prefer Enterprise Pipeline with Cache - Step 1.4.1 + 1.4.2)
        if (enterpriseMarketData && (enterpriseMarketData.prices?.length ?? 0) > 0) {
          contextParts.push(formatEnterpriseMarketDataForAI(enterpriseMarketData));
          logger.debug('⚡ Enterprise Market Data (Cached) used', { 
            requested: enterpriseMarketData.requestedSymbols.length,
            found: enterpriseMarketData.prices.length,
            missing: enterpriseMarketData.missingSymbols,
            avgConfidence: enterpriseMarketData.metrics.avgConfidence,
            avgDataQuality: enterpriseMarketData.metrics.avgDataQuality,
            sourcesQueried: enterpriseMarketData.metrics.sourcesQueried,
            crossVerified: enterpriseMarketData.metrics.crossVerificationPassed,
            regime: enterpriseMarketData.regime,
            // Cache info
            cacheSource: (enterpriseMarketData as any).cacheInfo?.source || 'api',
            cacheLatencyMs: (enterpriseMarketData as any).cacheInfo?.latencyMs || 0,
            cacheStale: (enterpriseMarketData as any).cacheInfo?.stale || false,
          });
        } else if (marketData && (marketData.prices?.length ?? 0) > 0) {
          // Fallback to standard market data
          contextParts.push(formatMarketDataForAI(marketData));
          logger.debug('📊 Standard market data used (fallback)', { 
            requested: marketData.requestedSymbols,
            found: marketData.foundSymbols,
            missing: marketData.missingSymbols
          });
        }
        
        // 2. Add market sentiment (Fear & Greed)
        if (sentiment) {
          contextParts.push(formatSentimentForAI(sentiment));
          logger.debug('📊 Sentiment added', { 
            value: sentiment.fearGreed.value,
            classification: sentiment.fearGreed.classification 
          });
        }
        
        // 3. Add AI-enriched news intelligence context
        if (enrichedNews && (enrichedNews.articles?.length ?? 0) > 0) {
          contextParts.push(formatEnrichedNewsForAI(enrichedNews));
          logger.debug('🧠📰 Enriched news intelligence added', { 
            count: enrichedNews.articles.length,
            sentiment: enrichedNews.dominantSentiment,
            marketMood: enrichedNews.aggregateIntelligence.marketMood.overall,
            criticalAlerts: enrichedNews.aggregateIntelligence.criticalAlerts.length,
            riskLevel: enrichedNews.aggregateIntelligence.riskAssessment.level,
          });
        }
        
        // 4. Add whale intelligence context
        // Null-safe (trackFetch may return null); already inside the BTAR-009
        // backstop try, so this guard is defense-in-depth for consistency with 418.
        if (whaleContext?.isAvailable && whaleContext.contextForAI) {
          contextParts.push(whaleContext.contextForAI);
          logger.debug('🐋 Whale context added', { 
            chains: whaleContext.monitoredChains,
            capabilities: whaleContext.capabilities.length
          });
        }
        
        // 5. Add multi-platform social intelligence context (Step 1.2.1)
        if (socialIntel && (socialIntel.coins?.length ?? 0) > 0) {
          contextParts.push(formatSocialIntelligenceForAI(socialIntel));
          logger.debug('🌐 Social intelligence added', { 
            platforms: socialIntel.activePlatforms.join(','),
            mentions: socialIntel.aggregate.totalMentions,
            sentiment: socialIntel.aggregate.overallSentiment.label,
            trending: socialIntel.trendingCoins.length,
            dataQuality: socialIntel.dataQuality,
          });
        }
        
        // 6. Add Derivatives Intelligence v2.0 (Section 1.3 - Divine Perfection)
        if (derivativesV2) {
          contextParts.push(formatDerivativesIntelligenceV2ForAI(derivativesV2));
          logger.debug('💀 Derivatives Intelligence v2.0 context added', {
            score: derivativesV2.headline.derivativesScore,
            signal: derivativesV2.headline.signal,
            liquidations24h: derivativesV2.liquidations.total24h,
            fundingBias: derivativesV2.funding.bias,
            regime: derivativesV2.regime.current,
            confidence: derivativesV2.confidence.overall,
          });
        }
        
        // 6.2 Add Comprehensive Derivatives Intelligence (Step 1.3.2 - Full Analysis)
        if (comprehensiveDerivatives) {
          contextParts.push(formatComprehensiveDerivativesForAI(comprehensiveDerivatives));
          logger.debug('💀 Comprehensive Derivatives Intelligence added', {
            derivativesScore: comprehensiveDerivatives.headline.derivativesScore,
            riskLevel: comprehensiveDerivatives.headline.riskLevel,
            primarySignal: comprehensiveDerivatives.headline.primarySignal,
            marketRegime: comprehensiveDerivatives.marketRegime,
            cascadeRisk: comprehensiveDerivatives.liquidations.cascadePrediction.overallCascadeRisk,
            longSqueezeProb: comprehensiveDerivatives.squeezeAnalysis.longSqueeze.probability,
            shortSqueezeProb: comprehensiveDerivatives.squeezeAnalysis.shortSqueeze.probability,
            alertCount: comprehensiveDerivatives.alerts.length,
          });
        }
        
        // 6.3 Add Derivatives Intelligence FINAL (Section 1.3 Complete - All Acceptance Criteria)
        // This is the definitive derivatives analysis with:
        // - Real-time alerts (<10s latency)
        // - Liquidation heatmap with cascade points
        // - Cascade prediction (>70% backtested accuracy)
        // - 100% reliable arbitrage detection
        if (derivativesFinal) {
          contextParts.push(formatDerivativesIntelligenceFinalForAI(derivativesFinal));
          logger.debug('💀 Derivatives Intelligence FINAL added (Divine Perfection)', {
            version: derivativesFinal.version,
            derivativesScore: derivativesFinal.headline.derivativesScore,
            riskLevel: derivativesFinal.headline.riskLevel,
            primarySignal: derivativesFinal.headline.primarySignal,
            regime: derivativesFinal.regime.current,
            cascadeRisk: derivativesFinal.liquidations.cascadePrediction.overallRisk,
            modelAccuracy: derivativesFinal.liquidations.cascadePrediction.modelAccuracy,
            arbitrageOpps: derivativesFinal.funding.arbitrageOpportunities.length,
            alertCount: derivativesFinal.alerts.length,
            latencyMs: derivativesFinal.quality.latencyMs,
          });
        }
        
        // 6.3 Legacy perps data (kept for backward compatibility)
        if (perpsData && ((perpsData.liquidations?.length ?? 0) > 0 || (perpsData.fundingRates?.length ?? 0) > 0)) {
          // Skip if we already have v2 context
          if (!derivativesV2) {
            contextParts.push(formatPerpsForAI(perpsData));
            logger.debug('💀 Legacy Perps context added', {
              liquidations: perpsData.liquidations.length,
              fundingRates: perpsData.fundingRates.length,
              totalLiq: perpsData.marketSummary.totalLiquidations24h,
            });
          }
        }
        
        // 7. Add influencer intelligence context (Step 1.2.3)
        if (influencerIntel && ((influencerIntel.recentPosts?.length ?? 0) > 0 || (influencerIntel.activeAlerts?.length ?? 0) > 0)) {
          contextParts.push(formatInfluencerIntelligenceForAI(influencerIntel));
          logger.debug('👤 Influencer intelligence added', {
            activeInfluencers: influencerIntel.activeInfluencers,
            recentPosts: influencerIntel.recentPosts.length,
            activeAlerts: influencerIntel.activeAlerts.length,
            criticalAlerts: influencerIntel.criticalAlerts.length,
            sentiment: influencerIntel.influencerSentiment.overall,
          });
          
          // 7.1 Add advanced analytics (contrarian, consensus)
          if (influencerIntel.recentPosts.length >= 5) {
            const contrarian = analyzeContrarianIndicator(influencerIntel.recentPosts);
            const primaryCoin = coinSymbols[0] || 'BTC';
            const consensus = analyzeConsensus(primaryCoin, influencerIntel.recentPosts, []);
            
            if (contrarian.contrarian.isExtreme || consensus.divergence.hasDivergence) {
              contextParts.push(formatAdvancedAnalyticsForAI(contrarian, null, consensus));
              logger.debug('🔬 Advanced influencer analytics added', {
                contrarianSignal: contrarian.contrarian.contrarySignal,
                consensusLabel: consensus.weighted.label,
                hasDivergence: consensus.divergence.hasDivergence,
              });
            }
          }
        }
        
        // 8. Add Coinet Sentiment Index (CSI) - Enterprise Grade
        if (csiResult) {
          contextParts.push(formatCSIForAI(csiResult));
          logger.debug('📊 CSI context added', {
            index: csiResult.index.rounded,
            regime: csiResult.index.regime,
            dataQuality: csiResult.metadata.dataQuality,
          });
        }
        
        // 9. Add Composite Social Score (CSS) - 10/10 Divine Perfection (Step 1.2.5)
        // Synthesizes FUD/FOMO indices, platform-specific scores, segment scores
        if (cssResult) {
          contextParts.push(formatCSSForAI(cssResult));
          logger.debug('📊 CSS context added', {
            composite: cssResult.scores.composite,
            fud: cssResult.scores.fud.score,
            fomo: cssResult.scores.fomo.score,
            regime: cssResult.regime.current,
            confidence: cssResult.confidence.confidence,
            riskLevel: cssResult.interpretation.riskLevel,
          });
        }
        
        // 10. Add Social Intelligence v2.0 - 10/10 Divine Perfection (Section 1.2 Complete)
        // Comprehensive social analysis with empirical calibration, regime awareness, confidence bands
        if (socialV2Result) {
          contextParts.push(formatSocialIntelligenceV2ForAI(socialV2Result));
          logger.debug('🌐 Social Intelligence v2.0 context added', {
            socialScore: socialV2Result.headline.socialScore,
            fud: socialV2Result.headline.fudIndex,
            fomo: socialV2Result.headline.fomoIndex,
            regime: socialV2Result.regime.current,
            confidence: socialV2Result.confidence.overall,
            riskLevel: socialV2Result.interpretation.riskLevel,
            dataQuality: socialV2Result.dataQuality.overall,
          });
        }
        
        // 11. Add News Intelligence v2.0 - 10/10 Divine Perfection (Section 1.1 Complete)
        // Comprehensive news analysis with empirical calibration, regime awareness, confidence bands
        if (newsV2Result) {
          contextParts.push(formatNewsIntelligenceV2ForAI(newsV2Result));
          logger.debug('📰 News Intelligence v2.0 context added', {
            newsScore: newsV2Result.headline.newsScore,
            sentiment: newsV2Result.headline.sentimentLabel,
            impact: newsV2Result.headline.impactScore,
            urgency: newsV2Result.headline.urgencyLevel,
            regime: newsV2Result.regime.current,
            confidence: newsV2Result.confidence.overall,
            articles: newsV2Result.articles.total,
          });
        }
        
        // 12. Add Behavioral Finance Intelligence - Neuroeconomic Analysis
        // Based on: Kahneman & Tversky's Prospect Theory, Dual Process Theory, Disposition Effect
        // Provides: Emotional cycle position, cognitive biases, contrarian signals, trading psychology coaching
        if (behavioralFinance) {
          contextParts.push(behavioralFinance.aiContext);
          logger.debug('🧠 Behavioral Finance Intelligence context added', {
            emotionalPhase: behavioralFinance.profile.emotionalPhase,
            riskLevel: behavioralFinance.profile.riskLevel,
            contrarianSignal: behavioralFinance.profile.contrarianSignal.signal,
            biasRiskScore: behavioralFinance.profile.biasRiskScore,
            activeBiases: behavioralFinance.profile.activeBiases.length,
            decisionQuality: behavioralFinance.profile.cognitiveState.decisionQuality,
            alerts: behavioralFinance.profile.alerts.length,
            coachingReadiness: behavioralFinance.profile.coaching.trilogyAssessment.overallReadiness,
          });
        }
        
        // 13. Add Neuroeconomic Intelligence - Neural Decision Analysis
        // Based on: Glimcher & Fehr (2013), Schultz (1997), Tom et al. (2007)
        // Provides: Neural region activations, reward prediction error, risk perception, cognitive state
        if (neuroeconomicIntel) {
          contextParts.push(formatNeuroeconomicForAI(neuroeconomicIntel));
          logger.debug('🧠 Neuroeconomic Intelligence context added', {
            marketRegime: neuroeconomicIntel.marketRegime,
            dominantRegion: neuroeconomicIntel.neural.dominantRegion,
            neuralBalance: neuroeconomicIntel.neural.neuralBalance,
            rationalityScore: neuroeconomicIntel.neural.rationalityScore,
            rpe: neuroeconomicIntel.rewardPredictionError.direction,
            riskTolerance: neuroeconomicIntel.riskPerception.riskTolerance,
            optimalAction: neuroeconomicIntel.tradingImplications.optimalAction,
            decisionGrade: neuroeconomicIntel.decisionQuality.grade,
          });
        }
        
        } catch (contextFormatError) {
          // Degraded, not fatal: keep whatever context was already assembled and
          // fall through to the judgment engine below. This guarantees the
          // judgment block always runs even if a single formatter threw.
          logger.warn('⚠️ Context formatting failed — degraded, judgment still runs', {
            error: contextFormatError instanceof Error ? contextFormatError.message : String(contextFormatError),
          });
        }

        // BTAR-010 — capture the primary coin's OmniScore (risk + concentration)
        // computed in the block below so the judgment SignalSnapshot can consume
        // real security-risk + holder-concentration instead of hardcoded zeros.
        // Stays null when OmniScore is unavailable (e.g. BTC low-coverage) → the
        // snapshot then falls back to neutral rather than a false zero.
        let primaryOmniScore: any = null;

        // 14. Add OmniScore v2.3.2 - Production Hardened + Stability Guard
        // Provides: Quality Score (QS), Opportunity Score (OS), Narrative vs Reality Gap (NRG)
        // Features: Reflexivity firewall, 12 production invariants, stability guard, fail-closed
        // CRITICAL: Chat must NEVER improvise OmniScore numbers - always use real API data
        if (detectedCoins.length > 0) {
          try {
            logger.debug('🔍 OmniScore: Detected coins', {
              count: detectedCoins.length,
              coins: detectedCoins.map(c => ({ symbol: c.symbol, coinGeckoId: c.coinGeckoId })),
            });
            
            // Check if user wants a comparison/ranking of multiple coins
            // Limit to top 5 to avoid timeouts
            const coinsToAnalyze = detectedCoins.slice(0, 5);
            
            logger.debug('🔍 OmniScore: Coins to analyze', {
              count: coinsToAnalyze.length,
              coins: coinsToAnalyze.map(c => ({ symbol: c.symbol, coinGeckoId: c.coinGeckoId })),
            });
            
            if (coinsToAnalyze.length > 1) {
              logger.debug('🎯 OmniScore: Multi-coin analysis detected, fetching scores...');
              
              // Multi-coin analysis: Generate Quadrant Board
              // 🛡️ FIX: Handle synthetic scores for top-tier assets that fail
              const omniScores = await Promise.all(
                coinsToAnalyze.map(async (coin) => {
                  const projectId = coin.coinGeckoId || coin.symbol.toLowerCase();
                  try {
                    const score = await getProjectOmniScoreV23(projectId);
                    // TypeScript guard should have already synthesized if top-tier and failed
                    // But double-check here for multi-coin path
                    if (!score.success) {
                      logger.warn(`⚠️ OmniScore returned success=false for ${coin.symbol}, checking if synthetic needed`);
                      // The guard in getProjectOmniScoreV23 should have handled this, but log for visibility
                    }
                    return score;
                  } catch (error) {
                    logger.warn(`⚠️ OmniScore fetch threw exception for ${coin.symbol}:`, error);
                    // Exception should have been caught by guard in getProjectOmniScoreV23
                    // Return null here - guard should have returned synthetic score before throwing
                    return null;
                  }
                })
              );
              
              logger.debug('🔍 OmniScore: Fetch results', {
                requested: coinsToAnalyze.length,
                received: omniScores.filter(s => s !== null).length,
                results: omniScores.map((s, i) => ({
                  coin: coinsToAnalyze[i].symbol,
                  success: s?.success || false,
                  hasData: !!s,
                  isSynthetic: s?.audit?.violations?.some((v: any) => v.code === 'SYNTHETIC') || false,
                })),
              });
              
              // Include synthetic scores (they have success: true)
              const validScores = omniScores.filter(s => s && s.success);
              // BTAR-010 — omniScores[i] maps to coinsToAnalyze[i]; [0] is the primary coin.
              if (omniScores[0] && omniScores[0].success) primaryOmniScore = omniScores[0];
              
              logger.debug('🔍 OmniScore: Valid scores', {
                count: validScores.length,
                validCoins: validScores.map((s: any) => s?.project),
              });
              
              if (validScores.length > 0) {
                // Generate visual quadrant map
                // Map project IDs back to proper ticker symbols (BTC, ETH, SOL, not BITCOIN, ETHEREUM, SOLANA)
                const projectToSymbol: Record<string, string> = {};
                for (const coin of coinsToAnalyze) {
                  const cgId = coin.coinGeckoId || coin.symbol.toLowerCase();
                  projectToSymbol[cgId] = coin.symbol.toUpperCase();
                }
                
                const visualizerData: VisualizerProject[] = validScores.map((s: any) => ({
                  ticker: projectToSymbol[s.project] || s.project.toUpperCase().slice(0, 4), // Use proper symbol, fallback to truncated ID
                  qs: s.qualityScore.score,
                  os: s.opportunityScore.gated ? null : s.opportunityScore.score,
                  pos: s.pos.raw,
                  posAdj: s.pos.adjusted,
                  confidence: s.audit.confidence,
                  nmiTier: s.nmi?.tier || 'clean',
                }));
                
                this.logDebug({
                  runId: 'pre-fix',
                  hypothesisId: 'H1-backend',
                  location: 'chat/service:quadrant-build',
                  message: 'Built visualizer data',
                  data: {
                    count: visualizerData.length,
                    tickers: visualizerData.map(v => v.ticker),
                    qs: visualizerData.map(v => v.qs),
                    os: visualizerData.map(v => v.os),
                    posAdj: visualizerData.map(v => v.posAdj),
                  },
                });

                const quadrantChart = {
                  type: 'omniscore-quadrant',
                  projects: visualizerData,
                };

                const visualChart = generateQuadrantVisualization(visualizerData);
                contextParts.push(visualChart);
                
                // Store quadrant data for frontend React component rendering via charts payload
                (request as any)._omniscoreQuadrantChart = quadrantChart;
                
                logger.info('✅ OmniScore Multi-Coin Quadrant generated and stored', {
                  coins: coinsToAnalyze.map(c => c.symbol),
                  count: validScores.length,
                  chartType: quadrantChart.type,
                  projectsCount: quadrantChart.projects.length,
                  chartStored: !!(request as any)._omniscoreQuadrantChart,
                });
                
                // 🚨 FIX: Add ALL coins' OmniScore data to AI context, not just the first one!
                // Previously only BTC got the detailed formatOmniScoreForAI treatment, causing
                // the AI to hallucinate scores for ETH/SOL. Now we add EVERY coin.
                contextParts.push(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🚨 MULTI-COIN OMNISCORE ANALYSIS - USE EXACT NUMBERS BELOW                  ║
╚═══════════════════════════════════════════════════════════════════════════════╝

⚠️ CRITICAL COMPLIANCE RULES FOR MULTI-COIN ANALYSIS:
1. You MUST use the EXACT scores shown below for EACH coin
2. NEVER invent, estimate, or "peg" scores - ONLY use values from this payload
3. Each coin has its own POS, QS, OS, and tier - do NOT confuse them
4. If a coin is not listed below, say "OmniScore not available for [SYMBOL]"

════════════════════════════════════════════════════════════════════════════════
`);
                
                for (const score of validScores) {
                  const s = score as any;
                  const ticker = projectToSymbol[s.project] || s.project.toUpperCase();
                  const quadrant = s.qualityScore.score >= 60 && s.opportunityScore.score >= 60 ? 'TARGET' :
                                   s.qualityScore.score >= 60 && s.opportunityScore.score < 60 ? 'BUILDER' :
                                   s.qualityScore.score < 60 && s.opportunityScore.score >= 60 ? 'HYPE' : 'AVOID';
                  
                  contextParts.push(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ${ticker} - OmniScore Analysis (v${s.audit.engineVersion})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• POS (Overall Score):    ${s.pos.adjusted}/100  ← USE THIS EXACT NUMBER
• Tier:                   ${s.pos.tier}          ← USE THIS EXACT STRING
• Quality Score (QS):     ${s.qualityScore.score}/100 (${s.qualityScore.tier})
• Opportunity Score (OS): ${s.opportunityScore.score}/100 (${s.opportunityScore.tier})
• Quadrant Position:      ${quadrant} Zone
• Risk Score:             ${s.risk.score.toFixed(1)}/100
• NRG:                    ${s.nrg.value >= 0 ? '+' : ''}${s.nrg.value.toFixed(2)} (${s.nrg.interpretation})
• Confidence:             ${s.audit.confidence}
• Coverage (QS/OS):       ${(s.qualityScore.coverage * 100).toFixed(0)}% / ${(s.opportunityScore.coverage * 100).toFixed(0)}%

✅ CORRECT: "${ticker} scores ${s.pos.adjusted}/100 (${s.pos.tier} tier)"
❌ WRONG:   "${ticker} scores [any other number] (${s.pos.tier !== 'Weak' ? 'Weak' : 'Strong'} tier)"
`);
                }
                
                contextParts.push(`
════════════════════════════════════════════════════════════════════════════════
🚫 FORBIDDEN PATTERNS:
❌ "ETH and SOL both score 43" - WRONG! Use the EXACT scores above
❌ Confusing quadrant position (Builder/Target) with tier (Elite/Strong/Weak)
❌ Saying "around X" or "approximately X" - use EXACT values
❌ Making up scores for coins NOT listed above
════════════════════════════════════════════════════════════════════════════════
`);
              } else {
                // FAIL-CLOSED: No valid scores available - tell AI not to improvise
                contextParts.push(`
⚠️ OMNISCORE DATA UNAVAILABLE
The OmniScore engine could not retrieve reliable data for the requested projects.
DO NOT improvise or estimate OmniScore values. Instead, inform the user that:
- OmniScore analysis is temporarily unavailable for these projects
- They should try again in a few minutes
- Basic market data may still be available
`);
                logger.warn('⚠️ OmniScore Multi-Coin: No valid scores - fail-closed activated');
              }
            } else {
              // Single coin deep dive with production-grade error handling
              const primaryCoin = detectedCoins[0];
              const projectLookupId = primaryCoin.coinGeckoId || primaryCoin.symbol.toLowerCase();
              
              logger.info('[OmniScore Chat] Requesting OmniScore', {
                symbol: primaryCoin.symbol,
                lookupId: projectLookupId,
              });
              
              try {
                // PRODUCTION FIX: Explicit try-catch around OmniScore calculation
                const omniScore = await getProjectOmniScoreV23(projectLookupId);
                
                logger.info('[OmniScore Chat] OmniScore response received', {
                  symbol: primaryCoin.symbol,
                  success: omniScore.success,
                  confidence: omniScore.audit.confidence,
                  invariantStatus: omniScore.audit.invariantStatus,
                  hasViolations: omniScore.audit.violations?.length > 0,
                });
                
                if (omniScore && omniScore.success) {
                  primaryOmniScore = omniScore; // BTAR-010 capture for judgment snapshot
                  // SUCCESS PATH: OmniScore calculated successfully
                  logger.info('✅ [OmniScore Chat] Using successful OmniScore data', {
                    symbol: primaryCoin.symbol,
                    pos: omniScore.pos.adjusted,
                    tier: omniScore.pos.tier,
                  });
                  
                  // Check confidence level - if insufficient, add warning
                  if (omniScore.audit.confidence === 'insufficient') {
                    contextParts.push(`
⚠️ OMNISCORE LOW CONFIDENCE WARNING
The OmniScore for ${primaryCoin.symbol} has INSUFFICIENT confidence.
Data sources may be degraded. Present these numbers with appropriate caveats.
`);
                  }
                  
                  // Add stability warning if applicable
                  if ((omniScore as any).stability?.guardApplied) {
                    contextParts.push(`
📊 STABILITY GUARD ACTIVE
Score stability guard was applied due to data coverage changes.
${(omniScore as any).stability.notes?.join('\n') || ''}
`);
                  }
                  
                  contextParts.push(formatOmniScoreForAI(omniScore));
                  logger.debug('🎯 OmniScore v2.3.2 context added', {
                    project: omniScore.project,
                    posAdjusted: omniScore.pos.adjusted,
                    posTier: omniScore.pos.tier,
                    qsScore: omniScore.qualityScore.score,
                    qsTier: omniScore.qualityScore.tier,
                    osStatus: omniScore.opportunityScore.status,
                    osScore: omniScore.opportunityScore.score,
                    nrgInterpretation: omniScore.nrg.interpretation,
                    confidence: omniScore.audit.confidence,
                    invariantStatus: omniScore.audit.invariantStatus,
                    reflexivityStatus: omniScore.audit.reflexivitySentinel.status,
                    stabilityApplied: (omniScore as any).stability?.guardApplied || false,
                  });
                  
                } else {
                  // FAILURE PATH: OmniScore returned success: false
                  logger.warn('⚠️ [OmniScore Chat] OmniScore calculation failed (success: false)', {
                    symbol: primaryCoin.symbol,
                    lookupId: projectLookupId,
                    confidence: omniScore.audit.confidence,
                    invariantStatus: omniScore.audit.invariantStatus,
                    violations: omniScore.audit.violations?.length || 0,
                  });
                  
                  // FALLBACK: Trigger comprehensive investigation
                  logger.info('🔍 [Fallback] Triggering comprehensive investigation', {
                    reason: 'omniscore_failed',
                    coin: primaryCoin.symbol,
                  });
                  
                  try {
                    const investigation = await investigateProject(
                      primaryCoin.coinGeckoId || primaryCoin.symbol
                    );
                    
                    if (investigation && investigation.hasData) {
                      contextParts.push(formatInvestigationForAI(investigation));
                      logger.info('✅ [Fallback] Project investigation completed', {
                        project: investigation.name,
                        symbol: investigation.symbol,
                        dataQuality: investigation.dataQuality,
                        sources: investigation.sources?.length || 0,
                      });
                    } else {
                      logger.warn('⚠️ [Fallback] Investigation returned no data', {
                        symbol: primaryCoin.symbol,
                      });
                      contextParts.push(`
⚠️ PROJECT DATA LIMITED FOR ${primaryCoin.symbol.toUpperCase()}
Could not retrieve comprehensive data for this project.
Basic market data may still be available above.
DO NOT improvise scores or metrics - only use verified data provided.
`);
                    }
                  } catch (invError) {
                    logger.error('❌ [Fallback] Project investigation threw exception', {
                      symbol: primaryCoin.symbol,
                      error: invError instanceof Error ? invError.message : String(invError),
                    });
                    contextParts.push(`
⚠️ OMNISCORE DATA UNAVAILABLE FOR ${primaryCoin.symbol.toUpperCase()}
The OmniScore engine could not retrieve reliable data for this project.
DO NOT improvise or estimate OmniScore values.
`);
                  }
                }
                
              } catch (omniScoreException) {
                // EXCEPTION PATH: getProjectOmniScoreV23 threw an exception
                // This should NOT happen with the new error handling, but defense in depth
                logger.error('❌ [OmniScore Chat] getProjectOmniScoreV23 threw exception (unexpected)', {
                  symbol: primaryCoin.symbol,
                  lookupId: projectLookupId,
                  error: omniScoreException instanceof Error ? omniScoreException.message : String(omniScoreException),
                  stack: omniScoreException instanceof Error ? omniScoreException.stack : undefined,
                });
                
                // FALLBACK: Trigger investigation
                logger.info('🔍 [Fallback] Triggering investigation after exception', {
                  reason: 'omniscore_exception',
                  coin: primaryCoin.symbol,
                });
                
                try {
                  const investigation = await investigateProject(
                    primaryCoin.coinGeckoId || primaryCoin.symbol
                  );
                  
                  if (investigation && investigation.hasData) {
                    contextParts.push(formatInvestigationForAI(investigation));
                    logger.info('✅ [Fallback] Exception recovery successful via investigation', {
                      project: investigation.name,
                      dataQuality: investigation.dataQuality,
                    });
                  } else {
                    logger.warn('⚠️ [Fallback] Investigation failed after exception', {
                      symbol: primaryCoin.symbol,
                    });
                    contextParts.push(`
⚠️ OMNISCORE ENGINE ERROR
The OmniScore analysis engine encountered an error and investigation fallback failed.
DO NOT improvise or estimate any OmniScore values.
Basic market data may still be available.
`);
                  }
                } catch (invError) {
                  logger.error('❌ [Fallback] Investigation also threw exception', {
                    symbol: primaryCoin.symbol,
                    error: invError instanceof Error ? invError.message : String(invError),
                  });
                  contextParts.push(`
⚠️ OMNISCORE ENGINE ERROR
The OmniScore analysis engine encountered an error.
DO NOT improvise or estimate any OmniScore values.
Inform the user that OmniScore analysis is temporarily unavailable.
`);
                }
              }
            }
          } catch (error) {
            // OUTER CATCH: Catastrophic error in OmniScore section
            const primaryCoin = detectedCoins[0];
            logger.error('❌ [OmniScore Chat] Catastrophic error in OmniScore section', {
              symbol: primaryCoin?.symbol,
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            });
            
            // LAST RESORT FALLBACK: Try investigation one final time
            try {
              const investigation = await investigateProject(
                primaryCoin?.coinGeckoId || primaryCoin?.symbol || 'bitcoin'
              );
              
              if (investigation && investigation.hasData) {
                contextParts.push(formatInvestigationForAI(investigation));
                logger.info('✅ [Fallback] Catastrophic error recovered via investigation', {
                  project: investigation.name,
                });
              } else {
                contextParts.push(`
⚠️ OMNISCORE ENGINE ERROR
The OmniScore analysis engine encountered an error and investigation fallback failed.
DO NOT improvise or estimate any OmniScore values.
Basic market data may still be available.
`);
              }
            } catch {
              contextParts.push(`
⚠️ OMNISCORE ENGINE ERROR
The OmniScore analysis engine encountered an error.
DO NOT improvise or estimate any OmniScore values.
Inform the user that OmniScore analysis is temporarily unavailable.
`);
            }
          }
        }
        
        // 15. JUDGMENT ENGINE — 7-part structured market intelligence (Layer 10–12)
        if (detectedCoins.length > 0) {
          try {
            const primaryCoin = detectedCoins[0];
            const rawId = primaryCoin.coinGeckoId || primaryCoin.symbol.toLowerCase();

            // Canonical resolution (Layer 3)
            const resolution = resolveCanonical({ raw: rawId, kindHint: 'asset' });
            const judgmentEntityId = resolution.entity?.canonicalId ?? rawId;
            const resolvedSymbol = resolution.entity?.symbol ?? primaryCoin.symbol.toUpperCase();
            const resolvedChain = (resolution.entity && 'primaryChain' in resolution.entity)
              ? (resolution.entity as any).primaryChain as string | null
              : null;

            // Graph context (Layer 4)
            const graphCtx = resolution.entity
              ? knowledgeGraph.getEntityContext(resolution.entity.canonicalId)
              : null;

            // Extract primary coin price from enterprise or standard market data
            const eprice = (enterpriseMarketData as any)?.prices?.find(
              (p: any) => p.symbol?.toUpperCase() === resolvedSymbol,
            );
            const sprice = (marketData as any)?.prices?.find(
              (p: any) => p.symbol?.toUpperCase() === resolvedSymbol,
            );
            const coinPrice = eprice || sprice;

            // Compute dynamic coverage from fetch results
            const dataSourceNames = ['marketData', 'enterpriseMarketData', 'sentiment', 'enrichedNews', 'perpsData', 'derivativesFinal', 'socialV2Result', 'whaleContext', 'csiResult', 'comprehensiveDerivatives'] as const;
            const availableSources = dataSourceNames.filter(n => {
              const r = (fetchResults as any)[n];
              return r && r.success && (r.duration === undefined || r.duration > 0);
            }).length;
            const staleSources = dataSourceNames.filter(n => {
              const r = (fetchResults as any)[n];
              return r && r.success && r.duration && r.duration > 5000;
            }).length;

            // Real on-chain whale net-flow from alchemy-whales (best-effort:
            // returns null on miss/timeout and never throws). Only net-flow is
            // available per token; exchange flows + active addresses are not.
            const whaleActivity = await getWhaleActivityForToken(resolvedSymbol).catch(() => null);

            // BTAR-010 — real liquidity (DexScreener-sourced) + OmniScore-derived
            // security risk & holder concentration. All resolve to undefined when
            // unavailable so buildSignalSnapshot uses neutral defaults instead of
            // a false zero. OmniScore risk.score is 0-100, higher = more risk —
            // direction-aligned with the snapshot's security_risk.
            const liqRaw: any = (coinPrice as any)?.liquidity;
            const liquidityUsd = typeof liqRaw === 'number'
              ? liqRaw
              : (typeof liqRaw?.usd === 'number' ? liqRaw.usd : 0);
            const omniRiskScore: number | undefined =
              typeof primaryOmniScore?.risk?.score === 'number' ? primaryOmniScore.risk.score : undefined;
            const top10HoldersPct: number | undefined = (() => {
              const dp = primaryOmniScore?.risk?.segments?.CONC?.dataPoints
                ?.find((p: any) => p?.key === 'top10_holders_percent');
              return typeof dp?.raw === 'number' ? dp.raw : undefined;
            })();

            // ── PER-TOKEN OmniScore signals (Path C — lean on what we compute) ──
            // OmniScore is the richest per-token source we already calculate every
            // call but largely discard. Thread QS (sector-aware quality → gated
            // fundamentals proxy), circulating-supply ratio (→ unlock/emission
            // overhang), and the scores bundle into the judgment so two different
            // assets diverge on state/thesis/cause, not just confidence.
            const resolvedAssetSector: Sector =
              getAssetSector((primaryCoin.coinGeckoId || resolvedSymbol).toLowerCase());
            const omniQs: number | undefined =
              typeof primaryOmniScore?.qualityScore?.score === 'number'
                ? primaryOmniScore.qualityScore.score
                : undefined;
            const omniOs: number | null =
              typeof primaryOmniScore?.opportunityScore?.score === 'number'
                ? primaryOmniScore.opportunityScore.score
                : null;
            const omniPos: number | null =
              typeof (primaryOmniScore as any)?.pos?.adjusted === 'number'
                ? (primaryOmniScore as any).pos.adjusted
                : null;
            // circulating_supply_ratio is an OmniScore dataPoint; scan all segment
            // groups (qualityScore / opportunityScore / risk) for it defensively.
            const omniCircRatio: number | undefined = (() => {
              const groups = [
                primaryOmniScore?.qualityScore,
                primaryOmniScore?.opportunityScore,
                primaryOmniScore?.risk,
              ];
              for (const g of groups) {
                const segs = (g as any)?.segments;
                if (!segs) continue;
                for (const segKey of Object.keys(segs)) {
                  const dp = segs[segKey]?.dataPoints?.find(
                    (p: any) => p?.key === 'circulating_supply_ratio',
                  );
                  if (dp && typeof dp.raw === 'number') return dp.raw;
                }
              }
              return undefined;
            })();

            // ── PER-TOKEN derivatives + sentiment (token-judgment fix) ──────────
            // The judgment snapshot MUST be token-specific. Index the already-
            // fetched per-token sources by the queried symbol: Coinglass perps
            // (perpsData[symbol]) backfilled by the CMC Agent Hub (cmcDerivatives,
            // per-primary-token), and per-token social (socialIntel.coins[symbol]).
            // NO market-wide fallback — when a token has no perp/social data the
            // family resolves to undefined → APPLICABLE_NO_DATA (honest), never the
            // generic market aggregate. The market-wide services remain for AI prose.
            const symU = resolvedSymbol.toUpperCase();
            const bySym = (arr: any): any =>
              Array.isArray(arr) ? arr.find((d: any) => (d?.symbol ?? '').toUpperCase() === symU) : undefined;
            const perpLiq = bySym((perpsData as any)?.liquidations);
            const perpFund = bySym((perpsData as any)?.fundingRates);
            const perpOI = bySym((perpsData as any)?.openInterest);
            const cmcD = cmcDerivatives as any;
            // Path B — free per-token perps (Bybit + OKX), keyed by base symbol.
            // Backfills funding/OI/L-S after Coinglass + CMC. Absent → undefined.
            const freePerp = (freePerps as any)?.[symU];

            const num = (v: any): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
            const d_oi = num(perpOI?.openInterest) ?? num(freePerp?.openInterestUsd);
            const d_oiChange = num(perpOI?.change24h) ?? num(cmcD?.oiChange24h);
            const d_funding = num(perpFund?.rate) ?? num(cmcD?.aggFunding) ?? num(freePerp?.fundingRate);
            const d_liq = num(perpLiq?.totalLiquidations24h) ?? num(cmcD?.liquidations24h);
            // Prefer the Coinglass v4 global ACCOUNT long/short ratio (real
            // positioning signal, attached to the OI row), then CMC/OKX, then the
            // liquidation-derived ratio as a last-resort weak fallback.
            const d_ls = num(perpOI?.longShortRatio) ?? num(cmcD?.longShortRatio) ?? num(freePerp?.longShortRatio) ?? num(perpLiq?.longShortRatio);
            // Only build a derivatives object when SOMETHING real is present for
            // this token; otherwise undefined → snapshot marks it missing.
            const perTokenDerivatives =
              [d_oi, d_oiChange, d_funding, d_liq, d_ls].some((v) => v !== undefined)
                ? {
                    open_interest_usd: d_oi ?? 0,
                    open_interest_change_24h: d_oiChange ?? 0,
                    funding_rate: d_funding ?? 0,
                    liquidations_24h_usd: d_liq ?? 0,
                    long_short_ratio: d_ls ?? 1,
                  }
                : undefined;

            // ── PER-TOKEN protocol fundamentals (DeFiLlama) ────────────────────
            // Real TVL / fees / revenue for the primary coin. Only built when
            // DeFiLlama actually returned data (DeFi protocols in its slug map);
            // otherwise undefined → snapshot marks protocol missing →
            // fundamentals_protocol resolves to APPLICABLE_NO_DATA for sectors
            // where it's the right lens (DeFi/L2/infra) or NOT_APPLICABLE
            // (memecoins/L1). NEVER fabricated for tokens with no real protocol.
            const defi = defiLlama as any;
            const p_tvl = num(defi?.tvl);
            const p_fees = num(defi?.fees24h);
            const p_rev = num(defi?.revenue24h);
            const perTokenProtocol =
              defi?.hasAdoptionData && [p_tvl, p_fees, p_rev].some((v) => v !== undefined)
                ? {
                    tvl_usd: p_tvl ?? 0,
                    fees_usd: p_fees ?? 0,
                    revenue_usd: p_rev ?? 0,
                  }
                : undefined;

            const socialCoin = bySym((socialIntel as any)?.coins);
            const s_score = num(socialCoin?.sentiment?.score);
            const s_mentions = num(socialCoin?.mentions);
            const perTokenSentiment =
              s_score !== undefined || s_mentions !== undefined
                ? { score: s_score ?? 0, volume_mentions_24h: s_mentions ?? 0, social_dominance: 0 }
                : undefined;

            const signals = buildSignalSnapshot({
              dexscreener: {
                price_change_24h: coinPrice?.changePercent24h ?? coinPrice?.priceChangePercent24h ?? 0,
                price_change_1h: coinPrice?.priceChange1h ?? 0,
                volume_24h_usd: coinPrice?.volume24h ?? 0,
                // Market cap enables market-cap-relative turnover (de-saturates
                // mega-caps vs micro-caps). undefined → log-scale volume fallback.
                market_cap_usd: typeof (coinPrice as any)?.marketCap === 'number' ? (coinPrice as any).marketCap : undefined,
                txns_buys_24h: 0,
                txns_sells_24h: 0,
                liquidity_usd: liquidityUsd, // BTAR-010: real (DexScreener), 0 if unavailable (e.g. BTC majors)
                pair_age_hours: undefined,
              },
              // PER-TOKEN (perps[symbol] + CMC backfill). undefined when this token
              // has no derivatives data → APPLICABLE_NO_DATA, NOT the market aggregate.
              derivatives: perTokenDerivatives,
              // PER-TOKEN protocol fundamentals (DeFiLlama TVL/fees/revenue).
              // undefined when this token has no real protocol data → snapshot
              // marks it missing → APPLICABLE_NO_DATA / NOT_APPLICABLE per sector.
              protocol: perTokenProtocol,
              onchain: {
                // Wired from alchemy-whales (real net-flow). Exchange inflow/
                // outflow + active addresses are NOT exposed by that source —
                // left at 0 rather than fabricated.
                whale_net_flow_24h: deriveWhaleNetFlowUSD(whaleActivity),
                exchange_inflow_24h: 0,
                exchange_outflow_24h: 0,
                active_addresses_24h: 0,
              },
              // BTAR-010: OmniScore-derived (undefined → neutral fallback, not false 0).
              security: { risk_score: omniRiskScore },
              holders: { top_10_percentage: top10HoldersPct },
              // PER-TOKEN social (socialIntel.coins[symbol]). undefined when this
              // token has no social data → honest no-data, NOT the market aggregate.
              sentiment: perTokenSentiment,
              news: { item_count: (enrichedNews as any)?.articles?.length ?? 0 },
              unlock: {},
              // Per-token OmniScore: QS → gated fundamentals proxy (only when the
              // sector has a fundamentals thesis), circulating ratio → unlock
              // overhang. asset_sector gates the QS projection by purpose.
              omniscore: {
                quality_score: omniQs,
                circulating_supply_ratio: omniCircRatio,
              },
              asset_sector: resolvedAssetSector,
              coverage: {
                available_count: availableSources,
                total_count: dataSourceNames.length,
                stale_count: staleSources,
              },
            });

            // BTAR-003: track judgment availability so the AI prompt cannot
            // silently pretend structured judgment exists when it does not.
            let judgmentAvailability: JudgmentAvailabilityResult;

            // BTAR-011 — Market-wide / regime inputs from already-fetched data.
            // Only set fields that have a real value; the rest stay defaulted in
            // the regime engine. These real fields lift macro coverage past the
            // 0.3 floor so the regime escapes "data_unavailable".
            const marketWide: Partial<MarketWideInputs> = {};
            const fearGreedVal = (sentiment as any)?.fearGreed?.value;
            if (typeof fearGreedVal === 'number') marketWide.fear_greed_index = fearGreedVal;
            const aggFunding = (derivativesFinal as any)?.funding?.avgRate;
            if (typeof aggFunding === 'number') marketWide.aggregate_funding_rate = aggFunding;
            const aggLongShort = (derivativesFinal as any)?.positioning?.ratio;
            if (typeof aggLongShort === 'number') marketWide.aggregate_long_short_ratio = aggLongShort;
            const aggOiChange = (derivativesFinal as any)?.openInterest?.total?.change24h;
            if (typeof aggOiChange === 'number') marketWide.total_open_interest_change_24h = aggOiChange;
            // BTC 24h change is only a real macro signal when the queried asset
            // IS BTC (coinPrice is then BTC's own price). Omit otherwise.
            const btc24h = (coinPrice as any)?.changePercent24h ?? (coinPrice as any)?.priceChangePercent24h;
            if (resolvedSymbol === 'BTC' && typeof btc24h === 'number') marketWide.btc_price_change_24h = btc24h;
            // Real global metrics from CoinGecko /global (BTAR-011).
            const btcDom = (globalMarket as any)?.btcDominance;
            if (typeof btcDom === 'number' && btcDom > 0) marketWide.btc_dominance = btcDom;
            const globalMcapChange = (globalMarket as any)?.totalMarketCapChange24h;
            if (typeof globalMcapChange === 'number') marketWide.total_market_cap_change_24h = globalMcapChange;

            // CMC Agent Hub — co-primary macro fill. CMC and CoinGecko/Coinglass
            // are co-primary per-atom (governance: authority-registry macro.* +
            // funding.rate challenger), so CMC FILLS atoms an existing primary
            // didn't provide rather than overriding one that did. It is also the
            // sole provider of the three 7-day coverage-win fields the regime
            // engine otherwise leaves defaulted.
            const cmcFearGreed = (cmcGlobal as any)?.fearGreed;
            if (marketWide.fear_greed_index === undefined && typeof cmcFearGreed === 'number') {
              marketWide.fear_greed_index = cmcFearGreed;
            }
            const cmcBtcDom = (cmcGlobal as any)?.btcDominance;
            if (marketWide.btc_dominance === undefined && typeof cmcBtcDom === 'number' && cmcBtcDom > 0) {
              marketWide.btc_dominance = cmcBtcDom;
            }
            const cmcMcapChange = (cmcGlobal as any)?.totalMarketCapChange24h;
            if (marketWide.total_market_cap_change_24h === undefined && typeof cmcMcapChange === 'number') {
              marketWide.total_market_cap_change_24h = cmcMcapChange;
            }
            const cmcAggFunding = (cmcDerivatives as any)?.aggFunding;
            if (marketWide.aggregate_funding_rate === undefined && typeof cmcAggFunding === 'number') {
              marketWide.aggregate_funding_rate = cmcAggFunding;
            }
            const cmcLongShort = (cmcDerivatives as any)?.longShortRatio;
            if (marketWide.aggregate_long_short_ratio === undefined && typeof cmcLongShort === 'number') {
              marketWide.aggregate_long_short_ratio = cmcLongShort;
            }
            const cmcOiChange = (cmcDerivatives as any)?.oiChange24h;
            if (marketWide.total_open_interest_change_24h === undefined && typeof cmcOiChange === 'number') {
              marketWide.total_open_interest_change_24h = cmcOiChange;
            }
            // Coverage-win fields: CMC is the sole provider today (CoinGecko
            // /global doesn't expose these), so the regime engine no longer has
            // to default them to neutral.
            const cmcBtc7d = (cmcGlobal as any)?.btcPriceChange7d;
            if (typeof cmcBtc7d === 'number') marketWide.btc_price_change_7d = cmcBtc7d;
            const cmcDom7d = (cmcGlobal as any)?.btcDominanceChange7d;
            if (typeof cmcDom7d === 'number') marketWide.btc_dominance_change_7d = cmcDom7d;
            const cmcStable7d = (cmcGlobal as any)?.stablecoinMcapChange7d;
            if (typeof cmcStable7d === 'number') marketWide.stablecoin_market_cap_change_7d = cmcStable7d;

            const judgment = produceJudgment({
              entity_id: judgmentEntityId,
              symbol: resolvedSymbol,
              chain: resolvedChain,
              signals,
              // Per-token OmniScore scores bundle (QS/OS/risk/POS) for engine
              // reference — the richest per-token differentiator we compute.
              scores: omniQs != null
                ? { qs: omniQs, os: omniOs, risk: omniRiskScore ?? 0, pos: omniPos }
                : undefined,
              marketWide,
              // Resolve the asset's OmniScore Sector (keyed on the CoinGecko id)
              // so judgment is evaluated by the lens that fits its purpose.
              assetSector: resolvedAssetSector,
              entityContext: graphCtx ? {
                ecosystem: graphCtx.ecosystem,
                sector: graphCtx.sector,
                relatedAssets: graphCtx.relatedAssets,
                narratives: graphCtx.narratives,
                competitors: graphCtx.competitors,
                capBucket: graphCtx.capBucket,
              } : undefined,
            });

            // BTAR-004 + FRP-001 — Build a typed CoinetJudgmentPromptPackage on
            // every branch. The package is the authoritative AI prompt source for
            // structured judgment. formatJudgmentForAI() remains exported (FRP-001
            // §4) but is no longer the authoritative chat bridge.
            const judgmentScope = {
              kind: 'ASSET' as const,
              asset_symbol: resolvedSymbol,
              asset_name: primaryCoin.symbol,
            };

            if (!judgment) {
              // BTAR-003 §11.1 — falsy judgment must NOT be silently promoted.
              judgmentAvailability = createUnavailableJudgmentState({
                reason: 'JUDGMENT_RESULT_EMPTY',
                component: 'produceJudgment',
              });
              // BTAR-006 — bounded trust-seam extraction: trust context (package +
              // rendered AI context) is now built by chat-trust-context.ts.
              const trustContext = buildChatTrustContext({
                availability: judgmentAvailability,
                judgment: undefined,
                scope: judgmentScope,
                source_refs: [],
              });
              chatJudgmentPackage = trustContext.promptPackage; // BTAR-005 hoist
              chatTrustContext = trustContext; // BTAR-008 hoist
              contextParts.push(trustContext.renderedAIContext);
              // BTAR-003 compatibility: also push the BTAR-003 marker so any
              // downstream consumer / test scanning for the BTAR-003 oracle
              // continues to find it. Both signals are the same truth.
              contextParts.push(buildUnavailableJudgmentContextForAI(judgmentAvailability));
              logger.warn('Judgment engine returned empty result — AI prompt marked UNAVAILABLE', {
                symbol: primaryCoin.symbol,
                package_id: trustContext.promptPackage.package_id,
              });
            } else {
              judgmentAvailability = createAvailableJudgmentState();
              // BTAR-006 — bounded trust-seam extraction (see falsy branch above).
              const trustContext = buildChatTrustContext({
                availability: judgmentAvailability,
                judgment,
                scope: judgmentScope,
                source_refs: ['produceJudgment', 'buildSignalSnapshot'],
              });
              chatJudgmentPackage = trustContext.promptPackage; // BTAR-005 hoist
              chatTrustContext = trustContext; // BTAR-008 hoist
              contextParts.push(trustContext.renderedAIContext);

              logger.info('Judgment engine context added (package-derived)', {
                symbol: primaryCoin.symbol,
                state: judgment.state.primary,
                thesis: judgment.thesis.primary.hypothesis,
                confidence: judgment.confidence.overall,
                contradictions: judgment.contradictions.items.length,
                availability: judgmentAvailability.state,
                package_id: trustContext.promptPackage.package_id,
                policy_version: trustContext.promptPackage.policy_version,
              });
            }
          } catch (judgmentError) {
            // BTAR-003 §15 — replace silent fallback with explicit UNAVAILABLE
            // context block. The AI must NOT receive a prompt that lets it
            // pretend structured judgment exists when produceJudgment() threw.
            // BTAR-004 + FRP-001 — emit the typed package on this branch too.
            const judgmentAvailability = createUnavailableJudgmentState({
              reason: 'JUDGMENT_ENGINE_THROW',
              component: 'produceJudgment',
              error: judgmentError,
            });
            // BTAR-006 — bounded trust-seam extraction (see falsy branch above).
            const trustContext = buildChatTrustContext({
              availability: judgmentAvailability,
              judgment: undefined,
              scope: { kind: 'ASSET', asset_symbol: detectedCoins[0]?.symbol?.toUpperCase() ?? 'UNKNOWN' },
              source_refs: [],
            });
            chatJudgmentPackage = trustContext.promptPackage; // BTAR-005 hoist
            chatTrustContext = trustContext; // BTAR-008 hoist
            contextParts.push(trustContext.renderedAIContext);
            // BTAR-003 compatibility marker (see falsy branch above).
            contextParts.push(buildUnavailableJudgmentContextForAI(judgmentAvailability));
            logger.warn('Judgment engine failed — AI prompt marked UNAVAILABLE (no silent fallback)', {
              error: judgmentError instanceof Error ? judgmentError.message : String(judgmentError),
              availability: judgmentAvailability.state,
              package_id: trustContext.promptPackage.package_id,
            });
          }
        }

        // 15b. STRUCTURED REASONING CONTEXT — typed, validated, auditable
        // Now bridges L1.0/L1.1 into production: feeds health-monitor,
        // builds truth fingerprint, and injects governed source visibility.
        if (detectedCoins.length > 0) {
          try {
            const isBtc = coinSymbols.some(s => s === 'BTC' || s === 'BITCOIN');
            const qr = isBtc ? runBtcQuantumRisk() : null;
            const fr = fetchResults as Record<string, { success: boolean; error?: string }>;

            currentReasoningContext = buildReasoningContext(
              coinSymbols[0] || 'UNKNOWN',
              qr,
              fr,
            );

            const serialized = serializeReasoningContext(currentReasoningContext);
            contextParts.push(serialized);

            const fpCoverage = currentReasoningContext.system_state.truth_fingerprint?.overall_coverage;
            logger.info('Structured reasoning context added (L1 bridge active)', {
              qrs: currentReasoningContext.quantum?.score,
              state: currentReasoningContext.quantum?.state,
              confidence: currentReasoningContext.quantum?.confidence,
              l1_coverage: fpCoverage !== undefined ? `${Math.round(fpCoverage * 100)}%` : 'n/a',
              blind_spots: currentReasoningContext.system_state.blind_domains.length,
            });
          } catch (ctxError) {
            logger.debug('Reasoning context build failed', {
              error: ctxError instanceof Error ? ctxError.message : String(ctxError),
            });
          }
        }

        // 16. Investigate unknown projects not in OmniScore database
        // This provides comprehensive CoinGecko data for projects that might be new/unknown
        const unknownCoins = detectedCoins.filter(coin => {
          // Check if we already have market data for this coin
          const hasMarketData = enterpriseMarketData?.prices.some(
            p => p.symbol.toUpperCase() === coin.symbol.toUpperCase()
          );
          return !hasMarketData && coin.symbol.length > 0;
        });
        
        if (unknownCoins.length > 0 && unknownCoins.length <= 3) {
          logger.info('🔍 Investigating unknown projects', { 
            unknownCoins: unknownCoins.map(c => c.symbol) 
          });
          
          const investigations = await Promise.all(
            unknownCoins.slice(0, 3).map(coin =>
              investigateProject(coin.coinGeckoId || coin.symbol).catch(() => null)
            )
          );
          
          const validInvestigations = investigations.filter(Boolean) as ProjectInvestigation[];
          
          for (const inv of validInvestigations) {
            contextParts.push(formatInvestigationForAI(inv));
            logger.info('✅ Investigation added for unknown project', {
              project: inv.name,
              symbol: inv.symbol,
              dataQuality: inv.dataQuality,
            });
          }
        }
        
        // 17. DATA QUALITY DIAGNOSTIC — tell the AI exactly what succeeded/failed
        {
          const succeeded = Object.entries(fetchResults).filter(([_, r]) => (r as any).success);
          const failed = Object.entries(fetchResults).filter(([_, r]) => !(r as any).success);
          const totalEnabled = Object.entries(fetchResults).filter(([_, r]) => (r as any).duration === undefined || (r as any).duration > 0 || !(r as any).success).length;
          
          if (failed.length > 0 || succeeded.length < 8) {
            const failedNames = failed.map(([n, r]) => `${n} (${(r as any).error?.substring(0, 40) || 'failed'})`).join(', ');
            contextParts.push(`
── DATA QUALITY REPORT ──────────────────────────────────────────────────
Sources available: ${succeeded.length}/${totalEnabled || succeeded.length + failed.length}
${failed.length > 0 ? `Failed sources: ${failedNames}` : 'All enabled sources succeeded.'}
IMPORTANT: Only use data from available sources. Do NOT guess values for failed sources.
─────────────────────────────────────────────────────────────────────────
`);
          }
        }
        
        if (contextParts.length > 0) {
          liveContextStr = contextParts.join('\n');
        }
        
        // 🎯 INTENT-AWARE FORMATTING: Prepend response format instructions
        if (handlerResult && liveContextStr) {
          const formatInstructions = `
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🎯 INTENT-AWARE RESPONSE GUIDANCE                                           ║
╚═══════════════════════════════════════════════════════════════════════════════╝

DETECTED INTENT: ${intentClassification.intent.toUpperCase()} (${(intentClassification.confidence * 100).toFixed(0)}% confidence)

${handlerResult.aiFormatHint ?? ''}

${handlerResult.responseGuidance ? `CONTEXT: ${handlerResult.responseGuidance}` : ''}

═══════════════════════════════════════════════════════════════════════════════
`;
          liveContextStr = formatInstructions + liveContextStr;
          
          logger.debug('🎯 Intent format instructions added', {
            intent: intentClassification.intent,
            shape: intentClassification.responseShape,
            contextLength: liveContextStr.length,
          });
        }
      } catch (error: any) {
        // 🚨 CRITICAL: Log context fetching failures at ERROR level, not DEBUG
        // This was causing silent failures where AI received empty context
        logger.error('❌ CRITICAL: Failed to fetch live context for AI', {
          error: error?.message,
          stack: error?.stack,
          userId,
          message: request.message.substring(0, 100),
        });
        
        // 🛡️ FALLBACK: Try to fetch at least basic market data even if everything else fails
        try {
          const detectedCoins = await symbolDetector.detectCoins(request.message);
          const coinSymbols = detectedCoins.map(c => c.symbol.toUpperCase());
          
          if (coinSymbols.length > 0) {
            logger.info('🔄 Attempting fallback: Basic market data fetch', { symbols: coinSymbols });
            
            // Try to get at least basic market prices
            const fallbackMarketData = await fetchPricesForMessage(request.message).catch(() => null);
            
            if (fallbackMarketData && fallbackMarketData.prices.length > 0) {
              liveContextStr = formatMarketDataForAI(fallbackMarketData);
              logger.info('✅ Fallback market data retrieved', {
                symbols: fallbackMarketData.foundSymbols,
                count: fallbackMarketData.prices.length,
              });
            } else {
              // Last resort: Use investigation service
              const primaryCoin = detectedCoins[0];
              if (primaryCoin) {
                logger.info('🔄 Last resort: Using investigation service', { symbol: primaryCoin.symbol });
                const investigation = await investigateProject(
                  primaryCoin.coinGeckoId || primaryCoin.symbol
                ).catch(() => null);
                
                if (investigation && investigation.hasData) {
                  liveContextStr = formatInvestigationForAI(investigation);
                  logger.info('✅ Investigation fallback successful', {
                    project: investigation.name,
                    dataQuality: investigation.dataQuality,
                  });
                }
              }
            }
          }
        } catch (fallbackError: any) {
          logger.error('❌ Fallback context fetch also failed', {
            error: fallbackError?.message,
            originalError: error?.message,
          });
          // At this point, liveContextStr will be undefined, which is better than crashing
          // The AI will receive minimal context but can still respond
        }
      }
      
      // 4.6. Extract memories from user message (background, don't block)
      extractMemoriesFromMessage(userId, request.message).catch(err => 
        logger.debug('🧠 Memory extraction failed', { error: err?.message })
      );

      // 5. Call AI service (or use mock if unavailable)
      // 🚨 CRITICAL CHECK: Ensure we have at least some context before calling AI
      if (!liveContextStr || liveContextStr.trim().length === 0) {
        logger.error('❌ CRITICAL: No context data available for AI - this will cause generic responses', {
          userId,
          message: request.message.substring(0, 100),
          detectedCoins: await symbolDetector.detectCoins(request.message).then(c => c.map(cc => cc.symbol)).catch(() => []),
        });
        
        // 🚨 LAST RESORT: For "hey" messages, force fetch BTC data one more time
        if (request.message.toLowerCase().trim() === 'hey') {
          logger.warn('🔄 Last resort: Force-fetching BTC data for "hey" message');
          try {
            const emergencyBtcData = await fetchPricesForMessage('BTC').catch(() => null);
            if (emergencyBtcData && emergencyBtcData.prices.length > 0) {
              liveContextStr = formatMarketDataForAI(emergencyBtcData);
              logger.info('✅ Emergency BTC data retrieved for "hey" message');
            }
          } catch (e) {
            logger.error('❌ Emergency BTC fetch also failed', { error: e?.message });
          }
        }
        
        // If still empty, add a warning context to inform the AI that data is unavailable
        if (!liveContextStr || liveContextStr.trim().length === 0) {
          liveContextStr = `
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🚨 CRITICAL: DATA UNAVAILABLE — RESPONSE REQUIREMENTS                        ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Market data services are currently unavailable or experiencing issues.
The user asked: "${request.message}"

🚫 ABSOLUTELY FORBIDDEN RESPONSES (INSTANT FAILURE IF USED):
❌ "I understand you're asking about [X]. This is a complex topic..."
❌ "What would you like to analyze?"
❌ "This requires careful analysis of multiple factors..."
❌ "I'd be happy to help you analyze..."
❌ Any generic stalling phrases

✅ REQUIRED RESPONSE STYLE:
- Be DIRECT and HONEST about the data limitation
- Acknowledge what the user asked about
- Provide what you CAN say (general knowledge, if applicable)
- Keep it SHORT and CONVERSATIONAL

EXAMPLE GOOD RESPONSES:
- "Hey — I'm having trouble pulling live market data right now. Want me to check what I can find?"
- "BTC? I can't access the live data feeds at the moment. What specifically are you looking for?"
- "Market data's down right now. What do you need help with?"

Remember: Generic responses = FAILURE. Be direct and helpful.
`;
        }
      }
      
      let aiResponse;
      try {
        aiResponse = await aiService.analyze({
          content: request.message,
          type: 'question',
          context: {
            conversationId: conversation.id,
            agentId: request.agentId,
            analysisDepth: request.context?.analysisDepth || 'standard',
            conversationHistory: context,
            liveMarketData: liveContextStr, // Now includes both market + whale data
          },
        });
      } catch (error) {
        logger.error('❌ AI Service error — FALLING BACK TO MOCK (this is why responses are generic!)', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          hint: 'Check that XAI_API_KEY or OPENAI_API_KEY is set in Railway environment variables',
        });
        logger.warn('⚠️  AI Service unavailable, using mock response — user will see fallback text');
        aiResponse = generateMockResponse(request.message);
      }

      // 5b. CHAT AUDIT — validate grounding and log for evaluation
      if (currentReasoningContext && aiResponse) {
        try {
          const responseText = aiResponse.data.thesis || aiResponse.data.summary || '';
          const groundingReport = validateGrounding(request.message, responseText, currentReasoningContext);
          const ctxSerialized = serializeReasoningContext(currentReasoningContext);
          logChatAudit(
            currentReasoningContext.asset,
            request.message,
            ctxSerialized,
            responseText,
            currentReasoningContext,
            groundingReport,
          );
          if (groundingReport.verdict === 'HALLUCINATION_DETECTED') {
            logger.warn('GROUNDING: hallucination detected in AI response', {
              prompt: request.message.substring(0, 80),
              failures: groundingReport.checks.filter(c => c.hallucinated).map(c => c.detail),
            });
          }
        } catch (auditErr) {
          logger.debug('Chat audit logging failed', {
            error: auditErr instanceof Error ? auditErr.message : String(auditErr),
          });
        }
      }

      // 6. Get sources - only show sources that were actually used during data fetching
      const sources = request.context?.includeSources !== false
        ? getTrackedSources()
        : [];

      // 7. Prepare assistant response
      const rawAssistantContent = aiResponse.data.thesis ||
                                  aiResponse.data.summary ||
                                  (aiResponse.data as any).recommendation ||
                                  'I apologize, but I couldn\'t generate a response.';

      // BTAR-005 — Apply AI output safety / expression gate before user delivery.
      // BTAR-006 — bounded trust-seam extraction: gate orchestration is now
      // wrapped in `finalizeChatAIResponse` so the same logic is testable in
      // isolation. If no judgment block ran (no detected coins), fall back to a
      // default UNAVAILABLE/UNKNOWN-scope package so the gate still enforces
      // baseline expression rules.
      const judgmentPackageForGate = chatJudgmentPackage ?? buildCoinetJudgmentPromptPackage({
        availability: createUnavailableJudgmentState({
          reason: 'SIGNAL_SNAPSHOT_UNAVAILABLE',
          component: 'no-judgment-block-ran',
        }),
        judgment: undefined,
        scope: { kind: 'UNKNOWN' },
        source_refs: [],
      });
      const finalized = finalizeChatAIResponse({
        rawOutput: rawAssistantContent,
        judgmentPackage: judgmentPackageForGate,
      });
      const assistantContent = finalized.finalOutput;
      if (finalized.gate.decision !== 'ALLOW') {
        logger.warn('AI output safety gate intervened', {
          decision: finalized.gate.decision,
          violations: finalized.gate.violations,
          policy_version: finalized.gate.policy_version,
          judgment_status: judgmentPackageForGate.judgment_status,
          changed: finalized.changed,
        });
      }

      // BTAR-008 — Build minimal runtime trust evidence and log it. The
      // evidence is metadata-only and never carries raw prompt / rendered
      // context / user message / API keys / provider payloads
      // (`sensitive_fields_stored` is the literal `false`). If the judgment
      // block did not run, we use the BTAR-008 builder against a synthesized
      // UNAVAILABLE/UNKNOWN trust context derived from the same default
      // package the gate already used.
      const trustContextForEvidence: ChatTrustContext =
        chatTrustContext ?? buildChatTrustContext({
          availability: createUnavailableJudgmentState({
            reason: 'SIGNAL_SNAPSHOT_UNAVAILABLE',
            component: 'no-judgment-block-ran',
          }),
          judgment: undefined,
          scope: { kind: 'UNKNOWN' },
          source_refs: [],
        });
      const runtimeTrustEvidence = buildChatRuntimeTrustEvidence({
        trustContext: trustContextForEvidence,
        finalization: finalized,
      });
      logger.info('Chat runtime trust evidence', runtimeTrustEvidence);

      // 8. Store assistant message
      const quadrantChart = (request as any)._omniscoreQuadrantChart;
      const chartsCombined = [
        ...(chartConfig ? [chartConfig] : []),
        ...(quadrantChart ? [quadrantChart] : []),
      ];

      logger.info('📊 Charts combined before persistence', {
        chartConfigPresent: !!chartConfig,
        chartConfigType: chartConfig?.type,
        quadrantPresent: !!quadrantChart,
        quadrantType: quadrantChart?.type,
        quadrantProjectsCount: quadrantChart?.projects?.length,
        totalCharts: chartsCombined.length,
        chartTypes: chartsCombined.map((c: any) => c?.type),
      });

      this.logDebug({
        runId: 'pre-fix',
        hypothesisId: 'H2-backend',
        location: 'chat/service:charts-combined',
        message: 'Charts combined before persistence',
        data: {
          chartConfigPresent: !!chartConfig,
          quadrantPresent: !!quadrantChart,
          totalCharts: chartsCombined.length,
        },
      });

      const assistantMessage = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'assistant',
          content: assistantContent,
          sources: sources.length > 0 ? (sources as unknown as any) : undefined,
          charts: chartsCombined.length > 0 ? (chartsCombined as unknown as any) : undefined,
          confidence: aiResponse.data.confidence,
          model: aiResponse.metadata?.version || 'unknown',
          tokens: undefined, // Would be populated from AI service
        },
      });

      this.logDebug({
        runId: 'pre-fix',
        hypothesisId: 'H3-backend',
        location: 'chat/service:assistant-stored',
        message: 'Assistant message stored',
        data: {
          assistantId: assistantMessage.id,
          chartsPersisted: chartsCombined.length > 0,
          chartsCount: chartsCombined.length,
        },
      });

      // 9. Update conversation title if first message
      if (!conversation.title && userMessage.role === 'user') {
        const title = this.generateConversationTitle(request.message);
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { title },
        });
      }

      // 10. Update conversation timestamp
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });

      const processingTime = Date.now() - startTime;

      logger.info('✅ Chat message processed', {
        conversationId: conversation.id,
        processingTime,
        confidence: aiResponse.data.confidence,
        hasSources: sources.length > 0,
        hasCharts: chartsCombined.length > 0,
        chartsCount: chartsCombined.length,
        chartTypes: chartsCombined.map((c: any) => c?.type),
      });

      logger.info('📊 Sending charts in response', {
        chartsCombinedLength: chartsCombined.length,
        chartsCombined: chartsCombined.map((c: any) => ({
          type: c?.type,
          projectsCount: c?.projects?.length,
          symbol: c?.symbol,
        })),
        quadrantChartPresent: !!quadrantChart,
        chartConfigPresent: !!chartConfig,
        willIncludeCharts: chartsCombined.length > 0,
      });

      const responseCharts = chartsCombined.length > 0 ? chartsCombined : undefined;
      
      logger.info('📤 Final response payload', {
        hasCharts: !!responseCharts,
        chartsCount: responseCharts?.length || 0,
        chartTypes: responseCharts?.map((c: any) => c?.type) || [],
      });

      return {
        success: true,
        data: {
          message: {
            id: assistantMessage.id,
            role: 'assistant',
            content: assistantContent,
            sources: sources.length > 0 ? sources : undefined,
            charts: responseCharts,
            confidence: aiResponse.data.confidence,
            // Structured judgment verdict (option b): a first-class projection of
            // the governed CoinetJudgmentPromptPackage, sent alongside the prose.
            // Present only for asset-scoped requests where the judgment block ran
            // (chatJudgmentPackage is set); omitted for non-token chats. UNAVAILABLE
            // packages carry status but no fields (governance invariant preserved).
            verdict: chatJudgmentPackage ? toChatVerdict(chatJudgmentPackage) : undefined,
            createdAt: assistantMessage.createdAt.toISOString(),
          },
          conversationId: conversation.id,
          conversationTitle: conversation.title || undefined,
        },
        metadata: {
          processingTime,
          tokens: undefined, // Would be from AI service
          model: aiResponse.metadata?.version,
        },
      };
    } catch (error) {
      logger.error('❌ Chat message processing failed', error);
      throw error;
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(
    userId: string,
    conversationId: string
  ): Promise<ConversationHistoryResponse> {
    try {
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId, // Ensure user owns this conversation
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const messages: ChatMessage[] = conversation.messages.map((msg: any) => {
        const charts = msg.charts ? (msg.charts as unknown) as (ChartConfig | OmniScoreQuadrantData)[] : undefined;
        
        logger.debug('📊 Loading message charts from history', {
          messageId: msg.id,
          hasCharts: !!charts,
          chartsCount: charts?.length || 0,
          chartTypes: charts?.map((c: any) => c?.type) || [],
        });
        
        return {
          id: msg.id,
          role: msg.role,
          content: msg.content,
          sources: (msg.sources as unknown) as Source[] | undefined,
          charts: charts,
          confidence: msg.confidence || undefined,
          createdAt: msg.createdAt.toISOString(),
        };
      });

      return {
        success: true,
        data: {
          conversation: {
            id: conversation.id,
            title: conversation.title || undefined,
            messages,
            createdAt: conversation.createdAt.toISOString(),
            updatedAt: conversation.updatedAt.toISOString(),
          },
        },
      };
    } catch (error) {
      logger.error('❌ Failed to get conversation history', error);
      throw error;
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(
    userId: string,
    conversationId: string,
    messageId: string
  ): Promise<{ success: boolean }> {
    try {
      // Verify conversation belongs to user
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId,
        },
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Delete message
      await prisma.message.delete({
        where: {
          id: messageId,
        },
      });

      logger.info('✅ Message deleted', { messageId, conversationId });

      return { success: true };
    } catch (error) {
      logger.error('❌ Failed to delete message', error);
      throw error;
    }
  }

  /**
   * Get or create conversation
   */
  private async getOrCreateConversation(
    userId: string,
    conversationId?: string,
    agentId?: string
  ) {
    if (conversationId) {
      const existing = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId, // Security: ensure user owns conversation
        },
      });

      if (existing) {
        return existing;
      }

      logger.warn('⚠️ Conversation ID provided but not found, creating new', {
        conversationId,
        userId,
      });
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        userId,
        agentId,
        context: {},
      },
    });

    logger.info('✅ New conversation created', {
      conversationId: conversation.id,
      userId,
    });

    return conversation;
  }

  /**
   * Get conversation context (last 10 messages)
   */
  private async getConversationContext(conversationId: string) {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });

    return messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * Generate conversation title from first message
   */
  private generateConversationTitle(firstMessage: string): string {
    // Extract key topic or use truncated message
    const maxLength = 50;
    if (firstMessage.length <= maxLength) {
      return firstMessage;
    }

    // Try to extract main topic
    const cryptoPattern = /\b(bitcoin|btc|ethereum|eth|solana|sol|cardano|ada)\b/i;
    const match = firstMessage.match(cryptoPattern);
    
    if (match) {
      const symbol = match[1].toUpperCase();
      return `${symbol} Discussion`;
    }

    // Default: truncate first message
    return firstMessage.substring(0, maxLength - 3) + '...';
  }

  /**
   * Regenerate assistant message
   */
  async regenerateMessage(
    userId: string,
    conversationId: string,
    messageId: string
  ): Promise<ChatMessageResponse> {
    try {
      // Get the original message
      const originalMessage = await prisma.message.findFirst({
        where: {
          id: messageId,
          conversationId,
          role: 'assistant',
        },
        include: {
          conversation: true,
        },
      });

      if (!originalMessage) {
        throw new Error('Message not found');
      }

      // Security: ensure user owns conversation
      if (originalMessage.conversation.userId !== userId) {
        throw new Error('Unauthorized');
      }

      // Get the user message that prompted this
      const userMessages = await prisma.message.findMany({
        where: {
          conversationId,
          role: 'user',
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });

      if (userMessages.length === 0) {
        throw new Error('No user message found to regenerate');
      }

      // Mark original as regenerated (store in metadata; Message model has no regeneratedFrom field)
      const original = await prisma.message.findUnique({ where: { id: messageId }, select: { metadata: true } });
      const meta = (original?.metadata as Record<string, unknown>) || {};
      await prisma.message.update({
        where: { id: messageId },
        data: { metadata: { ...meta, regeneratedFrom: messageId } },
      });

      // Generate new response using the user's original message
      const response = await this.sendMessage(userId, {
        message: userMessages[0].content,
        conversationId,
      });

      logger.info('✅ Message regenerated', {
        originalMessageId: messageId,
        newMessageId: response.data.message.id,
      });

      return response;
    } catch (error) {
      logger.error('❌ Failed to regenerate message', error);
      throw error;
    }
  }

  // ============================================================================
  // CONVERSATION MANAGEMENT — List, Delete, Update, Archive
  // ============================================================================

  /**
   * List all conversations for a user (for sidebar)
   */
  async listConversations(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      includeArchived?: boolean;
    }
  ): Promise<{
    success: boolean;
    data: {
      conversations: Array<{
        id: string;
        title: string | null;
        lastMessage: string | null;
        messageCount: number;
        createdAt: string;
        updatedAt: string;
        isArchived: boolean;
      }>;
      total: number;
      hasMore: boolean;
    };
  }> {
    try {
      const limit = options?.limit || 50;
      const offset = options?.offset || 0;
      const includeArchived = options?.includeArchived || false;

      // Build where clause
      const whereClause: any = { userId };
      if (!includeArchived) {
        whereClause.archived = false;
      }

      // Get total count
      const total = await prisma.conversation.count({
        where: whereClause,
      });

      // Get conversations with last message
      const conversations = await prisma.conversation.findMany({
        where: whereClause,
        orderBy: { updatedAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              content: true,
              role: true,
            },
          },
          _count: {
            select: { messages: true },
          },
        },
      });

      const formattedConversations = conversations.map((conv: any) => ({
        id: conv.id,
        title: conv.title,
        lastMessage: conv.messages[0]?.content?.substring(0, 100) || null,
        messageCount: conv._count.messages,
        createdAt: conv.createdAt.toISOString(),
        updatedAt: conv.updatedAt.toISOString(),
        isArchived: !!conv.archived,
      }));

      logger.debug('📋 Listed conversations', {
        userId,
        count: formattedConversations.length,
        total,
      });

      return {
        success: true,
        data: {
          conversations: formattedConversations,
          total,
          hasMore: offset + limit < total,
        },
      };
    } catch (error) {
      logger.error('❌ Failed to list conversations', error);
      throw error;
    }
  }

  /**
   * Delete a conversation and all its messages
   */
  async deleteConversation(
    userId: string,
    conversationId: string
  ): Promise<{ success: boolean }> {
    try {
      // Verify conversation belongs to user
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId,
        },
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Delete conversation (messages will cascade delete)
      await prisma.conversation.delete({
        where: { id: conversationId },
      });

      logger.info('✅ Conversation deleted', { conversationId, userId });

      return { success: true };
    } catch (error) {
      logger.error('❌ Failed to delete conversation', error);
      throw error;
    }
  }

  /**
   * Update conversation (title, archive status)
   */
  async updateConversation(
    userId: string,
    conversationId: string,
    updates: {
      title?: string;
      archived?: boolean;
    }
  ): Promise<{
    success: boolean;
    data: {
      id: string;
      title: string | null;
      isArchived: boolean;
      updatedAt: string;
    };
  }> {
    try {
      // Verify conversation belongs to user
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId,
        },
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Build update data
      const updateData: any = {};
      if (updates.title !== undefined) {
        updateData.title = updates.title;
      }
      if (updates.archived !== undefined) {
        updateData.archived = updates.archived;
      }

      // Update conversation
      const updated = await prisma.conversation.update({
        where: { id: conversationId },
        data: updateData,
      });

      logger.info('✅ Conversation updated', {
        conversationId,
        updates: Object.keys(updates),
      });

      return {
        success: true,
        data: {
          id: updated.id,
          title: updated.title,
          isArchived: !!updated.archived,
          updatedAt: updated.updatedAt.toISOString(),
        },
      };
    } catch (error) {
      logger.error('❌ Failed to update conversation', error);
      throw error;
    }
  }

  /**
   * Archive/unarchive a conversation
   */
  async archiveConversation(
    userId: string,
    conversationId: string,
    archive: boolean = true
  ): Promise<{ success: boolean }> {
    try {
      await this.updateConversation(userId, conversationId, { archived: archive });
      
      logger.info(`✅ Conversation ${archive ? 'archived' : 'unarchived'}`, {
        conversationId,
        userId,
      });

      return { success: true };
    } catch (error) {
      logger.error('❌ Failed to archive conversation', error);
      throw error;
    }
  }

  /**
   * Create a new empty conversation
   */
  async createConversation(
    userId: string,
    options?: {
      title?: string;
      agentId?: string;
    }
  ): Promise<{
    success: boolean;
    data: {
      id: string;
      title: string | null;
      createdAt: string;
    };
  }> {
    try {
      const conversation = await prisma.conversation.create({
        data: {
          userId,
          title: options?.title || null,
          agentId: options?.agentId || null,
          context: {},
        },
      });

      logger.info('✅ New conversation created', {
        conversationId: conversation.id,
        userId,
        hasTitle: !!options?.title,
      });

      return {
        success: true,
        data: {
          id: conversation.id,
          title: conversation.title,
          createdAt: conversation.createdAt.toISOString(),
        },
      };
    } catch (error) {
      logger.error('❌ Failed to create conversation', error);
      throw error;
    }
  }

  /**
   * Clear all conversations for a user (dangerous!)
   */
  async clearAllConversations(userId: string): Promise<{ success: boolean; deletedCount: number }> {
    try {
      const result = await prisma.conversation.deleteMany({
        where: { userId },
      });

      logger.warn('🗑️ All conversations cleared', {
        userId,
        deletedCount: result.count,
      });

      return {
        success: true,
        deletedCount: result.count,
      };
    } catch (error) {
      logger.error('❌ Failed to clear conversations', error);
      throw error;
    }
  }
}

// Export singleton instance
export const chatService = new ChatService();

