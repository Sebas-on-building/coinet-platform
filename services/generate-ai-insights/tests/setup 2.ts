/**
 * Test setup and global configurations for AI insights service
 */
import { jest } from '@jest/globals';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.OPENAI_API_KEY = 'test-openai-key';

// Increase timeout for ML operations
jest.setTimeout(60000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock external API calls
jest.mock('@/utils/Logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnThis()
  }))
}));

// Helper functions for tests
export const createMockAlertPerformance = (overrides = {}) => ({
  alertId: 'test-alert-id',
  userId: 'test-user-id',
  timestamp: new Date(),
  signalType: 'price',
  symbol: 'BTCUSDT',
  exchange: 'binance',
  triggerValue: 50000,
  actualOutcome: {
    price: 51000,
    volume: 1000000,
    timestamp: new Date(),
    success: true
  },
  accuracy: 0.85,
  latency: 150,
  confidence: 0.9,
  ...overrides
});

export const createMockSignalCorrelation = (overrides = {}) => ({
  signalA: 'price',
  signalB: 'volume',
  correlation: 0.75,
  timeframe: '1h',
  sampleSize: 1000,
  significance: 0.95,
  trend: 'positive' as const,
  strength: 'strong' as const,
  lastUpdated: new Date(),
  ...overrides
});

export const createMockUserFeedback = (overrides = {}) => ({
  userId: 'test-user-id',
  alertId: 'test-alert-id',
  timestamp: new Date(),
  rating: 4,
  comment: 'Good alert timing',
  categories: ['accuracy', 'timing'],
  sentiment: 'positive' as const,
  helpfulness: 4,
  ...overrides
});

export const createMockRecommendation = (overrides = {}) => ({
  id: 'test-recommendation-id',
  type: 'signal_weight',
  priority: 'high',
  title: 'Adjust BTC price signal weight',
  description: 'Based on recent performance analysis',
  confidence: 0.85,
  impact: 'medium',
  effort: 'low',
  explanation: {
    reasoning: 'Historical data shows BTC price signals have 15% higher accuracy',
    dataPoints: ['BTC price accuracy: 0.85', 'Volume accuracy: 0.72'],
    alternatives: ['Keep current weights', 'Increase volume weight']
  },
  actions: [
    { type: 'update_signal_weight', signal: 'price', newWeight: 0.7 },
    { type: 'add_data_source', source: 'order_book' }
  ],
  ...overrides
});

export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
