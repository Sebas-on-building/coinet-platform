#!/bin/bash
# Run All Cleanup Phases
# Executes all cleanup phases sequentially

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🧹 Coinet Platform Cleanup - All Phases"
echo "======================================="
echo ""
echo "This script will execute all cleanup phases:"
echo "  1. Critical Security Fixes"
echo "  2. Remove Duplicate Files"
echo "  3. Reorganize Demo & Example Files"
echo "  4. Move Test Files"
echo "  5. Archive Documentation"
echo "  6. Update .gitignore"
echo ""
echo "⚠️  All files will be backed up before modification."
echo ""

read -p "Continue? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Starting cleanup process..."
echo ""

# Run each phase
"$SCRIPT_DIR/phase1-security-fix.sh" || {
    echo "❌ Phase 1 failed. Please fix security issues before continuing."
    exit 1
}

"$SCRIPT_DIR/phase2-remove-duplicates.sh"
"$SCRIPT_DIR/phase3-reorganize-demos.sh"
"$SCRIPT_DIR/phase4-move-tests.sh"
"$SCRIPT_DIR/phase5-archive-docs.sh"
"$SCRIPT_DIR/phase6-update-gitignore.sh"

echo ""
echo "🎉 All cleanup phases completed!"
echo ""
echo "📋 Next steps:"
echo "  1. Review git status: git status"
echo "  2. Review changes: git diff"
echo "  3. Fix any broken imports/references"
echo "  4. Test the application"
echo "  5. Commit changes: git add . && git commit -m 'chore: cleanup demo files and duplicates'"
echo ""
echo "💾 Backups are stored in: backups/cleanup-$(date +%Y%m%d)/"
