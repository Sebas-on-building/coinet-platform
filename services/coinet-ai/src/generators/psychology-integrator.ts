/**
 * 🧠 PSYCHOLOGY INTEGRATOR - DEEP LEARNING ENHANCED
 *
 * Integrates with our divine CryptoPsychologyEngine enhanced with deep learning models
 * for genuine market psychology understanding and manipulation protection.
 */

import { logger, aiLogger } from '../utils/logger';
import { ProcessedInput, PsychologyInsights } from '../types/coinet-brief';
import axios from 'axios';

// Import deep learning components
import PsychologyTransformer from '../ml/models/psychology-transformer';
import DataCollector from '../ml/data/data-collector';
import DataPreprocessor from '../ml/data/data-preprocessor';
import { PsychologyFeatures } from '../ml/types/ml-types';

export class PsychologyIntegrator {
  private psychologyServiceUrl: string;
  private psychologyModel: PsychologyTransformer;
  private dataCollector: DataCollector;
  private dataPreprocessor: DataPreprocessor;
  private useDeepLearning: boolean;

  constructor() {
    // Try to connect to our psychology engine service
    this.psychologyServiceUrl = process.env.PSYCHOLOGY_SERVICE_URL || 'http://psychology-engine-service:80';

    // Initialize deep learning components
    this.psychologyModel = new PsychologyTransformer();
    this.dataCollector = new DataCollector();
    this.dataPreprocessor = new DataPreprocessor();
    this.useDeepLearning = process.env.USE_DEEP_LEARNING !== 'false'; // Default to true

    logger.info('🧠 PsychologyIntegrator initialized with deep learning capabilities');
    logger.info(`🔬 Deep learning mode: ${this.useDeepLearning ? 'ENABLED' : 'DISABLED'}`);
  }

  /**
   * Analyze psychological patterns in the input and context using deep learning
   */
  async analyze(input: ProcessedInput): Promise<PsychologyInsights | undefined> {
    try {
      aiLogger.aiEngine('PsychologyEngine', 'analyze', { symbol: input.symbol });

      // Try deep learning analysis first if enabled
      if (this.useDeepLearning) {
        try {
          const dlInsights = await this.analyzeWithDeepLearning(input);
          if (dlInsights) {
            aiLogger.aiEngine('PsychologyEngine', 'dl_success', {
              symbol: input.symbol,
              manipulationRisk: dlInsights.manipulationRisk,
              warningsCount: dlInsights.warnings.length,
              method: 'deep_learning'
            });
            return dlInsights;
          }
        } catch (dlError) {
          logger.warn(`Deep learning analysis failed for ${input.symbol}, falling back to traditional methods: ${dlError}`);
        }
      }

      // Fall back to traditional psychology engine service
      try {
        const psychologyInput = {
          input_text: this.prepareInputText(input),
          input_type: this.mapInputType(input.detectedType),
          context: {
            market: input.marketData,
            social: input.socialData,
            temporal: {
              timestamp: input.processedAt.toISOString()
            }
          },
          user_profile: {
            user_id: 'default_user',
            risk_tolerance: 'moderate'
          }
        };

        const response = await axios.post(`${this.psychologyServiceUrl}/analyze`, psychologyInput, {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.data.success) {
          const psychologyResult = response.data.data;

          const insights: PsychologyInsights = {
            warnings: psychologyResult.warnings || [],
            manipulationRisk: this.mapManipulationRisk(psychologyResult.manipulation_risk || 'low'),
            biasDetected: psychologyResult.bias_detected || [],
            emotionalState: this.mapEmotionalState(psychologyResult.emotional_state || 'neutral'),
            coolingOffSuggested: psychologyResult.cooling_off_suggested || false,
            contrarian: psychologyResult.contrarian_signal ? {
              signal: true,
              reason: psychologyResult.contrarian_reason || 'Contrarian opportunity detected'
            } : undefined
          };

          aiLogger.aiEngine('PsychologyEngine', 'service_success', {
            symbol: input.symbol,
            manipulationRisk: insights.manipulationRisk,
            warningsCount: insights.warnings.length,
            method: 'psychology_service'
          });

          return insights;
        }
      } catch (serviceError) {
        logger.warn(`Psychology service unavailable for ${input.symbol}, using rule-based analysis`);
      }

      // Final fallback to rule-based analysis (formerly getMockPsychologyInsights)
      logger.warn(`All psychology analysis methods failed for ${input.symbol}, using rule-based fallback`);
      return this.analyzeWithRuleBasedHeuristics(input);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Psychology analysis completely failed for ${input.symbol}: ${errorMessage}`);
      return this.analyzeWithRuleBasedHeuristics(input);
    }
  }

  /**
   * Analyze using deep learning models
   */
  private async analyzeWithDeepLearning(input: ProcessedInput): Promise<PsychologyInsights | undefined> {
    try {
      // Collect comprehensive features for the symbol
      const psychologyFeatures = await this.dataCollector.createPsychologyFeatures(input.symbol);

      // Preprocess features for model input
      const preprocessedData = await this.dataPreprocessor.preprocessPsychologyFeatures(psychologyFeatures, false);

      // Get prediction from DL model
      const prediction = await this.psychologyModel.predict(psychologyFeatures);

      // Transform DL prediction to our format
      const insights: PsychologyInsights = {
        warnings: prediction.warnings.messages,
        manipulationRisk: prediction.manipulationRisk.prediction,
        biasDetected: prediction.biases.detected,
        emotionalState: prediction.emotionalState.prediction,
        coolingOffSuggested: prediction.marketPsychology.coolingOffSuggested,
        contrarian: prediction.marketPsychology.contrarianSignal ? {
          signal: true,
          reason: `${prediction.emotionalState.prediction} suggests potential reversal opportunity`
        } : undefined
      };

      return insights;

    } catch (error) {
      logger.error(`Deep learning psychology analysis failed: ${error}`);
      throw error;
    }
  }

  /**
   * Rule-based heuristic analysis (replacement for getMockPsychologyInsights)
   */
  private analyzeWithRuleBasedHeuristics(input: ProcessedInput): PsychologyInsights {
    const warnings: string[] = [];
    let manipulationRisk: 'low' | 'medium' | 'high' | 'extreme' = 'low';
    let emotionalState: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed' = 'neutral';

    // Enhanced rule-based heuristics (improved version of original getMockPsychologyInsights)
    if (input.socialData?.sentiment?.authenticity && input.socialData.sentiment.authenticity < 0.7) {
      warnings.push('Low social sentiment authenticity detected - potential manipulation');
      manipulationRisk = 'medium';
    }

    if (input.socialData?.sentiment?.score && input.socialData.sentiment.score > 80) {
      emotionalState = 'extreme_greed';
      warnings.push('Extremely positive sentiment may indicate FOMO or market euphoria');
    } else if (input.socialData?.sentiment?.score && input.socialData.sentiment.score < 20) {
      emotionalState = 'extreme_fear';
      warnings.push('Extremely negative sentiment may indicate panic selling or capitulation');
    }

    if (input.marketData?.volatility && input.marketData.volatility > 0.08) {
      warnings.push('High volatility may amplify emotional decision-making and lead to irrational behavior');
      if (manipulationRisk === 'low') manipulationRisk = 'medium';
    }

    // Enhanced bias detection based on multiple signals
    const detectedBiases: string[] = [];
    if (warnings.length > 2) {
      detectedBiases.push('confirmation_bias', 'herd_mentality');
    }
    if (emotionalState === 'extreme_greed' || emotionalState === 'extreme_fear') {
      detectedBiases.push('loss_aversion');
    }

    return {
      warnings,
      manipulationRisk,
      biasDetected: detectedBiases,
      emotionalState,
      coolingOffSuggested: warnings.length > 2 || emotionalState !== 'neutral',
      contrarian: (emotionalState === 'extreme_fear' || emotionalState === 'extreme_greed') ? {
        signal: true,
        reason: `Extreme ${emotionalState === 'extreme_fear' ? 'fear' : 'greed'} suggests potential reversal opportunity - consider contrarian approach`
      } : undefined
    };
  }

  /**
   * Prepare input text for psychology analysis
   */
  private prepareInputText(input: ProcessedInput): string {
    const parts = [input.originalInput.content];

    // Add relevant context
    if (input.socialData?.topMentions) {
      const topMention = input.socialData.topMentions[0];
      if (topMention) {
        parts.push(topMention.content);
      }
    }

    if (input.newsData?.recentNews) {
      const topNews = input.newsData.recentNews[0];
      if (topNews) {
        parts.push(topNews.title + ': ' + topNews.summary);
      }
    }

    return parts.join('\n\n');
  }

  /**
   * Map our input types to psychology engine types
   */
  private mapInputType(inputType: string): string {
    const typeMap: Record<string, string> = {
      'ticker': 'ticker',
      'url': 'link',
      'thread': 'thread',
      'question': 'question',
      'news': 'link'
    };

    return typeMap[inputType] || 'question';
  }

  /**
   * Map psychology engine manipulation risk to our format
   */
  private mapManipulationRisk(risk: string): 'low' | 'medium' | 'high' | 'extreme' {
    const riskMap: Record<string, 'low' | 'medium' | 'high' | 'extreme'> = {
      'low': 'low',
      'medium': 'medium',
      'high': 'high',
      'extreme': 'extreme'
    };

    return riskMap[risk.toLowerCase()] || 'low';
  }

  /**
   * Map psychology engine emotional state to our format
   */
  private mapEmotionalState(state: string): 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed' {
    const stateMap: Record<string, 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed'> = {
      'extreme_fear': 'extreme_fear',
      'fear': 'fear',
      'neutral': 'neutral',
      'greed': 'greed',
      'extreme_greed': 'extreme_greed'
    };

    return stateMap[state.toLowerCase()] || 'neutral';
  }

}
