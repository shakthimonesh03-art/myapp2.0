output "ecr_repository_urls" {
  description = "The URLs of the ECR repositories."
  value       = module.ecr.repository_urls
}

output "eks_cluster_endpoint" {
  description = "The endpoint for your EKS cluster."
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_security_group_id" {
  description = "The ID of the EKS cluster security group."
  value       = module.eks.cluster_security_group_id
}