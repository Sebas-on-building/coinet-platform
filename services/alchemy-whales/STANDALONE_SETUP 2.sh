#!/bin/bash
# Standalone Setup Script - Works independently of monorepo
# Run this in your Codespace

set -e

echo "🚀 Standalone Alchemy Whales Service Setup"
echo "=========================================="
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "📍 Working directory: $SCRIPT_DIR"
echo ""

# Verify we're in the right place
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found!"
    echo "Please run this script from: services/alchemy-whales/"
    exit 1
fi

# 1. Create .env.example if missing
if [ ! -f ".env.example" ]; then
    echo "📝 Creating .env.example..."
    cat > .env.example << 'ENVEOF'
ALCHEMY_API_KEY_ETH=your_ethereum_api_key_here
ALCHEMY_API_KEY_POLYGON=your_polygon_api_key_here
ALCHEMY_API_KEY_ARBITRUM=your_arbitrum_api_key_here
ALCHEMY_API_KEY_OPTIMISM=your_optimism_api_key_here
ALCHEMY_API_KEY_BASE=your_base_api_key_here
DATABASE_PASSWORD=your_password_here
WEBHOOK_SECRET=your_webhook_secret_here
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=coinet_whales
DATABASE_USER=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
WEBHOOK_PORT=3001
METRICS_PORT=9090
HEALTH_CHECK_PORT=8080
LOG_LEVEL=info
NODE_ENV=development
ENVEOF
    echo "✅ Created .env.example"
else
    echo "✅ .env.example exists"
fi

# 2. Clean install
echo ""
echo "🧹 Cleaning previous installs..."
rm -rf node_modules package-lock.json dist

# 3. Install dependencies (force local, ignore workspace)
echo ""
echo "📦 Installing dependencies (this may take a minute)..."
export npm_config_prefix="$SCRIPT_DIR"
npm install --legacy-peer-deps --no-workspaces --no-package-lock 2>&1 | grep -v "npm WARN" || true

# If that fails, try alternative method
if [ ! -d "node_modules" ]; then
    echo "⚠️  First method failed, trying alternative..."
    cd "$SCRIPT_DIR"
    npm install --legacy-peer-deps --ignore-scripts 2>&1 | grep -v "npm WARN" || true
fi

# Verify installation
if [ ! -d "node_modules" ]; then
    echo "❌ Installation failed. Trying one more time with basic npm install..."
    cd "$SCRIPT_DIR"
    npm install 2>&1 | tail -20
fi

if [ ! -d "node_modules" ]; then
    echo "❌ Failed to install dependencies. Please check npm version:"
    npm --version
    exit 1
fi

echo "✅ Dependencies installed"

# 4. Build
echo ""
echo "🔨 Building TypeScript..."
cd "$SCRIPT_DIR"
npx tsc --version || npm install -g typescript
npm run build

if [ ! -d "dist" ] || [ ! -f "dist/index.js" ]; then
    echo "❌ Build failed! dist/index.js not found"
    echo "Trying direct TypeScript compilation..."
    npx tsc
fi

if [ ! -f "dist/index.js" ]; then
    echo "❌ Build still failed. Check TypeScript errors above."
    exit 1
fi

echo "✅ Build successful"

# 5. Create .env
if [ ! -f ".env" ]; then
    echo ""
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "✅ Created .env - Please edit it with your API keys!"
else
    echo "✅ .env already exists"
fi

echo ""
echo "✅✅✅ Setup Complete! ✅✅✅"
echo ""
echo "📝 Next steps:"
echo "   1. Edit .env file with your Alchemy API keys:"
echo "      code .env"
echo ""
echo "   2. Start the service:"
echo "      npm start"
echo ""
echo "   3. Verify it's running (in another terminal):"
echo "      curl http://localhost:8080/health"
echo "      curl http://localhost:9090/metrics"
echo ""

