#!/bin/bash

# COINET AI PLATFORM - STARTUP SCRIPT
echo "🚀 Starting Coinet AI Platform..."

# Start databases
echo "📦 Starting databases..."
docker-compose -f docker-compose.dev.yml up -d postgres mongodb redis clickhouse weaviate

# Wait for databases
echo "⏳ Waiting for databases..."
sleep 10

# Start message queues
echo "📡 Starting message queues..."
docker-compose -f docker-compose.dev.yml up -d kafka zookeeper

# Start monitoring
echo "📊 Starting monitoring..."
docker-compose -f docker-compose.dev.yml up -d prometheus grafana

# Start application services
echo "🎯 Starting application services..."
npm run dev &
cd services/context && npm run dev &
cd ../ingest && npm run dev &
cd ../inference && npm run dev &
cd ../ai && python3 -m uvicorn main:app --host 0.0.0.0 --port 8008 --reload &
cd ../..

echo "✅ Coinet AI Platform is starting..."
echo "🌐 Web Client: http://localhost:3000"
echo "📊 Grafana: http://localhost:3001"
echo "🔧 API Services: 8005-8008"

wait 