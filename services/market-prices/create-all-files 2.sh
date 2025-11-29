#!/bin/bash
# One-command script to create all market-prices enhancement files in Codespace
# Run this in: /workspaces/coinet-platform/services/market-prices

set -e

echo "🚀 Creating all market-prices enhancement files..."

# Create directories
mkdir -p src/services src/utils

# Create unified-market-data.ts
cat > src/services/unified-market-data.ts << 'UNIFIED_EOF'
