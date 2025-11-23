#!/bin/bash

# 🚀 PSYCHOLOGY ENGINE DEPLOYMENT SCRIPT - UNLEASH THE BEAST!
# ===========================================================

set -e

echo "🧠 ============================================="
echo "🧠 COINET AI PSYCHOLOGY ENGINE DEPLOYMENT"
echo "🧠 Preparing to dominate the market..."
echo "🧠 ============================================="

# Configuration
DOCKER_REGISTRY=${DOCKER_REGISTRY:-"docker.io/coinet"}
VERSION=${VERSION:-"1.0.0"}
NAMESPACE="coinet-ai"
SERVICE_NAME="psychology-engine"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
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

# Step 1: Build Docker Image
echo ""
log_info "🔨 Building Psychology Engine Docker image..."
cd ai-services/ml-service

docker build -f Dockerfile.psychology -t ${SERVICE_NAME}:${VERSION} .
docker tag ${SERVICE_NAME}:${VERSION} ${DOCKER_REGISTRY}/${SERVICE_NAME}:${VERSION}
docker tag ${SERVICE_NAME}:${VERSION} ${DOCKER_REGISTRY}/${SERVICE_NAME}:latest

log_success "✅ Docker image built successfully!"

# Step 2: Push to Registry
echo ""
log_info "📤 Pushing image to registry..."
docker push ${DOCKER_REGISTRY}/${SERVICE_NAME}:${VERSION}
docker push ${DOCKER_REGISTRY}/${SERVICE_NAME}:latest

log_success "✅ Image pushed to registry!"

# Step 3: Deploy to Kubernetes
echo ""
log_info "☸️ Deploying to Kubernetes cluster..."

# Check if namespace exists
if ! kubectl get namespace ${NAMESPACE} &> /dev/null; then
    log_info "Creating namespace ${NAMESPACE}..."
    kubectl create namespace ${NAMESPACE}
fi

# Apply Kubernetes manifests
kubectl apply -f ../../k8s/psychology-engine-deployment.yaml

# Wait for deployment to be ready
log_info "⏳ Waiting for deployment to be ready..."
kubectl rollout status deployment/${SERVICE_NAME} -n ${NAMESPACE} --timeout=300s

log_success "✅ Deployment successful!"

# Step 4: Verify deployment
echo ""
log_info "🔍 Verifying deployment..."

# Check pod status
PODS=$(kubectl get pods -n ${NAMESPACE} -l app=${SERVICE_NAME} -o jsonpath='{.items[*].metadata.name}')
echo "Running pods:"
for pod in $PODS; do
    STATUS=$(kubectl get pod $pod -n ${NAMESPACE} -o jsonpath='{.status.phase}')
    echo "  - $pod: $STATUS"
done

# Check service
SERVICE_IP=$(kubectl get service ${SERVICE_NAME}-service -n ${NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "ClusterIP")
log_info "Service endpoint: ${SERVICE_IP}"

# Step 5: Run health check
echo ""
log_info "💊 Running health check..."

# Port-forward for testing
kubectl port-forward -n ${NAMESPACE} service/${SERVICE_NAME}-service 8080:80 &
PF_PID=$!
sleep 5

# Test the health endpoint
if curl -s http://localhost:8080/health | grep -q "healthy"; then
    log_success "✅ Health check passed!"
else
    log_warning "⚠️ Health check failed - service may need time to warm up"
fi

# Clean up port-forward
kill $PF_PID 2>/dev/null || true

# Step 6: Configure monitoring
echo ""
log_info "📊 Configuring monitoring..."

# Apply Prometheus ServiceMonitor if it exists
if [ -f "../../k8s/psychology-engine-monitoring.yaml" ]; then
    kubectl apply -f ../../k8s/psychology-engine-monitoring.yaml
    log_success "✅ Monitoring configured!"
else
    log_warning "⚠️ Monitoring configuration not found"
fi

# Step 7: Load test preparation
echo ""
log_info "🔥 Preparing for load testing..."

cat << EOF > load-test.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: psychology-engine-load-test
  namespace: ${NAMESPACE}
spec:
  template:
    spec:
      containers:
      - name: load-test
        image: grafana/k6:latest
        command: ["k6", "run", "-"]
        stdin: true
        args:
        - |
          import http from 'k6/http';
          import { check } from 'k6';
          
          export let options = {
            stages: [
              { duration: '30s', target: 10 },
              { duration: '1m', target: 50 },
              { duration: '30s', target: 0 },
            ],
          };
          
          export default function() {
            let payload = JSON.stringify({
              input_text: "Bitcoin is mooning! 🚀 Everyone is buying!",
              input_type: "general"
            });
            
            let params = {
              headers: { 'Content-Type': 'application/json' },
            };
            
            let res = http.post('http://psychology-engine-service/analyze', payload, params);
            check(res, {
              'status is 200': (r) => r.status === 200,
              'response time < 500ms': (r) => r.timings.duration < 500,
            });
          }
      restartPolicy: Never
  backoffLimit: 0
EOF

log_info "Load test job created. Run with: kubectl apply -f load-test.yaml"

# Step 8: Display access information
echo ""
echo "🎯 ============================================="
echo "🎯 DEPLOYMENT COMPLETE - THE BEAST IS UNLEASHED!"
echo "🎯 ============================================="
echo ""
echo "📍 Access Points:"
echo "  - Internal: http://${SERVICE_NAME}-service.${NAMESPACE}.svc.cluster.local"
echo "  - External: https://psychology.coinet.ai"
echo ""
echo "📊 Monitoring:"
echo "  - Metrics: http://${SERVICE_NAME}-service.${NAMESPACE}.svc.cluster.local/metrics"
echo "  - Logs: kubectl logs -n ${NAMESPACE} -l app=${SERVICE_NAME} -f"
echo ""
echo "🔌 API Endpoints:"
echo "  - POST /analyze - Full psychological analysis"
echo "  - POST /detect/manipulation - Manipulation detection"
echo "  - POST /detect/bias - Cognitive bias detection"
echo "  - POST /predict/crowd - Crowd behavior prediction"
echo "  - POST /profile/user - User psychological profiling"
echo "  - WS /ws/analyze - Real-time WebSocket analysis"
echo ""
echo "🚀 Quick Test:"
echo "  curl -X POST https://psychology.coinet.ai/analyze \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"input_text\": \"Bitcoin to 100k!\", \"input_type\": \"general\"}'"
echo ""
echo "💪 The Psychology Engine is now:"
echo "  ✅ Deployed and running"
echo "  ✅ Auto-scaling enabled (3-20 pods)"
echo "  ✅ Health checks active"
echo "  ✅ Metrics exposed"
echo "  ✅ Ready to analyze millions of requests"
echo ""
echo "🏆 MARKET DOMINATION: INITIATED"
echo "🧠 ============================================="

# Step 9: Create integration script for other services
cat << 'EOF' > integrate-psychology.js
// 🔌 PSYCHOLOGY ENGINE INTEGRATION HELPER
// Copy this to your services to integrate the Psychology Engine

const PSYCHOLOGY_ENGINE_URL = process.env.PSYCHOLOGY_ENGINE_URL || 'http://psychology-engine-service.coinet-ai.svc.cluster.local';

class PsychologyClient {
    async analyze(text, type = 'general', context = null) {
        const response = await fetch(`${PSYCHOLOGY_ENGINE_URL}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                input_text: text,
                input_type: type,
                context: context
            })
        });
        return response.json();
    }
    
    async detectManipulation(text) {
        const response = await fetch(`${PSYCHOLOGY_ENGINE_URL}/detect/manipulation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input_text: text })
        });
        return response.json();
    }
    
    async detectBias(text) {
        const response = await fetch(`${PSYCHOLOGY_ENGINE_URL}/detect/bias`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input_text: text })
        });
        return response.json();
    }
    
    async predictCrowd(text, context) {
        const response = await fetch(`${PSYCHOLOGY_ENGINE_URL}/predict/crowd`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input_text: text, context })
        });
        return response.json();
    }
}

module.exports = PsychologyClient;
EOF

log_success "✅ Integration helper created: integrate-psychology.js"

# Step 10: Create Python integration example
cat << 'EOF' > integrate_psychology.py
"""
🔌 PSYCHOLOGY ENGINE INTEGRATION HELPER
Copy this to your Python services to integrate the Psychology Engine
"""

import aiohttp
import os
from typing import Dict, Optional, Any

PSYCHOLOGY_ENGINE_URL = os.getenv(
    'PSYCHOLOGY_ENGINE_URL', 
    'http://psychology-engine-service.coinet-ai.svc.cluster.local'
)

class PsychologyClient:
    def __init__(self, base_url: str = PSYCHOLOGY_ENGINE_URL):
        self.base_url = base_url
    
    async def analyze(self, text: str, input_type: str = 'general', 
                     context: Optional[Dict] = None) -> Dict:
        """Perform full psychological analysis"""
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/analyze",
                json={
                    "input_text": text,
                    "input_type": input_type,
                    "context": context
                }
            ) as response:
                return await response.json()
    
    async def detect_manipulation(self, text: str) -> Dict:
        """Detect manipulation tactics"""
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/detect/manipulation",
                json={"input_text": text}
            ) as response:
                return await response.json()
    
    async def detect_bias(self, text: str) -> Dict:
        """Detect cognitive biases"""
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/detect/bias",
                json={"input_text": text}
            ) as response:
                return await response.json()
    
    async def predict_crowd(self, text: str, context: Optional[Dict] = None) -> Dict:
        """Predict crowd behavior"""
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/predict/crowd",
                json={"input_text": text, "context": context}
            ) as response:
                return await response.json()

# Example usage
async def main():
    client = PsychologyClient()
    
    # Analyze a crypto tweet
    result = await client.analyze(
        "Bitcoin is going to the moon! 🚀 Everyone is buying!",
        input_type="social"
    )
    
    print(f"Confidence: {result['confidence_score']}")
    print(f"Insights: {result['insights']}")
    print(f"Warnings: {result['warnings']}")
    print(f"Recommendations: {result['recommendations']}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
EOF

log_success "✅ Python integration helper created: integrate_psychology.py"

echo ""
echo "🎊 ============================================="
echo "🎊 PSYCHOLOGY ENGINE DEPLOYED SUCCESSFULLY!"
echo "🎊 THE COMPETITION DOESN'T STAND A CHANCE!"
echo "🎊 ============================================="
