#!/bin/bash
# Script to create all CryptoPanic files in codespace
# Run this in your codespace: bash create-cryptopanic-files.sh

set -e

echo "🚀 Creating CryptoPanic integration files..."

# Create directories
mkdir -p src/providers
mkdir -p src/services
mkdir -p src/types
mkdir -p src/examples
mkdir -p src/tests

# Check if we're in codespace
if [ -d "/workspaces/coinet-platform" ]; then
    BASE_DIR="/workspaces/coinet-platform/services/market-prices"
    echo "✅ Detected codespace environment"
else
    BASE_DIR="."
    echo "✅ Using current directory"
fi

cd "$BASE_DIR"

echo ""
echo "📝 Files will be created in: $(pwd)"
echo ""
echo "⚠️  This script will create placeholder files."
echo "   You'll need to copy the actual content from your local machine."
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 1
fi

# Create file list
cat > CRYPTOPANIC_FILES_TO_CREATE.txt << 'EOF'
Files to create:
1. src/providers/cryptopanic-rest.ts
2. src/services/cryptopanic-news.service.ts
3. src/services/cryptopanic-sentiment.service.ts
4. src/types/cryptopanic.types.ts
5. src/examples/cryptopanic-integration.example.ts
6. src/tests/cryptopanic.test.ts
7. test-cryptopanic.ts
EOF

echo "✅ Created file list: CRYPTOPANIC_FILES_TO_CREATE.txt"
echo ""
echo "📋 Next steps:"
echo "1. Copy files from your local machine to codespace"
echo "2. Or use VS Code to create files and paste content"
echo "3. Or commit locally and push, then pull in codespace"
echo ""
echo "📚 See CODESPACE_SETUP.md for detailed instructions"

