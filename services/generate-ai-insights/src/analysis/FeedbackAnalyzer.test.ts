/**
 * =========================================
 * FEEDBACK ANALYZER TESTS
 * =========================================
 * Divine world-class tests for feedback analysis functionality
 */

import { FeedbackAnalyzer } from './FeedbackAnalyzer';
import { AIInsightsConfig } from '@/types';
import { createMockUserFeedback } from '../../tests/setup';

describe('FeedbackAnalyzer', () => {
  let analyzer: FeedbackAnalyzer;
  let mockConfig: AIInsightsConfig;

  beforeEach(() => {
    mockConfig = {
      models: [],
      dataSources: [],
      analysis: {
        lookbackPeriod: 30,
        minSampleSize: 10,
        confidenceThreshold: 0.7,
        correlationThreshold: 0.5
      },
      recommendations: {
        maxPerRequest: 10,
      types: ['signal_weight' as any],
      priorities: ['high' as any, 'medium' as any]
      },
      feedback: {
        enabled: true,
        dataRetention: 90,
        minFeedbackCount: 5,
        autoImplementation: {
          enabled: false,
          minConfidence: 0.8,
          maxRisk: 'medium' as any
        },
        userConsent: {
          required: true,
          optOutEnabled: true
        }
      },
      caching: {
        enabled: false,
        ttl: 3600,
        maxSize: 1000
      },
      performance: {
        maxConcurrentAnalyses: 5,
        timeout: 30000,
        retryAttempts: 3
      },
      realtime: {
        enabled: true,
        updateInterval: 30000,
        maxConnections: 1000,
        heartbeatInterval: 60000
      }
    };

    analyzer = new FeedbackAnalyzer(mockConfig);
  });

  describe('analyzeFeedback', () => {
    it('should analyze feedback successfully', async () => {
      const feedback = [
        createMockUserFeedback({
          rating: 5,
          comment: 'Excellent accuracy and timing',
          sentiment: 'positive',
          categories: ['accuracy', 'timing']
        }),
        createMockUserFeedback({
          rating: 2,
          comment: 'Too many false alerts',
          sentiment: 'negative',
          categories: ['frequency', 'accuracy']
        }),
        createMockUserFeedback({
          rating: 4,
          comment: 'Good overall experience',
          sentiment: 'positive',
          categories: ['usability']
        })
      ];

      const result = await analyzer.analyzeFeedback(feedback);

      expect(result.summary).toBeDefined();
      expect(result.summary.totalFeedback).toBe(3);
      expect(result.summary.avgRating).toBeCloseTo(3.67, 1);
      expect(result.summary.sentimentDistribution.positive).toBe(2);
      expect(result.summary.sentimentDistribution.negative).toBe(1);
      expect(result.patterns).toBeDefined();
      expect(result.insights).toBeDefined();
    });

    it('should handle empty feedback gracefully', async () => {
      const result = await analyzer.analyzeFeedback([]);

      expect(result.summary.totalFeedback).toBe(0);
      expect(result.summary.avgRating).toBe(0);
      expect(result.patterns).toHaveLength(0);
      expect(result.insights).toHaveLength(0);
    });

    it('should extract common themes correctly', async () => {
      const feedback = [
        createMockUserFeedback({
          sentiment: 'negative',
          comment: 'Alerts are late and inaccurate'
        }),
        createMockUserFeedback({
          sentiment: 'negative',
          comment: 'Too many false positives, very inaccurate'
        }),
        createMockUserFeedback({
          sentiment: 'positive',
          comment: 'Very accurate and timely alerts'
        })
      ];

      const result = await analyzer.analyzeFeedback(feedback);

      expect(result.summary.commonComplaints).toContain('inaccurate');
      expect(result.summary.commonPraises).toContain('accurate');
    });

    it('should detect user behavior patterns', async () => {
      const feedback = [
        createMockUserFeedback({
          userId: 'user1',
          rating: 5,
          sentiment: 'positive',
          timestamp: new Date(Date.now() - 86400000)
        }),
        createMockUserFeedback({
          userId: 'user1',
          rating: 4,
          sentiment: 'positive',
          timestamp: new Date(Date.now() - 43200000)
        }),
        createMockUserFeedback({
          userId: 'user1',
          rating: 5,
          sentiment: 'positive',
          timestamp: new Date()
        }),
        createMockUserFeedback({
          userId: 'user2',
          rating: 1,
          sentiment: 'negative',
          timestamp: new Date(Date.now() - 86400000)
        }),
        createMockUserFeedback({
          userId: 'user2',
          rating: 2,
          sentiment: 'negative',
          timestamp: new Date()
        })
      ];

      const result = await analyzer.analyzeFeedback(feedback);

      expect(result.patterns.length).toBeGreaterThan(0);

      const engagedUser = result.patterns.find(p => p.pattern === 'engaged_positive_user');
      expect(engagedUser).toBeDefined();
      expect(engagedUser?.userId).toBe('user1');

      const dissatisfiedUser = result.patterns.find(p => p.pattern === 'dissatisfied_frequent_user');
      expect(dissatisfiedUser).toBeDefined();
      expect(dissatisfiedUser?.userId).toBe('user2');
    });

    it('should analyze rating trends', async () => {
      const feedback = [
        createMockUserFeedback({
          categories: ['accuracy'],
          rating: 2,
          timestamp: new Date(Date.now() - 86400000)
        }),
        createMockUserFeedback({
          categories: ['accuracy'],
          rating: 3,
          timestamp: new Date(Date.now() - 43200000)
        }),
        createMockUserFeedback({
          categories: ['accuracy'],
          rating: 4,
          timestamp: new Date()
        })
      ];

      const result = await analyzer.analyzeFeedback(feedback);

      expect(result.summary.trends.length).toBeGreaterThan(0);

      const accuracyTrend = result.summary.trends.find(t => t.category === 'accuracy');
      expect(accuracyTrend).toBeDefined();
      expect(accuracyTrend?.trend).toBe('improving');
      expect(accuracyTrend?.confidence).toBeGreaterThan(0);
    });
  });

  describe('processSentiment', () => {
    it('should process positive sentiment correctly', () => {
      const result = analyzer.processSentiment('This is an excellent alert system!');

      expect(result.sentiment).toBe('positive');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should process negative sentiment correctly', () => {
      const result = analyzer.processSentiment('This alert system is terrible and inaccurate');

      expect(result.sentiment).toBe('negative');
      expect(result.score).toBeLessThan(0);
    });

    it('should process neutral sentiment correctly', () => {
      const result = analyzer.processSentiment('The alert system works as expected');

      expect(result.sentiment).toBe('neutral');
      expect(Math.abs(result.score)).toBeLessThan(0.1);
    });
  });

  describe('extractKeywords', () => {
    it('should extract relevant keywords from feedback', () => {
      const text = 'The alert timing is perfect and very accurate, but sometimes too frequent';
      const keywords = analyzer.extractKeywords(text, 5);

      expect(keywords).toContain('accurate');
      expect(keywords).toContain('timing');
      expect(keywords.length).toBeLessThanOrEqual(5);
    });

    it('should filter out stop words', () => {
      const text = 'The alert system is very good and accurate';
      const keywords = analyzer.extractKeywords(text, 10);

      expect(keywords).not.toContain('the');
      expect(keywords).not.toContain('is');
      expect(keywords).not.toContain('and');
    });

    it('should handle empty or short text', () => {
      const keywords = analyzer.extractKeywords('', 5);
      expect(keywords).toHaveLength(0);

      const shortKeywords = analyzer.extractKeywords('good', 5);
      expect(shortKeywords).toHaveLength(0);
    });
  });

  describe('categorizeFeedback', () => {
    it('should categorize accuracy-related feedback', () => {
      const feedback = createMockUserFeedback({
        comment: 'The alerts are very accurate and correct'
      });

      const categories = analyzer.categorizeFeedback(feedback);

      expect(categories).toContain('accuracy');
    });

    it('should categorize timing-related feedback', () => {
      const feedback = createMockUserFeedback({
        comment: 'Alerts arrive too late'
      });

      const categories = analyzer.categorizeFeedback(feedback);

      expect(categories).toContain('timing');
    });

    it('should categorize frequency-related feedback', () => {
      const feedback = createMockUserFeedback({
        comment: 'Too many alerts, very frequent'
      });

      const categories = analyzer.categorizeFeedback(feedback);

      expect(categories).toContain('frequency');
    });

    it('should categorize usability-related feedback', () => {
      const feedback = createMockUserFeedback({
        comment: 'The interface is confusing and hard to use'
      });

      const categories = analyzer.categorizeFeedback(feedback);

      expect(categories).toContain('usability');
    });

    it('should return general category for uncategorized feedback', () => {
      const feedback = createMockUserFeedback({
        comment: 'This is a general comment'
      });

      const categories = analyzer.categorizeFeedback(feedback);

      expect(categories).toEqual(['general']);
    });
  });
});
