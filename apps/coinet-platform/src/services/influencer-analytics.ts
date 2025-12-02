/**
 * 📊 ADVANCED INFLUENCER ANALYTICS ENGINE
 * 
 * Divine Perfection Step 1.2.3 Enhancement
 * 
 * ADVANCED FEATURES:
 * - Historical performance tracking with decay
 * - Network effect analysis (influencer relationships)
 * - Contrarian indicator detection
 * - Market timing accuracy scoring
 * - Pump & dump pattern detection
 * - Cross-influencer consensus analysis
 * - Influence decay modeling
 * - Real-time credibility adjustment
 * 
 * @module influencer-analytics
 * @version 2.0.0 - Divine Perfection Enhanced
 */

import { logger } from '../utils/logger';
import { 
  Influencer, 
  InfluencerPost, 
  InfluencerTier,
  InfluencerAlert,
} from './influencer-tracking';

// ============================================================================
// ADVANCED TYPES
// ============================================================================

/**
 * Historical call record for accuracy tracking
 */
export interface InfluencerCall {
  id: string;
  influencerId: string;
  timestamp: Date;
  
  // The call
  call: {
    type: 'buy' | 'sell' | 'hold' | 'avoid';
    coin: string;
    priceAtCall: number;
    targetPrice?: number;
    timeframe?: string;  // "1d", "1w", "1m", "3m"
    confidence: number;
  };
  
  // Outcome tracking
  outcome?: {
    priceAfter24h?: number;
    priceAfter7d?: number;
    priceAfter30d?: number;
    maxGain?: number;
    maxLoss?: number;
    wasCorrect?: boolean;
    accuracy?: number;  // 0-100
    evaluatedAt?: Date;
  };
  
  // Context
  context: {
    marketCondition: 'bull' | 'bear' | 'sideways';
    btcPrice: number;
    fearGreedIndex?: number;
  };
}

/**
 * Influencer network connection
 */
export interface InfluencerConnection {
  influencerA: string;
  influencerB: string;
  connectionType: 'follows' | 'mentions' | 'retweets' | 'collaborates' | 'disagrees';
  strength: number;  // 0-100
  lastInteraction?: Date;
}

/**
 * Contrarian indicator analysis
 */
export interface ContrarianAnalysis {
  timestamp: Date;
  
  // Consensus metrics
  consensus: {
    bullishPercentage: number;
    bearishPercentage: number;
    neutralPercentage: number;
    consensusStrength: number;  // 0-100 (high = strong agreement)
  };
  
  // Contrarian signals
  contrarian: {
    isExtreme: boolean;
    direction: 'extreme_bullish' | 'extreme_bearish' | 'neutral';
    contrarySignal: 'sell' | 'buy' | 'none';
    confidence: number;
    reasoning: string;
  };
  
  // Historical context
  historical: {
    similarSituations: number;
    averageOutcome: number;  // % price change
    winRate: number;
  };
}

/**
 * Pump & dump detection
 */
export interface PumpDumpAnalysis {
  coin: string;
  timestamp: Date;
  
  // Detection
  detected: boolean;
  confidence: number;  // 0-100
  phase: 'accumulation' | 'pump' | 'distribution' | 'dump' | 'none';
  
  // Evidence
  evidence: {
    suddenInfluencerMentions: boolean;
    coordinatedTiming: boolean;
    lowCapCoin: boolean;
    unusualEngagement: boolean;
    knownPumpAccounts: string[];
    priceVolumeAnomaly: boolean;
  };
  
  // Risk assessment
  risk: {
    level: 'low' | 'medium' | 'high' | 'critical';
    estimatedPumpTarget?: number;
    estimatedDumpLevel?: number;
    timeToAction?: string;
  };
  
  // Involved influencers
  involvedInfluencers: Array<{
    id: string;
    name: string;
    role: 'promoter' | 'amplifier' | 'organic' | 'unknown';
    suspicionScore: number;
  }>;
}

/**
 * Cross-influencer consensus
 */
export interface ConsensusAnalysis {
  coin: string;
  timestamp: Date;
  
  // Consensus breakdown
  breakdown: {
    strongBuy: string[];      // influencer IDs
    buy: string[];
    hold: string[];
    sell: string[];
    strongSell: string[];
  };
  
  // Weighted consensus
  weighted: {
    score: number;  // -100 to 100
    label: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
    confidence: number;
    
    // Tier-weighted breakdown
    legendaryConsensus: number;
    eliteConsensus: number;
    majorConsensus: number;
    notableConsensus: number;
    risingConsensus: number;
  };
  
  // Divergence detection
  divergence: {
    hasDivergence: boolean;
    type?: 'tier_divergence' | 'specialist_divergence' | 'institutional_divergence';
    description?: string;
    significance: number;
  };
  
  // Smart money vs retail
  smartVsRetail: {
    smartMoneySignal: number;  // -100 to 100
    retailSignal: number;
    divergence: number;
    interpretation: string;
  };
}

/**
 * Influence decay model
 */
export interface InfluenceDecay {
  influencerId: string;
  
  // Current state
  current: {
    effectiveCredibility: number;  // Adjusted for recent performance
    effectiveImpact: number;
    trendDirection: 'rising' | 'falling' | 'stable';
  };
  
  // Decay factors
  factors: {
    recentAccuracy: number;       // Last 30 days accuracy
    engagementTrend: number;      // -100 to 100
    followerGrowth: number;       // % change
    controversyPenalty: number;   // 0-50 penalty
    inactivityPenalty: number;    // 0-30 penalty
  };
  
  // Adjustments
  adjustments: {
    originalCredibility: number;
    credibilityDelta: number;
    reason: string;
  };
}

/**
 * Real-time credibility adjustment
 */
export interface CredibilityAdjustment {
  influencerId: string;
  timestamp: Date;
  
  // Adjustment
  adjustment: {
    previousScore: number;
    newScore: number;
    delta: number;
    reason: string;
  };
  
  // Trigger
  trigger: {
    type: 'correct_call' | 'wrong_call' | 'controversy' | 'milestone' | 'engagement_change';
    details: string;
    evidence?: string;
  };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const ANALYTICS_CONFIG = {
  // Accuracy evaluation timeframes
  EVALUATION_TIMEFRAMES: {
    short: 24 * 60 * 60 * 1000,      // 24 hours
    medium: 7 * 24 * 60 * 60 * 1000,  // 7 days
    long: 30 * 24 * 60 * 60 * 1000,   // 30 days
  },
  
  // Contrarian thresholds
  CONTRARIAN: {
    EXTREME_BULLISH_THRESHOLD: 85,  // >85% bullish = contrarian sell
    EXTREME_BEARISH_THRESHOLD: 15,  // <15% bullish = contrarian buy
    MIN_SAMPLE_SIZE: 10,
  },
  
  // Pump & dump detection
  PUMP_DUMP: {
    SUDDEN_MENTION_THRESHOLD: 5,     // 5x normal mentions
    COORDINATION_WINDOW_MS: 4 * 60 * 60 * 1000,  // 4 hours
    LOW_CAP_THRESHOLD: 50_000_000,   // $50M market cap
    MIN_SUSPICION_SCORE: 60,
  },
  
  // Credibility decay
  DECAY: {
    WRONG_CALL_PENALTY: -5,
    CORRECT_CALL_BONUS: 3,
    INACTIVITY_DAYS_THRESHOLD: 14,
    MAX_INACTIVITY_PENALTY: 15,
    CONTROVERSY_PENALTY_PER_INCIDENT: 10,
  },
  
  // Consensus weights by tier
  TIER_CONSENSUS_WEIGHTS: {
    legendary: 5.0,
    elite: 3.0,
    major: 2.0,
    notable: 1.5,
    rising: 1.0,
  },
};

// ============================================================================
// STORAGE (In-memory for now, would be Redis/DB in production)
// ============================================================================

const callHistory: Map<string, InfluencerCall[]> = new Map();
const credibilityHistory: Map<string, CredibilityAdjustment[]> = new Map();
const influencerConnections: InfluencerConnection[] = [];

// Known pump accounts (flagged for suspicious activity)
const KNOWN_PUMP_ACCOUNTS: Set<string> = new Set([
  // These would be populated from analysis
]);

// ============================================================================
// HISTORICAL ACCURACY TRACKING
// ============================================================================

/**
 * Record an influencer call for tracking
 */
export function recordInfluencerCall(
  influencer: Influencer,
  call: InfluencerCall['call'],
  context: InfluencerCall['context']
): InfluencerCall {
  const callRecord: InfluencerCall = {
    id: `call-${influencer.id}-${Date.now()}`,
    influencerId: influencer.id,
    timestamp: new Date(),
    call,
    context,
  };
  
  const existing = callHistory.get(influencer.id) || [];
  existing.push(callRecord);
  callHistory.set(influencer.id, existing);
  
  logger.debug('📊 Recorded influencer call', {
    influencer: influencer.name,
    call: call.type,
    coin: call.coin,
  });
  
  return callRecord;
}

/**
 * Evaluate historical call accuracy
 */
export function evaluateCallAccuracy(
  callId: string,
  currentPrice: number
): InfluencerCall | null {
  for (const [influencerId, calls] of callHistory.entries()) {
    const call = calls.find(c => c.id === callId);
    if (call && !call.outcome?.evaluatedAt) {
      const priceChange = ((currentPrice - call.call.priceAtCall) / call.call.priceAtCall) * 100;
      
      let wasCorrect = false;
      if (call.call.type === 'buy' && priceChange > 5) wasCorrect = true;
      if (call.call.type === 'sell' && priceChange < -5) wasCorrect = true;
      if (call.call.type === 'hold' && Math.abs(priceChange) < 10) wasCorrect = true;
      if (call.call.type === 'avoid' && priceChange < 0) wasCorrect = true;
      
      call.outcome = {
        ...call.outcome,
        wasCorrect,
        accuracy: wasCorrect ? 100 : 0,
        evaluatedAt: new Date(),
      };
      
      // Adjust credibility based on outcome
      adjustCredibilityFromCall(influencerId, wasCorrect);
      
      return call;
    }
  }
  return null;
}

/**
 * Get influencer accuracy stats
 */
export function getInfluencerAccuracyStats(influencerId: string): {
  totalCalls: number;
  evaluatedCalls: number;
  correctCalls: number;
  accuracy: number;
  byTimeframe: {
    short: { correct: number; total: number; accuracy: number };
    medium: { correct: number; total: number; accuracy: number };
    long: { correct: number; total: number; accuracy: number };
  };
  byMarketCondition: {
    bull: { correct: number; total: number; accuracy: number };
    bear: { correct: number; total: number; accuracy: number };
    sideways: { correct: number; total: number; accuracy: number };
  };
} {
  const calls = callHistory.get(influencerId) || [];
  const evaluated = calls.filter(c => c.outcome?.evaluatedAt);
  const correct = evaluated.filter(c => c.outcome?.wasCorrect);
  
  const now = Date.now();
  const shortCalls = evaluated.filter(c => now - c.timestamp.getTime() < ANALYTICS_CONFIG.EVALUATION_TIMEFRAMES.short);
  const mediumCalls = evaluated.filter(c => now - c.timestamp.getTime() < ANALYTICS_CONFIG.EVALUATION_TIMEFRAMES.medium);
  const longCalls = evaluated.filter(c => now - c.timestamp.getTime() < ANALYTICS_CONFIG.EVALUATION_TIMEFRAMES.long);
  
  const bullCalls = evaluated.filter(c => c.context.marketCondition === 'bull');
  const bearCalls = evaluated.filter(c => c.context.marketCondition === 'bear');
  const sidewaysCalls = evaluated.filter(c => c.context.marketCondition === 'sideways');
  
  const calcAccuracy = (arr: InfluencerCall[]) => {
    const correctInArr = arr.filter(c => c.outcome?.wasCorrect).length;
    return arr.length > 0 ? Math.round((correctInArr / arr.length) * 100) : 0;
  };
  
  return {
    totalCalls: calls.length,
    evaluatedCalls: evaluated.length,
    correctCalls: correct.length,
    accuracy: evaluated.length > 0 ? Math.round((correct.length / evaluated.length) * 100) : 0,
    byTimeframe: {
      short: { correct: shortCalls.filter(c => c.outcome?.wasCorrect).length, total: shortCalls.length, accuracy: calcAccuracy(shortCalls) },
      medium: { correct: mediumCalls.filter(c => c.outcome?.wasCorrect).length, total: mediumCalls.length, accuracy: calcAccuracy(mediumCalls) },
      long: { correct: longCalls.filter(c => c.outcome?.wasCorrect).length, total: longCalls.length, accuracy: calcAccuracy(longCalls) },
    },
    byMarketCondition: {
      bull: { correct: bullCalls.filter(c => c.outcome?.wasCorrect).length, total: bullCalls.length, accuracy: calcAccuracy(bullCalls) },
      bear: { correct: bearCalls.filter(c => c.outcome?.wasCorrect).length, total: bearCalls.length, accuracy: calcAccuracy(bearCalls) },
      sideways: { correct: sidewaysCalls.filter(c => c.outcome?.wasCorrect).length, total: sidewaysCalls.length, accuracy: calcAccuracy(sidewaysCalls) },
    },
  };
}

// ============================================================================
// CONTRARIAN INDICATOR ANALYSIS
// ============================================================================

/**
 * Analyze influencer consensus for contrarian signals
 */
export function analyzeContrarianIndicator(
  posts: InfluencerPost[],
  historicalData?: { situation: string; outcome: number }[]
): ContrarianAnalysis {
  const now = new Date();
  
  // Count sentiment distribution
  let bullish = 0, bearish = 0, neutral = 0;
  
  for (const post of posts) {
    const score = post.analysis.sentiment.sentiment.score;
    if (score > 0.2) bullish++;
    else if (score < -0.2) bearish++;
    else neutral++;
  }
  
  const total = bullish + bearish + neutral;
  const bullishPct = total > 0 ? (bullish / total) * 100 : 50;
  const bearishPct = total > 0 ? (bearish / total) * 100 : 50;
  const neutralPct = total > 0 ? (neutral / total) * 100 : 0;
  
  // Calculate consensus strength (how much agreement)
  const maxPct = Math.max(bullishPct, bearishPct, neutralPct);
  const consensusStrength = maxPct;
  
  // Determine if extreme
  const isExtreme = bullishPct > ANALYTICS_CONFIG.CONTRARIAN.EXTREME_BULLISH_THRESHOLD ||
                   bullishPct < ANALYTICS_CONFIG.CONTRARIAN.EXTREME_BEARISH_THRESHOLD;
  
  let direction: ContrarianAnalysis['contrarian']['direction'] = 'neutral';
  let contrarySignal: ContrarianAnalysis['contrarian']['contrarySignal'] = 'none';
  let reasoning = 'No extreme consensus detected.';
  
  if (bullishPct > ANALYTICS_CONFIG.CONTRARIAN.EXTREME_BULLISH_THRESHOLD) {
    direction = 'extreme_bullish';
    contrarySignal = 'sell';
    reasoning = `${Math.round(bullishPct)}% of influencers are bullish. Historically, extreme bullish consensus often precedes corrections. Consider taking profits or hedging.`;
  } else if (bullishPct < ANALYTICS_CONFIG.CONTRARIAN.EXTREME_BEARISH_THRESHOLD) {
    direction = 'extreme_bearish';
    contrarySignal = 'buy';
    reasoning = `Only ${Math.round(bullishPct)}% of influencers are bullish. Extreme bearish consensus often marks market bottoms. Consider accumulation.`;
  }
  
  // Historical context (would be populated from actual data)
  const historicalContext = {
    similarSituations: historicalData?.length || 0,
    averageOutcome: historicalData ? 
      historicalData.reduce((sum, d) => sum + d.outcome, 0) / historicalData.length : 0,
    winRate: historicalData ?
      (historicalData.filter(d => 
        (contrarySignal === 'buy' && d.outcome > 0) || 
        (contrarySignal === 'sell' && d.outcome < 0)
      ).length / historicalData.length) * 100 : 0,
  };
  
  return {
    timestamp: now,
    consensus: {
      bullishPercentage: Math.round(bullishPct),
      bearishPercentage: Math.round(bearishPct),
      neutralPercentage: Math.round(neutralPct),
      consensusStrength: Math.round(consensusStrength),
    },
    contrarian: {
      isExtreme,
      direction,
      contrarySignal,
      confidence: isExtreme ? Math.min(90, consensusStrength) : 0,
      reasoning,
    },
    historical: historicalContext,
  };
}

// ============================================================================
// PUMP & DUMP DETECTION
// ============================================================================

/**
 * Analyze posts for pump & dump patterns
 */
export function detectPumpDump(
  coin: string,
  recentPosts: InfluencerPost[],
  marketCap: number,
  priceChange24h: number,
  volumeChange24h: number
): PumpDumpAnalysis {
  const now = new Date();
  const coinPosts = recentPosts.filter(p => 
    p.analysis.mentionedCoins.includes(coin.toUpperCase())
  );
  
  // Evidence collection
  const evidence = {
    suddenInfluencerMentions: false,
    coordinatedTiming: false,
    lowCapCoin: marketCap < ANALYTICS_CONFIG.PUMP_DUMP.LOW_CAP_THRESHOLD,
    unusualEngagement: false,
    knownPumpAccounts: [] as string[],
    priceVolumeAnomaly: false,
  };
  
  // Check for sudden mention spike
  const recentMentions = coinPosts.filter(p => 
    now.getTime() - p.postedAt.getTime() < 24 * 60 * 60 * 1000
  ).length;
  const avgMentions = 2; // Would be calculated from historical data
  if (recentMentions > avgMentions * ANALYTICS_CONFIG.PUMP_DUMP.SUDDEN_MENTION_THRESHOLD) {
    evidence.suddenInfluencerMentions = true;
  }
  
  // Check for coordinated timing
  const postTimes = coinPosts.map(p => p.postedAt.getTime()).sort();
  let coordinatedCount = 0;
  for (let i = 1; i < postTimes.length; i++) {
    if (postTimes[i] - postTimes[i-1] < ANALYTICS_CONFIG.PUMP_DUMP.COORDINATION_WINDOW_MS) {
      coordinatedCount++;
    }
  }
  if (coordinatedCount >= 3) {
    evidence.coordinatedTiming = true;
  }
  
  // Check for unusual engagement
  const avgEngagement = coinPosts.reduce((sum, p) => 
    sum + p.engagement.likes + p.engagement.comments * 2 + p.engagement.shares * 3, 0
  ) / (coinPosts.length || 1);
  if (avgEngagement > 10000) {
    evidence.unusualEngagement = true;
  }
  
  // Check for known pump accounts
  for (const post of coinPosts) {
    if (KNOWN_PUMP_ACCOUNTS.has(post.influencer.id)) {
      evidence.knownPumpAccounts.push(post.influencer.name);
    }
  }
  
  // Check price/volume anomaly
  if (priceChange24h > 50 && volumeChange24h > 200) {
    evidence.priceVolumeAnomaly = true;
  }
  
  // Calculate confidence
  let confidence = 0;
  if (evidence.suddenInfluencerMentions) confidence += 25;
  if (evidence.coordinatedTiming) confidence += 30;
  if (evidence.lowCapCoin) confidence += 15;
  if (evidence.unusualEngagement) confidence += 10;
  if (evidence.knownPumpAccounts.length > 0) confidence += 20 * Math.min(evidence.knownPumpAccounts.length, 3);
  if (evidence.priceVolumeAnomaly) confidence += 20;
  
  confidence = Math.min(100, confidence);
  
  // Determine phase
  let phase: PumpDumpAnalysis['phase'] = 'none';
  if (confidence > 40) {
    if (priceChange24h < 10) phase = 'accumulation';
    else if (priceChange24h > 50) phase = 'pump';
    else if (priceChange24h > 20 && volumeChange24h < 50) phase = 'distribution';
    else if (priceChange24h < -20) phase = 'dump';
  }
  
  // Risk level
  let riskLevel: PumpDumpAnalysis['risk']['level'] = 'low';
  if (confidence > 80) riskLevel = 'critical';
  else if (confidence > 60) riskLevel = 'high';
  else if (confidence > 40) riskLevel = 'medium';
  
  // Involved influencers
  const involvedInfluencers = coinPosts.map(p => ({
    id: p.influencer.id,
    name: p.influencer.name,
    role: KNOWN_PUMP_ACCOUNTS.has(p.influencer.id) ? 'promoter' as const :
          p.influencer.tier === 'rising' ? 'amplifier' as const : 'organic' as const,
    suspicionScore: KNOWN_PUMP_ACCOUNTS.has(p.influencer.id) ? 90 :
                   p.influencer.credibilityScore < 50 ? 60 : 20,
  }));
  
  return {
    coin,
    timestamp: now,
    detected: confidence >= ANALYTICS_CONFIG.PUMP_DUMP.MIN_SUSPICION_SCORE,
    confidence,
    phase,
    evidence,
    risk: {
      level: riskLevel,
      estimatedPumpTarget: phase === 'accumulation' ? priceChange24h * 3 : undefined,
      estimatedDumpLevel: phase === 'pump' ? -50 : undefined,
      timeToAction: phase === 'pump' ? '1-6 hours' : undefined,
    },
    involvedInfluencers,
  };
}

// ============================================================================
// CROSS-INFLUENCER CONSENSUS
// ============================================================================

/**
 * Analyze consensus across influencers for a coin
 */
export function analyzeConsensus(
  coin: string,
  posts: InfluencerPost[],
  influencers: Influencer[]
): ConsensusAnalysis {
  const now = new Date();
  const coinPosts = posts.filter(p => 
    p.analysis.mentionedCoins.includes(coin.toUpperCase())
  );
  
  // Categorize by call type
  const breakdown = {
    strongBuy: [] as string[],
    buy: [] as string[],
    hold: [] as string[],
    sell: [] as string[],
    strongSell: [] as string[],
  };
  
  // Weighted scores by tier
  const tierScores: Record<InfluencerTier, number[]> = {
    legendary: [],
    elite: [],
    major: [],
    notable: [],
    rising: [],
  };
  
  // Institutional vs retail
  let institutionalScore = 0, institutionalCount = 0;
  let retailScore = 0, retailCount = 0;
  
  for (const post of coinPosts) {
    const sentiment = post.analysis.sentiment.sentiment.score;
    const call = post.analysis.callToAction;
    
    // Categorize
    if (sentiment > 0.5 || call === 'buy') {
      if (sentiment > 0.7) breakdown.strongBuy.push(post.influencer.id);
      else breakdown.buy.push(post.influencer.id);
    } else if (sentiment < -0.5 || call === 'sell') {
      if (sentiment < -0.7) breakdown.strongSell.push(post.influencer.id);
      else breakdown.sell.push(post.influencer.id);
    } else {
      breakdown.hold.push(post.influencer.id);
    }
    
    // Tier scores
    tierScores[post.influencer.tier].push(sentiment);
    
    // Institutional vs retail
    if (post.influencer.isInstitutional) {
      institutionalScore += sentiment;
      institutionalCount++;
    } else {
      retailScore += sentiment;
      retailCount++;
    }
  }
  
  // Calculate weighted consensus
  let totalWeight = 0;
  let weightedSum = 0;
  
  for (const [tier, scores] of Object.entries(tierScores)) {
    const weight = ANALYTICS_CONFIG.TIER_CONSENSUS_WEIGHTS[tier as InfluencerTier];
    for (const score of scores) {
      weightedSum += score * weight;
      totalWeight += weight;
    }
  }
  
  const weightedScore = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
  
  // Label
  let label: ConsensusAnalysis['weighted']['label'];
  if (weightedScore > 60) label = 'strong_buy';
  else if (weightedScore > 20) label = 'buy';
  else if (weightedScore > -20) label = 'hold';
  else if (weightedScore > -60) label = 'sell';
  else label = 'strong_sell';
  
  // Tier consensus averages
  const calcTierAvg = (scores: number[]) => 
    scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length * 100 : 0;
  
  // Divergence detection
  const legendaryAvg = calcTierAvg(tierScores.legendary);
  const retailAvg = calcTierAvg([...tierScores.notable, ...tierScores.rising]);
  const hasDivergence = Math.abs(legendaryAvg - retailAvg) > 40;
  
  // Smart money vs retail
  const smartMoneySignal = institutionalCount > 0 ? (institutionalScore / institutionalCount) * 100 : 0;
  const retailSignal = retailCount > 0 ? (retailScore / retailCount) * 100 : 0;
  const smartRetailDivergence = smartMoneySignal - retailSignal;
  
  let interpretation = 'Smart money and retail are aligned.';
  if (smartRetailDivergence > 30) {
    interpretation = 'Smart money is significantly more bullish than retail. Potential accumulation phase.';
  } else if (smartRetailDivergence < -30) {
    interpretation = 'Retail is more bullish than smart money. Potential distribution phase - exercise caution.';
  }
  
  return {
    coin,
    timestamp: now,
    breakdown,
    weighted: {
      score: Math.round(weightedScore),
      label,
      confidence: Math.min(100, coinPosts.length * 10),
      legendaryConsensus: Math.round(calcTierAvg(tierScores.legendary)),
      eliteConsensus: Math.round(calcTierAvg(tierScores.elite)),
      majorConsensus: Math.round(calcTierAvg(tierScores.major)),
      notableConsensus: Math.round(calcTierAvg(tierScores.notable)),
      risingConsensus: Math.round(calcTierAvg(tierScores.rising)),
    },
    divergence: {
      hasDivergence,
      type: hasDivergence ? 'tier_divergence' : undefined,
      description: hasDivergence ? 
        `Legendary tier (${Math.round(legendaryAvg)}) diverges from rising tier (${Math.round(retailAvg)})` : undefined,
      significance: Math.abs(legendaryAvg - retailAvg),
    },
    smartVsRetail: {
      smartMoneySignal: Math.round(smartMoneySignal),
      retailSignal: Math.round(retailSignal),
      divergence: Math.round(smartRetailDivergence),
      interpretation,
    },
  };
}

// ============================================================================
// INFLUENCE DECAY & CREDIBILITY ADJUSTMENT
// ============================================================================

/**
 * Calculate influence decay for an influencer
 */
export function calculateInfluenceDecay(
  influencer: Influencer,
  recentPosts: InfluencerPost[]
): InfluenceDecay {
  const stats = getInfluencerAccuracyStats(influencer.id);
  const adjustments = credibilityHistory.get(influencer.id) || [];
  
  // Recent accuracy (last 30 days)
  const recentAccuracy = stats.byTimeframe.long.accuracy;
  
  // Engagement trend
  const recentEngagement = recentPosts
    .filter(p => p.influencer.id === influencer.id)
    .slice(0, 10);
  const avgEngagement = recentEngagement.length > 0 ?
    recentEngagement.reduce((sum, p) => 
      sum + p.engagement.likes + p.engagement.comments + p.engagement.shares, 0
    ) / recentEngagement.length : 0;
  const engagementTrend = avgEngagement > 1000 ? 10 : avgEngagement > 100 ? 0 : -10;
  
  // Inactivity penalty
  const lastPost = recentPosts.find(p => p.influencer.id === influencer.id);
  const daysSinceLastPost = lastPost ? 
    (Date.now() - lastPost.postedAt.getTime()) / (24 * 60 * 60 * 1000) : 30;
  const inactivityPenalty = daysSinceLastPost > ANALYTICS_CONFIG.DECAY.INACTIVITY_DAYS_THRESHOLD ?
    Math.min(ANALYTICS_CONFIG.DECAY.MAX_INACTIVITY_PENALTY, 
      (daysSinceLastPost - ANALYTICS_CONFIG.DECAY.INACTIVITY_DAYS_THRESHOLD) * 2) : 0;
  
  // Controversy penalty (would be tracked from flags)
  const controversyPenalty = 0;
  
  // Calculate effective scores
  let credibilityDelta = 0;
  
  // Accuracy bonus/penalty
  if (recentAccuracy > 70) credibilityDelta += 5;
  else if (recentAccuracy < 40) credibilityDelta -= 10;
  
  // Engagement trend
  credibilityDelta += engagementTrend / 2;
  
  // Penalties
  credibilityDelta -= inactivityPenalty;
  credibilityDelta -= controversyPenalty;
  
  const effectiveCredibility = Math.max(0, Math.min(100, 
    influencer.credibilityScore + credibilityDelta
  ));
  
  const effectiveImpact = Math.max(0, Math.min(100,
    influencer.marketImpactScore * (effectiveCredibility / influencer.credibilityScore)
  ));
  
  // Trend direction
  let trendDirection: InfluenceDecay['current']['trendDirection'] = 'stable';
  if (credibilityDelta > 3) trendDirection = 'rising';
  else if (credibilityDelta < -3) trendDirection = 'falling';
  
  return {
    influencerId: influencer.id,
    current: {
      effectiveCredibility: Math.round(effectiveCredibility),
      effectiveImpact: Math.round(effectiveImpact),
      trendDirection,
    },
    factors: {
      recentAccuracy,
      engagementTrend,
      followerGrowth: 0, // Would be tracked
      controversyPenalty,
      inactivityPenalty: Math.round(inactivityPenalty),
    },
    adjustments: {
      originalCredibility: influencer.credibilityScore,
      credibilityDelta: Math.round(credibilityDelta),
      reason: generateDecayReason(credibilityDelta, recentAccuracy, inactivityPenalty),
    },
  };
}

function generateDecayReason(delta: number, accuracy: number, inactivity: number): string {
  const reasons: string[] = [];
  
  if (accuracy > 70) reasons.push('strong recent accuracy');
  else if (accuracy < 40) reasons.push('poor recent accuracy');
  
  if (inactivity > 5) reasons.push('reduced activity');
  
  if (reasons.length === 0) return 'No significant changes';
  
  const direction = delta > 0 ? 'Increased' : delta < 0 ? 'Decreased' : 'Stable';
  return `${direction} due to ${reasons.join(', ')}`;
}

/**
 * Adjust credibility from call outcome
 */
function adjustCredibilityFromCall(influencerId: string, wasCorrect: boolean): void {
  const adjustment: CredibilityAdjustment = {
    influencerId,
    timestamp: new Date(),
    adjustment: {
      previousScore: 0, // Would fetch from DB
      newScore: 0,
      delta: wasCorrect ? 
        ANALYTICS_CONFIG.DECAY.CORRECT_CALL_BONUS : 
        ANALYTICS_CONFIG.DECAY.WRONG_CALL_PENALTY,
      reason: wasCorrect ? 'Correct market call' : 'Incorrect market call',
    },
    trigger: {
      type: wasCorrect ? 'correct_call' : 'wrong_call',
      details: `Call evaluation completed`,
    },
  };
  
  const existing = credibilityHistory.get(influencerId) || [];
  existing.push(adjustment);
  credibilityHistory.set(influencerId, existing);
}

// ============================================================================
// ADVANCED AI CONTEXT FORMATTING
// ============================================================================

/**
 * Format advanced analytics for AI context
 */
export function formatAdvancedAnalyticsForAI(
  contrarian: ContrarianAnalysis | null,
  pumpDump: PumpDumpAnalysis | null,
  consensus: ConsensusAnalysis | null
): string {
  let context = '\n[🔬 ADVANCED INFLUENCER ANALYTICS]\n';
  
  // Contrarian indicator
  if (contrarian && contrarian.contrarian.isExtreme) {
    context += `\n⚠️ CONTRARIAN SIGNAL DETECTED:\n`;
    context += `• Consensus: ${contrarian.consensus.bullishPercentage}% bullish, ${contrarian.consensus.bearishPercentage}% bearish\n`;
    context += `• Signal: ${contrarian.contrarian.contrarySignal.toUpperCase()} (${contrarian.contrarian.confidence}% confidence)\n`;
    context += `• Reasoning: ${contrarian.contrarian.reasoning}\n`;
    if (contrarian.historical.similarSituations > 0) {
      context += `• Historical: ${contrarian.historical.similarSituations} similar situations, ${Math.round(contrarian.historical.winRate)}% win rate\n`;
    }
  }
  
  // Pump & dump warning
  if (pumpDump && pumpDump.detected) {
    context += `\n🚨 PUMP & DUMP WARNING (${pumpDump.coin}):\n`;
    context += `• Risk Level: ${pumpDump.risk.level.toUpperCase()}\n`;
    context += `• Confidence: ${pumpDump.confidence}%\n`;
    context += `• Phase: ${pumpDump.phase}\n`;
    context += `• Evidence:\n`;
    if (pumpDump.evidence.suddenInfluencerMentions) context += `  - Sudden spike in influencer mentions\n`;
    if (pumpDump.evidence.coordinatedTiming) context += `  - Coordinated posting timing detected\n`;
    if (pumpDump.evidence.lowCapCoin) context += `  - Low market cap (high manipulation risk)\n`;
    if (pumpDump.evidence.priceVolumeAnomaly) context += `  - Abnormal price/volume movement\n`;
    if (pumpDump.involvedInfluencers.length > 0) {
      const suspicious = pumpDump.involvedInfluencers.filter(i => i.suspicionScore > 50);
      if (suspicious.length > 0) {
        context += `• Suspicious accounts: ${suspicious.map(i => i.name).join(', ')}\n`;
      }
    }
    context += `⚠️ RECOMMENDATION: Exercise extreme caution. Do not FOMO.\n`;
  }
  
  // Consensus analysis
  if (consensus) {
    context += `\n📊 INFLUENCER CONSENSUS (${consensus.coin}):\n`;
    context += `• Weighted Signal: ${consensus.weighted.label.toUpperCase()} (${consensus.weighted.score > 0 ? '+' : ''}${consensus.weighted.score})\n`;
    context += `• Tier Breakdown:\n`;
    context += `  - Legendary: ${consensus.weighted.legendaryConsensus > 0 ? '+' : ''}${consensus.weighted.legendaryConsensus}\n`;
    context += `  - Elite: ${consensus.weighted.eliteConsensus > 0 ? '+' : ''}${consensus.weighted.eliteConsensus}\n`;
    context += `  - Major: ${consensus.weighted.majorConsensus > 0 ? '+' : ''}${consensus.weighted.majorConsensus}\n`;
    
    if (consensus.divergence.hasDivergence) {
      context += `\n⚡ DIVERGENCE DETECTED:\n`;
      context += `• ${consensus.divergence.description}\n`;
    }
    
    context += `\n💰 SMART MONEY vs RETAIL:\n`;
    context += `• Smart Money: ${consensus.smartVsRetail.smartMoneySignal > 0 ? '+' : ''}${consensus.smartVsRetail.smartMoneySignal}\n`;
    context += `• Retail: ${consensus.smartVsRetail.retailSignal > 0 ? '+' : ''}${consensus.smartVsRetail.retailSignal}\n`;
    context += `• ${consensus.smartVsRetail.interpretation}\n`;
  }
  
  return context;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const influencerAnalytics = {
  // Call tracking
  recordCall: recordInfluencerCall,
  evaluateCall: evaluateCallAccuracy,
  getAccuracyStats: getInfluencerAccuracyStats,
  
  // Analysis
  analyzeContrarian: analyzeContrarianIndicator,
  detectPumpDump,
  analyzeConsensus,
  calculateDecay: calculateInfluenceDecay,
  
  // Formatting
  formatForAI: formatAdvancedAnalyticsForAI,
};

export default influencerAnalytics;

