#!/bin/bash

# =============================================================================
# COINET AI KUBERNETES DEPLOYMENT SCRIPT
# Deploy all services to Kubernetes cluster
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
NAMESPACE="${NAMESPACE:-coinet-ai}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
CHART_PATH="./infra/helm/charts"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi
    
    if ! command -v helm &> /dev/null; then
        log_error "helm is not installed"
        exit 1
    fi
    
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Create namespace
create_namespace() {
    log_info "Creating namespace: $NAMESPACE"
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    log_success "Namespace $NAMESPACE ready"
}

# Deploy using Helm
deploy_services() {
    log_info "Deploying AI services..."
    
    # Update Helm dependencies
    helm dependency update "$CHART_PATH/ai-services"
    
    # Deploy AI services
    helm upgrade --install coinet-ai-services "$CHART_PATH/ai-services" \
        --namespace "$NAMESPACE" \
        --values "$CHART_PATH/ai-services/values-${ENVIRONMENT}.yaml" \
        --wait \
        --timeout 600s
    
    log_success "AI services deployed successfully"
}

# Deploy web client
deploy_web_client() {
    log_info "Deploying web client..."
    
    helm upgrade --install coinet-web-client "$CHART_PATH/web-client" \
        --namespace "$NAMESPACE" \
        --values "$CHART_PATH/web-client/values-${ENVIRONMENT}.yaml" \
        --wait \
        --timeout 300s
    
    log_success "Web client deployed successfully"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check pod status
    kubectl get pods -n "$NAMESPACE"
    
    # Check service status
    kubectl get services -n "$NAMESPACE"
    
    # Check ingress status
    kubectl get ingress -n "$NAMESPACE"
    
    # Wait for pods to be ready
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/part-of=coinet-ai -n "$NAMESPACE" --timeout=300s
    
    log_success "Deployment verified successfully"
}

# Main execution
main() {
    log_info "Starting Coinet AI deployment to Kubernetes"
    log_info "Environment: $ENVIRONMENT"
    log_info "Namespace: $NAMESPACE"
    
    check_prerequisites
    create_namespace
    deploy_services
    deploy_web_client
    verify_deployment
    
    log_success "🚀 Coinet AI deployment completed successfully!"
    log_info "Access the application at: https://coinet.ai"
    log_info "Monitor with: kubectl get pods -n $NAMESPACE -w"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi 