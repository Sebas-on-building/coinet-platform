# AI Data Feeder Service - Docker Configuration
# Works when Railway Root Directory = services/ai-data-feeder
FROM node:20-alpine

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json ./
COPY tsconfig.json ./

# Install dependencies
# Note: @coinet/market-prices is a workspace dependency
# We'll handle it by installing from the workspace or as a regular package
RUN pnpm install --no-frozen-lockfile || npm install

# Copy source code
COPY src ./src

# Build TypeScript
RUN pnpm build || npx tsc

# Create logs directory
RUN mkdir -p logs

# Expose health check endpoint (optional)
EXPOSE 8080

# Run the service
CMD ["node", "dist/index.js"]
