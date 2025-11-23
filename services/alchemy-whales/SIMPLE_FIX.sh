#!/bin/bash
# Simple Fix - Just compile and run
# No fancy checks, just works

cd /workspaces/coinet-platform/services/alchemy-whales || cd "$(dirname "$0")"

echo "🔧 Simple Fix Script"
echo "==================="
echo ""

# Show where we are
echo "📍 Directory: $(pwd)"
echo ""

# Check files
echo "📁 Checking files..."
[ -f "tsconfig.json" ] && echo "✅ tsconfig.json found" || echo "⚠️  tsconfig.json missing"
[ -f "package.json" ] && echo "✅ package.json found" || echo "⚠️  package.json missing"
[ -d "src" ] && echo "✅ src/ directory found" || echo "⚠️  src/ directory missing"
echo ""

# Create .env if needed
if [ ! -f ".env" ]; then
    [ -f ".env.example" ] && cp .env.example .env && echo "✅ Created .env" || echo "⚠️  .env.example not found"
fi

# Try to compile
echo "🔨 Compiling TypeScript..."
npx tsc --version || npm install -g typescript

# Multiple compilation attempts
npx tsc -p tsconfig.json 2>&1 || \
npx tsc --project tsconfig.json 2>&1 || \
npx tsc src/index.ts --outDir dist --module commonjs --target ES2022 --esModuleInterop --skipLibCheck 2>&1 || \
(cd src && npx tsc ../tsconfig.json) 2>&1

# Check result
if [ -f "dist/index.js" ]; then
    echo ""
    echo "✅✅✅ SUCCESS! dist/index.js created! ✅✅✅"
    echo ""
    echo "🚀 Start the service with:"
    echo "   node dist/index.js"
else
    echo ""
    echo "⚠️  dist/index.js not found. Checking dist/ directory..."
    [ -d "dist" ] && ls -la dist/ | head -10 || echo "dist/ directory doesn't exist"
    echo ""
    echo "Try manual compilation:"
    echo "  npx tsc --project tsconfig.json"
fi

