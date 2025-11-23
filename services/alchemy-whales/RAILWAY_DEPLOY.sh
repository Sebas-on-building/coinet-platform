#!/bin/bash
# Railway Deployment Script for Alchemy Whales Service
# Run this script to deploy to Railway

set -e

echo "🚂 Deploying Alchemy Whales Service to Railway..."
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Navigate to service directory
cd "$(dirname "$0")"

echo "📦 Current directory: $(pwd)"
echo ""

# Check if already linked to Railway
if [ ! -f ".railway/project.json" ]; then
    echo "🔗 Linking to Railway project..."
    railway link
else
    echo "✅ Already linked to Railway project"
fi

echo ""
echo "📋 Setting up environment variables..."
echo "⚠️  Make sure you have your Alchemy API keys ready!"
echo ""

# Prompt for API keys
read -p "Enter Ethereum Alchemy API Key: " ETH_KEY
read -p "Enter Polygon Alchemy API Key: " POLYGON_KEY
read -p "Enter Arbitrum Alchemy API Key: " ARB_KEY
read -p "Enter Optimism Alchemy API Key: " OPT_KEY
read -p "Enter Base Alchemy API Key: " BASE_KEY
read -sp "Enter Database Password: " DB_PASSWORD
echo ""
read -sp "Enter Webhook Secret (or press Enter to generate): " WEBHOOK_SECRET
echo ""

# Generate webhook secret if not provided
if [ -z "$WEBHOOK_SECRET" ]; then
    WEBHOOK_SECRET=$(openssl rand -hex 32)
    echo "✅ Generated webhook secret: $WEBHOOK_SECRET"
fi

# Set Railway variables
echo "🔐 Setting Railway environment variables..."
railway variables set ALCHEMY_API_KEY_ETH="$ETH_KEY"
railway variables set ALCHEMY_API_KEY_POLYGON="$POLYGON_KEY"
railway variables set ALCHEMY_API_KEY_ARBITRUM="$ARB_KEY"
railway variables set ALCHEMY_API_KEY_OPTIMISM="$OPT_KEY"
railway variables set ALCHEMY_API_KEY_BASE="$BASE_KEY"
railway variables set DATABASE_PASSWORD="$DB_PASSWORD"
railway variables set WEBHOOK_SECRET="$WEBHOOK_SECRET"
railway variables set NODE_ENV=production
railway variables set LOG_LEVEL=info

echo ""
echo "🚀 Deploying to Railway..."
railway up

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "📊 Check deployment status:"
echo "   railway logs"
echo ""
echo "🌐 Get deployment URL:"
echo "   railway domain"
echo ""
echo "🏥 Health check:"
echo "   curl https://your-app.railway.app/health"

