# =============================================================================
# COINET AI INFRASTRUCTURE - MAIN TERRAFORM CONFIGURATION
# Revolutionary AI-Powered Cryptocurrency Platform Infrastructure
# =============================================================================

terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # Backend configuration for state management
  backend "s3" {
    bucket         = "coinet-ai-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "coinet-ai-terraform-locks"
  }
}

# =============================================================================
# PROVIDER CONFIGURATIONS
# =============================================================================

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "coinet-ai"
      Environment = var.environment
      ManagedBy   = "terraform"
      Team        = "platform"
    }
  }
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  token                  = data.aws_eks_cluster_auth.cluster.token
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
    token                  = data.aws_eks_cluster_auth.cluster.token
  }
}

# =============================================================================
# DATA SOURCES
# =============================================================================

data "aws_eks_cluster_auth" "cluster" {
  name = module.eks.cluster_name
}

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# =============================================================================
# LOCAL VALUES
# =============================================================================

locals {
  name_prefix = "coinet-ai-${var.environment}"
  
  common_tags = {
    Project     = "coinet-ai"
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  # Network configuration
  vpc_cidr = var.vpc_cidr
  azs      = slice(data.aws_availability_zones.available.names, 0, 3)
  
  private_subnets = [
    cidrsubnet(local.vpc_cidr, 8, 1),
    cidrsubnet(local.vpc_cidr, 8, 2),
    cidrsubnet(local.vpc_cidr, 8, 3),
  ]
  
  public_subnets = [
    cidrsubnet(local.vpc_cidr, 8, 101),
    cidrsubnet(local.vpc_cidr, 8, 102),
    cidrsubnet(local.vpc_cidr, 8, 103),
  ]

  database_subnets = [
    cidrsubnet(local.vpc_cidr, 8, 201),
    cidrsubnet(local.vpc_cidr, 8, 202),
    cidrsubnet(local.vpc_cidr, 8, 203),
  ]
}

# =============================================================================
# KUBERNETES CLUSTER MODULE
# =============================================================================

module "eks" {
  source = "./modules/k8s"

  cluster_name    = "${local.name_prefix}-cluster"
  cluster_version = var.kubernetes_version
  
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnets
  
  # Node groups configuration
  node_groups = {
    # General purpose nodes
    general = {
      instance_types = ["m5.large", "m5.xlarge"]
      capacity_type  = "ON_DEMAND"
      min_size       = 2
      max_size       = 10
      desired_size   = 3
      
      labels = {
        role = "general"
      }
      
      taints = []
    }
    
    # AI/ML optimized nodes
    ai_compute = {
      instance_types = ["c5.2xlarge", "c5.4xlarge"]
      capacity_type  = "SPOT"
      min_size       = 0
      max_size       = 5
      desired_size   = 1
      
      labels = {
        role = "ai-compute"
        workload = "ml"
      }
      
      taints = [
        {
          key    = "ai-compute"
          value  = "true"
          effect = "NO_SCHEDULE"
        }
      ]
    }
    
    # Memory optimized for data processing
    memory_optimized = {
      instance_types = ["r5.large", "r5.xlarge"]
      capacity_type  = "ON_DEMAND"
      min_size       = 1
      max_size       = 5
      desired_size   = 2
      
      labels = {
        role = "memory-optimized"
        workload = "data-processing"
      }
      
      taints = []
    }
  }

  # Cluster add-ons
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
  }

  tags = local.common_tags
}

# =============================================================================
# DATABASE MODULE
# =============================================================================

module "databases" {
  source = "./modules/databases"

  vpc_id             = module.vpc.vpc_id
  database_subnets   = module.vpc.database_subnets
  allowed_cidr_blocks = local.private_subnets

  # PostgreSQL configuration
  postgres_config = {
    identifier     = "${local.name_prefix}-postgres"
    engine_version = "15.4"
    instance_class = var.environment == "production" ? "db.r5.xlarge" : "db.t3.medium"
    allocated_storage = var.environment == "production" ? 500 : 100
    
    database_name = "coinet_ai"
    username      = "coinet_admin"
    
    backup_retention_period = var.environment == "production" ? 30 : 7
    backup_window          = "03:00-04:00"
    maintenance_window     = "Sun:04:00-Sun:05:00"
    
    enabled_cloudwatch_logs_exports = ["postgresql"]
    performance_insights_enabled    = true
    monitoring_interval            = 60
  }

  # TimescaleDB configuration (based on PostgreSQL)
  timescaledb_config = {
    identifier     = "${local.name_prefix}-timescaledb"
    engine_version = "15.4"
    instance_class = var.environment == "production" ? "db.r5.2xlarge" : "db.t3.large"
    allocated_storage = var.environment == "production" ? 1000 : 200
    
    database_name = "timeseries_data"
    username      = "timescale_admin"
    
    backup_retention_period = var.environment == "production" ? 30 : 7
    backup_window          = "02:00-03:00"
    maintenance_window     = "Sun:03:00-Sun:04:00"
    
    enabled_cloudwatch_logs_exports = ["postgresql"]
    performance_insights_enabled    = true
    monitoring_interval            = 60
  }

  # Redis configuration
  redis_config = {
    cluster_id         = "${local.name_prefix}-redis"
    node_type         = var.environment == "production" ? "cache.r6g.large" : "cache.t3.micro"
    port              = 6379
    parameter_group_name = "default.redis7"
    
    num_cache_clusters = var.environment == "production" ? 3 : 1
    
    at_rest_encryption_enabled = true
    transit_encryption_enabled = true
    
    snapshot_retention_limit = var.environment == "production" ? 7 : 3
    snapshot_window         = "05:00-06:00"
    maintenance_window      = "Sun:06:00-Sun:07:00"
  }

  tags = local.common_tags
}

# =============================================================================
# MONITORING MODULE
# =============================================================================

module "monitoring" {
  source = "./modules/monitoring"

  cluster_name = module.eks.cluster_name
  vpc_id       = module.vpc.vpc_id
  
  # Prometheus configuration
  prometheus_config = {
    namespace = "monitoring"
    storage_class = "gp2"
    storage_size = var.environment == "production" ? "100Gi" : "50Gi"
    retention = var.environment == "production" ? "30d" : "15d"
  }

  # Grafana configuration
  grafana_config = {
    namespace = "monitoring"
    admin_password = random_password.grafana_admin.result
    storage_size = "10Gi"
  }

  # AlertManager configuration
  alertmanager_config = {
    namespace = "monitoring"
    storage_size = "10Gi"
    slack_webhook_url = var.slack_webhook_url
  }

  tags = local.common_tags
}

# =============================================================================
# NETWORKING
# =============================================================================

module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${local.name_prefix}-vpc"
  cidr = local.vpc_cidr

  azs             = local.azs
  private_subnets = local.private_subnets
  public_subnets  = local.public_subnets
  database_subnets = local.database_subnets

  enable_nat_gateway = true
  enable_vpn_gateway = var.environment == "production"
  enable_dns_hostnames = true
  enable_dns_support = true

  # Kubernetes specific tags
  public_subnet_tags = {
    "kubernetes.io/cluster/${local.name_prefix}-cluster" = "shared"
    "kubernetes.io/role/elb"                             = "1"
  }

  private_subnet_tags = {
    "kubernetes.io/cluster/${local.name_prefix}-cluster" = "shared"
    "kubernetes.io/role/internal-elb"                    = "1"
  }

  tags = local.common_tags
}

# =============================================================================
# SECURITY RESOURCES
# =============================================================================

# KMS key for encryption
resource "aws_kms_key" "coinet_ai" {
  description             = "KMS key for Coinet AI encryption"
  deletion_window_in_days = var.environment == "production" ? 30 : 7
  enable_key_rotation     = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-kms-key"
  })
}

resource "aws_kms_alias" "coinet_ai" {
  name          = "alias/${local.name_prefix}-key"
  target_key_id = aws_kms_key.coinet_ai.key_id
}

# Secrets Manager for sensitive data
resource "aws_secretsmanager_secret" "database_credentials" {
  name                    = "${local.name_prefix}-database-credentials"
  description             = "Database credentials for Coinet AI"
  kms_key_id             = aws_kms_key.coinet_ai.arn
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = local.common_tags
}

resource "aws_secretsmanager_secret" "api_keys" {
  name                    = "${local.name_prefix}-api-keys"
  description             = "External API keys for Coinet AI"
  kms_key_id             = aws_kms_key.coinet_ai.arn
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = local.common_tags
}

# =============================================================================
# RANDOM RESOURCES
# =============================================================================

resource "random_password" "grafana_admin" {
  length  = 16
  special = true
}

# =============================================================================
# S3 BUCKETS FOR DATA STORAGE
# =============================================================================

# Data lake bucket
resource "aws_s3_bucket" "data_lake" {
  bucket = "${local.name_prefix}-data-lake-${random_id.bucket_suffix.hex}"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-data-lake"
    Purpose = "data-storage"
  })
}

resource "aws_s3_bucket_versioning" "data_lake" {
  bucket = aws_s3_bucket.data_lake.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "data_lake" {
  bucket = aws_s3_bucket.data_lake.id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        kms_master_key_id = aws_kms_key.coinet_ai.arn
        sse_algorithm     = "aws:kms"
      }
    }
  }
}

# Backup bucket
resource "aws_s3_bucket" "backups" {
  bucket = "${local.name_prefix}-backups-${random_id.bucket_suffix.hex}"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-backups"
    Purpose = "backup-storage"
  })
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# =============================================================================
# IAM ROLES AND POLICIES
# =============================================================================

# EKS service account role for AWS Load Balancer Controller
resource "aws_iam_role" "aws_load_balancer_controller" {
  name = "${local.name_prefix}-aws-load-balancer-controller"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = module.eks.oidc_provider_arn
        }
        Condition = {
          StringEquals = {
            "${replace(module.eks.oidc_provider, "https://", "")}:sub": "system:serviceaccount:kube-system:aws-load-balancer-controller"
            "${replace(module.eks.oidc_provider, "https://", "")}:aud": "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "aws_load_balancer_controller" {
  policy_arn = "arn:aws:iam::aws:policy/ElasticLoadBalancingFullAccess"
  role       = aws_iam_role.aws_load_balancer_controller.name
}

# =============================================================================
# OUTPUTS
# =============================================================================

output "cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
}

output "cluster_name" {
  description = "Kubernetes Cluster Name"
  value       = module.eks.cluster_name
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = module.eks.cluster_certificate_authority_data
}

output "vpc_id" {
  description = "ID of the VPC where resources are created"
  value       = module.vpc.vpc_id
}

output "private_subnets" {
  description = "List of IDs of private subnets"
  value       = module.vpc.private_subnets
}

output "public_subnets" {
  description = "List of IDs of public subnets"
  value       = module.vpc.public_subnets
}

output "database_endpoints" {
  description = "Database endpoints"
  value = {
    postgres     = module.databases.postgres_endpoint
    timescaledb  = module.databases.timescaledb_endpoint
    redis        = module.databases.redis_endpoint
  }
  sensitive = true
}

output "monitoring_endpoints" {
  description = "Monitoring service endpoints"
  value = {
    prometheus = module.monitoring.prometheus_endpoint
    grafana    = module.monitoring.grafana_endpoint
  }
}

output "s3_buckets" {
  description = "S3 bucket names"
  value = {
    data_lake = aws_s3_bucket.data_lake.bucket
    backups   = aws_s3_bucket.backups.bucket
  }
} 