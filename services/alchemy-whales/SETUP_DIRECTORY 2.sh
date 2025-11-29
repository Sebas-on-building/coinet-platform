#!/bin/bash
# Setup Directory Script - Ensures you're in the right place
# Run this from anywhere - it will navigate to the correct directory

echo "🔧 Setting up Alchemy Whales Service directory..."
echo ""

# Get the script's directory (where this file is located)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Navigate to service directory
cd "$SCRIPT_DIR"

echo "📍 Current directory: $(pwd)"
echo ""

# Verify we're in the right place
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found!"
    echo "Expected location: $SCRIPT_DIR"
    exit 1
fi

if [ ! -f "tsconfig.json" ]; then
    echo "❌ Error: tsconfig.json not found!"
    exit 1
fi

echo "✅ Found package.json"
echo "✅ Found tsconfig.json"
echo ""

# Show directory structure
echo "📁 Directory contents:"
ls -la | grep -E "(package|tsconfig|src|dist|\.env)" | head -10
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Created .env"
    else
        echo "⚠️  .env.example not found"
    fi
fi

# Add development settings
echo "📝 Configuring .env for development..."
if ! grep -q "REQUIRE_DATABASE=false" .env 2>/dev/null; then
    echo "" >> .env
    echo "# Development mode settings" >> .env
    echo "REQUIRE_DATABASE=false" >> .env
    echo "REQUIRE_CACHE=false" >> .env
    echo "REQUIRE_API_KEYS=false" >> .env
    echo "NODE_ENV=development" >> .env
    echo "✅ Added development settings to .env"
else
    echo "✅ Development settings already in .env"
fi

echo ""
echo "✅✅✅ Directory setup complete! ✅✅✅"
echo ""
echo "📍 You are now in: $(pwd)"
echo ""
echo "📝 Next steps:"
echo "   1. Build: npx tsc -p tsconfig.json"
echo "   2. Start: node dist/index.js"
echo ""
echo "   OR use the start script:"
echo "   ./START_SERVICE.sh"
echo ""

