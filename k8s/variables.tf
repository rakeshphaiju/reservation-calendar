# variables.tf
variable "namespace" {
  type    = string
  default = "reservation-app"
}

variable "app_image" {
  type    = string
  default = "rakeshphaiju/reservation-calender:latest"
}

variable "db_name" {
  type    = string
  default = "reservation_db"
}

variable "db_user" {
  type    = string
  default = "myuser"
}

variable "db_password" {
  type      = string
  sensitive = true
  default   = "mypassword"
}

variable "secret_key" {
  type      = string
  sensitive = true
  default   = "local-dev-secret-key"
}

variable "api_replicas" {
  type    = number
  default = 2
}
