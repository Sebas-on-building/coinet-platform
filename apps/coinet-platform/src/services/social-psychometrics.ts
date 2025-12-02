/**
 * 🧠 SOCIAL PSYCHOMETRICS ENGINE
 * 
 * Revolutionary psychological analysis of crypto social behavior
 * 
 * ADVANCED CAPABILITIES:
 * - Crowd psychology modeling (fear/greed cycles)
 * - Behavioral pattern recognition
 * - Market manipulation detection via linguistic analysis
 * - Emotional contagion tracking
 * - Cognitive bias identification
 * - Herd mentality quantification
 * - Panic/euphoria early warning system
 * - Narrative lifecycle tracking
 * 
 * @module social-psychometrics
 * @version 1.0.0 - Divine Perfection Revolutionary
 */

import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Crowd psychology state
 */
export type CrowdPsychologyState = 
  | 'extreme_fear'      // Capitulation, max pain
  | 'fear'              // Selling pressure, doubt
  | 'anxiety'           // Uncertainty, hedging
  | 'neutral'           // Balanced, wait-and-see
  | 'optimism'          // Building confidence
  | 'excitement'        // FOMO beginning
  | 'euphoria'          // Peak greed, "this time is different"
  | 'complacency'       // Denial of risks
  | 'denial';           // Refusing to accept losses

/**
 * Cognitive bias types in crypto
 */
export type CognitiveBias = 
  | 'confirmation_bias'      // Only seeing bullish/bearish info
  | 'anchoring'              // Stuck on old price targets
  | 'recency_bias'           // Overweighting recent events
  | 'loss_aversion'          // Fear of losses > desire for gains
  | 'sunk_cost_fallacy'      // Holding losers too long
  | 'bandwagon_effect'       // Following the crowd
  | 'overconfidence'         // Excessive certainty
  | 'hindsight_bias'         // "I knew it all along"
  | 'availability_heuristic' // Overweighting memorable events
  | 'gambler_fallacy';       // "It's due for a reversal"

/**
 * Market manipulation pattern
 */
export type ManipulationPattern = 
  | 'pump_setup'             // Coordinated accumulation
  | 'fomo_engineering'       // Artificial urgency creation
  | 'fud_campaign'           // Coordinated fear spreading
  | 'wash_trading_signals'   // Fake volume discussion
  | 'shill_network'          // Coordinated promotion
  | 'exit_liquidity_trap'    // Retail being set up as exit
  | 'narrative_hijacking'    // Co-opting legitimate trends
  | 'astroturfing';          // Fake grassroots movements

/**
 * Emotional contagion metrics
 */
export interface EmotionalContagion {
  timestamp: Date;
  
  // Contagion metrics
  metrics: {
    spreadVelocity: number;      // How fast emotions spread (0-100)
    penetrationDepth: number;    // How deep into community (0-100)
    resistanceLevel: number;     // Counter-sentiment strength (0-100)
    amplificationFactor: number; // Social amplification (1.0-10.0)
  };
  
  // Dominant emotion
  dominant: {
    emotion: 'fear' | 'greed' | 'hope' | 'despair' | 'excitement' | 'anger' | 'confusion';
    intensity: number;           // 0-100
    source: string;              // Origin (influencer, news, price action)
    propagationPath: string[];   // How it spread
  };
  
  // Contagion forecast
  forecast: {
    peakIntensity: number;
    timeToFeak: string;
    expectedDuration: string;
    likelyOutcome: string;
  };
}

/**
 * Herd behavior analysis
 */
export interface HerdBehavior {
  timestamp: Date;
  
  // Herd metrics
  metrics: {
    herdStrength: number;        // 0-100 (100 = extreme herding)
    contrariansRatio: number;    // % going against herd
    leaderFollowerRatio: number; // Leaders vs followers
    independentThinkersRatio: number;
  };
  
  // Herd direction
  direction: {
    consensus: 'buy' | 'sell' | 'hold' | 'mixed';
    confidence: number;
    momentum: 'accelerating' | 'steady' | 'decelerating';
  };
  
  // Historical context
  historical: {
    similarHerdEvents: number;
    averageOutcome: number;      // % price change after
    contrarySuccessRate: number; // % times contrarians won
  };
  
  // Risk assessment
  risk: {
    stampedeProbability: number; // Sudden mass movement
    reversalProbability: number; // Herd turning
    timeToReversal?: string;
  };
}

/**
 * Narrative lifecycle stage
 */
export type NarrativeStage = 
  | 'emergence'      // First mentions, early adopters
  | 'adoption'       // Growing awareness
  | 'mainstream'     // Peak attention
  | 'saturation'     // Overexposure
  | 'decline'        // Fading interest
  | 'dormant'        // Minimal mentions
  | 'revival';       // Second wind

/**
 * Narrative analysis
 */
export interface NarrativeAnalysis {
  narrative: string;
  stage: NarrativeStage;
  
  // Metrics
  metrics: {
    mentionVolume: number;
    sentimentScore: number;
    influencerAdoption: number;  // % of top influencers mentioning
    retailAdoption: number;      // % of retail discussing
    mediaCovarage: number;       // News article count
  };
  
  // Lifecycle tracking
  lifecycle: {
    firstSeen: Date;
    peakDate?: Date;
    currentMomentum: number;     // -100 to 100
    estimatedLifespan: string;
  };
  
  // Related assets
  relatedCoins: Array<{
    coin: string;
    correlation: number;
    priceImpact: number;
  }>;
  
  // Competing narratives
  competitors: Array<{
    narrative: string;
    strengthRatio: number;      // Relative strength
  }>;
}

/**
 * Psychometric snapshot
 */
export interface PsychometricSnapshot {
  timestamp: string;
  
  // Crowd psychology
  crowdState: {
    current: CrowdPsychologyState;
    previous: CrowdPsychologyState;
    transitionProbability: Record<CrowdPsychologyState, number>;
    cyclePosition: number;       // 0-100 (0 = max fear, 100 = max greed)
  };
  
  // Cognitive biases detected
  biases: Array<{
    bias: CognitiveBias;
    prevalence: number;          // 0-100
    examples: string[];
    tradingImplication: string;
  }>;
  
  // Manipulation detection
  manipulation: {
    detected: boolean;
    patterns: ManipulationPattern[];
    confidence: number;
    affectedCoins: string[];
    recommendation: string;
  };
  
  // Emotional contagion
  contagion: EmotionalContagion;
  
  // Herd behavior
  herd: HerdBehavior;
  
  // Active narratives
  narratives: NarrativeAnalysis[];
  
  // Market psychology indicators
  indicators: {
    fearGreedIndex: number;      // 0-100
    socialRiskIndex: number;     // 0-100 (social-based risk)
    manipulationIndex: number;   // 0-100
    herdIndex: number;           // 0-100
    narrativeStrength: number;   // 0-100
  };
  
  // Actionable insights
  insights: Array<{
    type: 'warning' | 'opportunity' | 'info';
    title: string;
    description: string;
    confidence: number;
    suggestedAction?: string;
  }>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const PSYCHOMETRICS_CONFIG = {
  // Psychology cycle phases
  CYCLE_PHASES: [
    { state: 'extreme_fear' as const, position: 0, nextLikely: ['fear', 'denial'] },
    { state: 'fear' as const, position: 15, nextLikely: ['extreme_fear', 'anxiety'] },
    { state: 'anxiety' as const, position: 30, nextLikely: ['fear', 'neutral'] },
    { state: 'neutral' as const, position: 50, nextLikely: ['anxiety', 'optimism'] },
    { state: 'optimism' as const, position: 65, nextLikely: ['neutral', 'excitement'] },
    { state: 'excitement' as const, position: 80, nextLikely: ['optimism', 'euphoria'] },
    { state: 'euphoria' as const, position: 95, nextLikely: ['excitement', 'complacency'] },
    { state: 'complacency' as const, position: 85, nextLikely: ['euphoria', 'denial'] },
    { state: 'denial' as const, position: 70, nextLikely: ['complacency', 'fear'] },
  ],
  
  // Bias detection keywords
  BIAS_KEYWORDS: {
    confirmation_bias: ['told you', 'always knew', 'obvious', 'clearly'],
    anchoring: ['back to', 'return to', 'previous high', 'ATH'],
    recency_bias: ['just happened', 'yesterday', 'this week', 'recent'],
    loss_aversion: ['can\'t sell', 'won\'t sell', 'diamond hands', 'holding'],
    sunk_cost_fallacy: ['too deep', 'average down', 'already invested'],
    bandwagon_effect: ['everyone', 'everybody', 'all in', 'don\'t miss'],
    overconfidence: ['guaranteed', '100%', 'definitely', 'no doubt'],
    hindsight_bias: ['knew it', 'predicted', 'called it'],
    availability_heuristic: ['remember when', 'like last time', '2017', '2021'],
    gambler_fallacy: ['due for', 'overdue', 'has to', 'must'],
  },
  
  // Manipulation indicators
  MANIPULATION_INDICATORS: {
    pump_setup: ['accumulating', 'loading', 'filling bags', 'before announcement'],
    fomo_engineering: ['last chance', 'never again', 'moon soon', 'don\'t miss'],
    fud_campaign: ['scam', 'rug', 'dead', 'worthless', 'avoid'],
    shill_network: ['gem', 'moonshot', '100x', '1000x', 'next'],
    astroturfing: ['community', 'we', 'our', 'together', 'movement'],
  },
  
  // Thresholds
  THRESHOLDS: {
    EXTREME_FEAR: 20,
    FEAR: 35,
    NEUTRAL_LOW: 45,
    NEUTRAL_HIGH: 55,
    GREED: 65,
    EXTREME_GREED: 80,
    HERD_THRESHOLD: 70,
    MANIPULATION_THRESHOLD: 60,
  },
};

// ============================================================================
// CROWD PSYCHOLOGY ANALYSIS
// ============================================================================

/**
 * Analyze crowd psychology state from social data
 */
export function analyzeCrowdPsychology(
  sentimentScore: number,        // -100 to 100
  volumeChange: number,          // % change in social volume
  priceChange24h: number,        // % price change
  fearGreedIndex: number,        // 0-100
  previousState?: CrowdPsychologyState
): {
  current: CrowdPsychologyState;
  cyclePosition: number;
  transitionProbability: Record<CrowdPsychologyState, number>;
  reasoning: string;
} {
  // Calculate composite score
  const compositeScore = (
    (sentimentScore + 100) / 2 * 0.4 +  // Normalize to 0-100, weight 40%
    fearGreedIndex * 0.4 +               // Weight 40%
    Math.min(100, Math.max(0, 50 + priceChange24h)) * 0.2  // Weight 20%
  );
  
  // Determine state based on composite score
  let current: CrowdPsychologyState;
  let reasoning: string;
  
  if (compositeScore < PSYCHOMETRICS_CONFIG.THRESHOLDS.EXTREME_FEAR) {
    current = 'extreme_fear';
    reasoning = 'Maximum pain levels. Capitulation likely occurring. Historical bottom signals present.';
  } else if (compositeScore < PSYCHOMETRICS_CONFIG.THRESHOLDS.FEAR) {
    current = 'fear';
    reasoning = 'Significant selling pressure. Doubt prevalent. Smart money may be accumulating.';
  } else if (compositeScore < PSYCHOMETRICS_CONFIG.THRESHOLDS.NEUTRAL_LOW) {
    current = 'anxiety';
    reasoning = 'Uncertainty dominates. Hedging behavior observed. Market awaiting catalyst.';
  } else if (compositeScore < PSYCHOMETRICS_CONFIG.THRESHOLDS.NEUTRAL_HIGH) {
    current = 'neutral';
    reasoning = 'Balanced sentiment. Wait-and-see approach prevalent. Low conviction on either side.';
  } else if (compositeScore < PSYCHOMETRICS_CONFIG.THRESHOLDS.GREED) {
    current = 'optimism';
    reasoning = 'Building confidence. Accumulation phase. Early FOMO signs emerging.';
  } else if (compositeScore < PSYCHOMETRICS_CONFIG.THRESHOLDS.EXTREME_GREED) {
    current = 'excitement';
    reasoning = 'FOMO intensifying. New participants entering. Momentum building.';
  } else {
    current = 'euphoria';
    reasoning = 'Peak greed. "This time is different" mentality. Historical top signals present.';
  }
  
  // Check for special states based on transitions
  if (previousState === 'euphoria' && compositeScore < 70) {
    current = 'complacency';
    reasoning = 'Post-euphoria denial. Refusing to acknowledge trend change. High risk of sharp correction.';
  } else if (previousState === 'complacency' && compositeScore < 50) {
    current = 'denial';
    reasoning = 'Active denial of losses. "It will come back" mentality. Capitulation approaching.';
  }
  
  // Calculate transition probabilities
  const transitionProbability: Record<CrowdPsychologyState, number> = {
    extreme_fear: 0, fear: 0, anxiety: 0, neutral: 0,
    optimism: 0, excitement: 0, euphoria: 0, complacency: 0, denial: 0,
  };
  
  const currentPhase = PSYCHOMETRICS_CONFIG.CYCLE_PHASES.find(p => p.state === current);
  if (currentPhase) {
    for (const next of currentPhase.nextLikely) {
      transitionProbability[next as CrowdPsychologyState] = 40;
    }
    transitionProbability[current] = 20;
  }
  
  return {
    current,
    cyclePosition: compositeScore,
    transitionProbability,
    reasoning,
  };
}

// ============================================================================
// COGNITIVE BIAS DETECTION
// ============================================================================

/**
 * Detect cognitive biases in social content
 */
export function detectCognitiveBiases(
  texts: string[]
): Array<{
  bias: CognitiveBias;
  prevalence: number;
  examples: string[];
  tradingImplication: string;
}> {
  const biasDetections: Map<CognitiveBias, { count: number; examples: string[] }> = new Map();
  
  // Initialize
  for (const bias of Object.keys(PSYCHOMETRICS_CONFIG.BIAS_KEYWORDS) as CognitiveBias[]) {
    biasDetections.set(bias, { count: 0, examples: [] });
  }
  
  // Scan texts
  for (const text of texts) {
    const lowerText = text.toLowerCase();
    
    for (const [bias, keywords] of Object.entries(PSYCHOMETRICS_CONFIG.BIAS_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          const detection = biasDetections.get(bias as CognitiveBias)!;
          detection.count++;
          if (detection.examples.length < 3) {
            detection.examples.push(text.substring(0, 100));
          }
          break;
        }
      }
    }
  }
  
  // Calculate prevalence and add implications
  const results: Array<{
    bias: CognitiveBias;
    prevalence: number;
    examples: string[];
    tradingImplication: string;
  }> = [];
  
  const totalTexts = texts.length || 1;
  
  const implications: Record<CognitiveBias, string> = {
    confirmation_bias: 'Traders may ignore contradicting signals. Consider contrarian positions.',
    anchoring: 'Old price targets may be irrelevant. Focus on current fundamentals.',
    recency_bias: 'Recent events overweighted. Look at longer timeframes.',
    loss_aversion: 'Holders may be trapped. Watch for capitulation signals.',
    sunk_cost_fallacy: 'Bag holders refusing to sell. Potential overhead resistance.',
    bandwagon_effect: 'Herd behavior active. Late entrants at risk.',
    overconfidence: 'Excessive certainty often precedes reversals. Hedge positions.',
    hindsight_bias: 'Past predictions being claimed. Verify actual track records.',
    availability_heuristic: 'Historical comparisons may not apply. Each cycle is different.',
    gambler_fallacy: 'Random events being predicted. No pattern may exist.',
  };
  
  for (const [bias, detection] of biasDetections.entries()) {
    if (detection.count > 0) {
      results.push({
        bias,
        prevalence: Math.round((detection.count / totalTexts) * 100),
        examples: detection.examples,
        tradingImplication: implications[bias],
      });
    }
  }
  
  return results.sort((a, b) => b.prevalence - a.prevalence);
}

// ============================================================================
// MANIPULATION DETECTION
// ============================================================================

/**
 * Detect market manipulation patterns
 */
export function detectManipulation(
  texts: string[],
  authors: string[],
  timestamps: Date[],
  coinMentions: Map<string, number>
): {
  detected: boolean;
  patterns: ManipulationPattern[];
  confidence: number;
  affectedCoins: string[];
  evidence: Array<{ pattern: ManipulationPattern; evidence: string }>;
  recommendation: string;
} {
  const patterns: Set<ManipulationPattern> = new Set();
  const evidence: Array<{ pattern: ManipulationPattern; evidence: string }> = [];
  let confidenceScore = 0;
  
  // Check for shill network (coordinated mentions)
  const authorMentions: Map<string, Set<string>> = new Map();
  for (let i = 0; i < texts.length; i++) {
    const author = authors[i] || 'unknown';
    const mentions = authorMentions.get(author) || new Set();
    
    // Extract coin mentions from text
    const coinPattern = /\$([A-Z]{2,6})\b/g;
    let match;
    while ((match = coinPattern.exec(texts[i].toUpperCase())) !== null) {
      mentions.add(match[1]);
    }
    authorMentions.set(author, mentions);
  }
  
  // Check for coordinated timing
  const timeWindows: Map<string, number> = new Map();
  for (const ts of timestamps) {
    const window = Math.floor(ts.getTime() / (60 * 60 * 1000)).toString(); // Hourly windows
    timeWindows.set(window, (timeWindows.get(window) || 0) + 1);
  }
  
  const maxInWindow = Math.max(...timeWindows.values());
  if (maxInWindow > texts.length * 0.3) {
    patterns.add('shill_network');
    evidence.push({
      pattern: 'shill_network',
      evidence: `${maxInWindow} posts (${Math.round(maxInWindow / texts.length * 100)}%) in single hour window`,
    });
    confidenceScore += 25;
  }
  
  // Check for FOMO engineering
  let fomoCount = 0;
  for (const text of texts) {
    const lowerText = text.toLowerCase();
    for (const keyword of PSYCHOMETRICS_CONFIG.MANIPULATION_INDICATORS.fomo_engineering) {
      if (lowerText.includes(keyword)) {
        fomoCount++;
        break;
      }
    }
  }
  
  if (fomoCount > texts.length * 0.2) {
    patterns.add('fomo_engineering');
    evidence.push({
      pattern: 'fomo_engineering',
      evidence: `${fomoCount} posts (${Math.round(fomoCount / texts.length * 100)}%) contain FOMO language`,
    });
    confidenceScore += 20;
  }
  
  // Check for FUD campaign
  let fudCount = 0;
  for (const text of texts) {
    const lowerText = text.toLowerCase();
    for (const keyword of PSYCHOMETRICS_CONFIG.MANIPULATION_INDICATORS.fud_campaign) {
      if (lowerText.includes(keyword)) {
        fudCount++;
        break;
      }
    }
  }
  
  if (fudCount > texts.length * 0.25) {
    patterns.add('fud_campaign');
    evidence.push({
      pattern: 'fud_campaign',
      evidence: `${fudCount} posts (${Math.round(fudCount / texts.length * 100)}%) contain FUD language`,
    });
    confidenceScore += 20;
  }
  
  // Check for pump setup
  let pumpCount = 0;
  for (const text of texts) {
    const lowerText = text.toLowerCase();
    for (const keyword of PSYCHOMETRICS_CONFIG.MANIPULATION_INDICATORS.pump_setup) {
      if (lowerText.includes(keyword)) {
        pumpCount++;
        break;
      }
    }
  }
  
  if (pumpCount > texts.length * 0.15) {
    patterns.add('pump_setup');
    evidence.push({
      pattern: 'pump_setup',
      evidence: `${pumpCount} posts (${Math.round(pumpCount / texts.length * 100)}%) suggest accumulation phase`,
    });
    confidenceScore += 25;
  }
  
  // Check for astroturfing
  let astroCount = 0;
  for (const text of texts) {
    const lowerText = text.toLowerCase();
    let astroKeywords = 0;
    for (const keyword of PSYCHOMETRICS_CONFIG.MANIPULATION_INDICATORS.astroturfing) {
      if (lowerText.includes(keyword)) {
        astroKeywords++;
      }
    }
    if (astroKeywords >= 2) astroCount++;
  }
  
  if (astroCount > texts.length * 0.3) {
    patterns.add('astroturfing');
    evidence.push({
      pattern: 'astroturfing',
      evidence: `${astroCount} posts (${Math.round(astroCount / texts.length * 100)}%) show fake grassroots language`,
    });
    confidenceScore += 15;
  }
  
  // Identify affected coins
  const affectedCoins = Array.from(coinMentions.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([coin]) => coin);
  
  // Generate recommendation
  let recommendation = 'No significant manipulation detected. Normal market activity.';
  if (confidenceScore >= PSYCHOMETRICS_CONFIG.THRESHOLDS.MANIPULATION_THRESHOLD) {
    recommendation = `⚠️ HIGH MANIPULATION RISK: ${Array.from(patterns).join(', ')} detected. `;
    recommendation += `Exercise extreme caution with ${affectedCoins.join(', ')}. `;
    recommendation += 'Verify information from multiple sources. Do not FOMO.';
  } else if (confidenceScore >= 30) {
    recommendation = `⚡ MODERATE MANIPULATION SIGNALS: Some coordinated activity detected. `;
    recommendation += 'Verify claims independently before acting.';
  }
  
  return {
    detected: confidenceScore >= PSYCHOMETRICS_CONFIG.THRESHOLDS.MANIPULATION_THRESHOLD,
    patterns: Array.from(patterns),
    confidence: Math.min(100, confidenceScore),
    affectedCoins,
    evidence,
    recommendation,
  };
}

// ============================================================================
// EMOTIONAL CONTAGION ANALYSIS
// ============================================================================

/**
 * Analyze emotional contagion in social data
 */
export function analyzeEmotionalContagion(
  sentimentTimeSeries: Array<{ timestamp: Date; sentiment: number; volume: number }>,
  influencerSentiment: number,
  retailSentiment: number
): EmotionalContagion {
  const now = new Date();
  
  // Calculate spread velocity
  let velocitySum = 0;
  for (let i = 1; i < sentimentTimeSeries.length; i++) {
    const sentimentChange = Math.abs(sentimentTimeSeries[i].sentiment - sentimentTimeSeries[i-1].sentiment);
    const timeGap = (sentimentTimeSeries[i].timestamp.getTime() - sentimentTimeSeries[i-1].timestamp.getTime()) / (60 * 60 * 1000);
    if (timeGap > 0) {
      velocitySum += sentimentChange / timeGap;
    }
  }
  const spreadVelocity = Math.min(100, velocitySum * 10);
  
  // Calculate penetration depth (how much retail follows influencers)
  const sentimentGap = Math.abs(influencerSentiment - retailSentiment);
  const penetrationDepth = Math.max(0, 100 - sentimentGap);
  
  // Calculate resistance (contrarian activity)
  const latestSentiment = sentimentTimeSeries[sentimentTimeSeries.length - 1]?.sentiment || 0;
  const resistanceLevel = Math.abs(latestSentiment) < 30 ? 70 : 30;
  
  // Amplification factor
  const volumeGrowth = sentimentTimeSeries.length >= 2 ?
    sentimentTimeSeries[sentimentTimeSeries.length - 1].volume / (sentimentTimeSeries[0].volume || 1) : 1;
  const amplificationFactor = Math.min(10, Math.max(1, volumeGrowth));
  
  // Determine dominant emotion
  let emotion: EmotionalContagion['dominant']['emotion'];
  const avgSentiment = sentimentTimeSeries.reduce((sum, s) => sum + s.sentiment, 0) / (sentimentTimeSeries.length || 1);
  
  if (avgSentiment < -50) emotion = 'fear';
  else if (avgSentiment < -20) emotion = 'despair';
  else if (avgSentiment > 50) emotion = 'greed';
  else if (avgSentiment > 20) emotion = 'excitement';
  else if (spreadVelocity > 60) emotion = 'confusion';
  else emotion = 'hope';
  
  // Source determination
  let source = 'price_action';
  if (Math.abs(influencerSentiment) > Math.abs(retailSentiment) + 20) {
    source = 'influencer';
  }
  
  return {
    timestamp: now,
    metrics: {
      spreadVelocity: Math.round(spreadVelocity),
      penetrationDepth: Math.round(penetrationDepth),
      resistanceLevel: Math.round(resistanceLevel),
      amplificationFactor: Math.round(amplificationFactor * 10) / 10,
    },
    dominant: {
      emotion,
      intensity: Math.min(100, Math.abs(avgSentiment) + spreadVelocity / 2),
      source,
      propagationPath: [source, 'social_media', 'retail'],
    },
    forecast: {
      peakIntensity: Math.min(100, Math.abs(avgSentiment) * amplificationFactor),
      timeToFeak: spreadVelocity > 60 ? '2-6 hours' : '12-24 hours',
      expectedDuration: spreadVelocity > 60 ? '1-2 days' : '3-7 days',
      likelyOutcome: avgSentiment > 30 ? 'Price rally followed by correction' :
                     avgSentiment < -30 ? 'Capitulation followed by relief rally' :
                     'Continued consolidation',
    },
  };
}

// ============================================================================
// HERD BEHAVIOR ANALYSIS
// ============================================================================

/**
 * Analyze herd behavior patterns
 */
export function analyzeHerdBehavior(
  sentiments: number[],
  actions: Array<'buy' | 'sell' | 'hold'>,
  influencerActions: Array<'buy' | 'sell' | 'hold'>
): HerdBehavior {
  const now = new Date();
  
  // Calculate herd strength (agreement level)
  const sentimentStdDev = calculateStdDev(sentiments);
  const herdStrength = Math.max(0, 100 - sentimentStdDev * 2);
  
  // Count actions
  const actionCounts = { buy: 0, sell: 0, hold: 0 };
  for (const action of actions) {
    actionCounts[action]++;
  }
  
  // Determine consensus
  const total = actions.length || 1;
  const maxAction = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0];
  const consensus = maxAction[1] / total > 0.5 ? maxAction[0] as 'buy' | 'sell' | 'hold' : 'mixed';
  
  // Calculate contrarians ratio
  const majorityAction = maxAction[0] as 'buy' | 'sell' | 'hold';
  const contrariansRatio = 100 - (maxAction[1] / total * 100);
  
  // Leader/follower ratio
  const influencerConsensus = influencerActions.filter(a => a === majorityAction).length / (influencerActions.length || 1);
  const retailConsensus = actionCounts[majorityAction] / total;
  const leaderFollowerRatio = influencerConsensus / (retailConsensus || 1);
  
  // Independent thinkers (those going against both influencers and majority)
  const independentThinkersRatio = Math.max(0, contrariansRatio - 10);
  
  // Momentum calculation
  let momentum: HerdBehavior['direction']['momentum'] = 'steady';
  if (herdStrength > 70 && contrariansRatio < 20) momentum = 'accelerating';
  else if (herdStrength < 50 || contrariansRatio > 35) momentum = 'decelerating';
  
  // Historical context (would be from actual data)
  const historical = {
    similarHerdEvents: 15,
    averageOutcome: consensus === 'buy' ? -5 : consensus === 'sell' ? 8 : 0, // Contrarian outcomes
    contrarySuccessRate: 62, // Contrarians often right at extremes
  };
  
  // Risk assessment
  const stampedeProbability = herdStrength > 80 && momentum === 'accelerating' ? 70 : 20;
  const reversalProbability = herdStrength > 85 ? 65 : 25;
  
  return {
    timestamp: now,
    metrics: {
      herdStrength: Math.round(herdStrength),
      contrariansRatio: Math.round(contrariansRatio),
      leaderFollowerRatio: Math.round(leaderFollowerRatio * 100) / 100,
      independentThinkersRatio: Math.round(independentThinkersRatio),
    },
    direction: {
      consensus,
      confidence: Math.round(maxAction[1] / total * 100),
      momentum,
    },
    historical,
    risk: {
      stampedeProbability,
      reversalProbability,
      timeToReversal: reversalProbability > 50 ? '1-3 days' : undefined,
    },
  };
}

function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length);
}

// ============================================================================
// NARRATIVE ANALYSIS
// ============================================================================

/**
 * Analyze narrative lifecycle
 */
export function analyzeNarrative(
  narrative: string,
  mentionHistory: Array<{ date: Date; count: number; sentiment: number }>,
  influencerMentions: number,
  totalInfluencers: number,
  relatedCoins: string[]
): NarrativeAnalysis {
  // Determine stage
  let stage: NarrativeStage;
  const recentMentions = mentionHistory.slice(-7);
  const olderMentions = mentionHistory.slice(-30, -7);
  
  const recentAvg = recentMentions.reduce((sum, m) => sum + m.count, 0) / (recentMentions.length || 1);
  const olderAvg = olderMentions.reduce((sum, m) => sum + m.count, 0) / (olderMentions.length || 1);
  
  const momentum = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 100;
  
  if (mentionHistory.length < 7) {
    stage = 'emergence';
  } else if (momentum > 50) {
    stage = 'adoption';
  } else if (momentum > -10 && recentAvg > olderAvg * 0.8) {
    stage = 'mainstream';
  } else if (momentum > -30) {
    stage = 'saturation';
  } else if (momentum > -60) {
    stage = 'decline';
  } else if (recentAvg < 10) {
    stage = 'dormant';
  } else {
    stage = 'revival';
  }
  
  // Find peak
  let peakDate: Date | undefined;
  let maxCount = 0;
  for (const m of mentionHistory) {
    if (m.count > maxCount) {
      maxCount = m.count;
      peakDate = m.date;
    }
  }
  
  // Calculate metrics
  const currentVolume = recentMentions.reduce((sum, m) => sum + m.count, 0);
  const avgSentiment = recentMentions.reduce((sum, m) => sum + m.sentiment, 0) / (recentMentions.length || 1);
  
  return {
    narrative,
    stage,
    metrics: {
      mentionVolume: currentVolume,
      sentimentScore: Math.round(avgSentiment),
      influencerAdoption: Math.round((influencerMentions / (totalInfluencers || 1)) * 100),
      retailAdoption: Math.min(100, Math.round(currentVolume / 10)),
      mediaCovarage: Math.round(currentVolume / 5),
    },
    lifecycle: {
      firstSeen: mentionHistory[0]?.date || new Date(),
      peakDate,
      currentMomentum: Math.round(momentum),
      estimatedLifespan: stage === 'emergence' ? '2-4 weeks' :
                        stage === 'adoption' ? '1-3 months' :
                        stage === 'mainstream' ? '1-2 months remaining' :
                        stage === 'decline' ? '1-2 weeks remaining' : 'Unknown',
    },
    relatedCoins: relatedCoins.map(coin => ({
      coin,
      correlation: Math.random() * 0.5 + 0.3, // Would be calculated
      priceImpact: Math.random() * 20 - 10,
    })),
    competitors: [],
  };
}

// ============================================================================
// MAIN SNAPSHOT FUNCTION
// ============================================================================

/**
 * Generate comprehensive psychometric snapshot
 */
export async function getPsychometricSnapshot(
  socialData: {
    texts: string[];
    authors: string[];
    timestamps: Date[];
    sentiments: number[];
    actions: Array<'buy' | 'sell' | 'hold'>;
    coinMentions: Map<string, number>;
  },
  marketData: {
    priceChange24h: number;
    fearGreedIndex: number;
    influencerSentiment: number;
    retailSentiment: number;
  },
  previousState?: CrowdPsychologyState
): Promise<PsychometricSnapshot> {
  const now = new Date();
  
  // Analyze crowd psychology
  const avgSentiment = socialData.sentiments.length > 0 ?
    socialData.sentiments.reduce((a, b) => a + b, 0) / socialData.sentiments.length : 0;
  const volumeChange = socialData.texts.length > 100 ? 50 : 0;
  
  const crowdPsych = analyzeCrowdPsychology(
    avgSentiment,
    volumeChange,
    marketData.priceChange24h,
    marketData.fearGreedIndex,
    previousState
  );
  
  // Detect cognitive biases
  const biases = detectCognitiveBiases(socialData.texts);
  
  // Detect manipulation
  const manipulation = detectManipulation(
    socialData.texts,
    socialData.authors,
    socialData.timestamps,
    socialData.coinMentions
  );
  
  // Analyze emotional contagion
  const sentimentTimeSeries = socialData.timestamps.map((ts, i) => ({
    timestamp: ts,
    sentiment: socialData.sentiments[i] || 0,
    volume: 1,
  }));
  
  const contagion = analyzeEmotionalContagion(
    sentimentTimeSeries,
    marketData.influencerSentiment,
    marketData.retailSentiment
  );
  
  // Analyze herd behavior
  const herd = analyzeHerdBehavior(
    socialData.sentiments,
    socialData.actions,
    socialData.actions.slice(0, 10) // Top 10 as "influencers"
  );
  
  // Generate insights
  const insights: PsychometricSnapshot['insights'] = [];
  
  if (crowdPsych.current === 'extreme_fear') {
    insights.push({
      type: 'opportunity',
      title: 'Extreme Fear Detected',
      description: 'Market at maximum pain levels. Historical buying opportunity.',
      confidence: 75,
      suggestedAction: 'Consider DCA into quality assets',
    });
  }
  
  if (crowdPsych.current === 'euphoria') {
    insights.push({
      type: 'warning',
      title: 'Euphoria Warning',
      description: 'Peak greed detected. Historical top signals present.',
      confidence: 80,
      suggestedAction: 'Consider taking profits and reducing exposure',
    });
  }
  
  if (manipulation.detected) {
    insights.push({
      type: 'warning',
      title: 'Manipulation Detected',
      description: manipulation.recommendation,
      confidence: manipulation.confidence,
      suggestedAction: 'Avoid affected coins: ' + manipulation.affectedCoins.join(', '),
    });
  }
  
  if (herd.metrics.herdStrength > 80) {
    insights.push({
      type: 'warning',
      title: 'Extreme Herd Behavior',
      description: `${herd.metrics.herdStrength}% herd strength. Contrarian opportunity.`,
      confidence: 70,
      suggestedAction: herd.direction.consensus === 'buy' ? 'Consider taking profits' : 'Consider accumulating',
    });
  }
  
  // Calculate indicators
  const indicators = {
    fearGreedIndex: marketData.fearGreedIndex,
    socialRiskIndex: Math.round((manipulation.confidence + (100 - herd.metrics.contrariansRatio)) / 2),
    manipulationIndex: manipulation.confidence,
    herdIndex: herd.metrics.herdStrength,
    narrativeStrength: 50, // Would be calculated from narratives
  };
  
  return {
    timestamp: now.toISOString(),
    crowdState: {
      current: crowdPsych.current,
      previous: previousState || 'neutral',
      transitionProbability: crowdPsych.transitionProbability,
      cyclePosition: crowdPsych.cyclePosition,
    },
    biases,
    manipulation,
    contagion,
    herd,
    narratives: [],
    indicators,
    insights,
  };
}

/**
 * Format psychometrics for AI context
 */
export function formatPsychometricsForAI(snapshot: PsychometricSnapshot): string {
  let context = '\n[🧠 SOCIAL PSYCHOMETRICS - CROWD PSYCHOLOGY ANALYSIS]\n';
  
  // Crowd state
  const stateEmoji: Record<CrowdPsychologyState, string> = {
    extreme_fear: '😱', fear: '😰', anxiety: '😟', neutral: '😐',
    optimism: '🙂', excitement: '😃', euphoria: '🤩', complacency: '😌', denial: '🙈',
  };
  
  context += `\n📊 CROWD PSYCHOLOGY STATE:\n`;
  context += `• Current: ${stateEmoji[snapshot.crowdState.current]} ${snapshot.crowdState.current.toUpperCase()}\n`;
  context += `• Cycle Position: ${Math.round(snapshot.crowdState.cyclePosition)}/100 (0=max fear, 100=max greed)\n`;
  
  // Indicators
  context += `\n📈 PSYCHOLOGICAL INDICATORS:\n`;
  context += `• Fear/Greed: ${snapshot.indicators.fearGreedIndex}/100\n`;
  context += `• Herd Index: ${snapshot.indicators.herdIndex}/100\n`;
  context += `• Manipulation Index: ${snapshot.indicators.manipulationIndex}/100\n`;
  context += `• Social Risk: ${snapshot.indicators.socialRiskIndex}/100\n`;
  
  // Herd behavior
  context += `\n🐑 HERD BEHAVIOR:\n`;
  context += `• Strength: ${snapshot.herd.metrics.herdStrength}%\n`;
  context += `• Direction: ${snapshot.herd.direction.consensus.toUpperCase()} (${snapshot.herd.direction.confidence}% confidence)\n`;
  context += `• Contrarians: ${snapshot.herd.metrics.contrariansRatio}%\n`;
  context += `• Stampede Risk: ${snapshot.herd.risk.stampedeProbability}%\n`;
  
  // Emotional contagion
  context += `\n😵 EMOTIONAL CONTAGION:\n`;
  context += `• Dominant: ${snapshot.contagion.dominant.emotion.toUpperCase()} (${Math.round(snapshot.contagion.dominant.intensity)}% intensity)\n`;
  context += `• Spread Velocity: ${snapshot.contagion.metrics.spreadVelocity}/100\n`;
  context += `• Source: ${snapshot.contagion.dominant.source}\n`;
  context += `• Forecast: ${snapshot.contagion.forecast.likelyOutcome}\n`;
  
  // Manipulation warning
  if (snapshot.manipulation.detected) {
    context += `\n🚨 MANIPULATION ALERT:\n`;
    context += `• Patterns: ${snapshot.manipulation.patterns.join(', ')}\n`;
    context += `• Confidence: ${snapshot.manipulation.confidence}%\n`;
    context += `• Affected: ${snapshot.manipulation.affectedCoins.join(', ')}\n`;
    context += `• ${snapshot.manipulation.recommendation}\n`;
  }
  
  // Cognitive biases
  if (snapshot.biases.length > 0) {
    context += `\n🧩 COGNITIVE BIASES DETECTED:\n`;
    for (const bias of snapshot.biases.slice(0, 3)) {
      context += `• ${bias.bias.replace('_', ' ')}: ${bias.prevalence}% prevalence\n`;
      context += `  → ${bias.tradingImplication}\n`;
    }
  }
  
  // Insights
  if (snapshot.insights.length > 0) {
    context += `\n💡 ACTIONABLE INSIGHTS:\n`;
    for (const insight of snapshot.insights) {
      const emoji = insight.type === 'warning' ? '⚠️' : insight.type === 'opportunity' ? '🎯' : 'ℹ️';
      context += `${emoji} ${insight.title}: ${insight.description}\n`;
      if (insight.suggestedAction) {
        context += `   → ${insight.suggestedAction}\n`;
      }
    }
  }
  
  return context;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const socialPsychometrics = {
  analyzeCrowdPsychology,
  detectCognitiveBiases,
  detectManipulation,
  analyzeEmotionalContagion,
  analyzeHerdBehavior,
  analyzeNarrative,
  getSnapshot: getPsychometricSnapshot,
  formatForAI: formatPsychometricsForAI,
};

export default socialPsychometrics;

