#!/bin/bash
# Run this in your CODESPACE to check what files are missing

echo "🔍 Checking CryptoPanic files in codespace..."
echo ""

cd /workspaces/coinet-platform/services/market-prices 2>/dev/null || cd . 2>/dev/null || {
    echo "❌ Error: Could not find codespace directory"
    echo "   Current directory: $(pwd)"
    exit 1
}

FILES=(
    "src/providers/cryptopanic-rest.ts"
    "src/services/cryptopanic-news.service.ts"
    "src/services/cryptopanic-sentiment.service.ts"
    "src/types/cryptopanic.types.ts"
    "src/examples/cryptopanic-integration.example.ts"
    "src/tests/cryptopanic.test.ts"
    "test-cryptopanic.ts"
)

EXISTS=0
MISSING=0

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
        EXISTS=$((EXISTS + 1))
    else
        echo "❌ $file (MISSING)"
        MISSING=$((MISSING + 1))
    fi
done

echo ""
echo "📊 Summary:"
echo "   ✅ Found: $EXISTS files"
echo "   ❌ Missing: $MISSING files"

if [ $MISSING -gt 0 ]; then
    echo ""
    echo "🔧 To fix:"
    echo "   1. On your LOCAL machine, run:"
    echo "      cd /Users/sebastian/Desktop/Arbeit/Coinet/services/market-prices"
    echo "      bash commit-cryptopanic.sh"
    echo ""
    echo "   2. Then in codespace, run:"
    echo "      cd /workspaces/coinet-platform"
    echo "      git pull origin main"
    echo ""
    echo "   OR copy files manually using VS Code"
fi

