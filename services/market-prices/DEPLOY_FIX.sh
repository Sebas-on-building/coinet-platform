#!/bin/bash
# 🚀 Divine Perfection Deployment Fix Script
# Fixes all build and git issues for Codespace & Railway deployment

set -e

echo "🚀 Starting Divine Perfection Deployment Fix..."
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Install dependencies
echo -e "${YELLOW}Step 1: Installing dependencies...${NC}"
cd services/market-prices
npm install

# Step 2: Build TypeScript
echo -e "${YELLOW}Step 2: Building TypeScript...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful!${NC}"
else
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

# Step 3: Go back to root
cd ../..

# Step 4: Stage all files
echo -e "${YELLOW}Step 3: Staging all files...${NC}"
git add .

# Step 5: Commit changes
echo -e "${YELLOW}Step 4: Committing changes...${NC}"
git commit -m "feat: Phase 1 Week 1-2 - Divine Perfection Intelligence System

- Pattern Mining System (Week 1)
- Hyper-Optimization Layer (Week 2)
- Predictive Rate Limiting
- Multi-Dimensional Caching
- Intelligence Orchestrator
- All intelligence files and optimizations"

# Step 6: Pull latest changes
echo -e "${YELLOW}Step 5: Pulling latest changes...${NC}"
git pull origin main --rebase || git pull origin main --no-rebase

# Step 7: Push to remote
echo -e "${YELLOW}Step 6: Pushing to remote...${NC}"
git push origin main

echo -e "${GREEN}✅ Deployment fix complete!${NC}"
echo "================================================"

