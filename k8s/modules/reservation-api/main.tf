resource "helm_release" "reservation_api" {
  name       = "reservation-api"
  chart      = "${path.module}/../../charts/reservation-api"
  namespace  = var.namespace
  version    = var.chart_version
  
  # Wait for PostgreSQL to be ready
  depends_on = [var.postgres_depends_on]

  values = [
    yamlencode({
      replicaCount = var.replicas
      
      image = {
        repository = var.image_repository
        tag        = var.image_tag
        pullPolicy = var.image_pull_policy
      }
      
      database = {
        host     = var.db_host
        port     = var.db_port
        user     = var.db_user
        password = var.db_password
        name     = var.db_name
        sslMode  = var.db_ssl_mode
      }
      
      service = {
        type = var.service_type
        port = var.service_port
      }
      
      resources = var.resources
      
      env = var.extra_env_vars
      
      probes = var.probes
    })
  ]

  # Set sensitive values separately
  set_sensitive {
    name  = "database.password"
    value = var.db_password
  }

  # Additional Helm settings
  timeout          = var.helm_timeout
  wait             = var.wait_for_ready
  atomic           = var.atomic_upgrades
  cleanup_on_fail  = true
  create_namespace = false
}
