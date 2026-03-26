output "redis_host_internal" {
  value = "${helm_release.redis.name}-master.${var.namespace}.svc.cluster.local"
}
