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
import { fetchPricesForMessage, formatMarketDataForAI } from '../../services/market-data';
import { getWhaleContextForAI } from '../../services/whale-data';
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
import { sourceManager } from './source-manager';
import { logger } from '../../utils/logger';
import { generateMockResponse } from './mock-ai-response';
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

      // 4. Get conversation context (last 10 messages)
      const context = await this.getConversationContext(conversation.id);

      // 4.5. Fetch ALL live context: User Memory + Market + Whale + News + Sentiment (parallel)
      let liveContextStr: string | undefined;
      try {
        // Detect coins mentioned in the message for targeted news
        const detectedCoins = await symbolDetector.detectCoins(request.message);
        const coinSymbols = detectedCoins.map(c => c.symbol.toUpperCase());
        
        // Check if this is a trading/leverage question that needs perps data
        const lowerMessage = request.message.toLowerCase();
        const needsPerpsData = lowerMessage.includes('liquidat') || 
                              lowerMessage.includes('funding') || 
                              lowerMessage.includes('leverage') ||
                              lowerMessage.includes('perp') ||
                              lowerMessage.includes('short') ||
                              lowerMessage.includes('long') ||
                              lowerMessage.includes('futures');
        
        // Parallel fetch all context sources (including user memory + social + perps + influencers + CSI + CSS + Social v2 + News v2)
        // Note: Using enriched news with AI-driven intelligence (Step 1.1.3)
        // Note: Using multi-platform social intelligence (Step 1.2.1 + 1.2.2)
        // Note: Using influencer tracking system (Step 1.2.3)
        // Note: Using Coinet Sentiment Index (CSI) - Enterprise Grade
        // Note: Using Composite Social Score (CSS) - 10/10 Divine Perfection (Step 1.2.5)
        // Note: Using Social Intelligence v2.0 - 10/10 Divine Perfection (Section 1.2 Complete)
        // Note: Using News Intelligence v2.0 - 10/10 Divine Perfection (Section 1.1 Complete)
        // Note: Using Derivatives Intelligence v2.0 - 10/10 Divine Perfection (Section 1.3 Complete)
        // Note: Using Behavioral Finance Intelligence - Neuroeconomic Analysis (Prospect Theory, Cognitive Biases)
        // Note: Enterprise Market Data Pipeline (Step 1.4.1) - Multi-source aggregation with cross-verification
        const [userContext, marketData, enterpriseMarketData, whaleContext, enrichedNews, sentiment, socialIntel, influencerIntel, csiResult, cssResult, socialV2Result, newsV2Result, perpsData, derivativesV2, comprehensiveDerivatives, derivativesFinal] = await Promise.all([
          buildUserContextForAI(userId),  // 🧠 User memory
          fetchPricesForMessage(request.message),
          coinSymbols.length > 0 ? fetchCachedEnterpriseMarketPrices(coinSymbols).catch(() => null) : Promise.resolve(null),  // ⚡ Enterprise Market Data Pipeline with Low-Latency Cache
          getWhaleContextForAI(),
          getEnrichedNewsForCoins(coinSymbols),  // 🧠 AI-enriched news intelligence
          getMarketSentiment(),
          getSocialIntelligence(coinSymbols.length > 0 ? coinSymbols : ['BTC', 'ETH', 'SOL']),  // 🌐 Multi-platform social intelligence
          getInfluencerSnapshot(),  // 👤 Influencer tracking intelligence
          calculateCSI(),  // 📊 Enterprise-grade sentiment index
          calculateCompositeSocialScore(),  // 📊 Composite Social Score (FUD/FOMO/Sentiment)
          calculateSocialIntelligenceV2(),  // 🌐 Social Intelligence v2.0 - Divine Perfection
          calculateNewsIntelligenceV2(),  // 📰 News Intelligence v2.0 - Divine Perfection
          needsPerpsData ? getPerpsSnapshot(coinSymbols) : Promise.resolve(null),  // 💀 Liquidation/Funding data (legacy)
          calculateDerivativesIntelligenceV2(),  // 💀 Derivatives Intelligence v2.0 - Divine Perfection
          calculateComprehensiveDerivativesIntelligence().catch(() => null),  // 💀 Comprehensive Derivatives - Step 1.3.2
          calculateDerivativesIntelligenceFinal().catch(() => null),  // 💀 Derivatives Intelligence FINAL - Divine Perfection (All Acceptance Criteria)
        ]);
        
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
        if (userContext.hasProfile && userContext.contextString) {
          contextParts.push(userContext.contextString);
          logger.debug('🧠 User context added', { 
            hasPortfolio: userContext.portfolio.totalHoldings > 0,
            hasPreferences: !!userContext.preferences.riskTolerance,
            watchlistSize: userContext.watchlist.length
          });
        }
        
        // 1. Add market data (prefer Enterprise Pipeline with Cache - Step 1.4.1 + 1.4.2)
        if (enterpriseMarketData && enterpriseMarketData.prices.length > 0) {
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
        } else if (marketData && marketData.prices.length > 0) {
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
        if (enrichedNews && enrichedNews.articles.length > 0) {
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
        if (whaleContext.isAvailable && whaleContext.contextForAI) {
          contextParts.push(whaleContext.contextForAI);
          logger.debug('🐋 Whale context added', { 
            chains: whaleContext.monitoredChains,
            capabilities: whaleContext.capabilities.length
          });
        }
        
        // 5. Add multi-platform social intelligence context (Step 1.2.1)
        if (socialIntel && socialIntel.coins.length > 0) {
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
        if (perpsData && (perpsData.liquidations.length > 0 || perpsData.fundingRates.length > 0)) {
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
        if (influencerIntel && (influencerIntel.recentPosts.length > 0 || influencerIntel.activeAlerts.length > 0)) {
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
              const omniScores = await Promise.all(
                coinsToAnalyze.map(coin => 
                  getProjectOmniScoreV23(coin.coinGeckoId || coin.symbol.toLowerCase())
                    .catch((error) => {
                      logger.warn(`⚠️ OmniScore fetch failed for ${coin.symbol}:`, error);
                      return null;
                    })
                )
              );
              
              logger.debug('🔍 OmniScore: Fetch results', {
                requested: coinsToAnalyze.length,
                received: omniScores.filter(s => s !== null).length,
                results: omniScores.map((s, i) => ({
                  coin: coinsToAnalyze[i].symbol,
                  success: s?.success || false,
                  hasData: !!s,
                })),
              });
              
              const validScores = omniScores.filter(s => s && s.success);
              
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
              // Single coin deep dive
              const primaryCoin = detectedCoins[0];
              const omniScore = await getProjectOmniScoreV23(primaryCoin.coinGeckoId || primaryCoin.symbol.toLowerCase());
              
              if (omniScore && omniScore.success) {
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
                // FALLBACK: OmniScore failed - trigger comprehensive investigation
                logger.info('🔍 OmniScore unavailable, triggering comprehensive investigation', {
                  coin: primaryCoin.symbol,
                });
                
                try {
                  const investigation = await investigateProject(
                    primaryCoin.coinGeckoId || primaryCoin.symbol
                  );
                  
                  if (investigation) {
                    contextParts.push(formatInvestigationForAI(investigation));
                    logger.info('✅ Project investigation completed', {
                      project: investigation.name,
                      symbol: investigation.symbol,
                      dataQuality: investigation.dataQuality,
                      sources: investigation.sources,
                    });
                  } else {
                    contextParts.push(`
⚠️ PROJECT DATA LIMITED FOR ${primaryCoin.symbol.toUpperCase()}
Could not retrieve comprehensive data for this project.
Basic market data may still be available above.
DO NOT improvise scores or metrics - only use verified data provided.
`);
                  }
                } catch (invError) {
                  logger.warn('⚠️ Project investigation failed', { error: invError });
                  contextParts.push(`
⚠️ OMNISCORE DATA UNAVAILABLE FOR ${primaryCoin.symbol.toUpperCase()}
The OmniScore engine could not retrieve reliable data for this project.
DO NOT improvise or estimate OmniScore values.
`);
                }
              }
            }
          } catch (error) {
            // FALLBACK: On error, try investigation before giving up
            const primaryCoin = detectedCoins[0];
            logger.warn('⚠️ OmniScore v2.3.2 analysis failed, trying investigation fallback', { error });
            
            try {
              const investigation = await investigateProject(
                primaryCoin?.coinGeckoId || primaryCoin?.symbol || 'bitcoin'
              );
              
              if (investigation) {
                contextParts.push(formatInvestigationForAI(investigation));
                logger.info('✅ Fallback investigation completed', {
                  project: investigation.name,
                  dataQuality: investigation.dataQuality,
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
        
        // 15. Investigate unknown projects not in OmniScore database
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
        
        if (contextParts.length > 0) {
          liveContextStr = contextParts.join('\n');
        }
      } catch (error: any) {
        logger.debug('⚠️ Could not fetch live context', { error: error?.message });
      }
      
      // 4.6. Extract memories from user message (background, don't block)
      extractMemoriesFromMessage(userId, request.message).catch(err => 
        logger.debug('🧠 Memory extraction failed', { error: err?.message })
      );

      // 5. Call AI service (or use mock if unavailable)
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
        logger.warn('⚠️  AI Service unavailable, using mock response');
        aiResponse = generateMockResponse(request.message);
      }

      // 6. Get sources
      const sources = request.context?.includeSources !== false
        ? await sourceManager.getSources(
            aiResponse.data.symbol || 'BTC',
            aiResponse.data.keyTopics || [],
            5
          )
        : [];

      // 7. Prepare assistant response
      const assistantContent = aiResponse.data.thesis || 
                               aiResponse.data.summary || 
                               (aiResponse.data as any).recommendation || 
                               'I apologize, but I couldn\'t generate a response.';

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

      // Mark original as regenerated
      await prisma.message.update({
        where: { id: messageId },
        data: { regeneratedFrom: messageId },
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
}

// Export singleton instance
export const chatService = new ChatService();

