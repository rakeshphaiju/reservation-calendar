module "kube-namespace" {
  source    = "./modules/kube-namespace"
  namespace = var.namespace
}

module "postgres" {
  source        = "./modules/postgres"
  namespace     = var.namespace
  db_user       = var.db_user
  db_password   = var.db_password
  db_name       = var.db_name
  storage_size  = var.storage_size
  chart_version = var.postgres_chart_version

  depends_on = [module.kube-namespace]
}

module "redis" {
  source        = "./modules/redis"
  namespace     = var.namespace

  depends_on = [module.kube-namespace]
}

module "reservation_api" {
  source = "./modules/reservation-api"

  namespace = var.namespace

  replicas          = var.api_replicas
  image_repository  = var.app_image_repository
  image_tag         = var.app_image_tag
  redis_host       = module.redis.redis_host_internal
  db_host      = module.postgres.postgresql_host
  db_port      = module.postgres.postgresql_port
  db_user      = var.db_user
  db_password  = var.db_password
  db_name      = var.db_name
  service_type = var.service_type
  service_port = var.service_port

  depends_on = [module.postgres]
}
