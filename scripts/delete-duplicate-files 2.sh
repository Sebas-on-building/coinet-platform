#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# OMNISCORE PRODUCTION READINESS — PHASE 2: DELETE DUPLICATE FILES
# ═══════════════════════════════════════════════════════════════════════════════
#
# This script safely removes all duplicate files matching patterns like "* 2.ts"
# 
# Usage:
#   ./scripts/delete-duplicate-files.sh --dry-run   # Preview what would be deleted
#   ./scripts/delete-duplicate-files.sh --execute   # Actually delete files
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  OmniScore Production Readiness — Delete Duplicate Files${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo ""

# Check for mode argument
MODE="${1:-}"

if [[ "$MODE" != "--dry-run" && "$MODE" != "--execute" ]]; then
    echo -e "${YELLOW}Usage:${NC}"
    echo "  $0 --dry-run   # Preview what would be deleted"
    echo "  $0 --execute   # Actually delete files"
    echo ""
    exit 1
fi

# Find all duplicate files and save to temp file
TMPFILE=$(mktemp)
trap "rm -f $TMPFILE" EXIT

echo -e "${BLUE}Scanning for duplicate files...${NC}"
echo ""

# Find duplicates (files with space + number before extension)
find "$ROOT_DIR" -type f \( \
    -name "* 2.ts" -o \
    -name "* 3.ts" -o \
    -name "* 4.ts" -o \
    -name "* 5.ts" -o \
    -name "* 2.md" -o \
    -name "* 3.md" -o \
    -name "* 2.yaml" -o \
    -name "* 3.yaml" -o \
    -name "* 2.txt" -o \
    -name "* 3.txt" -o \
    -name "* 2.sh" -o \
    -name "* 3.sh" -o \
    -name "* 2.json" -o \
    -name "* 3.json" -o \
    -name "* 2.py" -o \
    -name "* 3.py" \
\) 2>/dev/null | grep -v node_modules | grep -v .git | sort > "$TMPFILE"

TOTAL_FILES=$(wc -l < "$TMPFILE" | tr -d ' ')

if [[ $TOTAL_FILES -eq 0 ]]; then
    echo -e "${GREEN}✅ No duplicate files found!${NC}"
    exit 0
fi

echo -e "${YELLOW}Found $TOTAL_FILES duplicate files:${NC}"
echo ""

# Show all files (grouped would be nice but keeping it simple for bash 3 compat)
echo "Files to delete:"
head -30 "$TMPFILE" | while read -r file; do
    relative="${file#$ROOT_DIR/}"
    echo "  - $relative"
done

if [[ $TOTAL_FILES -gt 30 ]]; then
    remaining=$((TOTAL_FILES - 30))
    echo "  ... and $remaining more files"
fi
echo ""

# Show count by extension
echo "Count by type:"
echo "  .ts files:   $(grep -c '\.ts$' "$TMPFILE" 2>/dev/null || echo 0)"
echo "  .md files:   $(grep -c '\.md$' "$TMPFILE" 2>/dev/null || echo 0)"
echo "  .yaml files: $(grep -c '\.yaml$' "$TMPFILE" 2>/dev/null || echo 0)"
echo "  .txt files:  $(grep -c '\.txt$' "$TMPFILE" 2>/dev/null || echo 0)"
echo "  .py files:   $(grep -c '\.py$' "$TMPFILE" 2>/dev/null || echo 0)"
echo "  other:       $(grep -cvE '\.(ts|md|yaml|txt|py)$' "$TMPFILE" 2>/dev/null || echo 0)"
echo ""

if [[ "$MODE" == "--dry-run" ]]; then
    echo -e "${YELLOW}DRY RUN: No files were deleted.${NC}"
    echo "Run with --execute to delete these $TOTAL_FILES files."
    exit 0
fi

# Confirm before deletion
echo -e "${RED}⚠️  WARNING: This will permanently delete $TOTAL_FILES files!${NC}"
echo ""
read -p "Type 'DELETE' to confirm: " confirmation

if [[ "$confirmation" != "DELETE" ]]; then
    echo -e "${YELLOW}Aborted.${NC}"
    exit 1
fi

# Delete files
echo ""
echo -e "${BLUE}Deleting files...${NC}"

DELETED=0
FAILED=0

while IFS= read -r file; do
    if rm "$file" 2>/dev/null; then
        ((DELETED++)) || true
        relative="${file#$ROOT_DIR/}"
        echo -e "  ${GREEN}✓${NC} $relative"
    else
        ((FAILED++)) || true
        relative="${file#$ROOT_DIR/}"
        echo -e "  ${RED}✗${NC} $relative"
    fi
done < "$TMPFILE"

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Summary${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "  Deleted: $DELETED files"
echo "  Failed:  $FAILED files"
echo ""

if [[ $FAILED -eq 0 ]]; then
    echo -e "${GREEN}✅ All duplicate files successfully deleted!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run 'pnpm build' to verify no broken imports"
    echo "  2. Run 'pnpm test' to verify tests pass"
    echo "  3. Commit with: git commit -m 'chore: remove $DELETED duplicate files'"
else
    echo -e "${RED}❌ Some files could not be deleted. Check permissions.${NC}"
    exit 1
fi
