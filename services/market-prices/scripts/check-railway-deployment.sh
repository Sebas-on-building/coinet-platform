#!/bin/bash

# Railway Deployment Checker
# This script helps you find and test your Railway deployment URL

echo "🚂 Railway Deployment Checker"
echo "================================"
echo ""

# Check if Railway CLI is installed
if command -v railway &> /dev/null; then
    echo "✅ Railway CLI found"
    echo ""
    echo "To get your service URL, run:"
    echo "  railway status"
    echo "  railway domain"
    echo ""
else
    echo "ℹ️  Railway CLI not installed"
    echo "   Install with: npm i -g @railway/cli"
    echo ""
fi

echo "📋 Manual Steps:"
echo "1. Go to https://railway.app/dashboard"
echo "2. Select your project"
echo "3. Click on 'market-prices' service"
echo "4. Go to 'Settings' → 'Networking'"
echo "5. Find 'Public Domain' section"
echo "6. Click 'Generate Domain' if needed"
echo "7. Copy the URL (e.g., market-prices-production-XXXX.up.railway.app)"
echo ""

# Prompt for URL
read -p "Enter your Railway URL (or press Enter to skip): " RAILWAY_URL

if [ -z "$RAILWAY_URL" ]; then
    echo "⏭️  Skipping URL test"
    exit 0
fi

# Remove https:// if present
RAILWAY_URL=${RAILWAY_URL#https://}
RAILWAY_URL=${RAILWAY_URL#http://}

echo ""
echo "🧪 Testing Railway deployment..."
echo "URL: https://${RAILWAY_URL}/api/health"
echo ""

# Test health endpoint
response=$(curl -s -w "\n%{http_code}" "https://${RAILWAY_URL}/api/health")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

echo "HTTP Status: $http_code"
echo ""

if [ "$http_code" = "200" ]; then
    echo "✅ Service is healthy!"
    echo "$body" | jq . 2>/dev/null || echo "$body"
elif [ "$http_code" = "404" ]; then
    echo "❌ 404 Not Found"
    echo "   Possible causes:"
    echo "   - Service not deployed yet"
    echo "   - Wrong URL"
    echo "   - Service name mismatch"
    echo ""
    echo "   Check Railway dashboard for:"
    echo "   - Recent deployments"
    echo "   - Build logs"
    echo "   - Service status"
elif [ "$http_code" = "503" ]; then
    echo "⚠️  503 Service Unavailable"
    echo "   Service might be starting up or health check failing"
    echo "   Check Railway logs for errors"
else
    echo "⚠️  Unexpected status: $http_code"
    echo "Response: $body"
fi

