provider "aws" {
  region = var.aws_region
}

locals {
  repositories = [
    "auth",
    "users",
    "bookings",
    "payments",
    "notifications"
  ]
}

module "ecr" {
  source  = "terraform-aws-modules/ecr/aws"
  version = "~> 2.0"

  for_each = toset(local.repositories)

  repository_name = each.key

  repository_force_delete = true

  repository_image_scan_on_push = true

  tags = {
    Environment = "dev"
    Terraform   = "true"
  }
}

# module "ecr" {
#   source = "terraform-aws-modules/ecr/aws"

#   repository_names = [
#     "auth",
#     "users",
#     "bookings",
#     "payments",
#     "notifications"
#   ]
# }

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "18.29.0"

  cluster_name    = var.cluster_name
  cluster_version = "1.23"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  
  eks_managed_node_groups = {
    one = {
      instance_type = "t2.medium"
      min_size      = 2
      max_size      = 6
      desired_size  = 2
    }
  }
}

module "vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = "eks-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true
}