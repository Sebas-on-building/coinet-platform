#!/bin/bash

# ==============================================================================
# Railway Deployment Script
# ==============================================================================
# 
# This script helps deploy market-prices service to Railway
#
# Usage:
#   ./scripts/deploy-railway.sh          # Deploy to Railway
#   ./scripts/deploy-railway.sh --check   # Check deployment status
#   ./scripts/deploy-railway.sh --logs    # View logs
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🚀 Railway Deployment Script${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${YELLOW}⚠️  Railway CLI not found${NC}"
    echo ""
    echo "Installing Railway CLI..."
    npm install -g @railway/cli
    echo ""
fi

# Check arguments
case "${1:-deploy}" in
    --check)
        echo "📊 Checking deployment status..."
        cd "$SERVICE_DIR"
        railway status
        ;;
    
    --logs)
        echo "📋 Viewing Railway logs..."
        cd "$SERVICE_DIR"
        railway logs --tail
        ;;
    
    --deploy|deploy)
        echo "🔨 Building service..."
        cd "$SERVICE_DIR"
        
        # Build TypeScript
        echo "  → Running TypeScript build..."
        npm run build
        
        # Check build succeeded
        if [ ! -d "dist" ]; then
            echo -e "${RED}❌ Build failed - dist directory not found${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}✅ Build successful${NC}"
        echo ""
        
        # Check if linked to Railway
        if [ ! -f ".railway/project.json" ]; then
            echo -e "${YELLOW}⚠️  Not linked to Railway project${NC}"
            echo ""
            echo "Linking to Railway..."
            railway link
            echo ""
        fi
        
        # Deploy
        echo "🚀 Deploying to Railway..."
        railway up
        
        echo ""
        echo -e "${GREEN}✅ Deployment initiated!${NC}"
        echo ""
        echo "Monitor deployment:"
        echo "  railway logs --tail"
        echo ""
        echo "Check status:"
        echo "  railway status"
        ;;
    
    --help|help|-h)
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  deploy (default)  Deploy service to Railway"
        echo "  --check           Check deployment status"
        echo "  --logs            View Railway logs"
        echo "  --help            Show this help"
        ;;
    
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo "Run '$0 --help' for usage"
        exit 1
        ;;
esac

