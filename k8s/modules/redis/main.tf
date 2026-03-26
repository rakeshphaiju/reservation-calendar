resource "helm_release" "redis" {
  name       = "redis"
  repository = "oci://registry-1.docker.io/bitnamicharts"
  chart      = "redis"
  namespace  = var.namespace

  values = [
    templatefile("${path.module}/redis-values.yaml", {
      volume_size   = "${var.volume_size}"
      replica_count = "${var.replica_count}"
    })
  ]
}