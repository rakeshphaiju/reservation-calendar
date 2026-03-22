variable "namespace" {
  description = "Kubernetes namespace for the application stack."
  type        = string
  default     = "reservation-app"
}

variable "db_name" {
  description = "Application database name."
  type        = string
}

variable "db_user" {
  description = "Application database user."
  type        = string
}

variable "db_password" {
  description = "Application database password."
  type        = string
  sensitive   = true
}

variable "storage_size" {
  description = "Persistent volume size for PostgreSQL."
  type        = string
  default     = "8Gi"
}

variable "kubeconfig_path" {
  description = "Path to the kubeconfig file used by Terraform providers."
  type        = string
  default     = "~/.kube/config"
}

variable "kubeconfig_context" {
  description = "Kubernetes context used by Terraform providers."
  type        = string
  default     = "minikube"
}

variable "postgres_chart_version" {
  description = "Bitnami PostgreSQL Helm chart version."
  type        = string
  default     = "18.4.0"
}

variable "app_image_repository" {
  description = "Reservation API container image repository."
  type        = string
  default     = "rakeshphaiju/reservation-calender"
}

variable "app_image_tag" {
  description = "Reservation API container image tag."
  type        = string
  default     = "latest"
}

variable "api_replicas" {
  description = "Number of Reservation API replicas."
  type        = number
  default     = 2
}

variable "redis_enabled" {
  description = "Deploy Redis in-cluster for Celery."
  type        = bool
  default     = true
}

variable "celery_enabled" {
  description = "Deploy Celery worker and beat workloads."
  type        = bool
  default     = true
}

variable "celery_worker_replicas" {
  description = "Number of Celery worker replicas."
  type        = number
  default     = 1
}

variable "celery_beat_enabled" {
  description = "Deploy Celery beat for scheduled tasks."
  type        = bool
  default     = true
}

variable "image_pull_policy" {
  description = "Image pull policy for the Reservation API deployment."
  type        = string
  default     = "IfNotPresent"

  validation {
    condition     = contains(["Always", "IfNotPresent", "Never"], var.image_pull_policy)
    error_message = "image_pull_policy must be one of Always, IfNotPresent, or Never."
  }
}

variable "service_type" {
  description = "Kubernetes service type exposed by the Reservation API chart."
  type        = string
  default     = "ClusterIP"
}

variable "service_port" {
  description = "Kubernetes service port exposed by the Reservation API chart."
  type        = number
  default     = 80
}

variable "ingress_host" {
  description = "DNS host configured for the Reservation API ingress."
  type        = string
  default     = "reservation.local"
}
