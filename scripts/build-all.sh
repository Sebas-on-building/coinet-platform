#!/bin/bash
set -e

echo "🚀 Building Coinet services (v1.0.0)"

# Ensure we're using Minikube's Docker
eval $(minikube docker-env)

# Check prerequisites
if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Docker not found"
  exit 1
fi

if ! minikube status >/dev/null 2>&1; then
  echo "❌ Minikube not running"
  exit 1
fi

# Build each service
echo "Building coinet-ai-service..."
cd services/coinet-ai
test -f Dockerfile.production || { echo "❌ Missing Dockerfile.production"; exit 1; }
docker build -f Dockerfile.production -t coinet/coinet-ai-service:v1.0.0 .
cd ../..

echo "Building context-service..."
cd services/context
test -f Dockerfile.production || { echo "❌ Missing Dockerfile.production"; exit 1; }
docker build -f Dockerfile.production -t coinet/context-service:v1.0.0 .
cd ../..

echo "Building data-aggregator..."
cd services/data-aggregator
test -f Dockerfile.production || { echo "❌ Missing Dockerfile.production"; exit 1; }
docker build -f Dockerfile.production -t coinet/data-aggregator:v1.0.0 .
cd ../..

echo "Building ingest-service..."
cd services/ingest
test -f Dockerfile.production || { echo "❌ Missing Dockerfile.production"; exit 1; }
docker build -f Dockerfile.production -t coinet/ingest-service:v1.0.0 .
cd ../..

echo "Building web-client..."
cd apps/web-client
test -f Dockerfile.production || { echo "❌ Missing Dockerfile.production"; exit 1; }
docker build -f Dockerfile.production -t coinet/web-client:v1.0.0 .
cd ../..

echo "Building api-gateway..."
cd services/api-gateway
test -f Dockerfile.production || { echo "❌ Missing Dockerfile.production"; exit 1; }
docker build -f Dockerfile.production -t coinet/api-gateway:v1.0.0 .
cd ../..

echo "✅ Build complete! Images:"
docker images | grep coinet