#!/bin/bash

# Market Prices Service - Quick Setup Script
# This script helps you get started quickly with the service

set -e

echo "🚀 Market Prices Service - Quick Setup"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js 20+ from https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node --version) detected${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker is not installed${NC}"
    echo "Install Docker to run the full stack locally"
    echo "Visit: https://docs.docker.com/get-docker/"
    DOCKER_AVAILABLE=false
else
    echo -e "${GREEN}✅ Docker $(docker --version | cut -d' ' -f3 | cut -d',' -f1) detected${NC}"
    DOCKER_AVAILABLE=true
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null && [ "$DOCKER_AVAILABLE" = true ]; then
    echo -e "${YELLOW}⚠️  docker-compose is not installed${NC}"
    COMPOSE_AVAILABLE=false
else
    if [ "$DOCKER_AVAILABLE" = true ]; then
        echo -e "${GREEN}✅ docker-compose detected${NC}"
        COMPOSE_AVAILABLE=true
    fi
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "⚙️  Setting up environment..."

if [ ! -f .env ]; then
    cp env.example .env
    echo -e "${GREEN}✅ Created .env file${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT: You need to configure your API keys!${NC}"
    echo ""
    echo "Edit .env and add your API keys:"
    echo "  - COINGECKO_API_KEY"
    echo "  - COINMARKETCAP_API_KEY (optional, for fallback)"
    echo "  - TIMESCALE_PASSWORD (database password)"
    echo ""
    
    # Prompt for API keys
    read -p "Do you want to enter API keys now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter CoinGecko API key: " COINGECKO_KEY
        read -p "Enter CoinMarketCap API key (optional): " CMC_KEY
        read -p "Enter database password (default: coinet_password): " DB_PASSWORD
        DB_PASSWORD=${DB_PASSWORD:-coinet_password}
        
        # Update .env file
        if [ "$(uname)" == "Darwin" ]; then
            # macOS
            sed -i '' "s/COINGECKO_API_KEY=.*/COINGECKO_API_KEY=$COINGECKO_KEY/" .env
            sed -i '' "s/COINMARKETCAP_API_KEY=.*/COINMARKETCAP_API_KEY=$CMC_KEY/" .env
            sed -i '' "s/TIMESCALE_PASSWORD=.*/TIMESCALE_PASSWORD=$DB_PASSWORD/" .env
        else
            # Linux
            sed -i "s/COINGECKO_API_KEY=.*/COINGECKO_API_KEY=$COINGECKO_KEY/" .env
            sed -i "s/COINMARKETCAP_API_KEY=.*/COINMARKETCAP_API_KEY=$CMC_KEY/" .env
            sed -i "s/TIMESCALE_PASSWORD=.*/TIMESCALE_PASSWORD=$DB_PASSWORD/" .env
        fi
        
        echo -e "${GREEN}✅ API keys configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Remember to edit .env before running the service${NC}"
    fi
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

echo ""
echo "🔨 Building TypeScript..."
npm run build

if [ "$DOCKER_AVAILABLE" = true ] && [ "$COMPOSE_AVAILABLE" = true ]; then
    echo ""
    read -p "Do you want to start the infrastructure (database, cache) now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "🐳 Starting infrastructure with Docker Compose..."
        docker-compose up -d timescaledb redis
        
        echo ""
        echo "⏳ Waiting for services to be ready..."
        sleep 5
        
        # Check if services are running
        if docker-compose ps | grep -q "timescaledb.*Up"; then
            echo -e "${GREEN}✅ TimescaleDB is running${NC}"
        else
            echo -e "${RED}❌ TimescaleDB failed to start${NC}"
        fi
        
        if docker-compose ps | grep -q "redis.*Up"; then
            echo -e "${GREEN}✅ Redis is running${NC}"
        else
            echo -e "${RED}❌ Redis failed to start${NC}"
        fi
    fi
fi

echo ""
echo "======================================"
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "======================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Ensure your API keys are configured in .env"
echo ""
echo "2. Start the service:"
echo "   ${GREEN}npm run dev${NC}        (development mode)"
echo "   ${GREEN}npm start${NC}          (production mode)"
echo ""
echo "3. Or use Docker Compose for the full stack:"
echo "   ${GREEN}docker-compose up -d${NC}"
echo ""
echo "4. View logs:"
echo "   ${GREEN}docker-compose logs -f market-prices${NC}"
echo ""
echo "5. Access management tools (when using Docker with --profile debug):"
echo "   ${GREEN}http://localhost:5050${NC}   (pgAdmin - database management)"
echo "   ${GREEN}http://localhost:8081${NC}   (Redis Commander - cache inspection)"
echo ""
echo "📚 Documentation:"
echo "   README.md          - Complete guide"
echo "   API.md             - API reference"
echo "   EXAMPLES.md        - Usage examples"
echo "   DEPLOYMENT.md      - Deployment guide"
echo ""
echo "🆘 Need help? Check the troubleshooting section in DEPLOYMENT.md"
echo ""

