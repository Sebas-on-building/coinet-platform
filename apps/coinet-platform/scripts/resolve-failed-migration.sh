#!/bin/bash
# Resolve failed Prisma migration and deploy

set -e

# Suppress npm production warning by setting loglevel and filtering stderr
export npm_config_loglevel=error
export npm_config_production=false

echo "🔧 Resolving failed migration..."

# Try to resolve the failed migration (ignore if already resolved or doesn't exist)
# This marks the failed migration as applied so Prisma can proceed
# Filter out npm warnings from stderr
env -u NODE_ENV npx prisma migrate resolve --applied 20251216180000_add_project_knowledge --schema=./prisma/schema.prisma 2>&1 | grep -v "^npm warn" >&2 || true
RESOLVE_EXIT=${PIPESTATUS[0]}
if [ $RESOLVE_EXIT -eq 0 ]; then
  echo "✅ Marked failed migration as resolved"
else
  echo "⚠️ Migration resolution skipped (may already be resolved or not found)"
fi

# Deploy all migrations (this will apply the fix migration)
# Filter out npm warnings from stderr while preserving exit code
echo "📦 Deploying migrations..."
env -u NODE_ENV npx prisma migrate deploy --schema=./prisma/schema.prisma 2>&1 | grep -v "^npm warn" >&2
DEPLOY_EXIT=${PIPESTATUS[0]}
if [ $DEPLOY_EXIT -ne 0 ]; then
  exit $DEPLOY_EXIT
fi

echo "✅ Migrations deployed successfully"
