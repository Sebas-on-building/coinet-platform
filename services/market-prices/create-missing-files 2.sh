#!/bin/bash
# Script to create missing test and example files in Codespace
# Run this in Codespace: bash create-missing-files.sh

cd /workspaces/coinet-platform/services/market-prices

# Create directories
mkdir -p src/examples src/tests

echo "Creating files..."

# Create vitest.config.ts
cat > vitest.config.ts << 'EOF'
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/',
        'src/examples/',
        'dist/',
      ],
    },
  },
});
EOF

# Create example files (you'll need to copy content from local)
echo "✅ Created vitest.config.ts"
echo ""
echo "⚠️  Note: Example and test files need to be copied from your local machine"
echo "   Files to copy:"
echo "   - src/examples/unified-market-data.example.ts"
echo "   - src/examples/market-analytics.example.ts"
echo "   - src/examples/market-data-streamer.example.ts"
echo "   - src/examples/enhanced-error-handler.example.ts"
echo "   - src/tests/unified-market-data.test.ts"
echo "   - src/tests/market-analytics.test.ts"
echo "   - src/tests/market-data-streamer.test.ts"
echo ""
echo "After copying, run: git add src/examples/*.example.ts src/tests/*.test.ts vitest.config.ts"

