#!/bin/bash

# 🐳 Coinet AI Docker Registry Management Script
# Comprehensive script for building, pushing, pulling, and managing Docker images

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default configuration
REGISTRY="${REGISTRY:-ghcr.io}"
NAMESPACE="${GITHUB_REPOSITORY_OWNER:-coinet-ai}"
DEFAULT_TAG="${DEFAULT_TAG:-latest}"
PLATFORMS="${PLATFORMS:-linux/amd64,linux/arm64}"

# Services and apps to build
SERVICES=(
    "ingest"
    "context" 
    "inference"
    "feedback"
)

APPS=(
    "web-client"
    "mobile-client"
)

AI_SERVICES=(
    "ml-service"
)

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  INFO:${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅ SUCCESS:${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠️  WARNING:${NC} $1"
}

log_error() {
    echo -e "${RED}❌ ERROR:${NC} $1"
}

log_step() {
    echo -e "${PURPLE}🔄 STEP:${NC} $1"
}

print_header() {
    echo -e "${CYAN}"
    echo "========================================"
    echo "  🐳 Coinet AI Registry Management"
    echo "========================================"
    echo -e "${NC}"
}

print_usage() {
    cat << EOF
Usage: $0 [COMMAND] [OPTIONS]

COMMANDS:
  build           Build all Docker images locally
  push            Build and push all images to registry
  pull            Pull all images from registry
  list            List all available image tags
  clean           Clean up local Docker images
  login           Login to container registry
  logout          Logout from container registry
  status          Show registry and authentication status
  help            Show this help message

OPTIONS:
  -t, --tag TAG           Image tag (default: latest)
  -r, --registry REG      Container registry (default: ghcr.io)
  -n, --namespace NS      Registry namespace (default: coinet-ai)
  -s, --service SERVICE   Build specific service only
  -f, --force             Force rebuild without cache
  -v, --verbose           Verbose output
  --parallel              Build images in parallel
  --no-cache              Build without Docker cache
  --platforms PLATFORMS   Target platforms (default: linux/amd64,linux/arm64)

EXAMPLES:
  $0 build                           # Build all images locally
  $0 build -t v1.0.0                # Build with specific tag
  $0 push -t main-abc1234           # Push with commit-based tag
  $0 build -s ingest                # Build only ingest service
  $0 clean                          # Clean up local images
  $0 status                         # Check registry status

ENVIRONMENT VARIABLES:
  REGISTRY                 Container registry URL
  GITHUB_REPOSITORY_OWNER  GitHub organization/user
  GITHUB_TOKEN            GitHub token for authentication
  DEFAULT_TAG             Default image tag
  PLATFORMS               Build platforms
EOF
}

check_dependencies() {
    local missing=()
    
    command -v docker >/dev/null 2>&1 || missing+=("docker")
    command -v jq >/dev/null 2>&1 || missing+=("jq")
    
    if [ ${#missing[@]} -ne 0 ]; then
        log_error "Missing required dependencies: ${missing[*]}"
        log_info "Please install missing dependencies and try again"
        exit 1
    fi
}

check_docker_buildx() {
    if ! docker buildx version >/dev/null 2>&1; then
        log_error "Docker Buildx is required but not available"
        log_info "Please install Docker Buildx or use a newer version of Docker"
        exit 1
    fi
    
    # Create builder if it doesn't exist
    if ! docker buildx inspect coinet-builder >/dev/null 2>&1; then
        log_step "Creating Docker Buildx builder..."
        docker buildx create --name coinet-builder --use --bootstrap
    else
        docker buildx use coinet-builder
    fi
}

registry_login() {
    log_step "Logging in to container registry..."
    
    if [ -n "${GITHUB_TOKEN:-}" ]; then
        echo "${GITHUB_TOKEN}" | docker login "${REGISTRY}" -u "${GITHUB_ACTOR:-$USER}" --password-stdin
        log_success "Logged in to ${REGISTRY}"
    else
        log_warning "GITHUB_TOKEN not set, attempting interactive login..."
        docker login "${REGISTRY}"
    fi
}

registry_logout() {
    log_step "Logging out from container registry..."
    docker logout "${REGISTRY}"
    log_success "Logged out from ${REGISTRY}"
}

get_image_name() {
    local service="$1"
    echo "${REGISTRY}/${NAMESPACE}/coinet-${service}"
}

build_image() {
    local service="$1"
    local tag="${2:-$DEFAULT_TAG}"
    local dockerfile_path="$3"
    local context_path="${4:-.}"
    local force_rebuild="${5:-false}"
    
    local image_name
    image_name=$(get_image_name "$service")
    local full_tag="${image_name}:${tag}"
    
    log_step "Building ${service} service..."
    log_info "Image: ${full_tag}"
    log_info "Dockerfile: ${dockerfile_path}"
    log_info "Context: ${context_path}"
    
    local build_args=(
        "build"
        "--file" "${dockerfile_path}"
        "--tag" "${full_tag}"
        "--platform" "${PLATFORMS}"
    )
    
    # Add cache options
    if [ "$force_rebuild" = "true" ]; then
        build_args+=("--no-cache")
    else
        build_args+=("--cache-from" "type=local,src=/tmp/.buildx-cache-${service}")
        build_args+=("--cache-to" "type=local,dest=/tmp/.buildx-cache-${service},mode=max")
    fi
    
    # Add build metadata
    build_args+=(
        "--label" "org.opencontainers.image.title=Coinet AI ${service^} Service"
        "--label" "org.opencontainers.image.description=World-class crypto intelligence platform"
        "--label" "org.opencontainers.image.version=${tag}"
        "--label" "org.opencontainers.image.created=$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
        "--label" "org.opencontainers.image.revision=$(git rev-parse HEAD 2>/dev/null || echo 'unknown')"
        "--label" "org.opencontainers.image.vendor=Coinet AI"
    )
    
    build_args+=("${context_path}")
    
    if docker buildx "${build_args[@]}"; then
        log_success "Built ${service} successfully"
        return 0
    else
        log_error "Failed to build ${service}"
        return 1
    fi
}

push_image() {
    local service="$1"
    local tag="${2:-$DEFAULT_TAG}"
    
    local image_name
    image_name=$(get_image_name "$service")
    local full_tag="${image_name}:${tag}"
    
    log_step "Pushing ${full_tag}..."
    
    if docker push "${full_tag}"; then
        log_success "Pushed ${service} successfully"
        return 0
    else
        log_error "Failed to push ${service}"
        return 1
    fi
}

pull_image() {
    local service="$1"
    local tag="${2:-$DEFAULT_TAG}"
    
    local image_name
    image_name=$(get_image_name "$service")
    local full_tag="${image_name}:${tag}"
    
    log_step "Pulling ${full_tag}..."
    
    if docker pull "${full_tag}"; then
        log_success "Pulled ${service} successfully"
        return 0
    else
        log_error "Failed to pull ${service}"
        return 1
    fi
}

build_all_images() {
    local tag="${1:-$DEFAULT_TAG}"
    local force_rebuild="${2:-false}"
    local parallel="${3:-false}"
    
    log_step "Building all Coinet AI images with tag: ${tag}"
    
    check_docker_buildx
    
    local failed_builds=()
    local pids=()
    
    # Build Node.js microservices
    for service in "${SERVICES[@]}"; do
        if [ "$parallel" = "true" ]; then
            (build_image "$service" "$tag" "services/${service}/Dockerfile" "." "$force_rebuild") &
            pids+=($!)
        else
            if ! build_image "$service" "$tag" "services/${service}/Dockerfile" "." "$force_rebuild"; then
                failed_builds+=("$service")
            fi
        fi
    done
    
    # Build frontend applications
    for app in "${APPS[@]}"; do
        if [ "$parallel" = "true" ]; then
            (build_image "$app" "$tag" "apps/${app}/Dockerfile" "." "$force_rebuild") &
            pids+=($!)
        else
            if ! build_image "$app" "$tag" "apps/${app}/Dockerfile" "." "$force_rebuild"; then
                failed_builds+=("$app")
            fi
        fi
    done
    
    # Build AI services
    for ai_service in "${AI_SERVICES[@]}"; do
        if [ "$parallel" = "true" ]; then
            (build_image "$ai_service" "$tag" "ai-services/${ai_service}/Dockerfile" "ai-services/${ai_service}" "$force_rebuild") &
            pids+=($!)
        else
            if ! build_image "$ai_service" "$tag" "ai-services/${ai_service}/Dockerfile" "ai-services/${ai_service}" "$force_rebuild"; then
                failed_builds+=("$ai_service")
            fi
        fi
    done
    
    # Wait for parallel builds
    if [ "$parallel" = "true" ]; then
        log_step "Waiting for parallel builds to complete..."
        for pid in "${pids[@]}"; do
            if ! wait "$pid"; then
                log_error "One or more parallel builds failed"
            fi
        done
    fi
    
    if [ ${#failed_builds[@]} -eq 0 ]; then
        log_success "All images built successfully!"
    else
        log_error "Failed to build: ${failed_builds[*]}"
        return 1
    fi
}

push_all_images() {
    local tag="${1:-$DEFAULT_TAG}"
    
    log_step "Pushing all images with tag: ${tag}"
    
    registry_login
    
    local failed_pushes=()
    
    # Push all services
    for service in "${SERVICES[@]}" "${APPS[@]}" "${AI_SERVICES[@]}"; do
        if ! push_image "$service" "$tag"; then
            failed_pushes+=("$service")
        fi
    done
    
    if [ ${#failed_pushes[@]} -eq 0 ]; then
        log_success "All images pushed successfully!"
    else
        log_error "Failed to push: ${failed_pushes[*]}"
        return 1
    fi
}

pull_all_images() {
    local tag="${1:-$DEFAULT_TAG}"
    
    log_step "Pulling all images with tag: ${tag}"
    
    registry_login
    
    local failed_pulls=()
    
    # Pull all services
    for service in "${SERVICES[@]}" "${APPS[@]}" "${AI_SERVICES[@]}"; do
        if ! pull_image "$service" "$tag"; then
            failed_pulls+=("$service")
        fi
    done
    
    if [ ${#failed_pulls[@]} -eq 0 ]; then
        log_success "All images pulled successfully!"
    else
        log_error "Failed to pull: ${failed_pulls[*]}"
        return 1
    fi
}

list_images() {
    local service="${1:-}"
    
    if [ -n "$service" ]; then
        log_step "Listing tags for ${service}..."
        local image_name
        image_name=$(get_image_name "$service")
        # This would require additional API calls to the registry
        log_info "Image: ${image_name}"
    else
        log_step "Listing all local Coinet AI images..."
        docker images | grep -E "(coinet-|${REGISTRY}/${NAMESPACE})" || log_info "No Coinet AI images found locally"
    fi
}

clean_images() {
    log_step "Cleaning up local Coinet AI images..."
    
    # Remove coinet images
    local images_to_remove
    images_to_remove=$(docker images | grep -E "(coinet-|${REGISTRY}/${NAMESPACE})" | awk '{print $3}' || true)
    
    if [ -n "$images_to_remove" ]; then
        # shellcheck disable=SC2086
        docker rmi $images_to_remove || log_warning "Some images could not be removed (may be in use)"
        log_success "Cleaned up local images"
    else
        log_info "No Coinet AI images found to clean"
    fi
    
    # Clean up build cache
    docker builder prune -f
    log_success "Cleaned up build cache"
}

show_status() {
    log_step "Checking registry status..."
    
    echo "Registry Configuration:"
    echo "  Registry: ${REGISTRY}"
    echo "  Namespace: ${NAMESPACE}"
    echo "  Default Tag: ${DEFAULT_TAG}"
    echo "  Platforms: ${PLATFORMS}"
    echo ""
    
    # Check Docker status
    if docker info >/dev/null 2>&1; then
        log_success "Docker is running"
    else
        log_error "Docker is not running or not accessible"
    fi
    
    # Check registry authentication
    if docker system info 2>/dev/null | grep -q "${REGISTRY}"; then
        log_success "Authenticated with ${REGISTRY}"
    else
        log_warning "Not authenticated with ${REGISTRY}"
    fi
    
    # Show local images
    echo ""
    list_images
}

# Parse command line arguments
COMMAND=""
TAG="$DEFAULT_TAG"
SERVICE=""
FORCE_REBUILD=false
PARALLEL=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        build|push|pull|list|clean|login|logout|status|help)
            COMMAND="$1"
            shift
            ;;
        -t|--tag)
            TAG="$2"
            shift 2
            ;;
        -r|--registry)
            REGISTRY="$2"
            shift 2
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -s|--service)
            SERVICE="$2"
            shift 2
            ;;
        -f|--force)
            FORCE_REBUILD=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            set -x
            shift
            ;;
        --parallel)
            PARALLEL=true
            shift
            ;;
        --no-cache)
            FORCE_REBUILD=true
            shift
            ;;
        --platforms)
            PLATFORMS="$2"
            shift 2
            ;;
        -h|--help)
            print_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            print_usage
            exit 1
            ;;
    esac
done

# Main execution
print_header
check_dependencies

case "$COMMAND" in
    build)
        if [ -n "$SERVICE" ]; then
            # Build specific service
            case "$SERVICE" in
                ingest|context|inference|feedback)
                    build_image "$SERVICE" "$TAG" "services/${SERVICE}/Dockerfile" "." "$FORCE_REBUILD"
                    ;;
                web-client|mobile-client)
                    build_image "$SERVICE" "$TAG" "apps/${SERVICE}/Dockerfile" "." "$FORCE_REBUILD"
                    ;;
                ml-service)
                    build_image "$SERVICE" "$TAG" "ai-services/${SERVICE}/Dockerfile" "ai-services/${SERVICE}" "$FORCE_REBUILD"
                    ;;
                *)
                    log_error "Unknown service: $SERVICE"
                    exit 1
                    ;;
            esac
        else
            build_all_images "$TAG" "$FORCE_REBUILD" "$PARALLEL"
        fi
        ;;
    push)
        if [ -n "$SERVICE" ]; then
            registry_login
            push_image "$SERVICE" "$TAG"
        else
            push_all_images "$TAG"
        fi
        ;;
    pull)
        if [ -n "$SERVICE" ]; then
            registry_login
            pull_image "$SERVICE" "$TAG"
        else
            pull_all_images "$TAG"
        fi
        ;;
    list)
        list_images "$SERVICE"
        ;;
    clean)
        clean_images
        ;;
    login)
        registry_login
        ;;
    logout)
        registry_logout
        ;;
    status)
        show_status
        ;;
    help)
        print_usage
        ;;
    "")
        log_error "No command specified"
        print_usage
        exit 1
        ;;
    *)
        log_error "Unknown command: $COMMAND"
        print_usage
        exit 1
        ;;
esac

log_success "Registry management operation completed!" 