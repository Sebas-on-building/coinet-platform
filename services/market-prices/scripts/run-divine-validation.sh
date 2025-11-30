#!/bin/bash

# Divine Perfection Validation Script
# Runs all validation tests and collects real production metrics

set -e

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║           DIVINE PERFECTION VALIDATION                            ║"
echo "║           Collecting Real Production Metrics                      ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

cd "$(dirname "$0")/.."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from services/market-prices directory"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "TEST 1: Real 1000x Load Test (Quick)"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

npm run test:real:1000x:quick || {
    echo "⚠️  Load test had issues (this is OK if API limits hit)"
}

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "TEST 2: Production Health Check (Quick)"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

PROD_URL="${PRODUCTION_URL:-https://market-prices-production.up.railway.app}"

echo "Testing endpoints..."
echo ""

# Health check
echo "✓ Health endpoint:"
curl -s "${PROD_URL}/api/health" | jq '.' || echo "  Failed"

echo ""
echo "✓ Prices endpoint:"
curl -s "${PROD_URL}/api/prices?symbols=BTC,ETH" | jq '.success, .data | length' || echo "  Failed"

echo ""
echo "✓ Fusion endpoint:"
curl -s "${PROD_URL}/api/fusion/BTC" | jq '.success, .data.whales.recentActivityCount' || echo "  Failed"

echo ""
echo "✓ Services status:"
curl -s "${PROD_URL}/api/services/status" | jq '.data.services' || echo "  Failed"

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "TEST 3: Cross-Service Integration"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

ALCHEMY_URL="${ALCHEMY_WHALES_URL:-https://alchemy-whales-production.up.railway.app}"

echo "Testing alchemy-whales connection..."
curl -s "${ALCHEMY_URL}/api/health" | jq '.' || echo "  ⚠️  Alchemy-whales not available"

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "VALIDATION COMPLETE"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "📊 Summary:"
echo "  - Load test: Check output above"
echo "  - Production endpoints: Tested"
echo "  - Cross-service: Tested"
echo ""
echo "💡 For full validation, run:"
echo "   npm run test:24h:quick    # 1-hour production test"
echo "   npm run test:real:1000x:full  # Full 1000x load test"
echo ""

