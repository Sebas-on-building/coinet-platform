#!/bin/bash
# FINAL FIX FOR MODULE RESOLUTION

echo "🔧 FINAL FIX: Switch to npm for Docker builds"
echo ""
echo "COPY THIS TO YOUR CODESPACE:"
echo "=============================="
cat << 'CODESPACE'
cd /workspaces/coinet-platform

# Switch Dockerfile from pnpm to npm
sed -i 's/RUN corepack enable && corepack prepare pnpm@9.12.3 --activate/RUN npm install -g npm@latest/g' railway.dockerfile
sed -i 's/RUN pnpm install --frozen-lockfile/RUN npm ci/g' railway.dockerfile
sed -i 's/pnpm --filter @coinet\/signal-intelligence run build/npm run build --workspace=@coinet/signal-intelligence/g' railway.dockerfile
sed -i 's/pnpm --filter @coinet\/algorithms run build/npm run build --workspace=@coinet/algorithms/g' railway.dockerfile
sed -i 's/pnpm --filter @coinet\/monetization run build/npm run build --workspace=@coinet/monetization/g' railway.dockerfile
sed -i 's/pnpm --filter @coinet\/engine run build/npm run build --workspace=@coinet/engine/g' railway.dockerfile
sed -i 's/pnpm --filter @coinet\/ai-intelligence run build/npm run build --workspace=@coinet/ai-intelligence/g' railway.dockerfile
sed -i 's/pnpm --filter @coinet\/api run build/npm run build --workspace=@coinet/api/g' railway.dockerfile
sed -i 's/pnpm --filter @coinet\/notifications run build/npm run build --workspace=@coinet/notifications/g' railway.dockerfile
sed -i 's/pnpm --filter @coinet\/frontend-api run build/npm run build --workspace=@coinet/frontend-api/g' railway.dockerfile
sed -i 's/pnpm --filter coinet-platform run build/npm run build --workspace=coinet-platform/g' railway.dockerfile

# Create package-lock.json from pnpm-lock.yaml
rm package-lock.json
npm install

# Test build locally
npm run build

# Push
git add -A
git commit -m "fix: switch to npm for Docker builds to resolve module resolution issues"
git push origin main

echo ""
echo "✅ Switched to npm for Docker!"
echo "Now redeploy in Railway with 'Clear Build Cache'"
CODESPACE
echo "=============================="
