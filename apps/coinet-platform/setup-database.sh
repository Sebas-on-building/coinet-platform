#!/bin/bash
# 🗄️ Coinet Platform - Database Setup Script
# Run this script after adding PostgreSQL database in Railway

set -e

echo "🗄️  Coinet Platform Database Setup"
echo "=================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set"
  echo ""
  echo "Please ensure:"
  echo "1. PostgreSQL database is added in Railway"
  echo "2. DATABASE_URL variable is shared with coinet-platform service"
  echo ""
  exit 1
fi

echo "✅ DATABASE_URL is configured"
echo ""

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate --schema=./prisma/schema.prisma
echo "✅ Prisma Client generated"
echo ""

# Run migrations
echo "🚀 Running database migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma
echo "✅ Migrations completed"
echo ""

# Verify connection
echo "🔍 Verifying database connection..."
npx prisma db execute --stdin --schema=./prisma/schema.prisma <<< "SELECT 1;" > /dev/null
echo "✅ Database connection verified"
echo ""

echo "🎉 Database setup complete!"
echo ""
echo "Next steps:"
echo "- Check /api/health endpoint to verify database health"
echo "- Check /api/status endpoint for database statistics"
echo ""

