#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# CI GUARDRAIL: Check for duplicate files
# ═══════════════════════════════════════════════════════════════════════════════
#
# This script fails CI if any duplicate files exist.
# Add to .github/workflows/ci.yml to prevent reintroduction of duplicates.
#
# Patterns detected:
#   - "* 2.ts" / "* 3.ts" (macOS Finder duplicates)
#   - Multiple omniscore engine files
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔍 Checking for duplicate files..."

FOUND_ISSUES=0

# ═══════════════════════════════════════════════════════════════════════════════
# CHECK 1: Finder-style duplicates ("* N.ts")
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo "Check 1: Finder-style duplicates (files ending with ' N.ts')..."

FINDER_DUPES=$(find "$ROOT_DIR" -type f \( \
    -name "* 2.ts" -o \
    -name "* 3.ts" -o \
    -name "* 4.ts" -o \
    -name "* 5.ts" -o \
    -name "* 2.md" -o \
    -name "* 3.md" \
\) 2>/dev/null | grep -v node_modules | grep -v .git || true)

if [[ -n "$FINDER_DUPES" ]]; then
    echo -e "${RED}❌ ERROR: Found Finder-style duplicate files!${NC}"
    echo ""
    echo "$FINDER_DUPES" | head -20
    DUPE_COUNT=$(echo "$FINDER_DUPES" | wc -l | tr -d ' ')
    if [[ $DUPE_COUNT -gt 20 ]]; then
        echo "  ... and $((DUPE_COUNT - 20)) more"
    fi
    echo ""
    echo "These files follow the pattern '* N.ts' which indicates accidental duplication."
    echo "Run: ./scripts/delete-duplicate-files.sh --execute"
    FOUND_ISSUES=1
else
    echo -e "${GREEN}  ✓ No Finder-style duplicates found${NC}"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# CHECK 2: Multiple OmniScore engine files
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo "Check 2: Multiple OmniScore engine files..."

OMNISCORE_ENGINES=$(find "$ROOT_DIR/apps/coinet-platform/src/services" -type f \( \
    -name "omniscore-v*.ts" -o \
    -name "project-omniscore*.ts" \
\) 2>/dev/null | grep -v node_modules | grep -v "__tests__" || true)

ENGINE_COUNT=$(echo "$OMNISCORE_ENGINES" | grep -c . || true)

# Allow exactly: omniscore-v2.5.ts, project-omniscore.ts, project-omniscore-v2.ts
ALLOWED_ENGINES=3

if [[ $ENGINE_COUNT -gt $ALLOWED_ENGINES ]]; then
    echo -e "${YELLOW}⚠️  WARNING: Found $ENGINE_COUNT OmniScore engine files (expected ≤$ALLOWED_ENGINES)${NC}"
    echo ""
    echo "$OMNISCORE_ENGINES"
    echo ""
    echo "Consider consolidating to a single canonical engine file."
    # Warning only, not blocking
else
    echo -e "${GREEN}  ✓ OmniScore engine count OK ($ENGINE_COUNT files)${NC}"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# CHECK 3: Verify single entrypoint
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo "Check 3: Verify single entrypoint exists..."

ENTRYPOINT="$ROOT_DIR/apps/coinet-platform/src/services/omniscore/index.ts"

if [[ -f "$ENTRYPOINT" ]]; then
    echo -e "${GREEN}  ✓ Canonical entrypoint exists: omniscore/index.ts${NC}"
else
    echo -e "${RED}❌ ERROR: Missing canonical entrypoint: omniscore/index.ts${NC}"
    FOUND_ISSUES=1
fi

# ═══════════════════════════════════════════════════════════════════════════════
# CHECK 4: Version constants exist
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo "Check 4: Verify version constants file exists..."

VERSION_FILE="$ROOT_DIR/apps/coinet-platform/src/services/omniscore/current/version.ts"

if [[ -f "$VERSION_FILE" ]]; then
    # Check that it exports ENGINE_VERSION
    if grep -q "ENGINE_VERSION" "$VERSION_FILE"; then
        echo -e "${GREEN}  ✓ Version constants file exists with ENGINE_VERSION${NC}"
    else
        echo -e "${RED}❌ ERROR: version.ts missing ENGINE_VERSION export${NC}"
        FOUND_ISSUES=1
    fi
else
    echo -e "${YELLOW}⚠️  WARNING: Version constants file not found: omniscore/current/version.ts${NC}"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"

if [[ $FOUND_ISSUES -eq 0 ]]; then
    echo -e "${GREEN}✅ All duplicate file checks passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Duplicate file checks FAILED${NC}"
    echo ""
    echo "Please fix the issues above before merging."
    exit 1
fi
