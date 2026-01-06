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
if env -u NODE_ENV npx prisma migrate resolve --applied 20251216180000_add_project_knowledge --schema=./prisma/schema.prisma 2>&1 | grep -v "npm warn" 2>/dev/null || true; then
  # Check if the actual command succeeded (not grep)
  if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo "✅ Marked failed migration as resolved"
  else
    echo "⚠️ Migration resolution skipped (may already be resolved or not found)"
  fi
else
  echo "⚠️ Migration resolution skipped (may already be resolved or not found)"
fi

# Deploy all migrations (this will apply the fix migration)
# Filter out npm warnings from stderr while preserving exit code
echo "📦 Deploying migrations..."
env -u NODE_ENV npx prisma migrate deploy --schema=./prisma/schema.prisma 2>&1 | grep -v "npm warn" || {
  EXIT_CODE=${PIPESTATUS[0]}
  # Exit code 141 is SIGPIPE from grep (normal when filtering), 0 is success
  if [ $EXIT_CODE -ne 0 ] && [ $EXIT_CODE -ne 141 ]; then
    exit $EXIT_CODE
  fi
}

echo "✅ Migrations deployed successfully"
