# Commands to Apply Rate Limiter Fix

Run these commands in your `/workspaces/coinet-platform/services/market-prices` directory:

## Step 1: Navigate to the correct directory
```bash
cd /workspaces/coinet-platform/services/market-prices
```

## Step 2: Backup the file
```bash
cp src/middleware/rateLimiter.ts src/middleware/rateLimiter.ts.backup
```

## Step 3: Open the file for editing
```bash
code src/middleware/rateLimiter.ts
# OR
vim src/middleware/rateLimiter.ts
# OR
nano src/middleware/rateLimiter.ts
```

## Step 4: Find and replace
Find lines 92-112 (the status code extraction section) and replace with the code below.

## OR: Use sed to apply the fix automatically

```bash
cd /workspaces/coinet-platform/services/market-prices

# Create the fix file
cat > /tmp/rate_limiter_fix.txt << 'EOF'
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
EOF

# Backup first
cp src/middleware/rateLimiter.ts src/middleware/rateLimiter.ts.backup

# Show the lines to replace
echo "Lines to replace (92-112):"
sed -n '92,112p' src/middleware/rateLimiter.ts

echo ""
echo "⚠️  Manual replacement required!"
echo "Please replace lines 92-112 with the content from /tmp/rate_limiter_fix.txt"
```

## Step 5: Test the fix
```bash
npx tsx test-api-connection.ts
```

Look for `[DEBUG] Error details` logs in the output.

