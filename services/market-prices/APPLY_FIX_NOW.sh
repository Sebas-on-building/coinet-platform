#!/bin/bash
# Direct fix for rate limiter - run this in /workspaces/coinet-platform/services/market-prices

cd /workspaces/coinet-platform/services/market-prices || exit 1

FILE="src/middleware/rateLimiter.ts"

if [ ! -f "$FILE" ]; then
    echo "❌ File not found. Are you in the right directory?"
    exit 1
fi

# Backup
cp "$FILE" "${FILE}.backup.$(date +%s)"

echo "📝 Applying fix to $FILE..."
echo ""

# Create the replacement code
cat > /tmp/replacement.txt << 'REPLACE'
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
REPLACE

# Show what we're replacing
echo "=== Lines 90-124 (current) ==="
sed -n '90,124p' "$FILE"
echo ""
echo "=== Replacement ==="
cat /tmp/replacement.txt
echo ""
echo "⚠️  MANUAL STEP REQUIRED:"
echo "1. Open: $FILE"
echo "2. Find lines 90-124 (the status code extraction section)"
echo "3. Replace with the code above"
echo ""
echo "Or use this Python script to do it automatically:"
echo ""
cat << 'PYTHON'
python3 << 'ENDPYTHON'
import re

file_path = "src/middleware/rateLimiter.ts"
with open(file_path, 'r') as f:
    content = f.read()

# Read replacement
with open('/tmp/replacement.txt', 'r') as f:
    replacement = f.read()

# Find and replace the status code extraction section
pattern = r'          // Extract status code.*?throw error; // Don\'t retry, throw immediately'
new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

if new_content != content:
    with open(file_path, 'w') as f:
        f.write(new_content)
    print("✅ Fix applied successfully!")
else:
    print("❌ Pattern not found. Please apply manually.")
ENDPYTHON
PYTHON

