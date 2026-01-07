#!/bin/bash

# 🧪 Test Authentication Enforcement
# 
# This script tests that authentication is properly enforced on chat endpoints.
# Run this after deployment to verify auth middleware is working.

API_URL="${API_URL:-https://api.coinet.ai}"

echo "🧪 Testing Authentication Enforcement"
echo "======================================"
echo "API URL: $API_URL"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Chat endpoint without token should return 401
echo "Test 1: POST /api/chat/message without token"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/chat/message" \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Returned 401 (Unauthorized)"
  echo "Response: $BODY"
else
  echo -e "${RED}❌ FAIL${NC} - Expected 401, got $HTTP_CODE"
  echo "Response: $BODY"
fi
echo ""

# Test 2: Chat endpoint with invalid token should return 401
echo "Test 2: POST /api/chat/message with invalid token"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/chat/message" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid-token-123" \
  -d '{"message": "test"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Returned 401 (Invalid token)"
  echo "Response: $BODY"
else
  echo -e "${RED}❌ FAIL${NC} - Expected 401, got $HTTP_CODE"
  echo "Response: $BODY"
fi
echo ""

# Test 3: Chat stream endpoint without token should return 401
echo "Test 3: POST /api/chat/stream without token"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/chat/stream" \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Returned 401 (Unauthorized)"
  echo "Response: $BODY"
else
  echo -e "${RED}❌ FAIL${NC} - Expected 401, got $HTTP_CODE"
  echo "Response: $BODY"
fi
echo ""

# Test 4: Health endpoint should still work without auth (public)
echo "Test 4: GET /api/health (public endpoint)"
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/health")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Health endpoint accessible (200 OK)"
else
  echo -e "${RED}❌ FAIL${NC} - Expected 200, got $HTTP_CODE"
fi
echo ""

# Test 5: Login endpoint should work (public)
echo "Test 5: POST /auth/login (public endpoint)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "wrongpassword"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Login endpoint accessible (returned $HTTP_CODE)"
else
  echo -e "${YELLOW}⚠️  WARN${NC} - Unexpected status code: $HTTP_CODE"
fi
echo ""

echo "======================================"
echo "✅ Authentication enforcement tests complete!"
echo ""
echo "Next steps:"
echo "1. Test with a valid token from /auth/login"
echo "2. Verify rate limiting is working"
echo "3. Check logs for auth success/failure events"
