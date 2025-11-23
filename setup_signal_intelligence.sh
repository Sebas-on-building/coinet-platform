#!/bin/bash
# 🚀 COINET MVP - Signal Intelligence Layer Setup
# Run this in your GitHub Codespace: /workspaces/coinet-platform

set -e  # Exit on error

echo "🏗️  Creating Signal Intelligence Layer structure..."

# Navigate to project root
cd /workspaces/coinet-platform

# Create directory structure
mkdir -p packages/signal-intelligence/src/onchain-intelligence
mkdir -p packages/signal-intelligence/src/social-sentiment
mkdir -p packages/signal-intelligence/src/market-microstructure
mkdir -p packages/signal-intelligence/src/types

echo "📝 Creating package.json..."
cat > packages/signal-intelligence/package.json << 'EOF'
{
  "name": "@coinet/signal-intelligence",
  "version": "0.1.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsc -p tsconfig.json --watch",
    "test": "jest"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "ws": "^8.14.0",
    "ethers": "^6.9.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/ws": "^8.5.0",
    "typescript": "^5.3.0"
  }
}
EOF

echo "📝 Creating tsconfig.json..."
cat > packages/signal-intelligence/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
EOF

echo "✅ Structure created! Now creating core types..."
