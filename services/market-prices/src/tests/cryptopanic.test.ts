/**
 * =========================================
 * CRYPTOPANIC INTEGRATION TEST SUITE
 * =========================================
 * Comprehensive tests for CryptoPanic API integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CryptoPanicRestClient from '../providers/cryptopanic-rest';
import CryptoPanicNewsService from '../services/cryptopanic-news.service';
import CryptoPanicSentimentAnalyzer from '../services/cryptopanic-sentiment.service';
import {
  CryptoPanicPlan,
  CryptoPanicFilter,
  CryptoPanicSentiment,
  CryptoPanicPost,
  NormalizedNewsArticle,
} from '../types/cryptopanic.types';

// Mock data
const mockPost: CryptoPanicPost = {
  kind: 'news' as any,
  domain: 'cointelegraph.com',
  source: {
    title: 'CoinTelegraph',
    region: 'en',
    domain: 'cointelegraph.com',
    path: null,
  },
  title: 'Bitcoin Surges Past $50,000 as Institutional Adoption Grows',
  published_at: '2024-01-15T10:30:00Z',
  slug: 'bitcoin-surges-past-50000',
  id: 12345,
  url: 'https://cointelegraph.com/news/bitcoin-surges',
  created_at: '2024-01-15T10:30:00Z',
  votes: {
    negative: 5,
    positive: 150,
    important: 75,
    liked: 200,
    disliked: 10,
    lol: 5,
    toxic: 0,
    saved: 50,
    comments: 25,
  },
  currencies: [
    {
      code: 'BTC',
      title: 'Bitcoin',
      slug: 'bitcoin',
      url: '/currencies/btc/',
    },
  ],
  metadata: {
    description: 'Bitcoin price surges as institutional investors continue to adopt cryptocurrency',
    image: 'https://example.com/image.jpg',
    has_video: false,
  },
};

const mockResponse = {
  count: 1,
  next: null,
  previous: null,
  results: [mockPost],
};

// ============================================
// REST CLIENT TESTS
// ============================================

describe('CryptoPanicRestClient', () => {
  let client: CryptoPanicRestClient;

  beforeEach(() => {
    client = new CryptoPanicRestClient({
      authToken: 'test-token',
      plan: CryptoPanicPlan.GROWTH,
      enableCaching: true,
    });
  });

  describe('Initialization', () => {
    it('should initialize with correct plan configuration', () => {
      const status = client.getRateLimitStatus();
      expect(status.plan).toBe(CryptoPanicPlan.GROWTH);
      expect(status.requestsPerSecond).toBe(5);
      expect(status.isRealTime).toBe(true);
    });

    it('should initialize Development plan correctly', () => {
      const devClient = new CryptoPanicRestClient({
        authToken: 'test-token',
        plan: CryptoPanicPlan.DEVELOPMENT,
      });
      const status = devClient.getRateLimitStatus();
      expect(status.requestsPerSecond).toBe(2);
      expect(status.monthlyLimit).toBe(100);
      expect(status.hasDelay).toBe(true);
      expect(status.delayHours).toBe(24);
    });

    it('should initialize Enterprise plan correctly', () => {
      const entClient = new CryptoPanicRestClient({
        authToken: 'test-token',
        plan: CryptoPanicPlan.ENTERPRISE,
      });
      const status = entClient.getRateLimitStatus();
      expect(status.requestsPerSecond).toBe(Infinity);
      expect(status.monthlyLimit).toBe(Infinity);
    });
  });

  describe('Caching', () => {
    it('should cache responses', async () => {
      // Mock axios to return our mock response
      const axiosMock = vi.spyOn(client['axios'], 'request');
      axiosMock.mockResolvedValue({ data: mockResponse, status: 200 } as any);

      // First call - should hit API
      await client.fetchPosts();
      expect(axiosMock).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await client.fetchPosts();
      expect(axiosMock).toHaveBeenCalledTimes(1); // Still 1, not 2

      axiosMock.mockRestore();
    });

    it('should return cache statistics', async () => {
      const axiosMock = vi.spyOn(client['axios'], 'request');
      axiosMock.mockResolvedValue({ data: mockResponse, status: 200 } as any);

      await client.fetchPosts();
      await client.fetchPosts(); // Cached

      const stats = client.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.totalHits).toBeGreaterThan(0);

      axiosMock.mockRestore();
    });

    it('should clear cache', async () => {
      const axiosMock = vi.spyOn(client['axios'], 'request');
      axiosMock.mockResolvedValue({ data: mockResponse, status: 200 } as any);

      await client.fetchPosts();
      expect(client.getCacheStats().size).toBeGreaterThan(0);

      client.clearCache();
      expect(client.getCacheStats().size).toBe(0);

      axiosMock.mockRestore();
    });
  });

  describe('API Methods', () => {
    it('should fetch posts with filters', async () => {
      const axiosMock = vi.spyOn(client['axios'], 'request');
      axiosMock.mockResolvedValue({ data: mockResponse, status: 200 } as any);

      const result = await client.fetchPosts({
        currencies: 'BTC',
        filter: CryptoPanicFilter.BULLISH,
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].id).toBe(12345);

      axiosMock.mockRestore();
    });

    it('should fetch trending posts', async () => {
      const axiosMock = vi.spyOn(client['axios'], 'request');
      axiosMock.mockResolvedValue({ data: mockResponse, status: 200 } as any);

      const result = await client.fetchTrendingPosts('BTC');

      expect(result.results).toHaveLength(1);
      expect(axiosMock).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            filter: CryptoPanicFilter.HOT,
          }),
        })
      );

      axiosMock.mockRestore();
    });

    it('should handle multiple currencies', async () => {
      const axiosMock = vi.spyOn(client['axios'], 'request');
      axiosMock.mockResolvedValue({ data: mockResponse, status: 200 } as any);

      await client.fetchNewsByMultipleCurrencies(['BTC', 'ETH', 'SOL']);

      expect(axiosMock).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            currencies: 'BTC,ETH,SOL',
          }),
        })
      );

      axiosMock.mockRestore();
    });
  });

  describe('Rate Limiting', () => {
    it('should track request count', async () => {
      const axiosMock = vi.spyOn(client['axios'], 'request');
      axiosMock.mockResolvedValue({ data: mockResponse, status: 200 } as any);

      const initialStatus = client.getRateLimitStatus();
      const initialCount = initialStatus.currentMonthCount;

      await client.fetchPosts();

      const newStatus = client.getRateLimitStatus();
      expect(newStatus.currentMonthCount).toBe(initialCount + 1);

      axiosMock.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle 429 rate limit errors', async () => {
      const axiosMock = vi.spyOn(client['axios'], 'request');
      axiosMock.mockRejectedValue({
        response: { status: 429, data: {} },
        message: 'Rate limit exceeded',
      });

      await expect(client.fetchPosts()).rejects.toThrow();

      axiosMock.mockRestore();
    });

    it('should handle 401 authentication errors', async () => {
      const axiosMock = vi.spyOn(client['axios'], 'request');
      axiosMock.mockRejectedValue({
        response: { status: 401, data: {} },
        message: 'Unauthorized',
      });

      await expect(client.fetchPosts()).rejects.toThrow('Invalid CryptoPanic auth token');

      axiosMock.mockRestore();
    });

    it('should handle network errors', async () => {
      const axiosMock = vi.spyOn(client['axios'], 'request');
      axiosMock.mockRejectedValue({
        request: {},
        message: 'Network Error',
      });

      await expect(client.fetchPosts()).rejects.toThrow();

      axiosMock.mockRestore();
    });
  });
});

// ============================================
// NEWS SERVICE TESTS
// ============================================

describe('CryptoPanicNewsService', () => {
  let client: CryptoPanicRestClient;
  let newsService: CryptoPanicNewsService;

  beforeEach(() => {
    client = new CryptoPanicRestClient({
      authToken: 'test-token',
      plan: CryptoPanicPlan.GROWTH,
    });

    newsService = new CryptoPanicNewsService({
      client,
      enableCaching: true,
      enableTokenMapping: true,
      protocolDetection: true,
    });
  });

  afterEach(async () => {
    await newsService.destroy();
  });

  describe('Normalization', () => {
    it('should normalize posts to articles', async () => {
      const axiosMock = vi.spyOn(client['axios'], 'request');
      axiosMock.mockResolvedValue({ data: mockResponse, status: 200 } as any);

      const articles = await newsService.fetchNews();

      expect(articles).toHaveLength(1);
      const article = articles[0];

      expect(article.id).toBe('cryptopanic-12345');
      expect(article.title).toBe(mockPost.title);
      expect(article.sentiment).toBeDefined();
      expect(article.panicScore).toBeGreaterThanOrEqual(0);
      expect(article.panicScore).toBeLessThanOrEqual(100);
      expect(article.tokens).toContain('BTC');

      axiosMock.mockRestore();
    });

    it('should calculate sentiment scores correctly', async () => {
      const axiosMock = vi.spyOn(client['axios'], 'request');
      axiosMock.mockResolvedValue({ data: mockResponse, status: 200 } as any);

      const articles = await newsService.fetchNews();
      const article = articles[0];

      // Should be positive due to high positive votes
      expect(article.sentiment).toBe(CryptoPanicSentiment.POSITIVE);
      expect(article.sentimentScore).toBeGreaterThan(0);

      axiosMock.mockRestore();
    });

    it('should calculate panic scores correctly', async () => {
      const axiosMock = vi.spyOn(client['axios'], 'request');
      axiosMock.mockResolvedValue({ data: mockResponse, status: 200 } as any);

      const articles = await newsService.fetchNews();
      const article = articles[0];

      // High importance should result in higher panic score
      expect(article.panicScore).toBeGreaterThan(0);
      expect(article.importance).toBeGreaterThan(0);

      axiosMock.mockRestore();
    });

    it('should map tokens correctly', async () => {
      const axiosMock = vi.spyOn(client['axios'], 'request');
      axiosMock.mockResolvedValue({ data: mockResponse, status: 200 } as any);

      const articles = await newsService.fetchNews();
      const article = articles[0];

      expect(article.tokens).toContain('BTC');
      expect(article.currencies[0].code).toBe('BTC');

      axiosMock.mockRestore();
    });

    it('should detect DeFi protocols', async () => {
      const defiPost = {
        ...mockPost,
        title: 'Uniswap V4 Launch Announced with New Features',
        currencies: [{ code: 'UNI', title: 'Uniswap', slug: 'uniswap', url: '/currencies/uni/' }],
      };

      const axiosMock = vi.spyOn(client['axios'], 'request');
      axiosMock.mockResolvedValue({
        data: { ...mockResponse, results: [defiPost] },
        status: 200,
      } as any);

      const articles = await newsService.fetchNews();
      const article = articles[0];

      expect(article.protocols).toContain('uniswap');
      expect(article.tags).toContain('defi');

      axiosMock.mockRestore();
    });
  });

  describe('Fetching Methods', () => {
    beforeEach(() => {
      vi.spyOn(client['axios'], 'request').mockResolvedValue({
        data: mockResponse,
        status: 200,
      } as any);
    });

    it('should fetch trending news', async () => {
      const articles = await newsService.fetchTrendingNews('BTC');
      expect(articles).toBeDefined();
      expect(Array.isArray(articles)).toBe(true);
    });

    it('should fetch bullish news', async () => {
      const articles = await newsService.fetchBullishNews('BTC');
      expect(articles).toBeDefined();
    });

    it('should fetch bearish news', async () => {
      const articles = await newsService.fetchBearishNews('BTC');
      expect(articles).toBeDefined();
    });

    it('should fetch news by token', async () => {
      const articles = await newsService.fetchNewsByToken('BTC');
      expect(articles).toBeDefined();
    });

    it('should fetch news by multiple tokens', async () => {
      const articles = await newsService.fetchNewsByTokens(['BTC', 'ETH']);
      expect(articles).toBeDefined();
    });
  });

  describe('Statistics', () => {
    it('should track statistics', async () => {
      const axiosMock = vi.spyOn(client['axios'], 'request');
      axiosMock.mockResolvedValue({ data: mockResponse, status: 200 } as any);

      await newsService.fetchNews();

      const stats = newsService.getStatistics();
      expect(stats.totalArticles).toBeGreaterThan(0);
      expect(stats.articlesBySource).toBeDefined();
      expect(stats.articlesBySentiment).toBeDefined();

      axiosMock.mockRestore();
    });

    it('should return trending tokens', async () => {
      const axiosMock = vi.spyOn(client['axios'], 'request');
      axiosMock.mockResolvedValue({ data: mockResponse, status: 200 } as any);

      await newsService.fetchNews();

      const trending = newsService.getTrendingTokens(5);
      expect(Array.isArray(trending)).toBe(true);

      axiosMock.mockRestore();
    });
  });

  describe('Events', () => {
    it('should emit news_fetched event', async () => {
      const axiosMock = vi.spyOn(client['axios'], 'request');
      axiosMock.mockResolvedValue({ data: mockResponse, status: 200 } as any);

      const eventSpy = vi.fn();
      newsService.on('news_fetched', eventSpy);

      await newsService.fetchNews();

      expect(eventSpy).toHaveBeenCalled();
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          count: expect.any(Number),
          articles: expect.any(Array),
        })
      );

      axiosMock.mockRestore();
    });
  });
});

// ============================================
// SENTIMENT ANALYZER TESTS
// ============================================

describe('CryptoPanicSentimentAnalyzer', () => {
  let analyzer: CryptoPanicSentimentAnalyzer;
  let mockArticle: NormalizedNewsArticle;

  beforeEach(() => {
    analyzer = new CryptoPanicSentimentAnalyzer({
      enableAdvancedAnalysis: true,
    });

    mockArticle = {
      id: 'test-1',
      title: 'Bitcoin Surges Past $50,000 as Institutional Adoption Grows',
      description: 'Bitcoin price rallies to new highs with strong bullish momentum',
      url: 'https://example.com',
      publishedAt: new Date(),
      createdAt: new Date(),
      source: {
        name: 'CoinTelegraph',
        domain: 'cointelegraph.com',
        region: 'en',
      },
      sentiment: CryptoPanicSentiment.POSITIVE,
      panicScore: 35,
      sentimentScore: 75,
      importance: 80,
      engagement: {
        likes: 200,
        dislikes: 10,
        comments: 25,
        saves: 50,
      },
      currencies: [{ code: 'BTC', name: 'Bitcoin', slug: 'bitcoin' }],
      tokens: ['BTC'],
      protocols: [],
      metadata: {
        hasImage: true,
        hasVideo: false,
      },
      kind: 'news' as any,
      tags: ['positive', 'news'],
    };
  });

  describe('Analysis', () => {
    it('should analyze article sentiment', () => {
      const analysis = analyzer.analyze(mockArticle);

      expect(analysis.article).toBe(mockArticle);
      expect(analysis.sentiment).toBeDefined();
      expect(analysis.sentimentScore).toBeDefined();
      expect(analysis.panicScore).toBe(mockArticle.panicScore);
      expect(analysis.confidence).toBeGreaterThan(0);
      expect(analysis.confidence).toBeLessThanOrEqual(1);
    });

    it('should detect bullish signals', () => {
      const analysis = analyzer.analyze(mockArticle);

      expect(analysis.indicators.bullishSignals.length).toBeGreaterThan(0);
      expect(analysis.indicators.bullishSignals).toContain('surge');
    });

    it('should detect bearish signals', () => {
      const bearishArticle = {
        ...mockArticle,
        title: 'Bitcoin Crashes Below $40,000 on Market Panic',
        description: 'Massive sell-off triggers liquidations',
        sentiment: CryptoPanicSentiment.NEGATIVE,
        sentimentScore: -80,
      };

      const analysis = analyzer.analyze(bearishArticle);

      expect(analysis.indicators.bearishSignals.length).toBeGreaterThan(0);
    });

    it('should calculate confidence based on engagement', () => {
      const highEngagementArticle = {
        ...mockArticle,
        engagement: {
          likes: 1000,
          dislikes: 10,
          comments: 500,
          saves: 200,
        },
        importance: 95,
      };

      const analysis = analyzer.analyze(highEngagementArticle);
      expect(analysis.confidence).toBeGreaterThan(0.7);
    });

    it('should identify token impact levels', () => {
      const analysis = analyzer.analyze(mockArticle);

      expect(analysis.impactedTokens).toHaveLength(1);
      expect(analysis.impactedTokens[0].token).toBe('BTC');
      expect(analysis.impactedTokens[0].impact).toBe('high'); // Token in title
    });
  });

  describe('Batch Analysis', () => {
    it('should analyze multiple articles', () => {
      const articles = [mockArticle, { ...mockArticle, id: 'test-2' }];
      const analyses = analyzer.analyzeBatch(articles);

      expect(analyses).toHaveLength(2);
      expect(analyses[0].article.id).toBe('test-1');
      expect(analyses[1].article.id).toBe('test-2');
    });
  });

  describe('Trends', () => {
    it('should track sentiment trends', () => {
      // Analyze multiple articles
      for (let i = 0; i < 5; i++) {
        analyzer.analyze({ ...mockArticle, id: `test-${i}` });
      }

      const trend = analyzer.getSentimentTrend('BTC', 5);

      expect(trend.token).toBe('BTC');
      expect(trend.trend).toBeDefined();
      expect(trend.averageSentiment).toBeGreaterThan(0);
      expect(trend.articleCount).toBe(5);
    });

    it('should detect bullish trends', () => {
      // Add 5 bullish articles
      for (let i = 0; i < 5; i++) {
        analyzer.analyze({
          ...mockArticle,
          id: `test-${i}`,
          sentiment: CryptoPanicSentiment.POSITIVE,
          sentimentScore: 80,
        });
      }

      const trend = analyzer.getSentimentTrend('BTC', 5);
      expect(trend.trend).toBe('bullish');
    });

    it('should detect bearish trends', () => {
      // Add 5 bearish articles
      for (let i = 0; i < 5; i++) {
        analyzer.analyze({
          ...mockArticle,
          id: `test-${i}`,
          sentiment: CryptoPanicSentiment.NEGATIVE,
          sentimentScore: -80,
        });
      }

      const trend = analyzer.getSentimentTrend('BTC', 5);
      expect(trend.trend).toBe('bearish');
    });
  });

  describe('Market Overview', () => {
    it('should provide market sentiment overview', () => {
      // Add various articles
      analyzer.analyze(mockArticle);
      analyzer.analyze({
        ...mockArticle,
        id: 'test-2',
        tokens: ['ETH'],
        sentiment: CryptoPanicSentiment.NEGATIVE,
        sentimentScore: -50,
      });

      const overview = analyzer.getMarketSentimentOverview();

      expect(overview.overallSentiment).toBeDefined();
      expect(overview.averageSentimentScore).toBeDefined();
      expect(overview.totalArticles).toBe(2);
      expect(overview.sentimentDistribution).toBeDefined();
    });

    it('should identify top bullish and bearish tokens', () => {
      // Add multiple articles with different tokens
      analyzer.analyze({ ...mockArticle, tokens: ['BTC'], sentimentScore: 80 });
      analyzer.analyze({ ...mockArticle, id: 'test-2', tokens: ['ETH'], sentimentScore: -70 });

      const overview = analyzer.getMarketSentimentOverview();

      expect(overview.topBullishTokens.length).toBeGreaterThan(0);
      expect(overview.topBearishTokens.length).toBeGreaterThan(0);
    });
  });

  describe('Panic Detection', () => {
    it('should detect panic events', () => {
      const panicArticle = {
        ...mockArticle,
        panicScore: 85,
        importance: 90,
      };

      analyzer.analyze(panicArticle);

      const panicEvents = analyzer.detectPanicEvents(70, 0.7);
      expect(panicEvents.length).toBeGreaterThan(0);
      expect(panicEvents[0].panicScore).toBeGreaterThanOrEqual(70);
    });

    it('should filter by confidence', () => {
      // Low engagement = low confidence
      const lowConfidenceArticle = {
        ...mockArticle,
        panicScore: 85,
        engagement: {
          likes: 1,
          dislikes: 0,
          comments: 0,
          saves: 0,
        },
        importance: 10,
      };

      analyzer.analyze(lowConfidenceArticle);

      const panicEvents = analyzer.detectPanicEvents(70, 0.9);
      expect(panicEvents.length).toBe(0); // Should be filtered out
    });
  });

  describe('Statistics', () => {
    it('should return statistics', () => {
      analyzer.analyze(mockArticle);
      analyzer.analyze({ ...mockArticle, id: 'test-2' });

      const stats = analyzer.getStatistics();

      expect(stats.totalAnalyses).toBe(2);
      expect(stats.tokensTracked).toBeGreaterThan(0);
      expect(stats.averageConfidence).toBeGreaterThan(0);
    });
  });
});

