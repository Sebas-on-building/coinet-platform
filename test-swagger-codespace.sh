#!/bin/bash

echo "🧪 Testing Swagger Configuration in Codespace"
echo "=============================================="
echo ""

# Check if services are running
echo "1. Checking if services are running..."
if lsof -i :8000 > /dev/null 2>&1; then
    echo "   ✅ API Gateway is running on port 8000"
else
    echo "   ⚠️  API Gateway is NOT running on port 8000"
fi

if lsof -i :8005 > /dev/null 2>&1; then
    echo "   ✅ User Service is running on port 8005"
else
    echo "   ⚠️  User Service is NOT running on port 8005"
fi

echo ""
echo "2. Checking environment variables..."
echo "   SWAGGER_SERVER_URL: ${SWAGGER_SERVER_URL:-'not set (will use default)'}"
echo "   RAILWAY_PUBLIC_DOMAIN: ${RAILWAY_PUBLIC_DOMAIN:-'not set (will use default)'}"
echo "   API_URL: ${API_URL:-'not set (will use default)'}"
echo "   NODE_ENV: ${NODE_ENV:-'not set (will use default)'}"

echo ""
echo "3. Testing OpenAPI endpoints..."
if curl -s http://localhost:8000/openapi.json > /dev/null 2>&1; then
    echo "   ✅ API Gateway OpenAPI endpoint accessible"
    echo "   Server URLs in OpenAPI spec:"
    curl -s http://localhost:8000/openapi.json | grep -A 5 '"servers"' || echo "   (servers not found)"
else
    echo "   ⚠️  API Gateway OpenAPI endpoint NOT accessible"
fi

if curl -s http://localhost:8005/openapi.json > /dev/null 2>&1; then
    echo "   ✅ User Service OpenAPI endpoint accessible"
    echo "   Server URLs in OpenAPI spec:"
    curl -s http://localhost:8005/openapi.json | grep -A 5 '"servers"' || echo "   (servers not found)"
else
    echo "   ⚠️  User Service OpenAPI endpoint NOT accessible"
fi

echo ""
echo "✅ Test complete!"
echo ""
echo "📝 Next steps:"
echo "   - Visit http://localhost:8000/docs for API Gateway Swagger"
echo "   - Visit http://localhost:8005/docs for User Service Swagger"
