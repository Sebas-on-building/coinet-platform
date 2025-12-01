#!/bin/bash
# Verify local changes and push to GitHub

cd /Users/sebastian/Desktop/Arbeit/coinet-platform-local

echo "📋 Checking what files were changed..."
git log --oneline -5

echo ""
echo "📁 Checking if chat API files exist locally..."
ls -la apps/coinet-platform/src/api/chat/ 2>/dev/null || echo "❌ Chat API folder not found locally"

echo ""
echo "🔍 Checking git status..."
git status --short

echo ""
echo "📤 Pushing any remaining changes..."
git push origin main

echo ""
echo "✅ Done! Now pull in Codespace with:"
echo "   cd /workspaces/coinet-platform && git pull origin main"

