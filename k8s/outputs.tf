output "namespace" {
  value = var.namespace
}

output "access_url" {
  value = "http://${var.ingress_host}"
}

output "port_forward_command" {
  value = "kubectl port-forward service/reservation-api 8000:80 -n ${var.namespace}"
}
