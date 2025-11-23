# =============================================================================
# COINET AI KUBERNETES MODULE - EKS CLUSTER
# Advanced Kubernetes cluster configuration for AI workloads
# =============================================================================

terraform {
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
  }
}

# =============================================================================
# DATA SOURCES
# =============================================================================

data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

# =============================================================================
# EKS CLUSTER
# =============================================================================

resource "aws_eks_cluster" "main" {
  name     = var.cluster_name
  role_arn = aws_iam_role.cluster.arn
  version  = var.cluster_version

  vpc_config {
    subnet_ids              = var.subnet_ids
    endpoint_private_access = var.enable_private_endpoint
    endpoint_public_access  = var.enable_public_endpoint
    public_access_cidrs     = var.public_access_cidrs
    
    security_group_ids = [aws_security_group.cluster.id]
  }

  # Enable logging for all log types
  enabled_cluster_log_types = [
    "api",
    "audit", 
    "authenticator",
    "controllerManager",
    "scheduler"
  ]

  # Encryption configuration
  dynamic "encryption_config" {
    for_each = var.enable_encryption ? [1] : []
    content {
      provider {
        key_arn = var.kms_key_arn
      }
      resources = ["secrets"]
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.cluster_amazon_eks_cluster_policy,
    aws_iam_role_policy_attachment.cluster_amazon_eks_vpc_resource_controller,
    aws_cloudwatch_log_group.cluster,
  ]

  tags = var.tags
}

# =============================================================================
# CLOUDWATCH LOG GROUP
# =============================================================================

resource "aws_cloudwatch_log_group" "cluster" {
  name              = "/aws/eks/${var.cluster_name}/cluster"
  retention_in_days = var.cloudwatch_log_retention_days
  kms_key_id        = var.kms_key_arn

  tags = var.tags
}

# =============================================================================
# EKS NODE GROUPS
# =============================================================================

# General purpose node group
resource "aws_eks_node_group" "general" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.cluster_name}-general"
  node_role_arn   = aws_iam_role.node_group.arn
  subnet_ids      = var.subnet_ids

  capacity_type  = var.node_groups["general"].capacity_type
  instance_types = var.node_groups["general"].instance_types
  disk_size      = 50

  scaling_config {
    desired_size = var.node_groups["general"].desired_size
    max_size     = var.node_groups["general"].max_size
    min_size     = var.node_groups["general"].min_size
  }

  update_config {
    max_unavailable = 1
  }

  # Launch template configuration
  launch_template {
    id      = aws_launch_template.general.id
    version = aws_launch_template.general.latest_version
  }

  labels = merge(
    var.node_groups["general"].labels,
    {
      "node.kubernetes.io/instance-type" = "general"
    }
  )

  # Taints
  dynamic "taint" {
    for_each = var.node_groups["general"].taints
    content {
      key    = taint.value.key
      value  = taint.value.value
      effect = taint.value.effect
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.node_group_amazon_eks_worker_node_policy,
    aws_iam_role_policy_attachment.node_group_amazon_eks_cni_policy,
    aws_iam_role_policy_attachment.node_group_amazon_ec2_container_registry_read_only,
  ]

  tags = merge(var.tags, {
    Name = "${var.cluster_name}-general-nodegroup"
    Type = "general"
  })
}

# AI/ML compute node group
resource "aws_eks_node_group" "ai_compute" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.cluster_name}-ai-compute"
  node_role_arn   = aws_iam_role.node_group.arn
  subnet_ids      = var.subnet_ids

  capacity_type  = var.node_groups["ai_compute"].capacity_type
  instance_types = var.node_groups["ai_compute"].instance_types
  disk_size      = 100

  scaling_config {
    desired_size = var.node_groups["ai_compute"].desired_size
    max_size     = var.node_groups["ai_compute"].max_size
    min_size     = var.node_groups["ai_compute"].min_size
  }

  update_config {
    max_unavailable = 1
  }

  # Launch template for AI workloads
  launch_template {
    id      = aws_launch_template.ai_compute.id
    version = aws_launch_template.ai_compute.latest_version
  }

  labels = merge(
    var.node_groups["ai_compute"].labels,
    {
      "node.kubernetes.io/instance-type" = "ai-compute"
      "coinet.ai/workload-type"          = "ml"
    }
  )

  # Taints for AI workloads
  dynamic "taint" {
    for_each = var.node_groups["ai_compute"].taints
    content {
      key    = taint.value.key
      value  = taint.value.value
      effect = taint.value.effect
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.node_group_amazon_eks_worker_node_policy,
    aws_iam_role_policy_attachment.node_group_amazon_eks_cni_policy,
    aws_iam_role_policy_attachment.node_group_amazon_ec2_container_registry_read_only,
  ]

  tags = merge(var.tags, {
    Name = "${var.cluster_name}-ai-compute-nodegroup"
    Type = "ai-compute"
  })
}

# Memory optimized node group
resource "aws_eks_node_group" "memory_optimized" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.cluster_name}-memory-optimized"
  node_role_arn   = aws_iam_role.node_group.arn
  subnet_ids      = var.subnet_ids

  capacity_type  = var.node_groups["memory_optimized"].capacity_type
  instance_types = var.node_groups["memory_optimized"].instance_types
  disk_size      = 100

  scaling_config {
    desired_size = var.node_groups["memory_optimized"].desired_size
    max_size     = var.node_groups["memory_optimized"].max_size
    min_size     = var.node_groups["memory_optimized"].min_size
  }

  update_config {
    max_unavailable = 1
  }

  # Launch template for memory intensive workloads
  launch_template {
    id      = aws_launch_template.memory_optimized.id
    version = aws_launch_template.memory_optimized.latest_version
  }

  labels = merge(
    var.node_groups["memory_optimized"].labels,
    {
      "node.kubernetes.io/instance-type" = "memory-optimized"
      "coinet.ai/workload-type"          = "data-processing"
    }
  )

  depends_on = [
    aws_iam_role_policy_attachment.node_group_amazon_eks_worker_node_policy,
    aws_iam_role_policy_attachment.node_group_amazon_eks_cni_policy,
    aws_iam_role_policy_attachment.node_group_amazon_ec2_container_registry_read_only,
  ]

  tags = merge(var.tags, {
    Name = "${var.cluster_name}-memory-optimized-nodegroup"
    Type = "memory-optimized"
  })
}

# =============================================================================
# LAUNCH TEMPLATES
# =============================================================================

# General purpose launch template
resource "aws_launch_template" "general" {
  name_prefix   = "${var.cluster_name}-general-"
  image_id      = data.aws_ssm_parameter.eks_ami_release_version.value
  instance_type = var.node_groups["general"].instance_types[0]

  vpc_security_group_ids = [aws_security_group.node_group.id]

  user_data = base64encode(templatefile("${path.module}/userdata.sh", {
    cluster_name        = aws_eks_cluster.main.name
    container_runtime   = "containerd"
    cluster_endpoint    = aws_eks_cluster.main.endpoint
    cluster_ca_cert     = aws_eks_cluster.main.certificate_authority[0].data
    bootstrap_arguments = "--use-max-pods false --container-runtime containerd"
  }))

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 50
      volume_type           = "gp3"
      iops                  = 3000
      throughput            = 150
      encrypted             = true
      delete_on_termination = true
    }
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
    instance_metadata_tags      = "enabled"
  }

  monitoring {
    enabled = true
  }

  tag_specifications {
    resource_type = "instance"
    tags = merge(var.tags, {
      Name = "${var.cluster_name}-general-node"
      Type = "general"
    })
  }

  tags = var.tags
}

# AI compute launch template
resource "aws_launch_template" "ai_compute" {
  name_prefix   = "${var.cluster_name}-ai-compute-"
  image_id      = data.aws_ssm_parameter.eks_ami_release_version.value
  instance_type = var.node_groups["ai_compute"].instance_types[0]

  vpc_security_group_ids = [aws_security_group.node_group.id]

  user_data = base64encode(templatefile("${path.module}/userdata.sh", {
    cluster_name        = aws_eks_cluster.main.name
    container_runtime   = "containerd"
    cluster_endpoint    = aws_eks_cluster.main.endpoint
    cluster_ca_cert     = aws_eks_cluster.main.certificate_authority[0].data
    bootstrap_arguments = "--use-max-pods false --container-runtime containerd --kubelet-extra-args '--node-labels=coinet.ai/workload-type=ml'"
  }))

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 100
      volume_type           = "gp3"
      iops                  = 3000
      throughput            = 150
      encrypted             = true
      delete_on_termination = true
    }
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
    instance_metadata_tags      = "enabled"
  }

  monitoring {
    enabled = true
  }

  tag_specifications {
    resource_type = "instance"
    tags = merge(var.tags, {
      Name = "${var.cluster_name}-ai-compute-node"
      Type = "ai-compute"
    })
  }

  tags = var.tags
}

# Memory optimized launch template
resource "aws_launch_template" "memory_optimized" {
  name_prefix   = "${var.cluster_name}-memory-optimized-"
  image_id      = data.aws_ssm_parameter.eks_ami_release_version.value
  instance_type = var.node_groups["memory_optimized"].instance_types[0]

  vpc_security_group_ids = [aws_security_group.node_group.id]

  user_data = base64encode(templatefile("${path.module}/userdata.sh", {
    cluster_name        = aws_eks_cluster.main.name
    container_runtime   = "containerd"
    cluster_endpoint    = aws_eks_cluster.main.endpoint
    cluster_ca_cert     = aws_eks_cluster.main.certificate_authority[0].data
    bootstrap_arguments = "--use-max-pods false --container-runtime containerd --kubelet-extra-args '--node-labels=coinet.ai/workload-type=data-processing'"
  }))

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 100
      volume_type           = "gp3"
      iops                  = 3000
      throughput            = 150
      encrypted             = true
      delete_on_termination = true
    }
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
    instance_metadata_tags      = "enabled"
  }

  monitoring {
    enabled = true
  }

  tag_specifications {
    resource_type = "instance"
    tags = merge(var.tags, {
      Name = "${var.cluster_name}-memory-optimized-node"
      Type = "memory-optimized"
    })
  }

  tags = var.tags
}

# =============================================================================
# DATA SOURCE FOR EKS AMI
# =============================================================================

data "aws_ssm_parameter" "eks_ami_release_version" {
  name = "/aws/service/eks/optimized-ami/${var.cluster_version}/amazon-linux-2/recommended/image_id"
}

# =============================================================================
# SECURITY GROUPS
# =============================================================================

# Cluster security group
resource "aws_security_group" "cluster" {
  name        = "${var.cluster_name}-cluster-sg"
  description = "Security group for EKS cluster control plane"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.cluster_name}-cluster-sg"
  })
}

# Node group security group
resource "aws_security_group" "node_group" {
  name        = "${var.cluster_name}-node-sg"
  description = "Security group for EKS node groups"
  vpc_id      = var.vpc_id

  ingress {
    description = "Allow nodes to communicate with each other"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    self        = true
  }

  ingress {
    description     = "Allow worker Kubelets and pods to receive communication from the cluster control plane"
    from_port       = 1025
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.cluster.id]
  }

  ingress {
    description     = "Allow pods running extension API servers on port 443 to receive communication from cluster control plane"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.cluster.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.cluster_name}-node-sg"
  })
}

# Security group rules for cluster-node communication
resource "aws_security_group_rule" "cluster_ingress_node_https" {
  description              = "Allow pods to communicate with the cluster API Server"
  from_port                = 443
  protocol                 = "tcp"
  security_group_id        = aws_security_group.cluster.id
  source_security_group_id = aws_security_group.node_group.id
  to_port                  = 443
  type                     = "ingress"
} 