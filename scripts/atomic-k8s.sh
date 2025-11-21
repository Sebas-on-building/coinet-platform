#!/bin/bash
set -e

# Atomic Kubernetes Utility Script (Apple/Canva/TradingView/Solana fusion)
# Usage: ./scripts/atomic-k8s.sh [apply|delete|logs|get|describe|port-forward|dashboard] [args]

CYAN='\033[1;36m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
RESET='\033[0m'
ICON_K8S='☸️'
ICON_OK='✅'
ICON_WARN='⚠️'
ICON_ERROR='❌'

function header() {
  echo -e "${CYAN}${ICON_K8S} $1${RESET}"
}

function ok() {
  echo -e "${GREEN}${ICON_OK} $1${RESET}"
}

function warn() {
  echo -e "${YELLOW}${ICON_WARN} $1${RESET}"
}

function error() {
  echo -e "${RED}${ICON_ERROR} $1${RESET}"
  exit 1
}

case $1 in
  apply)
    header "Applying all Kubernetes manifests..."
    kubectl apply -f k8s/
    ok "All manifests applied."
    ;;
  delete)
    header "Deleting all Kubernetes resources..."
    kubectl delete -f k8s/
    ok "All resources deleted."
    ;;
  logs)
    header "Showing logs for $2..."
    kubectl logs -f $2
    ;;
  get)
    header "Getting $2..."
    kubectl get $2
    ;;
  describe)
    header "Describing $2 $3..."
    kubectl describe $2 $3
    ;;
  port-forward)
    header "Port-forwarding $2 to $3:$4..."
    kubectl port-forward $2 $3:$4
    ;;
  dashboard)
    header "Launching Kubernetes dashboard..."
    kubectl proxy &
    open http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/
    ok "Dashboard launched."
    ;;
  test)
    header "Testing Kubernetes deployment (smoke test)..."
    kubectl get pods
    kubectl get svc
    ok "Kubernetes smoke test complete."
    ;;
  push)
    header "Pushing Kubernetes manifests to GitOps repo..."
    git add k8s/
    git commit -m "chore(k8s): update manifests"
    git push
    ok "Kubernetes manifests pushed."
    ;;
  rollback)
    header "Rolling back Kubernetes deployment..."
    kubectl rollout undo deployment/coinet-api
    kubectl rollout undo deployment/coinet-frontend
    ok "Kubernetes rollback complete."
    ;;
  *)
    echo -e "${YELLOW}Usage: $0 [apply|delete|logs|get|describe|port-forward|dashboard]${RESET}"
    ;;
esac 