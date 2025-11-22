#!/bin/bash
set -e

# Change to service directory if building from monorepo root
if [ -d apps/coinet-platform ]; then
  cd apps/coinet-platform
fi

# Verify we're in the right directory
if [ ! -f package.json ]; then
  echo "ERROR: package.json not found. Current directory: $(pwd)"
  ls -la
  exit 1
fi

if [ ! -f prisma/schema.prisma ]; then
  echo "ERROR: prisma/schema.prisma not found. Current directory: $(pwd)"
  ls -la prisma/ 2>/dev/null || echo "prisma directory does not exist"
  exit 1
fi

echo "Building from directory: $(pwd)"
echo "Found package.json: $(pwd)/package.json"
echo "Found Prisma schema: $(pwd)/prisma/schema.prisma"

# Install dependencies
npm install

# Generate Prisma client (with dummy DATABASE_URL if not set)
if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
fi

npx prisma generate || {
  echo "WARNING: Prisma generate failed, but continuing..."
}

# Build TypeScript
npm run build

echo "Build completed successfully!"

