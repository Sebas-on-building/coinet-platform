#!/bin/bash
# Script to verify and fix rate limiter in coinet-platform workspace

FILE="src/middleware/rateLimiter.ts"

if [ ! -f "$FILE" ]; then
    echo "❌ File not found: $FILE"
    echo "Please run this from: /workspaces/coinet-platform/services/market-prices"
    exit 1
fi

echo "✅ Found file: $FILE"
echo ""

# Check if debug logging exists
if grep -q "\[DEBUG\] Error details for" "$FILE"; then
    echo "✅ Debug logging found - fix appears to be applied"
else
    echo "❌ Debug logging NOT found - fix needs to be applied"
    echo ""
    echo "Current status code extraction (lines 92-98):"
    sed -n '92,98p' "$FILE"
    echo ""
    echo "⚠️  Please manually replace lines 92-112 with the fix code"
    echo "   See: RATE_LIMITER_FIX.md or /tmp/rate_limiter_fix.txt"
fi

echo ""
echo "Checking for nullish coalescing (??) operator:"
if grep -q "error.statusCode ??" "$FILE"; then
    echo "✅ Using ?? operator (correct)"
else
    echo "❌ Still using || operator (needs fix)"
fi

echo ""
echo "Checking for client error check:"
if grep -q "isClientError.*statusCode >= 400" "$FILE"; then
    echo "✅ Client error check found"
else
    echo "❌ Client error check NOT found"
fi

