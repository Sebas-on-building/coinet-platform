/**
 * Token Unlocks System Tests
 * Comprehensive test suite for token unlock functionality
 */

import { TokenUnlocksService } from '../services/token-unlocks.service';
import { TokenUnlocksAnalytics } from '../services/token-unlocks-analytics';
import { TokenUnlocksScheduler } from '../services/token-unlocks-scheduler';
import { TokenUnlocksCache } from '../storage/token-unlocks-cache';
import { TokenUnlocksStorage } from '../storage/token-unlocks-storage';
import { MessariRestClient } from '../providers/messari-rest';
import { NormalizedTokenUnlock } from '../types/messari.types';

// Mock configuration for testing
const mockConfig = {
  messari: {
    apiKey: 'test-api-key',
    apiUrl: 'https://data.messari.io/api/v1',
  },
  cache: {
    host: 'localhost',
    port: 6379,
    db: 15, // Use separate DB for testing
    defaultTTL: 3600,
    nearTermThreshold: 7,
    nearTermTTL: 600,
  },
  database: {
    host: 'localhost',
    port: 5432,
    database: 'coinet_test',
    user: 'postgres',
    password: '',
  },
  scheduler: {
    enableDailyPolling: false, // Disable for testing
    enableNearTermPolling: false,
  },
  enablePriceFeedIntegration: false,
  alertThresholds: {
    minSeverity: 'medium' as const,
    daysAhead: 7,
  },
};

// Mock unlock data
const createMockUnlock = (overrides?: Partial<NormalizedTokenUnlock>): NormalizedTokenUnlock => {
  const baseUnlock: NormalizedTokenUnlock = {
    id: 'test-unlock-1',
    source: 'messari',
    assetId: 'ARB',
    symbol: 'ARB',
    name: 'Arbitrum',
    unlockDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    unlockAmount: 1000000,
    unlockAmountUsd: 1500000,
    unlockPercentage: 5,
    category: 'team',
    label: 'Team Vesting',
    impactScore: 65,
    severity: 'high',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return { ...baseUnlock, ...overrides };
};

describe('Token Unlocks Analytics', () => {
  describe('Impact Assessment', () => {
    it('should calculate impact assessment correctly', () => {
      const unlock = createMockUnlock();
      const assessment = TokenUnlocksAnalytics.calculateImpactAssessment(unlock);

      expect(assessment).toBeDefined();
      expect(assessment.unlock).toEqual(unlock);
      expect(assessment.overallScore).toBeGreaterThan(0);
      expect(assessment.overallScore).toBeLessThanOrEqual(100);
      expect(assessment.severity).toBeDefined();
      expect(assessment.factors).toBeDefined();
      expect(assessment.recommendations.length).toBeGreaterThan(0);
    });

    it('should assign critical severity for high-risk unlocks', () => {
      const unlock = createMockUnlock({
        unlockPercentage: 15,
        unlockAmountUsd: 50000000,
        category: 'team',
      });

      const assessment = TokenUnlocksAnalytics.calculateImpactAssessment(unlock);

      expect(assessment.severity).toBe('critical');
      expect(assessment.overallScore).toBeGreaterThanOrEqual(80);
    });

    it('should assign low severity for minor unlocks', () => {
      const unlock = createMockUnlock({
        unlockPercentage: 0.5,
        unlockAmountUsd: 100000,
        category: 'community',
      });

      const assessment = TokenUnlocksAnalytics.calculateImpactAssessment(unlock);

      expect(assessment.severity).toBe('low');
      expect(assessment.overallScore).toBeLessThan(40);
    });

    it('should include appropriate recommendations', () => {
      const unlock = createMockUnlock({
        severity: 'critical',
        impactScore: 85,
      });

      const assessment = TokenUnlocksAnalytics.calculateImpactAssessment(unlock);

      expect(assessment.recommendations.length).toBeGreaterThan(0);
      expect(assessment.recommendations.some((r) => r.includes('CRITICAL'))).toBe(true);
    });
  });

  describe('Market Pressure Analysis', () => {
    it('should analyze market pressure correctly', () => {
      const unlocks = [
        createMockUnlock({ unlockAmountUsd: 1000000 }),
        createMockUnlock({ unlockAmountUsd: 2000000 }),
        createMockUnlock({ unlockAmountUsd: 1500000 }),
      ];

      const pressure = TokenUnlocksAnalytics.analyzeMarketPressure(unlocks);

      expect(pressure.totalUpcomingUnlocks).toBe(3);
      expect(pressure.totalUnlockValueUsd).toBe(4500000);
      expect(pressure.pressureLevel).toBeDefined();
      expect(pressure.recommendations.length).toBeGreaterThan(0);
    });

    it('should identify extreme pressure correctly', () => {
      const mockMarketPrice = {
        symbol: 'ARB',
        price: 1.5,
        marketCap: 10000000, // Small market cap
      } as any;

      const unlocks = [
        createMockUnlock({ unlockAmountUsd: 4000000 }), // 40% of market cap
      ];

      const pressure = TokenUnlocksAnalytics.analyzeMarketPressure(
        unlocks,
        mockMarketPrice
      );

      expect(pressure.pressureLevel).toBe('extreme');
      expect(pressure.percentOfMarketCap).toBeGreaterThan(30);
    });
  });

  describe('Supply Dilution Analysis', () => {
    it('should analyze supply dilution correctly', () => {
      const unlock = createMockUnlock({
        unlockAmount: 1000000,
        circulatingSupplyBefore: 10000000,
      });

      const dilution = TokenUnlocksAnalytics.analyzeSupplyDilution(unlock);

      expect(dilution.dilutionPercentage).toBe(10);
      expect(dilution.currentCirculatingSupply).toBe(10000000);
      expect(dilution.postUnlockCirculatingSupply).toBe(11000000);
      expect(dilution.estimatedPriceImpact).toBeLessThan(0);
      expect(dilution.timeToAbsorb).toBeGreaterThan(0);
    });
  });

  describe('Category Performance Analysis', () => {
    it('should analyze categories correctly', () => {
      const unlocks = [
        createMockUnlock({ category: 'team', unlockAmountUsd: 5000000 }),
        createMockUnlock({ category: 'team', unlockAmountUsd: 3000000 }),
        createMockUnlock({ category: 'investor', unlockAmountUsd: 2000000 }),
        createMockUnlock({ category: 'community', unlockAmountUsd: 1000000 }),
      ];

      const analysis = TokenUnlocksAnalytics.analyzeCategoryPerformance(unlocks);

      expect(analysis.length).toBe(3); // 3 unique categories
      expect(analysis[0].category).toBe('team'); // Sorted by value
      expect(analysis[0].totalValueUsd).toBe(8000000);
      expect(analysis[0].totalUnlocks).toBe(2);
    });
  });

  describe('Comprehensive Analytics Report', () => {
    it('should generate comprehensive report', () => {
      const unlocks = [
        createMockUnlock({ severity: 'critical', impactScore: 85 }),
        createMockUnlock({ severity: 'high', impactScore: 70 }),
        createMockUnlock({ severity: 'medium', impactScore: 50 }),
        createMockUnlock({ severity: 'low', impactScore: 30 }),
      ];

      const report = TokenUnlocksAnalytics.generateAnalyticsReport(unlocks);

      expect(report.summary.totalUnlocks).toBe(4);
      expect(report.summary.criticalImpactCount).toBe(1);
      expect(report.summary.highImpactCount).toBe(1);
      expect(report.assessments.length).toBe(4);
      expect(report.marketPressure).toBeDefined();
      expect(report.categoryAnalysis.length).toBeGreaterThan(0);
      expect(report.topRisks.length).toBeGreaterThan(0);
    });
  });
});

describe('Token Unlocks Cache', () => {
  let cache: TokenUnlocksCache;

  beforeAll(() => {
    cache = new TokenUnlocksCache(mockConfig.cache);
  });

  afterAll(async () => {
    await cache.close();
  });

  it('should cache and retrieve unlock', async () => {
    const unlock = createMockUnlock();
    await cache.cacheUnlock(unlock);

    const retrieved = await cache.getUnlock(unlock.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(unlock.id);
    expect(retrieved?.symbol).toBe(unlock.symbol);
  });

  it('should cache and retrieve multiple unlocks', async () => {
    const unlocks = [
      createMockUnlock({ id: 'unlock-1' }),
      createMockUnlock({ id: 'unlock-2' }),
      createMockUnlock({ id: 'unlock-3' }),
    ];

    await cache.cacheUnlocks(unlocks);

    const retrieved1 = await cache.getUnlock('unlock-1');
    const retrieved2 = await cache.getUnlock('unlock-2');
    const retrieved3 = await cache.getUnlock('unlock-3');

    expect(retrieved1).toBeDefined();
    expect(retrieved2).toBeDefined();
    expect(retrieved3).toBeDefined();
  });

  it('should cache unlocks by symbol', async () => {
    const symbol = 'ARB';
    const unlocks = [
      createMockUnlock({ symbol, id: 'arb-1' }),
      createMockUnlock({ symbol, id: 'arb-2' }),
    ];

    await cache.cacheUpcomingUnlocksBySymbol(symbol, unlocks);

    const retrieved = await cache.getUpcomingUnlocksBySymbol(symbol);
    expect(retrieved).toBeDefined();
    expect(retrieved?.length).toBe(2);
  });

  it('should health check pass', async () => {
    const healthy = await cache.healthCheck();
    expect(healthy).toBe(true);
  });

  it('should get cache stats', async () => {
    const stats = await cache.getStats();
    expect(stats).toBeDefined();
    expect(stats.memoryCacheSize).toBeGreaterThanOrEqual(0);
  });
});

describe('Token Unlocks Storage', () => {
  let storage: TokenUnlocksStorage;

  beforeAll(async () => {
    storage = new TokenUnlocksStorage(mockConfig.database);
    await storage.initialize();
  });

  afterAll(async () => {
    await storage.close();
  });

  it('should initialize database schema', async () => {
    const healthy = await storage.healthCheck();
    expect(healthy).toBe(true);
  });

  it('should store and retrieve unlock', async () => {
    const unlock = createMockUnlock({ id: 'storage-test-1' });
    await storage.storeUnlock(unlock);

    const retrieved = await storage.getUpcomingUnlocksBySymbol(unlock.symbol, 30);
    expect(retrieved.length).toBeGreaterThan(0);

    const found = retrieved.find((u) => u.id === unlock.id);
    expect(found).toBeDefined();
  });

  it('should store multiple unlocks', async () => {
    const unlocks = [
      createMockUnlock({ id: 'batch-1', symbol: 'TEST1' }),
      createMockUnlock({ id: 'batch-2', symbol: 'TEST1' }),
      createMockUnlock({ id: 'batch-3', symbol: 'TEST1' }),
    ];

    await storage.storeUnlocks(unlocks);

    const retrieved = await storage.getUpcomingUnlocksBySymbol('TEST1', 30);
    expect(retrieved.length).toBeGreaterThanOrEqual(3);
  });

  it('should retrieve high-impact unlocks', async () => {
    const highImpact = createMockUnlock({
      id: 'high-impact-test',
      symbol: 'TEST2',
      severity: 'high',
      impactScore: 75,
    });

    await storage.storeUnlock(highImpact);

    const retrieved = await storage.getHighImpactUnlocks(30, 'high');
    expect(retrieved.length).toBeGreaterThan(0);

    const found = retrieved.find((u) => u.id === highImpact.id);
    expect(found).toBeDefined();
  });
});

describe('Token Unlocks Scheduler', () => {
  let cache: TokenUnlocksCache;
  let storage: TokenUnlocksStorage;
  let messariClient: MessariRestClient;
  let scheduler: TokenUnlocksScheduler;

  beforeAll(async () => {
    cache = new TokenUnlocksCache(mockConfig.cache);
    storage = new TokenUnlocksStorage(mockConfig.database);
    await storage.initialize();

    messariClient = new MessariRestClient({
      apiKey: mockConfig.messari.apiKey,
      apiUrl: mockConfig.messari.apiUrl,
      rateLimit: {
        maxRequestsPerMinute: 30,
        reservoir: 30,
        reservoirRefreshAmount: 30,
        reservoirRefreshInterval: 60000,
      },
      retry: {
        retries: 1,
        retryDelay: 1000,
      },
      priority: 2,
    });

    scheduler = new TokenUnlocksScheduler(
      messariClient,
      cache,
      storage,
      {
        enableDailyPolling: false,
        enableNearTermPolling: false,
      }
    );
  });

  afterAll(async () => {
    scheduler.stop();
    await cache.close();
    await storage.close();
  });

  it('should start and stop scheduler', () => {
    scheduler.start();
    const status = scheduler.getStatus();
    expect(status.isRunning).toBe(true);

    scheduler.stop();
    const stoppedStatus = scheduler.getStatus();
    expect(stoppedStatus.isRunning).toBe(false);
  });

  it('should pause and resume scheduler', () => {
    scheduler.start();
    scheduler.pause();

    const pausedStatus = scheduler.getStatus();
    expect(pausedStatus.isPaused).toBe(true);

    scheduler.resume();
    const resumedStatus = scheduler.getStatus();
    expect(resumedStatus.isPaused).toBe(false);

    scheduler.stop();
  });

  it('should get scheduler stats', () => {
    const stats = scheduler.getStats();
    expect(stats).toBeDefined();
    expect(stats.dailyPollCount).toBeGreaterThanOrEqual(0);
    expect(stats.nearTermPollCount).toBeGreaterThanOrEqual(0);
  });

  it('should update configuration', () => {
    const newConfig = {
      nearTermThresholdDays: 14,
    };

    scheduler.updateConfig(newConfig);
    const status = scheduler.getStatus();
    expect(status.config.nearTermThresholdDays).toBe(14);
  });
});

// Integration tests (require actual API access)
describe.skip('Token Unlocks Service Integration', () => {
  let service: TokenUnlocksService;

  beforeAll(async () => {
    service = new TokenUnlocksService(mockConfig);
    await service.initialize();
  });

  afterAll(async () => {
    await service.shutdown();
  });

  it('should fetch upcoming unlocks from Messari', async () => {
    const unlocks = await service.getUpcomingUnlocks('ARB', 30, false);
    expect(Array.isArray(unlocks)).toBe(true);
  });

  it('should fetch all upcoming unlocks', async () => {
    const unlocks = await service.getAllUpcomingUnlocks(30, false);
    expect(Array.isArray(unlocks)).toBe(true);
  });

  it('should fetch high-impact unlocks', async () => {
    const unlocks = await service.getHighImpactUnlocks(30, 'medium');
    expect(Array.isArray(unlocks)).toBe(true);
  });

  it('should generate alerts', async () => {
    const alerts = await service.generateAlerts(7, 'medium');
    expect(Array.isArray(alerts)).toBe(true);
  });

  it('should fetch tokenomics', async () => {
    const tokenomics = await service.getTokenomics('ARB', false);
    expect(tokenomics).toBeDefined();
  });

  it('should get unlock analytics', async () => {
    const analytics = await service.getUnlockAnalytics(30);
    expect(analytics).toBeDefined();
    expect(analytics.totalUpcoming).toBeGreaterThanOrEqual(0);
  });

  it('should check service health', async () => {
    const health = await service.getHealthStatus();
    expect(health).toBeDefined();
    expect(health.storage).toBe(true);
  });
});

// Export for running tests
export default {
  TokenUnlocksAnalytics,
  TokenUnlocksCache,
  TokenUnlocksStorage,
  TokenUnlocksScheduler,
  TokenUnlocksService,
};

