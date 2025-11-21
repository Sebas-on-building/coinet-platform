# ============================================================================
# Coinet User Service - Production Dockerfile
# Industry-leading user management service
# ============================================================================

# Build stage
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ curl

# Set working directory
WORKDIR /app

# Copy package files
COPY services/user/package*.json ./
COPY services/user/tsconfig.json ./
COPY services/user/prisma ./prisma

# Install dependencies
RUN npm ci --only=production --silent

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY services/user/src ./src

# Build TypeScript
RUN npm run build

# ============================================================================
# Production stage
FROM node:20-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    dumb-init \
    && addgroup -g 1001 -S nodejs \
    && adduser -S coinet -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=coinet:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=coinet:nodejs /app/dist ./dist
COPY --from=builder --chown=coinet:nodejs /app/prisma ./prisma
COPY --from=builder --chown=coinet:nodejs /app/package.json ./

# Create logs directory
RUN mkdir -p logs && chown coinet:nodejs logs

# Switch to non-root user
USER coinet

# Expose port
EXPOSE 8005

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8005/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]