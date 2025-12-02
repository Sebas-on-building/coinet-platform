#!/bin/bash

# Production Verification Script
# Tests Railway backend and Vercel frontend deployments

echo "🌐 Coinet Production Verification"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get URLs from environment or use defaults
RAILWAY_URL="${RAILWAY_BACKEND_URL:-https://coinet-platform-production.up.railway.app}"
FRONTEND_URL="${VERCEL_FRONTEND_URL:-https://app.coinet.ai}"

echo "📊 Testing Backend (Railway)..."
echo "URL: $RAILWAY_URL"
echo ""

# Test backend health
echo "1️⃣  Testing /api/health..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$RAILWAY_URL/api/health" 2>&1)
HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

if [ "$HEALTH_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Backend Health: OK${NC}"
    echo "$HEALTH_BODY" | head -5
else
    echo -e "${RED}❌ Backend Health: Failed (HTTP $HEALTH_CODE)${NC}"
    echo "$HEALTH_BODY"
fi
echo ""

# Test backend status
echo "2️⃣  Testing /api/status..."
STATUS_RESPONSE=$(curl -s -w "\n%{http_code}" "$RAILWAY_URL/api/status" 2>&1)
STATUS_CODE=$(echo "$STATUS_RESPONSE" | tail -n1)
STATUS_BODY=$(echo "$STATUS_RESPONSE" | sed '$d')

if [ "$STATUS_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Backend Status: OK${NC}"
    echo "$STATUS_BODY" | head -10
else
    echo -e "${RED}❌ Backend Status: Failed (HTTP $STATUS_CODE)${NC}"
fi
echo ""

# Test diagnostic endpoint
echo "3️⃣  Testing /api/diagnostic?symbol=BTC..."
DIAG_RESPONSE=$(curl -s -w "\n%{http_code}" "$RAILWAY_URL/api/diagnostic?symbol=BTC" 2>&1)
DIAG_CODE=$(echo "$DIAG_RESPONSE" | tail -n1)
DIAG_BODY=$(echo "$DIAG_RESPONSE" | sed '$d')

if [ "$DIAG_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Diagnostic Endpoint: OK${NC}"
    echo "$DIAG_BODY" | head -15
else
    echo -e "${RED}❌ Diagnostic Endpoint: Failed (HTTP $DIAG_CODE)${NC}"
fi
echo ""

echo "📱 Testing Frontend (Vercel)..."
echo "URL: $FRONTEND_URL"
echo ""

# Test frontend
echo "4️⃣  Testing frontend accessibility..."
FRONTEND_RESPONSE=$(curl -s -w "\n%{http_code}" "$FRONTEND_URL" 2>&1)
FRONTEND_CODE=$(echo "$FRONTEND_RESPONSE" | tail -n1)

if [ "$FRONTEND_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Frontend: Accessible${NC}"
    echo "   Open in browser: $FRONTEND_URL"
else
    echo -e "${RED}❌ Frontend: Failed (HTTP $FRONTEND_CODE)${NC}"
    echo "   Check Vercel dashboard for deployment status"
fi
echo ""

echo "=================================="
echo "📋 Summary:"
echo ""

if [ "$HEALTH_CODE" = "200" ] && [ "$STATUS_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Backend: Production Ready${NC}"
else
    echo -e "${RED}❌ Backend: Issues Detected${NC}"
    echo "   Check Railway dashboard: https://railway.app/dashboard"
fi

if [ "$FRONTEND_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Frontend: Production Ready${NC}"
else
    echo -e "${RED}❌ Frontend: Issues Detected${NC}"
    echo "   Check Vercel dashboard: https://vercel.com/dashboard"
fi

echo ""
echo "💡 To update URLs, set environment variables:"
echo "   export RAILWAY_BACKEND_URL='https://your-railway-url.railway.app'"
echo "   export VERCEL_FRONTEND_URL='https://app.coinet.ai'"
echo ""

