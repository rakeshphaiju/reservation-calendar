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

  db_host     = module.postgres.postgresql_host
  db_port     = module.postgres.postgresql_port
  db_user     = var.db_user
  db_password = var.db_password
  db_name     = var.db_name
}