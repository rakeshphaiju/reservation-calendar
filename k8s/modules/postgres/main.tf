resource "helm_release" "postgres" {
  name       = "postgres"
  repository = "oci://registry-1.docker.io/bitnamicharts"
  chart      = "postgresql"
  version    = "18.4.0"
  namespace  = var.namespace

  values = [ 
    templatefile("${path.module}/postgres-values.yaml", {
      db_user      = var.db_user
      db_password  = var.db_password
      db_name      = var.db_name
      storage_size = var.storage_size
  })
  ]

  set_sensitive {
    name  = "auth.password"
    value = var.db_password
  }
}