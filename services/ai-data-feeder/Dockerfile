# AI Data Feeder Service - Docker Configuration
FROM node:20-alpine

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json ./
COPY tsconfig.json ./

# Install dependencies (without lock file - standalone)
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY src ./src

# Build TypeScript
RUN pnpm build

# Create logs directory
RUN mkdir -p logs

# Expose health check endpoint (optional)
EXPOSE 8080

# Run the service
CMD ["node", "dist/index.js"]
