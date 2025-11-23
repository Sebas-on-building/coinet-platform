/**
 * Test setup and global configurations
 */
import { jest } from '@jest/globals';
import { NotificationEventType, NotificationPriority } from '../src/types';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.REDIS_PASSWORD = 'test-password';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests, but preserve original console for debugging
const originalConsole = { ...console };
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test utilities
export const createMockAlertEvent = (overrides = {}) => ({
  id: 'test-event-id',
  type: NotificationEventType.ALERT_TRIGGERED,
  alertRuleId: 'test-rule-id',
  userId: 'test-user-id',
  severity: NotificationPriority.HIGH,
  title: 'Test Alert',
  message: 'This is a test alert message',
  data: { price: 50000, symbol: 'BTC' },
  timestamp: 1640995200000, // Fixed timestamp to avoid Date.now() mocking issues
  source: {
    exchange: 'binance',
    symbol: 'BTCUSDT',
    assetType: 'crypto',
    signalType: 'price_breakout'
  },
  metrics: {
    confidence: 0.95,
    impact: 0.8,
    urgency: 0.9
  },
  tags: ['test', 'price'],
  ttl: 3600000,
  priority: NotificationPriority.HIGH,
  ...overrides
});

export const createMockUserPreferences = (overrides = {}) => ({
  userId: 'test-user-id',
  global: {
    timezone: 'UTC',
    emergencyContact: 'test@example.com',
    doNotDisturb: {
      enabled: false,
      until: undefined
    }
  },
  channels: [
    {
      channel: 'email',
      enabled: true,
      minPriority: NotificationPriority.HIGH,
      quietHours: { enabled: true, timezone: 'UTC', startTime: '22:00', endTime: '08:00' }
    },
    {
      channel: 'sms',
      enabled: true,
      minPriority: NotificationPriority.HIGH
    }
  ],
  eventFilters: {
    enabledTypes: [NotificationEventType.ALERT_TRIGGERED],
    disabledTypes: [],
    severityFilters: {
      [NotificationPriority.LOW]: true,
      [NotificationPriority.NORMAL]: true,
      [NotificationPriority.HIGH]: true,
      [NotificationPriority.URGENT]: true,
      [NotificationPriority.CRITICAL]: true
    }
  },
  ...overrides
});

// Helper to wait for async operations
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to restore Date.now after mocking
export const restoreDateNow = () => {
  Date.now = () => new Date().getTime();
};
