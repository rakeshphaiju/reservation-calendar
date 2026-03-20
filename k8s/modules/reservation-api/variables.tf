variable "namespace" {
  description = "Kubernetes namespace"
  type        = string
}

variable "replicas" {
  description = "Number of replicas"
  type        = number
  default     = 2
}

variable "image_repository" {
  description = "Docker image repository"
  type        = string
}

variable "image_tag" {
  description = "Docker image tag"
  type        = string
  default     = "latest"
}

variable "image_pull_policy" {
  description = "Image pull policy"
  type        = string
  default     = "Always"
}

variable "db_host" {
  description = "Database host"
  type        = string
}

variable "db_port" {
  description = "Database port"
  type        = number
  default     = 5432
}

variable "db_user" {
  description = "Database user"
  type        = string
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "Database name"
  type        = string
}

variable "db_ssl_mode" {
  description = "Database SSL mode"
  type        = string
  default     = "disable"
}

variable "service_type" {
  description = "Kubernetes service type"
  type        = string
  default     = "ClusterIP"
}

variable "service_port" {
  description = "Service port"
  type        = number
  default     = 80
}

variable "resources" {
  description = "Resource limits and requests"
  type = object({
    limits = object({
      cpu    = string
      memory = string
    })
    requests = object({
      cpu    = string
      memory = string
    })
  })
  default = {
    limits = {
      cpu    = "500m"
      memory = "512Mi"
    }
    requests = {
      cpu    = "250m"
      memory = "256Mi"
    }
  }
}

variable "extra_env_vars" {
  description = "Additional environment variables"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "probes" {
  description = "Readiness and liveness probe configuration"
  type = object({
    readiness = object({
      initialDelaySeconds = number
      periodSeconds       = number
      timeoutSeconds      = number
      failureThreshold    = number
    })
    liveness = object({
      initialDelaySeconds = number
      periodSeconds       = number
      timeoutSeconds      = number
      failureThreshold    = number
    })
  })
  default = {
    readiness = {
      initialDelaySeconds = 15
      periodSeconds       = 5
      timeoutSeconds      = 3
      failureThreshold    = 3
    }
    liveness = {
      initialDelaySeconds = 30
      periodSeconds       = 10
      timeoutSeconds      = 3
      failureThreshold    = 3
    }
  }
}

variable "chart_version" {
  description = "Helm chart version"
  type        = string
  default     = "0.1.0"
}

variable "helm_timeout" {
  description = "Helm install timeout"
  type        = number
  default     = 300
}

variable "wait_for_ready" {
  description = "Wait for resources to be ready"
  type        = bool
  default     = true
}

variable "atomic_upgrades" {
  description = "Atomic upgrades"
  type        = bool
  default     = true
}
