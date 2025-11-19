#!/bin/bash
# Run this script on your LOCAL MACHINE (not codespace!)
# It will commit and push all CryptoPanic files

set -e

echo "🚀 Committing CryptoPanic integration files..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from services/market-prices directory"
    echo "   Current directory: $(pwd)"
    exit 1
fi

# Check if files exist
echo "📋 Checking files..."
FILES=(
    "src/providers/cryptopanic-rest.ts"
    "src/services/cryptopanic-news.service.ts"
    "src/services/cryptopanic-sentiment.service.ts"
    "src/types/cryptopanic.types.ts"
    "src/examples/cryptopanic-integration.example.ts"
    "src/tests/cryptopanic.test.ts"
    "test-cryptopanic.ts"
)

MISSING=0
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (MISSING)"
        MISSING=1
    fi
done

if [ $MISSING -eq 1 ]; then
    echo ""
    echo "❌ Some files are missing. Please create them first."
    exit 1
fi

echo ""
echo "📦 Adding files to git..."

# Go to repo root
cd ../..

# Add all CryptoPanic files
git add services/market-prices/src/providers/cryptopanic-rest.ts
git add services/market-prices/src/services/cryptopanic-news.service.ts
git add services/market-prices/src/services/cryptopanic-sentiment.service.ts
git add services/market-prices/src/types/cryptopanic.types.ts
git add services/market-prices/src/examples/cryptopanic-integration.example.ts
git add services/market-prices/src/tests/cryptopanic.test.ts
git add services/market-prices/test-cryptopanic.ts

# Add documentation files
git add services/market-prices/CRYPTOPANIC*.md 2>/dev/null || true
git add services/market-prices/WHY_CRYPTOPANIC*.md 2>/dev/null || true
git add services/market-prices/CODESPACE_SETUP.md 2>/dev/null || true
git add services/market-prices/GETTING_STARTED.md 2>/dev/null || true
git add services/market-prices/QUICK_FIX_CODESPACE.md 2>/dev/null || true

echo "✅ Files added"
echo ""

# Check status
echo "📊 Git status:"
git status --short | grep cryptopanic || echo "  (no changes to show)"

echo ""
read -p "Commit and push? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 1
fi

# Commit
echo "💾 Committing..."
git commit -m "feat: Add CryptoPanic API integration with sentiment analysis

- Add CryptoPanic REST API client with plan support
- Add news service with normalization and caching
- Add sentiment analyzer with panic detection
- Add comprehensive test suite
- Add examples and documentation"

echo "✅ Committed"

# Push
echo "🚀 Pushing to remote..."
git push origin main

echo ""
echo "✅ Done! Now in your codespace, run:"
echo "   cd /workspaces/coinet-platform"
echo "   git pull origin main"
echo ""
echo "🎉 Files will be available in codespace!"

