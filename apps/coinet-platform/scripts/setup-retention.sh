#!/bin/bash

# =============================================================================
# COINET RETENTION SYSTEM SETUP SCRIPT
# =============================================================================
# This script helps set up the retention system after fixing Prisma compatibility
# =============================================================================

set -e

echo "🎯 Coinet Retention System Setup"
echo "════════════════════════════════════════════════════════════════"

# Check Node version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
echo "📦 Node.js version: v${NODE_VERSION}"

if [ "$NODE_VERSION" -gt "21" ]; then
    echo "⚠️  WARNING: Node.js v${NODE_VERSION} may have compatibility issues with Prisma 5.x"
    echo "   Consider using Node.js v20 or upgrading Prisma to v6+"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled"
        exit 1
    fi
fi

# Step 1: Generate Prisma Client
echo ""
echo "Step 1: Generating Prisma Client..."
echo "────────────────────────────────────────────────────────────────"
npm run db:generate || {
    echo "❌ Prisma client generation failed"
    echo "   This is likely due to Node.js/Prisma compatibility"
    echo "   Options:"
    echo "   1. Use Node.js v20: nvm install 20 && nvm use 20"
    echo "   2. Upgrade Prisma: npm install prisma@latest @prisma/client@latest"
    exit 1
}
echo "✅ Prisma client generated successfully"

# Step 2: Run Migration
echo ""
echo "Step 2: Running database migration..."
echo "────────────────────────────────────────────────────────────────"
read -p "Run database migration? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run db:migrate || {
        echo "⚠️  Migration failed, trying manual SQL migration..."
        if [ -n "$DATABASE_URL" ]; then
            echo "Applying SQL migration directly..."
            psql "$DATABASE_URL" < prisma/migrations/RETENTION_SYSTEM_MIGRATION.sql || {
                echo "❌ Manual migration also failed"
                echo "   Please check your DATABASE_URL and database connection"
                exit 1
            }
            echo "✅ Migration applied successfully"
        else
            echo "❌ DATABASE_URL not set"
            echo "   Set DATABASE_URL environment variable and run:"
            echo "   psql \$DATABASE_URL < prisma/migrations/RETENTION_SYSTEM_MIGRATION.sql"
            exit 1
        fi
    }
else
    echo "⏭️  Skipping migration (run manually later)"
fi

# Step 3: Check Environment Variables
echo ""
echo "Step 3: Checking environment variables..."
echo "────────────────────────────────────────────────────────────────"
if [ -z "$CRON_SECRET" ]; then
    echo "⚠️  CRON_SECRET not set"
    echo "   Add to .env: CRON_SECRET=your-secure-secret-key"
else
    echo "✅ CRON_SECRET is set"
fi

if [ -z "$RETENTION_ENABLED" ]; then
    echo "⚠️  RETENTION_ENABLED not set (defaults to disabled)"
    echo "   Add to .env: RETENTION_ENABLED=true"
else
    echo "✅ RETENTION_ENABLED=$RETENTION_ENABLED"
fi

# Step 4: Install node-cron (if needed)
echo ""
echo "Step 4: Checking dependencies..."
echo "────────────────────────────────────────────────────────────────"
if npm list node-cron > /dev/null 2>&1; then
    echo "✅ node-cron is installed"
else
    echo "📦 Installing node-cron..."
    npm install node-cron @types/node-cron
    echo "✅ node-cron installed"
fi

# Step 5: Test API (optional)
echo ""
echo "Step 5: Testing API endpoints (optional)..."
echo "────────────────────────────────────────────────────────────────"
read -p "Run API tests? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -z "$API_URL" ]; then
        export API_URL="http://localhost:3000"
    fi
    if [ -z "$TEST_USER_ID" ]; then
        export TEST_USER_ID="test-user-123"
    fi
    if [ -z "$CRON_SECRET" ]; then
        export CRON_SECRET="test-secret"
    fi
    
    echo "Running tests against $API_URL..."
    npx ts-node scripts/test-retention-api.ts || {
        echo "⚠️  Some tests failed (this is OK if server is not running)"
    }
else
    echo "⏭️  Skipping API tests"
fi

# Summary
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Ensure RETENTION_ENABLED=true in your .env file"
echo "2. Ensure CRON_SECRET is set in your .env file"
echo "3. Start your server: npm run dev"
echo "4. The retention system will initialize automatically"
echo ""
echo "To test manually:"
echo "  curl http://localhost:3000/api/retention/session-start -H 'x-user-id: test-user'"
echo ""
echo "To run scheduled jobs manually:"
echo "  curl -X POST http://localhost:3000/api/retention/scheduled-jobs \\"
echo "    -H 'x-cron-key: YOUR_SECRET' \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"jobType\":\"hourly_maintenance\"}'"
echo "════════════════════════════════════════════════════════════════"
