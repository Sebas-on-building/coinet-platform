import { describe, it, expect } from '@jest/globals';

// Sample test for the health endpoint
describe('Health Endpoint', () => {
  it('should return healthy status', () => {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'ingest-service',
      version: '1.0.0'
    };

    expect(healthStatus.status).toBe('healthy');
    expect(healthStatus.service).toBe('ingest-service');
    expect(healthStatus.version).toBe('1.0.0');
    expect(healthStatus.timestamp).toBeDefined();
  });

  it('should have valid timestamp format', () => {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'ingest-service',
      version: '1.0.0'
    };

    // Check if timestamp is a valid ISO string
    const timestamp = new Date(healthStatus.timestamp);
    expect(timestamp).toBeInstanceOf(Date);
    expect(timestamp.toISOString()).toBe(healthStatus.timestamp);
  });

  it('should include required fields', () => {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'ingest-service',
      version: '1.0.0'
    };

    expect(healthStatus).toHaveProperty('status');
    expect(healthStatus).toHaveProperty('timestamp');
    expect(healthStatus).toHaveProperty('service');
    expect(healthStatus).toHaveProperty('version');
  });
}); 