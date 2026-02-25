resource "helm_release" "reservation_api" {
  name       = "reservation-api"
  chart      = "${path.module}/../../charts/reservation-api"
  namespace  = var.namespace
  version    = var.chart_version

  depends_on = [var.postgres_depends_on]

  values = [
    templatefile("${path.module}/reservation-api-values.yaml", {
      replicas          = var.replicas
      image_repository  = var.image_repository
      image_tag         = var.image_tag
      image_pull_policy = var.image_pull_policy

      db_host     = var.db_host
      db_port     = var.db_port
      db_user     = var.db_user
      db_password = var.db_password
      db_name     = var.db_name
      db_ssl_mode = var.db_ssl_mode

      service_type = var.service_type
      service_port = var.service_port

    })
  ]

  set_sensitive {
    name  = "database.password"
    value = var.db_password
  }
}
