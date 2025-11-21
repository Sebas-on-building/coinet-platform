#!/bin/bash

# 🚨 CRITICAL FIX FOR RAILWAY.JSON
# Run this in your GitHub Codespace terminal at: /workspaces/coinet-platform

echo "════════════════════════════════════════════════════════════"
echo "🔧 RAILWAY.JSON FIX SCRIPT"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "⚠️  IMPORTANT: Run this in your CODESPACE, not locally!"
echo ""
echo "Copy and paste the commands below into your Codespace terminal:"
echo ""
echo "────────────────────────────────────────────────────────────"

cat << 'CODESPACE_COMMANDS'
cd /workspaces/coinet-platform

# Fix railway.json with CORRECT path
cat > railway.json << 'RAILWAY_EOF'
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "node dist/index.js",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
RAILWAY_EOF

echo "✅ railway.json fixed!"
echo ""
echo "=== NEW CONTENT ==="
cat railway.json

# Commit and push
git add railway.json
git commit -m "fix: correct startCommand to 'node dist/index.js'"
git push origin main

echo ""
echo "════════════════════════════════════════════════════════════"
echo "🎉 FIX PUSHED TO GITHUB!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Railway will auto-deploy in ~2 minutes with the correct path!"
echo ""
echo "Expected path: /app/apps/coinet-platform/dist/index.js ✅"
CODESPACE_COMMANDS

echo "────────────────────────────────────────────────────────────"
echo ""
echo "After running the above in Codespace, Railway will:"
echo "  1. Detect the new commit"
echo "  2. Rebuild the Docker image"
echo "  3. Start with: node dist/index.js"
echo "  4. Find: /app/apps/coinet-platform/dist/index.js ✅"
echo "  5. App starts successfully!"
echo "  6. Healthcheck passes!"
echo "  7. Deployment goes LIVE! 🚀"
echo ""
echo "════════════════════════════════════════════════════════════"

