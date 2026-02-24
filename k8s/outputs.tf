# outputs.tf
output "namespace" {
  value = kubernetes_namespace.app.metadata[0].name
}

output "access_url" {
  value = "http://reservation.local (add to /etc/hosts: ${data.external.minikube_ip.result["ip"]} reservation.local)"
}

output "port_forward_command" {
  value = "kubectl port-forward service/reservation-api 8000:80 -n ${var.namespace}"
}

data "external" "minikube_ip" {
  program = ["sh", "-c", "echo '{\"ip\": \"'$(minikube ip)'\"}'"]
}
