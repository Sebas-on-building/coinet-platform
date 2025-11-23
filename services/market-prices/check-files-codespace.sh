#!/bin/bash
# Run this in Codespace to check file status

cd /workspaces/coinet-platform/services/market-prices

echo "=== Checking file existence and sizes ==="
echo ""

# Check example files
echo "Example files:"
for file in unified-market-data market-analytics market-data-streamer enhanced-error-handler; do
  if [ -f "src/examples/${file}.example.ts" ]; then
    size=$(wc -c < "src/examples/${file}.example.ts" 2>/dev/null || echo "0")
    if [ "$size" -eq 0 ]; then
      echo "  ❌ src/examples/${file}.example.ts exists but is EMPTY"
    else
      echo "  ✅ src/examples/${file}.example.ts ($(ls -lh src/examples/${file}.example.ts | awk '{print $5}'))"
    fi
  else
    echo "  ❌ src/examples/${file}.example.ts MISSING"
  fi
done

echo ""
echo "Test files:"
for file in unified-market-data market-analytics market-data-streamer; do
  if [ -f "src/tests/${file}.test.ts" ]; then
    size=$(wc -c < "src/tests/${file}.test.ts" 2>/dev/null || echo "0")
    if [ "$size" -eq 0 ]; then
      echo "  ❌ src/tests/${file}.test.ts exists but is EMPTY"
    else
      echo "  ✅ src/tests/${file}.test.ts ($(ls -lh src/tests/${file}.test.ts | awk '{print $5}'))"
    fi
  else
    echo "  ❌ src/tests/${file}.test.ts MISSING"
  fi
done

echo ""
if [ -f "vitest.config.ts" ]; then
  size=$(wc -c < "vitest.config.ts" 2>/dev/null || echo "0")
  if [ "$size" -eq 0 ]; then
    echo "  ❌ vitest.config.ts exists but is EMPTY"
  else
    echo "  ✅ vitest.config.ts ($(ls -lh vitest.config.ts | awk '{print $5}'))"
  fi
else
  echo "  ❌ vitest.config.ts MISSING"
fi

