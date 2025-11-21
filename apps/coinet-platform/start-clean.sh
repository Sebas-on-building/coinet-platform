#!/bin/bash
# 🔥 Divine Clean Start Script
# Kills all processes on port 3000 and starts the backend fresh

set -e

echo "🧹 Cleaning up port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "✅ Port 3000 is free"

echo "⏳ Waiting for port to be released..."
sleep 2

echo "🔨 Building backend..."
pnpm build

echo "🚀 Starting backend..."
pnpm start

