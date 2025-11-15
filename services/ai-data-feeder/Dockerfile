# AI Data Feeder Service - Docker Configuration
# This Dockerfile works when Railway root directory is set to services/ai-data-feeder
FROM node:20-alpine

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy workspace configuration from parent directories
COPY ../../pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY ../../pnpm-lock.yaml* ./pnpm-lock.yaml 2>/dev/null || echo "No lock file"

# Copy market-prices service (workspace dependency) from sibling directory
COPY ../market-prices ./services/market-prices

# Copy this service's files
COPY package.json ./
COPY tsconfig.json ./
COPY src ./src

# Install dependencies (pnpm handles workspace)
# We need to be in a directory that has pnpm-workspace.yaml
WORKDIR /app
RUN pnpm install --no-frozen-lockfile || (cd .. && pnpm install --no-frozen-lockfile)

# Build market-prices first (dependency)
RUN cd services/market-prices && pnpm build || echo "Market prices build skipped"

# Build this service
RUN pnpm build

# Create logs directory
RUN mkdir -p logs

# Expose health check endpoint (optional)
EXPOSE 8080

# Run the service
CMD ["node", "dist/index.js"]
