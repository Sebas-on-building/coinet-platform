# Multi-stage Dockerfile for Alchemy Whales Service
# Optimized for production deployment with pnpm

# Stage 1: Build
FROM node:18-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace files for pnpm
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml* ./

# Copy service package files
COPY services/alchemy-whales/package.json ./services/alchemy-whales/
COPY services/alchemy-whales/tsconfig.json ./services/alchemy-whales/

# Install dependencies using pnpm
WORKDIR /app/services/alchemy-whales
RUN pnpm install --frozen-lockfile

# Copy source code
COPY services/alchemy-whales/src ./src

# Build TypeScript
RUN pnpm run build

# Stage 2: Production
FROM node:18-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Install pnpm
RUN npm install -g pnpm

# Create non-root user
RUN addgroup -g 1001 -S whales && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G whales -g whales whales

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml* ./

# Copy service package files
COPY services/alchemy-whales/package.json ./services/alchemy-whales/

# Install production dependencies only
WORKDIR /app/services/alchemy-whales
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder
COPY --from=builder /app/services/alchemy-whales/dist ./dist

# Copy environment example (if exists)
COPY services/alchemy-whales/.env.example* ./ || true

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
WORKDIR /app/services/alchemy-whales
CMD ["node", "dist/index.js"]

# Labels
LABEL maintainer="Coinet <support@coinet.io>"
LABEL description="Alchemy Whales & Transfers Monitoring Service"
LABEL version="1.0.0"

