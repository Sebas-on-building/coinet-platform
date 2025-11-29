#!/bin/bash
# Start Alchemy Whales Service Script
# Run this from anywhere - it will navigate to the right directory

cd /workspaces/coinet-platform/services/alchemy-whales || cd "$(dirname "$0")"

echo "🚀 Starting Alchemy Whales Service..."
echo "📍 Directory: $(pwd)"
echo ""

# Check if we're in the right place
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in alchemy-whales directory!"
    echo "Please run: cd /workspaces/coinet-platform/services/alchemy-whales"
    exit 1
fi

# Pull latest
echo "📥 Pulling latest changes..."
git pull origin feature/ai-data-feeder

# Ensure .env has dev settings
if ! grep -q "REQUIRE_DATABASE=false" .env 2>/dev/null; then
    echo "📝 Adding development settings to .env..."
    echo "REQUIRE_DATABASE=false" >> .env
    echo "REQUIRE_CACHE=false" >> .env
    echo "REQUIRE_API_KEYS=false" >> .env
    echo "NODE_ENV=development" >> .env
fi

# Build
echo "🔨 Building TypeScript..."
npx tsc -p tsconfig.json

# Check if build succeeded
if [ ! -f "dist/index.js" ]; then
    echo "❌ Build failed! dist/index.js not found"
    exit 1
fi

echo "✅ Build successful!"
echo ""
echo "🚀 Starting service..."
echo ""

# Start service
node dist/index.js

