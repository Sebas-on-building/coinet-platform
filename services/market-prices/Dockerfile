# ==============================================================================
# COINET MARKET-PRICES SERVICE - PRODUCTION DOCKERFILE
# ==============================================================================
# 
# Optimized for:
# - Railway deployment
# - Minimal image size
# - Fast cold starts
# - Security best practices
#
# Build: docker build -t market-prices .
# Run:   docker run -p 3000:3000 market-prices

# ==============================================================================
# STAGE 1: Dependencies
# ==============================================================================
FROM node:20-alpine AS deps

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# ==============================================================================
# STAGE 2: Builder
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install all dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# ==============================================================================
# STAGE 3: Production
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Security: Run as non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 coinet

# Copy built files
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Create directories for reports and models
RUN mkdir -p /app/reports /app/models && chown -R coinet:nodejs /app

# Switch to non-root user
USER coinet

# Environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start command
CMD ["node", "dist/index.js"]
