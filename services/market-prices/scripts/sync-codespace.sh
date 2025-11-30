#!/bin/bash

# ==============================================================================
# Codespace Sync Script
# ==============================================================================
# 
# This script syncs changes from GitHub to Codespace
#
# Usage:
#   ./scripts/sync-codespace.sh
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🔄 Codespace Sync Script${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT"

echo -e "${BLUE}📥 Pulling latest changes from GitHub...${NC}"
echo ""

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Uncommitted changes detected${NC}"
    echo ""
    echo "Options:"
    echo "  1. Stash changes and pull"
    echo "  2. Commit changes first"
    echo "  3. Abort"
    echo ""
    read -p "Choose option (1/2/3): " choice
    
    case $choice in
        1)
            echo "Stashing changes..."
            git stash
            echo -e "${GREEN}✅ Changes stashed${NC}"
            ;;
        2)
            echo -e "${RED}Please commit your changes first:${NC}"
            echo "  git add ."
            echo "  git commit -m 'Your message'"
            exit 1
            ;;
        3)
            echo "Aborted."
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            exit 1
            ;;
    esac
    echo ""
fi

# Pull latest changes
echo "Pulling from feature/ai-data-feeder..."
if git pull origin feature/ai-data-feeder; then
    echo -e "${GREEN}✅ Pull successful${NC}"
else
    echo -e "${RED}❌ Pull failed${NC}"
    exit 1
fi

echo ""

# Check if package-lock.json conflicts
if [ -f "services/market-prices/package-lock.json" ]; then
    echo -e "${BLUE}📦 Checking package-lock.json...${NC}"
    
    # If there were conflicts, regenerate
    if git diff --name-only | grep -q "package-lock.json"; then
        echo -e "${YELLOW}⚠️  package-lock.json conflicts detected${NC}"
        echo "Regenerating package-lock.json..."
        cd services/market-prices
        rm -f package-lock.json
        npm install
        echo -e "${GREEN}✅ package-lock.json regenerated${NC}"
        cd "$PROJECT_ROOT"
    fi
fi

echo ""

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
cd services/market-prices

if npm install; then
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${RED}❌ Dependency installation failed${NC}"
    exit 1
fi

echo ""

# Build TypeScript
echo -e "${BLUE}🔨 Building TypeScript...${NC}"
if npm run build; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${YELLOW}⚠️  Build failed (non-critical)${NC}"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Codespace sync complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "  1. Run tests: npm test"
echo "  2. Run benchmarks: npm run benchmark:1000x"
echo "  3. Deploy to Railway: ./scripts/deploy-railway.sh"
echo ""

