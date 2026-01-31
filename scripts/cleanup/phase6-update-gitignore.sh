#!/bin/bash
# Phase 6: Update .gitignore
# Adds patterns to prevent committing logs, test outputs, and cleanup files

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
GITIGNORE="$PROJECT_ROOT/.gitignore"
BACKUP_DIR="$PROJECT_ROOT/backups/cleanup-$(date +%Y%m%d)"

echo "🔵 Phase 6: Update .gitignore"
echo "============================="
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup .gitignore
if [ -f "$GITIGNORE" ]; then
    echo "📦 Backing up .gitignore..."
    cp "$GITIGNORE" "$BACKUP_DIR/.gitignore.backup"
else
    echo "📝 Creating new .gitignore..."
    touch "$GITIGNORE"
fi

# Patterns to add
PATTERNS=(
    "# Cleanup logs"
    "cleanup-log-*.txt"
    "cleanup-log-*.log"
    ""
    "# Test output files"
    "junit*.xml"
    "test-results/"
    "coverage/"
    ""
    "# Temporary fix files"
    "*_FIX.sh"
    "*_FIX.md"
    "final_fix.sh"
    "fix_commit.sh"
    ""
    "# Duplicate files (numbered)"
    "* [0-9].*"
    "* [0-9][0-9].*"
    ""
    "# Backup directories"
    "backups/cleanup-*/"
    ""
    "# Output logs"
    "*.log"
    "output.log"
    ""
    "# Python cache"
    "__pycache__/"
    "*.pyc"
    "*.pyo"
    ""
    "# Environment files (keep .example)"
    ".env.local"
    ".env.*.local"
)

echo "📝 Adding patterns to .gitignore..."

# Check if cleanup section already exists
if grep -q "# Cleanup logs" "$GITIGNORE"; then
    echo "⚠️  Cleanup section already exists in .gitignore"
    echo "   Skipping to avoid duplicates."
else
    echo "" >> "$GITIGNORE"
    echo "# ========================================" >> "$GITIGNORE"
    echo "# Cleanup Patterns (Added $(date +%Y-%m-%d))" >> "$GITIGNORE"
    echo "# ========================================" >> "$GITIGNORE"
    for pattern in "${PATTERNS[@]}"; do
        echo "$pattern" >> "$GITIGNORE"
    done
    echo "✅ Added cleanup patterns to .gitignore"
fi

echo ""
echo "📊 Summary:"
echo "   ✅ Updated .gitignore"
echo "   💾 Backup location: $BACKUP_DIR"
echo ""
echo "✅ Phase 6 complete!"
