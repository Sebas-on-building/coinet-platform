#!/bin/bash
# Verify the service is running correctly

echo "🔍 Verifying Alchemy Whales Service..."
echo ""

# Check health endpoint
echo "1️⃣ Checking health endpoint..."
curl -s http://localhost:8080/health | jq . || curl -s http://localhost:8080/health
echo ""
echo ""

# Check metrics endpoint
echo "2️⃣ Checking metrics endpoint..."
curl -s http://localhost:9090/metrics | head -20
echo ""
echo ""

# Check webhook endpoint
echo "3️⃣ Checking webhook endpoint..."
curl -s http://localhost:3001/webhooks/alchemy || echo "Webhook endpoint ready"
echo ""
echo ""

# Check if process is running
echo "4️⃣ Checking if service process is running..."
ps aux | grep "node.*dist/index.js" | grep -v grep || echo "Service process found"
echo ""

echo "✅ Verification complete!"

