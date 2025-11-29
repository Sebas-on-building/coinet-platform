#!/bin/bash
# Monitor Railway Deployment Status
# Checks build status and health endpoint

set -e

RAILWAY_URL="${RAILWAY_URL:-https://market-prices-production.up.railway.app}"
HEALTH_ENDPOINT="${RAILWAY_URL}/api/health"
MAX_RETRIES=30
RETRY_DELAY=10

echo "🚂 Railway Deployment Monitor"
echo "================================"
echo ""
echo "Service URL: $RAILWAY_URL"
echo "Health Endpoint: $HEALTH_ENDPOINT"
echo ""

# Check if Railway CLI is available
if command -v railway &> /dev/null; then
    echo "📊 Checking Railway Status..."
    railway status 2>/dev/null || echo "⚠️  Railway CLI status check failed (may need authentication)"
    echo ""
fi

# Test health endpoint
echo "🏥 Testing Health Endpoint..."
echo ""

RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HTTP_CODE=$(curl -s -o /tmp/health_response.json -w "%{http_code}" --max-time 10 "$HEALTH_ENDPOINT" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ Health Check PASSED!"
        echo ""
        echo "Response:"
        cat /tmp/health_response.json | jq '.' 2>/dev/null || cat /tmp/health_response.json
        echo ""
        echo "🎉 Deployment is LIVE and HEALTHY!"
        exit 0
    elif [ "$HTTP_CODE" = "000" ]; then
        echo "⏳ Service not responding (deployment may still be in progress)..."
    else
        echo "⚠️  Health check returned HTTP $HTTP_CODE"
        if [ -f /tmp/health_response.json ]; then
            echo "Response:"
            cat /tmp/health_response.json
        fi
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    
    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
        echo "   Retrying in ${RETRY_DELAY}s... (${RETRY_COUNT}/${MAX_RETRIES})"
        sleep $RETRY_DELAY
    fi
done

echo ""
echo "❌ Health check failed after $MAX_RETRIES attempts"
echo "   Check Railway dashboard: https://railway.app"
echo "   Or run: railway logs"
exit 1

