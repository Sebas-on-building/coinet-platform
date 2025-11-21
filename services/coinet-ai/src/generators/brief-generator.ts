/**
 * 🎯 DIVINE BRIEF GENERATOR ENGINE
 * 
 * This is the heart of Coinet AI - where enriched input data is transformed
 * into structured, actionable crypto insights through divine orchestration.
 * 
 * DIVINE ARCHITECTURE:
 * - Professional thesis generation
 * - Multi-dimensional risk assessment
 * - Catalyst identification and timing
 * - Authentic sentiment synthesis
 * - Executive TL;DR creation
 * - Transparent source attribution
 * - Psychology-enhanced protection
 * - Oracle-powered predictions
 * 
 * TRANSFORMATION FLOW:
 * ProcessedInput → Context Analysis → AI Orchestration → Structured Brief
 */

import { logger, aiLogger } from '../utils/logger';
import { 
  ProcessedInput, 
  CoinetBrief, 
  Risk, 
  Catalyst, 
  SentimentAnalysis, 
  Source,
  PsychologyInsights,
  OracleInsights,
  validateCoinetBrief 
} from '../types/coinet-brief';
import { AnalysisEngine } from './analysis-engine';
import { PsychologyIntegrator } from './psychology-integrator';
import { OracleIntegrator } from './oracle-integrator';
import { SourceManager } from './source-manager';
import { v4 as uuidv4 } from 'uuid';

export interface BriefGenerationOptions {
  analysisDepth: 'quick' | 'standard' | 'deep';
  includePsychology: boolean;
  includeOracle: boolean;
  confidenceThreshold: number;
  maxRisks: number;
  maxCatalysts: number;
}

export class BriefGenerator {
  private analysisEngine: AnalysisEngine;
  private psychologyIntegrator: PsychologyIntegrator;
  private oracleIntegrator: OracleIntegrator;
  private sourceManager: SourceManager;

  constructor() {
    this.analysisEngine = new AnalysisEngine();
    this.psychologyIntegrator = new PsychologyIntegrator();
    this.oracleIntegrator = new OracleIntegrator();
    this.sourceManager = new SourceManager();

    logger.info('🎯 BriefGenerator initialized with divine orchestration');
  }

  /**
   * 🌟 DIVINE BRIEF GENERATION
   * 
   * Main orchestration method that transforms ProcessedInput into CoinetBrief
   */
  async generateBrief(
    processedInput: ProcessedInput,
    options: Partial<BriefGenerationOptions> = {}
  ): Promise<CoinetBrief> {
    const startTime = Date.now();
    const briefId = uuidv4();
    
    // Set default options
    const fullOptions: BriefGenerationOptions = {
      analysisDepth: 'standard',
      includePsychology: true,
      includeOracle: true,
      confidenceThreshold: 0.6,
      maxRisks: 5,
      maxCatalysts: 3,
      ...options
    };

    try {
      aiLogger.aiEngine('BriefGenerator', 'generateBrief', {
        briefId,
        symbol: processedInput.symbol,
        inputType: processedInput.detectedType,
        options: fullOptions
      });

      // 1. Generate core analysis components in parallel
      const [
        thesis,
        risks,
        catalysts,
        sentiment,
        sources
      ] = await Promise.all([
        this.generateThesis(processedInput, fullOptions),
        this.generateRisks(processedInput, fullOptions),
        this.generateCatalysts(processedInput, fullOptions),
        this.generateSentiment(processedInput, fullOptions),
        this.sourceManager.compileSources(processedInput)
      ]);

      // 2. Enhanced AI insights (parallel execution)
      const [psychologyInsights, oracleInsights] = await Promise.all([
        fullOptions.includePsychology 
          ? this.psychologyIntegrator.analyze(processedInput)
          : Promise.resolve(undefined),
        fullOptions.includeOracle 
          ? this.oracleIntegrator.generateInsights(processedInput)
          : Promise.resolve(undefined)
      ]);

      // 3. Apply psychology protection to the analysis
      const protectedAnalysis = await this.applyPsychologyProtection({
        thesis,
        risks,
        catalysts,
        sentiment,
        sources
      }, psychologyInsights);

      // 4. Generate executive TL;DR
      const tldr = await this.generateTLDR(
        protectedAnalysis.thesis,
        protectedAnalysis.risks,
        protectedAnalysis.catalysts,
        protectedAnalysis.sentiment,
        oracleInsights
      );

      // 5. Calculate overall recommendation and confidence
      const recommendation = this.calculateRecommendation(
        protectedAnalysis.sentiment,
        protectedAnalysis.risks,
        protectedAnalysis.catalysts,
        oracleInsights
      );

      const confidence = this.calculateConfidence(
        processedInput,
        protectedAnalysis.sentiment,
        psychologyInsights,
        oracleInsights
      );

      // 6. Assemble the final brief
      const brief: CoinetBrief = {
        symbol: processedInput.symbol,
        briefId,
        timestamp: new Date(),
        
        // Core outputs
        thesis: protectedAnalysis.thesis,
        risks: protectedAnalysis.risks,
        catalysts: protectedAnalysis.catalysts,
        sentiment: protectedAnalysis.sentiment,
        tldr,
        sources: protectedAnalysis.sources,
        
        // Enhanced insights
        psychologyInsights,
        oracleInsights,
        
        // Metadata
        recommendation,
        confidence,
        analysisDepth: fullOptions.analysisDepth,
        processingTime: Date.now() - startTime,
        
        // Provenance
        processedFrom: processedInput.originalInput,
        modelVersions: {
          psychology: psychologyInsights ? '1.0.0' : undefined,
          oracle: oracleInsights ? '1.0.0' : undefined,
          context: '1.0.0'
        }
      };

      // 7. Validate the generated brief
      let validatedBrief: CoinetBrief;
      try {
        validatedBrief = validateCoinetBrief(brief);
      } catch (validationError) {
        logger.error(`❌ Brief validation failed for ${brief.symbol}:`, validationError);
        if (validationError instanceof Error && 'validationErrors' in validationError) {
          logger.error('🔍 Validation details:', (validationError as any).validationErrors.errors);
        }
        throw validationError;
      }

      const processingTime = Date.now() - startTime;
      aiLogger.performance('generateBrief', processingTime, {
        briefId,
        symbol: processedInput.symbol,
        confidence,
        recommendation
      });

      logger.info(`✅ Brief generated successfully [${briefId}] in ${processingTime}ms - ${processedInput.symbol} (${recommendation}, ${Math.round(confidence * 100)}% confidence)`);

      return validatedBrief;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      aiLogger.error('generateBrief', error as Error, {
        briefId,
        symbol: processedInput.symbol,
        processingTime
      });
      throw new Error(`Brief generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 📝 THESIS GENERATION
   * 
   * Creates a professional investment thesis based on all available data
   */
  private async generateThesis(
    input: ProcessedInput,
    options: BriefGenerationOptions
  ): Promise<string> {
    try {
      aiLogger.aiEngine('AnalysisEngine', 'generateThesis', { symbol: input.symbol });

      const thesisElements = [];

      // Market context
      if (input.marketData) {
        const priceDirection = input.marketData.priceChangePercent24h > 0 ? 'upward' : 'downward';
        const volatilityLevel = input.marketData.volatility > 0.05 ? 'elevated' : 'moderate';
        
        thesisElements.push(
          `${input.symbol} demonstrates ${priceDirection} momentum with ${volatilityLevel} volatility, ` +
          `currently trading at $${input.marketData.currentPrice.toLocaleString()}`
        );
      }

      // Fundamental strength
      if (input.newsData?.recentNews && input.newsData.recentNews.length > 0) {
        const positiveNews = input.newsData.recentNews.filter(n => n.sentiment > 60).length;
        const totalNews = input.newsData.recentNews.length;
        
        if (positiveNews / totalNews > 0.6) {
          thesisElements.push(
            'supported by predominantly positive fundamental developments and improving narrative sentiment'
          );
        } else {
          thesisElements.push(
            'facing mixed fundamental pressures with varied market sentiment'
          );
        }
      }

      // Social and adoption signals
      if (input.socialData) {
        const socialTrend = input.socialData.sentiment.trend;
        const authenticity = input.socialData.sentiment.authenticity;
        
        if (authenticity > 0.8) {
          thesisElements.push(
            `while authentic social sentiment trends ${socialTrend}, indicating genuine community engagement`
          );
        } else {
          thesisElements.push(
            `though social sentiment shows potential manipulation concerns requiring cautious interpretation`
          );
        }
      }

      // On-chain health
      if (input.onChainData) {
        const whaleDirection = input.onChainData.whaleActivity.accumulation;
        thesisElements.push(
          `Network fundamentals remain robust with whale activity showing ${whaleDirection} behavior, ` +
          `reflecting institutional sentiment alignment`
        );
      }

      // Investment conclusion
      const riskLevel = (input.marketData?.volatility || 0) > 0.06 ? 'elevated' : 'moderate';
      thesisElements.push(
        `This positions ${input.symbol} as a ${riskLevel}-risk opportunity with ` +
        `${options.analysisDepth === 'deep' ? 'compelling long-term' : 'tactical'} investment merit`
      );

      const thesis = thesisElements.join(', ') + '.';
      
      // Ensure thesis meets quality standards
      if (thesis.length < 100) {
        return `${input.symbol} presents a balanced investment opportunity with mixed signals across technical, fundamental, and sentiment indicators, requiring careful position sizing and risk management in current market conditions.`;
      }

      return thesis;

    } catch (error) {
      logger.warn(`⚠️ Thesis generation failed for ${input.symbol}, using fallback`);
      return `${input.symbol} requires careful analysis across multiple dimensions before making investment decisions in current market conditions.`;
    }
  }

  /**
   * ⚠️ RISK ASSESSMENT GENERATION
   * 
   * Identifies and categorizes multiple risk vectors
   */
  private async generateRisks(
    input: ProcessedInput,
    options: BriefGenerationOptions
  ): Promise<Risk[]> {
    const risks: Risk[] = [];

    try {
      // Market risks
      if (input.marketData) {
        if (input.marketData.volatility > 0.06) {
          risks.push({
            category: 'market',
            severity: 'high',
            probability: 'high',
            description: `High volatility (${Math.round(input.marketData.volatility * 100)}%) indicates significant price swings possible`,
            mitigation: 'Use smaller position sizes and wider stop losses',
            timeframe: 'days'
          });
        }

        if (Math.abs(input.marketData.priceChangePercent24h) > 10) {
          risks.push({
            category: 'market',
            severity: 'medium',
            probability: 'medium',
            description: 'Recent large price movement may indicate overbought/oversold conditions',
            mitigation: 'Wait for price consolidation before entry',
            timeframe: 'hours'
          });
        }
      }

      // Regulatory risks
      if (input.newsData?.recentNews.some(n => n.title.toLowerCase().includes('regulation'))) {
        risks.push({
          category: 'regulatory',
          severity: 'medium',
          probability: 'medium',
          description: 'Regulatory developments in focus may impact price direction',
          mitigation: 'Monitor regulatory announcements and policy changes',
          timeframe: 'weeks'
        });
      }

      // Technical risks
      if (input.marketData?.technicalIndicators.rsi && input.marketData.technicalIndicators.rsi > 80) {
        risks.push({
          category: 'technical',
          severity: 'medium',
          probability: 'high',
          description: 'Overbought technical conditions suggest potential correction',
          mitigation: 'Consider taking profits or reducing exposure',
          timeframe: 'days'
        });
      }

      // Social manipulation risks
      if (input.socialData?.sentiment?.authenticity && input.socialData.sentiment.authenticity < 0.7) {
        risks.push({
          category: 'psychological',
          severity: 'high',
          probability: 'medium',
          description: 'Low sentiment authenticity suggests potential manipulation campaigns',
          mitigation: 'Verify information from multiple credible sources',
          timeframe: 'hours'
        });
      }

      // On-chain concentration risks
      if (input.onChainData?.whaleActivity?.largeTransfers && input.onChainData.whaleActivity.largeTransfers > 50) {
        risks.push({
          category: 'market',
          severity: 'medium',
          probability: 'medium',
          description: 'High whale activity may indicate large position changes imminent',
          mitigation: 'Monitor whale flows and exchange balances',
          timeframe: 'days'
        });
      }

      // Ensure we have at least one risk
      if (risks.length === 0) {
        risks.push({
          category: 'market',
          severity: 'medium',
          probability: 'medium',
          description: 'General cryptocurrency market volatility and regulatory uncertainty',
          mitigation: 'Diversify holdings and use appropriate position sizing',
          timeframe: 'weeks'
        });
      }

      return risks.slice(0, options.maxRisks).sort((a, b) => {
        const severityOrder: Record<string, number> = { extreme: 4, high: 3, medium: 2, low: 1 };
        return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
      });

    } catch (error) {
      logger.warn(`⚠️ Risk generation failed for ${input.symbol}, using default`);
      return [{
        category: 'market',
        severity: 'medium',
        probability: 'medium',
        description: 'Standard cryptocurrency market risks apply',
        mitigation: 'Use proper risk management and position sizing',
        timeframe: 'weeks'
      }];
    }
  }

  /**
   * 🚀 CATALYST IDENTIFICATION
   * 
   * Identifies potential price drivers and their timing
   */
  private async generateCatalysts(
    input: ProcessedInput,
    options: BriefGenerationOptions
  ): Promise<Catalyst[]> {
    const catalysts: Catalyst[] = [];

    try {
      // News-based catalysts
      if (input.newsData?.recentNews) {
        for (const news of input.newsData.recentNews) {
          if (news.impact === 'high' && news.sentiment > 70) {
            const timeframe = this.getTimeframeFromNews(news.title);
            catalysts.push({
              type: 'fundamental',
              impact: news.impact,
              timeframe,
              probability: news.credibility > 0.8 ? 'high' : 'medium',
              description: news.summary,
              priceTarget: input.marketData ? input.marketData.currentPrice * 1.15 : undefined
            });
          }
        }
      }

      // Technical catalysts
      if (input.marketData?.technicalIndicators) {
        const indicators = input.marketData.technicalIndicators;
        
        if (indicators.rsi && indicators.rsi < 30) {
          catalysts.push({
            type: 'technical',
            impact: 'medium',
            timeframe: 'days',
            probability: 'medium',
            description: 'Oversold RSI conditions suggest potential bounce',
            priceTarget: input.marketData.currentPrice * 1.08
          });
        }

        if (indicators.resistance && input.marketData.currentPrice > indicators.resistance * 0.98) {
          catalysts.push({
            type: 'technical',
            impact: 'high',
            timeframe: 'hours',
            probability: 'medium',
            description: `Approaching key resistance at $${indicators.resistance.toLocaleString()}, breakout potential`,
            priceTarget: indicators.resistance * 1.12
          });
        }
      }

      // Sentiment catalysts
      if (input.socialData?.sentiment) {
        if (input.socialData.sentiment.trend === 'improving' && input.socialData.sentiment.score > 75) {
          catalysts.push({
            type: 'sentiment',
            impact: 'medium',
            timeframe: 'days',
            probability: 'medium',
            description: 'Strong positive sentiment momentum building community support'
          });
        }
      }

      // On-chain catalysts
      if (input.onChainData?.whaleActivity.accumulation === 'buying') {
        catalysts.push({
          type: 'fundamental',
          impact: 'high',
          timeframe: 'weeks',
          probability: 'medium',
          description: 'Whale accumulation indicates institutional confidence',
          priceTarget: input.marketData ? input.marketData.currentPrice * 1.20 : undefined
        });
      }

      // Market structure catalysts
      if (input.marketData?.volume24h && input.marketData.volume24h > 10000000000) { // >$10B volume
        catalysts.push({
          type: 'market',
          impact: 'medium',
          timeframe: 'days',
          probability: 'high',
          description: 'Elevated trading volume indicates increased institutional participation'
        });
      }

      return catalysts.slice(0, options.maxCatalysts).sort((a, b) => {
        const impactOrder = { high: 3, medium: 2, low: 1 };
        return impactOrder[b.impact] - impactOrder[a.impact];
      });

    } catch (error) {
      logger.warn(`⚠️ Catalyst generation failed for ${input.symbol}, using default`);
      return [];
    }
  }

  /**
   * 💭 SENTIMENT SYNTHESIS
   * 
   * Aggregates multi-source sentiment with authenticity assessment
   */
  private async generateSentiment(
    input: ProcessedInput,
    options: BriefGenerationOptions
  ): Promise<SentimentAnalysis> {
    try {
      let aggregatedScore = 50; // Neutral baseline
      let aggregatedTrend: 'improving' | 'stable' | 'declining' = 'stable';
      let aggregatedAuthenticity = 0.8;
      const drivers: string[] = [];
      const warnings: string[] = [];

      // Social sentiment
      if (input.socialData?.sentiment) {
        aggregatedScore = (aggregatedScore + input.socialData.sentiment.score) / 2;
        aggregatedTrend = input.socialData.sentiment.trend;
        aggregatedAuthenticity = Math.min(aggregatedAuthenticity, input.socialData.sentiment.authenticity);
        
        if (input.socialData.sentiment.score > 70) {
          drivers.push('positive social media sentiment');
        } else if (input.socialData.sentiment.score < 30) {
          drivers.push('negative social media sentiment');
        }

        if (input.socialData.sentiment.authenticity < 0.7) {
          warnings.push('potential sentiment manipulation detected');
        }
      }

      // News sentiment
      if (input.newsData?.recentNews) {
        const newsScores = input.newsData.recentNews.map(n => n.sentiment);
        const avgNewsScore = newsScores.reduce((a, b) => a + b, 0) / newsScores.length;
        aggregatedScore = (aggregatedScore + avgNewsScore) / 2;

        const positiveNews = input.newsData.recentNews.filter(n => n.sentiment > 60).length;
        if (positiveNews > input.newsData.recentNews.length * 0.6) {
          drivers.push('positive news developments');
        }
      }

      // Market sentiment (price action)
      if (input.marketData) {
        const priceScore = input.marketData.priceChangePercent24h > 0 ? 65 : 35;
        aggregatedScore = (aggregatedScore + priceScore) / 2;

        if (input.marketData.priceChangePercent24h > 5) {
          drivers.push('strong price momentum');
        } else if (input.marketData.priceChangePercent24h < -5) {
          drivers.push('price pressure');
        }
      }

      // Contrarian analysis
      let contrarian = undefined;
      if (aggregatedScore > 80 && aggregatedAuthenticity < 0.6) {
        contrarian = {
          opportunity: true,
          reason: 'Extreme optimism with low authenticity suggests potential market top'
        };
      } else if (aggregatedScore < 20 && aggregatedAuthenticity > 0.8) {
        contrarian = {
          opportunity: true,
          reason: 'Extreme pessimism with authentic sentiment suggests potential bottom'
        };
      }

      return {
        score: Math.max(0, Math.min(100, Math.round(aggregatedScore))),
        trend: aggregatedTrend,
        authenticity: Math.round(aggregatedAuthenticity * 100) / 100,
        drivers: drivers.length > 0 ? drivers : ['general market sentiment'],
        warnings: warnings.length > 0 ? warnings : undefined,
        contrarian
      };

    } catch (error) {
      logger.warn(`⚠️ Sentiment synthesis failed for ${input.symbol}, using neutral`);
      return {
        score: 50,
        trend: 'stable',
        authenticity: 0.8,
        drivers: ['limited data available']
      };
    }
  }

  /**
   * 📋 TL;DR GENERATION
   * 
   * Creates concise executive summary
   */
  private async generateTLDR(
    thesis: string,
    risks: Risk[],
    catalysts: Catalyst[],
    sentiment: SentimentAnalysis,
    oracleInsights?: OracleInsights
  ): Promise<string> {
    const points: string[] = [];

    // Extract key thesis point
    const thesisKeyword = thesis.includes('upward') ? 'bullish momentum' : 
                         thesis.includes('downward') ? 'bearish pressure' : 'mixed signals';
    points.push(`• ${thesisKeyword.charAt(0).toUpperCase() + thesisKeyword.slice(1)} with ${sentiment.trend} sentiment`);

    // Top risk
    if (risks.length > 0) {
      const topRisk = risks[0];
      points.push(`• ${topRisk.severity.toUpperCase()} ${topRisk.category} risk: ${topRisk.description.split('.')[0]}`);
    }

    // Top catalyst
    if (catalysts.length > 0) {
      const topCatalyst = catalysts[0];
      points.push(`• Key catalyst: ${topCatalyst.description.split('.')[0]} (${topCatalyst.timeframe})`);
    }

    // Oracle insight if available
    if (oracleInsights?.predictions.next24h) {
      const prediction = oracleInsights.predictions.next24h;
      points.push(`• 24h outlook: ${prediction.direction} ${Math.abs(prediction.magnitude).toFixed(1)}% (${Math.round(prediction.probability * 100)}% confidence)`);
    }

    // Action recommendation
    const action = this.getActionFromSentiment(sentiment, risks);
    points.push(`• Action: ${action}`);

    return points.join('\n');
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private async applyPsychologyProtection(
    analysis: any,
    psychologyInsights?: PsychologyInsights
  ): Promise<any> {
    if (!psychologyInsights) return analysis;

    // Add psychology warnings to risks if manipulation detected
    if (psychologyInsights.manipulationRisk === 'high') {
      analysis.risks.unshift({
        category: 'psychological',
        severity: 'high',
        probability: 'high',
        description: 'High manipulation risk detected in source material',
        mitigation: 'Verify all information independently and exercise extreme caution',
        timeframe: 'hours'
      });
    }

    return analysis;
  }

  private calculateRecommendation(
    sentiment: SentimentAnalysis,
    risks: Risk[],
    catalysts: Catalyst[],
    oracleInsights?: OracleInsights
  ): 'buy' | 'hold' | 'sell' | 'watch' {
    let score = 0;

    // Sentiment contribution
    if (sentiment.score > 70) score += 2;
    else if (sentiment.score > 50) score += 1;
    else if (sentiment.score < 30) score -= 2;
    else score -= 1;

    // Risk contribution
    const highRisks = risks.filter(r => r.severity === 'high').length;
    score -= highRisks;

    // Catalyst contribution
    const highImpactCatalysts = catalysts.filter(c => c.impact === 'high').length;
    score += highImpactCatalysts;

    // Oracle contribution
    if (oracleInsights?.predictions.next24h) {
      const prediction = oracleInsights.predictions.next24h;
      if (prediction.direction.toLowerCase().includes('bull') && prediction.probability > 0.7) {
        score += 1;
      } else if (prediction.direction.toLowerCase().includes('bear') && prediction.probability > 0.7) {
        score -= 1;
      }
    }

    // Authenticity check
    if (sentiment.authenticity < 0.6) score -= 1;

    if (score >= 2) return 'buy';
    if (score <= -2) return 'sell';
    if (score === 0) return 'watch';
    return 'hold';
  }

  private calculateConfidence(
    input: ProcessedInput,
    sentiment: SentimentAnalysis,
    psychologyInsights?: PsychologyInsights,
    oracleInsights?: OracleInsights
  ): number {
    let confidence = 0.7; // Base confidence

    // Data completeness bonus
    confidence += input.completeness * 0.2;

    // Data freshness bonus
    confidence += input.dataFreshness * 0.1;

    // Sentiment authenticity impact
    confidence += (sentiment.authenticity - 0.5) * 0.2;

    // Psychology insights impact
    if (psychologyInsights) {
      if (psychologyInsights.manipulationRisk === 'low') confidence += 0.1;
      else if (psychologyInsights.manipulationRisk === 'high') confidence -= 0.2;
    }

    // Clamp between 0.1 and 0.95
    return Math.max(0.1, Math.min(0.95, confidence));
  }

  private getTimeframeFromNews(title: string): 'hours' | 'days' | 'weeks' | 'months' {
    if (title.includes('immediate') || title.includes('breaking')) return 'hours';
    if (title.includes('this week') || title.includes('soon')) return 'days';
    if (title.includes('quarter') || title.includes('Q1') || title.includes('Q2')) return 'months';
    return 'weeks';
  }

  private getActionFromSentiment(sentiment: SentimentAnalysis, risks: Risk[]): string {
    const highRisks = risks.filter(r => r.severity === 'high').length;
    
    if (sentiment.score > 75 && highRisks === 0) return 'Consider buying with 3-5% stop loss';
    if (sentiment.score > 60 && highRisks <= 1) return 'Hold with tight stops';
    if (sentiment.score < 30 || highRisks > 2) return 'Consider selling or avoiding';
    return 'Watch and wait for clearer signals';
  }
}
