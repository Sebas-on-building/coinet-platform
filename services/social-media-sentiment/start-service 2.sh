#!/bin/bash

# =========================================
# SOCIAL MEDIA SENTIMENT SERVICE STARTER
# =========================================

set -e

echo "🚀 Starting Social Media Sentiment Analysis Service..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file from template"
    echo "📝 Please edit .env file with your API keys before running again"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm ci
fi

# Build the service
echo "🔨 Building service..."
npm run build

# Start the service
echo "🎯 Starting service..."
echo "📊 Monitor will be available at http://localhost:3000/health"
echo "🛑 Press Ctrl+C to stop"
echo ""

exec npm start
