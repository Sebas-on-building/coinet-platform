/**
 * Jest Test Setup - Global test configuration and utilities
 */

// Mock Redis globally
jest.mock('ioredis', () => {
  const RedisMock = require('ioredis-mock');
  return RedisMock;
});

// Mock external HTTP requests
jest.mock('axios');

// Mock environment variables (create new object to avoid readonly issues)
Object.assign(process.env, {
  NODE_ENV: 'test',
  LOG_LEVEL: 'error', // Reduce log noise in tests
  REDIS_URL: 'redis://localhost:6379',
  PORT: '8000',
  JWT_SECRET: 'test-secret-key-for-testing'
});

// Define test utilities interface
interface TestUtils {
  createMockService: (overrides?: any) => any;
  createMockRequest: (overrides?: any) => any;
  createMockResponse: () => any;
  sleep: (ms: number) => Promise<void>;
  generateTestToken: () => string;
  createRedisMock: () => any;
}

// Global test utilities
const testUtils: TestUtils = {
  // Create mock service instance
  createMockService: (overrides: any = {}) => ({
    id: 'test-service-1',
    name: 'test-service',
    url: 'http://localhost:4000',
    port: 4000,
    health: 'healthy',
    lastHealthCheck: new Date(),
    version: '1.0.0',
    protocol: 'http',
    metadata: {
      critical: false,
      maxConnections: 100,
      region: 'local',
      zone: 'primary',
      tags: ['test'],
      dependencies: []
    },
    ...overrides
  }),

  // Create mock request
  createMockRequest: (overrides: any = {}) => ({
    method: 'GET',
    url: '/api/test',
    headers: {
      'user-agent': 'test-agent',
      'x-request-id': 'test-request-id'
    },
    body: {},
    query: {},
    params: {},
    ip: '127.0.0.1',
    ...overrides
  }),

  // Create mock response
  createMockResponse: () => {
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      on: jest.fn(),
      locals: {}
    };
    return res;
  },

  // Wait for async operations
  sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Generate test JWT token
  generateTestToken: () => 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJpYXQiOjE2MzAwMDAwMDB9.test-signature',

  // Create Redis mock instance
  createRedisMock: () => {
    const RedisMock = require('ioredis-mock');
    return new RedisMock();
  }
};

// Assign to global object
(global as any).testUtils = testUtils;

// Setup console mocking for cleaner test output
const originalConsole = console;
beforeEach(() => {
  // Suppress console output in tests unless explicitly needed
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  // Restore console and clear all mocks
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

// Clean up after all tests
afterAll(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

// Export to make this a module and allow global augmentation
export {}; 