# Search more broadly for the files
# Run this in Codespace:

cd /workspaces/coinet-platform/services/market-prices && \
echo "=== Searching entire workspace ===" && \
find /workspaces/coinet-platform -name "market-analytics.ts" -o -name "market-data-streamer.ts" -o -name "enhanced-error-handler.ts" 2>/dev/null | head -20 && \
echo "" && \
echo "=== Checking if files are in parent directory ===" && \
ls -la ../market-prices/*.ts 2>/dev/null | head -10 && \
echo "" && \
echo "=== Checking root of services ===" && \
ls -la ../*.ts 2>/dev/null | head -10 && \
echo "" && \
echo "=== Checking for any .ts files in current directory ===" && \
find . -maxdepth 1 -name "*.ts" -type f 2>/dev/null

