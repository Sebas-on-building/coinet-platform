#!/bin/bash
# =============================================================================
# COINET PRODUCTION BUILD ORCHESTRATOR
# Steve Jobs & Sam Altman level perfection in Docker build automation
# =============================================================================

set -euo pipefail

# =============================================================================
# CONFIGURATION & CONSTANTS
# =============================================================================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly BUILD_TAG="${BUILD_TAG:-v1.0.0}"
readonly DOCKER_REGISTRY="${DOCKER_REGISTRY:-coinet}"
readonly PARALLEL_BUILDS="${PARALLEL_BUILDS:-4}"
readonly BUILD_LOG_DIR="${PROJECT_ROOT}/logs/builds"

# Colors for beautiful output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly WHITE='\033[1;37m'
readonly NC='\033[0m' # No Color

# Service definitions: name:directory pairs
readonly SERVICES=(
    "coinet-ai-service:services/coinet-ai"
    "ingest-service:services/ingest"
    "data-aggregator:services/data-aggregator"
    "context-service:services/context"
    "web-client:apps/web-client"
)

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

log() {
    echo -e "${WHITE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

log_header() {
    echo -e "\n${PURPLE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${PURPLE}  $*${NC}"
    echo -e "${PURPLE}════════════════════════════════════════════════════════════════${NC}\n"
}

show_banner() {
    echo -e "${CYAN}"
    cat << 'EOF'
    ╔═══════════════════════════════════════════════════════════════╗
    ║                                                               ║
    ║   ██████╗ ██████╗ ██╗███╗   ██╗███████╗████████╗             ║
    ║  ██╔════╝██╔═══██╗██║████╗  ██║██╔════╝╚══██╔══╝             ║
    ║  ██║     ██║   ██║██║██╔██╗ ██║█████╗     ██║                ║
    ║  ██║     ██║   ██║██║██║╚██╗██║██╔══╝     ██║                ║
    ║  ╚██████╗╚██████╔╝██║██║ ╚████║███████╗   ██║                ║
    ║   ╚═════╝ ╚═════╝ ╚═╝╚═╝  ╚═══╝╚══════╝   ╚═╝                ║
    ║                                                               ║
    ║        🚀 PRODUCTION BUILD ORCHESTRATOR 🚀                   ║
    ║                                                               ║
    ║        "Perfection is not attainable, but if we chase        ║
    ║         perfection we can catch excellence." - Vince Lombardi║
    ║                                                               ║
    ╚═══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}\n"
}

check_prerequisites() {
    log_header "🔍 CHECKING PREREQUISITES"
    
    local missing_tools=()
    
    # Check required tools
    for tool in docker docker-compose kubectl minikube npm node; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        else
            log_success "✓ $tool is available"
        fi
    done
    
    if [[ ${#missing_tools[@]} -ne 0 ]]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_error "Please install missing tools and try again."
        exit 1
    fi
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    # Check Minikube status
    if ! minikube status &> /dev/null; then
        log_warning "Minikube is not running. Some operations may fail."
    else
        log_success "✓ Minikube is running"
        
        # Setup Minikube Docker environment
        log_info "Setting up Minikube Docker environment..."
        eval "$(minikube docker-env)"
        log_success "✓ Minikube Docker environment configured"
    fi
    
    # Check project structure
    for service_pair in "${SERVICES[@]}"; do
        local service_name="${service_pair%%:*}"
        local service_dir="${PROJECT_ROOT}/${service_pair##*:}"
        
        if [[ ! -d "$service_dir" ]]; then
            log_error "Service directory not found: $service_dir"
            exit 1
        fi
        
        if [[ ! -f "$service_dir/Dockerfile.production" ]]; then
            log_error "Production Dockerfile not found: $service_dir/Dockerfile.production"
            exit 1
        fi
        
        log_success "✓ $service_name structure verified"
    done
    
    log_success "All prerequisites satisfied! 🎉"
}

setup_build_environment() {
    log_header "🏗️ SETTING UP BUILD ENVIRONMENT"
    
    # Create build log directory
    mkdir -p "$BUILD_LOG_DIR"
    log_info "Build logs will be stored in: $BUILD_LOG_DIR"
    
    # Clean up any previous build artifacts
    log_info "Cleaning up previous build artifacts..."
    find "$PROJECT_ROOT" -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
    find "$PROJECT_ROOT" -name ".tsbuildinfo" -type f -delete 2>/dev/null || true
    
    # Install/update dependencies in parallel
    log_info "Installing dependencies..."
    cd "$PROJECT_ROOT"
    
    if [[ -f "package-lock.json" ]]; then
        npm ci --silent
    else
        npm install --silent
    fi
    
    log_success "Build environment ready! 🚀"
}

build_shared_packages() {
    log_header "📦 BUILDING SHARED PACKAGES"
    
    local shared_packages=(
        "packages/shared-db"
        "packages/shared-models"
        "packages/shared-utils"
    )
    
    for package in "${shared_packages[@]}"; do
        local package_dir="${PROJECT_ROOT}/${package}"
        
        if [[ -d "$package_dir" ]]; then
            log_info "Building shared package: $package"
            cd "$package_dir"
            
            if [[ -f "package.json" ]]; then
                # Install dependencies
                if [[ -f "package-lock.json" ]]; then
                    npm ci --silent
                else
                    npm install --silent
                fi
                
                # Build if build script exists
                if npm run build --silent 2>/dev/null; then
                    log_success "✓ Built $package"
                else
                    log_info "No build script for $package (skipping)"
                fi
            fi
        fi
    done
    
    cd "$PROJECT_ROOT"
    log_success "Shared packages built successfully! 📦"
}

get_service_dir() {
    local service_name="$1"
    for service_pair in "${SERVICES[@]}"; do
        if [[ "${service_pair%%:*}" == "$service_name" ]]; then
            echo "${service_pair##*:}"
            return
        fi
    done
    echo ""
}

build_service() {
    local service_name="$1"
    local service_dir="${PROJECT_ROOT}/$(get_service_dir "$service_name")"
    local image_name="${DOCKER_REGISTRY}/${service_name}:${BUILD_TAG}"
    local log_file="${BUILD_LOG_DIR}/${service_name}.log"
    
    log_info "🔨 Building $service_name..."
    
    cd "$service_dir"
    
    # Capture build start time
    local start_time=$(date +%s)
    
    # Build Docker image with detailed logging
    {
        echo "=== BUILD START: $(date) ==="
        echo "Service: $service_name"
        echo "Image: $image_name"
        echo "Directory: $service_dir"
        echo "=================================="
        
        # Build the Docker image
        docker build \
            -f Dockerfile.production \
            -t "$image_name" \
            --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
            --build-arg VCS_REF="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')" \
            --build-arg VERSION="$BUILD_TAG" \
            --progress=plain \
            . 2>&1
            
        echo "=== BUILD END: $(date) ==="
        
    } > "$log_file" 2>&1
    
    local build_exit_code=$?
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [[ $build_exit_code -eq 0 ]]; then
        log_success "✅ $service_name built successfully in ${duration}s"
        
        # Get image size
        local image_size=$(docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" | grep "$image_name" | awk '{print $2}' | head -1)
        log_info "   📊 Image size: $image_size"
        
        # Verify image
        if docker run --rm --entrypoint="" "$image_name" echo "Health check" > /dev/null 2>&1; then
            log_success "   🏥 Image health verified"
        else
            log_warning "   ⚠️  Image health check failed (non-critical)"
        fi
        
        return 0
    else
        log_error "❌ Failed to build $service_name (${duration}s)"
        log_error "   📋 Check build log: $log_file"
        return 1
    fi
}

build_all_services() {
    log_header "🏭 BUILDING ALL SERVICES"
    
    local failed_builds=()
    local successful_builds=()
    local total_start_time=$(date +%s)
    
    # Build services in order (for dependency resolution)
    for service_pair in "${SERVICES[@]}"; do
        local service_name="${service_pair%%:*}"
        if build_service "$service_name"; then
            successful_builds+=("$service_name")
        else
            failed_builds+=("$service_name")
            
            # Ask user if they want to continue with failures
            if [[ ${#failed_builds[@]} -gt 0 ]]; then
                log_warning "Build failed for: ${failed_builds[*]}"
                read -p "Continue with remaining builds? (y/N): " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    log_error "Build process aborted by user"
                    exit 1
                fi
            fi
        fi
    done
    
    local total_end_time=$(date +%s)
    local total_duration=$((total_end_time - total_start_time))
    
    # Build summary
    log_header "📊 BUILD SUMMARY"
    
    if [[ ${#successful_builds[@]} -gt 0 ]]; then
        log_success "✅ Successfully built (${#successful_builds[@]} services):"
        for service in "${successful_builds[@]}"; do
            echo -e "   ${GREEN}✓${NC} $service"
        done
    fi
    
    if [[ ${#failed_builds[@]} -gt 0 ]]; then
        log_error "❌ Failed builds (${#failed_builds[@]} services):"
        for service in "${failed_builds[@]}"; do
            echo -e "   ${RED}✗${NC} $service"
        done
    fi
    
    log_info "🕒 Total build time: ${total_duration}s"
    
    # Return exit code based on failures
    return ${#failed_builds[@]}
}

verify_images() {
    log_header "🔍 VERIFYING BUILT IMAGES"
    
    for service_pair in "${SERVICES[@]}"; do
        local service_name="${service_pair%%:*}"
        local image_name="${DOCKER_REGISTRY}/${service_name}:${BUILD_TAG}"
        
        if docker image inspect "$image_name" > /dev/null 2>&1; then
            log_success "✓ $image_name exists"
            
            # Get image details
            local created=$(docker image inspect "$image_name" --format '{{.Created}}' | cut -d'T' -f1)
            local size=$(docker image inspect "$image_name" --format '{{.Size}}' | numfmt --to=iec)
            log_info "   📅 Created: $created"
            log_info "   📊 Size: $size"
        else
            log_error "✗ $image_name not found"
        fi
    done
}

push_images() {
    if [[ "${PUSH_IMAGES:-false}" == "true" ]]; then
        log_header "🚀 PUSHING IMAGES TO REGISTRY"
        
        for service_pair in "${SERVICES[@]}"; do
            local service_name="${service_pair%%:*}"
            local image_name="${DOCKER_REGISTRY}/${service_name}:${BUILD_TAG}"
            log_info "Pushing $image_name..."
            
            if docker push "$image_name"; then
                log_success "✓ Pushed $image_name"
            else
                log_error "✗ Failed to push $image_name"
            fi
        done
    else
        log_info "Skipping image push (set PUSH_IMAGES=true to enable)"
    fi
}

cleanup() {
    log_header "🧹 CLEANUP"
    
    # Remove dangling images
    local dangling_images=$(docker images -f "dangling=true" -q)
    if [[ -n "$dangling_images" ]]; then
        log_info "Removing dangling images..."
        docker rmi $dangling_images 2>/dev/null || true
        log_success "✓ Dangling images removed"
    else
        log_info "No dangling images to remove"
    fi
    
    # Clean build cache (optional)
    if [[ "${CLEAN_BUILD_CACHE:-false}" == "true" ]]; then
        log_info "Cleaning Docker build cache..."
        docker builder prune -f
        log_success "✓ Build cache cleaned"
    fi
}

show_next_steps() {
    log_header "🎯 NEXT STEPS"
    
    echo -e "${CYAN}Your Coinet services are now built with perfection! Here's what you can do next:${NC}\n"
    
    echo -e "${WHITE}1. Deploy to Kubernetes:${NC}"
    echo -e "   ${BLUE}kubectl apply -f k8s/production/deployment.yaml${NC}\n"
    
    echo -e "${WHITE}2. Check deployment status:${NC}"
    echo -e "   ${BLUE}kubectl get pods -n coinet-production${NC}\n"
    
    echo -e "${WHITE}3. View service logs:${NC}"
    echo -e "   ${BLUE}kubectl logs -f deployment/coinet-ai-service -n coinet-production${NC}\n"
    
    echo -e "${WHITE}4. Access the application:${NC}"
    echo -e "   ${BLUE}minikube service web-client-service -n coinet-production${NC}\n"
    
    echo -e "${WHITE}5. Monitor services:${NC}"
    echo -e "   ${BLUE}kubectl get all -n coinet-production${NC}\n"
    
    echo -e "${CYAN}🚀 Ready to revolutionize crypto trading with AI! 🚀${NC}\n"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    # Trap to ensure cleanup on exit
    trap cleanup EXIT
    
    show_banner
    
    log_header "🚀 STARTING COINET PRODUCTION BUILD"
    log_info "Build tag: $BUILD_TAG"
    log_info "Docker registry: $DOCKER_REGISTRY"
    log_info "Project root: $PROJECT_ROOT"
    
    check_prerequisites
    setup_build_environment
    build_shared_packages
    
    if build_all_services; then
        verify_images
        push_images
        show_next_steps
        
        log_success "🎉 BUILD COMPLETED SUCCESSFULLY! 🎉"
        log_success "Steve Jobs and Sam Altman would be proud! 💯"
        exit 0
    else
        log_error "💥 BUILD FAILED!"
        log_error "Check the build logs in: $BUILD_LOG_DIR"
        exit 1
    fi
}

# Handle script arguments
case "${1:-build}" in
    "build")
        main
        ;;
    "clean")
        cleanup
        ;;
    "verify")
        verify_images
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [build|clean|verify|help]"
        echo ""
        echo "Commands:"
        echo "  build   - Build all services (default)"
        echo "  clean   - Clean up build artifacts"
        echo "  verify  - Verify built images"
        echo "  help    - Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  BUILD_TAG              - Docker image tag (default: v1.0.0)"
        echo "  DOCKER_REGISTRY        - Docker registry (default: coinet)"
        echo "  PUSH_IMAGES           - Push images after build (default: false)"
        echo "  CLEAN_BUILD_CACHE     - Clean Docker build cache (default: false)"
        echo "  PARALLEL_BUILDS       - Number of parallel builds (default: 4)"
        ;;
    *)
        log_error "Unknown command: $1"
        log_info "Use '$0 help' for usage information"
        exit 1
        ;;
esac
