#!/bin/bash
set -e

# Atomic Helm Utility Script (Apple/Canva/TradingView/Solana fusion)
# Usage: ./scripts/atomic-helm.sh [install|upgrade|uninstall|lint|template|status] [args]

CYAN='\033[1;36m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
RESET='\033[0m'
ICON_HELM='⎈'
ICON_OK='✅'
ICON_WARN='⚠️'
ICON_ERROR='❌'

function header() {
  echo -e "${CYAN}${ICON_HELM} $1${RESET}"
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
  install)
    header "Installing Coinet Helm chart..."
    helm install coinet-platform ./helm/coinet-platform
    ok "Helm chart installed."
    ;;
  upgrade)
    header "Upgrading Coinet Helm chart..."
    helm upgrade coinet-platform ./helm/coinet-platform
    ok "Helm chart upgraded."
    ;;
  uninstall)
    header "Uninstalling Coinet Helm chart..."
    helm uninstall coinet-platform
    ok "Helm chart uninstalled."
    ;;
  lint)
    header "Linting Helm chart..."
    helm lint ./helm/coinet-platform
    ok "Lint complete."
    ;;
  template)
    header "Rendering Helm templates..."
    helm template coinet-platform ./helm/coinet-platform
    ;;
  status)
    header "Getting Helm release status..."
    helm status coinet-platform
    ;;
  test)
    header "Testing Helm chart (dry run)..."
    helm install --dry-run --debug coinet-platform ./helm/coinet-platform
    ok "Helm chart dry run complete."
    ;;
  push)
    header "Pushing Helm chart to repository..."
    helm package ./helm/coinet-platform
    helm push coinet-platform-*.tgz oci://your-helm-repo
    ok "Helm chart pushed."
    ;;
  rollback)
    header "Rolling back Helm release..."
    helm rollback coinet-platform 1
    ok "Helm rollback complete."
    ;;
  *)
    echo -e "${YELLOW}Usage: $0 [install|upgrade|uninstall|lint|template|status]${RESET}"
    ;;
esac 