# Commands to check file locations in Codespace
# Run these in Codespace to find where the files actually are:

echo "=== Searching for market-analytics.ts ==="
find . -name "market-analytics.ts" -type f 2>/dev/null

echo ""
echo "=== Searching for market-data-streamer.ts ==="
find . -name "market-data-streamer.ts" -type f 2>/dev/null

echo ""
echo "=== Searching for enhanced-error-handler.ts ==="
find . -name "enhanced-error-handler.ts" -type f 2>/dev/null

echo ""
echo "=== Checking src/services/ directory ==="
ls -la src/services/ 2>/dev/null

echo ""
echo "=== Checking src/utils/ directory ==="
ls -la src/utils/ 2>/dev/null

echo ""
echo "=== Checking root directory for misplaced files ==="
ls -la *.ts 2>/dev/null | head -10

