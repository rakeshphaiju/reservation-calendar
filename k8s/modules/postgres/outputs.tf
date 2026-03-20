output "host" {
  value = "${helm_release.postgres.name}-postgresql.${var.namespace}.svc.cluster.local"
}

output "port" {
  value = 5432
}

output "connection_string" {
  value     = "postgresql://${var.db_user}:${var.db_password}@${helm_release.postgres.name}-postgresql.${var.namespace}.svc.cluster.local:5432/${var.db_name}"
  sensitive = true
}

output "postgresql_host" {
  description = "PostgreSQL hostname"
  value       = "${helm_release.postgres.name}-postgresql.${var.namespace}.svc.cluster.local"
}

output "postgresql_port" {
  description = "PostgreSQL port"
  value       = 5432
}

output "postgresql_service_name" {
  description = "PostgreSQL service name"
  value       = "${helm_release.postgres.name}-postgresql"
}

output "postgresql_namespace" {
  description = "PostgreSQL namespace"
  value       = var.namespace
}

output "postgresql_connection_string" {
  description = "PostgreSQL connection string"
  value       = "postgresql://${var.db_user}:${var.db_password}@${helm_release.postgres.name}-postgresql.${var.namespace}.svc.cluster.local:5432/${var.db_name}"
  sensitive   = true
}
