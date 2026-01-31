#!/bin/bash
# Phase 4: Move Test Files
# Moves test files from root to tests/ directory

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups/cleanup-$(date +%Y%m%d)"
TESTS_DIR="$PROJECT_ROOT/tests"

echo "🟠 Phase 4: Move Test Files"
echo "============================"
echo ""

# Create tests directory structure
mkdir -p "$TESTS_DIR/python"
mkdir -p "$TESTS_DIR/config"
mkdir -p "$BACKUP_DIR"

# Function to move file with backup
move_with_backup() {
    local source="$1"
    local dest="$2"
    local backup_path="$BACKUP_DIR/$(echo "$source" | sed 's|^/||' | sed 's|/|_|g')"
    
    if [ -f "$PROJECT_ROOT/$source" ]; then
        echo "  📦 Backing up: $source"
        mkdir -p "$(dirname "$backup_path")"
        cp "$PROJECT_ROOT/$source" "$backup_path"
        
        echo "  📁 Moving: $source -> $dest"
        mkdir -p "$(dirname "$PROJECT_ROOT/$dest")"
        mv "$PROJECT_ROOT/$source" "$PROJECT_ROOT/$dest"
        return 0
    else
        return 1
    fi
}

# Test files to move (keep only latest versions, remove numbered duplicates)
TEST_FILES=(
    "test_psychology_local.py:tests/python/test_psychology_local.py"
    "test_psychology_beast.py:tests/python/test_psychology_beast.py"
    "test_oracle_system.py:tests/python/test_oracle_system.py"
    "simple_psychology_test.py:tests/python/simple_psychology_test.py"
    "test-config.js:tests/config/test-config.js"
    "test-config2.js:tests/config/test-config2.js"
)

echo "📋 Moving test files..."
moved_tests=0
for entry in "${TEST_FILES[@]}"; do
    IFS=':' read -r source dest <<< "$entry"
    if move_with_backup "$source" "$dest"; then
        ((moved_tests++))
    fi
done

echo ""
echo "📊 Summary:"
echo "   ✅ Moved test files: $moved_tests"
echo "   💾 Backup location: $BACKUP_DIR"
echo ""
echo "⚠️  Note: You may need to update import paths in other files"
echo "   that reference these test files."
echo ""
echo "✅ Phase 4 complete!"
