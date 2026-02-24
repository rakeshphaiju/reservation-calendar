output "service_name" {
  description = "Service name"
  value       = "reservation-api.${var.namespace}.svc.cluster.local"
}

output "service_port" {
  description = "Service port"
  value       = var.service_port
}

output "release_name" {
  description = "Helm release name"
  value       = helm_release.reservation_api.name
}

output "release_namespace" {
  description = "Helm release namespace"
  value       = helm_release.reservation_api.namespace
}

output "app_version" {
  description = "Application version"
  value       = helm_release.reservation_api.version
}

output "full_service_name" {
  description = "Full service name with namespace"
  value       = "reservation-api.${var.namespace}.svc.cluster.local:${var.service_port}"
}

output "helm_status" {
  description = "Helm release status"
  value       = helm_release.reservation_api.status
}