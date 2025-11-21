# Multi-stage Dockerfile for Alchemy Whales Service
# Optimized for production deployment
# Note: Railway build context is services/alchemy-whales (Root Directory)

# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files (relative to services/alchemy-whales directory)
COPY package.json package-lock.json* ./
COPY tsconfig.json ./

# Install ALL dependencies (including dev dependencies needed for TypeScript build)
RUN npm ci && \
    npm cache clean --force

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:18-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S whales && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G whales -g whales whales

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy environment example (if exists)
COPY .env.example* ./ || true

# Change ownership
RUN chown -R whales:whales /app

# Switch to non-root user
USER whales

# Expose ports
EXPOSE 3001 9090

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:9090/health/live', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start service
CMD ["node", "dist/index.js"]

# Labels
LABEL maintainer="Coinet <support@coinet.io>"
LABEL description="Alchemy Whales & Transfers Monitoring Service"
LABEL version="1.0.0"

