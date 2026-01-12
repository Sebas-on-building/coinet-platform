/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📊 SCORING CALIBRATION ENGINE - Outcome-Based Weight Refinement           ║
 * ║                                                                               ║
 * ║   Tracks meme coin analysis outcomes to continuously improve scoring          ║
 * ║   accuracy. Uses feedback loops to refine risk/potential weights.             ║
 * ║                                                                               ║
 * ║   METHODOLOGY:                                                                ║
 * ║   • Track predictions vs actual outcomes (rug, pump, dump, hold)              ║
 * ║   • Calculate factor importance via correlation analysis                      ║
 * ║   • Adjust weights based on predictive accuracy                               ║
 * ║   • A/B test weight configurations                                            ║
 * ║                                                                               ║
 * ║   @version 1.0.0                                                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Outcome types for tracked predictions
 */
export type PredictionOutcome = 
  | 'rug'           // Token rugged/honeypot confirmed
  | 'dump_hard'     // -70% or more
  | 'dump'          // -30% to -70%
  | 'flat'          // -30% to +50%
  | 'pump'          // +50% to +200%
  | 'moon'          // +200% or more
  | 'unknown';      // No data / token disappeared

/**
 * Tracked prediction for calibration
 */
export interface TrackedPrediction {
  id: string;
  tokenAddress: string;
  tokenSymbol: string;
  chain: string;
  
  // Prediction data
  predictedAt: Date;
  riskScore: number;
  potentialScore: number;
  tradingRecommendation: string;
  priceAtPrediction: number;
  
  // Individual factors (for correlation)
  factors: {
    liquidityRisk: number;
    holderRisk: number;
    ageRisk: number;
    creatorRisk: number;
    contractRisk: number;
    momentumSignal: number;
    communitySignal: number;
    smartMoneySignal: number;
    viralitySignal: number;
  };
  
  // Outcome data (filled later)
  outcome?: PredictionOutcome;
  outcomeAt?: Date;
  priceAtOutcome?: number;
  priceChange?: number;      // Percentage
  actualReturn?: number;     // If user traded
  
  // Metadata
  dataSourcesUsed: string[];
  confidence: number;
}

/**
 * Factor calibration stats
 */
export interface FactorCalibration {
  factorName: string;
  currentWeight: number;
  
  // Correlation with outcomes
  correlationWithRug: number;      // -1 to 1 (negative = good predictor)
  correlationWithPump: number;     // -1 to 1 (positive = good predictor)
  
  // Predictive accuracy
  accuracy: number;                // 0-100%
  falsePositiveRate: number;       // Rate of false alarms
  falseNegativeRate: number;       // Rate of missed rugs
  
  // Sample size
  sampleCount: number;
  
  // Suggested adjustment
  suggestedWeight: number;
  confidenceInSuggestion: number;
}

/**
 * Overall calibration report
 */
export interface CalibrationReport {
  reportDate: Date;
  
  // Overall metrics
  totalPredictions: number;
  outcomesTracked: number;
  
  // Prediction accuracy
  rugPredictionAccuracy: number;   // How often we caught rugs
  pumpPredictionAccuracy: number;  // How often pump predictions hit
  overallAccuracy: number;
  
  // Outcome distribution
  outcomeDistribution: Record<PredictionOutcome, number>;
  
  // Factor analysis
  factorCalibrations: FactorCalibration[];
  
  // Recommendations
  weightAdjustments: Array<{
    factor: string;
    currentWeight: number;
    suggestedWeight: number;
    reason: string;
  }>;
  
  // Model health
  modelHealth: 'excellent' | 'good' | 'needs_calibration' | 'degraded';
  nextCalibrationRecommended: Date;
}

/**
 * Scoring weights configuration
 */
export interface ScoringWeights {
  version: string;
  createdAt: Date;
  
  // Risk weights (total should be ~100)
  risk: {
    contract: number;      // Base: 30
    liquidity: number;     // Base: 25
    holder: number;        // Base: 25
    age: number;           // Base: 15
    social: number;        // Base: 10
    smartMoney: number;    // Base: 5 (new)
  };
  
  // Potential weights (total should be ~100)
  potential: {
    momentum: number;      // Base: 30
    community: number;     // Base: 25
    technical: number;     // Base: 25
    market: number;        // Base: 15
    narrative: number;     // Base: 10
    smartMoney: number;    // Base: 5 (new)
    virality: number;      // Base: 5 (new)
  };
  
  // Thresholds
  thresholds: {
    rugRiskThreshold: number;         // Above this = likely rug
    highPotentialThreshold: number;   // Above this = strong opportunity
    recommendationThresholds: {
      avoid: number;
      highRisk: number;
      moderate: number;
      favorable: number;
    };
  };
}

// ============================================================================
// DEFAULT WEIGHTS (v1.0)
// ============================================================================

const DEFAULT_WEIGHTS: ScoringWeights = {
  version: '1.0.0',
  createdAt: new Date(),
  
  risk: {
    contract: 30,
    liquidity: 25,
    holder: 25,
    age: 15,
    social: 5,
    smartMoney: 5,
  },
  
  potential: {
    momentum: 30,
    community: 25,
    technical: 25,
    market: 10,
    narrative: 5,
    smartMoney: 5,
    virality: 5,
  },
  
  thresholds: {
    rugRiskThreshold: 75,
    highPotentialThreshold: 65,
    recommendationThresholds: {
      avoid: 80,
      highRisk: 60,
      moderate: 40,
      favorable: 25,
    },
  },
};

// ============================================================================
// IN-MEMORY STORAGE (would be DB in production)
// ============================================================================

let currentWeights: ScoringWeights = { ...DEFAULT_WEIGHTS };
const predictions: Map<string, TrackedPrediction> = new Map();
const outcomeHistory: TrackedPrediction[] = [];

// ============================================================================
// PREDICTION TRACKING
// ============================================================================

/**
 * Track a new prediction for later outcome analysis
 */
export function trackPrediction(prediction: Omit<TrackedPrediction, 'id'>): string {
  const id = `pred_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  const tracked: TrackedPrediction = {
    ...prediction,
    id,
  };
  
  predictions.set(id, tracked);
  
  logger.debug('📊 Prediction tracked for calibration', {
    id,
    token: prediction.tokenSymbol,
    riskScore: prediction.riskScore,
    potentialScore: prediction.potentialScore,
  });
  
  return id;
}

/**
 * Record outcome for a tracked prediction
 */
export function recordOutcome(
  predictionId: string,
  outcome: PredictionOutcome,
  priceAtOutcome: number,
  actualReturn?: number
): boolean {
  const prediction = predictions.get(predictionId);
  
  if (!prediction) {
    logger.warn('📊 Prediction not found for outcome recording', { predictionId });
    return false;
  }
  
  const priceChange = prediction.priceAtPrediction > 0
    ? ((priceAtOutcome - prediction.priceAtPrediction) / prediction.priceAtPrediction) * 100
    : 0;
  
  prediction.outcome = outcome;
  prediction.outcomeAt = new Date();
  prediction.priceAtOutcome = priceAtOutcome;
  prediction.priceChange = priceChange;
  prediction.actualReturn = actualReturn;
  
  // Move to history
  outcomeHistory.push(prediction);
  predictions.delete(predictionId);
  
  logger.info('📊 Outcome recorded', {
    id: predictionId,
    token: prediction.tokenSymbol,
    outcome,
    priceChange: priceChange.toFixed(1) + '%',
    predictedRisk: prediction.riskScore,
    predictedPotential: prediction.potentialScore,
  });
  
  return true;
}

/**
 * Auto-determine outcome from price change
 */
export function determineOutcome(priceChange: number, wasRugged: boolean): PredictionOutcome {
  if (wasRugged) return 'rug';
  if (priceChange <= -70) return 'dump_hard';
  if (priceChange <= -30) return 'dump';
  if (priceChange <= 50) return 'flat';
  if (priceChange <= 200) return 'pump';
  return 'moon';
}

// ============================================================================
// CALIBRATION ANALYSIS
// ============================================================================

/**
 * Calculate correlation between a factor and outcomes
 */
function calculateCorrelation(
  outcomes: TrackedPrediction[],
  factorGetter: (p: TrackedPrediction) => number,
  outcomeValue: (p: TrackedPrediction) => number
): number {
  if (outcomes.length < 10) return 0;
  
  const factors = outcomes.map(factorGetter);
  const outcomeValues = outcomes.map(outcomeValue);
  
  const n = factors.length;
  const sumX = factors.reduce((a, b) => a + b, 0);
  const sumY = outcomeValues.reduce((a, b) => a + b, 0);
  const sumXY = factors.reduce((sum, x, i) => sum + x * outcomeValues[i], 0);
  const sumX2 = factors.reduce((sum, x) => sum + x * x, 0);
  const sumY2 = outcomeValues.reduce((sum, y) => sum + y * y, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Analyze a single factor's predictive power
 */
function analyzeFactorCalibration(
  factorName: string,
  currentWeight: number,
  factorGetter: (p: TrackedPrediction) => number
): FactorCalibration {
  const withOutcomes = outcomeHistory.filter(p => p.outcome && p.outcome !== 'unknown');
  
  // Correlation with rug (outcome = rug gets value 1, others 0)
  const correlationWithRug = calculateCorrelation(
    withOutcomes,
    factorGetter,
    p => p.outcome === 'rug' || p.outcome === 'dump_hard' ? 1 : 0
  );
  
  // Correlation with pump (outcome = pump/moon gets value 1, others 0)
  const correlationWithPump = calculateCorrelation(
    withOutcomes,
    factorGetter,
    p => p.outcome === 'pump' || p.outcome === 'moon' ? 1 : 0
  );
  
  // Calculate accuracy (how often high factor values predicted correctly)
  const highFactorPredictions = withOutcomes.filter(p => factorGetter(p) > 50);
  const correctHighFactor = highFactorPredictions.filter(p => {
    // For risk factors, high value should predict rug/dump
    // For potential factors, high value should predict pump/moon
    if (factorName.includes('Risk') || factorName.includes('risk')) {
      return p.outcome === 'rug' || p.outcome === 'dump_hard' || p.outcome === 'dump';
    }
    return p.outcome === 'pump' || p.outcome === 'moon';
  });
  
  const accuracy = highFactorPredictions.length > 0
    ? (correctHighFactor.length / highFactorPredictions.length) * 100
    : 50;
  
  // Calculate false positive/negative rates
  const totalRugs = withOutcomes.filter(p => p.outcome === 'rug' || p.outcome === 'dump_hard').length;
  const predictedRugs = highFactorPredictions.filter(p => factorName.includes('Risk') || factorName.includes('risk')).length;
  const falsePositiveRate = predictedRugs > 0 
    ? ((predictedRugs - correctHighFactor.filter(p => p.outcome === 'rug' || p.outcome === 'dump_hard').length) / predictedRugs) * 100
    : 0;
  const falseNegativeRate = totalRugs > 0
    ? ((totalRugs - correctHighFactor.filter(p => p.outcome === 'rug' || p.outcome === 'dump_hard').length) / totalRugs) * 100
    : 0;
  
  // Suggest weight adjustment
  let suggestedWeight = currentWeight;
  let confidenceInSuggestion = 0.5;
  
  if (withOutcomes.length >= 50) {
    // Strong correlation = increase weight
    const absCorrelation = Math.max(Math.abs(correlationWithRug), Math.abs(correlationWithPump));
    
    if (absCorrelation > 0.5 && accuracy > 60) {
      suggestedWeight = Math.min(40, currentWeight * 1.2);
      confidenceInSuggestion = 0.8;
    } else if (absCorrelation < 0.2 || accuracy < 40) {
      suggestedWeight = Math.max(5, currentWeight * 0.8);
      confidenceInSuggestion = 0.7;
    }
  }
  
  return {
    factorName,
    currentWeight,
    correlationWithRug,
    correlationWithPump,
    accuracy,
    falsePositiveRate,
    falseNegativeRate,
    sampleCount: withOutcomes.length,
    suggestedWeight,
    confidenceInSuggestion,
  };
}

/**
 * Generate full calibration report
 */
export function generateCalibrationReport(): CalibrationReport {
  const withOutcomes = outcomeHistory.filter(p => p.outcome && p.outcome !== 'unknown');
  
  // Outcome distribution
  const outcomeDistribution: Record<PredictionOutcome, number> = {
    rug: 0, dump_hard: 0, dump: 0, flat: 0, pump: 0, moon: 0, unknown: 0,
  };
  
  for (const p of outcomeHistory) {
    if (p.outcome) {
      outcomeDistribution[p.outcome]++;
    }
  }
  
  // Prediction accuracy
  const rugPredictions = withOutcomes.filter(p => p.riskScore >= 70);
  const actualRugs = rugPredictions.filter(p => p.outcome === 'rug' || p.outcome === 'dump_hard');
  const rugPredictionAccuracy = rugPredictions.length > 0
    ? (actualRugs.length / rugPredictions.length) * 100
    : 0;
  
  const pumpPredictions = withOutcomes.filter(p => p.potentialScore >= 60 && p.riskScore < 50);
  const actualPumps = pumpPredictions.filter(p => p.outcome === 'pump' || p.outcome === 'moon');
  const pumpPredictionAccuracy = pumpPredictions.length > 0
    ? (actualPumps.length / pumpPredictions.length) * 100
    : 0;
  
  const overallAccuracy = (rugPredictionAccuracy + pumpPredictionAccuracy) / 2;
  
  // Factor calibrations
  const factorCalibrations: FactorCalibration[] = [
    analyzeFactorCalibration('liquidityRisk', currentWeights.risk.liquidity, p => p.factors.liquidityRisk),
    analyzeFactorCalibration('holderRisk', currentWeights.risk.holder, p => p.factors.holderRisk),
    analyzeFactorCalibration('ageRisk', currentWeights.risk.age, p => p.factors.ageRisk),
    analyzeFactorCalibration('creatorRisk', currentWeights.risk.contract, p => p.factors.creatorRisk),
    analyzeFactorCalibration('contractRisk', currentWeights.risk.contract, p => p.factors.contractRisk),
    analyzeFactorCalibration('momentumSignal', currentWeights.potential.momentum, p => p.factors.momentumSignal),
    analyzeFactorCalibration('communitySignal', currentWeights.potential.community, p => p.factors.communitySignal),
    analyzeFactorCalibration('smartMoneySignal', currentWeights.potential.smartMoney, p => p.factors.smartMoneySignal),
    analyzeFactorCalibration('viralitySignal', currentWeights.potential.virality, p => p.factors.viralitySignal),
  ];
  
  // Generate weight adjustment recommendations
  const weightAdjustments = factorCalibrations
    .filter(f => Math.abs(f.suggestedWeight - f.currentWeight) > 2 && f.confidenceInSuggestion > 0.6)
    .map(f => ({
      factor: f.factorName,
      currentWeight: f.currentWeight,
      suggestedWeight: f.suggestedWeight,
      reason: f.accuracy > 60 
        ? `High accuracy (${f.accuracy.toFixed(0)}%) suggests increasing weight`
        : `Low accuracy (${f.accuracy.toFixed(0)}%) suggests decreasing weight`,
    }));
  
  // Determine model health
  let modelHealth: CalibrationReport['modelHealth'];
  if (withOutcomes.length < 20) {
    modelHealth = 'needs_calibration';
  } else if (overallAccuracy >= 70) {
    modelHealth = 'excellent';
  } else if (overallAccuracy >= 55) {
    modelHealth = 'good';
  } else if (overallAccuracy >= 40) {
    modelHealth = 'needs_calibration';
  } else {
    modelHealth = 'degraded';
  }
  
  return {
    reportDate: new Date(),
    totalPredictions: predictions.size + outcomeHistory.length,
    outcomesTracked: outcomeHistory.length,
    rugPredictionAccuracy,
    pumpPredictionAccuracy,
    overallAccuracy,
    outcomeDistribution,
    factorCalibrations,
    weightAdjustments,
    modelHealth,
    nextCalibrationRecommended: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
  };
}

// ============================================================================
// WEIGHT MANAGEMENT
// ============================================================================

/**
 * Get current scoring weights
 */
export function getCurrentWeights(): ScoringWeights {
  return { ...currentWeights };
}

/**
 * Apply suggested weight adjustments
 */
export function applyWeightAdjustments(adjustments: CalibrationReport['weightAdjustments']): void {
  for (const adj of adjustments) {
    if (adj.factor.includes('Risk') || adj.factor.includes('risk')) {
      // Map to risk weights
      if (adj.factor === 'liquidityRisk') currentWeights.risk.liquidity = adj.suggestedWeight;
      if (adj.factor === 'holderRisk') currentWeights.risk.holder = adj.suggestedWeight;
      if (adj.factor === 'ageRisk') currentWeights.risk.age = adj.suggestedWeight;
      if (adj.factor === 'contractRisk') currentWeights.risk.contract = adj.suggestedWeight;
    } else {
      // Map to potential weights
      if (adj.factor === 'momentumSignal') currentWeights.potential.momentum = adj.suggestedWeight;
      if (adj.factor === 'communitySignal') currentWeights.potential.community = adj.suggestedWeight;
      if (adj.factor === 'smartMoneySignal') currentWeights.potential.smartMoney = adj.suggestedWeight;
      if (adj.factor === 'viralitySignal') currentWeights.potential.virality = adj.suggestedWeight;
    }
  }
  
  // Update version
  const [major, minor, patch] = currentWeights.version.split('.').map(Number);
  currentWeights.version = `${major}.${minor}.${patch + 1}`;
  currentWeights.createdAt = new Date();
  
  logger.info('📊 Scoring weights updated', {
    version: currentWeights.version,
    adjustments: adjustments.length,
  });
}

/**
 * Reset weights to defaults
 */
export function resetWeights(): void {
  currentWeights = { ...DEFAULT_WEIGHTS };
  logger.info('📊 Scoring weights reset to defaults');
}

// ============================================================================
// AI CONTEXT BUILDER
// ============================================================================

/**
 * Build AI context with calibration insights
 */
export function buildCalibrationContext(): string {
  const report = generateCalibrationReport();
  
  return `
📊 SCORING MODEL HEALTH:
• Model Status: ${report.modelHealth.toUpperCase()}
• Overall Accuracy: ${report.overallAccuracy.toFixed(0)}%
• Rug Detection: ${report.rugPredictionAccuracy.toFixed(0)}%
• Pump Detection: ${report.pumpPredictionAccuracy.toFixed(0)}%
• Predictions Tracked: ${report.totalPredictions}
• Outcomes Verified: ${report.outcomesTracked}

${report.weightAdjustments.length > 0 ? `
⚙️ Suggested Calibrations:
${report.weightAdjustments.map(a => `  • ${a.factor}: ${a.currentWeight}→${a.suggestedWeight} (${a.reason})`).join('\n')}
` : ''}
`.trim();
}

// ============================================================================
// EXPORTS
// ============================================================================

export const scoringCalibration = {
  trackPrediction,
  recordOutcome,
  determineOutcome,
  generateCalibrationReport,
  getCurrentWeights,
  applyWeightAdjustments,
  resetWeights,
  buildCalibrationContext,
  DEFAULT_WEIGHTS,
};

export default scoringCalibration;
