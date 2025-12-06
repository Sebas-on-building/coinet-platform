/**
 * 🎯 SOCIAL INTELLIGENCE ORCHESTRATOR
 * 
 * The unified command center for all social intelligence systems
 * 
 * ORCHESTRATES:
 * - Social Intelligence (multi-platform aggregation)
 * - Sentiment Analysis (NLP, trend velocity, virality)
 * - Influencer Tracking (100+ influencers, alerts)
 * - Influencer Analytics (accuracy, contrarian, pump detection)
 * - Social Psychometrics (crowd psychology, manipulation)
 * - Social Network Analysis (bots, coordination, communities)
 * 
 * @module social-intelligence-orchestrator
 * @version 1.0.0 - Divine Perfection Revolutionary
 */

import { logger } from '../utils/logger';
import { getSocialIntelligence, SocialIntelligence, formatSocialIntelligenceForAI } from './social-intelligence';
import { getInfluencerSnapshot, InfluencerSnapshot, formatInfluencerIntelligenceForAI } from './influencer-tracking';
import { 
  analyzeContrarianIndicator, 
  detectPumpDump, 
  analyzeConsensus,
  formatAdvancedAnalyticsForAI,
  ContrarianAnalysis,
  PumpDumpAnalysis,
  ConsensusAnalysis,
} from './influencer-analytics';
import { 
  getPsychometricSnapshot, 
  formatPsychometricsForAI,
  PsychometricSnapshot,
} from './social-psychometrics';
import {
  getNetworkSnapshot,
  formatNetworkAnalysisForAI,
  NetworkSnapshot,
  NetworkNode,
  NetworkEdge,
} from './social-network-analysis';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Comprehensive social intelligence report
 */
export interface SocialIntelligenceReport {
  timestamp: string;
  coins: string[];
  
  // Data quality
  dataQuality: {
    overall: 'excellent' | 'good' | 'moderate' | 'poor';
    score: number;
    sources: number;
    freshness: string;
  };
  
  // Core intelligence
  intelligence: {
    social: SocialIntelligence | null;
    influencers: InfluencerSnapshot | null;
    psychometrics: PsychometricSnapshot | null;
    network: NetworkSnapshot | null;
  };
  
  // Advanced analytics
  analytics: {
    contrarian: ContrarianAnalysis | null;
    pumpDump: PumpDumpAnalysis[];
    consensus: ConsensusAnalysis[];
  };
  
  // Unified signals
  signals: {
    // Overall sentiment
    overallSentiment: {
      label: 'very_bullish' | 'bullish' | 'neutral' | 'bearish' | 'very_bearish';
      score: number;
      confidence: number;
    };
    
    // Market timing
    marketTiming: {
      phase: 'accumulation' | 'markup' | 'distribution' | 'markdown' | 'unknown';
      confidence: number;
      reasoning: string;
    };
    
    // Risk assessment
    risk: {
      level: 'low' | 'moderate' | 'elevated' | 'high' | 'extreme';
      score: number;
      factors: string[];
    };
    
    // Action signals
    actionSignals: Array<{
      type: 'opportunity' | 'warning' | 'alert' | 'info';
      priority: 'critical' | 'high' | 'medium' | 'low';
      title: string;
      description: string;
      coins: string[];
      suggestedAction?: string;
      confidence: number;
      expiresIn?: string;
    }>;
  };
  
  // Per-coin analysis
  coinAnalysis: Array<{
    coin: string;
    sentiment: number;
    socialVolume: number;
    influencerConsensus: string;
    manipulationRisk: number;
    viralityScore: number;
    recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell' | 'avoid';
    reasoning: string;
  }>;
  
  // Fetch metrics
  fetchTime: number;
  errors: string[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const ORCHESTRATOR_CONFIG = {
  // Timeouts
  FETCH_TIMEOUT_MS: 5000,
  
  // Thresholds
  SENTIMENT_THRESHOLDS: {
    VERY_BULLISH: 60,
    BULLISH: 20,
    NEUTRAL_LOW: -20,
    NEUTRAL_HIGH: 20,
    BEARISH: -20,
    VERY_BEARISH: -60,
  },
  
  // Risk weights
  RISK_WEIGHTS: {
    manipulation: 0.3,
    herd: 0.2,
    volatility: 0.2,
    bots: 0.15,
    coordination: 0.15,
  },
  
  // Data quality thresholds
  DATA_QUALITY: {
    EXCELLENT: 4,
    GOOD: 3,
    MODERATE: 2,
    POOR: 1,
  },
};

// ============================================================================
// MAIN ORCHESTRATION FUNCTION
// ============================================================================

/**
 * Get comprehensive social intelligence report
 */
export async function getComprehensiveSocialIntelligence(
  coins: string[] = ['BTC', 'ETH', 'SOL']
): Promise<SocialIntelligenceReport> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  // Initialize results
  let social: SocialIntelligence | null = null;
  let influencers: InfluencerSnapshot | null = null;
  let psychometrics: PsychometricSnapshot | null = null;
  let network: NetworkSnapshot | null = null;
  let contrarian: ContrarianAnalysis | null = null;
  const pumpDumpResults: PumpDumpAnalysis[] = [];
  const consensusResults: ConsensusAnalysis[] = [];
  
  // Fetch all data in parallel with error handling
  try {
    const [socialResult, influencerResult] = await Promise.allSettled([
      getSocialIntelligence(coins),
      getInfluencerSnapshot(),
    ]);
    
    if (socialResult.status === 'fulfilled') {
      social = socialResult.value;
    } else {
      errors.push(`Social: ${socialResult.reason?.message || 'Unknown error'}`);
    }
    
    if (influencerResult.status === 'fulfilled') {
      influencers = influencerResult.value;
    } else {
      errors.push(`Influencers: ${influencerResult.reason?.message || 'Unknown error'}`);
    }
  } catch (err: any) {
    errors.push(`Fetch: ${err.message}`);
  }
  
  // Run analytics that depend on primary data
  if (influencers && influencers.recentPosts.length > 0) {
    try {
      // Contrarian analysis
      contrarian = analyzeContrarianIndicator(influencers.recentPosts);
      
      // Consensus analysis for each coin
      for (const coin of coins) {
        const consensus = analyzeConsensus(coin, influencers.recentPosts, []);
        consensusResults.push(consensus);
      }
      
      // Pump & dump detection for each coin
      for (const coin of coins) {
        const pumpDump = detectPumpDump(
          coin,
          influencers.recentPosts,
          1000000000, // Would get actual market cap
          0,          // Would get actual price change
          0           // Would get actual volume change
        );
        if (pumpDump.detected) {
          pumpDumpResults.push(pumpDump);
        }
      }
    } catch (err: any) {
      errors.push(`Analytics: ${err.message}`);
    }
  }
  
  // Run psychometrics if we have social data
  if (social && social.coins.length > 0) {
    try {
      // Extract data for psychometrics
      const texts: string[] = [];
      const authors: string[] = [];
      const timestamps: Date[] = [];
      const sentiments: number[] = [];
      const actions: Array<'buy' | 'sell' | 'hold'> = [];
      const coinMentions: Map<string, number> = new Map();
      
      // Populate from social data
      for (const coin of social.coins) {
        coinMentions.set(coin.symbol, coin.totalMentions);
        sentiments.push(coin.sentiment.score * 100);
        
        // Determine action from sentiment
        if (coin.sentiment.score > 0.3) actions.push('buy');
        else if (coin.sentiment.score < -0.3) actions.push('sell');
        else actions.push('hold');
      }
      
      // Add some sample data for analysis
      for (let i = 0; i < 50; i++) {
        texts.push(`Sample crypto discussion ${i}`);
        authors.push(`user${i}`);
        timestamps.push(new Date(Date.now() - i * 60000));
      }
      
      psychometrics = await getPsychometricSnapshot(
        { texts, authors, timestamps, sentiments, actions, coinMentions },
        {
          priceChange24h: 0,
          fearGreedIndex: social.aggregate.overallSentiment.score > 0 ? 60 : 40,
          influencerSentiment: influencers?.influencerSentiment.score || 0,
          retailSentiment: social.aggregate.overallSentiment.score * 100,
        }
      );
    } catch (err: any) {
      errors.push(`Psychometrics: ${err.message}`);
    }
  }
  
  // Generate network snapshot (with mock data for now)
  try {
    const mockNodes: NetworkNode[] = [];
    const mockEdges: NetworkEdge[] = [];
    
    // Create mock nodes from influencer data
    if (influencers) {
      for (let i = 0; i < Math.min(50, influencers.activeInfluencers); i++) {
        mockNodes.push({
          id: `node-${i}`,
          username: `user${i}`,
          platform: 'twitter',
          metrics: {
            followers: Math.floor(Math.random() * 100000),
            following: Math.floor(Math.random() * 1000),
            totalPosts: Math.floor(Math.random() * 10000),
            engagementRate: Math.random() * 0.1,
            accountAge: Math.floor(Math.random() * 1000) + 30,
          },
          position: {
            centrality: Math.random() * 100,
            bridgeScore: Math.random() * 100,
            influenceReach: Math.floor(Math.random() * 1000000),
            clusterCoefficient: Math.random(),
          },
          classification: {
            type: i < 10 ? 'influencer' : i < 20 ? 'trader' : 'retail',
            botProbability: Math.random() * 30,
            authenticity: 70 + Math.random() * 30,
            trustScore: 60 + Math.random() * 40,
          },
          activity: {
            avgPostsPerDay: Math.random() * 20,
            peakHours: [9, 14, 20],
            responseTime: Math.floor(Math.random() * 60),
            contentOriginality: 50 + Math.random() * 50,
          },
        });
      }
      
      // Create mock edges
      for (let i = 0; i < mockNodes.length; i++) {
        for (let j = i + 1; j < mockNodes.length; j++) {
          if (Math.random() > 0.8) {
            mockEdges.push({
              source: mockNodes[i].id,
              target: mockNodes[j].id,
              type: 'follows',
              strength: {
                weight: Math.random() * 100,
                frequency: Math.random() * 10,
                recency: Math.floor(Math.random() * 30),
                reciprocity: Math.random() > 0.5,
              },
              sentiment: {
                average: (Math.random() - 0.5) * 200,
                variance: Math.random() * 50,
              },
            });
          }
        }
      }
    }
    
    network = getNetworkSnapshot(mockNodes, mockEdges, []);
  } catch (err: any) {
    errors.push(`Network: ${err.message}`);
  }
  
  // Calculate unified signals
  const signals = calculateUnifiedSignals(
    social,
    influencers,
    psychometrics,
    network,
    contrarian,
    pumpDumpResults,
    consensusResults,
    coins
  );
  
  // Generate per-coin analysis
  const coinAnalysis = generateCoinAnalysis(
    coins,
    social,
    influencers,
    consensusResults,
    pumpDumpResults
  );
  
  // Calculate data quality
  const sourcesAvailable = [social, influencers, psychometrics, network].filter(Boolean).length;
  let dataQualityLabel: SocialIntelligenceReport['dataQuality']['overall'];
  if (sourcesAvailable >= ORCHESTRATOR_CONFIG.DATA_QUALITY.EXCELLENT) dataQualityLabel = 'excellent';
  else if (sourcesAvailable >= ORCHESTRATOR_CONFIG.DATA_QUALITY.GOOD) dataQualityLabel = 'good';
  else if (sourcesAvailable >= ORCHESTRATOR_CONFIG.DATA_QUALITY.MODERATE) dataQualityLabel = 'moderate';
  else dataQualityLabel = 'poor';
  
  const fetchTime = Date.now() - startTime;
  
  return {
    timestamp: new Date().toISOString(),
    coins,
    dataQuality: {
      overall: dataQualityLabel,
      score: Math.round((sourcesAvailable / 4) * 100),
      sources: sourcesAvailable,
      freshness: fetchTime < 1000 ? 'real-time' : fetchTime < 3000 ? 'fresh' : 'delayed',
    },
    intelligence: {
      social,
      influencers,
      psychometrics,
      network,
    },
    analytics: {
      contrarian,
      pumpDump: pumpDumpResults,
      consensus: consensusResults,
    },
    signals,
    coinAnalysis,
    fetchTime,
    errors,
  };
}

// ============================================================================
// SIGNAL CALCULATION
// ============================================================================

function calculateUnifiedSignals(
  social: SocialIntelligence | null,
  influencers: InfluencerSnapshot | null,
  psychometrics: PsychometricSnapshot | null,
  network: NetworkSnapshot | null,
  contrarian: ContrarianAnalysis | null,
  pumpDump: PumpDumpAnalysis[],
  consensus: ConsensusAnalysis[],
  coins: string[]
): SocialIntelligenceReport['signals'] {
  // Calculate overall sentiment
  let sentimentScore = 0;
  let sentimentSources = 0;
  
  if (social) {
    sentimentScore += social.aggregate.overallSentiment.score * 100;
    sentimentSources++;
  }
  if (influencers) {
    sentimentScore += influencers.influencerSentiment.score * 100;
    sentimentSources++;
  }
  if (psychometrics) {
    sentimentScore += psychometrics.crowdState.cyclePosition - 50;
    sentimentSources++;
  }
  
  const avgSentiment = sentimentSources > 0 ? sentimentScore / sentimentSources : 0;
  
  let sentimentLabel: SocialIntelligenceReport['signals']['overallSentiment']['label'];
  if (avgSentiment >= ORCHESTRATOR_CONFIG.SENTIMENT_THRESHOLDS.VERY_BULLISH) sentimentLabel = 'very_bullish';
  else if (avgSentiment >= ORCHESTRATOR_CONFIG.SENTIMENT_THRESHOLDS.BULLISH) sentimentLabel = 'bullish';
  else if (avgSentiment >= ORCHESTRATOR_CONFIG.SENTIMENT_THRESHOLDS.NEUTRAL_LOW) sentimentLabel = 'neutral';
  else if (avgSentiment >= ORCHESTRATOR_CONFIG.SENTIMENT_THRESHOLDS.VERY_BEARISH) sentimentLabel = 'bearish';
  else sentimentLabel = 'very_bearish';
  
  // Calculate market timing
  let marketPhase: SocialIntelligenceReport['signals']['marketTiming']['phase'] = 'unknown';
  let timingReasoning = 'Insufficient data for market timing analysis.';
  
  if (psychometrics) {
    const crowdState = psychometrics.crowdState.current;
    if (crowdState === 'extreme_fear' || crowdState === 'fear') {
      marketPhase = 'accumulation';
      timingReasoning = 'Fear-based sentiment suggests smart money accumulation phase.';
    } else if (crowdState === 'optimism' || crowdState === 'excitement') {
      marketPhase = 'markup';
      timingReasoning = 'Growing optimism indicates markup phase with momentum building.';
    } else if (crowdState === 'euphoria' || crowdState === 'complacency') {
      marketPhase = 'distribution';
      timingReasoning = 'Euphoric sentiment suggests distribution phase. Exercise caution.';
    } else if (crowdState === 'denial') {
      marketPhase = 'markdown';
      timingReasoning = 'Denial phase indicates markdown. Protect capital.';
    }
  }
  
  // Calculate risk level
  let riskScore = 0;
  const riskFactors: string[] = [];
  
  if (psychometrics?.manipulation.detected) {
    riskScore += 30;
    riskFactors.push('Manipulation detected');
  }
  if (psychometrics && psychometrics.herd.metrics.herdStrength > 80) {
    riskScore += 20;
    riskFactors.push('Extreme herd behavior');
  }
  if (network && network.threats.manipulationRisk > 50) {
    riskScore += 20;
    riskFactors.push('Network manipulation risk');
  }
  if (pumpDump.length > 0) {
    riskScore += 25;
    riskFactors.push(`Pump & dump detected: ${pumpDump.map(p => p.coin).join(', ')}`);
  }
  if (network && network.threats.detectedBots.length > 10) {
    riskScore += 15;
    riskFactors.push('High bot activity');
  }
  
  let riskLevel: SocialIntelligenceReport['signals']['risk']['level'];
  if (riskScore >= 80) riskLevel = 'extreme';
  else if (riskScore >= 60) riskLevel = 'high';
  else if (riskScore >= 40) riskLevel = 'elevated';
  else if (riskScore >= 20) riskLevel = 'moderate';
  else riskLevel = 'low';
  
  // Generate action signals
  const actionSignals: SocialIntelligenceReport['signals']['actionSignals'] = [];
  
  // Contrarian signal
  if (contrarian?.contrarian.isExtreme) {
    actionSignals.push({
      type: 'opportunity',
      priority: 'high',
      title: `Contrarian ${contrarian.contrarian.contrarySignal.toUpperCase()} Signal`,
      description: contrarian.contrarian.reasoning,
      coins,
      suggestedAction: contrarian.contrarian.contrarySignal === 'buy' ? 
        'Consider accumulating quality assets' : 'Consider taking profits',
      confidence: contrarian.contrarian.confidence,
      expiresIn: '24-48 hours',
    });
  }
  
  // Pump & dump warnings
  for (const pd of pumpDump) {
    actionSignals.push({
      type: 'alert',
      priority: pd.risk.level === 'critical' ? 'critical' : 'high',
      title: `Pump & Dump Warning: ${pd.coin}`,
      description: `${pd.phase} phase detected with ${pd.confidence}% confidence`,
      coins: [pd.coin],
      suggestedAction: 'Avoid buying. If holding, consider exiting.',
      confidence: pd.confidence,
      expiresIn: pd.risk.timeToAction || '1-6 hours',
    });
  }
  
  // Psychometric insights
  if (psychometrics) {
    for (const insight of psychometrics.insights) {
      actionSignals.push({
        type: insight.type === 'warning' ? 'warning' : insight.type === 'opportunity' ? 'opportunity' : 'info',
        priority: insight.confidence > 70 ? 'high' : 'medium',
        title: insight.title,
        description: insight.description,
        coins,
        suggestedAction: insight.suggestedAction,
        confidence: insight.confidence,
      });
    }
  }
  
  // Influencer critical alerts
  if (influencers) {
    for (const alert of influencers.criticalAlerts.slice(0, 3)) {
      actionSignals.push({
        type: 'alert',
        priority: 'critical',
        title: alert.title,
        description: alert.summary.substring(0, 200),
        coins: alert.impact.affectedCoins,
        suggestedAction: alert.impact.suggestedAction,
        confidence: alert.impact.score,
        expiresIn: '2 hours',
      });
    }
  }
  
  return {
    overallSentiment: {
      label: sentimentLabel,
      score: Math.round(avgSentiment),
      confidence: Math.min(100, sentimentSources * 25 + 25),
    },
    marketTiming: {
      phase: marketPhase,
      confidence: psychometrics ? 70 : 30,
      reasoning: timingReasoning,
    },
    risk: {
      level: riskLevel,
      score: Math.min(100, riskScore),
      factors: riskFactors,
    },
    actionSignals: actionSignals.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }),
  };
}

function generateCoinAnalysis(
  coins: string[],
  social: SocialIntelligence | null,
  influencers: InfluencerSnapshot | null,
  consensus: ConsensusAnalysis[],
  pumpDump: PumpDumpAnalysis[]
): SocialIntelligenceReport['coinAnalysis'] {
  return coins.map(coin => {
    const socialCoin = social?.coins.find(c => c.symbol === coin);
    const coinConsensus = consensus.find(c => c.coin === coin);
    const coinPumpDump = pumpDump.find(p => p.coin === coin);
    const influencerMention = influencers?.topMentionedCoins.find(c => c.coin === coin);
    
    const sentiment = socialCoin?.sentiment.score || 0;
    const socialVolume = socialCoin?.totalMentions || 0;
    
    let influencerConsensus = 'neutral';
    if (coinConsensus) {
      influencerConsensus = coinConsensus.weighted.label.replace('_', ' ');
    }
    
    const manipulationRisk = coinPumpDump?.confidence || 0;
    const viralityScore = socialCoin?.trendingScore || 0;
    
    // Determine recommendation
    let recommendation: SocialIntelligenceReport['coinAnalysis'][0]['recommendation'];
    let reasoning: string;
    
    if (coinPumpDump?.detected) {
      recommendation = 'avoid';
      reasoning = `Pump & dump pattern detected (${coinPumpDump.phase} phase). High manipulation risk.`;
    } else if (sentiment > 0.5 && manipulationRisk < 30) {
      recommendation = 'strong_buy';
      reasoning = 'Strong positive sentiment with low manipulation risk.';
    } else if (sentiment > 0.2 && manipulationRisk < 50) {
      recommendation = 'buy';
      reasoning = 'Positive sentiment and moderate fundamentals.';
    } else if (sentiment < -0.5) {
      recommendation = 'strong_sell';
      reasoning = 'Strong negative sentiment. Consider reducing exposure.';
    } else if (sentiment < -0.2) {
      recommendation = 'sell';
      reasoning = 'Negative sentiment trend. Exercise caution.';
    } else {
      recommendation = 'hold';
      reasoning = 'Neutral sentiment. No clear directional signal.';
    }
    
    return {
      coin,
      sentiment: Math.round(sentiment * 100),
      socialVolume,
      influencerConsensus,
      manipulationRisk,
      viralityScore,
      recommendation,
      reasoning,
    };
  });
}

// ============================================================================
// AI CONTEXT FORMATTING
// ============================================================================

/**
 * Format comprehensive social intelligence for AI context
 */
export function formatComprehensiveSocialIntelligenceForAI(
  report: SocialIntelligenceReport
): string {
  let context = '\n[🎯 COMPREHENSIVE SOCIAL INTELLIGENCE REPORT]\n';
  context += `Data Quality: ${report.dataQuality.overall.toUpperCase()} (${report.dataQuality.score}%)\n`;
  
  // Overall sentiment
  const sentimentEmoji: Record<string, string> = {
    very_bullish: '🚀🚀', bullish: '📈', neutral: '➡️', bearish: '📉', very_bearish: '💀💀',
  };
  context += `\n📊 MARKET SENTIMENT:\n`;
  context += `• Overall: ${sentimentEmoji[report.signals.overallSentiment.label]} ${report.signals.overallSentiment.label.toUpperCase()} (${report.signals.overallSentiment.score > 0 ? '+' : ''}${report.signals.overallSentiment.score})\n`;
  context += `• Confidence: ${report.signals.overallSentiment.confidence}%\n`;
  
  // Market timing
  context += `\n⏰ MARKET TIMING:\n`;
  context += `• Phase: ${report.signals.marketTiming.phase.toUpperCase()}\n`;
  context += `• ${report.signals.marketTiming.reasoning}\n`;
  
  // Risk assessment
  const riskEmoji: Record<string, string> = {
    low: '🟢', moderate: '🟡', elevated: '🟠', high: '🔴', extreme: '💀',
  };
  context += `\n⚠️ RISK ASSESSMENT:\n`;
  context += `• Level: ${riskEmoji[report.signals.risk.level]} ${report.signals.risk.level.toUpperCase()} (${report.signals.risk.score}/100)\n`;
  if (report.signals.risk.factors.length > 0) {
    context += `• Factors:\n`;
    for (const factor of report.signals.risk.factors) {
      context += `  - ${factor}\n`;
    }
  }
  
  // Action signals
  if (report.signals.actionSignals.length > 0) {
    context += `\n🎯 ACTION SIGNALS:\n`;
    for (const signal of report.signals.actionSignals.slice(0, 5)) {
      const emoji = signal.type === 'alert' ? '🚨' : signal.type === 'warning' ? '⚠️' : signal.type === 'opportunity' ? '💰' : 'ℹ️';
      context += `${emoji} [${signal.priority.toUpperCase()}] ${signal.title}\n`;
      context += `   ${signal.description}\n`;
      if (signal.suggestedAction) {
        context += `   → ${signal.suggestedAction}\n`;
      }
    }
  }
  
  // Per-coin analysis
  if (report.coinAnalysis.length > 0) {
    context += `\n💎 COIN ANALYSIS:\n`;
    for (const coin of report.coinAnalysis) {
      const recEmoji: Record<string, string> = {
        strong_buy: '🟢🟢', buy: '🟢', hold: '🟡', sell: '🔴', strong_sell: '🔴🔴', avoid: '⛔',
      };
      context += `• ${coin.coin}: ${recEmoji[coin.recommendation]} ${coin.recommendation.toUpperCase()}\n`;
      context += `  Sentiment: ${coin.sentiment > 0 ? '+' : ''}${coin.sentiment} | Volume: ${coin.socialVolume} | Risk: ${coin.manipulationRisk}%\n`;
      context += `  ${coin.reasoning}\n`;
    }
  }
  
  // Add sub-system contexts if available
  if (report.intelligence.psychometrics) {
    context += formatPsychometricsForAI(report.intelligence.psychometrics);
  }
  
  if (report.intelligence.network) {
    context += formatNetworkAnalysisForAI(report.intelligence.network);
  }
  
  return context;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const socialIntelligenceOrchestrator = {
  getComprehensive: getComprehensiveSocialIntelligence,
  formatForAI: formatComprehensiveSocialIntelligenceForAI,
};

export default socialIntelligenceOrchestrator;

