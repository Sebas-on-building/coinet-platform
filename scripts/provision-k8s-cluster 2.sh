#!/bin/bash

# =============================================================================
# COINET AI KUBERNETES CLUSTER PROVISIONING SCRIPT
# Complete EKS cluster setup with multi-environment configuration
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
CLUSTER_NAME="${CLUSTER_NAME:-coinet-ai-cluster}"
AWS_REGION="${AWS_REGION:-us-west-2}"
NODE_TYPE="${NODE_TYPE:-m5.large}"
NODE_COUNT="${NODE_COUNT:-3}"
KUBERNETES_VERSION="${KUBERNETES_VERSION:-1.28}"
ENVIRONMENT="${ENVIRONMENT:-production}"

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

print_header() {
    echo -e "${CYAN}"
    echo "=============================================="
    echo "  🚀 Coinet AI Kubernetes Cluster Setup"
    echo "=============================================="
    echo -e "${NC}"
}

print_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

OPTIONS:
    -c, --cluster-name NAME     Cluster name (default: coinet-ai-cluster)
    -r, --region REGION         AWS region (default: us-west-2)
    -n, --node-type TYPE        EC2 instance type (default: m5.large)
    -s, --node-count COUNT      Number of nodes (default: 3)
    -v, --k8s-version VERSION   Kubernetes version (default: 1.28)
    -e, --environment ENV       Environment (dev/staging/production)
    --terraform                 Use Terraform instead of eksctl
    --dry-run                   Show what would be done
    -h, --help                  Show this help message

EXAMPLES:
    $0                                              # Use all defaults
    $0 -c my-cluster -r us-east-1 -n m5.xlarge    # Custom configuration
    $0 --terraform                                 # Use Terraform provisioning
    $0 --dry-run                                   # Preview actions

ENVIRONMENT VARIABLES:
    AWS_PROFILE                 AWS profile to use
    CLUSTER_NAME               Override cluster name
    AWS_REGION                 Override AWS region
    NODE_TYPE                  Override node instance type
    NODE_COUNT                 Override node count
    KUBERNETES_VERSION         Override Kubernetes version
EOF
}

check_dependencies() {
    local missing=()
    
    command -v aws >/dev/null 2>&1 || missing+=("aws-cli")
    command -v kubectl >/dev/null 2>&1 || missing+=("kubectl")
    command -v eksctl >/dev/null 2>&1 || missing+=("eksctl")
    command -v helm >/dev/null 2>&1 || missing+=("helm")
    command -v jq >/dev/null 2>&1 || missing+=("jq")
    
    if [ ${#missing[@]} -ne 0 ]; then
        log_error "Missing required dependencies: ${missing[*]}"
        log_info "Please install missing dependencies and try again"
        log_info "macOS: brew install ${missing[*]}"
        log_info "Ubuntu: apt-get install ${missing[*]}"
        exit 1
    fi
    
    log_success "All dependencies are available"
}

check_aws_credentials() {
    log_step "Checking AWS credentials..."
    
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        log_error "AWS credentials not configured or invalid"
        log_info "Please run: aws configure"
        exit 1
    fi
    
    local account_id=$(aws sts get-caller-identity --query Account --output text)
    local user_arn=$(aws sts get-caller-identity --query Arn --output text)
    
    log_success "AWS credentials valid"
    log_info "Account ID: ${account_id}"
    log_info "User ARN: ${user_arn}"
}

check_existing_cluster() {
    log_step "Checking for existing cluster..."
    
    if aws eks describe-cluster --name "${CLUSTER_NAME}" --region "${AWS_REGION}" >/dev/null 2>&1; then
        log_warning "Cluster '${CLUSTER_NAME}' already exists in region '${AWS_REGION}'"
        echo -n "Do you want to update the existing cluster? (y/N): "
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            log_info "Skipping cluster creation. Proceeding with configuration..."
            return 1
        fi
    fi
    
    return 0
}

create_cluster_eksctl() {
    log_step "Creating EKS cluster with eksctl..."
    
    cat > cluster-config.yaml << EOF
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: ${CLUSTER_NAME}
  region: ${AWS_REGION}
  version: "${KUBERNETES_VERSION}"
  tags:
    Project: "coinet-ai"
    Environment: "${ENVIRONMENT}"
    ManagedBy: "eksctl"
    Team: "platform"

# IAM configuration
iam:
  withOIDC: true
  serviceAccounts:
  - metadata:
      name: aws-load-balancer-controller
      namespace: kube-system
    wellKnownPolicies:
      awsLoadBalancerController: true
  - metadata:
      name: ebs-csi-controller-sa
      namespace: kube-system
    wellKnownPolicies:
      ebsCSIController: true
  - metadata:
      name: cluster-autoscaler
      namespace: kube-system
    wellKnownPolicies:
      autoScaler: true
  - metadata:
      name: coinet-ai-inference
      namespace: coinet-production
    attachPolicyARNs:
    - arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess
    - arn:aws:iam::aws:policy/SecretsManagerReadWrite
  - metadata:
      name: coinet-ai-ingest
      namespace: coinet-production
    attachPolicyARNs:
    - arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess
    - arn:aws:iam::aws:policy/SecretsManagerReadWrite

# VPC configuration
vpc:
  cidr: 10.0.0.0/16
  nat:
    gateway: Single
  clusterEndpoints:
    privateAccess: true
    publicAccess: true
    publicAccessCIDRs: ["0.0.0.0/0"]

# Node groups
managedNodeGroups:
  # General purpose nodes
  - name: general-nodes
    instanceType: ${NODE_TYPE}
    minSize: 2
    maxSize: 10
    desiredCapacity: ${NODE_COUNT}
    volumeSize: 100
    volumeType: gp3
    amiFamily: AmazonLinux2
    labels:
      role: general
      environment: ${ENVIRONMENT}
    tags:
      k8s.io/cluster-autoscaler/enabled: "true"
      k8s.io/cluster-autoscaler/${CLUSTER_NAME}: "owned"
    iam:
      withAddonPolicies:
        autoScaler: true
        albIngress: true
        cloudWatch: true
        ebs: true
        efs: true
  
  # AI/ML compute nodes (spot instances for cost optimization)
  - name: ai-compute-nodes
    instanceTypes: ["c5.2xlarge", "c5.4xlarge", "m5.2xlarge"]
    spot: true
    minSize: 0
    maxSize: 5
    desiredCapacity: 1
    volumeSize: 200
    volumeType: gp3
    amiFamily: AmazonLinux2
    labels:
      role: ai-compute
      workload: ml
      environment: ${ENVIRONMENT}
    taints:
      - key: ai-compute
        value: "true"
        effect: NoSchedule
    tags:
      k8s.io/cluster-autoscaler/enabled: "true"
      k8s.io/cluster-autoscaler/${CLUSTER_NAME}: "owned"
      k8s.io/cluster-autoscaler/node-template/label/role: "ai-compute"
    iam:
      withAddonPolicies:
        autoScaler: true
        cloudWatch: true
        ebs: true

  # Memory optimized nodes for data processing
  - name: memory-optimized-nodes
    instanceTypes: ["r5.large", "r5.xlarge", "r5.2xlarge"]
    minSize: 1
    maxSize: 5
    desiredCapacity: 2
    volumeSize: 150
    volumeType: gp3
    amiFamily: AmazonLinux2
    labels:
      role: memory-optimized
      workload: data-processing
      environment: ${ENVIRONMENT}
    tags:
      k8s.io/cluster-autoscaler/enabled: "true"
      k8s.io/cluster-autoscaler/${CLUSTER_NAME}: "owned"
    iam:
      withAddonPolicies:
        autoScaler: true
        cloudWatch: true
        ebs: true

# Add-ons
addons:
- name: vpc-cni
  version: latest
- name: coredns
  version: latest
- name: kube-proxy
  version: latest
- name: aws-ebs-csi-driver
  version: latest
  wellKnownPolicies:
    ebsCSIController: true

# CloudWatch logging
cloudWatch:
  clusterLogging:
    enableTypes: ["api", "audit", "authenticator", "controllerManager", "scheduler"]
    logRetentionInDays: 30
EOF

    if [ "$DRY_RUN" = "true" ]; then
        log_info "DRY RUN: Would create cluster with config:"
        cat cluster-config.yaml
        return 0
    fi

    eksctl create cluster -f cluster-config.yaml
    
    if [ $? -eq 0 ]; then
        log_success "EKS cluster created successfully"
    else
        log_error "Failed to create EKS cluster"
        exit 1
    fi
    
    # Clean up config file
    rm -f cluster-config.yaml
}

create_cluster_terraform() {
    log_step "Creating EKS cluster with Terraform..."
    
    if [ ! -d "infra/terraform" ]; then
        log_error "Terraform configuration not found in infra/terraform/"
        log_info "Please ensure you're running this script from the project root"
        exit 1
    fi
    
    cd infra/terraform
    
    # Initialize Terraform
    log_step "Initializing Terraform..."
    terraform init
    
    # Create workspace for environment
    terraform workspace select ${ENVIRONMENT} 2>/dev/null || terraform workspace new ${ENVIRONMENT}
    
    # Plan the deployment
    log_step "Planning Terraform deployment..."
    terraform plan \
        -var="cluster_name=${CLUSTER_NAME}" \
        -var="aws_region=${AWS_REGION}" \
        -var="environment=${ENVIRONMENT}" \
        -var="kubernetes_version=${KUBERNETES_VERSION}" \
        -out=tfplan
    
    if [ "$DRY_RUN" = "true" ]; then
        log_info "DRY RUN: Would apply Terraform plan"
        terraform show tfplan
        cd ../../
        return 0
    fi
    
    # Apply the deployment
    log_step "Applying Terraform configuration..."
    terraform apply tfplan
    
    if [ $? -eq 0 ]; then
        log_success "EKS cluster created successfully with Terraform"
    else
        log_error "Failed to create EKS cluster with Terraform"
        cd ../../
        exit 1
    fi
    
    cd ../../
}

configure_kubectl() {
    log_step "Configuring kubectl..."
    
    # Update kubeconfig
    aws eks update-kubeconfig \
        --region "${AWS_REGION}" \
        --name "${CLUSTER_NAME}" \
        --alias "${CLUSTER_NAME}"
    
    # Test cluster access
    if kubectl cluster-info >/dev/null 2>&1; then
        log_success "kubectl configured successfully"
        kubectl cluster-info
    else
        log_error "Failed to configure kubectl"
        exit 1
    fi
}

create_namespaces() {
    log_step "Creating multi-environment namespaces..."
    
    local namespaces=("dev" "staging" "production" "monitoring" "ingress" "security")
    
    for namespace in "${namespaces[@]}"; do
        log_info "Creating namespace: ${namespace}"
        
        if [ "$DRY_RUN" = "true" ]; then
            log_info "DRY RUN: Would create namespace ${namespace}"
            continue
        fi
        
        kubectl create namespace "${namespace}" --dry-run=client -o yaml | \
        kubectl apply -f -
        
        # Add labels for environment management
        kubectl label namespace "${namespace}" \
            environment="${namespace}" \
            project="coinet-ai" \
            managedBy="automation" \
            --overwrite
        
        # Add network policies for security
        cat << EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: ${namespace}
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-internal
  namespace: ${namespace}
spec:
  podSelector: {}
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          project: "coinet-ai"
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          project: "coinet-ai"
  - to: []
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
EOF
    done
    
    log_success "All namespaces created successfully"
}

install_essential_addons() {
    log_step "Installing essential Kubernetes add-ons..."
    
    if [ "$DRY_RUN" = "true" ]; then
        log_info "DRY RUN: Would install essential add-ons"
        return 0
    fi
    
    # AWS Load Balancer Controller
    log_info "Installing AWS Load Balancer Controller..."
    helm repo add eks https://aws.github.io/eks-charts
    helm repo update
    
    helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
        -n kube-system \
        --set clusterName="${CLUSTER_NAME}" \
        --set serviceAccount.create=false \
        --set serviceAccount.name=aws-load-balancer-controller \
        --wait
    
    # Cluster Autoscaler
    log_info "Installing Cluster Autoscaler..."
    helm repo add autoscaler https://kubernetes.github.io/autoscaler
    helm repo update
    
    helm upgrade --install cluster-autoscaler autoscaler/cluster-autoscaler \
        -n kube-system \
        --set autoDiscovery.clusterName="${CLUSTER_NAME}" \
        --set awsRegion="${AWS_REGION}" \
        --set serviceAccount.create=false \
        --set serviceAccount.name=cluster-autoscaler \
        --wait
    
    # Metrics Server (if not already installed)
    if ! kubectl get deployment metrics-server -n kube-system >/dev/null 2>&1; then
        log_info "Installing Metrics Server..."
        kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
    fi
    
    # NGINX Ingress Controller
    log_info "Installing NGINX Ingress Controller..."
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
    helm repo update
    
    helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
        -n ingress \
        --create-namespace \
        --set controller.service.type=LoadBalancer \
        --set controller.service.annotations."service\.beta\.kubernetes\.io/aws-load-balancer-type"="nlb" \
        --wait
    
    log_success "Essential add-ons installed successfully"
}

setup_monitoring() {
    log_step "Setting up monitoring and observability..."
    
    if [ "$DRY_RUN" = "true" ]; then
        log_info "DRY RUN: Would setup monitoring"
        return 0
    fi
    
    # Prometheus and Grafana
    log_info "Installing Prometheus and Grafana..."
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update
    
    helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
        -n monitoring \
        --create-namespace \
        --set prometheus.prometheusSpec.retention=30d \
        --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.accessModes[0]=ReadWriteOnce \
        --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi \
        --set alertmanager.alertmanagerSpec.storage.volumeClaimTemplate.spec.accessModes[0]=ReadWriteOnce \
        --set alertmanager.alertmanagerSpec.storage.volumeClaimTemplate.spec.resources.requests.storage=10Gi \
        --set grafana.persistence.enabled=true \
        --set grafana.persistence.size=10Gi \
        --wait
    
    log_success "Monitoring stack installed successfully"
}

create_rbac_policies() {
    log_step "Creating RBAC policies..."
    
    if [ "$DRY_RUN" = "true" ]; then
        log_info "DRY RUN: Would create RBAC policies"
        return 0
    fi
    
    # Developer role
    cat << EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: coinet-developer
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps", "secrets"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]
- apiGroups: ["networking.k8s.io"]
  resources: ["ingresses"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: coinet-developers
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: coinet-developer
subjects:
- kind: Group
  name: developers
  apiGroup: rbac.authorization.k8s.io
EOF
    
    # Platform admin role
    cat << EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: coinet-platform-admin
rules:
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: coinet-platform-admins
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: coinet-platform-admin
subjects:
- kind: Group
  name: platform-admins
  apiGroup: rbac.authorization.k8s.io
EOF
    
    log_success "RBAC policies created successfully"
}

verify_cluster() {
    log_step "Verifying cluster setup..."
    
    echo ""
    echo "📊 Cluster Information:"
    kubectl cluster-info
    
    echo ""
    echo "🏷️  Namespaces:"
    kubectl get namespaces
    
    echo ""
    echo "🔧 Nodes:"
    kubectl get nodes -o wide
    
    echo ""
    echo "📦 Pods in kube-system:"
    kubectl get pods -n kube-system
    
    echo ""
    echo "🔌 Services:"
    kubectl get services --all-namespaces
    
    # Check if cluster autoscaler is working
    log_info "Checking cluster autoscaler status..."
    if kubectl get deployment cluster-autoscaler -n kube-system >/dev/null 2>&1; then
        kubectl logs -n kube-system deployment/cluster-autoscaler --tail=10
    fi
    
    log_success "Cluster verification completed"
}

generate_summary() {
    log_step "Generating setup summary..."
    
    cat << EOF

🎉 COINET AI KUBERNETES CLUSTER SETUP COMPLETE!

📊 Cluster Details:
   Name: ${CLUSTER_NAME}
   Region: ${AWS_REGION}
   Kubernetes Version: ${KUBERNETES_VERSION}
   Environment: ${ENVIRONMENT}

🏷️  Namespaces Created:
   • dev - Development environment
   • staging - Staging environment  
   • production - Production environment
   • monitoring - Monitoring stack
   • ingress - Ingress controllers
   • security - Security tools

🔧 Essential Add-ons Installed:
   ✅ AWS Load Balancer Controller
   ✅ Cluster Autoscaler
   ✅ Metrics Server
   ✅ NGINX Ingress Controller
   ✅ Prometheus & Grafana (monitoring)

🚀 Next Steps:
   1. Deploy Coinet AI services:
      ./scripts/deploy-platform.sh deploy -e production
   
   2. Access Grafana dashboard:
      kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80
      
   3. Get Grafana admin password:
      kubectl get secret -n monitoring kube-prometheus-stack-grafana -o jsonpath="{.data.admin-password}" | base64 --decode
   
   4. Monitor cluster autoscaling:
      kubectl logs -n kube-system deployment/cluster-autoscaler -f

📋 Useful Commands:
   # Switch between environments
   kubectl config set-context --current --namespace=production
   
   # Scale node groups
   eksctl scale nodegroup --cluster=${CLUSTER_NAME} --name=general-nodes --nodes=5
   
   # Update cluster
   eksctl update cluster --name=${CLUSTER_NAME}

🔗 Cluster Endpoint:
EOF
    
    kubectl cluster-info | grep "Kubernetes control plane"
    
    echo ""
    log_success "Kubernetes cluster is ready for Coinet AI deployment! 🚀"
}

# Parse command line arguments
DRY_RUN=false
USE_TERRAFORM=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -c|--cluster-name)
            CLUSTER_NAME="$2"
            shift 2
            ;;
        -r|--region)
            AWS_REGION="$2"
            shift 2
            ;;
        -n|--node-type)
            NODE_TYPE="$2"
            shift 2
            ;;
        -s|--node-count)
            NODE_COUNT="$2"
            shift 2
            ;;
        -v|--k8s-version)
            KUBERNETES_VERSION="$2"
            shift 2
            ;;
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --terraform)
            USE_TERRAFORM=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            print_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            print_usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    print_header
    
    log_info "Starting Kubernetes cluster setup with configuration:"
    log_info "  Cluster Name: ${CLUSTER_NAME}"
    log_info "  AWS Region: ${AWS_REGION}"
    log_info "  Node Type: ${NODE_TYPE}"
    log_info "  Node Count: ${NODE_COUNT}"
    log_info "  Kubernetes Version: ${KUBERNETES_VERSION}"
    log_info "  Environment: ${ENVIRONMENT}"
    log_info "  Use Terraform: ${USE_TERRAFORM}"
    log_info "  Dry Run: ${DRY_RUN}"
    
    # Prerequisite checks
    check_dependencies
    check_aws_credentials
    
    # Check if cluster already exists
    if check_existing_cluster; then
        # Create cluster
        if [ "$USE_TERRAFORM" = "true" ]; then
            create_cluster_terraform
        else
            create_cluster_eksctl
        fi
    fi
    
    # Configure kubectl
    configure_kubectl
    
    # Setup cluster components
    create_namespaces
    install_essential_addons
    setup_monitoring
    create_rbac_policies
    
    # Verify everything is working
    verify_cluster
    
    # Generate summary
    generate_summary
}

# Run main function
main "$@" 