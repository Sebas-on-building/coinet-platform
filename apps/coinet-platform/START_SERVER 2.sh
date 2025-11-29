#!/bin/bash
# Quick server start script

echo "🚀 Starting Coinet Platform..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run from apps/coinet-platform directory"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Generate Prisma client if needed
if [ ! -d "node_modules/.prisma" ]; then
    echo "🔧 Generating Prisma client..."
    pnpm db:generate || echo "⚠️  Prisma generation skipped (no DATABASE_URL)"
fi

# Build TypeScript
echo "🔨 Building TypeScript..."
pnpm build

# Start server
echo "✅ Starting server..."
pnpm start

