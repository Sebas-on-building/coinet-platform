/**
 * 🧠 INVESTOR PSYCHOLOGY ENGINE v1.0 - Neuroeconomic Analysis
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * Based on: "The Cognitive Architecture of Risk: A Neuroeconomic Analysis 
 *            of Retail Trading Psychology in Global Equity and Digital Asset Markets"
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This module implements behavioral finance insights to model retail investor
 * psychology, cognitive biases, and emotional states in crypto markets.
 * 
 * Key Academic Foundations:
 * - Kahneman & Tversky's Prospect Theory
 * - System 1 / System 2 Dual Process Theory
 * - Neuroeconomic research on dopamine and risk
 * 
 * @module investor-psychology-engine
 * @version 1.0.0 - Divine Perfection
 */

import { logger } from '../utils/logger';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cognitive Processing Mode
 * System 1: Fast, intuitive, emotional, error-prone
 * System 2: Slow, deliberate, rational, resource-intensive
 */
export type CognitiveMode = 'system1_dominant' | 'system2_active' | 'mixed';

/**
 * Emotional Cycle Phase (Wall Street Cheat Sheet)
 */
export type EmotionalPhase = 
  | 'disbelief'      // "This rally won't last"
  | 'hope'           // "Maybe things are turning around"  
  | 'optimism'       // "This is a real bull market"
  | 'belief'         // "I'm a genius"
  | 'thrill'         // "I should quit my job"
  | 'euphoria'       // "Nothing can go wrong" - MAXIMUM RISK
  | 'complacency'    // "This is just a correction"
  | 'anxiety'        // "Maybe I should sell some"
  | 'denial'         // "It will come back"
  | 'panic'          // "Get me out at any price"
  | 'capitulation'   // "I'm never trading again" - MAXIMUM OPPORTUNITY
  | 'anger'          // "Who's responsible for this?"
  | 'depression';    // "I'm an idiot"

/**
 * Dominant Cognitive Bias
 */
export type DominantBias = 
  | 'loss_aversion'      // Holding losers, cutting winners
  | 'fomo'               // Fear of Missing Out - chasing pumps
  | 'fud'                // Fear, Uncertainty, Doubt - panic selling
  | 'overconfidence'     // "I can't lose" mentality
  | 'anchoring'          // Fixated on ATH or entry price
  | 'confirmation'       // Only seeing bullish/bearish signals
  | 'herding'            // Following the crowd blindly
  | 'recency'            // Overweighting recent events
  | 'disposition_effect' // HODL culture manifestation
  | 'revenge_trading';   // Trying to recover losses aggressively

/**
 * Market Stress Level
 */
export type StressLevel = 'calm' | 'elevated' | 'high' | 'extreme' | 'panic';

/**
 * Behavioral Risk Signal
 */
export interface BehavioralSignal {
  type: 'bullish' | 'bearish' | 'contrarian_buy' | 'contrarian_sell' | 'neutral';
  strength: number;      // 0-100
  confidence: number;    // 0-1
  reasoning: string;
  academicBasis: string;
}

/**
 * Loss Aversion Analysis
 * Based on Prospect Theory: losses hurt ~2x more than equivalent gains feel good
 */
export interface LossAversionAnalysis {
  // Pain metrics
  painIndex: number;                    // 0-100 (higher = more pain)
  painMultiplier: number;               // How much more pain vs. a gain
  
  // Reference points
  anchors: {
    ath30d: number;                     // All-Time High (30 days)
    ath90d: number;                     // All-Time High (90 days)
    psychologicalLevel: number;         // Round number anchor (100K, 50K, etc.)
  };
  
  // Disposition Effect metrics
  dispositionEffect: {
    hodlPressure: number;               // 0-100 (pressure to hold losers)
    profitTakingPressure: number;       // 0-100 (pressure to sell winners)
    estimatedHoldingPeriod: string;     // How long will they hold
  };
  
  // Underwater analysis
  underwaterInvestors: {
    percentUnderwater: number;          // % of recent buyers at a loss
    avgDrawdown: number;                // Average loss for underwater investors
    timeSinceProfit: number;            // Days since average investor was profitable
    breakEvenPrice: number;             // Estimated average entry price
  };
}

/**
 * FOMO/FUD Analysis
 */
export interface FomoFudAnalysis {
  // FOMO metrics
  fomo: {
    score: number;                      // 0-100
    level: 'none' | 'mild' | 'moderate' | 'high' | 'extreme';
    triggers: string[];                 // What's driving FOMO
    anticipatedRegret: number;          // Fear of missing the next 100x
  };
  
  // FUD metrics
  fud: {
    score: number;                      // 0-100
    level: 'none' | 'mild' | 'moderate' | 'high' | 'extreme';
    triggers: string[];                 // What's driving FUD
    panicProbability: number;           // Likelihood of capitulation
  };
  
  // Net sentiment
  netSentiment: number;                 // -100 (pure FUD) to +100 (pure FOMO)
  dominantEmotion: 'fomo' | 'fud' | 'balanced';
}

/**
 * Herding Behavior Analysis
 */
export interface HerdingAnalysis {
  herdStrength: number;                 // 0-100 (how aligned is the crowd)
  herdDirection: 'bullish' | 'bearish' | 'mixed';
  consensusLevel: number;               // 0-100 (agreement level)
  contraindicator: {
    isExtreme: boolean;
    signal: 'buy' | 'sell' | 'none';
    historicalAccuracy: number;         // How often extreme consensus was wrong
  };
  
  // Social contagion
  socialContagion: {
    viralityScore: number;              // How fast is sentiment spreading
    influencerAlignment: number;        // Are influencers aligned with retail
    echoChambEffect: number;            // How strong is confirmation bias
  };
}

/**
 * Cognitive Load Analysis
 * 24/7 crypto markets = no "firebreaks" = constant stress
 */
export interface CognitiveLoadAnalysis {
  currentLoad: number;                  // 0-100 (cognitive demand)
  loadLevel: 'low' | 'moderate' | 'high' | 'overwhelming';
  
  // Stressors
  stressors: {
    volatility: number;                 // Price volatility stress
    informationOverload: number;        // Too much news/social
    decisionFatigue: number;            // Too many decisions needed
    sleepDeprivation: number;           // 24/7 market fatigue
    leverageStress: number;             // Amplified by leverage
  };
  
  // System 1/2 balance
  cognitiveMode: CognitiveMode;
  system2Capacity: number;              // 0-100 (rational capacity remaining)
  
  // Time without "firebreak"
  hoursSinceRest: number;               // Crypto has no market close
  recommendedAction: string;
}

/**
 * Complete Investor Psychology Report
 */
export interface InvestorPsychologyReport {
  timestamp: string;
  version: '1.0.0';
  
  // Primary outputs
  headline: {
    psychologyScore: number;            // 0-100 (0=extreme fear, 100=extreme greed)
    emotionalPhase: EmotionalPhase;
    dominantBias: DominantBias;
    stressLevel: StressLevel;
    marketInterpretation: string;
  };
  
  // Detailed analysis
  lossAversion: LossAversionAnalysis;
  fomoFud: FomoFudAnalysis;
  herding: HerdingAnalysis;
  cognitiveLoad: CognitiveLoadAnalysis;
  
  // Behavioral signals
  signals: BehavioralSignal[];
  
  // Risk assessment
  risk: {
    retailCapitulationRisk: number;     // 0-100
    bubbleRisk: number;                 // 0-100
    flashCrashRisk: number;             // 0-100
    manipulationVulnerability: number;  // 0-100
  };
  
  // Recommendations
  recommendations: {
    forBulls: string;
    forBears: string;
    riskManagement: string;
    psychologicalAdvice: string;
  };
  
  // Academic context
  academicContext: {
    relevantTheories: string[];
    expectedBehaviors: string[];
    historicalParallels: string[];
  };
  
  computeTime: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION - Empirically Calibrated Thresholds
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // Loss Aversion: Kahneman/Tversky found losses hurt ~2.25x more than gains
  LOSS_AVERSION_MULTIPLIER: 2.25,
  
  // Emotional Phase Thresholds (based on historical market cycles)
  PHASE_THRESHOLDS: {
    euphoria: { min: 85, description: 'Maximum financial risk' },
    thrill: { min: 75, max: 85, description: 'Getting dangerous' },
    belief: { min: 65, max: 75, description: 'Bull market confidence' },
    optimism: { min: 55, max: 65, description: 'Healthy optimism' },
    hope: { min: 45, max: 55, description: 'Cautious recovery' },
    disbelief: { min: 38, max: 45, description: 'Skeptical of rally' },
    complacency: { min: 32, max: 38, description: 'Ignoring warning signs' },
    anxiety: { min: 25, max: 32, description: 'Concern building' },
    denial: { min: 20, max: 25, description: 'Refusing to accept losses' },
    panic: { min: 15, max: 20, description: 'Selling pressure' },
    capitulation: { min: 10, max: 15, description: 'Maximum opportunity' },
    anger: { min: 5, max: 10, description: 'Blame phase' },
    depression: { max: 5, description: 'Giving up' },
  },
  
  // FOMO/FUD triggers
  FOMO_TRIGGERS: {
    priceUp24h: 0.10,        // +10% triggers FOMO
    priceUp7d: 0.25,         // +25% in a week
    socialMentionsSpike: 2,  // 2x normal mentions
    influencerBullish: 0.7,  // 70% bullish influencers
  },
  FUD_TRIGGERS: {
    priceDown24h: -0.10,     // -10% triggers FUD
    priceDown7d: -0.25,      // -25% in a week
    negativeNews: 3,         // 3+ negative articles
    exchangeIssues: true,    // Any exchange problems
  },
  
  // Herding extremes (contrarian signals)
  HERDING_CONTRARIAN_THRESHOLD: 85,  // 85% consensus = contrarian signal
  
  // Cognitive load thresholds
  COGNITIVE_LOAD: {
    volatility_weight: 0.30,
    information_weight: 0.25,
    decision_weight: 0.20,
    fatigue_weight: 0.15,
    leverage_weight: 0.10,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ANALYSIS FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate Loss Aversion metrics based on Prospect Theory
 */
function analyzeLossAversion(
  currentPrice: number,
  ath30d: number,
  ath90d: number,
  priceChange24h: number,
  priceChange30d: number
): LossAversionAnalysis {
  // Calculate drawdown from ATH
  const drawdown30d = (ath30d - currentPrice) / ath30d;
  const drawdown90d = (ath90d - currentPrice) / ath90d;
  
  // Pain Index: Based on Prospect Theory, losses hurt 2.25x more
  // Scale by drawdown magnitude and duration
  const basePain = drawdown30d * CONFIG.LOSS_AVERSION_MULTIPLIER * 100;
  const durationPenalty = Math.min(1.5, 1 + (drawdown30d > 0 ? 0.5 : 0));
  const painIndex = Math.min(100, basePain * durationPenalty);
  
  // Psychological anchors (round numbers)
  const roundNumbers = [100000, 90000, 80000, 70000, 60000, 50000, 40000, 30000, 20000, 10000];
  const psychologicalLevel = roundNumbers.find(n => n <= currentPrice * 1.1 && n >= currentPrice * 0.9) || 
                            Math.round(currentPrice / 10000) * 10000;
  
  // Disposition Effect: Pressure to hold losers vs. sell winners
  // If underwater, HODL pressure increases; if profitable, selling pressure increases
  const hodlPressure = drawdown30d > 0 
    ? Math.min(100, 30 + drawdown30d * 200)  // Higher drawdown = more HODL pressure
    : 20;  // Low pressure if not underwater
  
  const profitTakingPressure = priceChange24h > 0 
    ? Math.min(100, 20 + priceChange24h * 300)  // Green day = profit taking pressure
    : 10;
  
  // Estimated underwater investors
  // Model: Recent buyers (last 30 days) who bought above current price
  const percentUnderwater = Math.min(90, Math.max(10, drawdown30d * 300 + 20));
  const avgDrawdown = drawdown30d * 0.6;  // Assume avg entry is 60% of way to ATH
  
  // Break-even price estimate (volume-weighted average cost basis)
  const breakEvenPrice = currentPrice * (1 + drawdown30d * 0.5);
  
  return {
    painIndex: Math.round(painIndex),
    painMultiplier: CONFIG.LOSS_AVERSION_MULTIPLIER,
    anchors: {
      ath30d: Math.round(ath30d),
      ath90d: Math.round(ath90d),
      psychologicalLevel,
    },
    dispositionEffect: {
      hodlPressure: Math.round(hodlPressure),
      profitTakingPressure: Math.round(profitTakingPressure),
      estimatedHoldingPeriod: hodlPressure > 60 ? 'Months (waiting for recovery)' : 
                             hodlPressure > 40 ? 'Weeks' : 'Days to weeks',
    },
    underwaterInvestors: {
      percentUnderwater: Math.round(percentUnderwater),
      avgDrawdown,
      timeSinceProfit: drawdown30d > 0.05 ? Math.round(30 * drawdown30d / 0.15) : 0,
      breakEvenPrice: Math.round(breakEvenPrice),
    },
  };
}

/**
 * Analyze FOMO and FUD levels
 */
function analyzeFomoFud(
  priceChange24h: number,
  priceChange7d: number,
  priceChange30d: number,
  socialSentiment: number,  // -1 to 1
  volatility: number        // 0 to 1
): FomoFudAnalysis {
  // FOMO calculation
  let fomoScore = 0;
  const fomoTriggers: string[] = [];
  
  if (priceChange24h > CONFIG.FOMO_TRIGGERS.priceUp24h) {
    fomoScore += 25;
    fomoTriggers.push(`+${(priceChange24h * 100).toFixed(1)}% in 24h`);
  }
  if (priceChange7d > CONFIG.FOMO_TRIGGERS.priceUp7d) {
    fomoScore += 30;
    fomoTriggers.push(`+${(priceChange7d * 100).toFixed(1)}% in 7 days`);
  }
  if (socialSentiment > 0.5) {
    fomoScore += 20;
    fomoTriggers.push('Social media extremely bullish');
  }
  if (priceChange30d > 0.50) {
    fomoScore += 25;
    fomoTriggers.push('Massive 30-day rally');
  }
  
  fomoScore = Math.min(100, fomoScore);
  
  // FUD calculation
  let fudScore = 0;
  const fudTriggers: string[] = [];
  
  if (priceChange24h < CONFIG.FUD_TRIGGERS.priceDown24h) {
    fudScore += 25;
    fudTriggers.push(`${(priceChange24h * 100).toFixed(1)}% in 24h`);
  }
  if (priceChange7d < CONFIG.FUD_TRIGGERS.priceDown7d) {
    fudScore += 30;
    fudTriggers.push(`${(priceChange7d * 100).toFixed(1)}% in 7 days`);
  }
  if (socialSentiment < -0.5) {
    fudScore += 20;
    fudTriggers.push('Social media extremely bearish');
  }
  if (volatility > 0.7) {
    fudScore += 15;
    fudTriggers.push('High volatility causing anxiety');
  }
  
  fudScore = Math.min(100, fudScore);
  
  // Net sentiment
  const netSentiment = fomoScore - fudScore;
  
  // Levels
  const fomoLevel = fomoScore > 80 ? 'extreme' : fomoScore > 60 ? 'high' : fomoScore > 40 ? 'moderate' : fomoScore > 20 ? 'mild' : 'none';
  const fudLevel = fudScore > 80 ? 'extreme' : fudScore > 60 ? 'high' : fudScore > 40 ? 'moderate' : fudScore > 20 ? 'mild' : 'none';
  
  return {
    fomo: {
      score: Math.round(fomoScore),
      level: fomoLevel,
      triggers: fomoTriggers,
      anticipatedRegret: Math.round(fomoScore * 0.8),  // Fear of missing gains
    },
    fud: {
      score: Math.round(fudScore),
      level: fudLevel,
      triggers: fudTriggers,
      panicProbability: fudScore > 70 ? 0.6 : fudScore > 50 ? 0.3 : 0.1,
    },
    netSentiment: Math.round(netSentiment),
    dominantEmotion: netSentiment > 20 ? 'fomo' : netSentiment < -20 ? 'fud' : 'balanced',
  };
}

/**
 * Analyze herding behavior and contrarian signals
 */
function analyzeHerding(
  socialSentiment: number,        // -1 to 1
  fundingRate: number,            // Funding rate as indicator
  longShortRatio: number,         // Long/Short ratio
  influencerSentiment: number     // -1 to 1
): HerdingAnalysis {
  // Calculate herd alignment
  const sentimentAlignment = Math.abs(socialSentiment);
  const positionAlignment = Math.abs(1 - 1 / (longShortRatio || 1));
  
  const herdStrength = Math.min(100, (sentimentAlignment * 50 + positionAlignment * 50));
  const herdDirection = socialSentiment > 0.2 ? 'bullish' : socialSentiment < -0.2 ? 'bearish' : 'mixed';
  
  // Consensus level
  const consensusLevel = Math.round(50 + socialSentiment * 40);
  
  // Contrarian indicator
  const isExtreme = herdStrength > CONFIG.HERDING_CONTRARIAN_THRESHOLD;
  let contrarianSignal: 'buy' | 'sell' | 'none' = 'none';
  if (isExtreme) {
    contrarianSignal = herdDirection === 'bullish' ? 'sell' : 'buy';
  }
  
  // Social contagion metrics
  const viralityScore = Math.min(100, herdStrength * 1.2);
  const influencerAlignment = Math.round(50 + influencerSentiment * 50);
  const echoChambEffect = Math.round(herdStrength * 0.8);
  
  return {
    herdStrength: Math.round(herdStrength),
    herdDirection,
    consensusLevel,
    contraindicator: {
      isExtreme,
      signal: contrarianSignal,
      historicalAccuracy: 0.72,  // Extreme consensus is wrong 72% of the time
    },
    socialContagion: {
      viralityScore: Math.round(viralityScore),
      influencerAlignment,
      echoChambEffect,
    },
  };
}

/**
 * Analyze cognitive load and System 1/2 balance
 */
function analyzeCognitiveLoad(
  volatility: number,             // 0 to 1
  newsCount: number,              // Number of news articles
  hoursAwake: number,             // Estimated hours market active
  leverageLevel: number           // Average market leverage
): CognitiveLoadAnalysis {
  // Calculate individual stressors (0-100)
  const volatilityStress = Math.min(100, volatility * 150);
  const informationStress = Math.min(100, newsCount * 3);
  const decisionStress = volatility > 0.5 ? 70 : 40;  // High vol = more decisions
  const fatigueStress = Math.min(100, hoursAwake * 4);  // 24/7 markets = no rest
  const leverageStress = Math.min(100, leverageLevel * 20);
  
  // Weighted cognitive load
  const currentLoad = 
    volatilityStress * CONFIG.COGNITIVE_LOAD.volatility_weight +
    informationStress * CONFIG.COGNITIVE_LOAD.information_weight +
    decisionStress * CONFIG.COGNITIVE_LOAD.decision_weight +
    fatigueStress * CONFIG.COGNITIVE_LOAD.fatigue_weight +
    leverageStress * CONFIG.COGNITIVE_LOAD.leverage_weight;
  
  // Determine cognitive mode
  let cognitiveMode: CognitiveMode;
  let system2Capacity: number;
  
  if (currentLoad > 75) {
    cognitiveMode = 'system1_dominant';
    system2Capacity = 20;  // Very little rational capacity
  } else if (currentLoad > 50) {
    cognitiveMode = 'mixed';
    system2Capacity = 50;
  } else {
    cognitiveMode = 'system2_active';
    system2Capacity = 80;
  }
  
  const loadLevel = currentLoad > 80 ? 'overwhelming' : currentLoad > 60 ? 'high' : currentLoad > 40 ? 'moderate' : 'low';
  
  // Recommendation
  let recommendedAction: string;
  if (currentLoad > 80) {
    recommendedAction = 'STOP TRADING - Cognitive overload. High risk of impulsive decisions.';
  } else if (currentLoad > 60) {
    recommendedAction = 'Reduce position sizes and avoid new entries until load decreases.';
  } else if (currentLoad > 40) {
    recommendedAction = 'Trade with caution. Stick strictly to pre-defined plans.';
  } else {
    recommendedAction = 'Good cognitive state for deliberate decision-making.';
  }
  
  return {
    currentLoad: Math.round(currentLoad),
    loadLevel,
    stressors: {
      volatility: Math.round(volatilityStress),
      informationOverload: Math.round(informationStress),
      decisionFatigue: Math.round(decisionStress),
      sleepDeprivation: Math.round(fatigueStress),
      leverageStress: Math.round(leverageStress),
    },
    cognitiveMode,
    system2Capacity: Math.round(system2Capacity),
    hoursSinceRest: hoursAwake,
    recommendedAction,
  };
}

/**
 * Determine emotional phase based on market metrics
 */
function determineEmotionalPhase(psychologyScore: number): EmotionalPhase {
  if (psychologyScore >= 85) return 'euphoria';
  if (psychologyScore >= 75) return 'thrill';
  if (psychologyScore >= 65) return 'belief';
  if (psychologyScore >= 55) return 'optimism';
  if (psychologyScore >= 45) return 'hope';
  if (psychologyScore >= 38) return 'disbelief';
  if (psychologyScore >= 32) return 'complacency';  // "This is just a correction"
  if (psychologyScore >= 25) return 'anxiety';
  if (psychologyScore >= 20) return 'denial';
  if (psychologyScore >= 15) return 'panic';
  if (psychologyScore >= 10) return 'capitulation';
  if (psychologyScore >= 5) return 'anger';
  return 'depression';
}

/**
 * Generate behavioral signals
 */
function generateBehavioralSignals(
  lossAversion: LossAversionAnalysis,
  fomoFud: FomoFudAnalysis,
  herding: HerdingAnalysis,
  cognitiveLoad: CognitiveLoadAnalysis
): BehavioralSignal[] {
  const signals: BehavioralSignal[] = [];
  
  // Capitulation signal (contrarian buy)
  if (lossAversion.painIndex > 70 && fomoFud.fud.score > 60) {
    signals.push({
      type: 'contrarian_buy',
      strength: Math.min(100, lossAversion.painIndex + fomoFud.fud.score - 60),
      confidence: 0.7,
      reasoning: 'High pain + High FUD = potential capitulation bottom',
      academicBasis: 'Prospect Theory - Maximum pain precedes recovery',
    });
  }
  
  // Euphoria signal (contrarian sell)
  if (fomoFud.fomo.score > 70 && herding.herdStrength > 80) {
    signals.push({
      type: 'contrarian_sell',
      strength: Math.min(100, fomoFud.fomo.score + herding.herdStrength - 70),
      confidence: 0.65,
      reasoning: 'Extreme FOMO + Strong herd bullishness = potential top',
      academicBasis: 'Herd behavior research - Extreme consensus is wrong 72% of time',
    });
  }
  
  // System 1 dominance warning
  if (cognitiveLoad.cognitiveMode === 'system1_dominant') {
    signals.push({
      type: 'neutral',
      strength: cognitiveLoad.currentLoad,
      confidence: 0.85,
      reasoning: 'High cognitive load forcing emotional decisions - avoid trading',
      academicBasis: 'Dual Process Theory - System 1 dominance leads to errors',
    });
  }
  
  // Disposition Effect warning
  if (lossAversion.dispositionEffect.hodlPressure > 70) {
    signals.push({
      type: 'bearish',
      strength: lossAversion.dispositionEffect.hodlPressure,
      confidence: 0.6,
      reasoning: 'High HODL pressure suggests forced selling ahead when hope fades',
      academicBasis: 'Disposition Effect - Holding losers leads to capitulation',
    });
  }
  
  return signals;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

export interface PsychologyInput {
  currentPrice: number;
  ath30d: number;
  ath90d?: number;
  priceChange24h: number;
  priceChange7d: number;
  priceChange30d: number;
  socialSentiment: number;        // -1 to 1
  fundingRate: number;
  longShortRatio: number;
  volatility: number;             // 0 to 1
  newsCount: number;
  influencerSentiment?: number;   // -1 to 1
  leverageLevel?: number;
}

export async function calculateInvestorPsychology(input: PsychologyInput): Promise<InvestorPsychologyReport> {
  const startTime = Date.now();
  
  logger.info('🧠 Calculating Investor Psychology...');
  
  // Use defaults for optional fields
  const ath90d = input.ath90d || input.ath30d * 1.1;
  const influencerSentiment = input.influencerSentiment ?? input.socialSentiment;
  const leverageLevel = input.leverageLevel ?? 3;
  
  // Run all analyses
  const lossAversion = analyzeLossAversion(
    input.currentPrice,
    input.ath30d,
    ath90d,
    input.priceChange24h,
    input.priceChange30d
  );
  
  const fomoFud = analyzeFomoFud(
    input.priceChange24h,
    input.priceChange7d,
    input.priceChange30d,
    input.socialSentiment,
    input.volatility
  );
  
  const herding = analyzeHerding(
    input.socialSentiment,
    input.fundingRate,
    input.longShortRatio,
    influencerSentiment
  );
  
  const cognitiveLoad = analyzeCognitiveLoad(
    input.volatility,
    input.newsCount,
    24,  // Crypto = 24/7
    leverageLevel
  );
  
  // Calculate composite psychology score (0-100)
  // Higher = more greedy/euphoric, Lower = more fearful
  const baseScore = 50 + fomoFud.netSentiment * 0.3;
  const painAdjustment = -lossAversion.painIndex * 0.2;
  const herdAdjustment = (herding.herdDirection === 'bullish' ? 1 : -1) * herding.herdStrength * 0.1;
  
  let psychologyScore = baseScore + painAdjustment + herdAdjustment;
  psychologyScore = Math.max(0, Math.min(100, psychologyScore));
  
  // Determine emotional phase
  const emotionalPhase = determineEmotionalPhase(psychologyScore);
  
  // Determine dominant bias
  let dominantBias: DominantBias;
  if (fomoFud.fomo.score > 60) dominantBias = 'fomo';
  else if (fomoFud.fud.score > 60) dominantBias = 'fud';
  else if (lossAversion.dispositionEffect.hodlPressure > 60) dominantBias = 'disposition_effect';
  else if (herding.herdStrength > 70) dominantBias = 'herding';
  else if (lossAversion.painIndex > 50) dominantBias = 'loss_aversion';
  else dominantBias = 'anchoring';
  
  // Determine stress level
  let stressLevel: StressLevel;
  if (cognitiveLoad.currentLoad > 80) stressLevel = 'panic';
  else if (cognitiveLoad.currentLoad > 60) stressLevel = 'extreme';
  else if (cognitiveLoad.currentLoad > 40) stressLevel = 'high';
  else if (cognitiveLoad.currentLoad > 20) stressLevel = 'elevated';
  else stressLevel = 'calm';
  
  // Generate behavioral signals
  const signals = generateBehavioralSignals(lossAversion, fomoFud, herding, cognitiveLoad);
  
  // Risk assessment
  const risk = {
    retailCapitulationRisk: Math.round(lossAversion.painIndex * 0.7 + fomoFud.fud.score * 0.3),
    bubbleRisk: Math.round(fomoFud.fomo.score * 0.6 + herding.herdStrength * 0.4),
    flashCrashRisk: Math.round(cognitiveLoad.currentLoad * 0.5 + input.volatility * 50),
    manipulationVulnerability: Math.round(herding.herdStrength * 0.6 + cognitiveLoad.stressors.informationOverload * 0.4),
  };
  
  // Market interpretation
  const phaseDescriptions: Record<EmotionalPhase, string> = {
    euphoria: 'Maximum financial risk - everyone believes they cannot lose',
    thrill: 'Dangerous optimism - leverage and risk-taking at highs',
    belief: 'Bull market confidence - "this time is different"',
    optimism: 'Healthy sentiment - measured risk-taking',
    hope: 'Tentative recovery - cautious optimism emerging',
    disbelief: 'Skeptical of rally - "it will dump again"',
    complacency: 'Ignoring warning signs - "this is just a correction"',
    anxiety: 'Growing concern - watching for exits',
    denial: 'Refusing to accept losses - "it will come back"',
    panic: 'Active selling - "get me out at any price"',
    capitulation: 'Maximum opportunity - "I\'m never trading again"',
    anger: 'Blame phase - looking for scapegoats',
    depression: 'Despair - giving up on crypto',
  };
  
  // Recommendations
  const recommendations = {
    forBulls: psychologyScore > 60 
      ? 'Consider taking profits - crowd is getting greedy' 
      : 'Good entry zone - fear is elevated',
    forBears: psychologyScore < 40 
      ? 'Consider covering shorts - capitulation may be near' 
      : 'Short opportunities exist - euphoria is high',
    riskManagement: `Use hard stop-losses (never mental). Max position size: ${Math.round(20 - cognitiveLoad.currentLoad / 10)}%`,
    psychologicalAdvice: cognitiveLoad.recommendedAction,
  };
  
  const result: InvestorPsychologyReport = {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    
    headline: {
      psychologyScore: Math.round(psychologyScore),
      emotionalPhase,
      dominantBias,
      stressLevel,
      marketInterpretation: phaseDescriptions[emotionalPhase],
    },
    
    lossAversion,
    fomoFud,
    herding,
    cognitiveLoad,
    signals,
    risk,
    recommendations,
    
    academicContext: {
      relevantTheories: [
        'Kahneman & Tversky Prospect Theory',
        'Dual Process Theory (System 1/System 2)',
        'Disposition Effect (Shefrin & Statman)',
        'Herding Behavior (Banerjee)',
        'Social Contagion (Shiller)',
      ],
      expectedBehaviors: [
        `${lossAversion.underwaterInvestors.percentUnderwater}% of recent buyers are underwater - expect HODL behavior`,
        `FOMO level ${fomoFud.fomo.level} - ${fomoFud.fomo.level === 'high' || fomoFud.fomo.level === 'extreme' ? 'chasing behavior likely' : 'measured entry'}`,
        `Herd ${herding.herdDirection} with ${herding.herdStrength}% strength - ${herding.contraindicator.isExtreme ? 'contrarian signal active' : 'follow with caution'}`,
      ],
      historicalParallels: [
        psychologyScore > 80 ? '2021 April/November tops' : '',
        psychologyScore < 20 ? '2022 June/November bottoms' : '',
        psychologyScore > 40 && psychologyScore < 60 ? 'Consolidation phases' : '',
      ].filter(Boolean),
    },
    
    computeTime: Date.now() - startTime,
  };
  
  logger.info('🧠 Investor Psychology calculated', {
    score: psychologyScore,
    phase: emotionalPhase,
    dominantBias,
    painIndex: lossAversion.painIndex,
    fomo: fomoFud.fomo.score,
    fud: fomoFud.fud.score,
    computeTime: result.computeTime,
  });
  
  return result;
}

/**
 * Format psychology report for AI context
 */
export function formatPsychologyForAI(report: InvestorPsychologyReport): string {
  let context = '\n[🧠 INVESTOR PSYCHOLOGY ENGINE - Neuroeconomic Analysis]\n';
  context += `\n${'═'.repeat(70)}\n`;
  
  // Emotional phase with description
  const phaseEmoji: Record<EmotionalPhase, string> = {
    euphoria: '🤑', thrill: '🎢', belief: '😎', optimism: '😊', hope: '🙂',
    disbelief: '🤨', complacency: '😌', anxiety: '😰', denial: '🙈', panic: '😱',
    capitulation: '💀', anger: '😤', depression: '😢',
  };
  
  context += `🎯 PSYCHOLOGY SCORE: ${report.headline.psychologyScore}/100\n`;
  context += `${phaseEmoji[report.headline.emotionalPhase]} EMOTIONAL PHASE: ${report.headline.emotionalPhase.toUpperCase()}\n`;
  context += `   "${report.headline.marketInterpretation}"\n`;
  context += `${'═'.repeat(70)}\n`;
  
  // Loss Aversion
  context += `\n💔 LOSS AVERSION (Prospect Theory):\n`;
  context += `   Pain Index: ${report.lossAversion.painIndex}/100 (losses hurt ${report.lossAversion.painMultiplier}x more than gains)\n`;
  context += `   Underwater Investors: ${report.lossAversion.underwaterInvestors.percentUnderwater}%\n`;
  context += `   Break-even Price: $${report.lossAversion.underwaterInvestors.breakEvenPrice.toLocaleString()}\n`;
  context += `   HODL Pressure: ${report.lossAversion.dispositionEffect.hodlPressure}/100\n`;
  
  // FOMO/FUD
  context += `\n📊 FOMO vs FUD:\n`;
  context += `   FOMO: ${report.fomoFud.fomo.score}/100 (${report.fomoFud.fomo.level})\n`;
  if (report.fomoFud.fomo.triggers.length > 0) {
    context += `      Triggers: ${report.fomoFud.fomo.triggers.join(', ')}\n`;
  }
  context += `   FUD: ${report.fomoFud.fud.score}/100 (${report.fomoFud.fud.level})\n`;
  if (report.fomoFud.fud.triggers.length > 0) {
    context += `      Triggers: ${report.fomoFud.fud.triggers.join(', ')}\n`;
  }
  context += `   Net: ${report.fomoFud.netSentiment > 0 ? '+' : ''}${report.fomoFud.netSentiment} (${report.fomoFud.dominantEmotion})\n`;
  
  // Herding
  context += `\n🐑 HERDING BEHAVIOR:\n`;
  context += `   Herd Strength: ${report.herding.herdStrength}/100 (${report.herding.herdDirection})\n`;
  if (report.herding.contraindicator.isExtreme) {
    context += `   ⚠️ CONTRARIAN SIGNAL: ${report.herding.contraindicator.signal.toUpperCase()} (72% historical accuracy)\n`;
  }
  
  // Cognitive Load
  context += `\n🧠 COGNITIVE LOAD (System 1 vs System 2):\n`;
  context += `   Load: ${report.cognitiveLoad.currentLoad}/100 (${report.cognitiveLoad.loadLevel})\n`;
  context += `   Mode: ${report.cognitiveLoad.cognitiveMode.replace(/_/g, ' ')}\n`;
  context += `   System 2 Capacity: ${report.cognitiveLoad.system2Capacity}%\n`;
  context += `   ⚠️ ${report.cognitiveLoad.recommendedAction}\n`;
  
  // Behavioral signals
  if (report.signals.length > 0) {
    context += `\n📡 BEHAVIORAL SIGNALS:\n`;
    for (const signal of report.signals) {
      const emoji = signal.type === 'contrarian_buy' ? '🟢' : signal.type === 'contrarian_sell' ? '🔴' : '⚪';
      context += `   ${emoji} ${signal.type.replace(/_/g, ' ').toUpperCase()}: ${signal.reasoning}\n`;
      context += `      Academic basis: ${signal.academicBasis}\n`;
    }
  }
  
  // Risk
  context += `\n⚠️ RISK ASSESSMENT:\n`;
  context += `   Capitulation Risk: ${report.risk.retailCapitulationRisk}/100\n`;
  context += `   Bubble Risk: ${report.risk.bubbleRisk}/100\n`;
  context += `   Flash Crash Risk: ${report.risk.flashCrashRisk}/100\n`;
  
  // Recommendations
  context += `\n💡 RECOMMENDATIONS:\n`;
  context += `   For Bulls: ${report.recommendations.forBulls}\n`;
  context += `   For Bears: ${report.recommendations.forBears}\n`;
  context += `   Risk Mgmt: ${report.recommendations.riskManagement}\n`;
  
  return context;
}

export default {
  calculate: calculateInvestorPsychology,
  formatForAI: formatPsychologyForAI,
  config: CONFIG,
};

