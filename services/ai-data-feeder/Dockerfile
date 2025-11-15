# AI Data Feeder Service - Docker Configuration
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

# Copy source code
COPY . .

# Build TypeScript
RUN pnpm build

# Create logs directory
RUN mkdir -p logs

# Expose health check endpoint (optional)
EXPOSE 8080

# Run the service
CMD ["node", "dist/index.js"]

