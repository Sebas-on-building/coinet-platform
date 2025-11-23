#!/bin/bash

# 🚀 Coinet AI Platform Deployment Script
# Comprehensive script for deploying to Kubernetes environments

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
CLUSTER_NAME="${EKS_CLUSTER_NAME:-coinet-ai-cluster}"
AWS_REGION="${AWS_REGION:-us-east-1}"
KUBECTL_VERSION="1.28.0"
HELM_VERSION="3.13.0"

# Environment configurations
declare -A ENV_CONFIGS=(
    ["staging"]="coinet-staging"
    ["production"]="coinet-production"
    ["dev"]="coinet-dev"
)

declare -A ENV_URLS=(
    ["staging"]="https://staging.coinet.ai"
    ["production"]="https://coinet.ai"
    ["dev"]="https://dev.coinet.ai"
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
    echo "  🚀 Coinet AI Platform Deployment"
    echo "========================================"
    echo -e "${NC}"
}

print_usage() {
    cat << EOF
Usage: $0 [COMMAND] [OPTIONS]

COMMANDS:
  deploy              Deploy to environment
  rollback            Rollback deployment
  status              Show deployment status
  health              Run health checks
  logs                View deployment logs
  scale               Scale services
  restart             Restart services
  help                Show this help message

OPTIONS:
  -e, --environment ENV       Target environment (staging, production, dev)
  -t, --tag TAG              Image tag to deploy
  -s, --service SERVICE      Target specific service
  -f, --force                Force operation (skip confirmations)
  -v, --verbose              Verbose output
  --dry-run                  Show what would be done without executing
  --timeout SECONDS          Operation timeout (default: 600)
  --replicas COUNT           Number of replicas for scaling

EXAMPLES:
  $0 deploy -e staging                    # Deploy latest to staging
  $0 deploy -e production -t v1.0.0      # Deploy specific version to production
  $0 rollback -e production              # Rollback production deployment
  $0 status -e staging                   # Check staging deployment status
  $0 scale -e staging -s ingest --replicas 5  # Scale ingest service
  $0 health -e production               # Run production health checks

ENVIRONMENT VARIABLES:
  REGISTRY                 Container registry URL
  GITHUB_REPOSITORY_OWNER  Registry namespace
  EKS_CLUSTER_NAME         Kubernetes cluster name
  AWS_REGION              AWS region
  KUBECONFIG              Kubernetes config file path
EOF
}

check_dependencies() {
    local missing=()
    
    command -v kubectl >/dev/null 2>&1 || missing+=("kubectl")
    command -v helm >/dev/null 2>&1 || missing+=("helm")
    command -v aws >/dev/null 2>&1 || missing+=("aws")
    command -v jq >/dev/null 2>&1 || missing+=("jq")
    
    if [ ${#missing[@]} -ne 0 ]; then
        log_error "Missing required dependencies: ${missing[*]}"
        log_info "Please install missing dependencies and try again"
        exit 1
    fi
}

setup_kubectl() {
    local environment="$1"
    
    log_step "Setting up kubectl for ${environment}..."
    
    # Update kubeconfig for EKS
    aws eks update-kubeconfig \
        --region "${AWS_REGION}" \
        --name "${CLUSTER_NAME}" \
        --alias "${environment}" \
        >/dev/null 2>&1
    
    # Verify connection
    if kubectl cluster-info --context "${environment}" >/dev/null 2>&1; then
        log_success "Connected to ${environment} cluster"
    else
        log_error "Failed to connect to ${environment} cluster"
        exit 1
    fi
}

validate_environment() {
    local environment="$1"
    
    if [[ ! "${!ENV_CONFIGS[@]}" =~ "${environment}" ]]; then
        log_error "Invalid environment: ${environment}"
        log_info "Valid environments: ${!ENV_CONFIGS[*]}"
        exit 1
    fi
}

validate_image_tag() {
    local tag="$1"
    local service="$2"
    
    log_step "Validating image tag: ${tag} for service: ${service}"
    
    local image="${REGISTRY}/${NAMESPACE}/coinet-${service}:${tag}"
    
    if docker manifest inspect "${image}" >/dev/null 2>&1; then
        log_success "Image validated: ${image}"
    else
        log_error "Image not found: ${image}"
        return 1
    fi
}

generate_values_file() {
    local environment="$1"
    local image_tag="$2"
    local output_file="$3"
    
    log_step "Generating values file for ${environment}..."
    
    # Base configuration
    cat > "${output_file}" << EOF
global:
  environment: ${environment}
  imageTag: "${image_tag}"
  registry: "${REGISTRY}"
  namespace: "${NAMESPACE}"

EOF

    # Environment-specific configuration
    case "${environment}" in
        "staging")
            cat >> "${output_file}" << EOF
ingress:
  enabled: true
  hostname: staging.coinet.ai
  tls: true

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80

resources:
  limits:
    cpu: 1000m
    memory: 2Gi
  requests:
    cpu: 500m
    memory: 1Gi

monitoring:
  enabled: true
  
redis:
  enabled: true
  replicas: 2
  
postgresql:
  enabled: true

services:
  webClient:
    image: "${REGISTRY}/${NAMESPACE}/coinet-web-client:${image_tag}"
    replicas: 2
  mobileClient:
    image: "${REGISTRY}/${NAMESPACE}/coinet-mobile-client:${image_tag}"
    replicas: 1
  ingest:
    image: "${REGISTRY}/${NAMESPACE}/coinet-ingest:${image_tag}"
    replicas: 3
  context:
    image: "${REGISTRY}/${NAMESPACE}/coinet-context:${image_tag}"
    replicas: 2
  inference:
    image: "${REGISTRY}/${NAMESPACE}/coinet-inference:${image_tag}"
    replicas: 3
  feedback:
    image: "${REGISTRY}/${NAMESPACE}/coinet-feedback:${image_tag}"
    replicas: 2
  mlService:
    image: "${REGISTRY}/${NAMESPACE}/coinet-ml-service:${image_tag}"
    replicas: 2
EOF
            ;;
        "production")
            cat >> "${output_file}" << EOF
deploymentStrategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 25%
    maxSurge: 25%

ingress:
  enabled: true
  hostname: coinet.ai
  tls: true
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

resources:
  limits:
    cpu: 2000m
    memory: 4Gi
  requests:
    cpu: 1000m
    memory: 2Gi

monitoring:
  enabled: true
  prometheus: true
  grafana: true
  
redis:
  enabled: true
  replicas: 3
  persistence:
    enabled: true
    size: 10Gi
  
postgresql:
  enabled: true
  replicas: 2
  persistence:
    enabled: true
    size: 100Gi

services:
  webClient:
    image: "${REGISTRY}/${NAMESPACE}/coinet-web-client:${image_tag}"
    replicas: 3
  mobileClient:
    image: "${REGISTRY}/${NAMESPACE}/coinet-mobile-client:${image_tag}"
    replicas: 2
  ingest:
    image: "${REGISTRY}/${NAMESPACE}/coinet-ingest:${image_tag}"
    replicas: 5
  context:
    image: "${REGISTRY}/${NAMESPACE}/coinet-context:${image_tag}"
    replicas: 4
  inference:
    image: "${REGISTRY}/${NAMESPACE}/coinet-inference:${image_tag}"
    replicas: 6
  feedback:
    image: "${REGISTRY}/${NAMESPACE}/coinet-feedback:${image_tag}"
    replicas: 3
  mlService:
    image: "${REGISTRY}/${NAMESPACE}/coinet-ml-service:${image_tag}"
    replicas: 4
EOF
            ;;
        "dev")
            cat >> "${output_file}" << EOF
ingress:
  enabled: true
  hostname: dev.coinet.ai
  tls: false

autoscaling:
  enabled: false

resources:
  limits:
    cpu: 500m
    memory: 1Gi
  requests:
    cpu: 200m
    memory: 512Mi

monitoring:
  enabled: false
  
redis:
  enabled: true
  replicas: 1
  
postgresql:
  enabled: true

services:
  webClient:
    image: "${REGISTRY}/${NAMESPACE}/coinet-web-client:${image_tag}"
    replicas: 1
  mobileClient:
    image: "${REGISTRY}/${NAMESPACE}/coinet-mobile-client:${image_tag}"
    replicas: 1
  ingest:
    image: "${REGISTRY}/${NAMESPACE}/coinet-ingest:${image_tag}"
    replicas: 1
  context:
    image: "${REGISTRY}/${NAMESPACE}/coinet-context:${image_tag}"
    replicas: 1
  inference:
    image: "${REGISTRY}/${NAMESPACE}/coinet-inference:${image_tag}"
    replicas: 1
  feedback:
    image: "${REGISTRY}/${NAMESPACE}/coinet-feedback:${image_tag}"
    replicas: 1
  mlService:
    image: "${REGISTRY}/${NAMESPACE}/coinet-ml-service:${image_tag}"
    replicas: 1
EOF
            ;;
    esac
    
    log_success "Values file generated: ${output_file}"
}

deploy_to_environment() {
    local environment="$1"
    local image_tag="$2"
    local dry_run="${3:-false}"
    local timeout="${4:-600}"
    
    validate_environment "${environment}"
    setup_kubectl "${environment}"
    
    local k8s_namespace="${ENV_CONFIGS[${environment}]}"
    local release_name="coinet-ai-${environment}"
    local values_file="${environment}-values.yaml"
    
    log_step "Deploying to ${environment} environment..."
    log_info "Namespace: ${k8s_namespace}"
    log_info "Release: ${release_name}"
    log_info "Image Tag: ${image_tag}"
    
    # Validate all service images
    local services=("web-client" "mobile-client" "ingest" "context" "inference" "feedback" "ml-service")
    for service in "${services[@]}"; do
        if ! validate_image_tag "${image_tag}" "${service}"; then
            log_error "Image validation failed for ${service}"
            exit 1
        fi
    done
    
    # Create namespace if it doesn't exist
    if [ "${dry_run}" = "false" ]; then
        kubectl create namespace "${k8s_namespace}" --dry-run=client -o yaml | kubectl apply -f -
    fi
    
    # Generate values file
    generate_values_file "${environment}" "${image_tag}" "${values_file}"
    
    # Backup current deployment (for production)
    if [[ "${environment}" == "production" && "${dry_run}" == "false" ]]; then
        log_step "Creating pre-deployment backup..."
        local backup_file="backup-${environment}-$(date +%Y%m%d-%H%M%S).yaml"
        helm get values "${release_name}" -n "${k8s_namespace}" > "${backup_file}" 2>/dev/null || echo "No previous release found"
    fi
    
    # Deploy with Helm
    local helm_args=(
        "upgrade" "--install" "${release_name}"
        "./infra/helm/charts/ai-services"
        "--namespace" "${k8s_namespace}"
        "--values" "${values_file}"
        "--timeout" "${timeout}s"
        "--wait"
        "--atomic"
    )
    
    if [ "${dry_run}" = "true" ]; then
        helm_args+=("--dry-run")
        log_info "DRY RUN MODE - No actual deployment will occur"
    fi
    
    log_step "Running Helm deployment..."
    if helm "${helm_args[@]}"; then
        log_success "Deployment completed successfully"
    else
        log_error "Deployment failed"
        exit 1
    fi
    
    # Run health checks (if not dry run)
    if [ "${dry_run}" = "false" ]; then
        run_health_checks "${environment}" "${timeout}"
    fi
    
    # Create deployment record
    if [ "${dry_run}" = "false" ]; then
        kubectl create configmap "deployment-$(date +%Y%m%d-%H%M%S)" \
            --from-literal=environment="${environment}" \
            --from-literal=imageTag="${image_tag}" \
            --from-literal=deployedAt="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
            --from-literal=deployedBy="${USER}" \
            -n "${k8s_namespace}"
    fi
    
    # Cleanup
    rm -f "${values_file}"
    
    log_success "Deployment to ${environment} completed!"
    log_info "Environment URL: ${ENV_URLS[${environment}]}"
}

run_health_checks() {
    local environment="$1"
    local timeout="${2:-300}"
    
    local k8s_namespace="${ENV_CONFIGS[${environment}]}"
    
    log_step "Running health checks for ${environment}..."
    
    # Wait for deployments to be ready
    local deployments=("coinet-web-client" "coinet-ingest" "coinet-context" "coinet-inference" "coinet-feedback" "coinet-ml-service")
    
    for deployment in "${deployments[@]}"; do
        log_step "Checking deployment: ${deployment}"
        if kubectl rollout status deployment/"${deployment}" -n "${k8s_namespace}" --timeout="${timeout}s"; then
            log_success "${deployment} is ready"
        else
            log_error "${deployment} failed to become ready"
            return 1
        fi
    done
    
    # Check pod health
    log_step "Checking pod health..."
    kubectl get pods -n "${k8s_namespace}"
    
    # Run smoke tests
    log_step "Running smoke tests..."
    local test_job_name="health-check-$(date +%s)"
    
    cat > health-check-job.yaml << EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: ${test_job_name}
  namespace: ${k8s_namespace}
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: health-check
        image: curlimages/curl:latest
        command:
        - /bin/sh
        - -c
        - |
          echo "🔍 Running health checks..."
          services="web-client ingest context inference feedback ml-service"
          for service in \$services; do
            echo "Testing coinet-\$service..."
            if curl -f --max-time 10 http://coinet-\$service.${k8s_namespace}.svc.cluster.local/health; then
              echo "✅ \$service health check passed"
            else
              echo "❌ \$service health check failed"
              exit 1
            fi
          done
          echo "✅ All health checks passed!"
  backoffLimit: 2
EOF
    
    kubectl apply -f health-check-job.yaml
    
    if kubectl wait --for=condition=complete job/"${test_job_name}" -n "${k8s_namespace}" --timeout="${timeout}s"; then
        log_success "Health checks completed successfully"
    else
        log_error "Health checks failed"
        kubectl logs job/"${test_job_name}" -n "${k8s_namespace}"
        return 1
    fi
    
    # Clean up test job
    kubectl delete job "${test_job_name}" -n "${k8s_namespace}"
    rm -f health-check-job.yaml
}

rollback_deployment() {
    local environment="$1"
    local revision="${2:-}"
    
    validate_environment "${environment}"
    setup_kubectl "${environment}"
    
    local k8s_namespace="${ENV_CONFIGS[${environment}]}"
    local release_name="coinet-ai-${environment}"
    
    log_step "Rolling back ${environment} deployment..."
    
    if [ -n "${revision}" ]; then
        log_info "Rolling back to revision: ${revision}"
        helm rollback "${release_name}" "${revision}" -n "${k8s_namespace}"
    else
        log_info "Rolling back to previous revision"
        helm rollback "${release_name}" -n "${k8s_namespace}"
    fi
    
    # Wait for rollback to complete
    local deployments=("coinet-web-client" "coinet-ingest" "coinet-context" "coinet-inference" "coinet-feedback" "coinet-ml-service")
    
    for deployment in "${deployments[@]}"; do
        kubectl rollout status deployment/"${deployment}" -n "${k8s_namespace}" --timeout=300s
    done
    
    log_success "Rollback completed for ${environment}"
}

show_deployment_status() {
    local environment="$1"
    
    validate_environment "${environment}"
    setup_kubectl "${environment}"
    
    local k8s_namespace="${ENV_CONFIGS[${environment}]}"
    local release_name="coinet-ai-${environment}"
    
    log_step "Checking deployment status for ${environment}..."
    
    echo ""
    echo "📊 Helm Release Status:"
    helm status "${release_name}" -n "${k8s_namespace}" || echo "No release found"
    
    echo ""
    echo "🚀 Deployments:"
    kubectl get deployments -n "${k8s_namespace}" -o wide
    
    echo ""
    echo "🏃 Pods:"
    kubectl get pods -n "${k8s_namespace}" -o wide
    
    echo ""
    echo "🌐 Services:"
    kubectl get services -n "${k8s_namespace}"
    
    echo ""
    echo "📈 Resource Usage:"
    kubectl top pods -n "${k8s_namespace}" 2>/dev/null || echo "Metrics not available"
    
    echo ""
    echo "🔗 Environment URL: ${ENV_URLS[${environment}]}"
}

scale_service() {
    local environment="$1"
    local service="$2"
    local replicas="$3"
    
    validate_environment "${environment}"
    setup_kubectl "${environment}"
    
    local k8s_namespace="${ENV_CONFIGS[${environment}]}"
    local deployment_name="coinet-${service}"
    
    log_step "Scaling ${service} to ${replicas} replicas in ${environment}..."
    
    kubectl scale deployment "${deployment_name}" --replicas="${replicas}" -n "${k8s_namespace}"
    
    # Wait for scaling to complete
    kubectl rollout status deployment/"${deployment_name}" -n "${k8s_namespace}" --timeout=300s
    
    log_success "Scaling completed"
    kubectl get deployment "${deployment_name}" -n "${k8s_namespace}"
}

restart_service() {
    local environment="$1"
    local service="$2"
    
    validate_environment "${environment}"
    setup_kubectl "${environment}"
    
    local k8s_namespace="${ENV_CONFIGS[${environment}]}"
    local deployment_name="coinet-${service}"
    
    log_step "Restarting ${service} in ${environment}..."
    
    kubectl rollout restart deployment/"${deployment_name}" -n "${k8s_namespace}"
    
    # Wait for restart to complete
    kubectl rollout status deployment/"${deployment_name}" -n "${k8s_namespace}" --timeout=300s
    
    log_success "Restart completed"
}

view_logs() {
    local environment="$1"
    local service="$2"
    local lines="${3:-100}"
    
    validate_environment "${environment}"
    setup_kubectl "${environment}"
    
    local k8s_namespace="${ENV_CONFIGS[${environment}]}"
    local deployment_name="coinet-${service}"
    
    log_step "Viewing logs for ${service} in ${environment}..."
    
    kubectl logs deployment/"${deployment_name}" -n "${k8s_namespace}" --tail="${lines}" -f
}

# Parse command line arguments
COMMAND=""
ENVIRONMENT=""
IMAGE_TAG=""
SERVICE=""
FORCE=false
DRY_RUN=false
VERBOSE=false
TIMEOUT=600
REPLICAS=""

while [[ $# -gt 0 ]]; do
    case $1 in
        deploy|rollback|status|health|logs|scale|restart|help)
            COMMAND="$1"
            shift
            ;;
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -s|--service)
            SERVICE="$2"
            shift 2
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            set -x
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --replicas)
            REPLICAS="$2"
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
    deploy)
        if [ -z "$ENVIRONMENT" ]; then
            log_error "Environment is required for deployment"
            exit 1
        fi
        
        if [ -z "$IMAGE_TAG" ]; then
            IMAGE_TAG="latest"
            log_warning "No image tag specified, using: ${IMAGE_TAG}"
        fi
        
        # Confirmation for production
        if [[ "$ENVIRONMENT" == "production" && "$FORCE" == "false" ]]; then
            echo -n "⚠️  Are you sure you want to deploy to PRODUCTION? (yes/no): "
            read -r confirmation
            if [[ "$confirmation" != "yes" ]]; then
                log_info "Deployment cancelled"
                exit 0
            fi
        fi
        
        deploy_to_environment "$ENVIRONMENT" "$IMAGE_TAG" "$DRY_RUN" "$TIMEOUT"
        ;;
    rollback)
        if [ -z "$ENVIRONMENT" ]; then
            log_error "Environment is required for rollback"
            exit 1
        fi
        
        rollback_deployment "$ENVIRONMENT"
        ;;
    status)
        if [ -z "$ENVIRONMENT" ]; then
            log_error "Environment is required for status check"
            exit 1
        fi
        
        show_deployment_status "$ENVIRONMENT"
        ;;
    health)
        if [ -z "$ENVIRONMENT" ]; then
            log_error "Environment is required for health check"
            exit 1
        fi
        
        run_health_checks "$ENVIRONMENT" "$TIMEOUT"
        ;;
    scale)
        if [ -z "$ENVIRONMENT" ] || [ -z "$SERVICE" ] || [ -z "$REPLICAS" ]; then
            log_error "Environment, service, and replicas are required for scaling"
            exit 1
        fi
        
        scale_service "$ENVIRONMENT" "$SERVICE" "$REPLICAS"
        ;;
    restart)
        if [ -z "$ENVIRONMENT" ] || [ -z "$SERVICE" ]; then
            log_error "Environment and service are required for restart"
            exit 1
        fi
        
        restart_service "$ENVIRONMENT" "$SERVICE"
        ;;
    logs)
        if [ -z "$ENVIRONMENT" ] || [ -z "$SERVICE" ]; then
            log_error "Environment and service are required for logs"
            exit 1
        fi
        
        view_logs "$ENVIRONMENT" "$SERVICE" "${REPLICAS:-100}"
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

log_success "Operation completed successfully!" 