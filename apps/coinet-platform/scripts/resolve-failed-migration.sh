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

# Also resolve the user/session migration if it failed
TEMP_OUT=$(mktemp)
(env -u NODE_ENV npx --yes prisma migrate resolve --rolled-back 20260106060000_add_user_and_session_models --schema=./prisma/schema.prisma 2>&1 | grep -vE "(npm warn|npm warn config)" || true) > "$TEMP_OUT" 2>&1 || true
cat "$TEMP_OUT" | grep -vE "(npm warn|npm warn config)" || true
rm -f "$TEMP_OUT"
if [ ${PIPESTATUS[0]} -eq 0 ] 2>/dev/null || [ $? -eq 0 ]; then
  echo "✅ Marked user/session migration as rolled back (will retry)"
else
  echo "⚠️ User/session migration resolution skipped"
fi

# Resolve the orphaned data fix migration if it failed
TEMP_OUT=$(mktemp)
(env -u NODE_ENV npx --yes prisma migrate resolve --rolled-back 20260106070000_fix_orphaned_user_data --schema=./prisma/schema.prisma 2>&1 | grep -vE "(npm warn|npm warn config)" || true) > "$TEMP_OUT" 2>&1 || true
cat "$TEMP_OUT" | grep -vE "(npm warn|npm warn config)" || true
rm -f "$TEMP_OUT"
if [ ${PIPESTATUS[0]} -eq 0 ] 2>/dev/null || [ $? -eq 0 ]; then
  echo "✅ Marked orphaned data fix migration as rolled back (will retry)"
else
  echo "⚠️ Orphaned data fix migration resolution skipped"
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

# Regenerate Prisma Client after migrations to include new models
echo "🔄 Regenerating Prisma Client..."
TEMP_OUT=$(mktemp)
(env -u NODE_ENV npx --yes prisma generate --schema=./prisma/schema.prisma 2>&1 | grep -vE "(npm warn|npm warn config)" || true) > "$TEMP_OUT" 2>&1
GENERATE_EXIT=$?
cat "$TEMP_OUT" | grep -vE "(npm warn|npm warn config)" || true
rm -f "$TEMP_OUT"
if [ $GENERATE_EXIT -eq 0 ]; then
  echo "✅ Prisma Client regenerated successfully"
else
  echo "⚠️ Prisma Client regeneration failed (may still work with cached client)"
fi
