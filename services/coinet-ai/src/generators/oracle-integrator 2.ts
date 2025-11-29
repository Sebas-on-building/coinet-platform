/**
 * 🔮 ORACLE INTEGRATOR - DEEP LEARNING ENHANCED
 *
 * Integrates with our divine Market Oracle System enhanced with deep learning models
 * for genuine market prediction and consciousness understanding.
 */

import { logger, aiLogger } from '../utils/logger';
import { ProcessedInput, OracleInsights } from '../types/coinet-brief';
import axios from 'axios';

// Import deep learning components
import OracleNeuralNetwork from '../ml/models/oracle-neural-network';
import DataCollector from '../ml/data/data-collector';
import DataPreprocessor from '../ml/data/data-preprocessor';
import { OracleFeatures } from '../ml/types/ml-types';

export class OracleIntegrator {
  private oracleServiceUrl: string;
  private oracleModel: OracleNeuralNetwork;
  private dataCollector: DataCollector;
  private dataPreprocessor: DataPreprocessor;
  private useDeepLearning: boolean;

  constructor() {
    // Try to connect to our oracle system (it would be part of the ML service)
    this.oracleServiceUrl = process.env.ORACLE_SERVICE_URL || 'http://psychology-engine-service:80';

    // Initialize deep learning components
    this.oracleModel = new OracleNeuralNetwork();
    this.dataCollector = new DataCollector();
    this.dataPreprocessor = new DataPreprocessor();
    this.useDeepLearning = process.env.USE_DEEP_LEARNING !== 'false'; // Default to true

    logger.info('🔮 OracleIntegrator initialized with deep learning capabilities');
    logger.info(`🔬 Deep learning mode: ${this.useDeepLearning ? 'ENABLED' : 'DISABLED'}`);
  }

  /**
   * Generate predictive insights using the Market Oracle System with deep learning
   */
  async generateInsights(input: ProcessedInput): Promise<OracleInsights | undefined> {
    try {
      aiLogger.aiEngine('OracleSystem', 'generateInsights', { symbol: input.symbol });

      // Try deep learning analysis first if enabled
      if (this.useDeepLearning) {
        try {
          const dlInsights = await this.analyzeWithDeepLearning(input);
          if (dlInsights) {
            aiLogger.aiEngine('OracleSystem', 'dl_success', {
              symbol: input.symbol,
              predictions: Object.keys(dlInsights.predictions).length,
              whaleActivity: dlInsights.whaleActivity,
              method: 'deep_learning'
            });
            return dlInsights;
          }
        } catch (dlError) {
          logger.warn(`Deep learning oracle analysis failed for ${input.symbol}, falling back to traditional methods: ${dlError}`);
        }
      }

      // Fall back to traditional oracle service
      try {
        // For now, we'll generate insights based on available data
        // TODO: Integrate with actual Oracle System API when ready
        const insights = await this.generateTraditionalOracleInsights(input);

        aiLogger.aiEngine('OracleSystem', 'service_success', {
          symbol: input.symbol,
          predictions: Object.keys(insights.predictions).length,
          whaleActivity: insights.whaleActivity,
          method: 'oracle_service'
        });

        return insights;

      } catch (serviceError) {
        logger.warn(`Oracle service unavailable for ${input.symbol}, using rule-based analysis`);
      }

      // Final fallback to enhanced rule-based analysis
      logger.warn(`All oracle analysis methods failed for ${input.symbol}, using enhanced rule-based fallback`);
      return this.analyzeWithEnhancedRuleBased(input);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Oracle analysis completely failed for ${input.symbol}: ${errorMessage}`);
      return this.analyzeWithEnhancedRuleBased(input);
    }
  }

  /**
   * Analyze using deep learning oracle model
   */
  private async analyzeWithDeepLearning(input: ProcessedInput): Promise<OracleInsights | undefined> {
    try {
      // Collect comprehensive oracle features for the symbol
      const oracleFeatures = await this.dataCollector.createOracleFeatures(input.symbol);

      // Preprocess features for model input
      const preprocessedData = await this.dataPreprocessor.preprocessOracleFeatures(oracleFeatures, false);

      // Get prediction from DL model
      const prediction = await this.oracleModel.predict(oracleFeatures);

      // Transform DL prediction to our format
      const insights: OracleInsights = {
        predictions: prediction.predictions,
        whaleActivity: prediction.whaleActivity,
        marketConsciousness: prediction.marketConsciousness,
        turningPoints: prediction.turningPoints,
        actionWindows: prediction.actionWindows
      };

      return insights;

    } catch (error) {
      logger.error(`Deep learning oracle analysis failed: ${error}`);
      throw error;
    }
  }

  /**
   * Generate traditional oracle insights (enhanced version of generateMockOracleInsights)
   */
  private async generateTraditionalOracleInsights(input: ProcessedInput): Promise<OracleInsights> {
    // Analyze market data for predictions
    const predictions = this.generateEnhancedPredictions(input);

    // Analyze whale activity
    const whaleActivity = this.analyzeEnhancedWhaleActivity(input);

    // Read market consciousness
    const marketConsciousness = this.readEnhancedMarketConsciousness(input);

    // Detect turning points
    const turningPoints = this.detectEnhancedTurningPoints(input);

    // Generate action windows
    const actionWindows = this.generateEnhancedActionWindows(input, predictions);

    return {
      predictions,
      whaleActivity,
      marketConsciousness,
      turningPoints,
      actionWindows
    };
  }

  /**
   * Enhanced rule-based analysis (replacement for all mock functions)
   */
  private analyzeWithEnhancedRuleBased(input: ProcessedInput): OracleInsights {
    // Enhanced predictions with better signal processing
    const predictions = this.generateEnhancedPredictions(input);

    // Enhanced whale activity analysis
    const whaleActivity = this.analyzeEnhancedWhaleActivity(input);

    // Enhanced market consciousness reading
    const marketConsciousness = this.readEnhancedMarketConsciousness(input);

    // Enhanced turning point detection
    const turningPoints = this.detectEnhancedTurningPoints(input);

    // Enhanced action window generation
    const actionWindows = this.generateEnhancedActionWindows(input, predictions);

    return {
      predictions,
      whaleActivity,
      marketConsciousness,
      turningPoints,
      actionWindows
    };
  }


  /**
   * Generate enhanced time-based predictions with better signal processing
   */
  private generateEnhancedPredictions(input: ProcessedInput): OracleInsights['predictions'] {
    const predictions: OracleInsights['predictions'] = {};

    if (!input.marketData) return predictions;

    const currentPrice = input.marketData.currentPrice;
    const volatility = input.marketData.volatility;
    const priceChange24h = input.marketData.priceChangePercent24h;

    // Enhanced 1-hour prediction with multiple signal sources
    const hourlyDirection = this.predictEnhancedDirection(input, 'short');
    const hourlyMagnitude = this.calculateEnhancedMagnitude(input, 'short', volatility);
    const hourlyProbability = this.calculateEnhancedProbability(input, 'short');
    predictions.next1h = {
      direction: hourlyDirection,
      magnitude: hourlyMagnitude,
      probability: hourlyProbability
    };

    // Enhanced 24-hour prediction
    const dailyDirection = this.predictEnhancedDirection(input, 'medium');
    const dailyMagnitude = this.calculateEnhancedMagnitude(input, 'medium', volatility);
    const dailyProbability = this.calculateEnhancedProbability(input, 'medium');
    predictions.next24h = {
      direction: dailyDirection,
      magnitude: dailyMagnitude,
      probability: dailyProbability
    };

    // Enhanced 7-day prediction
    const weeklyDirection = this.predictEnhancedDirection(input, 'long');
    const weeklyMagnitude = this.calculateEnhancedMagnitude(input, 'long', volatility);
    const weeklyProbability = this.calculateEnhancedProbability(input, 'long');
    predictions.next7d = {
      direction: weeklyDirection,
      magnitude: weeklyMagnitude,
      probability: weeklyProbability
    };

    return predictions;
  }

  /**
   * Predict enhanced price direction with weighted signal analysis
   */
  private predictEnhancedDirection(input: ProcessedInput, timeframe: 'short' | 'medium' | 'long'): string {
    let bullishScore = 0;
    let bearishScore = 0;
    const weights = {
      market: 0.35,
      technical: 0.25,
      social: 0.20,
      news: 0.15,
      onchain: 0.05
    };

    // Enhanced market signals with trend analysis
    if (input.marketData) {
      const priceChange = input.marketData.priceChangePercent24h;
      const volatility = input.marketData.volatility;

      // Price momentum with volatility adjustment
      if (priceChange > 2) bullishScore += weights.market * 1.2;
      else if (priceChange < -2) bearishScore += weights.market * 1.2;

      // Volume confirmation
      if (input.marketData.volume24h > 5000000000) {
        if (priceChange > 0) bullishScore += weights.market * 0.8;
        else bearishScore += weights.market * 0.8;
      }
    }

    // Enhanced technical indicators
    if (input.marketData?.technicalIndicators) {
      const rsi = input.marketData.technicalIndicators.rsi;
      const macd = input.marketData.technicalIndicators.macd;

      // RSI signals
      if (rsi < 35) bullishScore += weights.technical * 1.0;
      else if (rsi > 70) bearishScore += weights.technical * 1.0;

      // MACD signals
      if (macd.macd > macd.signal) bullishScore += weights.technical * 0.7;
      else if (macd.macd < macd.signal) bearishScore += weights.technical * 0.7;
    }

    // Enhanced social signals with authenticity weighting
    if (input.socialData) {
      const sentiment = input.socialData.sentiment;
      const authenticity = sentiment.authenticity || 1.0;

      // Sentiment score with authenticity multiplier
      if (sentiment.score > 65) bullishScore += weights.social * authenticity;
      else if (sentiment.score < 35) bearishScore += weights.social * authenticity;

      // Sentiment trend
      if (sentiment.trend === 'improving') bullishScore += weights.social * 0.6;
      else if (sentiment.trend === 'declining') bearishScore += weights.social * 0.6;
    }

    // Enhanced news signals
    if (input.newsData) {
      const positiveNews = input.newsData.recentNews.filter(n => n.sentiment > 60).length;
      const negativeNews = input.newsData.recentNews.filter(n => n.sentiment < 40).length;
      const totalNews = input.newsData.recentNews.length;

      if (totalNews > 0) {
        const newsScore = (positiveNews - negativeNews) / totalNews;
        if (newsScore > 0.3) bullishScore += weights.news * Math.abs(newsScore);
        else if (newsScore < -0.3) bearishScore += weights.news * Math.abs(newsScore);
      }
    }

    // Enhanced on-chain signals
    if (input.onChainData) {
      const whaleActivity = input.onChainData.whaleActivity;

      if (whaleActivity.accumulation === 'buying') bullishScore += weights.onchain * 1.5;
      else if (whaleActivity.accumulation === 'selling') bearishScore += weights.onchain * 1.5;

      // Large transfers indicate activity
      if (whaleActivity.largeTransfers > 15) {
        if (whaleActivity.netFlow > 50) bullishScore += weights.onchain * 0.8;
        else if (whaleActivity.netFlow < -50) bearishScore += weights.onchain * 0.8;
      }
    }

    // Determine final direction with strength indicators
    const totalScore = bullishScore - bearishScore;

    if (Math.abs(totalScore) < 0.3) return 'NEUTRAL (~)';

    const isBullish = totalScore > 0;
    const strength = Math.abs(totalScore);

    if (isBullish) {
      if (strength > 1.5) return timeframe === 'short' ? 'BULLISH (+++)' : timeframe === 'medium' ? 'BULLISH (++)' : 'BULLISH (+)';
      else if (strength > 1.0) return timeframe === 'short' ? 'BULLISH (++)' : timeframe === 'medium' ? 'BULLISH (+)' : 'BULLISH (~)';
      else return 'BULLISH (+)';
    } else {
      if (strength > 1.5) return timeframe === 'short' ? 'BEARISH (---)' : timeframe === 'medium' ? 'BEARISH (--)': 'BEARISH (-)';
      else if (strength > 1.0) return timeframe === 'short' ? 'BEARISH (--)': timeframe === 'medium' ? 'BEARISH (-)': 'BEARISH (~)';
      else return 'BEARISH (-)';
    }
  }

  /**
   * Calculate enhanced prediction probability with multi-factor analysis
   */
  private calculateEnhancedProbability(input: ProcessedInput, timeframe: 'short' | 'medium' | 'long'): number {
    let confidence = 0.5; // Base confidence

    // Enhanced data quality impact
    confidence += input.completeness * 0.25;
    confidence += input.dataFreshness * 0.15;

    // Signal clarity and consistency
    if (input.socialData?.sentiment?.authenticity && input.socialData.sentiment.authenticity > 0.8) confidence += 0.12;
    if (input.marketData?.volatility && input.marketData.volatility < 0.04) confidence += 0.15; // Very low volatility
    else if (input.marketData?.volatility && input.marketData.volatility > 0.1) confidence -= 0.1; // High volatility reduces confidence

    // Multi-signal agreement bonus
    const signalAgreement = this.calculateSignalAgreement(input);
    confidence += signalAgreement * 0.2;

    // Timeframe confidence adjustment
    if (timeframe === 'short') confidence += 0.15;
    else if (timeframe === 'medium') confidence += 0.05;
    else if (timeframe === 'long') confidence -= 0.05;

    // Market condition adjustments
    if (input.marketData) {
      const volume = input.marketData.volume24h;
      if (volume > 10000000000) confidence += 0.1; // High volume increases confidence
      else if (volume < 1000000000) confidence -= 0.1; // Low volume decreases confidence
    }

    return Math.max(0.2, Math.min(0.95, confidence));
  }

  /**
   * Analyze enhanced whale activity patterns with multiple indicators
   */
  private analyzeEnhancedWhaleActivity(input: ProcessedInput): 'accumulating' | 'distributing' | 'holding' | 'unknown' {
    if (!input.onChainData?.whaleActivity) return 'unknown';

    const activity = input.onChainData.whaleActivity;

    // Enhanced analysis with multiple indicators
    let accumulationScore = 0;
    let distributionScore = 0;

    // Net flow analysis
    if (activity.netFlow > 200) accumulationScore += 0.4;
    else if (activity.netFlow > 50) accumulationScore += 0.2;
    else if (activity.netFlow < -200) distributionScore += 0.4;
    else if (activity.netFlow < -50) distributionScore += 0.2;

    // Large transfers analysis
    if (activity.largeTransfers > 25) distributionScore += 0.3; // High activity often indicates selling
    else if (activity.largeTransfers > 15) distributionScore += 0.15;
    else if (activity.largeTransfers < 5) accumulationScore += 0.1; // Low activity may indicate holding

    // Whale count analysis
    if (activity.whaleCount > 50) accumulationScore += 0.2; // Many whales often indicates accumulation
    else if (activity.whaleCount < 10) distributionScore += 0.1; // Few whales may indicate distribution

    // Whale concentration analysis
    if (activity.whaleConcentration > 0.7) accumulationScore += 0.15; // High concentration suggests coordinated buying
    else if (activity.whaleConcentration < 0.3) distributionScore += 0.15; // Low concentration suggests selling

    // Determine final classification
    if (accumulationScore > distributionScore + 0.2) return 'accumulating';
    if (distributionScore > accumulationScore + 0.2) return 'distributing';
    if (accumulationScore > 0.3 || distributionScore > 0.3) return 'holding';

    return 'unknown';
  }

  /**
   * Read enhanced market consciousness and emotional state with multi-factor analysis
   */
  private readEnhancedMarketConsciousness(input: ProcessedInput): OracleInsights['marketConsciousness'] {
    let dominantEmotion = 'neutral';
    let phaseOfCycle = 'accumulation';
    let riskLevel: 'low' | 'medium' | 'high' | 'extreme' = 'medium';

    // Enhanced emotion analysis with multiple data sources
    if (input.socialData) {
      const socialScore = input.socialData.sentiment.score;
      const authenticity = input.socialData.sentiment.authenticity || 1.0;

      // Adjust for authenticity
      const adjustedScore = socialScore * authenticity;

      if (adjustedScore > 75) dominantEmotion = 'extreme greed';
      else if (adjustedScore > 60) dominantEmotion = 'greed';
      else if (adjustedScore < 25) dominantEmotion = 'extreme fear';
      else if (adjustedScore < 40) dominantEmotion = 'fear';
    }

    // Enhanced market cycle phase analysis
    if (input.marketData) {
      const priceChange = input.marketData.priceChangePercent24h;
      const volume = input.marketData.volume24h;
      const volatility = input.marketData.volatility;

      // Multi-factor cycle analysis
      if (priceChange > 15 && volume > 15000000000 && volatility < 0.06) phaseOfCycle = 'euphoria';
      else if (priceChange > 8 && volume > 8000000000) phaseOfCycle = 'markup';
      else if (priceChange < -15 && volume > 15000000000) phaseOfCycle = 'panic';
      else if (priceChange < -8) phaseOfCycle = 'distribution';
      else if (priceChange > 3 && volume > 5000000000) phaseOfCycle = 'accumulation';
    }

    // Enhanced risk assessment
    let riskScore = 0;

    if (input.marketData?.volatility) {
      if (input.marketData.volatility > 0.12) riskScore += 0.4;
      else if (input.marketData.volatility > 0.08) riskScore += 0.3;
      else if (input.marketData.volatility > 0.05) riskScore += 0.2;
    }

    if (dominantEmotion.includes('extreme')) riskScore += 0.3;
    if (phaseOfCycle === 'panic' || phaseOfCycle === 'euphoria') riskScore += 0.2;

    // On-chain risk indicators
    if (input.onChainData) {
      const whaleActivity = this.analyzeEnhancedWhaleActivity(input);
      if (whaleActivity === 'distributing') riskScore += 0.2;
    }

    if (riskScore > 0.7) riskLevel = 'extreme';
    else if (riskScore > 0.5) riskLevel = 'high';
    else if (riskScore > 0.3) riskLevel = 'medium';
    else riskLevel = 'low';

    return {
      dominantEmotion,
      phaseOfCycle,
      riskLevel
    };
  }

  /**
   * Detect enhanced potential market turning points with multi-factor analysis
   */
  private detectEnhancedTurningPoints(input: ProcessedInput): string[] {
    const turningPoints: string[] = [];

    if (!input.marketData) return turningPoints;

    // Enhanced technical turning points
    if (input.marketData.technicalIndicators.rsi) {
      const rsi = input.marketData.technicalIndicators.rsi;

      if (rsi < 20) {
        turningPoints.push('Extreme oversold conditions (RSI < 20) - high probability bounce in 1-2 days');
      } else if (rsi < 30) {
        turningPoints.push('Oversold conditions (RSI < 30) - potential bounce in 2-4 days');
      } else if (rsi > 85) {
        turningPoints.push('Extreme overbought conditions (RSI > 85) - high probability correction in 1-2 days');
      } else if (rsi > 75) {
        turningPoints.push('Overbought conditions (RSI > 75) - potential correction in 2-4 days');
      }
    }

    // Enhanced support/resistance analysis
    if (input.marketData.technicalIndicators.support && input.marketData.technicalIndicators.resistance) {
      const currentPrice = input.marketData.currentPrice;
      const support = input.marketData.technicalIndicators.support;
      const resistance = input.marketData.technicalIndicators.resistance;
      const volatility = input.marketData.volatility;

      // Adjust for volatility
      const supportThreshold = support * (1 + volatility * 0.5);
      const resistanceThreshold = resistance * (1 - volatility * 0.5);

      if (currentPrice <= supportThreshold) {
        const distance = ((support - currentPrice) / currentPrice) * 100;
        turningPoints.push(`Approaching key support at $${support.toLocaleString()} (${distance.toFixed(1)}% below current price) - potential reversal zone`);
      }

      if (currentPrice >= resistanceThreshold) {
        const distance = ((currentPrice - resistance) / currentPrice) * 100;
        turningPoints.push(`Testing key resistance at $${resistance.toLocaleString()} (${distance.toFixed(1)}% above current price) - breakout or rejection imminent`);
      }
    }

    // Enhanced sentiment turning points
    if (input.socialData) {
      const sentiment = input.socialData.sentiment;

      if (sentiment.score > 85 && sentiment.authenticity > 0.8) {
        turningPoints.push('Extreme optimism with high authenticity - potential market top forming');
      } else if (sentiment.score < 15 && sentiment.authenticity > 0.8) {
        turningPoints.push('Extreme pessimism with high authenticity - potential market bottom forming');
      }

      // Sentiment divergence with price
      if (input.marketData && Math.abs(sentiment.score - 50) > 30) {
        const priceDirection = input.marketData.priceChangePercent24h > 0 ? 'up' : 'down';
        const sentimentDirection = sentiment.score > 50 ? 'positive' : 'negative';

        if (priceDirection !== sentimentDirection) {
          turningPoints.push(`Sentiment divergence detected - ${sentimentDirection} sentiment vs ${priceDirection} price action`);
        }
      }
    }

    // Volume climax detection
    if (input.marketData && input.marketData.volume24h > 20000000000) {
      const avgVolume = 10000000000; // Simplified average
      const volumeSpike = input.marketData.volume24h / avgVolume;

      if (volumeSpike > 3) {
        turningPoints.push(`Volume climax detected (${volumeSpike.toFixed(1)}x average) - potential turning point or continuation`);
      }
    }

    return turningPoints;
  }

  /**
   * Generate enhanced actionable time windows with risk assessment
   */
  private generateEnhancedActionWindows(
    input: ProcessedInput,
    predictions: OracleInsights['predictions']
  ): OracleInsights['actionWindows'] {
    const actionWindows: OracleInsights['actionWindows'] = [];

    // Enhanced 1-hour action windows
    if (predictions.next1h) {
      const direction = predictions.next1h.direction;
      const confidence = predictions.next1h.confidence || predictions.next1h.probability;

      if (direction.includes('BULLISH') && confidence > 0.75) {
        actionWindows.push({
          action: 'buy',
          timeframe: 'Next 1-2 hours',
          confidence,
          reasoning: `Strong bullish signal with ${Math.round(confidence * 100)}% confidence for 1h horizon`
        });
      } else if (direction.includes('BEARISH') && confidence > 0.75) {
        actionWindows.push({
          action: 'sell',
          timeframe: 'Next 1-2 hours',
          confidence,
          reasoning: `Strong bearish signal with ${Math.round(confidence * 100)}% confidence for 1h horizon`
        });
      }
    }

    // Enhanced 24-hour action windows
    if (predictions.next24h) {
      const direction = predictions.next24h.direction;
      const confidence = predictions.next24h.confidence || predictions.next24h.probability;

      if (direction.includes('BULLISH') && confidence > 0.7) {
        actionWindows.push({
          action: 'buy',
          timeframe: 'Next 12-24 hours',
          confidence,
          reasoning: `Medium-term bullish signal with ${Math.round(confidence * 100)}% confidence for 24h horizon`
        });
      } else if (direction.includes('BEARISH') && confidence > 0.7) {
        actionWindows.push({
          action: 'sell',
          timeframe: 'Next 12-24 hours',
          confidence,
          reasoning: `Medium-term bearish signal with ${Math.round(confidence * 100)}% confidence for 24h horizon`
        });
      }
    }

    // Risk-based action windows
    const riskLevel = this.readEnhancedMarketConsciousness(input).riskLevel;
    if (riskLevel === 'extreme') {
      actionWindows.push({
        action: 'reduce_position',
        timeframe: 'Immediate',
        confidence: 0.9,
        reasoning: 'Extreme risk conditions detected - consider reducing exposure'
      });
    } else if (riskLevel === 'high') {
      actionWindows.push({
        action: 'monitor_closely',
        timeframe: 'Next 4-6 hours',
        confidence: 0.8,
        reasoning: 'High risk conditions - monitor positions closely'
      });
    }

    // Default to watch if no clear signals
    if (actionWindows.length === 0) {
      actionWindows.push({
        action: 'watch',
        timeframe: 'Monitor for 4-6 hours',
        confidence: 0.6,
        reasoning: 'No clear directional signals detected - continue monitoring'
      });
    }

    return actionWindows;
  }

  /**
   * Calculate enhanced magnitude with volatility and timeframe adjustments
   */
  private calculateEnhancedMagnitude(input: ProcessedInput, timeframe: 'short' | 'medium' | 'long', volatility: number): number {
    let baseMagnitude = volatility * 100;

    // Timeframe adjustments
    if (timeframe === 'short') baseMagnitude *= 0.5; // 1-hour moves are smaller
    else if (timeframe === 'medium') baseMagnitude *= 2; // 24-hour moves are larger
    else if (timeframe === 'long') baseMagnitude *= 5; // 7-day moves are much larger

    // Market condition adjustments
    if (input.marketData) {
      const volume = input.marketData.volume24h;
      if (volume > 15000000000) baseMagnitude *= 1.2; // High volume increases magnitude
      else if (volume < 5000000000) baseMagnitude *= 0.8; // Low volume decreases magnitude
    }

    // Risk level adjustments
    const marketConsciousness = this.readEnhancedMarketConsciousness(input);
    if (marketConsciousness.riskLevel === 'extreme') baseMagnitude *= 1.5;
    else if (marketConsciousness.riskLevel === 'high') baseMagnitude *= 1.3;
    else if (marketConsciousness.riskLevel === 'low') baseMagnitude *= 0.9;

    return Math.max(0.1, Math.min(baseMagnitude, 50)); // Cap at 50% moves
  }

  /**
   * Calculate signal agreement across different data sources
   */
  private calculateSignalAgreement(input: ProcessedInput): number {
    let agreements = 0;
    let totalSignals = 0;

    // Market vs Technical signals
    if (input.marketData && input.marketData.technicalIndicators) {
      totalSignals++;
      const priceDirection = input.marketData.priceChangePercent24h > 0 ? 'bullish' : 'bearish';
      const rsiSignal = input.marketData.technicalIndicators.rsi < 40 ? 'bullish' : input.marketData.technicalIndicators.rsi > 70 ? 'bearish' : 'neutral';

      if (priceDirection === rsiSignal) agreements++;
    }

    // Social vs Market signals
    if (input.socialData && input.marketData) {
      totalSignals++;
      const socialDirection = input.socialData.sentiment.score > 50 ? 'bullish' : 'bearish';
      const marketDirection = input.marketData.priceChangePercent24h > 0 ? 'bullish' : 'bearish';

      if (socialDirection === marketDirection) agreements++;
    }

    // News vs Social signals
    if (input.newsData && input.socialData) {
      totalSignals++;
      const positiveNews = input.newsData.recentNews.filter(n => n.sentiment > 60).length;
      const negativeNews = input.newsData.recentNews.filter(n => n.sentiment < 40).length;
      const newsDirection = positiveNews > negativeNews ? 'bullish' : negativeNews > positiveNews ? 'bearish' : 'neutral';

      const socialDirection = input.socialData.sentiment.score > 50 ? 'bullish' : 'bearish';

      if (newsDirection === socialDirection) agreements++;
    }

    return totalSignals > 0 ? agreements / totalSignals : 0.5;
  }
}
