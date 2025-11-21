#!/bin/bash
# =============================================================================
# COINET AI TIMESCALEDB DEPLOYMENT SCRIPT - ENHANCED INTEGRATION
# Automated deployment of TimescaleDB with Kafka-ClickHouse integration
# =============================================================================

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
NAMESPACE="default"
RELEASE_NAME="timescaledb-ha"
CHART_REPO="timescale"
CHART_NAME="timescaledb-single"
VALUES_FILE="${PROJECT_ROOT}/k8s/databases/timescaledb-values-enhanced.yaml"
SECRETS_FILE="${PROJECT_ROOT}/k8s/databases/timescaledb-secrets-enhanced.yaml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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
    
    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check if jq is available for JSON processing
    if ! command -v jq &> /dev/null; then
        log_warning "jq is not available - some features may not work"
    fi
    
    log_success "Prerequisites check completed"
}

# Setup Helm repository
setup_helm_repo() {
    log_info "Setting up Helm repository..."
    
    # Add TimescaleDB Helm repository
    if ! helm repo list | grep -q "^${CHART_REPO}"; then
        log_info "Adding TimescaleDB Helm repository..."
        helm repo add timescale https://charts.timescale.com/
    else
        log_info "TimescaleDB Helm repository already exists"
    fi
    
    # Update repositories
    helm repo update
    log_success "Helm repository setup completed"
}

# Create storage class if needed
create_storage_class() {
    log_info "Checking storage class..."
    
    if ! kubectl get storageclass fast-ssd &> /dev/null; then
        log_info "Creating fast-ssd storage class..."
        
        cat <<EOF | kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/host-path
parameters:
  type: DirectoryOrCreate
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
EOF
        log_success "Storage class created"
    else
        log_info "Storage class fast-ssd already exists"
    fi
}

# Deploy secrets and config maps
deploy_secrets() {
    log_info "Deploying TimescaleDB secrets and configuration..."
    
    if [[ -f "${SECRETS_FILE}" ]]; then
        kubectl apply -f "${SECRETS_FILE}"
        log_success "Secrets and configuration deployed"
    else
        log_error "Secrets file not found: ${SECRETS_FILE}"
        exit 1
    fi
}

# Deploy TimescaleDB using Helm
deploy_timescaledb() {
    log_info "Deploying TimescaleDB with Helm..."
    
    if ! helm list -n "${NAMESPACE}" | grep -q "${RELEASE_NAME}"; then
        log_info "Installing TimescaleDB..."
        
        helm install "${RELEASE_NAME}" "${CHART_REPO}/${CHART_NAME}" \
            --namespace "${NAMESPACE}" \
            --values "${VALUES_FILE}" \
            --wait \
            --timeout=10m
            
        log_success "TimescaleDB installation completed"
    else
        log_info "TimescaleDB already installed, upgrading..."
        
        helm upgrade "${RELEASE_NAME}" "${CHART_REPO}/${CHART_NAME}" \
            --namespace "${NAMESPACE}" \
            --values "${VALUES_FILE}" \
            --wait \
            --timeout=10m
            
        log_success "TimescaleDB upgrade completed"
    fi
}

# Wait for TimescaleDB to be ready
wait_for_readiness() {
    log_info "Waiting for TimescaleDB to be ready..."
    
    # Wait for StatefulSet to be ready
    kubectl wait --for=condition=Ready pod -l app.kubernetes.io/name=timescaledb \
        --namespace="${NAMESPACE}" --timeout=300s
    
    # Wait for service to be available
    kubectl wait --for=condition=Ready endpoints "${RELEASE_NAME}" \
        --namespace="${NAMESPACE}" --timeout=300s
    
    log_success "TimescaleDB is ready"
}

# Validate deployment
validate_deployment() {
    log_info "Validating TimescaleDB deployment..."
    
    # Check StatefulSet status
    if kubectl get statefulset "${RELEASE_NAME}" -n "${NAMESPACE}" &> /dev/null; then
        local ready_replicas
        ready_replicas=$(kubectl get statefulset "${RELEASE_NAME}" -n "${NAMESPACE}" -o jsonpath='{.status.readyReplicas}')
        local desired_replicas
        desired_replicas=$(kubectl get statefulset "${RELEASE_NAME}" -n "${NAMESPACE}" -o jsonpath='{.spec.replicas}')
        
        if [[ "${ready_replicas}" == "${desired_replicas}" ]]; then
            log_success "StatefulSet is healthy (${ready_replicas}/${desired_replicas} replicas ready)"
        else
            log_error "StatefulSet is not healthy (${ready_replicas}/${desired_replicas} replicas ready)"
            return 1
        fi
    else
        log_error "StatefulSet ${RELEASE_NAME} not found"
        return 1
    fi
    
    # Check service
    if kubectl get service "${RELEASE_NAME}" -n "${NAMESPACE}" &> /dev/null; then
        log_success "Service is available"
    else
        log_error "Service ${RELEASE_NAME} not found"
        return 1
    fi
    
    # Test database connection
    test_database_connection
}

# Test database connection
test_database_connection() {
    log_info "Testing database connection..."
    
    # Create a temporary pod to test connection
    local test_pod="timescaledb-test-$$"
    
    kubectl run "${test_pod}" --image=postgres:15 --restart=Never --rm -i --quiet \
        --env="PGPASSWORD=timescale-admin-2024!" \
        --command -- psql \
        -h "${RELEASE_NAME}.${NAMESPACE}.svc.cluster.local" \
        -U postgres \
        -d coinet_timeseries \
        -c "SELECT version(), current_database();" &> /dev/null
    
    if [[ $? -eq 0 ]]; then
        log_success "Database connection test passed"
    else
        log_error "Database connection test failed"
        return 1
    fi
}

# Setup database schema and initial data
setup_database_schema() {
    log_info "Setting up database schema..."
    
    # The schema setup is handled by initScripts in the Helm values
    # We can verify that the schema was created properly
    
    local test_pod="timescaledb-schema-test-$$"
    
    # Test if TimescaleDB extension is loaded
    local extension_check
    extension_check=$(kubectl run "${test_pod}" --image=postgres:15 --restart=Never --rm -i --quiet \
        --env="PGPASSWORD=timescale-admin-2024!" \
        --command -- psql \
        -h "${RELEASE_NAME}.${NAMESPACE}.svc.cluster.local" \
        -U postgres \
        -d coinet_timeseries \
        -t -c "SELECT COUNT(*) FROM pg_extension WHERE extname='timescaledb';" 2>/dev/null || echo "0")
    
    if [[ "${extension_check// /}" == "1" ]]; then
        log_success "TimescaleDB extension is loaded"
    else
        log_error "TimescaleDB extension is not loaded"
        return 1
    fi
    
    # Test if schemas exist
    local schema_count
    schema_count=$(kubectl run "${test_pod}" --image=postgres:15 --restart=Never --rm -i --quiet \
        --env="PGPASSWORD=timescale-admin-2024!" \
        --command -- psql \
        -h "${RELEASE_NAME}.${NAMESPACE}.svc.cluster.local" \
        -U postgres \
        -d coinet_timeseries \
        -t -c "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name IN ('market_data', 'social_data', 'news_data', 'onchain_data', 'analytics');" 2>/dev/null || echo "0")
    
    if [[ "${schema_count// /}" == "5" ]]; then
        log_success "All required schemas are created"
    else
        log_error "Not all required schemas are created (found ${schema_count// /}/5)"
        return 1
    fi
    
    log_success "Database schema setup validated"
}

# Setup monitoring
setup_monitoring() {
    log_info "Setting up monitoring for TimescaleDB..."
    
    # Create ServiceMonitor for Prometheus
    cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: timescaledb-metrics
  namespace: ${NAMESPACE}
  labels:
    app: timescaledb
    component: database
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: timescaledb
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
EOF

    # Create PrometheusRule for alerts
    cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: timescaledb-alerts
  namespace: ${NAMESPACE}
  labels:
    app: timescaledb
    component: database
spec:
  groups:
  - name: timescaledb
    rules:
    - alert: TimescaleDBDown
      expr: pg_up == 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "TimescaleDB is down"
        description: "TimescaleDB instance {{ \$labels.instance }} is down for more than 1 minute"
    
    - alert: TimescaleDBHighConnections
      expr: pg_stat_database_numbackends / pg_settings_max_connections > 0.8
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "TimescaleDB high connection usage"
        description: "TimescaleDB instance {{ \$labels.instance }} is using {{ \$value }}% of max connections"
    
    - alert: TimescaleDBHighReplicationLag
      expr: pg_replication_lag_seconds > 60
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "TimescaleDB high replication lag"
        description: "TimescaleDB replication lag is {{ \$value }} seconds"
EOF

    log_success "Monitoring setup completed"
}

# Display connection information
display_connection_info() {
    log_info "TimescaleDB connection information:"
    
    echo -e "\n${GREEN}=== TIMESCALEDB CONNECTION DETAILS ===${NC}"
    echo -e "${BLUE}Service Name:${NC} ${RELEASE_NAME}.${NAMESPACE}.svc.cluster.local"
    echo -e "${BLUE}Port:${NC} 5432"
    echo -e "${BLUE}Database:${NC} coinet_timeseries"
    echo -e "${BLUE}Admin User:${NC} postgres"
    
    echo -e "\n${GREEN}=== APPLICATION USERS ===${NC}"
    echo -e "${BLUE}Analytics User:${NC} coinet_analytics (read-only)"
    echo -e "${BLUE}Ingest User:${NC} coinet_ingest (read/write)"
    echo -e "${BLUE}Context User:${NC} coinet_context (read-only)"
    
    echo -e "\n${GREEN}=== CONNECTION STRINGS ===${NC}"
    echo -e "${BLUE}Ingest Service:${NC} postgresql://coinet_ingest:ingest-2024!@${RELEASE_NAME}.${NAMESPACE}.svc.cluster.local:5432/coinet_timeseries"
    echo -e "${BLUE}Context Service:${NC} postgresql://coinet_context:context-2024!@${RELEASE_NAME}.${NAMESPACE}.svc.cluster.local:5432/coinet_timeseries"
    echo -e "${BLUE}Analytics Service:${NC} postgresql://coinet_analytics:analytics-2024!@${RELEASE_NAME}.${NAMESPACE}.svc.cluster.local:5432/coinet_timeseries"
    
    echo -e "\n${GREEN}=== SCHEMAS CREATED ===${NC}"
    echo -e "${BLUE}•${NC} market_data - Price candles, order books, trade data"
    echo -e "${BLUE}•${NC} social_data - Sentiment scores, social mentions"
    echo -e "${BLUE}•${NC} news_data - News articles, impact analysis"
    echo -e "${BLUE}•${NC} onchain_data - Network metrics, blockchain data"
    echo -e "${BLUE}•${NC} analytics - Aggregated data and analytics tables"
    
    echo -e "\n${GREEN}=== HYPERTABLES CREATED ===${NC}"
    echo -e "${BLUE}•${NC} market_data.price_candles (1h chunks)"
    echo -e "${BLUE}•${NC} market_data.order_book_snapshots (30m chunks)"
    echo -e "${BLUE}•${NC} social_data.sentiment_scores (1h chunks)"
    echo -e "${BLUE}•${NC} news_data.news_impact (2h chunks)"
    echo -e "${BLUE}•${NC} onchain_data.network_metrics (1h chunks)"
    
    echo -e "\n${GREEN}=== NEXT STEPS ===${NC}"
    echo -e "${BLUE}1.${NC} Update your services to use the TimescaleDB connection strings"
    echo -e "${BLUE}2.${NC} Configure your ingest service to write time-series data to TimescaleDB"
    echo -e "${BLUE}3.${NC} Set up data retention policies for automatic cleanup"
    echo -e "${BLUE}4.${NC} Configure monitoring and alerting for the database"
    echo -e "${BLUE}5.${NC} Test the integration with your Kafka-ClickHouse pipeline"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up TimescaleDB deployment..."
    
    # Delete Helm release
    helm uninstall "${RELEASE_NAME}" --namespace "${NAMESPACE}" || true
    
    # Delete secrets and config maps
    kubectl delete -f "${SECRETS_FILE}" || true
    
    # Delete monitoring resources
    kubectl delete servicemonitor timescaledb-metrics -n "${NAMESPACE}" || true
    kubectl delete prometheusrule timescaledb-alerts -n "${NAMESPACE}" || true
    
    # Delete PVCs (optional - comment out to preserve data)
    # kubectl delete pvc -l app.kubernetes.io/name=timescaledb -n "${NAMESPACE}" || true
    
    log_success "Cleanup completed"
}

# Show status
show_status() {
    log_info "TimescaleDB deployment status:"
    
    echo -e "\n${GREEN}=== HELM RELEASE ===${NC}"
    helm list -n "${NAMESPACE}" | grep "${RELEASE_NAME}" || echo "Release not found"
    
    echo -e "\n${GREEN}=== PODS ===${NC}"
    kubectl get pods -l app.kubernetes.io/name=timescaledb -n "${NAMESPACE}" || true
    
    echo -e "\n${GREEN}=== SERVICES ===${NC}"
    kubectl get services -l app.kubernetes.io/name=timescaledb -n "${NAMESPACE}" || true
    
    echo -e "\n${GREEN}=== PERSISTENT VOLUMES ===${NC}"
    kubectl get pvc -l app.kubernetes.io/name=timescaledb -n "${NAMESPACE}" || true
    
    echo -e "\n${GREEN}=== SECRETS ===${NC}"
    kubectl get secrets | grep timescaledb || true
}

# Main function
main() {
    local command="${1:-deploy}"
    
    case "${command}" in
        "deploy")
            log_info "Starting TimescaleDB deployment..."
            check_prerequisites
            setup_helm_repo
            create_storage_class
            deploy_secrets
            deploy_timescaledb
            wait_for_readiness
            validate_deployment
            setup_database_schema
            setup_monitoring
            display_connection_info
            log_success "TimescaleDB deployment completed successfully!"
            ;;
        
        "status")
            show_status
            ;;
        
        "validate")
            log_info "Validating TimescaleDB deployment..."
            validate_deployment
            setup_database_schema
            log_success "Validation completed"
            ;;
        
        "cleanup")
            cleanup
            ;;
        
        "help"|"-h"|"--help")
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  deploy    Deploy TimescaleDB (default)"
            echo "  status    Show deployment status"
            echo "  validate  Validate existing deployment"
            echo "  cleanup   Remove TimescaleDB deployment"
            echo "  help      Show this help message"
            ;;
        
        *)
            log_error "Unknown command: ${command}"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@" 