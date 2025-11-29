#!/bin/bash
set -e

# Atomic Docker Utility Script (Apple/Canva/TradingView/Solana fusion)
# Usage: ./scripts/atomic-docker.sh [build|run|stop|logs|prune|compose] [args]

CYAN='\033[1;36m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
RESET='\033[0m'
ICON_DOCKER='🐳'
ICON_OK='✅'
ICON_WARN='⚠️'
ICON_ERROR='❌'

function header() {
  echo -e "${CYAN}${ICON_DOCKER} $1${RESET}"
}

function ok() {
  echo -e "${GREEN}${ICON_OK} $1${RESET}"
}

function warn() {
  echo -e "${YELLOW}${ICON_WARN} $1${RESET}"
}

function error() {
  echo -e "${RED}${ICON_ERROR} $1${RESET}"
  exit 1
}

case $1 in
  build)
    header "Building Docker image..."
    docker build -t coinet-platform .
    ok "Build complete."
    ;;
  run)
    header "Running Docker container..."
    docker run -d --name coinet-platform -p 4000:4000 coinet-platform
    ok "Container started."
    ;;
  stop)
    header "Stopping Docker container..."
    docker stop coinet-platform || warn "Container not running."
    docker rm coinet-platform || warn "Container not found."
    ok "Container stopped and removed."
    ;;
  logs)
    header "Showing Docker logs..."
    docker logs -f coinet-platform
    ;;
  prune)
    header "Pruning unused Docker resources..."
    docker system prune -af
    ok "Prune complete."
    ;;
  compose)
    header "Running Docker Compose..."
    docker-compose up -d
    ok "Docker Compose started."
    ;;
  test)
    header "Testing Docker image..."
    docker run --rm coinet-platform npm test
    ok "Docker image tests complete."
    ;;
  push)
    header "Pushing Docker image to registry..."
    docker push coinet-platform
    ok "Docker image pushed."
    ;;
  rollback)
    header "Rolling back Docker Compose deployment..."
    docker-compose down
    git checkout HEAD~1 docker-compose.yml
    docker-compose up -d
    ok "Rollback complete."
    ;;
  *)
    echo -e "${YELLOW}Usage: $0 [build|run|stop|logs|prune|compose]${RESET}"
    ;;
esac 