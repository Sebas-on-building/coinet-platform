/**
 * Example Usage: Enhanced Error Handler
 * Demonstrates how to use the EnhancedErrorHandler with circuit breaker
 */

import { EnhancedErrorHandler, getEnhancedErrorHandler } from '../utils/enhanced-error-handler';
import { DataSource } from '../types';
import { AxiosError } from 'axios';

async function exampleEnhancedErrorHandler() {
  // Get singleton instance
  const errorHandler = getEnhancedErrorHandler({
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000, // 1 minute
    resetTimeout: 300000, // 5 minutes
  });

  console.log('=== Example 1: Handle API Errors ===');
  
  // Simulate an API error
  const mockError = {
    response: {
      status: 500,
      statusText: 'Internal Server Error',
      data: { error: 'Service temporarily unavailable' },
    },
    config: {
      url: '/api/price',
      method: 'GET',
    },
    message: 'Request failed with status code 500',
  } as AxiosError;

  try {
    errorHandler.handleError(
      mockError,
      DataSource.COINGECKO,
      '/api/price',
      { symbol: 'BTC' }
    );
  } catch (error) {
    console.log('Error handled:', error);
  }

  console.log('\n=== Example 2: Check Circuit Breaker Status ===');
  const status = errorHandler.getCircuitBreakerStatus();
  Object.entries(status).forEach(([source, state]) => {
    console.log(`${source}:`);
    console.log(`  State: ${state.state}`);
    console.log(`  Failures: ${state.failures}`);
    console.log(`  Successes: ${state.successes}`);
  });

  console.log('\n=== Example 3: Record Success ===');
  errorHandler.recordSuccess(DataSource.COINGECKO);
  const updatedStatus = errorHandler.getCircuitBreakerStatus();
  console.log(`CoinGecko failures after success: ${updatedStatus[DataSource.COINGECKO].failures}`);

  console.log('\n=== Example 4: Get Error Statistics ===');
  const errorStats = errorHandler.getErrorStats();
  console.log('Error Statistics:', JSON.stringify(errorStats, null, 2));

  console.log('\n=== Example 5: Reset Circuit Breaker ===');
  errorHandler.resetCircuitBreaker(DataSource.COINGECKO);
  const resetStatus = errorHandler.getCircuitBreakerStatus();
  console.log(`CoinGecko state after reset: ${resetStatus[DataSource.COINGECKO].state}`);

  console.log('\n=== Example 6: Check if Circuit is Open ===');
  const isOpen = errorHandler.isCircuitOpen(DataSource.COINGECKO);
  console.log(`CoinGecko circuit open: ${isOpen}`);

  // Simulate multiple failures to trigger circuit breaker
  console.log('\n=== Example 7: Simulate Circuit Breaker Opening ===');
  for (let i = 0; i < 6; i++) {
    const serverError = {
      response: { status: 500 },
      config: { url: '/api/price', method: 'GET' },
      message: 'Server error',
    } as AxiosError;
    
    try {
      errorHandler.handleError(serverError, DataSource.COINGECKO, '/api/price');
    } catch (e) {
      // Expected
    }
  }

  const finalStatus = errorHandler.getCircuitBreakerStatus();
  console.log(`CoinGecko state after failures: ${finalStatus[DataSource.COINGECKO].state}`);
  console.log(`Failures: ${finalStatus[DataSource.COINGECKO].failures}`);
}

// Run example if executed directly
if (require.main === module) {
  exampleEnhancedErrorHandler().catch(console.error);
}

export { exampleEnhancedErrorHandler };

