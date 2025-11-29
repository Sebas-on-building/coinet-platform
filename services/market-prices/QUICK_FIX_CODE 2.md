# Quick Fix - Copy This Code

## Step 1: Open your workspace file
Open: `/workspaces/coinet-platform/services/market-prices/src/middleware/rateLimiter.ts`

## Step 2: Find the `schedule()` method (around line 69-169)

## Step 3: Replace the ENTIRE `schedule()` method with this:

```typescript
  async schedule<T>(
    source: DataSource,
    task: () => Promise<T>,
    priority?: number
  ): Promise<T> {
    const limiter = this.limiters.get(source);
    if (!limiter) {
      throw new Error(`No rate limiter registered for ${source}`);
    }

    // Manual retry logic - wrap task to handle retries ourselves
    const wrappedTask = async (): Promise<T> => {
      let lastError: any;
      const maxRetries = 3;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await task();
        } catch (error: any) {
          lastError = error;
          
          // Extract status code - check ProviderError.statusCode first
          const statusCode = 
            error.statusCode ||                    // ProviderError.statusCode (most common)
            error.status ||                        // Some errors use 'status' instead
            error.originalError?.statusCode ||    // Nested ProviderError
            error.originalError?.status ||        // Nested error status
            error.response?.status ||              // Axios error response
            error.originalError?.response?.status; // Nested Axios error

          // Don't retry client errors (4xx except 429) - these are permanent failures
          const isClientError = typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500 && statusCode !== 429;
          
          if (isClientError) {
            logger.warn(`Not retrying ${source} - client error ${statusCode} is not retryable`, {
              error: error.message,
              statusCode,
              errorType: error.constructor?.name,
            });
            throw error; // Don't retry, throw immediately
          }

          // Only retry on retryable errors
          const isRetryable = 
            statusCode === undefined || statusCode === null || // No status code = network error
            statusCode === 429 || // Rate limit error
            (typeof statusCode === 'number' && statusCode >= 500); // Server error (5xx)

          if (!isRetryable) {
            throw error;
          }

          // If this is the last attempt, throw the error
          if (attempt === maxRetries) {
            logger.warn(`Max retries reached for ${source}`, {
              attempt: attempt + 1,
              statusCode,
            });
            throw error;
          }

          // Calculate delay for retry
          const delay = 2000 * (attempt + 1);
          logger.warn(`Retrying task for ${source} after error`, {
            attempt: attempt + 1,
            delay,
            maxRetries,
            statusCode,
            error: error.message,
          });

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      throw lastError || new Error('Task failed after retries');
    };

    try {
      return await limiter.schedule({ priority: priority || 5 }, wrappedTask);
    } catch (error: any) {
      if (error.originalError) {
        throw error.originalError;
      }
      
      if (error.statusCode === 429 || error.response?.status === 429) {
        const retryAfter = this.extractRetryAfter(error);
        throw new RateLimitError(
          `Rate limit exceeded for ${source}`,
          retryAfter,
          source
        );
      }
      throw error;
    }
  }
```

## Step 4: Save and test
After applying, run: `npx tsx test-api-connection.ts`

You should see "Not retrying coingecko - client error 400 is not retryable" instead of retry messages.

