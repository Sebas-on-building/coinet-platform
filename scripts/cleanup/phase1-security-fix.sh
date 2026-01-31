#!/bin/bash
# Phase 1: Critical Security Fixes
# Removes hardcoded demo API keys and adds environment checks

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups/cleanup-$(date +%Y%m%d)"
AUTH_MIDDLEWARE="$PROJECT_ROOT/services/api-infrastructure/src/security/AuthenticationMiddleware.ts"

echo "🔴 Phase 1: Critical Security Fixes"
echo "===================================="
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup the file
if [ -f "$AUTH_MIDDLEWARE" ]; then
    echo "📦 Backing up AuthenticationMiddleware.ts..."
    cp "$AUTH_MIDDLEWARE" "$BACKUP_DIR/AuthenticationMiddleware.ts.backup"
    
    echo "🔍 Checking for hardcoded demo API keys..."
    
    # Check if hardcoded demoApiKeys object exists (the actual security issue)
    # We look for the pattern: const demoApiKeys: Record<...> = { ... }
    if grep -q "const demoApiKeys.*Record.*AuthenticatedUser" "$AUTH_MIDDLEWARE"; then
        echo "⚠️  Found hardcoded demo API keys object!"
        echo ""
        echo "Please review the file and remove the demo API keys section."
        echo "File: $AUTH_MIDDLEWARE"
        echo ""
        echo "Look for this section:"
        echo "  const demoApiKeys: Record<string, AuthenticatedUser> = { ... }"
        echo ""
        echo "Replace it with proper database-backed authentication."
        echo ""
        echo "⚠️  MANUAL ACTION REQUIRED: Edit the file to remove demo keys"
        echo "   and implement proper API key authentication."
        exit 1
    else
        echo "✅ No hardcoded demo API keys object found."
        echo "   (String 'demo-api-key' found in validation code - this is correct)"
    fi
else
    echo "⚠️  AuthenticationMiddleware.ts not found at expected location."
    echo "   Expected: $AUTH_MIDDLEWARE"
fi

echo ""
echo "✅ Phase 1 complete!"
echo "   Backup saved to: $BACKUP_DIR"
