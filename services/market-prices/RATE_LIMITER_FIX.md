# Rate Limiter Fix for coinet-platform Workspace

## File to Edit
`/workspaces/coinet-platform/services/market-prices/src/middleware/rateLimiter.ts`

## Problem
The rate limiter is retrying 400 Bad Request errors. The status code extraction isn't working correctly.

## Fix
Replace lines 90-124 in the `schedule()` method with this code:

```typescript
          // Extract status code - check ProviderError.statusCode first, then nested properties
          // ProviderError has statusCode as a direct property
          const statusCode = 
            error.statusCode ??                    // ProviderError.statusCode (most common)
            error.status ??                        // Some errors use 'status' instead
            error.originalError?.statusCode ??    // Nested ProviderError
            error.originalError?.status ??        // Nested error status
            error.response?.status ??              // Axios error response
            error.originalError?.response?.status ?? // Nested Axios error
            undefined;

          // Debug logging to see what we're getting
          logger.warn(`[DEBUG] Error details for ${source}`, {
            statusCode,
            errorType: error.constructor?.name,
            hasStatusCode: !!error.statusCode,
            hasStatus: !!error.status,
            hasOriginalError: !!error.originalError,
            originalErrorStatusCode: error.originalError?.statusCode,
            originalErrorStatus: error.originalError?.status,
            responseStatus: error.response?.status,
            originalResponseStatus: error.originalError?.response?.status,
            errorKeys: Object.keys(error),
            fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
          });

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
```

## Key Changes
1. Changed `||` to `??` (nullish coalescing) to properly handle falsy values
2. Added comprehensive debug logging to see what's actually in the error object
3. Added `fullError` serialization to see the complete error structure

## After Applying
Run the test again and check for `[DEBUG] Error details` logs to see what status code is being extracted.

