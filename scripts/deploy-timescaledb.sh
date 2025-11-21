#!/bin/bash

# =============================================================================
# COINET AI TIMESCALEDB DEPLOYMENT SCRIPT
# Automated TimescaleDB deployment with high availability and monitoring
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
NAMESPACE="${NAMESPACE:-default}"
RELEASE_NAME="${RELEASE_NAME:-coinet-timescaledb}"
CHART_VERSION="${CHART_VERSION:-0.31.0}"
STORAGE_SIZE="${STORAGE_SIZE:-100Gi}"
MEMORY_LIMIT="${MEMORY_LIMIT:-2Gi}"
CPU_LIMIT="${CPU_LIMIT:-1000m}"
DRY_RUN="${DRY_RUN:-false}"
SKIP_DEPENDENCIES="${SKIP_DEPENDENCIES:-false}"

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

# Function to check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    # Check if kubectl is available
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check if helm is available
    if ! command -v helm &> /dev/null; then
        log_error "helm is not installed or not in PATH"
        exit 1
    fi
    
    # Check kubectl connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check if namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_warning "Namespace '$NAMESPACE' does not exist, creating it..."
        kubectl create namespace "$NAMESPACE"
        kubectl label namespace "$NAMESPACE" name="$NAMESPACE"
    fi
    
    log_success "Prerequisites check completed"
}

# Function to add Helm repositories
setup_helm_repos() {
    log_step "Setting up Helm repositories..."
    
    # Add TimescaleDB Helm repository
    helm repo add timescale https://charts.timescale.com/ || true
    
    # Add Bitnami repository for PostgreSQL dependencies
    helm repo add bitnami https://charts.bitnami.com/bitnami || true
    
    # Update repositories
    helm repo update
    
    log_success "Helm repositories configured"
}

# Function to create storage class if needed
create_storage_class() {
    log_step "Creating fast SSD storage class..."
    
    cat <<EOF | kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
  labels:
    app.kubernetes.io/name: fast-ssd
    app.kubernetes.io/component: storage
    app.kubernetes.io/part-of: coinet-ai
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
  fsType: ext4
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Retain
EOF
    
    log_success "Fast SSD storage class created"
}

# Function to deploy secrets and config
deploy_secrets() {
    log_step "Deploying TimescaleDB secrets and configuration..."
    
    # Apply secrets
    kubectl apply -f k8s/databases/timescaledb-secrets.yaml
    
    # Wait for secrets to be created
    kubectl wait --for=condition=Ready secret/timescaledb-credentials -n "$NAMESPACE" --timeout=60s
    
    log_success "Secrets and configuration deployed"
}

# Function to deploy TimescaleDB using Helm
deploy_timescaledb() {
    log_step "Deploying TimescaleDB with Helm..."
    
    local helm_args=(
        "upgrade" "--install" "$RELEASE_NAME"
        "timescale/timescaledb-single"
        "--namespace" "$NAMESPACE"
        "--version" "$CHART_VERSION"
        "--values" "k8s/databases/timescaledb-values.yaml"
        "--wait"
        "--timeout" "600s"
    )
    
    # Add dry-run flag if specified
    if [ "$DRY_RUN" = "true" ]; then
        helm_args+=("--dry-run" "--debug")
        log_info "Running in dry-run mode"
    fi
    
    # Override values with environment variables
    helm_args+=(
        "--set" "persistence.size=$STORAGE_SIZE"
        "--set" "resources.limits.memory=$MEMORY_LIMIT"
        "--set" "resources.limits.cpu=$CPU_LIMIT"
        "--set" "image.tag=pg15-latest"
    )
    
    # Execute Helm deployment
    helm "${helm_args[@]}"
    
    if [ "$DRY_RUN" = "false" ]; then
        log_success "TimescaleDB deployed successfully"
    else
        log_info "Dry-run completed successfully"
        return 0
    fi
}

# Function to wait for deployment to be ready
wait_for_deployment() {
    log_step "Waiting for TimescaleDB to be ready..."
    
    # Wait for StatefulSet to be ready
    kubectl wait --for=condition=Ready statefulset/"$RELEASE_NAME" -n "$NAMESPACE" --timeout=600s
    
    # Wait for pods to be ready
    kubectl wait --for=condition=Ready pod -l app.kubernetes.io/name=timescaledb -n "$NAMESPACE" --timeout=300s
    
    log_success "TimescaleDB is ready"
}

# Function to validate deployment
validate_deployment() {
    log_step "Validating TimescaleDB deployment..."
    
    # Check if StatefulSet is running
    local sts_status
    sts_status=$(kubectl get statefulset "$RELEASE_NAME" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
    
    if [ "$sts_status" -ge "1" ]; then
        log_success "StatefulSet is running with $sts_status replica(s)"
    else
        log_error "StatefulSet is not ready"
        return 1
    fi
    
    # Check if service is available
    if kubectl get service "$RELEASE_NAME" -n "$NAMESPACE" &> /dev/null; then
        log_success "TimescaleDB service is available"
    else
        log_error "TimescaleDB service is not available"
        return 1
    fi
    
    # Test database connection
    log_info "Testing database connection..."
    kubectl run test-timescaledb-connection \
        --image=postgres:15 \
        --rm -i --restart=Never \
        --namespace="$NAMESPACE" \
        --env="PGPASSWORD=coinet-timescale-2024!" \
        --command -- psql \
        -h "$RELEASE_NAME.$NAMESPACE.svc.cluster.local" \
        -U coinet \
        -d coinet_timeseries \
        -c "SELECT version(), current_database(), current_user;" || {
        log_error "Database connection test failed"
        return 1
    }
    
    log_success "Database connection test passed"
}

# Function to create database schema and extensions
setup_database_schema() {
    log_step "Setting up database schema and extensions..."
    
    # Execute initialization scripts
    local init_pod
    init_pod=$(kubectl get pods -l app.kubernetes.io/name=timescaledb -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}')
    
    log_info "Executing initialization scripts on pod: $init_pod"
    
    # Create extensions and schemas
    kubectl exec -n "$NAMESPACE" "$init_pod" -- psql -U coinet -d coinet_timeseries -c "
        CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
        CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
        CREATE EXTENSION IF NOT EXISTS pgcrypto;
        CREATE EXTENSION IF NOT EXISTS uuid-ossp;
        
        CREATE SCHEMA IF NOT EXISTS market_data;
        CREATE SCHEMA IF NOT EXISTS social_data;
        CREATE SCHEMA IF NOT EXISTS news_data;
        CREATE SCHEMA IF NOT EXISTS onchain_data;
        CREATE SCHEMA IF NOT EXISTS analytics;
    "
    
    log_success "Database schema initialized"
}

# Function to setup monitoring
setup_monitoring() {
    log_step "Setting up TimescaleDB monitoring..."
    
    # Deploy ServiceMonitor for Prometheus
    cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: timescaledb-metrics
  namespace: $NAMESPACE
  labels:
    app.kubernetes.io/name: timescaledb
    app.kubernetes.io/instance: $RELEASE_NAME
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: timescaledb
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
EOF
    
    # Deploy PrometheusRule for alerts
    cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: timescaledb-alerts
  namespace: $NAMESPACE
  labels:
    app.kubernetes.io/name: timescaledb
    app.kubernetes.io/instance: $RELEASE_NAME
spec:
  groups:
  - name: timescaledb
    rules:
    - alert: TimescaleDBDown
      expr: up{job="timescaledb-metrics"} == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "TimescaleDB is down"
        description: "TimescaleDB instance {{ \$labels.instance }} has been down for more than 5 minutes."
    
    - alert: TimescaleDBHighConnections
      expr: pg_stat_database_numbackends / pg_settings_max_connections > 0.8
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "TimescaleDB high connection usage"
        description: "TimescaleDB instance {{ \$labels.instance }} is using {{ \$value }}% of available connections."
    
    - alert: TimescaleDBHighDiskUsage
      expr: (pg_database_size_bytes / on(instance) pg_filesystem_size_bytes) > 0.85
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "TimescaleDB high disk usage"
        description: "TimescaleDB instance {{ \$labels.instance }} disk usage is above 85%."
EOF
    
    log_success "Monitoring configuration deployed"
}

# Function to display connection information
display_connection_info() {
    log_step "Displaying connection information..."
    
    echo ""
    echo -e "${CYAN}=== TIMESCALEDB CONNECTION INFORMATION ===${NC}"
    echo ""
    echo -e "${GREEN}Service Name:${NC} $RELEASE_NAME"
    echo -e "${GREEN}Namespace:${NC} $NAMESPACE"
    echo -e "${GREEN}Port:${NC} 5432"
    echo ""
    echo -e "${GREEN}Internal DNS:${NC} $RELEASE_NAME.$NAMESPACE.svc.cluster.local"
    echo ""
    echo -e "${GREEN}Connection Strings:${NC}"
    echo "  Admin: postgresql://coinet:coinet-timescale-2024!@$RELEASE_NAME.$NAMESPACE.svc.cluster.local:5432/coinet_timeseries"
    echo "  Ingest: postgresql://coinet_ingest:ingest-readwrite-2024!@$RELEASE_NAME.$NAMESPACE.svc.cluster.local:5432/coinet_timeseries"
    echo "  Context: postgresql://coinet_context:context-app-2024!@$RELEASE_NAME.$NAMESPACE.svc.cluster.local:5432/coinet_timeseries"
    echo "  Analytics: postgresql://coinet_analytics:analytics-readonly-2024!@$RELEASE_NAME.$NAMESPACE.svc.cluster.local:5432/coinet_timeseries"
    echo ""
    echo -e "${GREEN}Environment Variables:${NC}"
    echo "  TIMESCALEDB_HOST=$RELEASE_NAME.$NAMESPACE.svc.cluster.local"
    echo "  TIMESCALEDB_PORT=5432"
    echo "  TIMESCALEDB_DATABASE=coinet_timeseries"
    echo ""
    echo -e "${GREEN}Kubernetes Secrets:${NC}"
    echo "  timescaledb-credentials (main credentials)"
    echo "  timescaledb-connection-strings (connection URLs)"
    echo "  timescaledb-env-dev (development environment)"
    echo "  timescaledb-env-staging (staging environment)"
    echo "  timescaledb-env-production (production environment)"
    echo ""
}

# Function to show deployment status
show_status() {
    log_step "Checking deployment status..."
    
    echo ""
    echo -e "${CYAN}=== TIMESCALEDB STATUS ===${NC}"
    echo ""
    
    # Show StatefulSet status
    echo -e "${GREEN}StatefulSet Status:${NC}"
    kubectl get statefulset "$RELEASE_NAME" -n "$NAMESPACE" -o wide
    echo ""
    
    # Show Pod status
    echo -e "${GREEN}Pod Status:${NC}"
    kubectl get pods -l app.kubernetes.io/name=timescaledb -n "$NAMESPACE" -o wide
    echo ""
    
    # Show Service status
    echo -e "${GREEN}Service Status:${NC}"
    kubectl get service "$RELEASE_NAME" -n "$NAMESPACE" -o wide
    echo ""
    
    # Show PVC status
    echo -e "${GREEN}Persistent Volume Status:${NC}"
    kubectl get pvc -l app.kubernetes.io/name=timescaledb -n "$NAMESPACE" -o wide
    echo ""
    
    # Show events
    echo -e "${GREEN}Recent Events:${NC}"
    kubectl get events -n "$NAMESPACE" --field-selector involvedObject.name="$RELEASE_NAME" --sort-by='.lastTimestamp' | tail -10
    echo ""
}

# Function to cleanup deployment
cleanup() {
    log_step "Cleaning up TimescaleDB deployment..."
    
    # Remove Helm release
    helm uninstall "$RELEASE_NAME" -n "$NAMESPACE" || true
    
    # Remove secrets
    kubectl delete secret timescaledb-credentials -n "$NAMESPACE" || true
    kubectl delete secret timescaledb-connection-strings -n "$NAMESPACE" || true
    kubectl delete configmap timescaledb-config -n "$NAMESPACE" || true
    
    # Remove monitoring resources
    kubectl delete servicemonitor timescaledb-metrics -n "$NAMESPACE" || true
    kubectl delete prometheusrule timescaledb-alerts -n "$NAMESPACE" || true
    
    log_success "Cleanup completed"
}

# Function to show help
show_help() {
    echo "TimescaleDB Deployment Script"
    echo ""
    echo "Usage: $0 [OPTIONS] COMMAND"
    echo ""
    echo "COMMANDS:"
    echo "  deploy      Deploy TimescaleDB to Kubernetes"
    echo "  status      Show deployment status"
    echo "  validate    Validate deployment"
    echo "  cleanup     Remove TimescaleDB deployment"
    echo "  help        Show this help message"
    echo ""
    echo "OPTIONS:"
    echo "  --namespace NAME      Kubernetes namespace (default: default)"
    echo "  --release-name NAME   Helm release name (default: coinet-timescaledb)"
    echo "  --storage-size SIZE   Storage size (default: 100Gi)"
    echo "  --memory-limit SIZE   Memory limit (default: 2Gi)"
    echo "  --cpu-limit SIZE      CPU limit (default: 1000m)"
    echo "  --dry-run            Run in dry-run mode"
    echo "  --skip-deps          Skip dependency installation"
    echo ""
    echo "ENVIRONMENT VARIABLES:"
    echo "  NAMESPACE            Kubernetes namespace"
    echo "  RELEASE_NAME         Helm release name"
    echo "  STORAGE_SIZE         Storage size for PVC"
    echo "  MEMORY_LIMIT         Memory limit for pods"
    echo "  CPU_LIMIT            CPU limit for pods"
    echo "  DRY_RUN              Enable dry-run mode"
    echo ""
    echo "EXAMPLES:"
    echo "  $0 deploy                           # Deploy with defaults"
    echo "  $0 --namespace production deploy    # Deploy to production namespace"
    echo "  $0 --storage-size 200Gi deploy     # Deploy with 200GB storage"
    echo "  $0 --dry-run deploy                # Test deployment without applying"
    echo "  $0 status                          # Check deployment status"
    echo "  $0 cleanup                         # Remove deployment"
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            --release-name)
                RELEASE_NAME="$2"
                shift 2
                ;;
            --storage-size)
                STORAGE_SIZE="$2"
                shift 2
                ;;
            --memory-limit)
                MEMORY_LIMIT="$2"
                shift 2
                ;;
            --cpu-limit)
                CPU_LIMIT="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN="true"
                shift
                ;;
            --skip-deps)
                SKIP_DEPENDENCIES="true"
                shift
                ;;
            deploy|status|validate|cleanup|help)
                COMMAND="$1"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Main execution function
main() {
    local command="${COMMAND:-help}"
    
    case $command in
        deploy)
            check_prerequisites
            if [ "$SKIP_DEPENDENCIES" = "false" ]; then
                setup_helm_repos
            fi
            create_storage_class
            deploy_secrets
            deploy_timescaledb
            if [ "$DRY_RUN" = "false" ]; then
                wait_for_deployment
                validate_deployment
                setup_database_schema
                setup_monitoring
                display_connection_info
                show_status
            fi
            ;;
        status)
            show_status
            ;;
        validate)
            validate_deployment
            ;;
        cleanup)
            cleanup
            ;;
        help)
            show_help
            ;;
        *)
            log_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Parse arguments and execute
parse_args "$@"

# Display banner
echo -e "${CYAN}"
echo "================================================================="
echo "         COINET AI TIMESCALEDB DEPLOYMENT SCRIPT"
echo "         Production-Ready Time-Series Database Setup"
echo "================================================================="
echo -e "${NC}"

main 