# Consul configuration for Heady service mesh
# Service discovery for all 52 Heady microservices
# Health check intervals use Fibonacci values for phi-harmonic distribution

datacenter = "heady-us-east1"
data_dir   = "/consul/data"
log_level  = "INFO"

server     = true
bootstrap_expect = 3

bind_addr   = "0.0.0.0"
client_addr = "0.0.0.0"

ui_config {
  enabled = true
}

# ── ACL (Access Control Lists) ────────────────────────────────────────────────
acl = {
  enabled        = true
  default_policy = "deny"
  enable_token_persistence = true
}

# ── Connect (Service Mesh) ────────────────────────────────────────────────────
connect {
  enabled = true
}

# ── Ports ─────────────────────────────────────────────────────────────────────
ports {
  http     = 8500
  https    = 8501
  grpc     = 8502
  serf_lan = 8301
  serf_wan = 8302
  server   = 8300
  dns      = 8600
}

# ── TLS configuration ─────────────────────────────────────────────────────────
tls {
  defaults {
    ca_file   = "/consul/certs/ca.pem"
    cert_file = "/consul/certs/server.pem"
    key_file  = "/consul/certs/server-key.pem"
    verify_incoming = true
    verify_outgoing = true
  }
}

# ── Telemetry ─────────────────────────────────────────────────────────────────
telemetry {
  prometheus_retention_time = "89s"    # fib(11) seconds
  disable_hostname          = true
}

# ── Service definitions ───────────────────────────────────────────────────────
# These are registered programmatically by each service on startup via consul_register()
# in service-base.js. The Fibonacci-scaled health check intervals are set by the service.
#
# Example of what each service registers:
# {
#   "ID": "heady-brain-a1b2c3d4",
#   "Name": "heady-brain",
#   "Port": 8100,
#   "Tags": ["heady", "autocontext", "domain:inference"],
#   "Check": {
#     "HTTP": "http://heady-brain:8100/health",
#     "Interval": "48s",         ← 30 × φ ≈ 48s
#     "DeregisterCriticalServiceAfter": "89s"  ← fib(11)
#   }
# }

# ── Prepared queries for domain-based service discovery ───────────────────────
# (Applied via Consul API after initialization)
# These enable CSL domain routing: lookup by domain tag, not service name
#
# POST /v1/query
# {
#   "Name": "heady-domain-inference",
#   "Service": {
#     "Service": "",
#     "Tags": ["domain:inference"],
#     "OnlyPassing": true,
#     "Near": "_agent"
#   }
# }
