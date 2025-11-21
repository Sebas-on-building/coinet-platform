# =============================================================================
# COINET AI - MOBILE CLIENT DOCKERFILE
# React Native mobile application development environment
# =============================================================================

# Use lightweight Alpine Node.js image
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install system dependencies for React Native
RUN apk update && apk upgrade && \
    apk add --no-cache \
        bash \
        curl \
        git \
        openssh \
        python3 \
        make \
        g++ \
        watchman \
        openjdk11-jre \
        android-tools && \
    rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S reactnative -u 1001

# Set environment variables
ENV NODE_ENV=development
ENV REACT_NATIVE_PACKAGER_HOSTNAME=0.0.0.0
ENV PORT=8081

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci && npm cache clean --force

# Install React Native CLI globally
RUN npm install -g @react-native-community/cli

# Copy source code
COPY . .

# Change ownership to non-root user
RUN chown -R reactnative:nodejs /app

# Switch to non-root user
USER reactnative

# Expose React Native metro bundler port
EXPOSE 8081

# Health check for metro bundler
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8081/status || exit 1

# Start React Native metro bundler
CMD ["npm", "start"] 