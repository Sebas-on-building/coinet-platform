#!/bin/bash

# Script to identify and remove duplicate documentation files
# This script finds files with numbered suffixes ( 3.md, 4.md, etc.) and removes duplicates

set -e

PROJECT_ROOT="/Users/sebastian/Desktop/Arbeit/Coinet v1/coinet-platform"
cd "$PROJECT_ROOT"

echo "🔍 Scanning for duplicate files..."

# Find all files with numbered suffixes
DUPLICATES=$(find . -type f \( -name "* [0-9]*.md" -o -name "* [0-9]*.txt" -o -name "* [0-9]*.js" -o -name "* [0-9]*.sh" -o -name "* [0-9]*.yml" -o -name "* [0-9]*.ts" -o -name "* [0-9]*.html" \) | grep -v node_modules | grep -v ".git" | sort)

DUPLICATE_COUNT=$(echo "$DUPLICATES" | grep -v "^$" | wc -l | tr -d ' ')

echo "📊 Found $DUPLICATE_COUNT potential duplicate files"

# Create backup log
LOG_FILE="cleanup-log-$(date +%Y%m%d-%H%M%S).txt"
echo "Cleanup Log - $(date)" > "$LOG_FILE"
echo "=================================" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

DELETED=0
KEPT=0

for dup_file in $DUPLICATES; do
    if [ -f "$dup_file" ]; then
        # Extract base filename (remove the " 3.md" part)
        base_file=$(echo "$dup_file" | sed -E 's/ [0-9]+\.(md|txt|js|sh|yml|ts|html)$/.\1/')
        
        # Check if base file exists
        if [ -f "$base_file" ]; then
            # Compare files
            if diff -q "$base_file" "$dup_file" > /dev/null 2>&1; then
                echo "✅ Identical: $dup_file (same as $base_file)" | tee -a "$LOG_FILE"
                rm "$dup_file"
                DELETED=$((DELETED + 1))
            else
                echo "⚠️  Different: $dup_file (keeping both)" | tee -a "$LOG_FILE"
                KEPT=$((KEPT + 1))
            fi
        else
            # Base file doesn't exist, check if this is a standalone numbered file
            echo "⚠️  Orphaned: $dup_file (no base file found, keeping)" | tee -a "$LOG_FILE"
            KEPT=$((KEPT + 1))
        fi
    fi
done

echo "" >> "$LOG_FILE"
echo "=================================" >> "$LOG_FILE"
echo "Summary:" >> "$LOG_FILE"
echo "Deleted: $DELETED files" >> "$LOG_FILE"
echo "Kept: $KEPT files" >> "$LOG_FILE"

echo ""
echo "✅ Cleanup complete!"
echo "📝 Log saved to: $LOG_FILE"
echo "🗑️  Deleted: $DELETED duplicate files"
echo "📦 Kept: $KEPT files (different or orphaned)"

