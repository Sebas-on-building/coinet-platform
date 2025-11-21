// Test file to trigger CI pipeline for shared packages
// This file is created to test the Pull Request CI Pipeline

export interface SharedTestConfig {
  package: string;
  version: string;
  testMode: boolean;
}

export const sharedTestConfig: SharedTestConfig = {
  package: 'shared-ui',
  version: '1.0.0',
  testMode: true
};

export function testSharedFunction(): string {
  return 'CI Pipeline Test - Shared UI Package';
}

export class TestButton {
  private config: SharedTestConfig;

  constructor(config: SharedTestConfig) {
    this.config = config;
  }

  render(): string {
    return `<button data-testid="ci-test-button">Test Button - ${this.config.package}</button>`;
  }
}

// This change should trigger the shared packages job in the CI pipeline
// console.log('Shared UI test file loaded for CI validation');

export default {
  config: sharedTestConfig,
  testFunction: testSharedFunction,
  TestButton
}; 