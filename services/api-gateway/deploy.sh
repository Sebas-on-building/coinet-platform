#!/bin/bash

# ============================================================================
# Coinet API Gateway - Production Deployment Script
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE=${NAMESPACE:-"coinet-production"}
REGISTRY=${DOCKER_REGISTRY:-"ghcr.io/coinet"}
VERSION=${VERSION:-$(git rev-parse --short HEAD)}
SERVICE_NAME="api-gateway"

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

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    command -v docker >/dev/null 2>&1 || error "Docker is not installed"
    command -v kubectl >/dev/null 2>&1 || error "kubectl is not installed"
    
    # Check cluster connection
    kubectl cluster-info >/dev/null 2>&1 || error "Cannot connect to Kubernetes cluster"
    
    log "Prerequisites check passed ✓"
}

# Build Docker image
build_image() {
    log "Building Docker image..."
    
    # Build the image
    docker build -t $REGISTRY/$SERVICE_NAME:$VERSION .
    docker tag $REGISTRY/$SERVICE_NAME:$VERSION $REGISTRY/$SERVICE_NAME:latest
    
    log "Image built: $REGISTRY/$SERVICE_NAME:$VERSION ✓"
}

# Push to registry
push_image() {
    log "Pushing image to registry..."
    
    docker push $REGISTRY/$SERVICE_NAME:$VERSION
    docker push $REGISTRY/$SERVICE_NAME:latest
    
    log "Image pushed to registry ✓"
}

# Create Kubernetes deployment
create_k8s_deployment() {
    log "Creating Kubernetes deployment..."
    
    cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $SERVICE_NAME
  namespace: $NAMESPACE
  labels:
    app: $SERVICE_NAME
    version: $VERSION
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  selector:
    matchLabels:
      app: $SERVICE_NAME
  template:
    metadata:
      labels:
        app: $SERVICE_NAME
        version: $VERSION
    spec:
      containers:
      - name: $SERVICE_NAME
        image: $REGISTRY/$SERVICE_NAME:$VERSION
        ports:
        - containerPort: 8000
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "8000"
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        - name: LOG_LEVEL
          value: "info"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        securityContext:
          runAsNonRoot: true
          runAsUser: 1001
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: false
          capabilities:
            drop:
            - ALL
            add:
            - NET_BIND_SERVICE
      securityContext:
        fsGroup: 1001
---
apiVersion: v1
kind: Service
metadata:
  name: $SERVICE_NAME-service
  namespace: $NAMESPACE
  labels:
    app: $SERVICE_NAME
spec:
  selector:
    app: $SERVICE_NAME
  ports:
  - name: http
    port: 80
    targetPort: 8000
    protocol: TCP
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: $SERVICE_NAME-ingress
  namespace: $NAMESPACE
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - api.coinet.ai
    secretName: api-gateway-tls
  rules:
  - host: api.coinet.ai
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: $SERVICE_NAME-service
            port:
              number: 80
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: $SERVICE_NAME-hpa
  namespace: $NAMESPACE
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: $SERVICE_NAME
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
EOF

    log "Kubernetes deployment created ✓"
}

# Wait for deployment
wait_for_deployment() {
    log "Waiting for deployment to be ready..."
    
    kubectl wait --for=condition=available deployment/$SERVICE_NAME -n $NAMESPACE --timeout=300s
    
    log "Deployment is ready ✓"
}

# Run health checks
run_health_checks() {
    log "Running health checks..."
    
    # Port forward for health check
    kubectl port-forward -n $NAMESPACE svc/$SERVICE_NAME-service 8000:80 &
    PF_PID=$!
    sleep 5
    
    # Health check
    if curl -s -f http://localhost:8000/health > /dev/null; then
        log "Health check passed ✓"
    else
        warning "Health check failed"
    fi
    
    # Cleanup
    kill $PF_PID 2>/dev/null || true
}

# Generate deployment report
generate_report() {
    log "Generating deployment report..."
    
    cat <<EOF > deployment-report-$VERSION.txt
========================================
Coinet API Gateway Deployment Report
========================================
Date: $(date)
Version: $VERSION
Namespace: $NAMESPACE
Image: $REGISTRY/$SERVICE_NAME:$VERSION

Deployment Status:
$(kubectl get deployment $SERVICE_NAME -n $NAMESPACE -o wide)

Pod Status:
$(kubectl get pods -l app=$SERVICE_NAME -n $NAMESPACE -o wide)

Service Status:
$(kubectl get service $SERVICE_NAME-service -n $NAMESPACE -o wide)

HPA Status:
$(kubectl get hpa $SERVICE_NAME-hpa -n $NAMESPACE)

Recent Events:
$(kubectl get events -n $NAMESPACE --field-selector involvedObject.name=$SERVICE_NAME --sort-by='.lastTimestamp' | tail -10)
========================================
EOF

    log "Deployment report generated: deployment-report-$VERSION.txt ✓"
}

# Rollback function
rollback() {
    error "Deployment failed, initiating rollback..."
    
    kubectl rollout undo deployment/$SERVICE_NAME -n $NAMESPACE
    kubectl rollout status deployment/$SERVICE_NAME -n $NAMESPACE
    
    log "Rollback completed"
}

# Main deployment flow
main() {
    log "Starting Coinet API Gateway deployment..."
    log "Version: $VERSION"
    log "Registry: $REGISTRY"
    log "Namespace: $NAMESPACE"
    
    # Set trap for rollback on error
    trap rollback ERR
    
    # Execute deployment steps
    check_prerequisites
    build_image
    push_image
    create_k8s_deployment
    wait_for_deployment
    run_health_checks
    generate_report
    
    # Remove error trap
    trap - ERR
    
    log "========================================="
    log "API Gateway deployment completed! 🚀"
    log "========================================="
    log ""
    log "Access points:"
    log "  API Gateway: https://api.coinet.ai"
    log "  Health Check: https://api.coinet.ai/health"
    log "  Metrics: https://api.coinet.ai/metrics"
    log "  Status: https://api.coinet.ai/status"
    log ""
    log "Monitoring:"
    log "  kubectl get pods -l app=$SERVICE_NAME -n $NAMESPACE"
    log "  kubectl logs -l app=$SERVICE_NAME -n $NAMESPACE -f"
    log "  kubectl describe deployment $SERVICE_NAME -n $NAMESPACE"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --version)
            VERSION="$2"
            shift 2
            ;;
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --registry)
            REGISTRY="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --version VERSION     Set application version"
            echo "  --namespace NAMESPACE Set Kubernetes namespace"
            echo "  --registry REGISTRY   Set Docker registry"
            echo "  --help               Show this help message"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Run main deployment
main
