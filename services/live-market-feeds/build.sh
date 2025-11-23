#!/bin/bash

# =========================================
# LIVE MARKET DATA FEEDS BUILD SCRIPT
# =========================================

echo "🚀 Building Live Market Data Feeds Service..."
echo "==============================================="

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo ""
    echo "🎉 Live Market Data Feeds Service is ready!"
    echo ""
    echo "To start the service:"
    echo "  npm start"
    echo ""
    echo "To run the demo:"
    echo "  npm run dev examples/market-feeds-demo.ts"
    echo ""
else
    echo "❌ Build failed!"
    exit 1
fi
