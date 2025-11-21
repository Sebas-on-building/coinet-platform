/**
 * Jest configuration for E2E tests
 */

module.exports = {
  displayName: 'E2E Tests',
  testMatch: ['<rootDir>/**/*.e2e.test.ts'],
  testEnvironment: 'node',
  preset: 'ts-jest',
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],
  testTimeout: 30000, // 30 seconds for E2E tests
  verbose: true,
  collectCoverage: false, // Disable coverage for E2E tests
  maxWorkers: 1, // Run E2E tests sequentially
  forceExit: true,
  detectOpenHandles: true,
  globals: {
    'ts-jest': {
      useESM: false
    }
  }
};
