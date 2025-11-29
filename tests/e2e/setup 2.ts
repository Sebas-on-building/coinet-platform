/**
 * E2E Test Setup
 */

// Extend Jest timeout for E2E tests
jest.setTimeout(30000);

// Global test configuration
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Suppress console output during tests unless explicitly needed
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.log = (...args: any[]) => {
    if (args[0]?.includes?.('🔍') || args[0]?.includes?.('📊') || args[0]?.includes?.('⏭️')) {
      originalConsoleLog(...args);
    }
  };
  
  console.warn = (...args: any[]) => {
    if (args[0]?.includes?.('⚠️')) {
      originalConsoleWarn(...args);
    }
  };
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
});
