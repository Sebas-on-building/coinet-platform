#!/bin/bash
# Railway deployment script - handles Prisma migrations gracefully
# This script runs before the app starts to ensure database is ready

set -e

echo "=== Coinet Platform Startup ==="
echo "Checking database connection..."

# Try to run prisma migrate deploy (production-safe)
if [ -n "$DATABASE_URL" ]; then
  echo "DATABASE_URL is set, attempting migrations..."
  npx prisma migrate deploy --schema=./prisma/schema.prisma || {
    echo "Migration deploy failed or no pending migrations - continuing..."
  }
  
  # Generate Prisma client
  npx prisma generate --schema=./prisma/schema.prisma || {
    echo "Prisma generate failed - continuing with existing client..."
  }
else
  echo "WARNING: DATABASE_URL not set, skipping migrations"
fi

echo "=== Startup script complete ==="
