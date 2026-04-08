terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_sns_topic" "notifications" {
  name = var.sns_topic_name

  tags = {
    Application = var.application_name
    ManagedBy   = "terraform"
    Environment = var.environment
  }
}

resource "aws_sqs_queue" "notifications" {
  name                       = var.sqs_queue_name
  visibility_timeout_seconds = var.sqs_visibility_timeout_seconds
  message_retention_seconds  = var.sqs_message_retention_seconds

  tags = {
    Application = var.application_name
    ManagedBy   = "terraform"
    Environment = var.environment
  }
}

resource "aws_sqs_queue_policy" "notifications" {
  queue_url = aws_sqs_queue.notifications.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowSNSPublishToSQS"
        Effect    = "Allow"
        Principal = { Service = "sns.amazonaws.com" }
        Action    = "sqs:SendMessage"
        Resource  = aws_sqs_queue.notifications.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_sns_topic.notifications.arn
          }
        }
      }
    ]
  })
}

resource "aws_sns_topic_subscription" "sqs_subscriber" {
  topic_arn = aws_sns_topic.notifications.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.notifications.arn
}

resource "aws_iam_user" "app_notifier" {
  name = var.iam_user_name
}

resource "aws_iam_user_policy" "app_notifier" {
  name = "${var.iam_user_name}-notifications-policy"
  user = aws_iam_user.app_notifier.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "AllowPublishToNotificationTopic"
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = aws_sns_topic.notifications.arn
      },
      {
        Sid      = "AllowConsumeFromNotificationQueue"
        Effect   = "Allow"
        Action   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
        Resource = aws_sqs_queue.notifications.arn
      }
    ]
  })
}

output "sns_topic_arn" {
  value       = aws_sns_topic.notifications.arn
  description = "SNS topic ARN for application notifications"
}

output "sqs_queue_url" {
  value       = aws_sqs_queue.notifications.id
  description = "SQS queue URL for application notifications"
}

output "sqs_queue_arn" {
  value       = aws_sqs_queue.notifications.arn
  description = "SQS queue ARN for application notifications"
}

output "iam_user_name" {
  value       = aws_iam_user.app_notifier.name
  description = "IAM user that can publish notifications and consume queue messages"
}
