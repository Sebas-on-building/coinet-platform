# Commands to run in Codespace to check and create missing files

# First, check what files actually exist:
echo "=== Checking existing files ==="
ls -la src/services/ 2>/dev/null || echo "src/services/ does not exist"
ls -la src/utils/ 2>/dev/null || echo "src/utils/ does not exist"
echo ""

# Check if files exist with different names or locations:
find . -name "unified-market-data.ts" -o -name "market-analytics.ts" -o -name "market-data-streamer.ts" -o -name "enhanced-error-handler.ts" 2>/dev/null
echo ""

# Create directories if they don't exist:
mkdir -p src/services src/utils
echo "✅ Directories created"
echo ""

# List what's actually in the directories:
echo "=== Files in src/services/ ==="
ls -la src/services/ 2>/dev/null || echo "Directory empty or doesn't exist"
echo ""
echo "=== Files in src/utils/ ==="
ls -la src/utils/ 2>/dev/null || echo "Directory empty or doesn't exist"

