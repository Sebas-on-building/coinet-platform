#!/bin/bash
# 🔥 Divine Port Cleanup & Start Script
# Run this when port 3000 is in use

echo "🧹 Step 1: Killing all processes on port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "   ✅ Port 3000 is free"

echo "⏳ Step 2: Waiting 2 seconds for port release..."
sleep 2

echo "🔨 Step 3: Building backend..."
cd apps/coinet-platform
pnpm build

echo "🚀 Step 4: Starting backend..."
echo "   (Keep this terminal open!)"
pnpm start

