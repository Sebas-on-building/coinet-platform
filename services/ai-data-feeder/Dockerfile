# AI Data Feeder Service - Docker Configuration
FROM node:20-alpine

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json ./
COPY tsconfig.json ./

# Install dependencies (pnpm will create lockfile if needed)
RUN pnpm install --frozen-lockfile=false

# Copy source code
COPY src ./src

# Build TypeScript
RUN pnpm build

# Create logs directory
RUN mkdir -p logs

# Run the service
CMD ["node", "dist/index.js"]

