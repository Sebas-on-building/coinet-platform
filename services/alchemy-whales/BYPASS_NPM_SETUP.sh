#!/bin/bash
# Bypass npm entirely - Direct setup script
# This works around monorepo/workspace issues

set -e

echo "🚀 Direct Setup - Bypassing npm workspace issues"
echo "================================================="
echo ""

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "📍 Working directory: $SCRIPT_DIR"
echo ""

# Verify tsconfig.json exists
if [ ! -f "tsconfig.json" ]; then
    echo "❌ tsconfig.json not found!"
    exit 1
fi

# 1. Create .env if missing
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Created .env from .env.example"
    else
        echo "⚠️  .env.example not found, creating basic .env"
        cat > .env << 'ENVEOF'
ALCHEMY_API_KEY_ETH=your_key_here
ALCHEMY_API_KEY_POLYGON=your_key_here
ALCHEMY_API_KEY_ARBITRUM=your_key_here
ALCHEMY_API_KEY_OPTIMISM=your_key_here
ALCHEMY_API_KEY_BASE=your_key_here
DATABASE_PASSWORD=your_password
WEBHOOK_SECRET=your_secret
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
    fi
fi

# 2. Install TypeScript globally if not available
if ! command -v tsc &> /dev/null; then
    echo "📦 Installing TypeScript globally..."
    npm install -g typescript@5.3.3 || npm install -g typescript
fi

# 3. Check if node_modules exists, if not try to install minimal deps
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies (this may take a while)..."
    
    # Try multiple methods
    npm install --no-workspaces --legacy-peer-deps 2>&1 | grep -v "npm WARN" || \
    npm install --legacy-peer-deps 2>&1 | grep -v "npm WARN" || \
    npm install 2>&1 | tail -20 || true
    
    # If still no node_modules, install critical packages manually
    if [ ! -d "node_modules" ]; then
        echo "⚠️  npm install failed, installing critical packages manually..."
        mkdir -p node_modules
        npm install --save alchemy-sdk express dotenv pino pg ioredis prom-client uuid zod bottleneck axios axios-retry --no-workspaces --legacy-peer-deps 2>&1 | tail -10 || true
    fi
fi

# 4. Build with explicit TypeScript config
echo ""
echo "🔨 Building TypeScript..."
echo "Using tsconfig.json: $SCRIPT_DIR/tsconfig.json"

# Clean dist first
rm -rf dist

# Compile with explicit config path
npx tsc -p "$SCRIPT_DIR/tsconfig.json" || \
tsc -p "$SCRIPT_DIR/tsconfig.json" || \
(cd "$SCRIPT_DIR" && npx tsc) || \
(cd "$SCRIPT_DIR" && tsc)

# Verify build
if [ ! -f "dist/index.js" ]; then
    echo "❌ Build failed - dist/index.js not found"
    echo "Checking for compilation errors..."
    
    # Try to see what files were created
    if [ -d "dist" ]; then
        echo "Files in dist/:"
        ls -la dist/ | head -10
    else
        echo "dist/ directory doesn't exist"
    fi
    
    # Try compiling just index.ts to see error
    echo ""
    echo "Attempting to compile src/index.ts directly..."
    npx tsc src/index.ts --outDir dist --module commonjs --target ES2022 --esModuleInterop --skipLibCheck || true
    
    exit 1
fi

echo "✅ Build successful!"
echo "✅ dist/index.js exists"

# 5. Verify critical dependencies are available
echo ""
echo "🔍 Verifying runtime dependencies..."

# Check if we can require the main file
node -e "try { require('./dist/index.js'); console.log('✅ Module loads successfully'); } catch(e) { console.log('⚠️  Module load error:', e.message); }" || true

echo ""
echo "✅✅✅ Setup Complete! ✅✅✅"
echo ""
echo "📝 Next steps:"
echo "   1. Edit .env file with your API keys:"
echo "      code .env"
echo ""
echo "   2. Start the service:"
echo "      node dist/index.js"
echo ""
echo "   3. Or use npm start (if it works):"
echo "      npm start"
echo ""

