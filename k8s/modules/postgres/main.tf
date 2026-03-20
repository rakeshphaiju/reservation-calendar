resource "helm_release" "postgres" {
  name       = "postgres"
  repository = "oci://registry-1.docker.io/bitnamicharts"
  chart      = "postgresql"
  version    = var.chart_version
  namespace  = var.namespace
  wait       = true
  atomic     = true
  timeout    = 600

  values = [
    templatefile("${path.module}/postgres-values.yaml", {
      db_user      = var.db_user
      db_name      = var.db_name
      storage_size = var.storage_size
    })
  ]

  set_sensitive {
    name  = "auth.password"
    value = var.db_password
  }
}
