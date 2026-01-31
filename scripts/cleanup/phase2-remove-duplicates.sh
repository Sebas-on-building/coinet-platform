#!/bin/bash
# Phase 2: Remove Duplicate Files
# Removes numbered duplicates (deploy 3/4/5, Dockerfile 3/4/5, etc.)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups/cleanup-$(date +%Y%m%d)"

echo "🟡 Phase 2: Remove Duplicate Files"
echo "==================================="
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Function to safely remove duplicate files
remove_duplicate() {
    local file="$1"
    local backup_path="$BACKUP_DIR/$(dirname "$file" | sed 's|^/||' | sed 's|/|_|g')_$(basename "$file")"
    
    if [ -f "$PROJECT_ROOT/$file" ]; then
        echo "  📦 Backing up: $file"
        mkdir -p "$(dirname "$backup_path")"
        cp "$PROJECT_ROOT/$file" "$backup_path"
        
        echo "  🗑️  Removing: $file"
        rm "$PROJECT_ROOT/$file"
        return 0
    else
        return 1
    fi
}

# List of duplicate files to remove
DUPLICATES=(
    "deploy 3"
    "deploy 4"
    "deploy 5"
    "Dockerfile 3"
    "Dockerfile 4"
    "Dockerfile 5"
    "railway.dockerfile 3.fixed"
    "railway.dockerfile 4.fixed"
    "railway.dockerfile 5.fixed"
    "railway.dockerfile.fixed"
    "railway 3.dockerfile"
    "railway 4.dockerfile"
    "railway 5.dockerfile"
    "env 3.example"
    "env 4.example"
    "env 5.example"
    "LICENSE 3"
    "LICENSE 4"
    "LICENSE 5"
    "junit 3.xml"
    "junit 4.xml"
    "junit 5.xml"
    "First pic web 3.png"
    "First pic web 4.png"
    "First pic web 5.png"
    "test_psychology_local 4.py"
    "test_psychology_local 5.py"
    "test_psychology_beast 4.py"
    "test_psychology_beast 5.py"
    "test_oracle_system 4.py"
    "test_oracle_system 5.py"
    "simple_psychology_test 4.py"
    "simple_psychology_test 5.py"
)

echo "📋 Found ${#DUPLICATES[@]} duplicate files to remove"
echo ""

removed_count=0
not_found_count=0

for file in "${DUPLICATES[@]}"; do
    if remove_duplicate "$file"; then
        ((removed_count++))
    else
        ((not_found_count++))
    fi
done

echo ""
echo "📊 Summary:"
echo "   ✅ Removed: $removed_count files"
echo "   ⚠️  Not found: $not_found_count files"
echo "   💾 Backup location: $BACKUP_DIR"
echo ""
echo "✅ Phase 2 complete!"
