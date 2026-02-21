# main.tf

# --- Namespace ---
resource "kubernetes_namespace" "app" {
  metadata {
    name = var.namespace
  }
}

# --- Secrets ---
resource "kubernetes_secret" "app_secrets" {
  metadata {
    name      = "app-secrets"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  data = {
    DATABASE_URL       = "postgresql+asyncpg://${var.db_user}:${var.db_password}@postgres:5432/${var.db_name}"
    POSTGRES_USER      = var.db_user
    POSTGRES_PASSWORD  = var.db_password
    POSTGRES_DB        = var.db_name
    SECRET_KEY         = var.secret_key
  }

  type = "Opaque"
}

# --- ConfigMap ---
resource "kubernetes_config_map" "app_config" {
  metadata {
    name      = "app-config"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  data = {
    AUTO_CREATE_TABLES    = "true"
    SQL_ECHO              = "false"
  }
}

# --- PostgreSQL PVC ---
resource "kubernetes_persistent_volume_claim" "postgres" {
  metadata {
    name      = "postgres-pvc"
    namespace = kubernetes_namespace.app.metadata[0].name
  }
  spec {
    access_modes = ["ReadWriteOnce"]
    resources {
      requests = { storage = "2Gi" }
    }
    storage_class_name = "standard"  # Minikube default storage class
  }
}

# --- PostgreSQL Deployment ---
resource "kubernetes_deployment" "postgres" {
  metadata {
    name      = "postgres"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    replicas = 1

    selector {
      match_labels = { app = "postgres" }
    }

    template {
      metadata {
        labels = { app = "postgres" }
      }

      spec {
        container {
          name  = "postgres"
          image = "postgres:16-alpine"

          port { container_port = 5432 }

          env {
            name = "POSTGRES_USER"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app_secrets.metadata[0].name
                key  = "POSTGRES_USER"
              }
            }
          }

          env {
            name = "POSTGRES_PASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app_secrets.metadata[0].name
                key  = "POSTGRES_PASSWORD"
              }
            }
          }

          env {
            name = "POSTGRES_DB"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app_secrets.metadata[0].name
                key  = "POSTGRES_DB"
              }
            }
          }

          volume_mount {
            name       = "postgres-storage"
            mount_path = "/var/lib/postgresql/data"
            sub_path = "pgdata"
          }

          readiness_probe {
            exec {
              command = ["pg_isready", "-U", var.db_user, "-d", var.db_name]
            }
            initial_delay_seconds = 10
            period_seconds        = 5
          }

          resources {
            requests = { memory = "256Mi", cpu = "250m" }
            limits   = { memory = "512Mi", cpu = "500m" }
          }
        }

        volume {
          name = "postgres-storage"
          persistent_volume_claim {
            claim_name = kubernetes_persistent_volume_claim.postgres.metadata[0].name
          }
        }
      }
    }
  }
}

# --- PostgreSQL Service ---
resource "kubernetes_service" "postgres" {
  metadata {
    name      = "postgres"
    namespace = kubernetes_namespace.app.metadata[0].name
  }
  spec {
    selector = { app = "postgres" }
    port {
      port        = 5432
      target_port = 5432
    }
    type = "ClusterIP"
  }
}

# --- FastAPI Deployment ---
resource "kubernetes_deployment" "api" {
  metadata {
    name      = "reservation-api"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    replicas = var.api_replicas

    selector {
      match_labels = { app = "reservation-api" }
    }

    strategy {
      type = "RollingUpdate"
      rolling_update {
        max_surge       = 1
        max_unavailable = 0
      }
    }

    template {
      metadata {
        labels = { app = "reservation-api" }
      }

      spec {
        # Wait for postgres to be ready
        init_container {
          name    = "wait-for-postgres"
          image   = "postgres:16-alpine"
          command = [
            "sh", "-c",
            "until pg_isready -h postgres -p 5432 -U ${var.db_user}; do echo 'Waiting for postgres...'; sleep 2; done"
          ]
        }

        container {
          name              = "reservation-api"
          image             = var.app_image
          image_pull_policy = "Always"

          port { container_port = 8000 }

          env {
            name = "DATABASE_URL"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app_secrets.metadata[0].name
                key  = "DATABASE_URL"
              }
            }
          }

          env {
            name = "PGPASSWORD"
            value_from {
            secret_key_ref {
            name = kubernetes_secret.app_secrets.metadata[0].name
            key  = "POSTGRES_PASSWORD"
                }
            }
        }

          env {
            name = "SECRET_KEY"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app_secrets.metadata[0].name
                key  = "SECRET_KEY"
              }
            }
          }

          env {
            name = "AUTO_CREATE_TABLES"
            value_from {
              config_map_key_ref {
                name = kubernetes_config_map.app_config.metadata[0].name
                key  = "AUTO_CREATE_TABLES"
              }
            }
          }

          readiness_probe {
            http_get {
              path = "/api/health"
              port = 8000
            }
            initial_delay_seconds = 15
            period_seconds        = 5
            failure_threshold     = 3
          }

          liveness_probe {
            http_get {
              path = "/api/health"
              port = 8000
            }
            initial_delay_seconds = 30
            period_seconds        = 10
          }

          resources {
            requests = { memory = "256Mi", cpu = "250m" }
            limits   = { memory = "512Mi", cpu = "500m" }
          }
        }
      }
    }
  }

  depends_on = [
    kubernetes_deployment.postgres,
    kubernetes_service.postgres,
  ]
}

# --- FastAPI Service ---
resource "kubernetes_service" "api" {
  metadata {
    name      = "reservation-api"
    namespace = kubernetes_namespace.app.metadata[0].name
  }
  spec {
    selector = { app = "reservation-api" }
    port {
      port        = 80
      target_port = 8000
    }
    type = "ClusterIP"
  }
}

# --- Ingress ---
resource "kubernetes_ingress_v1" "app" {
  metadata {
    name      = "reservation-ingress"
    namespace = kubernetes_namespace.app.metadata[0].name
    annotations = {
      "nginx.ingress.kubernetes.io/rewrite-target" = "/"
    }
  }

  spec {
    ingress_class_name = "nginx"

    rule {
      host = "reservation.local"  # Add to /etc/hosts
      http {
        path {
          path      = "/"
          path_type = "Prefix"
          backend {
            service {
              name = kubernetes_service.api.metadata[0].name
              port { number = 80 }
            }
          }
        }
      }
    }
  }
}

# --- HPA ---
resource "kubernetes_horizontal_pod_autoscaler_v2" "api" {
  metadata {
    name      = "reservation-api-hpa"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment.api.metadata[0].name
    }

    min_replicas = 1
    max_replicas = 5

    metric {
      type = "Resource"
      resource {
        name = "cpu"
        target {
          type                = "Utilization"
          average_utilization = 70
        }
      }
    }
  }
}
