# AI Data Feeder Service - Docker Configuration
# Works when Railway Root Directory = services/ai-data-feeder
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json ./
COPY tsconfig.json ./

# Remove workspace dependency before installing
# The @coinet/market-prices is loaded lazily at runtime, not needed at build time
RUN node -e "const fs=require('fs'); const pkg=JSON.parse(fs.readFileSync('package.json')); delete pkg.dependencies['@coinet/market-prices']; fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));"

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Create logs directory
RUN mkdir -p logs

# Expose health check endpoint
EXPOSE 8080

# Run the service
CMD ["node", "dist/index.js"]
