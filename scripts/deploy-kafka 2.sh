#!/bin/bash

# =============================================================================
# COINET AI KAFKA DEPLOYMENT SCRIPT
# Automated Apache Kafka deployment with real-time messaging and monitoring
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
RELEASE_NAME="${RELEASE_NAME:-coinet-kafka}"
CHART_VERSION="${CHART_VERSION:-25.3.5}"
STORAGE_SIZE="${STORAGE_SIZE:-100Gi}"
MEMORY_LIMIT="${MEMORY_LIMIT:-4Gi}"
CPU_LIMIT="${CPU_LIMIT:-2000m}"
KAFKA_REPLICAS="${KAFKA_REPLICAS:-3}"
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
    
    # Add Bitnami Helm repository for Kafka
    helm repo add bitnami https://charts.bitnami.com/bitnami || true
    
    # Add Confluent Helm repository for additional components
    helm repo add confluentinc https://confluentinc.github.io/cp-helm-charts/ || true
    
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

# Function to deploy Kafka topics configuration
deploy_topics_config() {
    log_step "Deploying Kafka topics configuration..."
    
    # Apply topic configurations
    kubectl apply -f k8s/databases/kafka-topics.yaml
    
    log_success "Kafka topics configuration deployed"
}

# Function to deploy Kafka using Helm
deploy_kafka() {
    log_step "Deploying Apache Kafka with Helm..."
    
    local helm_args=(
        "upgrade" "--install" "$RELEASE_NAME"
        "bitnami/kafka"
        "--namespace" "$NAMESPACE"
        "--version" "$CHART_VERSION"
        "--values" "k8s/databases/kafka-values.yaml"
        "--wait"
        "--timeout" "900s"
    )
    
    # Add dry-run flag if specified
    if [ "$DRY_RUN" = "true" ]; then
        helm_args+=("--dry-run" "--debug")
        log_info "Running in dry-run mode"
    fi
    
    # Override values with environment variables
    helm_args+=(
        "--set" "kafka.replicaCount=$KAFKA_REPLICAS"
        "--set" "zookeeper.replicaCount=$ZOOKEEPER_REPLICAS"
        "--set" "kafka.persistence.size=$STORAGE_SIZE"
        "--set" "kafka.resources.limits.memory=$MEMORY_LIMIT"
        "--set" "kafka.resources.limits.cpu=$CPU_LIMIT"
        "--set" "global.storageClass=fast-ssd"
    )
    
    # Execute Helm deployment
    helm "${helm_args[@]}"
    
    if [ "$DRY_RUN" = "false" ]; then
        log_success "Apache Kafka deployed successfully"
    else
        log_info "Dry-run completed successfully"
        return 0
    fi
}

# Function to wait for deployment to be ready
wait_for_deployment() {
    log_step "Waiting for Kafka cluster to be ready..."
    
    # Wait for Kafka StatefulSet to be ready
    kubectl wait --for=condition=Ready statefulset/"$RELEASE_NAME" -n "$NAMESPACE" --timeout=600s
    
    # Wait for Zookeeper StatefulSet to be ready
    kubectl wait --for=condition=Ready statefulset/"$RELEASE_NAME-zookeeper" -n "$NAMESPACE" --timeout=600s
    
    # Wait for pods to be ready
    kubectl wait --for=condition=Ready pod -l app.kubernetes.io/name=kafka -n "$NAMESPACE" --timeout=300s
    kubectl wait --for=condition=Ready pod -l app.kubernetes.io/name=zookeeper -n "$NAMESPACE" --timeout=300s
    
    log_success "Kafka cluster is ready"
}

# Function to validate deployment
validate_deployment() {
    log_step "Validating Kafka deployment..."
    
    # Check if Kafka StatefulSet is running
    local kafka_status
    kafka_status=$(kubectl get statefulset "$RELEASE_NAME" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
    
    if [ "$kafka_status" -ge "$KAFKA_REPLICAS" ]; then
        log_success "Kafka StatefulSet is running with $kafka_status replica(s)"
    else
        log_error "Kafka StatefulSet is not ready"
        return 1
    fi
    
    # Check if Zookeeper StatefulSet is running
    local zk_status
    zk_status=$(kubectl get statefulset "$RELEASE_NAME-zookeeper" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
    
    if [ "$zk_status" -ge "$ZOOKEEPER_REPLICAS" ]; then
        log_success "Zookeeper StatefulSet is running with $zk_status replica(s)"
    else
        log_error "Zookeeper StatefulSet is not ready"
        return 1
    fi
    
    # Check if services are available
    if kubectl get service "$RELEASE_NAME" -n "$NAMESPACE" &> /dev/null; then
        log_success "Kafka service is available"
    else
        log_error "Kafka service is not available"
        return 1
    fi
    
    # Test Kafka connection
    log_info "Testing Kafka connection..."
    kubectl run kafka-test-client \
        --image=confluentinc/cp-kafka:7.5.0 \
        --rm -i --restart=Never \
        --namespace="$NAMESPACE" \
        --command -- kafka-topics \
        --bootstrap-server "$RELEASE_NAME.$NAMESPACE.svc.cluster.local:9092" \
        --list || {
        log_error "Kafka connection test failed"
        return 1
    }
    
    log_success "Kafka connection test passed"
}

# Function to create Kafka topics
create_topics() {
    log_step "Creating Kafka topics..."
    
    # Run the topic creation job
    kubectl apply -f k8s/databases/kafka-topics.yaml
    
    # Wait for the job to complete
    kubectl wait --for=condition=complete job/kafka-topic-creator -n "$NAMESPACE" --timeout=600s
    
    # Show job logs
    log_info "Topic creation job logs:"
    kubectl logs job/kafka-topic-creator -n "$NAMESPACE"
    
    log_success "Kafka topics created successfully"
}

# Function to setup monitoring
setup_monitoring() {
    log_step "Setting up Kafka monitoring..."
    
    # Deploy ServiceMonitor for Prometheus
    cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kafka-metrics
  namespace: $NAMESPACE
  labels:
    app.kubernetes.io/name: kafka
    app.kubernetes.io/instance: $RELEASE_NAME
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: kafka
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
  name: kafka-alerts
  namespace: $NAMESPACE
  labels:
    app.kubernetes.io/name: kafka
    app.kubernetes.io/instance: $RELEASE_NAME
spec:
  groups:
  - name: kafka
    rules:
    - alert: KafkaDown
      expr: up{job="kafka-metrics"} == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Kafka broker is down"
        description: "Kafka broker {{ \$labels.instance }} has been down for more than 5 minutes."
    
    - alert: KafkaHighProducerLatency
      expr: kafka_producer_request_latency_avg > 1000
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Kafka high producer latency"
        description: "Kafka producer latency is above 1000ms on {{ \$labels.instance }}."
    
    - alert: KafkaHighConsumerLag
      expr: kafka_consumer_lag_max > 10000
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "Kafka high consumer lag"
        description: "Kafka consumer lag is above 10000 on {{ \$labels.instance }}."
    
    - alert: KafkaUnderReplicatedPartitions
      expr: kafka_cluster_partition_under_replicated > 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Kafka under-replicated partitions"
        description: "Kafka has {{ \$value }} under-replicated partitions."
EOF
    
    log_success "Monitoring configuration deployed"
}

# Function to display connection information
display_connection_info() {
    log_step "Displaying connection information..."
    
    echo ""
    echo -e "${CYAN}=== KAFKA CONNECTION INFORMATION ===${NC}"
    echo ""
    echo -e "${GREEN}Service Name:${NC} $RELEASE_NAME"
    echo -e "${GREEN}Namespace:${NC} $NAMESPACE"
    echo -e "${GREEN}Kafka Port:${NC} 9092"
    echo -e "${GREEN}Zookeeper Port:${NC} 2181"
    echo ""
    echo -e "${GREEN}Internal DNS:${NC}"
    echo "  Kafka: $RELEASE_NAME.$NAMESPACE.svc.cluster.local:9092"
    echo "  Zookeeper: $RELEASE_NAME-zookeeper.$NAMESPACE.svc.cluster.local:2181"
    echo ""
    echo -e "${GREEN}Environment Variables:${NC}"
    echo "  KAFKA_BROKERS=$RELEASE_NAME.$NAMESPACE.svc.cluster.local:9092"
    echo "  KAFKA_ZOOKEEPER_CONNECT=$RELEASE_NAME-zookeeper.$NAMESPACE.svc.cluster.local:2181"
    echo ""
    echo -e "${GREEN}Schema Registry:${NC}"
    echo "  URL: http://$RELEASE_NAME-schema-registry.$NAMESPACE.svc.cluster.local:8081"
    echo ""
    echo -e "${GREEN}Kafka Connect:${NC}"
    echo "  URL: http://$RELEASE_NAME-connect.$NAMESPACE.svc.cluster.local:8083"
    echo ""
    echo -e "${GREEN}Kafka Manager UI:${NC}"
    echo "  URL: http://$RELEASE_NAME-ui.$NAMESPACE.svc.cluster.local:9000"
    echo ""
}

# Function to show deployment status
show_status() {
    log_step "Checking deployment status..."
    
    echo ""
    echo -e "${CYAN}=== KAFKA CLUSTER STATUS ===${NC}"
    echo ""
    
    # Show Kafka StatefulSet status
    echo -e "${GREEN}Kafka StatefulSet Status:${NC}"
    kubectl get statefulset "$RELEASE_NAME" -n "$NAMESPACE" -o wide
    echo ""
    
    # Show Zookeeper StatefulSet status
    echo -e "${GREEN}Zookeeper StatefulSet Status:${NC}"
    kubectl get statefulset "$RELEASE_NAME-zookeeper" -n "$NAMESPACE" -o wide
    echo ""
    
    # Show Pod status
    echo -e "${GREEN}Pod Status:${NC}"
    kubectl get pods -l app.kubernetes.io/component=kafka -n "$NAMESPACE" -o wide
    echo ""
    
    # Show Service status
    echo -e "${GREEN}Service Status:${NC}"
    kubectl get service -l app.kubernetes.io/component=kafka -n "$NAMESPACE" -o wide
    echo ""
    
    # Show PVC status
    echo -e "${GREEN}Persistent Volume Status:${NC}"
    kubectl get pvc -l app.kubernetes.io/component=kafka -n "$NAMESPACE" -o wide
    echo ""
    
    # Show topic list
    echo -e "${GREEN}Kafka Topics:${NC}"
    kubectl run kafka-topics-list \
        --image=confluentinc/cp-kafka:7.5.0 \
        --rm -i --restart=Never \
        --namespace="$NAMESPACE" \
        --command -- kafka-topics \
        --bootstrap-server "$RELEASE_NAME.$NAMESPACE.svc.cluster.local:9092" \
        --list 2>/dev/null || echo "Could not list topics"
    echo ""
}

# Function to cleanup deployment
cleanup() {
    log_step "Cleaning up Kafka deployment..."
    
    # Remove Helm release
    helm uninstall "$RELEASE_NAME" -n "$NAMESPACE" || true
    
    # Remove topic creation job
    kubectl delete job kafka-topic-creator -n "$NAMESPACE" || true
    
    # Remove configmaps
    kubectl delete configmap kafka-topics-config -n "$NAMESPACE" || true
    kubectl delete configmap kafka-topic-schemas -n "$NAMESPACE" || true
    
    # Remove monitoring resources
    kubectl delete servicemonitor kafka-metrics -n "$NAMESPACE" || true
    kubectl delete prometheusrule kafka-alerts -n "$NAMESPACE" || true
    
    log_success "Cleanup completed"
}

# Function to show help
show_help() {
    echo "Apache Kafka Deployment Script"
    echo ""
    echo "Usage: $0 [OPTIONS] COMMAND"
    echo ""
    echo "COMMANDS:"
    echo "  deploy      Deploy Kafka cluster to Kubernetes"
    echo "  status      Show deployment status"
    echo "  validate    Validate deployment"
    echo "  topics      Create Kafka topics"
    echo "  cleanup     Remove Kafka deployment"
    echo "  help        Show this help message"
    echo ""
    echo "OPTIONS:"
    echo "  --namespace NAME         Kubernetes namespace (default: default)"
    echo "  --release-name NAME      Helm release name (default: coinet-kafka)"
    echo "  --storage-size SIZE      Storage size (default: 100Gi)"
    echo "  --memory-limit SIZE      Memory limit (default: 4Gi)"
    echo "  --cpu-limit SIZE         CPU limit (default: 2000m)"
    echo "  --kafka-replicas NUM     Number of Kafka replicas (default: 3)"
    echo "  --zookeeper-replicas NUM Number of Zookeeper replicas (default: 3)"
    echo "  --dry-run               Run in dry-run mode"
    echo "  --skip-deps             Skip dependency installation"
    echo ""
    echo "ENVIRONMENT VARIABLES:"
    echo "  NAMESPACE                Kubernetes namespace"
    echo "  RELEASE_NAME             Helm release name"
    echo "  STORAGE_SIZE             Storage size for PVC"
    echo "  MEMORY_LIMIT             Memory limit for pods"
    echo "  CPU_LIMIT                CPU limit for pods"
    echo "  KAFKA_REPLICAS           Number of Kafka replicas"
    echo "  ZOOKEEPER_REPLICAS       Number of Zookeeper replicas"
    echo "  DRY_RUN                  Enable dry-run mode"
    echo ""
    echo "EXAMPLES:"
    echo "  $0 deploy                           # Deploy with defaults"
    echo "  $0 --namespace production deploy    # Deploy to production namespace"
    echo "  $0 --kafka-replicas 5 deploy       # Deploy with 5 Kafka replicas"
    echo "  $0 --dry-run deploy                # Test deployment without applying"
    echo "  $0 status                          # Check deployment status"
    echo "  $0 topics                          # Create Kafka topics"
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
            --kafka-replicas)
                KAFKA_REPLICAS="$2"
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
            deploy|status|validate|topics|cleanup|help)
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
            deploy_topics_config
            deploy_kafka
            if [ "$DRY_RUN" = "false" ]; then
                wait_for_deployment
                validate_deployment
                create_topics
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
        topics)
            create_topics
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
echo "         COINET AI KAFKA DEPLOYMENT SCRIPT"
echo "         Production-Ready Real-Time Messaging Platform"
echo "================================================================="
echo -e "${NC}"

main 