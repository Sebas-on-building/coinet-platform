#!/bin/bash

# =============================================================================
# COINET AI KUBECTL CONFIGURATION SCRIPT
# Configure kubectl contexts for multi-environment management
# =============================================================================

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
CLUSTER_NAME="${CLUSTER_NAME:-coinet-ai-cluster}"
AWS_REGION="${AWS_REGION:-us-west-2}"

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
    echo "=============================================="
    echo "  🔧 Coinet AI kubectl Configuration"
    echo "=============================================="
    echo -e "${NC}"
}

print_usage() {
    cat << EOF
Usage: $0 [COMMAND] [OPTIONS]

COMMANDS:
    setup                       Setup kubectl contexts for all environments
    switch ENVIRONMENT          Switch to specific environment context
    status                      Show current context and available contexts
    list                        List all available contexts
    reset                       Reset kubectl configuration
    test                        Test connectivity to all environments

OPTIONS:
    -c, --cluster-name NAME     Cluster name (default: coinet-ai-cluster)
    -r, --region REGION         AWS region (default: us-west-2)
    -h, --help                  Show this help message

ENVIRONMENTS:
    dev                         Development environment
    staging                     Staging environment
    production                  Production environment
    monitoring                  Monitoring namespace
    ingress                     Ingress namespace
    security                    Security namespace

EXAMPLES:
    $0 setup                               # Setup all contexts
    $0 switch production                   # Switch to production
    $0 status                             # Show current status
    $0 test                               # Test all connections
EOF
}

check_dependencies() {
    local missing=()
    
    command -v kubectl >/dev/null 2>&1 || missing+=("kubectl")
    command -v aws >/dev/null 2>&1 || missing+=("aws-cli")
    command -v jq >/dev/null 2>&1 || missing+=("jq")
    
    if [ ${#missing[@]} -ne 0 ]; then
        log_error "Missing required dependencies: ${missing[*]}"
        log_info "Please install missing dependencies and try again"
        exit 1
    fi
    
    log_success "All dependencies are available"
}

setup_kubeconfig() {
    log_step "Setting up kubectl configuration for EKS cluster..."
    
    # Update kubeconfig for the cluster
    aws eks update-kubeconfig \
        --region "${AWS_REGION}" \
        --name "${CLUSTER_NAME}" \
        --alias "${CLUSTER_NAME}" || {
        log_error "Failed to update kubeconfig for cluster: ${CLUSTER_NAME}"
        exit 1
    }
    
    log_success "kubectl configured for cluster: ${CLUSTER_NAME}"
}

create_environment_contexts() {
    log_step "Creating environment-specific contexts..."
    
    local environments=("dev" "staging" "production" "monitoring" "ingress" "security")
    local base_context="${CLUSTER_NAME}"
    
    for env in "${environments[@]}"; do
        local context_name="coinet-${env}"
        local namespace="coinet-${env}"
        
        log_info "Creating context: ${context_name} -> namespace: ${namespace}"
        
        # Create context with specific namespace
        kubectl config set-context "${context_name}" \
            --cluster="$(kubectl config view -o jsonpath="{.contexts[?(@.name==\"${base_context}\")].context.cluster}")" \
            --user="$(kubectl config view -o jsonpath="{.contexts[?(@.name==\"${base_context}\")].context.user}")" \
            --namespace="${namespace}" || {
            log_error "Failed to create context: ${context_name}"
            continue
        }
        
        log_success "Created context: ${context_name}"
    done
}

create_aliases() {
    log_step "Creating kubectl aliases and shortcuts..."
    
    # Create alias file
    cat > ~/.kubectl_aliases << 'EOF'
# Coinet AI kubectl aliases
alias k='kubectl'
alias kgp='kubectl get pods'
alias kgs='kubectl get services'
alias kgd='kubectl get deployments'
alias kgn='kubectl get nodes'
alias kgns='kubectl get namespaces'

# Environment switching aliases
alias k-dev='kubectl config use-context coinet-dev'
alias k-staging='kubectl config use-context coinet-staging'
alias k-prod='kubectl config use-context coinet-production'
alias k-monitoring='kubectl config use-context coinet-monitoring'
alias k-ingress='kubectl config use-context coinet-ingress'
alias k-security='kubectl config use-context coinet-security'

# Quick namespace switching (without changing context)
alias kn-dev='kubectl config set-context --current --namespace=coinet-dev'
alias kn-staging='kubectl config set-context --current --namespace=coinet-staging'
alias kn-prod='kubectl config set-context --current --namespace=coinet-production'

# Useful shortcuts
alias kdesc='kubectl describe'
alias klogs='kubectl logs'
alias kexec='kubectl exec -it'
alias kport='kubectl port-forward'

# Status and debugging
alias kstatus='kubectl config current-context && kubectl config view --minify --output "jsonpath={..namespace}"'
alias kctx='kubectl config get-contexts'
alias kwho='kubectl auth whoami'
EOF
    
    # Add source command to shell profiles if not already present
    for shell_profile in ~/.bashrc ~/.zshrc ~/.bash_profile; do
        if [[ -f "$shell_profile" ]] && ! grep -q "kubectl_aliases" "$shell_profile"; then
            echo "" >> "$shell_profile"
            echo "# Coinet AI kubectl aliases" >> "$shell_profile"
            echo "source ~/.kubectl_aliases" >> "$shell_profile"
            log_info "Added aliases to: $shell_profile"
        fi
    done
    
    log_success "kubectl aliases created and configured"
}

install_kubectl_plugins() {
    log_step "Installing useful kubectl plugins..."
    
    # Check if krew is available
    if command -v kubectl-krew >/dev/null 2>&1; then
        log_info "Installing kubectl plugins via krew..."
        
        # Install useful plugins
        kubectl krew install ctx ns tail who-can access-matrix || true
        
        log_success "kubectl plugins installed"
    else
        log_warning "kubectl krew not found. Plugins not installed."
        log_info "Install krew: https://krew.sigs.k8s.io/docs/user-guide/setup/install/"
    fi
}

verify_cluster_access() {
    log_step "Verifying cluster access..."
    
    # Test basic cluster connectivity
    if kubectl cluster-info >/dev/null 2>&1; then
        log_success "Cluster connectivity verified"
        kubectl cluster-info
    else
        log_error "Cannot connect to cluster"
        return 1
    fi
    
    # Check authentication
    if kubectl auth can-i get pods >/dev/null 2>&1; then
        log_success "Authentication verified"
    else
        log_error "Authentication failed"
        return 1
    fi
    
    return 0
}

test_environment_access() {
    log_step "Testing access to all environments..."
    
    local environments=("dev" "staging" "production" "monitoring" "ingress" "security")
    local current_context=$(kubectl config current-context)
    
    for env in "${environments[@]}"; do
        local context_name="coinet-${env}"
        local namespace="coinet-${env}"
        
        log_info "Testing context: ${context_name}"
        
        if kubectl config use-context "${context_name}" >/dev/null 2>&1; then
            if kubectl get namespace "${namespace}" >/dev/null 2>&1; then
                log_success "✓ ${context_name} - namespace accessible"
            else
                log_warning "⚠ ${context_name} - namespace not found"
            fi
        else
            log_error "✗ ${context_name} - context not available"
        fi
    done
    
    # Restore original context
    kubectl config use-context "${current_context}" >/dev/null 2>&1
}

switch_environment() {
    local environment="$1"
    local context_name="coinet-${environment}"
    
    log_step "Switching to environment: ${environment}"
    
    if kubectl config use-context "${context_name}" >/dev/null 2>&1; then
        log_success "Switched to context: ${context_name}"
        
        # Show current context info
        show_current_status
    else
        log_error "Failed to switch to context: ${context_name}"
        log_info "Available contexts:"
        kubectl config get-contexts
        exit 1
    fi
}

show_current_status() {
    local current_context=$(kubectl config current-context)
    local current_namespace=$(kubectl config view --minify --output 'jsonpath={..namespace}')
    
    echo ""
    echo "📊 Current kubectl Status:"
    echo "   Context: ${current_context}"
    echo "   Namespace: ${current_namespace:-default}"
    echo "   Cluster: $(kubectl config view --minify --output 'jsonpath={..cluster}')"
    echo "   User: $(kubectl config view --minify --output 'jsonpath={..user}')"
    echo ""
    
    # Show some basic info about current namespace
    if [[ -n "$current_namespace" ]]; then
        echo "🏷️  Namespace Info:"
        kubectl get namespace "$current_namespace" -o jsonpath='{.metadata.labels}' 2>/dev/null | jq . || echo "   No additional labels"
        echo ""
        
        echo "📦 Resources in namespace:"
        kubectl get all --namespace="$current_namespace" 2>/dev/null | head -10 || echo "   No resources found or access denied"
    fi
}

list_contexts() {
    echo ""
    echo "📋 Available kubectl contexts:"
    kubectl config get-contexts
    echo ""
    
    echo "🏷️  Available namespaces:"
    kubectl get namespaces --show-labels 2>/dev/null || echo "   Access denied or cluster not reachable"
}

reset_configuration() {
    log_step "Resetting kubectl configuration..."
    
    echo -n "This will remove all kubectl contexts and aliases. Continue? (y/N): "
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        log_info "Reset cancelled"
        return 0
    fi
    
    # Remove contexts
    local environments=("dev" "staging" "production" "monitoring" "ingress" "security")
    for env in "${environments[@]}"; do
        local context_name="coinet-${env}"
        kubectl config delete-context "${context_name}" 2>/dev/null || true
    done
    
    # Remove aliases file
    rm -f ~/.kubectl_aliases
    
    log_success "kubectl configuration reset"
}

create_helpful_scripts() {
    log_step "Creating helper scripts..."
    
    # Create namespace info script
    cat > ~/.local/bin/kube-env-info << 'EOF'
#!/bin/bash
# Show detailed environment information

NAMESPACE=${1:-$(kubectl config view --minify --output 'jsonpath={..namespace}')}

if [[ -z "$NAMESPACE" ]]; then
    echo "❌ No namespace specified and no current namespace set"
    exit 1
fi

echo "🔍 Environment Information for: $NAMESPACE"
echo "================================================="

echo ""
echo "📊 Namespace Details:"
kubectl get namespace "$NAMESPACE" -o yaml 2>/dev/null | grep -A 10 -E "(labels|annotations):" || echo "   Access denied"

echo ""
echo "📈 Resource Quotas:"
kubectl get resourcequota -n "$NAMESPACE" 2>/dev/null || echo "   No resource quotas found"

echo ""
echo "🔒 Network Policies:"
kubectl get networkpolicy -n "$NAMESPACE" 2>/dev/null || echo "   No network policies found"

echo ""
echo "📦 Workloads:"
kubectl get deployments,statefulsets,daemonsets -n "$NAMESPACE" 2>/dev/null || echo "   No workloads found"

echo ""
echo "🔌 Services:"
kubectl get services -n "$NAMESPACE" 2>/dev/null || echo "   No services found"

echo ""
echo "💾 Storage:"
kubectl get pvc -n "$NAMESPACE" 2>/dev/null || echo "   No persistent volume claims found"
EOF
    
    chmod +x ~/.local/bin/kube-env-info 2>/dev/null || true
    
    # Create quick deployment script
    cat > ~/.local/bin/kube-quick-deploy << 'EOF'
#!/bin/bash
# Quick deployment to current namespace

APP_NAME=${1:-test-app}
IMAGE=${2:-nginx:alpine}
REPLICAS=${3:-1}

NAMESPACE=$(kubectl config view --minify --output 'jsonpath={..namespace}')

if [[ -z "$NAMESPACE" ]]; then
    echo "❌ No current namespace set"
    exit 1
fi

echo "🚀 Quick deploying $APP_NAME to namespace: $NAMESPACE"

kubectl create deployment "$APP_NAME" --image="$IMAGE" --replicas="$REPLICAS" -n "$NAMESPACE"
kubectl expose deployment "$APP_NAME" --port=80 --target-port=80 -n "$NAMESPACE"

echo "✅ Deployment created. Check status:"
echo "   kubectl get pods -n $NAMESPACE"
echo "   kubectl get services -n $NAMESPACE"
EOF
    
    chmod +x ~/.local/bin/kube-quick-deploy 2>/dev/null || true
    
    log_success "Helper scripts created"
}

# Parse command line arguments
COMMAND=""
ENVIRONMENT=""

while [[ $# -gt 0 ]]; do
    case $1 in
        setup|switch|status|list|reset|test)
            COMMAND="$1"
            shift
            ;;
        -c|--cluster-name)
            CLUSTER_NAME="$2"
            shift 2
            ;;
        -r|--region)
            AWS_REGION="$2"
            shift 2
            ;;
        -h|--help)
            print_usage
            exit 0
            ;;
        *)
            if [[ -z "$ENVIRONMENT" && "$COMMAND" == "switch" ]]; then
                ENVIRONMENT="$1"
                shift
            else
                log_error "Unknown option: $1"
                print_usage
                exit 1
            fi
            ;;
    esac
done

# Main execution
main() {
    print_header
    
    check_dependencies
    
    case "$COMMAND" in
        setup)
            log_info "Setting up kubectl configuration for cluster: ${CLUSTER_NAME}"
            setup_kubeconfig
            create_environment_contexts
            create_aliases
            create_helpful_scripts
            install_kubectl_plugins
            verify_cluster_access
            test_environment_access
            log_success "kubectl configuration setup complete!"
            echo ""
            echo "🎯 Quick Start:"
            echo "   • Switch environments: k-dev, k-staging, k-prod"
            echo "   • View status: $0 status"
            echo "   • List contexts: $0 list"
            echo "   • Test access: $0 test"
            echo ""
            echo "💡 Reload your shell or run: source ~/.kubectl_aliases"
            ;;
        switch)
            if [[ -z "$ENVIRONMENT" ]]; then
                log_error "Environment required for switch command"
                print_usage
                exit 1
            fi
            switch_environment "$ENVIRONMENT"
            ;;
        status)
            show_current_status
            ;;
        list)
            list_contexts
            ;;
        test)
            test_environment_access
            ;;
        reset)
            reset_configuration
            ;;
        *)
            log_error "No command specified"
            print_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@" 