module "kube-namespace" {
  source = "./modules/kube-namespace"
}

module "postgres" {
  source        = "./modules/postgres"
  namespace     = var.namespace
  db_user       = var.db_user
  db_password   = var.db_password
  db_name       = var.db_name
  storage_size  = var.storage_size
}

module "reservation_api" {
  source = "./modules/reservation-api"

  namespace    = var.namespace
  postgres_depends_on = [module.postgres]

  image_repository = "rakeshphaiju/reservation-calender"
  image_tag        = "latest"

  # Database configuration (from PostgreSQL module)
  db_host     = module.postgres.postgresql_host
  db_port     = module.postgres.postgresql_port
  db_user     = "appuser"
  db_password = "changeme123"
  db_name     = "reservation_db"

  # Service configuration
  replicas      = 2
  service_type  = "ClusterIP"
  service_port  = 80

  # Resource configuration
  resources = {
    limits = {
      cpu    = "500m"
      memory = "512Mi"
    }
    requests = {
      cpu    = "250m"
      memory = "256Mi"
    }
  }

  # Additional environment variables
  extra_env_vars = [
    {
      name  = "LOG_LEVEL"
      value = "debug"
    },
    {
      name  = "AUTO_CREATE_TABLES"
      value = "true"
    }
  ]
}