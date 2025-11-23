#!/bin/bash
# Script to apply the rate limiter fix to your workspace

WORKSPACE_FILE="/workspaces/coinet-platform/services/market-prices/src/middleware/rateLimiter.ts"

if [ ! -f "$WORKSPACE_FILE" ]; then
    echo "Error: File not found at $WORKSPACE_FILE"
    echo "Please update the WORKSPACE_FILE path in this script"
    exit 1
fi

echo "Applying fix to: $WORKSPACE_FILE"
echo "Backing up original file..."
cp "$WORKSPACE_FILE" "${WORKSPACE_FILE}.backup"

# The fix is already in the file I edited, so let me provide the key changes:
echo ""
echo "The main changes needed are:"
echo "1. Replace the 'schedule' method with manual retry logic"
echo "2. Update status code extraction to check error.statusCode first"
echo ""
echo "See the fixed file at: services/market-prices/src/middleware/rateLimiter.ts"
echo ""
echo "Or manually apply these changes to the schedule() method:"
echo "- Extract statusCode from error.statusCode first (not from nested response)"
echo "- Check if statusCode is 400-499 (except 429) and throw immediately (don't retry)"
echo "- Only retry on network errors, 429, or 5xx errors"

