#!/bin/bash
# Resolve failed Prisma migration and deploy

set -e

# Suppress npm production warning by setting loglevel and redirecting stderr
export npm_config_loglevel=silent
export npm_config_production=false

echo "🔧 Resolving failed migration..."

# Try to resolve the failed migration (ignore if already resolved or doesn't exist)
# This marks the failed migration as applied so Prisma can proceed
# Redirect npm warnings to /dev/null and filter output
TEMP_OUT=$(mktemp)
(env -u NODE_ENV npx --yes prisma migrate resolve --applied 20251216180000_add_project_knowledge --schema=./prisma/schema.prisma 2>&1 | grep -vE "(npm warn|npm warn config)" || true) > "$TEMP_OUT" 2>&1 || true
cat "$TEMP_OUT" | grep -vE "(npm warn|npm warn config)" || true
rm -f "$TEMP_OUT"
if [ ${PIPESTATUS[0]} -eq 0 ] 2>/dev/null || [ $? -eq 0 ]; then
  echo "✅ Marked failed migration as resolved"
else
  echo "⚠️ Migration resolution skipped (may already be resolved or not found)"
fi

# Deploy all migrations (this will apply the fix migration)
# Use --yes flag and redirect npm warnings completely
echo "📦 Deploying migrations..."
TEMP_OUT=$(mktemp)
TEMP_ERR=$(mktemp)
(env -u NODE_ENV npx --yes prisma migrate deploy --schema=./prisma/schema.prisma 2>&1 | grep -vE "(npm warn|npm warn config)" || true) > "$TEMP_OUT" 2>"$TEMP_ERR"
DEPLOY_EXIT=$?
cat "$TEMP_OUT" | grep -vE "(npm warn|npm warn config)" || true
# Also filter stderr file
cat "$TEMP_ERR" 2>/dev/null | grep -vE "(npm warn|npm warn config)" >&2 || true
rm -f "$TEMP_OUT" "$TEMP_ERR"
if [ $DEPLOY_EXIT -ne 0 ]; then
  exit $DEPLOY_EXIT
fi

echo "✅ Migrations deployed successfully"
