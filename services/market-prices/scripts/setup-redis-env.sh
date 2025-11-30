#!/bin/bash

# Setup Redis Environment Variables for Codespace

echo "🔧 Setting up Redis environment variables..."
echo ""

# Check if Redis is running
if ! docker ps | grep -q redis; then
    echo "❌ Redis is not running!"
    echo "   Start it with: docker start coinet-redis-1"
    exit 1
fi

echo "✅ Redis is running"
echo ""

# Set environment variables
export REDIS_HOST=localhost
export REDIS_PORT=6379
export REDIS_PASSWORD=

echo "Environment variables set:"
echo "  REDIS_HOST=$REDIS_HOST"
echo "  REDIS_PORT=$REDIS_PORT"
echo "  REDIS_PASSWORD=$REDIS_PASSWORD"
echo ""

# Test connection
echo "Testing Redis connection..."
docker exec coinet-redis-1 redis-cli ping > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Redis connection successful!"
else
    echo "❌ Redis connection failed"
    exit 1
fi

echo ""
echo "📝 To make these permanent, add to your .env file:"
echo "   REDIS_HOST=localhost"
echo "   REDIS_PORT=6379"
echo "   REDIS_PASSWORD="
echo ""
echo "🚀 Now restart your service to use Redis cache!"

