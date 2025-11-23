/**
 * =========================================
 * NEWS CLASSIFIER
 * =========================================
 * Intelligent classification of news articles by type and urgency
 */

import { Logger } from '../utils/Logger';
import type { NewsArticle, NewsClassification } from '../types';

export interface ClassificationResult {
  type: NewsClassification;
  confidence: number;
  reasoning: string[];
}

export class NewsClassifier {
  private logger: Logger;
  private isInitialized: boolean = false;
  private classificationKeywords: Record<NewsClassification, string[]>;

  constructor(classificationKeywords: Record<NewsClassification, string[]>) {
    this.logger = new Logger('NewsClassifier');
    this.classificationKeywords = classificationKeywords;
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing News Classifier...');

      // Validate classification keywords
      for (const [classification, keywords] of Object.entries(this.classificationKeywords)) {
        if (keywords.length === 0 && classification !== 'general') {
          this.logger.warn(`No keywords defined for classification: ${classification}`);
        }
      }

      this.isInitialized = true;
      this.logger.info('✅ News Classifier initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize News Classifier', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.isInitialized = false;
      this.logger.info('✅ News Classifier stopped successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop News Classifier', error);
      throw error;
    }
  }

  async classifyArticle(article: NewsArticle): Promise<ClassificationResult> {
    if (!this.isInitialized) {
      throw new Error('News Classifier is not initialized');
    }

    try {
      // Combine title and content for analysis
      const text = `${article.title} ${article.content}`.toLowerCase();

      // Calculate scores for each classification
      const scores: Record<NewsClassification, number> = {} as Record<NewsClassification, number>;
      const reasoning: Record<NewsClassification, string[]> = {} as Record<NewsClassification, string[]>;

      for (const [classification, keywords] of Object.entries(this.classificationKeywords)) {
        const { score, matches } = this.calculateClassificationScore(text, keywords);
        scores[classification as NewsClassification] = score;
        reasoning[classification as NewsClassification] = matches;
      }

      // Find the best classification
      let bestClassification: NewsClassification = 'general';
      let bestScore = 0;
      let bestReasoning: string[] = [];

      for (const [classification, score] of Object.entries(scores)) {
        if (score > bestScore) {
          bestScore = score;
          bestClassification = classification as NewsClassification;
          bestReasoning = reasoning[classification as NewsClassification];
        }
      }

      const result: ClassificationResult = {
        type: bestClassification,
        confidence: bestScore,
        reasoning: bestReasoning
      };

      // Log classification
      this.logger.classification(article.id, bestClassification, bestScore);

      return result;

    } catch (error: any) {
      this.logger.error('Failed to classify article', {
        article_id: article.id,
        error: error.message
      });

      return {
        type: 'general',
        confidence: 0,
        reasoning: ['Classification failed']
      };
    }
  }

  private calculateClassificationScore(text: string, keywords: string[]): { score: number; matches: string[] } {
    const matches: string[] = [];
    let totalScore = 0;

    for (const keyword of keywords) {
      // Check for exact matches
      if (text.includes(keyword.toLowerCase())) {
        matches.push(keyword);
        totalScore += 1;
      }

      // Check for partial matches (word boundaries)
      const wordBoundaryRegex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'gi');
      const wordMatches = text.match(wordBoundaryRegex);
      if (wordMatches) {
        matches.push(...wordMatches.map(match => keyword));
        totalScore += wordMatches.length * 0.8; // Slightly lower score for word-boundary matches
      }
    }

    // Normalize score based on text length and keyword count
    const textLength = text.split(' ').length;
    const keywordCount = keywords.length;

    if (keywordCount === 0) {
      return { score: 0, matches: [] };
    }

    // Boost score for longer, more specific matches
    const boostFactor = Math.min(2, textLength / 100);
    const normalizedScore = (totalScore / keywordCount) * boostFactor;

    return {
      score: Math.min(1, normalizedScore),
      matches: [...new Set(matches)] // Remove duplicates
    };
  }

  private determineUrgencyByClassification(classification: NewsClassification, confidence: number): 'low' | 'medium' | 'high' | 'critical' {
    // Define urgency thresholds for each classification
    const urgencyThresholds = {
      breaking_news: { high: 0.7, critical: 0.9 },
      regulatory: { high: 0.6, critical: 0.8 },
      protocol_exploit: { high: 0.8, critical: 0.95 },
      macroeconomic: { high: 0.5, critical: 0.7 },
      technical_analysis: { high: 0.4, critical: 0.6 },
      market_analysis: { high: 0.4, critical: 0.6 },
      company_news: { high: 0.5, critical: 0.7 },
      partnership: { high: 0.5, critical: 0.7 },
      funding: { high: 0.6, critical: 0.8 },
      adoption: { high: 0.5, critical: 0.7 },
      security: { high: 0.7, critical: 0.9 },
      general: { high: 0.3, critical: 0.5 }
    };

    const thresholds = urgencyThresholds[classification] || urgencyThresholds.general;

    if (confidence >= thresholds.critical) {
      return 'critical';
    } else if (confidence >= thresholds.high) {
      return 'high';
    } else if (confidence >= 0.3) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  getStatus(): string {
    return this.isInitialized ? 'Ready' : 'Not Initialized';
  }
}
