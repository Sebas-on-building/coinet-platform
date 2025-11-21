#!/bin/bash
# Add all safe files from alchemy-whales service
# Run this from the repository root

echo "🔧 Adding all Alchemy Whales Service files..."

cd /workspaces/coinet-platform || cd "$(git rev-parse --show-toplevel)"

# Add source code
git add services/alchemy-whales/src/

# Add configuration files
git add services/alchemy-whales/*.json
git add services/alchemy-whales/*.yaml 2>/dev/null || true
git add services/alchemy-whales/tsconfig.json
git add services/alchemy-whales/jest.config.js
git add services/alchemy-whales/nixpacks.toml

# Add Docker and deployment files
git add services/alchemy-whales/Dockerfile
git add services/alchemy-whales/.dockerignore
git add services/alchemy-whales/.railwayignore

# Add Kubernetes configs
git add services/alchemy-whales/k8s/

# Add documentation
git add services/alchemy-whales/*.md

# Add scripts
git add services/alchemy-whales/*.sh

# Add config files
git add services/alchemy-whales/.eslintrc.js
git add services/alchemy-whales/.prettierrc
git add services/alchemy-whales/.prettierignore
git add services/alchemy-whales/.gitignore
git add services/alchemy-whales/.env.example

# Add GitHub workflows
git add services/alchemy-whales/.github/

# Add examples
git add services/alchemy-whales/examples/

# Add docs directory
git add services/alchemy-whales/docs/ 2>/dev/null || true

echo ""
echo "✅ Files staged. Checking status..."
echo ""

git status --short | grep "alchemy-whales" | head -30

echo ""
echo "📝 Ready to commit!"
echo "Run: git commit -m 'feat: Complete Alchemy Whales Service implementation'"
echo ""

