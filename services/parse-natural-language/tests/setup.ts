/**
 * Test setup and global configurations for NLP service
 */
import { jest } from '@jest/globals';
import { NotificationPriority, Exchange } from '../src/types';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.GOOGLE_AI_API_KEY = 'test-google-ai-key';

// Increase timeout for integration tests
jest.setTimeout(30000);

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
export const createMockRule = (overrides = {}) => ({
  id: 'test-rule-id',
  name: 'Test Rule',
  description: 'Test rule description',
  triggers: [{
    type: 'price',
    conditions: {
      symbol: 'BTCUSDT',
      operator: '>',
      value: 50000
    }
  }],
  filters: [],
  conditions: [],
  timeWindows: [],
  routing: {
    channels: ['email'],
    priority: 'high'
  },
  enabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export const createMockNaturalLanguageInput = (overrides = {}) => ({
  text: "Alert me when Bitcoin price goes above $50,000 on Binance",
  userId: 'test-user-id',
  context: {
    preferredExchanges: [Exchange.BINANCE],
    riskTolerance: 'medium' as 'low' | 'medium' | 'high'
  },
  ...overrides
});

export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
