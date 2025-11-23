# =============================================================================
# COINET AI - FEEDBACK SERVICE DOCKERFILE
# Feedback and bandit update service for ML optimization
# =============================================================================

# Use lightweight Alpine Node.js image
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S coinet -u 1001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8004

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (production only)
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Remove dev dependencies and source files
RUN rm -rf src tsconfig.json && \
    npm prune --production

# Change ownership to non-root user
RUN chown -R coinet:nodejs /app

# Switch to non-root user
USER coinet

# Expose port
EXPOSE 8004

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8004/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the service
CMD ["npm", "run", "start"] 