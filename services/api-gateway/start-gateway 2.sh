#!/bin/bash

# Revolutionary API Gateway - Quick Start Script
# This script starts the API Gateway with all necessary services

echo "🚀 Starting Revolutionary API Gateway v2.0..."
echo "================================================"

# Check if Redis is running
if ! command -v redis-cli &> /dev/null; then
    echo "⚠️  Warning: Redis not found. Please install Redis first:"
    echo "   - macOS: brew install redis"
    echo "   - Ubuntu: sudo apt-get install redis-server"
    echo "   - Docker: docker run -d -p 6379:6379 redis:alpine"
    echo ""
fi

# Check if Redis is accessible
if ! redis-cli ping &> /dev/null; then
    echo "❌ Redis is not running. Starting Redis..."
    if command -v brew &> /dev/null; then
        brew services start redis
    elif command -v systemctl &> /dev/null; then
        sudo systemctl start redis
    else
        echo "Please start Redis manually:"
        echo "   redis-server"
    fi
    sleep 2
fi

# Check if build exists
if [ ! -d "dist" ]; then
    echo "📦 Building the gateway..."
    npm run build
fi

# Create logs directory
mkdir -p logs

# Set default environment variables
export GATEWAY_PORT=${GATEWAY_PORT:-8000}
export REDIS_URL=${REDIS_URL:-redis://localhost:6379}
export LOG_LEVEL=${LOG_LEVEL:-info}
export NODE_ENV=${NODE_ENV:-development}

echo "🔧 Configuration:"
echo "   Port: $GATEWAY_PORT"
echo "   Redis: $REDIS_URL"
echo "   Log Level: $LOG_LEVEL"
echo "   Environment: $NODE_ENV"
echo ""

echo "🎯 Starting gateway..."
echo "   Dashboard: http://localhost:$GATEWAY_PORT/status"
echo "   Health Check: http://localhost:$GATEWAY_PORT/health"
echo "   Admin Panel: http://localhost:$GATEWAY_PORT/admin"
echo ""

# Start the gateway
if [ "$NODE_ENV" = "development" ]; then
    npm run dev
else
    npm start
fi 