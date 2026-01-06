#!/bin/bash
# Resolve failed Prisma migration and deploy

set -e

# Save original NODE_ENV and temporarily unset it to suppress npm production warning
# Prisma doesn't install dependencies, so this is safe
ORIGINAL_NODE_ENV="${NODE_ENV:-}"
unset NODE_ENV
export npm_config_production=false

echo "🔧 Resolving failed migration..."

# Try to resolve the failed migration (ignore if already resolved or doesn't exist)
# This marks the failed migration as applied so Prisma can proceed
if npx prisma migrate resolve --applied 20251216180000_add_project_knowledge --schema=./prisma/schema.prisma 2>/dev/null; then
  echo "✅ Marked failed migration as resolved"
else
  echo "⚠️ Migration resolution skipped (may already be resolved or not found)"
fi

# Deploy all migrations (this will apply the fix migration)
echo "📦 Deploying migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

# Restore NODE_ENV if it was set
if [ -n "$ORIGINAL_NODE_ENV" ]; then
  export NODE_ENV="$ORIGINAL_NODE_ENV"
fi

echo "✅ Migrations deployed successfully"
