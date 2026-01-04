#!/bin/bash
# Resolve failed Prisma migration and deploy

set -e

echo "🔧 Resolving failed migration..."

# Try to resolve the failed migration (ignore if already resolved or doesn't exist)
npx prisma migrate resolve --applied 20251216180000_add_project_knowledge --schema=./prisma/schema.prisma 2>/dev/null || echo "⚠️ Migration resolution skipped (may already be resolved)"

# Deploy all migrations
echo "📦 Deploying migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "✅ Migrations deployed successfully"
