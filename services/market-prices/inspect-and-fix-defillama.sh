#!/bin/bash
# Script to inspect DeFiLlama test mocks and fix implementation
# Run this in Codespace: bash inspect-and-fix-defillama.sh

echo "🔍 Inspecting DeFiLlama test file..."

TEST_FILE="services/market-prices/src/tests/defillama.test.ts"
IMPL_FILE="services/market-prices/src/providers/defillama-rest.ts"

if [ ! -f "$TEST_FILE" ]; then
    echo "❌ Test file not found at $TEST_FILE"
    echo "Looking for test files..."
    find . -name "defillama.test.ts" -type f 2>/dev/null | grep -v node_modules
    exit 1
fi

echo "✅ Found test file: $TEST_FILE"
echo ""
echo "📋 Axios Mock Structure:"
echo "---"
grep -A 20 "vi.mock\|mockImplementation\|mockResolvedValue" "$TEST_FILE" | head -30
echo ""
echo "📋 /yields endpoint mock:"
echo "---"
grep -B 5 -A 15 "/yields\|getPools" "$TEST_FILE" | head -25
echo ""
echo "📋 /stablecoins endpoint mock:"
echo "---"
grep -B 5 -A 15 "/stablecoins\|getStablecoins" "$TEST_FILE" | head -25

echo ""
echo "💡 Next steps:"
echo "1. Check the mock structure above"
echo "2. Update $IMPL_FILE getPools() and getStablecoins() methods"
echo "3. Run: cd services/market-prices && npm run test:defi"

