#!/bin/bash
# Test all auth endpoints

API_URL="https://api.coinet.ai"
TIMESTAMP=$(date +%s)
TEST_EMAIL="testuser${TIMESTAMP}@example.com"
TEST_PASSWORD="test123456"
TEST_NAME="Test User"

echo "🧪 Testing Auth Endpoints"
echo "=========================="
echo "API URL: $API_URL"
echo "Test Email: $TEST_EMAIL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Register
echo "1️⃣ Testing POST /auth/register..."
REGISTER_RESPONSE=$(curl -s -X POST "${API_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\",\"name\":\"${TEST_NAME}\"}")
REGISTER_SUCCESS=$(echo $REGISTER_RESPONSE | grep -o '"success":true' || echo "")

if [ -n "$REGISTER_SUCCESS" ]; then
  echo -e "${GREEN}✅ Registration successful${NC}"
  TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  echo "Token: ${TOKEN:0:20}..."
else
  echo -e "${RED}❌ Registration failed${NC}"
  echo "Response: $REGISTER_RESPONSE"
  exit 1
fi

echo ""

# Test 2: Login
echo "2️⃣ Testing POST /auth/login..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")
LOGIN_SUCCESS=$(echo $LOGIN_RESPONSE | grep -o '"success":true' || echo "")

if [ -n "$LOGIN_SUCCESS" ]; then
  echo -e "${GREEN}✅ Login successful${NC}"
  TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  echo "Token: ${TOKEN:0:20}..."
else
  echo -e "${RED}❌ Login failed${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo ""

# Test 3: Get Current User
echo "3️⃣ Testing GET /users/me..."
if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ No token available${NC}"
  exit 1
fi

ME_RESPONSE=$(curl -s -X GET "${API_URL}/users/me" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")
ME_SUCCESS=$(echo $ME_RESPONSE | grep -o '"success":true' || echo "")

if [ -n "$ME_SUCCESS" ]; then
  echo -e "${GREEN}✅ Get user successful${NC}"
  USER_EMAIL=$(echo $ME_RESPONSE | grep -o '"email":"[^"]*' | cut -d'"' -f4)
  echo "User Email: $USER_EMAIL"
else
  echo -e "${RED}❌ Get user failed${NC}"
  echo "Response: $ME_RESPONSE"
  exit 1
fi

echo ""

# Test 4: Logout
echo "4️⃣ Testing POST /auth/logout..."
LOGOUT_RESPONSE=$(curl -s -X POST "${API_URL}/auth/logout" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")
LOGOUT_SUCCESS=$(echo $LOGOUT_RESPONSE | grep -o '"success":true' || echo "")

if [ -n "$LOGOUT_SUCCESS" ]; then
  echo -e "${GREEN}✅ Logout successful${NC}"
else
  echo -e "${RED}❌ Logout failed${NC}"
  echo "Response: $LOGOUT_RESPONSE"
  exit 1
fi

echo ""
echo -e "${GREEN}🎉 All tests passed!${NC}"
