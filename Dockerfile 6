# syntax=docker/dockerfile:1.4
FROM --platform=$BUILDPLATFORM node:20-alpine AS base
LABEL org.opencontainers.image.source="https://github.com/coinet/coinet"
LABEL org.opencontainers.image.maintainer="dev@coinet.com"
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .

# Build stage
FROM base AS build
RUN npm run build

# Production stage (backend API)
FROM node:20-alpine AS api
LABEL org.opencontainers.image.source="https://github.com/coinet/coinet"
LABEL org.opencontainers.image.maintainer="dev@coinet.com"
WORKDIR /app
RUN addgroup -S coinet && adduser -S coinet -G coinet
COPY --from=build /app .
USER coinet
ENV NODE_ENV=production
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1
CMD ["node", "dist/index.js"]

# Production stage (frontend SSR)
FROM node:20-alpine AS frontend
LABEL org.opencontainers.image.source="https://github.com/coinet/coinet"
LABEL org.opencontainers.image.maintainer="dev@coinet.com"
WORKDIR /app
RUN addgroup -S coinet && adduser -S coinet -G coinet
COPY --from=build /app .
USER coinet
ENV NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1
CMD ["npm", "run", "start:web"]

# Tag images in CI/CD pipeline as needed 