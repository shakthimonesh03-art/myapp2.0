variable "aws_region" {
  description = "AWS region where notification resources will be created"
  type        = string
  default     = "ap-south-1"
}

variable "application_name" {
  description = "Application tag value"
  type        = string
  default     = "ticketpulse"
}

variable "environment" {
  description = "Environment tag value (dev/staging/prod)"
  type        = string
  default     = "dev"
}

variable "sns_topic_name" {
  description = "SNS topic name for notifications"
  type        = string
  default     = "Ticketpulse"
}

variable "sqs_queue_name" {
  description = "SQS queue name for notification fan-out consumption"
  type        = string
  default     = "myqueus"
}

variable "sqs_visibility_timeout_seconds" {
  description = "Visibility timeout for the SQS queue"
  type        = number
  default     = 30
}

variable "sqs_message_retention_seconds" {
  description = "Message retention period for SQS queue"
  type        = number
  default     = 345600
}

variable "iam_user_name" {
  description = "IAM user for application notification access"
  type        = string
  default     = "ticketpulse-notifier"
}
