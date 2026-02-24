resource "helm_release" "postgres" {
  name       = "postgres"
  repository = "oci://registry-1.docker.io/bitnamicharts"
  chart      = "postgresql"
  version    = "18.4.0"
  namespace  = var.namespace

  values = [
    yamlencode({
      auth = {
        username = var.db_user
        password = var.db_password
        database = var.db_name
      }

      primary = {
        persistence = {
          enabled      = true
          size         = var.storage_size
          storageClass = "standard" 
        }
        
        resources = {
          requests = {
            memory = "256Mi"
            cpu    = "250m"
          }
          limits = {
            memory = "512Mi"
            cpu    = "500m"
          }
        }
      }

      volumePermissions = {
        enabled = false
      }
    })
  ]

  set_sensitive {
    name  = "auth.password"
    value = var.db_password
  }
}