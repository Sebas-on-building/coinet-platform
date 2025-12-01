#!/bin/bash
echo "📋 COPY THESE COMMANDS TO YOUR CODESPACE:"
echo "=========================================="
cat << 'CODESPACE'
cd /workspaces/coinet-platform

# Check what files exist
echo "Checking files..."
ls -la apps/coinet-platform/ 2>/dev/null || echo "apps/coinet-platform not found"
ls -la railway.dockerfile 2>/dev/null || echo "railway.dockerfile not found"

# Stage only files that exist
git add apps/coinet-platform railway.dockerfile

# Check status
git status

# Commit if there are changes
if ! git diff --staged --quiet; then
  git commit -m "fix: create coinet-platform app and fix Railway Dockerfile for deployment"
  echo ""
  echo "✅ Committed! Now push:"
  echo "git push origin main"
else
  echo ""
  echo "⚠️  No changes to commit. Files may already be committed or don't exist."
  echo "Checking git log..."
  git log --oneline -3
fi
CODESPACE
echo "=========================================="
