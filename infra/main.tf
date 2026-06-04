terraform {
  required_version = ">= 1.5"
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

variable "aws_region" {
  description = "AWS region — ap-southeast-2 for Australian data residency"
  type        = string
  default     = "ap-southeast-2"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "project_name" {
  type    = string
  default = "proofpath"
}

# VPC, RDS, ECS, CloudFront, S3, KMS — expand per deployment sprint
module "networking" {
  source = "./modules/networking"
  environment = var.environment
  project_name = var.project_name
}
