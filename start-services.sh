#!/bin/bash

# Start Services Script for Codespace
# This script starts both API Gateway and User Service

echo "🚀 Starting Coinet Services..."
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if services are already running
if lsof -i :8000 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 8000 is already in use (API Gateway might be running)${NC}"
else
    echo -e "${GREEN}✅ Port 8000 is available${NC}"
fi

if lsof -i :8005 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 8005 is already in use (User Service might be running)${NC}"
else
    echo -e "${GREEN}✅ Port 8005 is available${NC}"
fi

echo ""
echo "Starting services in background..."
echo ""

# Start API Gateway
echo "📡 Starting API Gateway on port 8000..."
cd services/api-gateway
npm run dev > /tmp/api-gateway.log 2>&1 &
API_GATEWAY_PID=$!
echo "   PID: $API_GATEWAY_PID"
echo "   Logs: tail -f /tmp/api-gateway.log"

# Wait a bit
sleep 2

# Start User Service
echo "👤 Starting User Service on port 8005..."
cd ../user
npm run dev > /tmp/user-service.log 2>&1 &
USER_SERVICE_PID=$!
echo "   PID: $USER_SERVICE_PID"
echo "   Logs: tail -f /tmp/user-service.log"

# Wait for services to start
echo ""
echo "⏳ Waiting for services to start..."
sleep 5

# Check if services are running
echo ""
echo "🔍 Checking service status..."
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API Gateway is running${NC}"
else
    echo -e "${YELLOW}⚠️  API Gateway might still be starting...${NC}"
    echo "   Check logs: tail -f /tmp/api-gateway.log"
fi

if curl -s http://localhost:8005/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ User Service is running${NC}"
else
    echo -e "${YELLOW}⚠️  User Service might still be starting...${NC}"
    echo "   Check logs: tail -f /tmp/user-service.log"
fi

echo ""
echo "================================"
echo "✅ Services started!"
echo ""
echo "📝 Useful commands:"
echo "   - View API Gateway logs: tail -f /tmp/api-gateway.log"
echo "   - View User Service logs: tail -f /tmp/user-service.log"
echo "   - Stop API Gateway: kill $API_GATEWAY_PID"
echo "   - Stop User Service: kill $USER_SERVICE_PID"
echo ""
echo "🌐 Access Swagger UI:"
echo "   - API Gateway: http://localhost:8000/docs"
echo "   - User Service: http://localhost:8005/docs"
echo ""
echo "💡 Tip: In Codespace, use 'Ports' tab to open these URLs in browser"

