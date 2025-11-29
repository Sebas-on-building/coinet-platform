/**
 * AI-Powered Unlock Impact Predictor
 * ML-based price impact prediction for token unlocks
 * 
 * Predicts: 1h, 24h, 7d, 30d price changes with confidence scores
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

// Feature types
export interface UnlockFeatures {
  // Unlock characteristics (6 features)
  percentOfTotalSupply: number;
  percentOfCirculatingSupply: number;
  unlockValueUsd: number;
  unlockValueAsPercentOfMarketCap: number;
  daysUntilUnlock: number;
  isCliff: boolean;
  
  // Category encoding (one-hot, 6 features)
  categoryTeam: boolean;
  categoryInvestor: boolean;
  categoryAdvisor: boolean;
  categoryTreasury: boolean;
  categoryCommunity: boolean;
  categoryOther: boolean;
}

export interface MarketFeatures {
  // Market conditions (8 features)
  btcPriceChange24h: number;
  ethPriceChange24h: number;
  tokenPriceChange24h: number;
  tokenVolatility7d: number;
  tokenVolume24hUsd: number;
  tokenLiquidityUsd: number;
  marketSentiment: number; // -1 to 1
  fearGreedIndex: number;  // 0 to 100
}

export interface HistoricalFeatures {
  // Historical patterns (5 features)
  priorUnlockAvgImpact: number;
  categoryHistoricalImpact: number;
  sizeHistoricalImpact: number;
  holderSellBehavior: number; // 0-1, how likely to sell
  timeSinceLastUnlock: number; // days
}

export interface PredictionInput {
  unlock: UnlockFeatures;
  market: MarketFeatures;
  historical: HistoricalFeatures;
}

export interface ImpactPrediction {
  symbol: string;
  unlockDate: Date;
  
  // Price predictions
  priceChange1h: number;   // Expected % change
  priceChange24h: number;
  priceChange7d: number;
  priceChange30d: number;
  
  // Confidence scores (0-1)
  confidence1h: number;
  confidence24h: number;
  confidence7d: number;
  confidence30d: number;
  
  // Market impact
  sellingPressure: number;      // 0-100
  marketAbsorption: number;     // Can market absorb? 0-100
  expectedSlippage: number;     // Expected slippage if sold at once
  
  // Recommendations
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  recommendation: string;
  tradingStrategy: TradingStrategy;
  
  // Metadata
  modelVersion: string;
  computedAt: Date;
  featureImportance: FeatureImportance[];
}

export interface TradingStrategy {
  action: 'buy' | 'sell' | 'hold' | 'wait';
  timing: 'before' | 'during' | 'after';
  conviction: number; // 0-1
  rationale: string;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  contribution: number; // positive or negative
}

// Model weights (would be learned from training)
const MODEL_WEIGHTS = {
  // Unlock characteristics weights
  percentOfCirculating: -0.45,     // Larger unlock = more negative impact
  unlockValueMarketCapRatio: -0.35,
  isCliff: -0.15,                   // Cliff unlocks have more impact
  daysUntilUnlock: 0.05,           // Further away = less immediate impact
  
  // Category weights
  categoryTeam: -0.25,              // Team sales are bearish
  categoryInvestor: -0.30,          // VC sales are very bearish
  categoryAdvisor: -0.15,
  categoryTreasury: -0.05,          // Treasury less likely to dump
  categoryCommunity: 0.0,
  
  // Market weights
  marketSentiment: 0.20,            // Good sentiment helps absorption
  tokenLiquidity: 0.15,             // More liquidity = less impact
  btcTrend: 0.10,                   // Rising BTC helps
  
  // Historical weights
  priorUnlockImpact: 0.35,          // Past behavior predicts future
  holderSellBehavior: -0.25,        // Known sellers = more selling
};

// Historical training data (would come from database)
interface HistoricalUnlock {
  symbol: string;
  features: PredictionInput;
  actualChange1h: number;
  actualChange24h: number;
  actualChange7d: number;
  actualChange30d: number;
}

export class UnlockImpactPredictor extends EventEmitter {
  private modelVersion: string = '1.0.0';
  private trainingData: HistoricalUnlock[] = [];
  private isInitialized: boolean = false;
  
  constructor() {
    super();
    logger.info('Unlock Impact Predictor initialized');
  }

  /**
   * Initialize with historical training data
   */
  async initialize(historicalData?: HistoricalUnlock[]): Promise<void> {
    if (historicalData) {
      this.trainingData = historicalData;
    }
    
    // In production, would load trained model weights here
    this.isInitialized = true;
    
    logger.info('Impact Predictor initialized', {
      trainingDataSize: this.trainingData.length,
      modelVersion: this.modelVersion,
    });
  }

  /**
   * Predict impact of a token unlock
   */
  async predict(
    symbol: string,
    unlockDate: Date,
    input: PredictionInput
  ): Promise<ImpactPrediction> {
    // Feature vector
    const features = this.extractFeatureVector(input);
    
    // Predict using weighted sum (simple linear model)
    // In production, this would use a trained neural network
    const basePrediction = this.computeBasePrediction(features);
    
    // Time decay adjustments
    const predictions = this.computeTimePredictions(basePrediction, input.market);
    
    // Compute confidences
    const confidences = this.computeConfidences(input, features);
    
    // Market impact analysis
    const marketImpact = this.analyzeMarketImpact(input);
    
    // Generate recommendations
    const recommendation = this.generateRecommendation(
      predictions,
      confidences,
      marketImpact
    );
    
    // Feature importance
    const featureImportance = this.computeFeatureImportance(features);
    
    return {
      symbol,
      unlockDate,
      
      priceChange1h: predictions.change1h,
      priceChange24h: predictions.change24h,
      priceChange7d: predictions.change7d,
      priceChange30d: predictions.change30d,
      
      confidence1h: confidences.conf1h,
      confidence24h: confidences.conf24h,
      confidence7d: confidences.conf7d,
      confidence30d: confidences.conf30d,
      
      sellingPressure: marketImpact.sellingPressure,
      marketAbsorption: marketImpact.absorption,
      expectedSlippage: marketImpact.slippage,
      
      riskLevel: recommendation.riskLevel,
      recommendation: recommendation.text,
      tradingStrategy: recommendation.strategy,
      
      modelVersion: this.modelVersion,
      computedAt: new Date(),
      featureImportance,
    };
  }

  /**
   * Extract feature vector from input
   */
  private extractFeatureVector(input: PredictionInput): number[] {
    const u = input.unlock;
    const m = input.market;
    const h = input.historical;
    
    return [
      // Unlock features
      u.percentOfTotalSupply,
      u.percentOfCirculatingSupply,
      Math.log10(u.unlockValueUsd + 1),
      u.unlockValueAsPercentOfMarketCap,
      u.daysUntilUnlock,
      u.isCliff ? 1 : 0,
      
      // Category one-hot
      u.categoryTeam ? 1 : 0,
      u.categoryInvestor ? 1 : 0,
      u.categoryAdvisor ? 1 : 0,
      u.categoryTreasury ? 1 : 0,
      u.categoryCommunity ? 1 : 0,
      u.categoryOther ? 1 : 0,
      
      // Market features
      m.btcPriceChange24h,
      m.ethPriceChange24h,
      m.tokenPriceChange24h,
      m.tokenVolatility7d,
      Math.log10(m.tokenVolume24hUsd + 1),
      Math.log10(m.tokenLiquidityUsd + 1),
      m.marketSentiment,
      m.fearGreedIndex / 100,
      
      // Historical features
      h.priorUnlockAvgImpact,
      h.categoryHistoricalImpact,
      h.sizeHistoricalImpact,
      h.holderSellBehavior,
      Math.log10(h.timeSinceLastUnlock + 1),
    ];
  }

  /**
   * Compute base prediction using model weights
   */
  private computeBasePrediction(features: number[]): number {
    // Simplified linear model
    // In production, this would be a neural network inference
    
    let prediction = 0;
    
    // Apply key weights
    prediction += features[1] * MODEL_WEIGHTS.percentOfCirculating;  // percentOfCirculating
    prediction += features[3] * MODEL_WEIGHTS.unlockValueMarketCapRatio;  // marketCapRatio
    prediction += features[5] * MODEL_WEIGHTS.isCliff;  // isCliff
    
    // Category contributions
    prediction += features[6] * MODEL_WEIGHTS.categoryTeam;
    prediction += features[7] * MODEL_WEIGHTS.categoryInvestor;
    prediction += features[8] * MODEL_WEIGHTS.categoryAdvisor;
    prediction += features[9] * MODEL_WEIGHTS.categoryTreasury;
    
    // Market contributions
    prediction += features[18] * MODEL_WEIGHTS.marketSentiment;  // sentiment
    prediction += (features[17] / 10) * MODEL_WEIGHTS.tokenLiquidity;  // liquidity normalized
    prediction += features[12] * MODEL_WEIGHTS.btcTrend;  // BTC trend
    
    // Historical contributions
    prediction += features[20] * MODEL_WEIGHTS.priorUnlockImpact;
    prediction += features[23] * MODEL_WEIGHTS.holderSellBehavior;
    
    return prediction;
  }

  /**
   * Compute predictions for different time horizons
   */
  private computeTimePredictions(
    basePrediction: number,
    market: MarketFeatures
  ): { change1h: number; change24h: number; change7d: number; change30d: number } {
    // Time decay factors
    const decay1h = 0.3;   // 30% of impact in first hour
    const decay24h = 0.6;  // 60% by 24h
    const decay7d = 0.85;  // 85% by 7d
    const decay30d = 1.0;  // Full impact by 30d
    
    // Market recovery factor
    const recoveryFactor = (market.marketSentiment + 1) / 2; // 0-1
    
    return {
      change1h: basePrediction * decay1h,
      change24h: basePrediction * decay24h * (1 - recoveryFactor * 0.2),
      change7d: basePrediction * decay7d * (1 - recoveryFactor * 0.4),
      change30d: basePrediction * decay30d * (1 - recoveryFactor * 0.6),
    };
  }

  /**
   * Compute confidence scores
   */
  private computeConfidences(
    input: PredictionInput,
    features: number[]
  ): { conf1h: number; conf24h: number; conf7d: number; conf30d: number } {
    // Base confidence from data quality
    const dataQuality = 0.7;
    
    // Historical match confidence
    const historicalSimilarity = this.findSimilarHistorical(features);
    
    // Time decay on confidence (harder to predict further out)
    return {
      conf1h: Math.min(dataQuality * 1.2 * historicalSimilarity, 0.95),
      conf24h: Math.min(dataQuality * 1.0 * historicalSimilarity, 0.85),
      conf7d: Math.min(dataQuality * 0.7 * historicalSimilarity, 0.70),
      conf30d: Math.min(dataQuality * 0.4 * historicalSimilarity, 0.50),
    };
  }

  /**
   * Find similar historical unlocks
   */
  private findSimilarHistorical(features: number[]): number {
    if (this.trainingData.length === 0) {
      return 0.5; // Default when no training data
    }
    
    // Find most similar historical event
    let maxSimilarity = 0;
    
    this.trainingData.forEach(historical => {
      const historicalFeatures = this.extractFeatureVector(historical.features);
      const similarity = this.cosineSimilarity(features, historicalFeatures);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    });
    
    return maxSimilarity;
  }

  /**
   * Cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator > 0 ? dotProduct / denominator : 0;
  }

  /**
   * Analyze market impact
   */
  private analyzeMarketImpact(input: PredictionInput): {
    sellingPressure: number;
    absorption: number;
    slippage: number;
  } {
    const u = input.unlock;
    const m = input.market;
    
    // Selling pressure based on unlock characteristics
    let sellingPressure = 0;
    sellingPressure += u.percentOfCirculatingSupply * 5; // 5% per 1% of supply
    if (u.categoryInvestor) sellingPressure += 20;
    if (u.categoryTeam) sellingPressure += 15;
    if (u.isCliff) sellingPressure += 10;
    sellingPressure = Math.min(sellingPressure, 100);
    
    // Absorption capacity
    const liquidityRatio = m.tokenLiquidityUsd / u.unlockValueUsd;
    const volumeRatio = m.tokenVolume24hUsd / u.unlockValueUsd;
    const absorption = Math.min((liquidityRatio * 30 + volumeRatio * 70), 100);
    
    // Expected slippage
    const slippage = sellingPressure > absorption
      ? (sellingPressure - absorption) * 0.1
      : 0;
    
    return {
      sellingPressure: Math.round(sellingPressure),
      absorption: Math.round(absorption),
      slippage: Math.round(slippage * 100) / 100,
    };
  }

  /**
   * Generate recommendation
   */
  private generateRecommendation(
    predictions: { change1h: number; change24h: number; change7d: number; change30d: number },
    confidences: { conf1h: number; conf24h: number; conf7d: number; conf30d: number },
    marketImpact: { sellingPressure: number; absorption: number; slippage: number }
  ): {
    riskLevel: 'low' | 'medium' | 'high' | 'extreme';
    text: string;
    strategy: TradingStrategy;
  } {
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'extreme';
    if (predictions.change24h < -10 || marketImpact.sellingPressure > 80) {
      riskLevel = 'extreme';
    } else if (predictions.change24h < -5 || marketImpact.sellingPressure > 60) {
      riskLevel = 'high';
    } else if (predictions.change24h < -2 || marketImpact.sellingPressure > 40) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }
    
    // Generate text recommendation
    let text = '';
    if (riskLevel === 'extreme') {
      text = 'High selling pressure expected. Consider reducing exposure before unlock.';
    } else if (riskLevel === 'high') {
      text = 'Moderate selling pressure likely. Monitor closely and consider protective measures.';
    } else if (riskLevel === 'medium') {
      text = 'Some selling pressure possible. Watch price action around unlock time.';
    } else {
      text = 'Low impact expected. Market should absorb unlock without significant disruption.';
    }
    
    // Generate trading strategy
    let strategy: TradingStrategy;
    if (riskLevel === 'extreme' || riskLevel === 'high') {
      strategy = {
        action: 'sell',
        timing: 'before',
        conviction: confidences.conf24h,
        rationale: 'Reduce exposure before expected selling pressure',
      };
    } else if (predictions.change7d > 5) {
      strategy = {
        action: 'buy',
        timing: 'after',
        conviction: confidences.conf7d,
        rationale: 'Potential buying opportunity after unlock selling subsides',
      };
    } else {
      strategy = {
        action: 'hold',
        timing: 'during',
        conviction: 0.5,
        rationale: 'No significant action needed',
      };
    }
    
    return { riskLevel, text, strategy };
  }

  /**
   * Compute feature importance
   */
  private computeFeatureImportance(features: number[]): FeatureImportance[] {
    const featureNames = [
      'percentOfTotalSupply', 'percentOfCirculatingSupply', 'unlockValueUsd',
      'marketCapRatio', 'daysUntilUnlock', 'isCliff',
      'categoryTeam', 'categoryInvestor', 'categoryAdvisor',
      'categoryTreasury', 'categoryCommunity', 'categoryOther',
      'btcChange24h', 'ethChange24h', 'tokenChange24h',
      'volatility7d', 'volume24h', 'liquidity',
      'sentiment', 'fearGreed',
      'priorUnlockImpact', 'categoryHistorical', 'sizeHistorical',
      'holderBehavior', 'timeSinceLastUnlock',
    ];
    
    // Calculate importance based on feature values and weights
    const importances: FeatureImportance[] = [];
    
    const keyWeights = [
      MODEL_WEIGHTS.percentOfCirculating,
      MODEL_WEIGHTS.categoryInvestor,
      MODEL_WEIGHTS.marketSentiment,
      MODEL_WEIGHTS.priorUnlockImpact,
    ];
    
    const keyIndices = [1, 7, 18, 20];
    
    keyIndices.forEach((idx, i) => {
      importances.push({
        feature: featureNames[idx],
        importance: Math.abs(keyWeights[i]),
        contribution: features[idx] * keyWeights[i],
      });
    });
    
    return importances.sort((a, b) => b.importance - a.importance);
  }

  /**
   * Add training data point
   */
  addTrainingData(data: HistoricalUnlock): void {
    this.trainingData.push(data);
    
    // Trigger retraining if we have enough new data
    if (this.trainingData.length % 100 === 0) {
      this.emit('retrainingNeeded', this.trainingData.length);
    }
  }

  /**
   * Get model statistics
   */
  getStats(): {
    modelVersion: string;
    trainingDataSize: number;
    isInitialized: boolean;
  } {
    return {
      modelVersion: this.modelVersion,
      trainingDataSize: this.trainingData.length,
      isInitialized: this.isInitialized,
    };
  }
}

// Singleton
let instance: UnlockImpactPredictor | null = null;

export function getUnlockImpactPredictor(): UnlockImpactPredictor {
  if (!instance) {
    instance = new UnlockImpactPredictor();
  }
  return instance;
}

export default UnlockImpactPredictor;

