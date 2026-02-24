variable "namespace" {
  type        = string
  default     = "reservation-app"
}

variable "db_name" {
  type        = string
  default     = "reservation_db"
}

variable "db_user" {
  type        = string
  default     = "appuser"
}

variable "db_password" {
  type        = string
  sensitive   = true
  default     = "changeme123"
}

variable "storage_size" {
  type        = string
  default     = "8Gi"
}

variable "app_image" {
  type        = string
  default     = "rakeshphaiju/reservation-calender:latest"
}

variable "api_replicas" {
  type        = number
  default     = 2
}
