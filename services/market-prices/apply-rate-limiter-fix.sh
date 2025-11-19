#!/bin/bash
# Script to apply rate limiter fix to coinet-platform workspace

FILE="/workspaces/coinet-platform/services/market-prices/src/middleware/rateLimiter.ts"

if [ ! -f "$FILE" ]; then
    echo "❌ File not found: $FILE"
    echo "Please run this script from your coinet-platform workspace"
    exit 1
fi

echo "✅ Found file: $FILE"
echo ""
echo "Applying fix..."
echo ""

# Create a backup
cp "$FILE" "${FILE}.backup"
echo "📦 Backup created: ${FILE}.backup"

# The fix replaces lines 92-98 with improved status code extraction
# Using sed to replace the status code extraction logic

cat > /tmp/fix_snippet.txt << 'FIXCODE'
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
FIXCODE

echo "⚠️  Manual fix required!"
echo ""
echo "The fix needs to be applied manually. Here's what to do:"
echo ""
echo "1. Open: $FILE"
echo "2. Find the schedule() method (around line 69)"
echo "3. Find lines 92-112 (the status code extraction section)"
echo "4. Replace those lines with the code from: /tmp/fix_snippet.txt"
echo ""
echo "Or copy the code from RATE_LIMITER_FIX.md"
echo ""
echo "After applying, run: npx tsx test-api-connection.ts"
echo "Look for '[DEBUG] Error details' logs to see what's happening"

