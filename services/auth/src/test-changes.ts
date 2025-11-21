// Test file to trigger CI pipeline for Node.js services
// This file is created to test the Pull Request CI Pipeline

export interface TestConfig {
  service: string;
  version: string;
  testMode: boolean;
}

export const testConfig: TestConfig = {
  service: 'auth',
  version: '1.0.0',
  testMode: true
};

export function testFunction(): string {
  return 'CI Pipeline Test - Auth Service';
}

// This change should trigger the node-services job in the CI pipeline
console.log('Auth service test file loaded for CI validation'); 