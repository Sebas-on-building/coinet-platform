# =========================================
# MARKET SIGNAL PROCESSOR DOCKERFILE
# =========================================
# Multi-stage Docker build for divine world-class market signal processing service
# Optimized for performance, security, and deployment efficiency

# Build stage
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files for better Docker layer caching
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci --only=production=false --no-audit --prefer-offline

# Copy source code
COPY src/ ./src/
COPY prisma/ ./prisma/ 2>/dev/null || true

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install production dependencies only
RUN apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production --no-audit --prefer-offline && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create necessary directories
RUN mkdir -p /app/logs /app/data && \
    chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Environment variables with sensible defaults
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    LOG_LEVEL=info \
    LOG_STRUCTURED=true \
    RATE_LIMITING_ENABLED=true \
    RATE_LIMIT_DEFAULT_LIMIT=1000 \
    RATE_LIMIT_DEFAULT_WINDOW=60000 \
    ENRICHMENT_ENABLED=true \
    KAFKA_ENABLED=true \
    KAFKA_BROKERS=localhost:29092 \
    KAFKA_TOPIC=market-signals \
    KAFKA_CLIENT_ID=market-signal-processor \
    REDIS_HOST=localhost \
    REDIS_PORT=6379 \
    METRICS_ENABLED=true \
    PROMETHEUS_ENABLED=false

# Expose port
EXPOSE 3000

# Use dumb-init for proper signal handling
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the application
CMD ["npm", "start"]

# Development stage
FROM node:18-alpine AS development

# Install development dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    git \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci --no-audit --prefer-offline

# Copy source code
COPY src/ ./src/
COPY prisma/ ./prisma/ 2>/dev/null || true

# Create necessary directories
RUN mkdir -p /app/logs /app/data

# Expose port
EXPOSE 3000

# Use dumb-init for proper signal handling
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start in development mode
CMD ["npm", "run", "dev"]

# Testing stage
FROM node:18-alpine AS testing

# Install testing dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    git \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY jest.config.js ./
COPY tsconfig*.json ./

# Install all dependencies
RUN npm ci --no-audit --prefer-offline

# Copy source code and tests
COPY src/ ./src/
COPY tests/ ./tests/ 2>/dev/null || true

# Create necessary directories
RUN mkdir -p /app/logs /app/data /app/coverage

# Expose port (if needed for integration tests)
EXPOSE 3000

# Use dumb-init for proper signal handling
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Run tests
CMD ["npm", "test"]
