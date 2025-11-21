#!/bin/bash
# Test Railway Dockerfile build locally

echo "🧪 Testing Railway Dockerfile build..."
echo ""

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not available. Skipping local build test."
    echo "   You can test on Railway instead."
    exit 0
fi

# Build the Docker image
echo "📦 Building Docker image..."
docker build -f railway.dockerfile -t coinet-platform:test .

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Docker build succeeded!"
    echo ""
    echo "To test the container locally:"
    echo "  docker run -p 3000:3000 coinet-platform:test"
    echo ""
    echo "Then check: http://localhost:3000/api/health"
else
    echo ""
    echo "❌ Docker build failed. Check the errors above."
    exit 1
fi
