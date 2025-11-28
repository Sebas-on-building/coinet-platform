# =========================================
# COINET MARKET PRICES SERVICE - DOCKERFILE
# =========================================
# Production-ready Docker image for Railway deployment
# Production-ready containerization

FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (including dev dependencies for build)
RUN npm install --legacy-peer-deps

# Copy source code
COPY src/ ./src/
COPY migrations/ ./migrations/

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --legacy-peer-deps --only=production && npm cache clean --force

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/migrations ./migrations

# Create logs directory and non-root user
RUN mkdir -p /app/logs && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/index.js"]
