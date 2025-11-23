/**
 * =========================================
 * NLP PROCESSOR
 * =========================================
 * Natural Language Processing for sentiment analysis, language detection,
 * topic classification, and content analysis
 */

import natural from 'natural';
import franc from 'franc';
import nlp from 'compromise';
import { SentimentAnalyzer, WordTokenizer, TfIdf } from 'natural';
import { Logger } from '../utils/Logger';
import type {
  SocialMediaPost,
  SentimentData,
  TopicClassification,
  LanguageCode,
  InfluencerMetrics
} from '../types';

export interface NLPConfig {
  model_version: string;
  confidence_threshold: number;
  max_content_length: number;
  sentiment_model: 'afinn' | 'sentiment' | 'vader';
  custom_vocabulary?: string[];
}

export class NLPProcessor {
  private logger: Logger;
  private config: NLPConfig;
  private isInitialized: boolean = false;

  // NLP models and tools
  private sentimentAnalyzer?: SentimentAnalyzer;
  private tokenizer?: WordTokenizer;
  private tfidf?: TfIdf;
  private lexicon?: unknown;

  // Predefined topic categories for classification
  private topicCategories: Map<string, string[]> = new Map([
    ['cryptocurrency', ['bitcoin', 'crypto', 'blockchain', 'ethereum', 'btc', 'eth', 'trading', 'hodl', 'defi', 'nft']],
    ['finance', ['stock', 'market', 'invest', 'portfolio', 'dividend', 'earnings', 'fed', 'interest', 'rate', 'economy']],
    ['technology', ['ai', 'tech', 'software', 'app', 'startup', 'innovation', 'coding', 'programming', 'cloud', 'data']],
    ['politics', ['election', 'government', 'policy', 'president', 'congress', 'vote', 'democrat', 'republican', 'law', 'regulation']],
    ['sports', ['game', 'team', 'player', 'score', 'win', 'loss', 'championship', 'tournament', 'coach', 'athlete']],
    ['entertainment', ['movie', 'music', 'celebrity', 'show', 'film', 'actor', 'singer', 'concert', 'album', 'hollywood']]
  ]);

  constructor(config?: Partial<NLPConfig>) {
    this.logger = new Logger('NLPProcessor');

    this.config = {
      model_version: '1.0.0',
      confidence_threshold: 0.7,
      max_content_length: 5000,
      sentiment_model: 'afinn',
      ...config
    };
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing NLP processor...');

      // Initialize sentiment analyzer
      switch (this.config.sentiment_model) {
        case 'afinn':
          this.sentimentAnalyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');
          // Lexicon will be used through the analyzer instance
          break;
        case 'sentiment':
          this.sentimentAnalyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'senticon');
          break;
        case 'vader':
          // VADER would require additional setup - using AFINN for now
          this.sentimentAnalyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');
          break;
      }

      // Initialize tokenizer
      this.tokenizer = new natural.WordTokenizer();

      // Initialize TF-IDF for topic analysis
      this.tfidf = new natural.TfIdf();

      // Load custom vocabulary if provided
      if (this.config.custom_vocabulary) {
        this.loadCustomVocabulary(this.config.custom_vocabulary);
      }

      // Test sentiment analyzer
      const testAnalyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');
      const testScore = testAnalyzer.getSentiment(['good', 'excellent', 'awesome']);
      this.logger.debug('Sentiment analyzer test score:', testScore);

      this.isInitialized = true;
      this.logger.info('✅ NLP processor initialized successfully');

    } catch (error: unknown) {
      this.logger.error('❌ Failed to initialize NLP processor', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.isInitialized = false;
      this.logger.info('✅ NLP processor stopped successfully');
    } catch (error: unknown) {
      this.logger.error('❌ Failed to stop NLP processor', error);
      throw error;
    }
  }

  async processPost(post: SocialMediaPost): Promise<SocialMediaPost> {
    if (!this.isInitialized) {
      throw new Error('NLP processor is not initialized');
    }

    const startTime = Date.now();

    try {
      // Truncate content if too long
      const content = post.content.length > this.config.max_content_length
        ? post.content.substring(0, this.config.max_content_length)
        : post.content;

      // 1. Language Detection
      const detectedLanguage = this.detectLanguage(content);

      // 2. Sentiment Analysis
      const sentiment = this.analyzeSentiment(content);

      // 3. Topic Classification
      const topics = this.classifyTopics(content);

      // 4. Enhanced content analysis
      const enhancedPost = {
        ...post,
        language: detectedLanguage,
        sentiment,
        topics,
        processed_at: new Date(),
        processing_latency_ms: Date.now() - startTime
      };

      // 5. Influencer analysis (if applicable)
      if (this.shouldAnalyzeInfluencer(post)) {
        enhancedPost.influencer_metrics = await this.analyzeInfluencerImpact(post);
      }

      this.logger.performance('nlp_processing', Date.now() - startTime, {
        post_id: post.id,
        content_length: content.length,
        language: detectedLanguage
      });

      return enhancedPost;

    } catch (error: unknown) {
      this.logger.error('Failed to process post with NLP', {
        post_id: post.id,
        error: (error as Error).message
      });

      // Return post with basic processing
      return {
        ...post,
        processed_at: new Date(),
        processing_latency_ms: Date.now() - startTime
      };
    }
  }

  detectLanguage(text: string): LanguageCode {
    try {
      // Use franc for language detection
      const detected = (franc as unknown as Function)(text, { minLength: 3 });

      // Map to ISO 639-1 codes
      const languageMap: Record<string, string> = {
        'eng': 'en',
        'spa': 'es',
        'fra': 'fr',
        'deu': 'de',
        'ita': 'it',
        'por': 'pt',
        'rus': 'ru',
        'jpn': 'ja',
        'kor': 'ko',
        'zho': 'zh',
        'ara': 'ar',
        'hin': 'hi'
      };

      return languageMap[detected] || 'en';
    } catch (error: unknown) {
      this.logger.error('Language detection failed', error);
      return 'en';
    }
  }

  analyzeSentiment(text: string): SentimentData {
    try {
      if (!this.sentimentAnalyzer) {
        throw new Error('Sentiment analyzer not initialized');
      }

      // Tokenize the text
      const tokens = this.tokenizer?.tokenize(text.toLowerCase()) || [];

      // Analyze sentiment
      const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');
      const score = analyzer.getSentiment(tokens);

      // Normalize score to -1 to 1 range
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

      // Extract emotion indicators
      const emotions = this.extractEmotions(tokens);

      return {
        score: normalizedScore,
        confidence,
        label,
        emotions
      };

    } catch (error: unknown) {
      this.logger.error('Sentiment analysis failed', error);
      return {
        score: 0,
        confidence: 0,
        label: 'neutral'
      };
    }
  }

  classifyTopics(text: string): TopicClassification {
    try {
      const tokens = this.tokenizer?.tokenize(text.toLowerCase()) || [];
      const topicScores: Record<string, number> = {};

      // Calculate relevance to each topic category
      for (const [category, keywords] of this.topicCategories) {
        let score = 0;
        let matches = 0;

        for (const keyword of keywords) {
          const keywordTokens = keyword.toLowerCase().split(' ');
          const keywordScore = this.calculateKeywordScore(tokens, keywordTokens);

          if (keywordScore > 0) {
            score += keywordScore;
            matches++;
          }
        }

        if (matches > 0) {
          topicScores[category] = score / matches; // Average score
        }
      }

      // Sort topics by score
      const sortedTopics = Object.entries(topicScores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5) // Top 5 topics
        .map(([topic, _score]) => topic);

      // Calculate confidence for each topic
      const confidences: Record<string, number> = {};
      for (const topic of sortedTopics) {
        confidences[topic] = Math.min(0.95, topicScores[topic]);
      }

      // Determine primary category
      const categories = this.determineCategories(sortedTopics);

      return {
        topics: sortedTopics,
        confidence: confidences,
        categories
      };

    } catch (error: unknown) {
      this.logger.error('Topic classification failed', error);
      return {
        topics: [],
        confidence: {},
        categories: ['general']
      };
    }
  }

  async analyzeInfluencerImpact(post: SocialMediaPost): Promise<InfluencerMetrics> {
    try {
      let score = 0;
      let reach = 0;
      let engagement = 0;
      let credibility = 0.5;
      const categories: string[] = [];

      // Base score on author metrics
      if (post.author.followers) {
        reach = post.author.followers;

        // Influence score based on follower count (logarithmic scale)
        score = Math.min(100, Math.log10(post.author.followers + 1) * 20);

        // Credibility based on verification and follower quality
        if (post.author.verified) {
          credibility += 0.3;
        }

        // Engagement rate calculation
        const totalEngagement = (post.engagement.likes || 0) +
                               (post.engagement.retweets || 0) +
                               (post.engagement.replies || 0);

        if (post.author.followers > 0) {
          engagement = totalEngagement / post.author.followers;
        }
      }

      // Topic-based influence
      if (post.topics.topics.length > 0) {
        categories.push(...post.topics.topics.slice(0, 3));
      }

      // Platform-specific adjustments
      switch (post.platform) {
        case 'twitter':
          score *= 1.2; // Twitter has high influence potential
          break;
        case 'reddit':
          credibility += 0.1; // Reddit karma-based credibility
          break;
        case 'discord':
          score *= 0.8; // Discord is more community-focused
          break;
      }

      return {
        score: Math.min(100, score),
        reach,
        engagement,
        credibility: Math.min(1, credibility),
        categories
      };

    } catch (error: unknown) {
      this.logger.error('Influencer analysis failed', error);
      return {
        score: 0,
        reach: 0,
        engagement: 0,
        credibility: 0.5,
        categories: []
      };
    }
  }

  getStatus(): string {
    return this.isInitialized ? 'Ready' : 'Not Initialized';
  }

  private shouldAnalyzeInfluencer(post: SocialMediaPost): boolean {
    // Analyze influencer impact for posts with high engagement or from verified users
    const hasHighEngagement = (post.engagement.likes || 0) > 100 ||
                             (post.engagement.retweets || 0) > 50;

    const isVerifiedUser = post.author.verified || false;
    const hasManyFollowers = (post.author.followers || 0) > 1000;

    return hasHighEngagement || isVerifiedUser || hasManyFollowers;
  }

  private extractEmotions(tokens: string[]): Record<string, number> {
    const emotionKeywords: Record<string, string[]> = {
      joy: ['happy', 'excited', 'great', 'awesome', 'love', 'amazing', 'fantastic'],
      anger: ['angry', 'mad', 'hate', 'terrible', 'awful', 'horrible', 'worst'],
      fear: ['scared', 'worried', 'afraid', 'panic', 'danger', 'risk', 'threat'],
      sadness: ['sad', 'depressed', 'unhappy', 'disappointed', 'sorry', 'regret'],
      surprise: ['wow', 'shocking', 'unexpected', 'amazing', 'incredible']
    };

    const emotions: Record<string, number> = {};

    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      let score = 0;
      for (const keyword of keywords) {
        if (tokens.includes(keyword)) {
          score += 1;
        }
      }
      if (score > 0) {
        emotions[emotion] = Math.min(1, score / 3); // Normalize to 0-1
      }
    }

    return emotions;
  }

  private calculateKeywordScore(textTokens: string[], keywordTokens: string[]): number {
    let matches = 0;
    const totalKeywords = keywordTokens.length;

    for (const keywordToken of keywordTokens) {
      if (textTokens.includes(keywordToken)) {
        matches++;
      }
    }

    return matches / totalKeywords;
  }

  private determineCategories(topics: string[]): string[] {
    const categoryMap: Record<string, string> = {
      'cryptocurrency': 'finance',
      'finance': 'finance',
      'technology': 'technology',
      'politics': 'politics',
      'sports': 'sports',
      'entertainment': 'entertainment'
    };

    const categories = new Set<string>();

    for (const topic of topics) {
      const category = categoryMap[topic];
      if (category) {
        categories.add(category);
      }
    }

    return categories.size > 0 ? Array.from(categories) : ['general'];
  }

  private loadCustomVocabulary(vocabulary: string[]): void {
    if (!this.tfidf) return;

    // Add custom terms to TF-IDF model
    for (const term of vocabulary) {
      this.tfidf!.addDocument(term);
    }
  }
}
