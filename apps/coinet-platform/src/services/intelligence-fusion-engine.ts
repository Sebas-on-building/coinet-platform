/**
 * 🧠 INTELLIGENCE FUSION ENGINE v1.0
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * The "Brain" that combines all intelligence layers into actionable insights
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ARCHITECTURE: 4 ENGINES → 3 CORE QUESTIONS
 * 
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                    COINET INTELLIGENCE ARCHITECTURE                     │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │                                                                         │
 * │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
 * │  │  MARKET ENGINE  │  │ SENTIMENT ENGINE│  │  TRADER ENGINE  │         │
 * │  │                 │  │                 │  │                 │         │
 * │  │  • Prices       │  │  • News         │  │  • User Profile │         │
 * │  │  • Derivatives  │  │  • Social       │  │  • Behavior     │         │
 * │  │  • Whales       │  │  • Influencers  │  │  • Decision     │         │
 * │  │  • Liquidations │  │  • FUD/FOMO     │  │    Patterns     │         │
 * │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘         │
 * │           │                    │                    │                  │
 * │           └────────────────────┼────────────────────┘                  │
 * │                                ▼                                       │
 * │                    ┌───────────────────────┐                           │
 * │                    │    FUSION ENGINE      │                           │
 * │                    │                       │                           │
 * │                    │  • Regime Detection   │                           │
 * │                    │  • Risk Stance        │                           │
 * │                    │  • Action Layer       │                           │
 * │                    └───────────┬───────────┘                           │
 * │                                │                                       │
 * │                                ▼                                       │
 * │              ┌─────────────────────────────────┐                       │
 * │              │      3 CORE USER QUESTIONS      │                       │
 * │              ├─────────────────────────────────┤                       │
 * │              │ 1. What is the market doing?    │                       │
 * │              │ 2. What are others doing?       │                       │
 * │              │ 3. What am I doing wrong/right? │                       │
 * │              └─────────────────────────────────┘                       │
 * │                                                                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 * 
 * @module intelligence-fusion-engine
 * @version 1.0.0
 */

import { logger } from '../utils/logger';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export type MarketRegime = 
  | 'RISK_ON_EUPHORIA'    // Extreme greed, max leverage
  | 'RISK_ON_BULLISH'     // Strong uptrend, positive sentiment
  | 'NEUTRAL_CONSOLIDATION' // Sideways, mixed signals
  | 'RISK_OFF_CAUTIOUS'   // Weak, increasing fear
  | 'RISK_OFF_FEAR'       // Strong fear, derisking
  | 'CAPITULATION'        // Extreme fear, potential bottom
  | 'RECOVERY'            // Post-fear bounce

export type RiskStance = 
  | 'AGGRESSIVE'          // Max position sizes, trend following
  | 'MODERATE'            // Normal sizing, balanced approach
  | 'DEFENSIVE'           // Reduced exposure, tight stops
  | 'CASH_HEAVY'          // Minimal exposure, waiting

export type DecisionGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface MarketEngineOutput {
  prices: {
    btc: number;
    change24h: number;
    change7d: number;
    volatility: number;
  };
  derivatives: {
    fundingRate: number;
    openInterest: number;
    liquidations24h: number;
    longShortRatio: number;
  };
  whales: {
    netFlow: 'accumulating' | 'distributing' | 'neutral';
    largeTransactions24h: number;
  };
  regime: MarketRegime;
  confidence: number;
}

export interface SentimentEngineOutput {
  composite: {
    score: number;          // 0-100
    label: string;
  };
  news: {
    sentiment: number;      // -1 to 1
    impact: 'low' | 'medium' | 'high' | 'critical';
    topNarratives: string[];
  };
  social: {
    twitter: number;        // -1 to 1
    reddit: number;
    telegram: number;
    aggregated: number;
  };
  influencers: {
    bullishPercent: number;
    bearishPercent: number;
    keyAlerts: string[];
  };
  fudFomo: {
    fudIndex: number;       // 0-100
    fomoIndex: number;      // 0-100
    dominant: 'FUD' | 'FOMO' | 'BALANCED';
  };
  herding: {
    strength: number;       // 0-100
    direction: 'bullish' | 'bearish' | 'mixed';
    contrarian: boolean;    // True if extreme = contrarian opportunity
  };
}

export interface TraderEngineOutput {
  profile: {
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
    tradingStyle: string;
    portfolioSize: number;
  };
  behavior: {
    // Neuroeconomics-informed pattern analysis
    lossAversion: {
      score: number;        // 0-100 (higher = more loss averse)
      evidence: string[];
    };
    fomo: {
      score: number;
      evidence: string[];
    };
    overconfidence: {
      score: number;
      evidence: string[];
    };
    rewardRiskProfile: {
      // Patterns consistent with temporal discounting research
      preferenceForImmediate: number;  // 0-100
      patienceScore: number;           // 0-100
    };
  };
  decisionGrade: {
    grade: DecisionGrade;
    score: number;          // 0-100
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  cognitiveState: {
    system: 1 | 2;          // System 1 (fast/emotional) vs System 2 (slow/rational)
    capacity: number;       // 0-100 (ability to make good decisions now)
    fatigue: number;        // 0-100
    optimalForTrading: boolean;
  };
}

export interface FusionEngineOutput {
  timestamp: string;
  
  // The 3 Core User Questions
  coreAnswers: {
    whatIsMarketDoing: {
      regime: MarketRegime;
      summary: string;
      keyMetrics: Record<string, string>;
    };
    whatAreOthersDoing: {
      herding: string;
      sentiment: string;
      whales: string;
      influencers: string;
    };
    whatAmIDoingWrongOrRight: {
      grade: DecisionGrade;
      score: number;
      positives: string[];
      negatives: string[];
      coaching: string;
    };
  };
  
  // Engine outputs
  market: MarketEngineOutput;
  sentiment: SentimentEngineOutput;
  trader: TraderEngineOutput;
  
  // Fusion results
  fusion: {
    regime: MarketRegime;
    regimeConfidence: number;
    riskStance: RiskStance;
    riskStanceReasoning: string;
    
    // Action recommendations
    actions: {
      primary: string;
      secondary: string[];
      avoid: string[];
    };
    
    // Alerts (prioritized)
    alerts: Array<{
      type: 'DANGER' | 'WARNING' | 'OPPORTUNITY' | 'INFO';
      title: string;
      description: string;
      urgency: 'critical' | 'high' | 'medium' | 'low';
    }>;
    
    // Narratives to watch
    narratives: string[];
  };
  
  // Confidence & data quality
  confidence: {
    overall: number;
    marketEngine: number;
    sentimentEngine: number;
    traderEngine: number;
  };
  
  computeTime: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// REGIME DETECTION
// ═══════════════════════════════════════════════════════════════════════════

function detectRegime(
  fearGreedIndex: number,
  priceChange7d: number,
  fundingRate: number,
  socialSentiment: number,
  volatility: number
): { regime: MarketRegime; confidence: number } {
  
  // Scoring matrix
  let scores: Record<MarketRegime, number> = {
    RISK_ON_EUPHORIA: 0,
    RISK_ON_BULLISH: 0,
    NEUTRAL_CONSOLIDATION: 0,
    RISK_OFF_CAUTIOUS: 0,
    RISK_OFF_FEAR: 0,
    CAPITULATION: 0,
    RECOVERY: 0,
  };
  
  // Fear & Greed contribution
  if (fearGreedIndex > 80) scores.RISK_ON_EUPHORIA += 3;
  else if (fearGreedIndex > 65) scores.RISK_ON_BULLISH += 3;
  else if (fearGreedIndex > 45) scores.NEUTRAL_CONSOLIDATION += 2;
  else if (fearGreedIndex > 30) scores.RISK_OFF_CAUTIOUS += 3;
  else if (fearGreedIndex > 15) scores.RISK_OFF_FEAR += 3;
  else scores.CAPITULATION += 3;
  
  // Price momentum contribution
  if (priceChange7d > 0.15) {
    scores.RISK_ON_EUPHORIA += 2;
    scores.RISK_ON_BULLISH += 1;
  } else if (priceChange7d > 0.05) {
    scores.RISK_ON_BULLISH += 2;
    scores.RECOVERY += 1;
  } else if (priceChange7d > -0.05) {
    scores.NEUTRAL_CONSOLIDATION += 2;
  } else if (priceChange7d > -0.15) {
    scores.RISK_OFF_CAUTIOUS += 2;
  } else {
    scores.RISK_OFF_FEAR += 2;
    scores.CAPITULATION += 1;
  }
  
  // Funding rate (leverage sentiment)
  if (fundingRate > 0.03) scores.RISK_ON_EUPHORIA += 2;
  else if (fundingRate > 0.01) scores.RISK_ON_BULLISH += 1;
  else if (fundingRate < -0.01) scores.RISK_OFF_FEAR += 1;
  else if (fundingRate < -0.03) scores.CAPITULATION += 2;
  
  // Social sentiment
  if (socialSentiment > 0.5) scores.RISK_ON_BULLISH += 1;
  else if (socialSentiment < -0.5) scores.RISK_OFF_FEAR += 1;
  
  // Recovery detection (fear + positive momentum)
  if (fearGreedIndex < 40 && priceChange7d > 0.05) {
    scores.RECOVERY += 3;
  }
  
  // Find winner
  const sortedRegimes = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const winningRegime = sortedRegimes[0][0] as MarketRegime;
  const winningScore = sortedRegimes[0][1];
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  
  const confidence = totalScore > 0 ? Math.round((winningScore / totalScore) * 100) : 50;
  
  return { regime: winningRegime, confidence };
}

// ═══════════════════════════════════════════════════════════════════════════
// RISK STANCE CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

function calculateRiskStance(
  regime: MarketRegime,
  volatility: number,
  decisionGrade: DecisionGrade,
  cognitiveCapacity: number
): { stance: RiskStance; reasoning: string } {
  
  // Base stance from regime
  let baseStance: RiskStance;
  switch (regime) {
    case 'RISK_ON_EUPHORIA':
      baseStance = 'DEFENSIVE'; // Contrarian!
      break;
    case 'RISK_ON_BULLISH':
      baseStance = 'AGGRESSIVE';
      break;
    case 'NEUTRAL_CONSOLIDATION':
      baseStance = 'MODERATE';
      break;
    case 'RISK_OFF_CAUTIOUS':
      baseStance = 'DEFENSIVE';
      break;
    case 'RISK_OFF_FEAR':
      baseStance = 'CASH_HEAVY';
      break;
    case 'CAPITULATION':
      baseStance = 'MODERATE'; // Contrarian opportunity
      break;
    case 'RECOVERY':
      baseStance = 'MODERATE';
      break;
  }
  
  // Adjust for decision quality
  if (decisionGrade === 'D' || decisionGrade === 'F') {
    // Downgrade risk if decision-making is impaired
    if (baseStance === 'AGGRESSIVE') baseStance = 'MODERATE';
    else if (baseStance === 'MODERATE') baseStance = 'DEFENSIVE';
  }
  
  // Adjust for cognitive capacity
  if (cognitiveCapacity < 50) {
    if (baseStance === 'AGGRESSIVE') baseStance = 'MODERATE';
    else if (baseStance === 'MODERATE') baseStance = 'DEFENSIVE';
  }
  
  // Generate reasoning
  let reasoning: string;
  switch (baseStance) {
    case 'AGGRESSIVE':
      reasoning = 'Conditions favor risk-taking. Trend alignment + good decision quality.';
      break;
    case 'MODERATE':
      reasoning = 'Balanced approach recommended. Mixed signals or transitional regime.';
      break;
    case 'DEFENSIVE':
      reasoning = 'Reduce exposure. Either euphoric top risk or deteriorating conditions.';
      break;
    case 'CASH_HEAVY':
      reasoning = 'Preserve capital. High fear environment or impaired decision-making.';
      break;
  }
  
  return { stance: baseStance, reasoning };
}

// ═══════════════════════════════════════════════════════════════════════════
// CORE QUESTION ANSWERERS
// ═══════════════════════════════════════════════════════════════════════════

function answerWhatIsMarketDoing(
  market: MarketEngineOutput
): FusionEngineOutput['coreAnswers']['whatIsMarketDoing'] {
  
  const regimeDescriptions: Record<MarketRegime, string> = {
    RISK_ON_EUPHORIA: 'Extreme greed. Market overheated. High leverage. Historically precedes corrections.',
    RISK_ON_BULLISH: 'Strong uptrend with positive sentiment. Good conditions for trend-following.',
    NEUTRAL_CONSOLIDATION: 'Sideways movement. Mixed signals. Wait for directional clarity.',
    RISK_OFF_CAUTIOUS: 'Weakening trend. Fear increasing. Consider reducing exposure.',
    RISK_OFF_FEAR: 'Active selling pressure. High fear. Protect capital.',
    CAPITULATION: 'Extreme fear and surrender. Historically marks bottoms. Contrarian opportunity.',
    RECOVERY: 'Bouncing from fear. Early signs of trend reversal. Cautious optimism.',
  };
  
  return {
    regime: market.regime,
    summary: regimeDescriptions[market.regime],
    keyMetrics: {
      'BTC Price': `$${market.prices.btc.toLocaleString()}`,
      '24h Change': `${(market.prices.change24h * 100).toFixed(1)}%`,
      '7d Change': `${(market.prices.change7d * 100).toFixed(1)}%`,
      'Volatility': `${(market.prices.volatility * 100).toFixed(0)}%`,
      'Funding Rate': `${(market.derivatives.fundingRate * 100).toFixed(3)}%`,
      'Liquidations 24h': `$${(market.derivatives.liquidations24h / 1e6).toFixed(0)}M`,
    },
  };
}

function answerWhatAreOthersDoing(
  sentiment: SentimentEngineOutput
): FusionEngineOutput['coreAnswers']['whatAreOthersDoing'] {
  
  const herdingDesc = sentiment.herding.strength > 70
    ? `Strong ${sentiment.herding.direction} herding (${sentiment.herding.strength}%). ${sentiment.herding.contrarian ? 'CONTRARIAN ALERT: Extreme consensus often wrong.' : ''}`
    : sentiment.herding.strength > 40
      ? `Moderate ${sentiment.herding.direction} bias. Crowd leaning but not extreme.`
      : 'Mixed sentiment. No strong herd direction.';
  
  const sentimentDesc = sentiment.composite.score > 70
    ? `Greedy (${sentiment.composite.score}/100). "${sentiment.composite.label}"`
    : sentiment.composite.score > 30
      ? `Neutral (${sentiment.composite.score}/100). "${sentiment.composite.label}"`
      : `Fearful (${sentiment.composite.score}/100). "${sentiment.composite.label}"`;
  
  const whalesDesc = sentiment.social.aggregated > 0.3
    ? 'Whales appear to be accumulating. Smart money bullish signals.'
    : sentiment.social.aggregated < -0.3
      ? 'Whales appear to be distributing. Smart money reducing exposure.'
      : 'Whale activity neutral. No strong directional signal.';
  
  const influencerDesc = sentiment.influencers.bullishPercent > 70
    ? `${sentiment.influencers.bullishPercent}% of tracked influencers bullish. High consensus.`
    : sentiment.influencers.bearishPercent > 70
      ? `${sentiment.influencers.bearishPercent}% of tracked influencers bearish. High consensus.`
      : 'Influencer sentiment mixed. No strong consensus.';
  
  return {
    herding: herdingDesc,
    sentiment: sentimentDesc,
    whales: whalesDesc,
    influencers: influencerDesc,
  };
}

function answerWhatAmIDoingWrongOrRight(
  trader: TraderEngineOutput
): FusionEngineOutput['coreAnswers']['whatAmIDoingWrongOrRight'] {
  
  const gradeDescriptions: Record<DecisionGrade, string> = {
    A: 'Excellent decision-making. Clear thinking, disciplined approach.',
    B: 'Good decision-making. Minor areas for improvement.',
    C: 'Average. Some biases affecting judgment. Room for improvement.',
    D: 'Below average. Significant biases or fatigue impacting decisions.',
    F: 'Poor decision state. Strong recommendation to avoid trading.',
  };
  
  return {
    grade: trader.decisionGrade.grade,
    score: trader.decisionGrade.score,
    positives: trader.decisionGrade.strengths,
    negatives: trader.decisionGrade.weaknesses,
    coaching: gradeDescriptions[trader.decisionGrade.grade] + ' ' + 
              (trader.decisionGrade.recommendations[0] || ''),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUSION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

export interface FusionInput {
  // From Market Engine
  currentPrice: number;
  priceChange24h: number;
  priceChange7d: number;
  volatility: number;
  fundingRate: number;
  openInterest: number;
  liquidations24h: number;
  longShortRatio: number;
  whaleNetFlow: 'accumulating' | 'distributing' | 'neutral';
  
  // From Sentiment Engine
  fearGreedIndex: number;
  newsSentiment: number;
  newsImpact: 'low' | 'medium' | 'high' | 'critical';
  topNarratives: string[];
  socialSentiment: number;
  influencerBullish: number;
  influencerBearish: number;
  influencerAlerts: string[];
  fudIndex: number;
  fomoIndex: number;
  herdStrength: number;
  herdDirection: 'bullish' | 'bearish' | 'mixed';
  
  // From Trader Engine
  userRiskTolerance: 'conservative' | 'moderate' | 'aggressive';
  userTradingStyle: string;
  portfolioSize: number;
  lossAversionScore: number;
  lossAversionEvidence: string[];
  fomoScore: number;
  fomoEvidence: string[];
  overconfidenceScore: number;
  overconfidenceEvidence: string[];
  preferenceForImmediate: number;
  patienceScore: number;
  decisionGrade: DecisionGrade;
  decisionScore: number;
  decisionStrengths: string[];
  decisionWeaknesses: string[];
  decisionRecommendations: string[];
  systemDominant: 1 | 2;
  cognitiveCapacity: number;
  fatigue: number;
}

export async function calculateFusionIntelligence(
  input: FusionInput
): Promise<FusionEngineOutput> {
  const startTime = Date.now();
  
  logger.info('🧠 Calculating Fusion Intelligence...');
  
  // Build Market Engine output
  const market: MarketEngineOutput = {
    prices: {
      btc: input.currentPrice,
      change24h: input.priceChange24h,
      change7d: input.priceChange7d,
      volatility: input.volatility,
    },
    derivatives: {
      fundingRate: input.fundingRate,
      openInterest: input.openInterest,
      liquidations24h: input.liquidations24h,
      longShortRatio: input.longShortRatio,
    },
    whales: {
      netFlow: input.whaleNetFlow,
      largeTransactions24h: 0, // Would come from whale service
    },
    regime: 'NEUTRAL_CONSOLIDATION', // Will be set below
    confidence: 0,
  };
  
  // Detect regime
  const { regime, confidence: regimeConfidence } = detectRegime(
    input.fearGreedIndex,
    input.priceChange7d,
    input.fundingRate,
    input.socialSentiment,
    input.volatility
  );
  market.regime = regime;
  market.confidence = regimeConfidence;
  
  // Build Sentiment Engine output
  const sentiment: SentimentEngineOutput = {
    composite: {
      score: input.fearGreedIndex,
      label: input.fearGreedIndex > 70 ? 'Greed' : input.fearGreedIndex > 30 ? 'Neutral' : 'Fear',
    },
    news: {
      sentiment: input.newsSentiment,
      impact: input.newsImpact,
      topNarratives: input.topNarratives,
    },
    social: {
      twitter: input.socialSentiment,
      reddit: input.socialSentiment * 0.9,
      telegram: input.socialSentiment * 1.1,
      aggregated: input.socialSentiment,
    },
    influencers: {
      bullishPercent: input.influencerBullish,
      bearishPercent: input.influencerBearish,
      keyAlerts: input.influencerAlerts,
    },
    fudFomo: {
      fudIndex: input.fudIndex,
      fomoIndex: input.fomoIndex,
      dominant: input.fudIndex > input.fomoIndex + 20 ? 'FUD' : 
                input.fomoIndex > input.fudIndex + 20 ? 'FOMO' : 'BALANCED',
    },
    herding: {
      strength: input.herdStrength,
      direction: input.herdDirection,
      contrarian: input.herdStrength > 75,
    },
  };
  
  // Build Trader Engine output
  const trader: TraderEngineOutput = {
    profile: {
      riskTolerance: input.userRiskTolerance,
      tradingStyle: input.userTradingStyle,
      portfolioSize: input.portfolioSize,
    },
    behavior: {
      lossAversion: {
        score: input.lossAversionScore,
        evidence: input.lossAversionEvidence,
      },
      fomo: {
        score: input.fomoScore,
        evidence: input.fomoEvidence,
      },
      overconfidence: {
        score: input.overconfidenceScore,
        evidence: input.overconfidenceEvidence,
      },
      rewardRiskProfile: {
        preferenceForImmediate: input.preferenceForImmediate,
        patienceScore: input.patienceScore,
      },
    },
    decisionGrade: {
      grade: input.decisionGrade,
      score: input.decisionScore,
      strengths: input.decisionStrengths,
      weaknesses: input.decisionWeaknesses,
      recommendations: input.decisionRecommendations,
    },
    cognitiveState: {
      system: input.systemDominant,
      capacity: input.cognitiveCapacity,
      fatigue: input.fatigue,
      optimalForTrading: input.cognitiveCapacity > 50 && input.fatigue < 60,
    },
  };
  
  // Calculate risk stance
  const { stance: riskStance, reasoning: riskStanceReasoning } = calculateRiskStance(
    regime,
    input.volatility,
    input.decisionGrade,
    input.cognitiveCapacity
  );
  
  // Generate alerts
  const alerts: FusionEngineOutput['fusion']['alerts'] = [];
  
  if (regime === 'RISK_ON_EUPHORIA') {
    alerts.push({
      type: 'DANGER',
      title: '🚨 EUPHORIA DETECTED',
      description: 'Market at extreme greed. Historically precedes corrections.',
      urgency: 'critical',
    });
  }
  
  if (regime === 'CAPITULATION') {
    alerts.push({
      type: 'OPPORTUNITY',
      title: '💎 CAPITULATION - Contrarian Opportunity',
      description: 'Extreme fear often marks bottoms. Consider accumulating.',
      urgency: 'high',
    });
  }
  
  if (input.decisionGrade === 'D' || input.decisionGrade === 'F') {
    alerts.push({
      type: 'WARNING',
      title: '⚠️ Decision Quality Impaired',
      description: `Grade ${input.decisionGrade}. ${input.decisionRecommendations[0] || 'Avoid major decisions.'}`,
      urgency: 'high',
    });
  }
  
  if (sentiment.herding.contrarian) {
    alerts.push({
      type: 'INFO',
      title: '🐑 Extreme Consensus - Contrarian Signal',
      description: `${input.herdStrength}% ${input.herdDirection} consensus. Often wrong at extremes.`,
      urgency: 'medium',
    });
  }
  
  if (input.fomoScore > 70) {
    alerts.push({
      type: 'WARNING',
      title: '🚀 FOMO Detected in Your Behavior',
      description: 'Chasing momentum. Consider waiting for pullback.',
      urgency: 'medium',
    });
  }
  
  // Generate action recommendations
  const actions = {
    primary: '',
    secondary: [] as string[],
    avoid: [] as string[],
  };
  
  switch (riskStance) {
    case 'AGGRESSIVE':
      actions.primary = 'Trend-following entries with normal position sizing';
      actions.secondary = ['Add on pullbacks', 'Trail stops to lock profits'];
      actions.avoid = ['Counter-trend trades', 'Over-leveraging'];
      break;
    case 'MODERATE':
      actions.primary = 'Selective entries with reduced position sizing';
      actions.secondary = ['Wait for high-conviction setups', 'Scale into positions'];
      actions.avoid = ['Large single entries', 'Chasing momentum'];
      break;
    case 'DEFENSIVE':
      actions.primary = 'Reduce exposure, tighten stops';
      actions.secondary = ['Take partial profits', 'Hedge existing positions'];
      actions.avoid = ['New long entries', 'Increasing leverage'];
      break;
    case 'CASH_HEAVY':
      actions.primary = 'Preserve capital, minimal trading';
      actions.secondary = ['Close high-risk positions', 'Wait for clarity'];
      actions.avoid = ['Any new positions', 'All trading until conditions improve'];
      break;
  }
  
  // Build core answers
  const coreAnswers = {
    whatIsMarketDoing: answerWhatIsMarketDoing(market),
    whatAreOthersDoing: answerWhatAreOthersDoing(sentiment),
    whatAmIDoingWrongOrRight: answerWhatAmIDoingWrongOrRight(trader),
  };
  
  // Calculate confidence
  const confidence = {
    overall: Math.round((regimeConfidence + input.decisionScore + 70) / 3),
    marketEngine: regimeConfidence,
    sentimentEngine: 75, // Default
    traderEngine: input.decisionScore,
  };
  
  const computeTime = Date.now() - startTime;
  
  logger.info('🧠 Fusion Intelligence calculated', {
    regime,
    riskStance,
    decisionGrade: input.decisionGrade,
    alertCount: alerts.length,
    computeTime,
  });
  
  return {
    timestamp: new Date().toISOString(),
    coreAnswers,
    market,
    sentiment,
    trader,
    fusion: {
      regime,
      regimeConfidence,
      riskStance,
      riskStanceReasoning,
      actions,
      alerts,
      narratives: input.topNarratives,
    },
    confidence,
    computeTime,
  };
}

/**
 * Format Fusion Intelligence for AI chat context
 */
export function formatFusionForAI(output: FusionEngineOutput): string {
  let context = '\n[🧠 COINET INTELLIGENCE FUSION - The 3 Core Questions]\n';
  context += `${'═'.repeat(70)}\n`;
  
  // Question 1: What is the market doing?
  context += `\n❓ QUESTION 1: WHAT IS THE MARKET DOING?\n`;
  context += `${'─'.repeat(50)}\n`;
  context += `📊 REGIME: ${output.coreAnswers.whatIsMarketDoing.regime}\n`;
  context += `   ${output.coreAnswers.whatIsMarketDoing.summary}\n`;
  context += `   Key Metrics:\n`;
  for (const [key, value] of Object.entries(output.coreAnswers.whatIsMarketDoing.keyMetrics)) {
    context += `   • ${key}: ${value}\n`;
  }
  
  // Question 2: What are others doing?
  context += `\n❓ QUESTION 2: WHAT ARE OTHERS DOING?\n`;
  context += `${'─'.repeat(50)}\n`;
  context += `👥 Herding: ${output.coreAnswers.whatAreOthersDoing.herding}\n`;
  context += `📊 Sentiment: ${output.coreAnswers.whatAreOthersDoing.sentiment}\n`;
  context += `🐋 Whales: ${output.coreAnswers.whatAreOthersDoing.whales}\n`;
  context += `👤 Influencers: ${output.coreAnswers.whatAreOthersDoing.influencers}\n`;
  
  // Question 3: What am I doing wrong/right?
  context += `\n❓ QUESTION 3: WHAT AM I DOING WRONG/RIGHT?\n`;
  context += `${'─'.repeat(50)}\n`;
  context += `📊 Decision Grade: ${output.coreAnswers.whatAmIDoingWrongOrRight.grade} (${output.coreAnswers.whatAmIDoingWrongOrRight.score}/100)\n`;
  if (output.coreAnswers.whatAmIDoingWrongOrRight.positives.length > 0) {
    context += `✅ Strengths: ${output.coreAnswers.whatAmIDoingWrongOrRight.positives.join(', ')}\n`;
  }
  if (output.coreAnswers.whatAmIDoingWrongOrRight.negatives.length > 0) {
    context += `⚠️ Areas to improve: ${output.coreAnswers.whatAmIDoingWrongOrRight.negatives.join(', ')}\n`;
  }
  context += `💡 ${output.coreAnswers.whatAmIDoingWrongOrRight.coaching}\n`;
  
  // Fusion: Risk Stance
  context += `\n${'═'.repeat(70)}\n`;
  context += `🎯 RISK STANCE: ${output.fusion.riskStance}\n`;
  context += `   ${output.fusion.riskStanceReasoning}\n`;
  
  // Actions
  context += `\n📈 RECOMMENDED ACTION: ${output.fusion.actions.primary}\n`;
  if (output.fusion.actions.secondary.length > 0) {
    context += `   Also consider: ${output.fusion.actions.secondary.join(', ')}\n`;
  }
  if (output.fusion.actions.avoid.length > 0) {
    context += `   ⛔ Avoid: ${output.fusion.actions.avoid.join(', ')}\n`;
  }
  
  // Alerts
  if (output.fusion.alerts.length > 0) {
    context += `\n🚨 ALERTS:\n`;
    for (const alert of output.fusion.alerts) {
      const emoji = alert.type === 'DANGER' ? '🚨' : alert.type === 'WARNING' ? '⚠️' : alert.type === 'OPPORTUNITY' ? '💎' : 'ℹ️';
      context += `   ${emoji} ${alert.title}: ${alert.description}\n`;
    }
  }
  
  return context;
}

export default {
  calculate: calculateFusionIntelligence,
  formatForAI: formatFusionForAI,
};

