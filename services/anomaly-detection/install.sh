#!/bin/bash

# Proactive Anomaly Detection System - Installation Script
# Installs and sets up the system for development or production

set -e

echo "🚀 Proactive Anomaly Detection System - Installation"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Node.js version
echo "📋 Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js 20+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}❌ Node.js version must be 20 or higher${NC}"
    echo "Current version: $(node -v)"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ npm $(npm -v)${NC}"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Build TypeScript
echo ""
echo "🔨 Building TypeScript..."
npm run build

# Run tests
echo ""
echo "🧪 Running tests..."
npm test || {
    echo -e "${YELLOW}⚠️  Some tests failed, but continuing...${NC}"
}

# Create data directory
echo ""
echo "📁 Creating data directory..."
mkdir -p data

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Server Configuration
PORT=3030
NODE_ENV=development

# Monitoring Configuration
ENABLE_REAL_TIME=true
BATCH_SIZE=100
UPDATE_INTERVAL=5000

# Detection Thresholds
STATISTICAL_THRESHOLD=3
ML_THRESHOLD=0.7
PERCENTILE_THRESHOLD=95

# Notifications (configure as needed)
# SLACK_WEBHOOK_URL=
# TELEGRAM_BOT_TOKEN=
# TELEGRAM_CHAT_IDS=
# EMAIL_RECIPIENTS=

# Database (optional)
# DATABASE_URL=postgresql://user:pass@localhost:5432/anomaly_detection

# Redis (optional)
# REDIS_URL=redis://localhost:6379
EOF
    echo -e "${GREEN}✓ Created .env file${NC}"
    echo -e "${YELLOW}⚠️  Please configure .env with your settings${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Success message
echo ""
echo "=================================================="
echo -e "${GREEN}✅ Installation complete!${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Configure your .env file:"
echo "   nano .env"
echo ""
echo "2. Start the development server:"
echo "   npm run dev"
echo ""
echo "3. Or start in production:"
echo "   npm start"
echo ""
echo "4. Run the basic example:"
echo "   npx tsx examples/basic-usage.ts"
echo ""
echo "5. Access the API:"
echo "   http://localhost:3030"
echo ""
echo "For more information, see README.md"
echo ""
echo "🌟 Built with world-class AI and Elon Musk-level perfection!"

