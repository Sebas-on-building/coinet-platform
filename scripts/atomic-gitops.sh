#!/bin/bash
set -e

# Atomic GitOps Utility Script (Apple/Canva/TradingView/Solana fusion)
# Usage: ./scripts/atomic-gitops.sh [sync|status|history|diff|notifications|dashboard] [args]

CYAN='\033[1;36m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
RESET='\033[0m'
ICON_GITOPS='🚀'
ICON_OK='✅'
ICON_WARN='⚠️'
ICON_ERROR='❌'

function header() {
  echo -e "${CYAN}${ICON_GITOPS} $1${RESET}"
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
  sync)
    header "Syncing ArgoCD application..."
    argocd app sync coinet-platform
    ok "Sync complete."
    ;;
  status)
    header "Getting ArgoCD application status..."
    argocd app get coinet-platform
    ;;
  history)
    header "Getting ArgoCD application history..."
    argocd app history coinet-platform
    ;;
  diff)
    header "Diffing ArgoCD application..."
    argocd app diff coinet-platform
    ;;
  notifications)
    header "Listing ArgoCD notifications..."
    argocd notifications get-triggers
    ;;
  dashboard)
    header "Opening ArgoCD dashboard..."
    open http://localhost:8080
    ;;
  test)
    header "Testing GitOps sync (dry run)..."
    argocd app sync coinet-platform --dry-run
    ok "GitOps dry run complete."
    ;;
  push)
    header "Pushing GitOps manifests to repo..."
    git add helm/coinet-platform/
    git commit -m "chore(gitops): update manifests"
    git push
    ok "GitOps manifests pushed."
    ;;
  rollback)
    header "Rolling back GitOps application..."
    argocd app rollback coinet-platform 1
    ok "GitOps rollback complete."
    ;;
  *)
    echo -e "${YELLOW}Usage: $0 [sync|status|history|diff|notifications|dashboard]${RESET}"
    ;;
esac 