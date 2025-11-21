#!/bin/bash

# =============================================================================
# COINET AI CLICKHOUSE DEPLOYMENT SCRIPT
# Automated ClickHouse deployment for analytical workloads and OLAP queries
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
RELEASE_NAME="${RELEASE_NAME:-coinet-clickhouse}"
CHART_VERSION="${CHART_VERSION:-0.21.2}"
STORAGE_SIZE="${STORAGE_SIZE:-500Gi}"
MEMORY_LIMIT="${MEMORY_LIMIT:-16Gi}"
CPU_LIMIT="${CPU_LIMIT:-4000m}"
CLICKHOUSE_REPLICAS="${CLICKHOUSE_REPLICAS:-3}"
ZOOKEEPER_REPLICAS="${ZOOKEEPER_REPLICAS:-3}"
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
    
    # Add Altinity ClickHouse Operator repository
    helm repo add altinity https://docs.altinity.com/clickhouse-operator/ || true
    
    # Add ClickHouse repository
    helm repo add clickhouse https://charts.clickhouse.com/ || true
    
    # Update repositories
    helm repo update
    
    log_success "Helm repositories configured"
}

# Function to create storage class if needed
create_storage_class() {
    log_step "Ensuring fast SSD storage class exists..."
    
    if ! kubectl get storageclass fast-ssd &> /dev/null; then
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
    else
        log_info "Fast SSD storage class already exists"
    fi
}

# Function to deploy ClickHouse secrets and configuration
deploy_secrets() {
    log_step "Deploying ClickHouse secrets and configuration..."
    
    # Apply secrets and configs
    kubectl apply -f k8s/databases/clickhouse-secrets.yaml
    
    # Wait for secrets to be created
    kubectl wait --for=condition=Ready secret/clickhouse-credentials -n "$NAMESPACE" --timeout=60s || true
    
    log_success "Secrets and configuration deployed"
}

# Function to deploy ClickHouse Operator
deploy_operator() {
    log_step "Deploying ClickHouse Operator..."
    
    # Check if operator is already installed
    if kubectl get deployment clickhouse-operator -n "$NAMESPACE" &> /dev/null; then
        log_info "ClickHouse Operator already exists, skipping..."
        return 0
    fi
    
    # Deploy ClickHouse Operator
    helm upgrade --install clickhouse-operator altinity/altinity-clickhouse-operator \
        --namespace "$NAMESPACE" \
        --version "$CHART_VERSION" \
        --wait \
        --timeout 600s
    
    log_success "ClickHouse Operator deployed successfully"
}

# Function to create ClickHouse cluster using CRD
deploy_clickhouse_cluster() {
    log_step "Deploying ClickHouse cluster..."
    
    cat <<EOF | kubectl apply -f -
apiVersion: "clickhouse.altinity.com/v1"
kind: "ClickHouseInstallation"
metadata:
  name: "$RELEASE_NAME"
  namespace: "$NAMESPACE"
  labels:
    app.kubernetes.io/name: clickhouse
    app.kubernetes.io/instance: $RELEASE_NAME
    app.kubernetes.io/component: analytics
    app.kubernetes.io/part-of: coinet-ai
spec:
  configuration:
    clusters:
      - name: "coinet-cluster"
        layout:
          shardsCount: 1
          replicasCount: $CLICKHOUSE_REPLICAS
    
    zookeeper:
      nodes:
        - host: "coinet-clickhouse-zookeeper-0.coinet-clickhouse-zookeeper"
          port: 2181
        - host: "coinet-clickhouse-zookeeper-1.coinet-clickhouse-zookeeper"
          port: 2181
        - host: "coinet-clickhouse-zookeeper-2.coinet-clickhouse-zookeeper"
          port: 2181
    
    users:
      default/password: "clickhouse-admin-2024!"
      default/networks/ip:
        - "::/0"
      coinet_analyst/password: "analyst-readonly-2024!"
      coinet_analyst/profile: "readonly"
      coinet_etl/password: "etl-readwrite-2024!"
      coinet_kafka/password: "kafka-integration-2024!"
    
    profiles:
      readonly/readonly: "1"
      readonly/max_memory_usage: "5000000000"
      readonly/max_execution_time: "1800"
      default/max_memory_usage: "10000000000"
      default/max_execution_time: "3600"
      default/max_concurrent_queries: "100"
    
    settings:
      compression/case/method: "zstd"
      distributed_ddl/path: "/clickhouse/task_queue/ddl"
      kafka/security_protocol: "plaintext"
      
  defaults:
    templates:
      podTemplate: clickhouse-pod-template
      dataVolumeClaimTemplate: data-volume-template
      logVolumeClaimTemplate: log-volume-template
      serviceTemplate: clickhouse-service-template
  
  templates:
    podTemplates:
      - name: clickhouse-pod-template
        spec:
          containers:
            - name: clickhouse
              image: clickhouse/clickhouse-server:23.12.2.59-alpine
              resources:
                requests:
                  memory: 8Gi
                  cpu: 2000m
                limits:
                  memory: $MEMORY_LIMIT
                  cpu: $CPU_LIMIT
              ports:
                - name: http
                  containerPort: 8123
                - name: tcp
                  containerPort: 9000
                - name: mysql
                  containerPort: 9004
                - name: postgresql
                  containerPort: 9005
                - name: interserver
                  containerPort: 9009
              livenessProbe:
                httpGet:
                  path: /ping
                  port: 8123
                initialDelaySeconds: 30
                periodSeconds: 30
                timeoutSeconds: 5
              readinessProbe:
                httpGet:
                  path: /ping
                  port: 8123
                initialDelaySeconds: 10
                periodSeconds: 10
                timeoutSeconds: 5
              securityContext:
                runAsUser: 101
                runAsNonRoot: true
          nodeSelector:
            kubernetes.io/arch: amd64
          affinity:
            podAntiAffinity:
              requiredDuringSchedulingIgnoredDuringExecution:
                - labelSelector:
                    matchExpressions:
                      - key: "app.kubernetes.io/name"
                        operator: In
                        values:
                          - clickhouse
                  topologyKey: "kubernetes.io/hostname"
    
    volumeClaimTemplates:
      - name: data-volume-template
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: $STORAGE_SIZE
          storageClassName: fast-ssd
      
      - name: log-volume-template
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 50Gi
          storageClassName: fast-ssd
    
    serviceTemplates:
      - name: clickhouse-service-template
        generateName: "clickhouse-{chi}"
        spec:
          ports:
            - name: http
              port: 8123
              targetPort: 8123
            - name: tcp
              port: 9000
              targetPort: 9000
          type: ClusterIP
EOF
    
    if [ "$DRY_RUN" = "false" ]; then
        log_success "ClickHouse cluster deployed successfully"
    else
        log_info "Dry-run completed successfully"
    fi
}

# Function to deploy ZooKeeper for ClickHouse replication
deploy_zookeeper() {
    log_step "Deploying ZooKeeper for ClickHouse replication..."
    
    # Check if ZooKeeper is already running
    if kubectl get statefulset coinet-clickhouse-zookeeper -n "$NAMESPACE" &> /dev/null; then
        log_info "ZooKeeper already exists, skipping..."
        return 0
    fi
    
    # Deploy ZooKeeper using bitnami chart
    helm upgrade --install coinet-clickhouse-zookeeper bitnami/zookeeper \
        --namespace "$NAMESPACE" \
        --set replicaCount=$ZOOKEEPER_REPLICAS \
        --set persistence.enabled=true \
        --set persistence.size=20Gi \
        --set persistence.storageClass=fast-ssd \
        --set resources.requests.memory=512Mi \
        --set resources.requests.cpu=250m \
        --set resources.limits.memory=1Gi \
        --set resources.limits.cpu=500m \
        --wait \
        --timeout 600s
    
    log_success "ZooKeeper deployed successfully"
}

# Function to wait for deployment to be ready
wait_for_deployment() {
    log_step "Waiting for ClickHouse cluster to be ready..."
    
    # Wait for ClickHouse installation to be ready
    kubectl wait --for=condition=Completed clickhouseinstallation/"$RELEASE_NAME" -n "$NAMESPACE" --timeout=900s || true
    
    # Wait for pods to be ready
    kubectl wait --for=condition=Ready pod -l app.kubernetes.io/name=clickhouse -n "$NAMESPACE" --timeout=600s || true
    
    log_success "ClickHouse cluster is ready"
}

# Function to validate deployment
validate_deployment() {
    log_step "Validating ClickHouse deployment..."
    
    # Check if ClickHouse pods are running
    local clickhouse_pods
    clickhouse_pods=$(kubectl get pods -l app.kubernetes.io/name=clickhouse -n "$NAMESPACE" --no-headers | wc -l)
    
    if [ "$clickhouse_pods" -ge "$CLICKHOUSE_REPLICAS" ]; then
        log_success "ClickHouse cluster is running with $clickhouse_pods pod(s)"
    else
        log_error "ClickHouse cluster is not ready"
        return 1
    fi
    
    # Check if service is available
    if kubectl get service -l app.kubernetes.io/name=clickhouse -n "$NAMESPACE" &> /dev/null; then
        log_success "ClickHouse service is available"
    else
        log_error "ClickHouse service is not available"
        return 1
    fi
    
    # Test ClickHouse connection
    log_info "Testing ClickHouse connection..."
    kubectl run clickhouse-test-client \
        --image=clickhouse/clickhouse-client:23.12.2.59-alpine \
        --rm -i --restart=Never \
        --namespace="$NAMESPACE" \
        --command -- clickhouse-client \
        --host="$RELEASE_NAME-0-0.$NAMESPACE.svc.cluster.local" \
        --port=9000 \
        --user=default \
        --password="clickhouse-admin-2024!" \
        --query="SELECT version()" || {
        log_error "ClickHouse connection test failed"
        return 1
    }
    
    log_success "ClickHouse connection test passed"
}

# Function to initialize database schema
setup_database_schema() {
    log_step "Setting up ClickHouse database schema..."
    
    # Create a temporary pod to run database initialization
    kubectl run clickhouse-init \
        --image=clickhouse/clickhouse-client:23.12.2.59-alpine \
        --rm -i --restart=Never \
        --namespace="$NAMESPACE" \
        --command -- /bin/sh -c "
        
        # Wait for ClickHouse to be ready
        until clickhouse-client --host='$RELEASE_NAME-0-0.$NAMESPACE.svc.cluster.local' --port=9000 --user=default --password='clickhouse-admin-2024!' --query='SELECT 1'; do
            echo 'Waiting for ClickHouse to be ready...'
            sleep 5
        done
        
        echo 'ClickHouse is ready, creating databases...'
        
        # Create databases
        clickhouse-client --host='$RELEASE_NAME-0-0.$NAMESPACE.svc.cluster.local' --port=9000 --user=default --password='clickhouse-admin-2024!' --query='CREATE DATABASE IF NOT EXISTS coinet_analytics'
        clickhouse-client --host='$RELEASE_NAME-0-0.$NAMESPACE.svc.cluster.local' --port=9000 --user=default --password='clickhouse-admin-2024!' --query='CREATE DATABASE IF NOT EXISTS market_analytics'
        clickhouse-client --host='$RELEASE_NAME-0-0.$NAMESPACE.svc.cluster.local' --port=9000 --user=default --password='clickhouse-admin-2024!' --query='CREATE DATABASE IF NOT EXISTS social_analytics'
        clickhouse-client --host='$RELEASE_NAME-0-0.$NAMESPACE.svc.cluster.local' --port=9000 --user=default --password='clickhouse-admin-2024!' --query='CREATE DATABASE IF NOT EXISTS news_analytics'
        clickhouse-client --host='$RELEASE_NAME-0-0.$NAMESPACE.svc.cluster.local' --port=9000 --user=default --password='clickhouse-admin-2024!' --query='CREATE DATABASE IF NOT EXISTS onchain_analytics'
        
        echo 'Databases created successfully'
        
        # Create tables
        clickhouse-client --host='$RELEASE_NAME-0-0.$NAMESPACE.svc.cluster.local' --port=9000 --user=default --password='clickhouse-admin-2024!' --multiquery --query=\"
        
        -- Market data analytics tables
        CREATE TABLE IF NOT EXISTS market_analytics.price_history
        (
            timestamp DateTime64(3),
            symbol LowCardinality(String),
            exchange LowCardinality(String),
            price Float64,
            volume Float64,
            market_cap Float64,
            date Date MATERIALIZED toDate(timestamp)
        )
        ENGINE = MergeTree()
        PARTITION BY toYYYYMM(timestamp)
        ORDER BY (symbol, timestamp)
        TTL timestamp + INTERVAL 2 YEAR;
        
        -- OHLCV candles table
        CREATE TABLE IF NOT EXISTS market_analytics.ohlcv_candles
        (
            timestamp DateTime64(3),
            symbol LowCardinality(String),
            timeframe LowCardinality(String),
            open Float64,
            high Float64,
            low Float64,
            close Float64,
            volume Float64,
            trades UInt64,
            date Date MATERIALIZED toDate(timestamp)
        )
        ENGINE = MergeTree()
        PARTITION BY (toYYYYMM(timestamp), timeframe)
        ORDER BY (symbol, timeframe, timestamp)
        TTL timestamp + INTERVAL 3 YEAR;
        \"
        
        echo 'Tables created successfully'
        "
    
    log_success "Database schema initialized"
}

# Function to setup monitoring
setup_monitoring() {
    log_step "Setting up ClickHouse monitoring..."
    
    # Deploy ServiceMonitor for Prometheus
    cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: clickhouse-metrics
  namespace: $NAMESPACE
  labels:
    app.kubernetes.io/name: clickhouse
    app.kubernetes.io/instance: $RELEASE_NAME
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: clickhouse
  endpoints:
  - port: http
    interval: 30s
    path: /metrics
    params:
      query:
        - "SELECT * FROM system.metrics FORMAT Prometheus"
EOF
    
    # Deploy PrometheusRule for alerts
    cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: clickhouse-alerts
  namespace: $NAMESPACE
  labels:
    app.kubernetes.io/name: clickhouse
    app.kubernetes.io/instance: $RELEASE_NAME
spec:
  groups:
  - name: clickhouse
    rules:
    - alert: ClickHouseDown
      expr: up{job="clickhouse-metrics"} == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "ClickHouse server is down"
        description: "ClickHouse server {{ \$labels.instance }} has been down for more than 5 minutes."
    
    - alert: ClickHouseHighQueryTime
      expr: clickhouse_query_duration_seconds > 300
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "ClickHouse high query execution time"
        description: "ClickHouse query execution time is above 300 seconds on {{ \$labels.instance }}."
    
    - alert: ClickHouseHighMemoryUsage
      expr: clickhouse_memory_usage_bytes / clickhouse_memory_limit_bytes > 0.9
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "ClickHouse high memory usage"
        description: "ClickHouse memory usage is above 90% on {{ \$labels.instance }}."
    
    - alert: ClickHouseDiskSpaceRunningOut
      expr: clickhouse_disk_free_bytes / clickhouse_disk_total_bytes < 0.1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "ClickHouse disk space running out"
        description: "ClickHouse has less than 10% disk space remaining on {{ \$labels.instance }}."
EOF
    
    log_success "Monitoring configuration deployed"
}

# Function to display connection information
display_connection_info() {
    log_step "Displaying connection information..."
    
    echo ""
    echo -e "${CYAN}=== CLICKHOUSE CONNECTION INFORMATION ===${NC}"
    echo ""
    echo -e "${GREEN}Service Name:${NC} $RELEASE_NAME"
    echo -e "${GREEN}Namespace:${NC} $NAMESPACE"
    echo -e "${GREEN}HTTP Port:${NC} 8123"
    echo -e "${GREEN}TCP Port:${NC} 9000"
    echo ""
    echo -e "${GREEN}Internal DNS:${NC}"
    echo "  HTTP: $RELEASE_NAME-0-0.$NAMESPACE.svc.cluster.local:8123"
    echo "  TCP: $RELEASE_NAME-0-0.$NAMESPACE.svc.cluster.local:9000"
    echo ""
    echo -e "${GREEN}Connection Strings:${NC}"
    echo "  HTTP Admin: http://default:clickhouse-admin-2024!@$RELEASE_NAME-0-0.$NAMESPACE.svc.cluster.local:8123/coinet_analytics"
    echo "  TCP Admin: clickhouse://default:clickhouse-admin-2024!@$RELEASE_NAME-0-0.$NAMESPACE.svc.cluster.local:9000/coinet_analytics"
    echo "  Analytics: http://coinet_analyst:analyst-readonly-2024!@$RELEASE_NAME-0-0.$NAMESPACE.svc.cluster.local:8123/coinet_analytics"
    echo "  ETL: http://coinet_etl:etl-readwrite-2024!@$RELEASE_NAME-0-0.$NAMESPACE.svc.cluster.local:8123/coinet_analytics"
    echo ""
    echo -e "${GREEN}Environment Variables:${NC}"
    echo "  CLICKHOUSE_HOST=$RELEASE_NAME-0-0.$NAMESPACE.svc.cluster.local"
    echo "  CLICKHOUSE_HTTP_PORT=8123"
    echo "  CLICKHOUSE_TCP_PORT=9000"
    echo "  CLICKHOUSE_DATABASE=coinet_analytics"
    echo ""
    echo -e "${GREEN}Kubernetes Secrets:${NC}"
    echo "  clickhouse-credentials (main credentials)"
    echo "  clickhouse-connection-strings (connection URLs)"
    echo "  clickhouse-env-dev (development environment)"
    echo "  clickhouse-env-staging (staging environment)"
    echo "  clickhouse-env-production (production environment)"
    echo ""
}

# Function to show deployment status
show_status() {
    log_step "Checking deployment status..."
    
    echo ""
    echo -e "${CYAN}=== CLICKHOUSE CLUSTER STATUS ===${NC}"
    echo ""
    
    # Show ClickHouse Installation status
    echo -e "${GREEN}ClickHouse Installation Status:${NC}"
    kubectl get clickhouseinstallation "$RELEASE_NAME" -n "$NAMESPACE" -o wide || echo "No ClickHouse installation found"
    echo ""
    
    # Show Pod status
    echo -e "${GREEN}Pod Status:${NC}"
    kubectl get pods -l app.kubernetes.io/name=clickhouse -n "$NAMESPACE" -o wide
    echo ""
    
    # Show Service status
    echo -e "${GREEN}Service Status:${NC}"
    kubectl get service -l app.kubernetes.io/name=clickhouse -n "$NAMESPACE" -o wide
    echo ""
    
    # Show PVC status
    echo -e "${GREEN}Persistent Volume Status:${NC}"
    kubectl get pvc -l app.kubernetes.io/name=clickhouse -n "$NAMESPACE" -o wide
    echo ""
    
    # Show databases
    echo -e "${GREEN}ClickHouse Databases:${NC}"
    kubectl run clickhouse-show-databases \
        --image=clickhouse/clickhouse-client:23.12.2.59-alpine \
        --rm -i --restart=Never \
        --namespace="$NAMESPACE" \
        --command -- clickhouse-client \
        --host="$RELEASE_NAME-0-0.$NAMESPACE.svc.cluster.local" \
        --port=9000 \
        --user=default \
        --password="clickhouse-admin-2024!" \
        --query="SHOW DATABASES" 2>/dev/null || echo "Could not list databases"
    echo ""
}

# Function to cleanup deployment
cleanup() {
    log_step "Cleaning up ClickHouse deployment..."
    
    # Remove ClickHouse installation
    kubectl delete clickhouseinstallation "$RELEASE_NAME" -n "$NAMESPACE" || true
    
    # Remove ZooKeeper
    helm uninstall coinet-clickhouse-zookeeper -n "$NAMESPACE" || true
    
    # Remove ClickHouse Operator
    helm uninstall clickhouse-operator -n "$NAMESPACE" || true
    
    # Remove secrets and configs
    kubectl delete secret clickhouse-credentials -n "$NAMESPACE" || true
    kubectl delete secret clickhouse-connection-strings -n "$NAMESPACE" || true
    kubectl delete configmap clickhouse-config -n "$NAMESPACE" || true
    kubectl delete configmap clickhouse-init-scripts -n "$NAMESPACE" || true
    
    # Remove monitoring resources
    kubectl delete servicemonitor clickhouse-metrics -n "$NAMESPACE" || true
    kubectl delete prometheusrule clickhouse-alerts -n "$NAMESPACE" || true
    
    log_success "Cleanup completed"
}

# Function to show help
show_help() {
    echo "ClickHouse Deployment Script"
    echo ""
    echo "Usage: $0 [OPTIONS] COMMAND"
    echo ""
    echo "COMMANDS:"
    echo "  deploy      Deploy ClickHouse cluster to Kubernetes"
    echo "  status      Show deployment status"
    echo "  validate    Validate deployment"
    echo "  schema      Initialize database schema"
    echo "  cleanup     Remove ClickHouse deployment"
    echo "  help        Show this help message"
    echo ""
    echo "OPTIONS:"
    echo "  --namespace NAME         Kubernetes namespace (default: default)"
    echo "  --release-name NAME      Release name (default: coinet-clickhouse)"
    echo "  --storage-size SIZE      Storage size (default: 500Gi)"
    echo "  --memory-limit SIZE      Memory limit (default: 16Gi)"
    echo "  --cpu-limit SIZE         CPU limit (default: 4000m)"
    echo "  --clickhouse-replicas NUM Number of ClickHouse replicas (default: 3)"
    echo "  --zookeeper-replicas NUM Number of ZooKeeper replicas (default: 3)"
    echo "  --dry-run               Run in dry-run mode"
    echo "  --skip-deps             Skip dependency installation"
    echo ""
    echo "ENVIRONMENT VARIABLES:"
    echo "  NAMESPACE                Kubernetes namespace"
    echo "  RELEASE_NAME             Release name"
    echo "  STORAGE_SIZE             Storage size for PVC"
    echo "  MEMORY_LIMIT             Memory limit for pods"
    echo "  CPU_LIMIT                CPU limit for pods"
    echo "  CLICKHOUSE_REPLICAS      Number of ClickHouse replicas"
    echo "  ZOOKEEPER_REPLICAS       Number of ZooKeeper replicas"
    echo "  DRY_RUN                  Enable dry-run mode"
    echo ""
    echo "EXAMPLES:"
    echo "  $0 deploy                           # Deploy with defaults"
    echo "  $0 --namespace production deploy    # Deploy to production namespace"
    echo "  $0 --clickhouse-replicas 5 deploy  # Deploy with 5 ClickHouse replicas"
    echo "  $0 --dry-run deploy                # Test deployment without applying"
    echo "  $0 status                          # Check deployment status"
    echo "  $0 schema                          # Initialize database schema"
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
            --clickhouse-replicas)
                CLICKHOUSE_REPLICAS="$2"
                shift 2
                ;;
            --zookeeper-replicas)
                ZOOKEEPER_REPLICAS="$2"
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
            deploy|status|validate|schema|cleanup|help)
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
            deploy_zookeeper
            deploy_operator
            deploy_clickhouse_cluster
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
        schema)
            setup_database_schema
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
echo "         COINET AI CLICKHOUSE DEPLOYMENT SCRIPT"
echo "         Production-Ready Analytical Database (OLAP)"
echo "================================================================="
echo -e "${NC}"

main 