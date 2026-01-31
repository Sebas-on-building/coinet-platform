#!/bin/bash
# Phase 5: Archive Documentation
# Archives status/completion and temporary fix documentation

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups/cleanup-$(date +%Y%m%d)"
ARCHIVE_DIR="$PROJECT_ROOT/docs/archive"

echo "🟠 Phase 5: Archive Documentation"
echo "=================================="
echo ""

# Create archive directory structure
mkdir -p "$ARCHIVE_DIR/status"
mkdir -p "$ARCHIVE_DIR/fixes"
mkdir -p "$ARCHIVE_DIR/completion"
mkdir -p "$BACKUP_DIR"

# Function to archive file
archive_file() {
    local source="$1"
    local dest="$2"
    local backup_path="$BACKUP_DIR/$(echo "$source" | sed 's|^/||' | sed 's|/|_|g')"
    
    if [ -f "$PROJECT_ROOT/$source" ]; then
        echo "  📦 Backing up: $source"
        mkdir -p "$(dirname "$backup_path")"
        cp "$PROJECT_ROOT/$source" "$backup_path"
        
        echo "  📁 Archiving: $source -> $dest"
        mkdir -p "$(dirname "$PROJECT_ROOT/$dest")"
        mv "$PROJECT_ROOT/$source" "$PROJECT_ROOT/$dest"
        return 0
    else
        return 1
    fi
}

# Status files to archive
STATUS_FILES=(
    "INIT_STATUS.md:docs/archive/status/INIT_STATUS.md"
    "INITIALIZATION_STATUS.md:docs/archive/status/INITIALIZATION_STATUS.md"
    "STACK_STATUS.md:docs/archive/status/STACK_STATUS.md"
    "SERVICES_STATUS.md:docs/archive/status/SERVICES_STATUS.md"
    "PRODUCTION_STATUS.md:docs/archive/status/PRODUCTION_STATUS.md"
    "CI_TESTING_STATUS.md:docs/archive/status/CI_TESTING_STATUS.md"
    "INTEGRATION_STATUS.md:docs/archive/status/INTEGRATION_STATUS.md"
)

# Completion files to archive
COMPLETION_FILES=(
    "✅_CODE_PERFECTION_VERIFIED_✅.md:docs/archive/completion/CODE_PERFECTION_VERIFIED.md"
    "✅_DEPLOYMENT_COMPLETE_✅.md:docs/archive/completion/DEPLOYMENT_COMPLETE.md"
    "DEPLOYMENT_SUCCESS.md:docs/archive/completion/DEPLOYMENT_SUCCESS.md"
    "DEPLOYMENT_READY_SUMMARY.md:docs/archive/completion/DEPLOYMENT_READY_SUMMARY.md"
    "INTEGRATION_COMPLETE_SUMMARY.md:docs/archive/completion/INTEGRATION_COMPLETE_SUMMARY.md"
    "DIVINE_COMPLETION_REPORT.md:docs/archive/completion/DIVINE_COMPLETION_REPORT.md"
    "DIVINE_INTEGRATION_COMPLETE.md:docs/archive/completion/DIVINE_INTEGRATION_COMPLETE.md"
    "DIVINE_PERFECTION_FINAL_SUMMARY.md:docs/archive/completion/DIVINE_PERFECTION_FINAL_SUMMARY.md"
    "ULTIMATE_COMPLETION_SUMMARY.md:docs/archive/completion/ULTIMATE_COMPLETION_SUMMARY.md"
    "V1_COMPLETION_SUMMARY.md:docs/archive/completion/V1_COMPLETION_SUMMARY.md"
    "SESSION_SUMMARY_ACHIEVEMENT.md:docs/archive/completion/SESSION_SUMMARY_ACHIEVEMENT.md"
    "WEEK_2_HYPER_OPTIMIZATION_COMPLETE.md:docs/archive/completion/WEEK_2_HYPER_OPTIMIZATION_COMPLETE.md"
    "PHASE_1_WEEK_1_COMPLETE.md:docs/archive/completion/PHASE_1_WEEK_1_COMPLETE.md"
    "PHASE_1_WEEK_1_FINAL_REPORT.md:docs/archive/completion/PHASE_1_WEEK_1_FINAL_REPORT.md"
    "PHASE_1_WEEK_1_MASTER_SUMMARY.md:docs/archive/completion/PHASE_1_WEEK_1_MASTER_SUMMARY.md"
    "HELM-CI-COMPLETE.md:docs/archive/completion/HELM-CI-COMPLETE.md"
    "KAFKA-ANALYTICS-COMPLETE.md:docs/archive/completion/KAFKA-ANALYTICS-COMPLETE.md"
    "MONITORING-STACK-COMPLETE.md:docs/archive/completion/MONITORING-STACK-COMPLETE.md"
    "SECURITY-STACK-COMPLETE.md:docs/archive/completion/SECURITY-STACK-COMPLETE.md"
    "SECURITY_COMPLIANCE_COMPLETE.md:docs/archive/completion/SECURITY_COMPLIANCE_COMPLETE.md"
    "PRISMA-UNIFICATION-COMPLETE.md:docs/archive/completion/PRISMA-UNIFICATION-COMPLETE.md"
    "DB-BACKED-USER-SERVICE-COMPLETE.md:docs/archive/completion/DB-BACKED-USER-SERVICE-COMPLETE.md"
    "DEXSCREENER_COMPLETION_SUMMARY.md:docs/archive/completion/DEXSCREENER_COMPLETION_SUMMARY.md"
    "SWAGGER-E2E-COMPLETE.md:docs/archive/completion/SWAGGER-E2E-COMPLETE.md"
    "CODESPACE_DEPLOYMENT_SUCCESS.md:docs/archive/completion/CODESPACE_DEPLOYMENT_SUCCESS.md"
    "BUILD_SUCCESS.md:docs/archive/completion/BUILD_SUCCESS.md"
    "ALERT_NOTIFICATION_SUCCESS.md:docs/archive/completion/ALERT_NOTIFICATION_SUCCESS.md"
    "SETUP_COMPLETE.md:docs/archive/completion/SETUP_COMPLETE.md"
)

# Fix files to archive
FIX_FILES=(
    "EMERGENCY_FIX.md:docs/archive/fixes/EMERGENCY_FIX.md"
    "FINAL_FIX.md:docs/archive/fixes/FINAL_FIX.md"
    "QUICK_FIX.md:docs/archive/fixes/QUICK_FIX.md"
    "FIX_AI_DATA_FEEDER_BUILDER.md:docs/archive/fixes/FIX_AI_DATA_FEEDER_BUILDER.md"
    "FIX_BOTH_SERVICES.md:docs/archive/fixes/FIX_BOTH_SERVICES.md"
    "FIX_BRANCH_ISSUE.md:docs/archive/fixes/FIX_BRANCH_ISSUE.md"
    "FIX_BUILD_ERROR.md:docs/archive/fixes/FIX_BUILD_ERROR.md"
    "FIX_BUILD.md:docs/archive/fixes/FIX_BUILD.md"
    "FIX_GITHUB_ACTIONS_FINAL.md:docs/archive/fixes/FIX_GITHUB_ACTIONS_FINAL.md"
    "FIX_PUSH_ERROR.md:docs/archive/fixes/FIX_PUSH_ERROR.md"
    "RAILWAY_FIX.md:docs/archive/fixes/RAILWAY_FIX.md"
    "RAILWAY_FIX_SUMMARY.md:docs/archive/fixes/RAILWAY_FIX_SUMMARY.md"
    "CODESPACE_FIX.md:docs/archive/fixes/CODESPACE_FIX.md"
    "CI-FIXES-COMPLETE.md:docs/archive/fixes/CI-FIXES-COMPLETE.md"
    "SWAGGER_DOCS_FIX.md:docs/archive/fixes/SWAGGER_DOCS_FIX.md"
)

echo "📋 Archiving status files..."
archived_status=0
for entry in "${STATUS_FILES[@]}"; do
    IFS=':' read -r source dest <<< "$entry"
    if archive_file "$source" "$dest"; then
        ((archived_status++))
    fi
done

echo ""
echo "📋 Archiving completion files..."
archived_completion=0
for entry in "${COMPLETION_FILES[@]}"; do
    IFS=':' read -r source dest <<< "$entry"
    if archive_file "$source" "$dest"; then
        ((archived_completion++))
    fi
done

echo ""
echo "📋 Archiving fix files..."
archived_fixes=0
for entry in "${FIX_FILES[@]}"; do
    IFS=':' read -r source dest <<< "$entry"
    if archive_file "$source" "$dest"; then
        ((archived_fixes++))
    fi
done

# Create archive README
cat > "$ARCHIVE_DIR/README.md" << 'EOF'
# Documentation Archive

This directory contains archived documentation files that are no longer actively maintained but kept for historical reference.

## Structure

- `status/` - Status reports and snapshots
- `completion/` - Completion reports and summaries
- `fixes/` - Temporary fix documentation

## Note

These files are archived for reference only. They may contain outdated information.
EOF

echo ""
echo "📊 Summary:"
echo "   ✅ Archived status files: $archived_status"
echo "   ✅ Archived completion files: $archived_completion"
echo "   ✅ Archived fix files: $archived_fixes"
echo "   💾 Backup location: $BACKUP_DIR"
echo ""
echo "✅ Phase 5 complete!"
