#!/bin/bash

# =============================================================================
# COINET AI - DOCKER IMAGES BUILD SCRIPT
# Builds all containerized services for the platform
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
REGISTRY="coinet-ai"
VERSION="${VERSION:-latest}"
BUILD_ARGS="--no-cache"
PARALLEL_BUILDS=4

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to build Docker image
build_image() {
    local service_name="$1"
    local context_path="$2"
    local dockerfile_path="$3"
    local image_tag="${REGISTRY}/${service_name}:${VERSION}"
    
    log "Building ${service_name} image..."
    
    if docker build ${BUILD_ARGS} \
        -t "${image_tag}" \
        -f "${dockerfile_path}" \
        "${context_path}"; then
        success "Built ${service_name} image: ${image_tag}"
        
        # Tag as latest
        docker tag "${image_tag}" "${REGISTRY}/${service_name}:latest"
        
        # Show image size
        local size=$(docker images "${image_tag}" --format "table {{.Size}}" | tail -n 1)
        log "Image size: ${size}"
        
        return 0
    else
        error "Failed to build ${service_name} image"
        return 1
    fi
}

# Function to build all images in parallel
build_all_images() {
    local pids=()
    local services=(
        "ingest-service:services/ingest:services/ingest/Dockerfile"
        "context-service:services/context:services/context/Dockerfile"
        "inference-service:services/inference:services/inference/Dockerfile"
        "feedback-service:services/feedback:services/feedback/Dockerfile"
        "ml-service:ai-services/ml-service:ai-services/ml-service/Dockerfile"
        "web-client:apps/web-client:apps/web-client/Dockerfile"
        "mobile-client:apps/mobile-client:apps/mobile-client/Dockerfile"
    )
    
    log "Starting parallel builds for ${#services[@]} services..."
    
    for service_config in "${services[@]}"; do
        IFS=':' read -r service_name context_path dockerfile_path <<< "$service_config"
        
        # Build in background with limited parallelism
        while (( ${#pids[@]} >= PARALLEL_BUILDS )); do
            wait_for_any_job
        done
        
        build_image "$service_name" "$context_path" "$dockerfile_path" &
        pids+=($!)
        
        log "Started build for ${service_name} (PID: $!)"
    done
    
    # Wait for all builds to complete
    log "Waiting for all builds to complete..."
    for pid in "${pids[@]}"; do
        if wait "$pid"; then
            success "Build process $pid completed successfully"
        else
            error "Build process $pid failed"
        fi
    done
}

# Function to wait for any background job to complete
wait_for_any_job() {
    local temp_pids=()
    for pid in "${pids[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            temp_pids+=("$pid")
        fi
    done
    pids=("${temp_pids[@]}")
    
    if (( ${#pids[@]} > 0 )); then
        wait "${pids[0]}"
    fi
}

# Function to clean up Docker resources
cleanup_docker() {
    log "Cleaning up Docker resources..."
    
    # Remove dangling images
    docker image prune -f
    
    # Remove unused build cache
    docker builder prune -f
    
    success "Docker cleanup completed"
}

# Function to show build summary
show_summary() {
    log "Build Summary:"
    echo
    
    local services=("ingest-service" "context-service" "inference-service" 
                   "feedback-service" "ml-service" "web-client" "mobile-client")
    
    for service in "${services[@]}"; do
        local image_tag="${REGISTRY}/${service}:${VERSION}"
        if docker images --format "table {{.Repository}}:{{.Tag}}" | grep -q "$image_tag"; then
            local size=$(docker images "$image_tag" --format "{{.Size}}")
            local created=$(docker images "$image_tag" --format "{{.CreatedSince}}")
            printf "  ✅ %-20s %s (%s ago)\n" "$service" "$size" "$created"
        else
            printf "  ❌ %-20s Build failed\n" "$service"
        fi
    done
    
    echo
    local total_size=$(docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" | \
                      grep "$REGISTRY" | awk '{print $2}' | \
                      sed 's/MB//' | sed 's/GB/*1024/' | \
                      paste -sd+ | bc 2>/dev/null || echo "unknown")
    
    if [ "$total_size" != "unknown" ]; then
        log "Total images size: ${total_size}MB"
    fi
}

# Function to push images to registry
push_images() {
    local registry_url="$1"
    
    if [ -z "$registry_url" ]; then
        warning "No registry URL provided, skipping push"
        return 0
    fi
    
    log "Pushing images to registry: $registry_url"
    
    local services=("ingest-service" "context-service" "inference-service" 
                   "feedback-service" "ml-service" "web-client" "mobile-client")
    
    for service in "${services[@]}"; do
        local local_tag="${REGISTRY}/${service}:${VERSION}"
        local remote_tag="${registry_url}/${service}:${VERSION}"
        
        log "Pushing ${service}..."
        
        if docker tag "$local_tag" "$remote_tag" && \
           docker push "$remote_tag"; then
            success "Pushed ${service} to registry"
        else
            error "Failed to push ${service} to registry"
        fi
    done
}

# Function to test images
test_images() {
    log "Testing built images..."
    
    local services=("ingest-service" "context-service" "inference-service" 
                   "feedback-service" "ml-service")
    
    for service in "${services[@]}"; do
        local image_tag="${REGISTRY}/${service}:${VERSION}"
        
        log "Testing ${service} image..."
        
        # Test if image can start
        if timeout 30 docker run --rm --name "${service}-test" \
           -e NODE_ENV=test \
           "$image_tag" echo "Test successful"; then
            success "${service} image test passed"
        else
            error "${service} image test failed"
        fi
    done
}

# Main execution
main() {
    log "🐳 Starting Coinet AI Docker Images Build"
    echo "============================================="
    
    # Check prerequisites
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running"
        exit 1
    fi
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --no-cache)
                BUILD_ARGS="--no-cache"
                shift
                ;;
            --cache)
                BUILD_ARGS=""
                shift
                ;;
            --version)
                VERSION="$2"
                shift 2
                ;;
            --registry)
                REGISTRY="$2"
                shift 2
                ;;
            --push)
                PUSH_REGISTRY="$2"
                shift 2
                ;;
            --test)
                RUN_TESTS=true
                shift
                ;;
            --parallel)
                PARALLEL_BUILDS="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --no-cache          Build without cache (default)"
                echo "  --cache             Build with cache"
                echo "  --version VERSION   Set image version (default: latest)"
                echo "  --registry REGISTRY Set registry name (default: coinet-ai)"
                echo "  --push REGISTRY     Push images to registry"
                echo "  --test              Run image tests after build"
                echo "  --parallel N        Number of parallel builds (default: 4)"
                echo "  --help              Show this help message"
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    log "Build configuration:"
    log "  Registry: $REGISTRY"
    log "  Version: $VERSION"
    log "  Build args: $BUILD_ARGS"
    log "  Parallel builds: $PARALLEL_BUILDS"
    echo
    
    # Build all images
    if build_all_images; then
        success "All images built successfully!"
    else
        error "Some images failed to build"
        exit 1
    fi
    
    # Run tests if requested
    if [ "${RUN_TESTS:-false}" = "true" ]; then
        test_images
    fi
    
    # Push to registry if requested
    if [ -n "${PUSH_REGISTRY:-}" ]; then
        push_images "$PUSH_REGISTRY"
    fi
    
    # Clean up
    cleanup_docker
    
    # Show summary
    show_summary
    
    success "🎉 Docker build process completed!"
}

# Trap to ensure cleanup on exit
trap 'cleanup_docker' EXIT

# Run main function
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi 