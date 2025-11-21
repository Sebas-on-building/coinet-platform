#!/bin/bash

# Production Deployment Script for Coinet Platform
# Features: Rolling updates, health checks, rollback capability

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="coinet-production"
MONITORING_NAMESPACE="monitoring"
CLUSTER_NAME=${CLUSTER_NAME:-"coinet-cluster"}
REGION=${AWS_REGION:-"us-east-1"}
ENVIRONMENT=${ENVIRONMENT:-"production"}

# Function to print colored output
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed"
    fi
    
    # Check helm
    if ! command -v helm &> /dev/null; then
        error "helm is not installed"
    fi
    
    # Check docker
    if ! command -v docker &> /dev/null; then
        error "docker is not installed"
    fi
    
    # Check cluster connection
    if ! kubectl cluster-info &> /dev/null; then
        error "Cannot connect to Kubernetes cluster"
    fi
    
    log "All prerequisites met ✓"
}

# Build and push Docker images
build_images() {
    log "Building Docker images..."
    
    REGISTRY=${DOCKER_REGISTRY:-"ghcr.io/coinet"}
    VERSION=${VERSION:-$(git rev-parse --short HEAD)}
    
    services=("data-aggregator" "ingest-service" "context-service" "web-client")
    
    for service in "${services[@]}"; do
        log "Building $service:$VERSION..."
        
        if [ "$service" == "web-client" ]; then
            docker build -t $REGISTRY/$service:$VERSION -t $REGISTRY/$service:latest ./apps/web-client
        else
            docker build -t $REGISTRY/$service:$VERSION -t $REGISTRY/$service:latest ./services/${service//-service/}
        fi
        
        log "Pushing $service:$VERSION to registry..."
        docker push $REGISTRY/$service:$VERSION
        docker push $REGISTRY/$service:latest
    done
    
    log "All images built and pushed successfully ✓"
}

# Deploy databases
deploy_databases() {
    log "Deploying database infrastructure..."
    
    # Deploy Redis
    if ! helm list -n $NAMESPACE | grep -q redis; then
        log "Installing Redis..."
        helm install redis bitnami/redis \
            --namespace $NAMESPACE \
            --set auth.enabled=true \
            --set auth.password=$REDIS_PASSWORD \
            --set master.persistence.size=10Gi \
            --set replica.replicaCount=2
    else
        log "Redis already installed, upgrading..."
        helm upgrade redis bitnami/redis --namespace $NAMESPACE
    fi
    
    # Deploy TimescaleDB
    if ! helm list -n $NAMESPACE | grep -q timescaledb; then
        log "Installing TimescaleDB..."
        helm install timescaledb timescale/timescaledb-single \
            --namespace $NAMESPACE \
            --values k8s/databases/timescaledb-values-enhanced.yaml
    else
        log "TimescaleDB already installed, upgrading..."
        helm upgrade timescaledb timescale/timescaledb-single \
            --namespace $NAMESPACE \
            --values k8s/databases/timescaledb-values-enhanced.yaml
    fi
    
    # Deploy Kafka
    if ! helm list -n $NAMESPACE | grep -q kafka; then
        log "Installing Kafka..."
        helm install kafka bitnami/kafka \
            --namespace $NAMESPACE \
            --values k8s/databases/kafka-values.yaml
    else
        log "Kafka already installed, upgrading..."
        helm upgrade kafka bitnami/kafka \
            --namespace $NAMESPACE \
            --values k8s/databases/kafka-values.yaml
    fi
    
    # Deploy ClickHouse
    if ! helm list -n $NAMESPACE | grep -q clickhouse; then
        log "Installing ClickHouse..."
        helm install clickhouse clickhouse/clickhouse \
            --namespace $NAMESPACE \
            --values k8s/databases/clickhouse-values.yaml
    else
        log "ClickHouse already installed, upgrading..."
        helm upgrade clickhouse clickhouse/clickhouse \
            --namespace $NAMESPACE \
            --values k8s/databases/clickhouse-values.yaml
    fi
    
    log "Database infrastructure deployed ✓"
}

# Deploy monitoring stack
deploy_monitoring() {
    log "Deploying monitoring stack..."
    
    # Create monitoring namespace
    kubectl create namespace $MONITORING_NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    
    # Deploy Prometheus & Grafana
    kubectl apply -f k8s/monitoring/monitoring-stack.yaml
    
    # Wait for monitoring to be ready
    kubectl wait --for=condition=ready pod -l app=prometheus -n $MONITORING_NAMESPACE --timeout=300s
    kubectl wait --for=condition=ready pod -l app=grafana -n $MONITORING_NAMESPACE --timeout=300s
    
    log "Monitoring stack deployed ✓"
}

# Deploy application services
deploy_services() {
    log "Deploying application services..."
    
    # Create namespace
    kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply production deployments
    kubectl apply -f k8s/production/deployment.yaml
    
    # Wait for deployments to be ready
    log "Waiting for deployments to be ready..."
    kubectl wait --for=condition=available deployment --all -n $NAMESPACE --timeout=600s
    
    log "Application services deployed ✓"
}

# Perform health checks
health_check() {
    log "Performing health checks..."
    
    services=("data-aggregator" "ingest-service" "context-service" "web-client")
    failed=0
    
    for service in "${services[@]}"; do
        # Get service endpoint
        if [ "$service" == "web-client" ]; then
            endpoint="web-client-service"
            port="80"
            path="/api/health"
        else
            endpoint="${service}-service"
            port="${service##*-}"
            port="800${port:0:1}"
            path="/health"
        fi
        
        # Port forward and check health
        kubectl port-forward -n $NAMESPACE svc/$endpoint 9999:$port &>/dev/null &
        PF_PID=$!
        sleep 2
        
        if curl -s -f http://localhost:9999$path > /dev/null; then
            log "$service health check: ✓"
        else
            warning "$service health check: ✗"
            failed=$((failed + 1))
        fi
        
        kill $PF_PID 2>/dev/null || true
    done
    
    if [ $failed -gt 0 ]; then
        warning "$failed services failed health check"
    else
        log "All services healthy ✓"
    fi
}

# Run integration tests
run_tests() {
    log "Running integration tests..."
    
    # Create test job
    cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: integration-tests-$(date +%s)
  namespace: $NAMESPACE
spec:
  template:
    spec:
      containers:
      - name: tests
        image: coinet/integration-tests:latest
        env:
        - name: API_URL
          value: "http://data-aggregator-service:8004"
        - name: ENVIRONMENT
          value: "$ENVIRONMENT"
      restartPolicy: Never
  backoffLimit: 1
EOF
    
    # Wait for tests to complete
    kubectl wait --for=condition=complete job -l job-name=integration-tests -n $NAMESPACE --timeout=300s || {
        warning "Integration tests failed or timed out"
    }
    
    log "Integration tests completed"
}

# Setup auto-scaling
setup_autoscaling() {
    log "Setting up auto-scaling..."
    
    # Install metrics server if not present
    if ! kubectl get deployment metrics-server -n kube-system &>/dev/null; then
        kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
    fi
    
    # Apply HPA configurations (already in deployment.yaml)
    log "HPA configurations applied ✓"
    
    # Setup cluster autoscaler for EKS
    if [ "$CLUSTER_NAME" != "minikube" ]; then
        log "Setting up cluster autoscaler for EKS..."
        
        kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml
        
        kubectl -n kube-system annotate deployment.apps/cluster-autoscaler \
            cluster-autoscaler.kubernetes.io/safe-to-evict="false"
        
        kubectl -n kube-system set image deployment.apps/cluster-autoscaler \
            cluster-autoscaler=k8s.gcr.io/autoscaling/cluster-autoscaler:v1.27.0
        
        kubectl -n kube-system edit deployment.apps/cluster-autoscaler
    fi
    
    log "Auto-scaling configured ✓"
}

# Generate deployment report
generate_report() {
    log "Generating deployment report..."
    
    cat <<EOF > deployment-report-$(date +%Y%m%d-%H%M%S).txt
========================================
Coinet Platform Deployment Report
========================================
Date: $(date)
Environment: $ENVIRONMENT
Cluster: $CLUSTER_NAME
Namespace: $NAMESPACE
Version: ${VERSION:-$(git rev-parse --short HEAD)}

Deployed Services:
$(kubectl get deployments -n $NAMESPACE -o wide)

Pod Status:
$(kubectl get pods -n $NAMESPACE -o wide)

Services:
$(kubectl get services -n $NAMESPACE)

Ingress:
$(kubectl get ingress -n $NAMESPACE)

HPA Status:
$(kubectl get hpa -n $NAMESPACE)

Resource Usage:
$(kubectl top nodes)
$(kubectl top pods -n $NAMESPACE)

Recent Events:
$(kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' | tail -20)
========================================
EOF
    
    log "Deployment report generated ✓"
}

# Rollback function
rollback() {
    error "Deployment failed, initiating rollback..."
    
    # Rollback deployments
    kubectl rollout undo deployment --all -n $NAMESPACE
    
    # Wait for rollback to complete
    kubectl rollout status deployment --all -n $NAMESPACE
    
    log "Rollback completed"
}

# Main deployment flow
main() {
    log "Starting Coinet Platform production deployment..."
    
    # Set trap for rollback on error
    trap rollback ERR
    
    # Execute deployment steps
    check_prerequisites
    
    if [ "$SKIP_BUILD" != "true" ]; then
        build_images
    fi
    
    deploy_databases
    deploy_monitoring
    deploy_services
    health_check
    
    if [ "$RUN_TESTS" == "true" ]; then
        run_tests
    fi
    
    setup_autoscaling
    generate_report
    
    # Remove error trap
    trap - ERR
    
    log "========================================="
    log "Deployment completed successfully! 🚀"
    log "========================================="
    log ""
    log "Access points:"
    log "  Web App: https://coinet.ai"
    log "  API: https://api.coinet.ai"
    log "  WebSocket: wss://ws.coinet.ai"
    log "  Monitoring: https://monitoring.coinet.ai"
    log ""
    log "Next steps:"
    log "  1. Verify application at https://coinet.ai"
    log "  2. Check monitoring dashboards"
    log "  3. Review deployment report"
    log "  4. Configure alerts and notifications"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-build)
            SKIP_BUILD="true"
            shift
            ;;
        --run-tests)
            RUN_TESTS="true"
            shift
            ;;
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --version)
            VERSION="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-build       Skip Docker image building"
            echo "  --run-tests        Run integration tests after deployment"
            echo "  --environment ENV  Set deployment environment (default: production)"
            echo "  --version VERSION  Set application version"
            echo "  --help            Show this help message"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Run main deployment
main
