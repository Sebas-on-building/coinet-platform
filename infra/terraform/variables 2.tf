# =============================================================================
# COINET AI INFRASTRUCTURE - TERRAFORM VARIABLES
# Revolutionary AI-Powered Cryptocurrency Platform Infrastructure Variables
# =============================================================================

# =============================================================================
# GENERAL CONFIGURATION
# =============================================================================

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "dev"
  
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be one of: dev, staging, production."
  }
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "coinet-ai"
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-west-2"
}

# =============================================================================
# NETWORKING CONFIGURATION
# =============================================================================

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
  
  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block."
  }
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-west-2a", "us-west-2b", "us-west-2c"]
}

# =============================================================================
# KUBERNETES CONFIGURATION
# =============================================================================

variable "kubernetes_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
}

variable "cluster_log_types" {
  description = "List of control plane logging to enable"
  type        = list(string)
  default     = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
}

variable "cluster_encryption_config" {
  description = "Configuration block for cluster encryption"
  type = list(object({
    provider_key_arn = string
    resources        = list(string)
  }))
  default = []
}

# =============================================================================
# NODE GROUP CONFIGURATION
# =============================================================================

variable "general_node_group" {
  description = "Configuration for general purpose node group"
  type = object({
    instance_types = list(string)
    capacity_type  = string
    min_size       = number
    max_size       = number
    desired_size   = number
    disk_size      = number
  })
  default = {
    instance_types = ["m5.large", "m5.xlarge"]
    capacity_type  = "ON_DEMAND"
    min_size       = 2
    max_size       = 10
    desired_size   = 3
    disk_size      = 50
  }
}

variable "ai_compute_node_group" {
  description = "Configuration for AI/ML compute node group"
  type = object({
    instance_types = list(string)
    capacity_type  = string
    min_size       = number
    max_size       = number
    desired_size   = number
    disk_size      = number
  })
  default = {
    instance_types = ["c5.2xlarge", "c5.4xlarge", "c5.9xlarge"]
    capacity_type  = "SPOT"
    min_size       = 0
    max_size       = 5
    desired_size   = 1
    disk_size      = 100
  }
}

variable "memory_optimized_node_group" {
  description = "Configuration for memory optimized node group"
  type = object({
    instance_types = list(string)
    capacity_type  = string
    min_size       = number
    max_size       = number
    desired_size   = number
    disk_size      = number
  })
  default = {
    instance_types = ["r5.large", "r5.xlarge", "r5.2xlarge"]
    capacity_type  = "ON_DEMAND"
    min_size       = 1
    max_size       = 5
    desired_size   = 2
    disk_size      = 100
  }
}

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================

variable "postgres_instance_class" {
  description = "Instance class for PostgreSQL database"
  type        = string
  default     = "db.t3.medium"
}

variable "postgres_allocated_storage" {
  description = "Allocated storage for PostgreSQL database (GB)"
  type        = number
  default     = 100
  
  validation {
    condition     = var.postgres_allocated_storage >= 20
    error_message = "PostgreSQL allocated storage must be at least 20 GB."
  }
}

variable "postgres_max_allocated_storage" {
  description = "Maximum allocated storage for PostgreSQL database (GB)"
  type        = number
  default     = 1000
}

variable "postgres_backup_retention_period" {
  description = "Backup retention period for PostgreSQL (days)"
  type        = number
  default     = 7
  
  validation {
    condition     = var.postgres_backup_retention_period >= 0 && var.postgres_backup_retention_period <= 35
    error_message = "Backup retention period must be between 0 and 35 days."
  }
}

variable "timescaledb_instance_class" {
  description = "Instance class for TimescaleDB database"
  type        = string
  default     = "db.t3.large"
}

variable "timescaledb_allocated_storage" {
  description = "Allocated storage for TimescaleDB database (GB)"
  type        = number
  default     = 200
}

variable "redis_node_type" {
  description = "Node type for Redis cluster"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_cache_clusters" {
  description = "Number of cache clusters for Redis"
  type        = number
  default     = 1
}

# =============================================================================
# MONITORING CONFIGURATION
# =============================================================================

variable "enable_prometheus" {
  description = "Enable Prometheus monitoring"
  type        = bool
  default     = true
}

variable "enable_grafana" {
  description = "Enable Grafana dashboards"
  type        = bool
  default     = true
}

variable "enable_alertmanager" {
  description = "Enable AlertManager for notifications"
  type        = bool
  default     = true
}

variable "prometheus_retention_days" {
  description = "Prometheus data retention period (days)"
  type        = number
  default     = 15
  
  validation {
    condition     = var.prometheus_retention_days > 0
    error_message = "Prometheus retention days must be positive."
  }
}

variable "grafana_admin_user" {
  description = "Grafana admin username"
  type        = string
  default     = "admin"
}

# =============================================================================
# SECURITY CONFIGURATION
# =============================================================================

variable "enable_cluster_encryption" {
  description = "Enable EKS cluster encryption"
  type        = bool
  default     = true
}

variable "enable_irsa" {
  description = "Enable IAM Roles for Service Accounts (IRSA)"
  type        = bool
  default     = true
}

variable "allowed_cidr_blocks" {
  description = "List of CIDR blocks allowed to access the cluster"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # Restrict this in production
}

variable "enable_private_endpoint" {
  description = "Enable private API server endpoint"
  type        = bool
  default     = false
}

variable "enable_public_endpoint" {
  description = "Enable public API server endpoint"
  type        = bool
  default     = true
}

# =============================================================================
# BACKUP AND DISASTER RECOVERY
# =============================================================================

variable "enable_automated_backups" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

variable "backup_retention_period" {
  description = "Backup retention period (days)"
  type        = number
  default     = 30
}

variable "enable_point_in_time_recovery" {
  description = "Enable point in time recovery"
  type        = bool
  default     = true
}

variable "backup_window" {
  description = "Backup window for databases"
  type        = string
  default     = "03:00-04:00"
}

variable "maintenance_window" {
  description = "Maintenance window for databases"
  type        = string
  default     = "Sun:04:00-Sun:05:00"
}

# =============================================================================
# COST OPTIMIZATION
# =============================================================================

variable "enable_spot_instances" {
  description = "Enable spot instances for cost optimization"
  type        = bool
  default     = true
}

variable "spot_instance_interruption_behavior" {
  description = "Behavior when spot instances are interrupted"
  type        = string
  default     = "terminate"
  
  validation {
    condition     = contains(["hibernate", "stop", "terminate"], var.spot_instance_interruption_behavior)
    error_message = "Spot instance interruption behavior must be one of: hibernate, stop, terminate."
  }
}

variable "enable_cluster_autoscaler" {
  description = "Enable cluster autoscaler"
  type        = bool
  default     = true
}

# =============================================================================
# EXTERNAL INTEGRATIONS
# =============================================================================

variable "slack_webhook_url" {
  description = "Slack webhook URL for notifications"
  type        = string
  default     = ""
  sensitive   = true
}

variable "datadog_api_key" {
  description = "Datadog API key for monitoring"
  type        = string
  default     = ""
  sensitive   = true
}

variable "newrelic_license_key" {
  description = "New Relic license key for APM"
  type        = string
  default     = ""
  sensitive   = true
}

# =============================================================================
# AI/ML SPECIFIC CONFIGURATION
# =============================================================================

variable "enable_gpu_nodes" {
  description = "Enable GPU nodes for ML workloads"
  type        = bool
  default     = false
}

variable "gpu_node_instance_types" {
  description = "Instance types for GPU nodes"
  type        = list(string)
  default     = ["p3.2xlarge", "p3.8xlarge"]
}

variable "enable_inference_endpoints" {
  description = "Enable SageMaker inference endpoints"
  type        = bool
  default     = false
}

# =============================================================================
# COMPLIANCE AND GOVERNANCE
# =============================================================================

variable "enable_cloudtrail" {
  description = "Enable CloudTrail for audit logging"
  type        = bool
  default     = true
}

variable "enable_config" {
  description = "Enable AWS Config for compliance"
  type        = bool
  default     = true
}

variable "enable_guardduty" {
  description = "Enable GuardDuty for threat detection"
  type        = bool
  default     = true
}

variable "compliance_framework" {
  description = "Compliance framework (SOC2, HIPAA, PCI-DSS)"
  type        = string
  default     = "SOC2"
  
  validation {
    condition     = contains(["SOC2", "HIPAA", "PCI-DSS", "GDPR"], var.compliance_framework)
    error_message = "Compliance framework must be one of: SOC2, HIPAA, PCI-DSS, GDPR."
  }
}

# =============================================================================
# FEATURE FLAGS
# =============================================================================

variable "feature_flags" {
  description = "Feature flags for enabling/disabling features"
  type = object({
    enable_advanced_monitoring = bool
    enable_service_mesh        = bool
    enable_autoscaling         = bool
    enable_chaos_engineering   = bool
    enable_canary_deployments  = bool
  })
  default = {
    enable_advanced_monitoring = true
    enable_service_mesh        = false
    enable_autoscaling         = true
    enable_chaos_engineering   = false
    enable_canary_deployments  = false
  }
}

# =============================================================================
# RESOURCE TAGGING
# =============================================================================

variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "cost_center" {
  description = "Cost center for resource billing"
  type        = string
  default     = "engineering"
}

variable "owner" {
  description = "Owner of the resources"
  type        = string
  default     = "platform-team"
}

# =============================================================================
# ENVIRONMENT-SPECIFIC OVERRIDES
# =============================================================================

variable "environment_configs" {
  description = "Environment-specific configurations"
  type = map(object({
    node_count          = number
    instance_types      = list(string)
    enable_spot         = bool
    backup_retention    = number
    monitoring_level    = string
  }))
  default = {
    dev = {
      node_count          = 2
      instance_types      = ["t3.medium", "t3.large"]
      enable_spot         = true
      backup_retention    = 7
      monitoring_level    = "basic"
    }
    staging = {
      node_count          = 3
      instance_types      = ["m5.large", "m5.xlarge"]
      enable_spot         = true
      backup_retention    = 14
      monitoring_level    = "enhanced"
    }
    production = {
      node_count          = 5
      instance_types      = ["m5.xlarge", "m5.2xlarge"]
      enable_spot         = false
      backup_retention    = 30
      monitoring_level    = "comprehensive"
    }
  }
} 