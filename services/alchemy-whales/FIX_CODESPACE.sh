#!/bin/bash
# Fix Codespace Setup Script
# Run this in your Codespace to fix all issues

set -e

echo "🔧 Fixing Alchemy Whales Service setup in Codespace..."
echo ""

cd /workspaces/coinet-platform/services/alchemy-whales

# 1. Ensure we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Are you in the right directory?"
    exit 1
fi

echo "✅ Found package.json"

# 2. Create .env.example if it doesn't exist
if [ ! -f ".env.example" ]; then
    echo "📝 Creating .env.example..."
    cat > .env.example << 'ENVEOF'
# Alchemy API Keys (Get from https://www.alchemy.com/)
ALCHEMY_API_KEY_ETH=your_ethereum_api_key_here
ALCHEMY_API_KEY_POLYGON=your_polygon_api_key_here
ALCHEMY_API_KEY_ARBITRUM=your_arbitrum_api_key_here
ALCHEMY_API_KEY_OPTIMISM=your_optimism_api_key_here
ALCHEMY_API_KEY_BASE=your_base_api_key_here

# Rate Limiting Configuration
RATE_LIMIT_MAX_REQUESTS_PER_SECOND=25
RATE_LIMIT_MAX_CONCURRENT=10
RATE_LIMIT_RESERVOIR=100
RATE_LIMIT_RESERVOIR_REFRESH_AMOUNT=25
RATE_LIMIT_RESERVOIR_REFRESH_INTERVAL=1000

# Whale Threshold Configuration (in USD)
WHALE_THRESHOLD_USD=100000
LARGE_WHALE_THRESHOLD_USD=1000000
MEGA_WHALE_THRESHOLD_USD=10000000

# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=coinet_whales
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password_here
DATABASE_SSL=false
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=coinet:whales:

# Webhook Server Configuration
WEBHOOK_PORT=3001
WEBHOOK_PATH=/webhooks/alchemy
WEBHOOK_SECRET=your_webhook_secret_here

# Monitoring & Metrics
METRICS_PORT=9090
METRICS_PATH=/metrics
HEALTH_CHECK_PORT=8080
HEALTH_CHECK_PATH=/health

# Notification Configuration
ENABLE_NOTIFICATIONS=true
NOTIFICATION_SERVICE_URL=http://localhost:3002/notifications

# Entity Labeling (Future integration)
ARKHAM_API_KEY=
NANSEN_API_KEY=
ENABLE_ENTITY_LABELING=false

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
ENABLE_PRETTY_LOGS=false

# Performance Optimization
BATCH_SIZE=100
BATCH_INTERVAL_MS=5000
MAX_BLOCK_RANGE=1000
ENABLE_ASYNC_BATCHING=true

# Chain Configuration
ENABLE_ETHEREUM=true
ENABLE_POLYGON=true
ENABLE_ARBITRUM=true
ENABLE_OPTIMISM=true
ENABLE_BASE=true

# Historical Sync
SYNC_FROM_BLOCK_ETH=latest
SYNC_FROM_BLOCK_POLYGON=latest
SYNC_FROM_BLOCK_ARBITRUM=latest
SYNC_FROM_BLOCK_OPTIMISM=latest
SYNC_FROM_BLOCK_BASE=latest
ENVEOF
    echo "✅ Created .env.example"
else
    echo "✅ .env.example already exists"
fi

# 3. Install dependencies (standalone, not as workspace)
echo "📦 Installing dependencies..."
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps || npm install

# 4. Build the service
echo "🔨 Building service..."
npm run build

# 5. Create .env from example if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "✅ Created .env - Please edit it with your API keys!"
else
    echo "✅ .env already exists"
fi

echo ""
echo "✅ Setup complete!"
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

