/**
 * =========================================
 * NLP ANALYZER
 * =========================================
 * Natural Language Processing for news analysis, summarization, and entity extraction
 */

import * as natural from 'natural';
import nlp from 'compromise';
import { Logger } from '../utils/Logger';
import type { NewsArticle, LanguageCode } from '../types';

export interface NLPAnalysisResult {
  sentiment: {
    score: number;
    confidence: number;
    label: 'positive' | 'negative' | 'neutral';
  };
  language: LanguageCode;
  entities: {
    organizations: string[];
    persons: string[];
    locations: string[];
    monetary: string[];
    percentages: string[];
  };
  summary: string;
  keyPhrases: string[];
}

export class NLPAnalyzer {
  private logger: Logger;
  private isInitialized: boolean = false;
  private sentimentAnalyzer: natural.SentimentAnalyzer;
  private tokenizer: natural.WordTokenizer;
  private stemmer: any;

  constructor() {
    this.logger = new Logger('NLPAnalyzer');
    this.sentimentAnalyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmerDe, 'afinn');
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing NLP Analyzer...');

      // Test sentiment analyzer
      const testAnalyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmerDe, 'afinn');
      const testTokens = ['good', 'excellent', 'amazing', 'terrible', 'bad'];
      const testScore = testAnalyzer.getSentiment(testTokens);
      this.logger.debug('Sentiment analyzer test score:', testScore);

      // Test compromise NLP
      const testDoc = nlp('Bitcoin price surged to $50,000 today.');
      const testEntities = testDoc.match('#Money').out('array');
      this.logger.debug('Compromise NLP test entities:', testEntities);

      this.isInitialized = true;
      this.logger.info('✅ NLP Analyzer initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize NLP Analyzer', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.isInitialized = false;
      this.logger.info('✅ NLP Analyzer stopped successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop NLP Analyzer', error);
      throw error;
    }
  }

  async analyzeArticle(article: NewsArticle): Promise<NLPAnalysisResult> {
    if (!this.isInitialized) {
      throw new Error('NLP Analyzer is not initialized');
    }

    try {
      const startTime = Date.now();

      // Combine title and content
      const fullText = `${article.title} ${article.content}`;

      // 1. Language Detection
      const language = this.detectLanguage(fullText);

      // 2. Sentiment Analysis
      const sentiment = this.analyzeSentiment(fullText);

      // 3. Entity Extraction
      const entities = this.extractEntities(fullText);

      // 4. Text Summarization
      const summary = this.generateSummary(fullText, article.title);

      // 5. Key Phrase Extraction
      const keyPhrases = this.extractKeyPhrases(fullText);

      const result: NLPAnalysisResult = {
        sentiment,
        language,
        entities,
        summary,
        keyPhrases
      };

      this.logger.performance('nlp_analysis', Date.now() - startTime, {
        article_id: article.id,
        text_length: fullText.length,
        language
      });

      return result;

    } catch (error: any) {
      this.logger.error('Failed to analyze article', {
        article_id: article.id,
        error: error.message
      });

      // Return default values
      return {
        sentiment: {
          score: 0,
          confidence: 0,
          label: 'neutral'
        },
        language: 'en',
        entities: {
          organizations: [],
          persons: [],
          locations: [],
          monetary: [],
          percentages: []
        },
        summary: article.title,
        keyPhrases: []
      };
    }
  }

  async extractKeyFacts(article: NewsArticle): Promise<{
    tokens: string[];
    projects: string[];
    companies: string[];
    people: string[];
    locations: string[];
    amounts: string[];
    dates: string[];
  }> {
    try {
      const text = `${article.title} ${article.content}`;
      const doc = nlp(text);

      // Extract cryptocurrency tokens
      const tokens = this.extractTokens(text);

      // Extract projects/protocols
      const projects = this.extractProjects(text);

      // Extract companies
      const companies = doc.match('#Organization').out('array');

      // Extract people
      const people = doc.match('#Person').out('array');

      // Extract locations
      const locations = doc.match('#Place').out('array');

      // Extract monetary amounts
      const amounts = doc.match('#Money').out('array');

      // Extract dates
      const dates = doc.match('#Date').out('array');

      return {
        tokens,
        projects,
        companies,
        people,
        locations,
        amounts,
        dates
      };

    } catch (error: any) {
      this.logger.error('Failed to extract key facts', {
        article_id: article.id,
        error: error.message
      });

      return {
        tokens: [],
        projects: [],
        companies: [],
        people: [],
        locations: [],
        amounts: [],
        dates: []
      };
    }
  }

  private detectLanguage(text: string): LanguageCode {
    // For now, default to English - compromise API is complex
    // In production, you'd use a proper language detection library
    return 'en';
  }

  private analyzeSentiment(text: string): { score: number; confidence: number; label: 'positive' | 'negative' | 'neutral' } {
    try {
      // Tokenize and stem
      const tokens = this.tokenizer.tokenize(text.toLowerCase()) || [];
      const stemmedTokens = tokens.map(token => this.stemmer.stem(token));

      // Analyze sentiment
      const score = this.sentimentAnalyzer.getSentiment(stemmedTokens);

      // Normalize score to -1 to 1
      const normalizedScore = Math.max(-1, Math.min(1, score / 5));

      // Determine label and confidence
      let label: 'positive' | 'negative' | 'neutral' = 'neutral';
      let confidence = 0.5;

      if (normalizedScore > 0.1) {
        label = 'positive';
        confidence = Math.min(0.95, 0.5 + (normalizedScore * 0.5));
      } else if (normalizedScore < -0.1) {
        label = 'negative';
        confidence = Math.min(0.95, 0.5 + (Math.abs(normalizedScore) * 0.5));
      } else {
        confidence = 0.7; // Neutral sentiment has higher confidence
      }

      return {
        score: normalizedScore,
        confidence,
        label
      };

    } catch (error: any) {
      this.logger.error('Sentiment analysis failed', error);
      return {
        score: 0,
        confidence: 0,
        label: 'neutral'
      };
    }
  }

  private extractEntities(text: string): {
    organizations: string[];
    persons: string[];
    locations: string[];
    monetary: string[];
    percentages: string[];
  } {
    try {
      const doc = nlp(text);

      return {
        organizations: doc.match('#Organization').out('array'),
        persons: doc.match('#Person').out('array'),
        locations: doc.match('#Place').out('array'),
        monetary: doc.match('#Money').out('array'),
        percentages: doc.match('#Percentage').out('array')
      };

    } catch (error: any) {
      this.logger.error('Entity extraction failed', error);
      return {
        organizations: [],
        persons: [],
        locations: [],
        monetary: [],
        percentages: []
      };
    }
  }

  private generateSummary(text: string, title: string): string {
    try {
      const doc = nlp(text);

      // Extract key sentences
      const sentences = doc.sentences().out('array');

      if (sentences.length <= 2) {
        return title; // Return title if content is too short
      }

      // Find the most important sentences (first and key sentences)
      const summarySentences = [
        sentences[0], // First sentence
        ...sentences.slice(1, 3) // Next 2-3 sentences
      ];

      let summary = summarySentences.join(' ').trim();

      // Limit summary length
      if (summary.length > 200) {
        summary = summary.substring(0, 197) + '...';
      }

      return summary;

    } catch (error: any) {
      this.logger.error('Summary generation failed', error);
      return title; // Fallback to title
    }
  }

  private extractKeyPhrases(text: string): string[] {
    try {
      const doc = nlp(text);

      // Extract noun phrases and important terms
      const nounPhrases = doc.match('#NounPhrase').out('array');
      const properNouns = doc.match('#ProperNoun').out('array');
      const acronyms = doc.match('#Acronym').out('array');

      // Combine and deduplicate
      const keyPhrases = [...new Set([...nounPhrases, ...properNouns, ...acronyms])];

      // Filter by length and relevance
      return keyPhrases
        .filter(phrase => phrase.length > 2 && phrase.length < 50)
        .slice(0, 10); // Top 10 key phrases

    } catch (error: any) {
      this.logger.error('Key phrase extraction failed', error);
      return [];
    }
  }

  private extractTokens(text: string): string[] {
    // Extract cryptocurrency token symbols and names
    const cryptoKeywords = [
      'bitcoin', 'btc', 'ethereum', 'eth', 'binance coin', 'bnb', 'cardano', 'ada',
      'solana', 'sol', 'polkadot', 'dot', 'dogecoin', 'doge', 'avalanche', 'avax',
      'chainlink', 'link', 'polygon', 'matic', 'litecoin', 'ltc', 'uniswap', 'uni',
      'aave', 'compound', 'comp', 'sushiswap', 'sushi', 'pancakeswap', 'cake'
    ];

    const foundTokens: string[] = [];

    for (const keyword of cryptoKeywords) {
      if (text.toLowerCase().includes(keyword)) {
        foundTokens.push(keyword.toUpperCase());
      }
    }

    return [...new Set(foundTokens)]; // Remove duplicates
  }

  private extractProjects(text: string): string[] {
    // Extract blockchain projects and protocols
    const projectKeywords = [
      'ethereum', 'bitcoin', 'binance smart chain', 'bsc', 'cardano', 'solana',
      'polkadot', 'avalanche', 'polygon', 'arbitrum', 'optimism', 'fantom',
      'uniswap', 'pancakeswap', 'sushiswap', 'aave', 'compound', 'makerdao',
      'chainlink', 'the graph', 'ipfs', 'filecoin', 'near', 'cosmos', 'terra'
    ];

    const foundProjects: string[] = [];

    for (const keyword of projectKeywords) {
      if (text.toLowerCase().includes(keyword)) {
        foundProjects.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
      }
    }

    return [...new Set(foundProjects)]; // Remove duplicates
  }

  getStatus(): string {
    return this.isInitialized ? 'Ready' : 'Not Initialized';
  }
}
