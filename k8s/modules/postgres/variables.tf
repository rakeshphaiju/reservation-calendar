variable "namespace" {
  type        = string
  description = "Namespace where PostgreSQL will be deployed"
  default     = "reservation-app"
}

variable "db_user" {
  type        = string
  description = "PostgreSQL username"
  default     = "appuser"
}

variable "db_password" {
  type        = string
  description = "PostgreSQL password"
  sensitive   = true
}

variable "db_name" {
  type        = string
  description = "PostgreSQL database name"
  default     = "reservation_db"
}

variable "storage_size" {
  type        = string
  description = "Persistent storage size for PostgreSQL"
  default     = "2Gi"
}

variable "chart_version" {
  type        = string
  description = "Bitnami PostgreSQL Helm chart version"
  default     = "18.4.0"
}
