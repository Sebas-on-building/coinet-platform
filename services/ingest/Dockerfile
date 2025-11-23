# =============================================================================
# COINET AI - ULTRA-MINIMAL INGEST SERVICE DOCKERFILE
# Runs TypeScript directly for fastest deployment
# =============================================================================

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install essential packages
RUN apk add --no-cache dumb-init

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install && npm cache clean --force

# Copy all source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S coinet -u 1001

# Set environment
ENV NODE_ENV=production
ENV PORT=8001

# Change ownership
RUN chown -R coinet:nodejs /app
USER coinet

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8001/health || exit 1

# Start with tsx (no build step)
ENTRYPOINT ["dumb-init", "--"]
CMD ["npx", "tsx", "src/index.ts"] 