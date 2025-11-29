// Test file to trigger CI pipeline for applications
// This file is created to test the Pull Request CI Pipeline

import React from 'react';

interface TestProps {
  service: string;
  version: string;
  testMode: boolean;
}

const TestComponent: React.FC<TestProps> = ({ service, version, testMode }) => {
  return (
    <div>
      <h1>CI Pipeline Test - Web Client</h1>
      <p>Service: {service}</p>
      <p>Version: {version}</p>
      <p>Test Mode: {testMode ? 'Enabled' : 'Disabled'}</p>
    </div>
  );
};

export const testConfig: TestProps = {
  service: 'web-client',
  version: '1.0.0',
  testMode: true
};

export function testFunction(): string {
  return 'CI Pipeline Test - Web Client App';
}

// This change should trigger the apps job in the CI pipeline
console.log('Web client test file loaded for CI validation');

export default TestComponent; 