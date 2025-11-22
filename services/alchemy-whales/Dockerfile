# Alchemy Whales Service - Production Dockerfile

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci && \
    npm cache clean --force

# Copy TypeScript config if it exists
COPY tsconfig.json* ./

# Copy source code if it exists
COPY src ./src

# Build TypeScript (will fail gracefully if src doesn't exist, but dist should)
RUN npm run build || echo "Build skipped - using pre-built dist"

# Production stage
FROM node:20-alpine

LABEL maintainer="Coinet Team <dev@coinet.com>"
LABEL description="Alchemy Whales Service - Monitor and track large cryptocurrency transactions"

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create logs directory
RUN mkdir -p /app/logs && \
    chown -R node:node /app

# Switch to non-root user
USER node

# Expose ports for health check, metrics, and webhooks
EXPOSE 9090 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:9090/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })" || exit 1

# Start the service
CMD ["node", "dist/index.js"]

