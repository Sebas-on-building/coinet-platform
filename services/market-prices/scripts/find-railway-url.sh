#!/bin/bash

# Find Railway URL and Test Health Endpoint
# This script helps you find your Railway service URL and test it

echo "🔍 Finding Railway Service URL..."
echo ""

# Check if Railway CLI is installed
if command -v railway &> /dev/null; then
    echo "✅ Railway CLI found"
    echo ""
    echo "Getting service URL..."
    RAILWAY_URL=$(railway status 2>/dev/null | grep -i "url\|domain" | head -1 | awk '{print $NF}')
    
    if [ -n "$RAILWAY_URL" ]; then
        echo "📍 Found Railway URL: $RAILWAY_URL"
        echo ""
        echo "Testing health endpoint..."
        echo ""
        
        # Test /api/health
        echo "Testing /api/health:"
        curl -s "https://$RAILWAY_URL/api/health" | jq . 2>/dev/null || curl -s "https://$RAILWAY_URL/api/health"
        echo ""
        echo ""
        
        # Test /health
        echo "Testing /health:"
        curl -s "https://$RAILWAY_URL/health" | jq . 2>/dev/null || curl -s "https://$RAILWAY_URL/health"
    else
        echo "⚠️  Could not find Railway URL via CLI"
        echo ""
        echo "Please check Railway Dashboard:"
        echo "1. Go to https://railway.app/dashboard"
        echo "2. Select your project"
        echo "3. Click on 'market-prices' service"
        echo "4. Look for 'Public Domain' section"
        echo "5. Copy the URL (e.g., market-prices-production-XXXX.up.railway.app)"
        echo ""
        echo "Then test with:"
        echo "  curl https://YOUR-SERVICE-NAME.up.railway.app/api/health"
    fi
else
    echo "⚠️  Railway CLI not installed"
    echo ""
    echo "To install Railway CLI:"
    echo "  npm i -g @railway/cli"
    echo ""
    echo "Or find your URL manually:"
    echo "1. Go to https://railway.app/dashboard"
    echo "2. Select your project"
    echo "3. Click on 'market-prices' service"
    echo "4. Look for 'Public Domain' section"
    echo "5. Copy the URL"
    echo ""
    echo "Then test with:"
    echo "  curl https://YOUR-SERVICE-NAME.up.railway.app/api/health"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "📋 Manual Steps:"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "1. Go to Railway Dashboard: https://railway.app/dashboard"
echo "2. Select your project"
echo "3. Find 'market-prices' service"
echo "4. Click on the service"
echo "5. Look for 'Public Domain' or 'Settings' → 'Generate Domain'"
echo "6. Copy the URL (format: service-name-XXXX.up.railway.app)"
echo ""
echo "Then test:"
echo "  curl https://YOUR-ACTUAL-URL.up.railway.app/api/health"
echo ""
echo "Expected response:"
echo '  {"status":"healthy","service":"market-prices","timestamp":"...","uptime":...}'
echo ""

