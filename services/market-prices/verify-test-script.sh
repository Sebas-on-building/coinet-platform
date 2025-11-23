#!/bin/bash
# Verify and fix test script in coinet-platform workspace

cd /workspaces/coinet-platform/services/market-prices 2>/dev/null || {
    echo "❌ Not in coinet-platform workspace"
    echo "Please run this from: /workspaces/coinet-platform/services/market-prices"
    exit 1
}

FILE="test-api-connection.ts"

echo "Checking $FILE..."

# Check if the fix is applied
if grep -q "CoinGecko test failed, continuing with CoinMarketCap" "$FILE"; then
    echo "✅ Fix is applied!"
else
    echo "❌ Fix NOT applied. Current runTests function:"
    echo ""
    sed -n '/async function runTests/,/^}$/p' "$FILE" | head -20
    echo ""
    echo "⚠️  The file needs to be updated. The fix should include:"
    echo "   'CoinGecko test failed, continuing with CoinMarketCap'"
fi

