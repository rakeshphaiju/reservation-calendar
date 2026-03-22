locals {
  database_url = "postgresql+asyncpg://${var.db_user}:${var.db_password}@${var.db_host}:${var.db_port}/${var.db_name}${var.db_ssl_mode != "disable" ? "?sslmode=${var.db_ssl_mode}" : ""}"
}

resource "kubernetes_secret" "reservation_api_env" {
  metadata {
    name      = "reservation-api-env"
    namespace = var.namespace
  }

  type = "Opaque"

  data = {
    DATABASE_URL = local.database_url
    PGPASSWORD   = var.db_password
  }
}

resource "helm_release" "reservation_api" {
  name            = "reservation-api"
  chart           = "${path.module}/../../charts/reservation-api"
  namespace       = var.namespace
  version         = var.chart_version
  wait            = var.wait_for_ready
  timeout         = var.helm_timeout
  atomic          = var.atomic_upgrades
  cleanup_on_fail = true

  values = [
    templatefile("${path.module}/reservation-api-values.yaml", {
      replicas          = var.replicas
      image_repository  = var.image_repository
      image_tag         = var.image_tag
      image_pull_policy = var.image_pull_policy

      db_host     = var.db_host
      db_port     = var.db_port
      db_user     = var.db_user
      db_name     = var.db_name
      db_ssl_mode = var.db_ssl_mode

      env_secret_name = kubernetes_secret.reservation_api_env.metadata[0].name
      service_type    = var.service_type
      service_port    = var.service_port
      redis_enabled   = var.redis_enabled
      celery_enabled  = var.celery_enabled
      celery_workers  = var.celery_worker_replicas
      celery_beat     = var.celery_beat_enabled

    })
  ]
}
