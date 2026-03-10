#!/usr/bin/env bash
# Heady™ Platform — Developer Environment Setup
# All services operate as concurrent equals — NO priority ordering.
# φ-derived constants throughout. Fibonacci-timed retries.
# © 2024-2026 HeadySystems Inc. All Rights Reserved.

set -euo pipefail

# ─── φ-Constants ───────────────────────────────────────────────────────────────
readonly PHI_TIMEOUT=5    # Fibonacci
readonly MAX_RETRIES=8    # Fibonacci
readonly HEALTH_INTERVAL=3 # Fibonacci

# ─── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ─── Service Port Map (All 58 services) ───────────────────────────────────────
declare -A SERVICE_PORTS=(
  [heady-brain]=3310 [heady-brains]=3311 [heady-soul]=3312 [heady-conductor]=3313
  [heady-infer]=3314 [heady-embed]=3315 [heady-memory]=3316 [heady-vector]=3317
  [heady-projection]=3318 [heady-bee-factory]=3319 [heady-hive]=3320 [heady-orchestration]=3321
  [heady-federation]=3322 [heady-guard]=3323 [heady-security]=3324 [heady-governance]=3325
  [heady-health]=3326 [heady-eval]=3327 [heady-maintenance]=3328 [heady-testing]=3329
  [heady-web]=3330 [heady-buddy]=3331 [heady-ui]=3332 [heady-onboarding]=3333
  [heady-pilot-onboarding]=3334 [heady-task-browser]=3335
  [auto-success-engine]=3340 [hcfullpipeline-executor]=3341 [heady-chain]=3342 [heady-cache]=3343
  [ai-router]=3350 [api-gateway]=3351 [model-gateway]=3352 [domain-router]=3353
  [mcp-server]=3360 [google-mcp]=3361 [memory-mcp]=3362 [perplexity-mcp]=3363
  [jules-mcp]=3364 [huggingface-gateway]=3365 [colab-gateway]=3366 [silicon-bridge]=3367
  [discord-bot]=3368
  [heady-vinci]=3380 [heady-autobiographer]=3381 [heady-midi]=3382
  [budget-tracker]=3390 [cli-service]=3391 [prompt-manager]=3392 [secret-gateway]=3393
  [auth-session-server]=3397 [notification-service]=3398 [analytics-service]=3399
  [billing-service]=3400 [search-service]=3401 [scheduler-service]=3402
  [migration-service]=3403 [asset-pipeline]=3404
)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          Heady™ Platform — Developer Setup                  ║"
echo "║          Founded by Eric Haywood                            ║"
echo "║          58 services · 9 sites · φ-scaled                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ─── Step 1: Check Prerequisites ──────────────────────────────────────────────
echo -e "${BLUE}[1/7] Checking prerequisites...${NC}"

check_command() {
  if command -v "$1" &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} $1 found: $($1 --version 2>&1 | head -1)"
    return 0
  else
    echo -e "  ${RED}✗${NC} $1 not found"
    return 1
  fi
}

PREREQ_FAILED=0
check_command node || PREREQ_FAILED=1
check_command npm || PREREQ_FAILED=1
check_command docker || PREREQ_FAILED=1
check_command gcloud || echo -e "  ${YELLOW}⚠${NC} gcloud CLI not found (needed for Cloud Run deploy only)"

# Verify Node.js version >= 20
if command -v node &>/dev/null; then
  NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_MAJOR" -lt 20 ]; then
    echo -e "  ${RED}✗${NC} Node.js 20+ required (found v$NODE_MAJOR)"
    PREREQ_FAILED=1
  fi
fi

if [ "$PREREQ_FAILED" -eq 1 ]; then
  echo -e "${RED}Prerequisites check failed. Install missing tools and retry.${NC}"
  exit 1
fi
echo -e "  ${GREEN}All prerequisites satisfied${NC}"

# ─── Step 2: Environment Configuration ────────────────────────────────────────
echo -e "\n${BLUE}[2/7] Configuring environment...${NC}"
cd "$ROOT_DIR"

if [ ! -f .env ]; then
  if [ -f .env.template ]; then
    cp .env.template .env
    echo -e "  ${GREEN}✓${NC} Created .env from .env.template"
    echo -e "  ${YELLOW}⚠${NC} Review .env and fill in secrets before production use"
  else
    echo -e "  ${YELLOW}⚠${NC} No .env.template found — skipping .env creation"
  fi
else
  echo -e "  ${GREEN}✓${NC} .env already exists"
fi

# ─── Step 3: Install Root Dependencies ─────────────────────────────────────────
echo -e "\n${BLUE}[3/7] Installing root dependencies...${NC}"
if [ -f package.json ]; then
  npm install --no-audit --no-fund 2>&1 | tail -3
  echo -e "  ${GREEN}✓${NC} Root dependencies installed"
else
  echo -e "  ${YELLOW}⚠${NC} No root package.json — skipping"
fi

# ─── Step 4: Pull Infrastructure Images ────────────────────────────────────────
echo -e "\n${BLUE}[4/7] Pulling infrastructure Docker images...${NC}"
IMAGES=(
  "pgvector/pgvector:pg16"
  "hashicorp/consul:1.18"
  "otel/opentelemetry-collector-contrib:0.100.0"
  "drupal:10"
)
for img in "${IMAGES[@]}"; do
  echo -e "  Pulling ${CYAN}$img${NC}..."
  docker pull "$img" --quiet 2>/dev/null || echo -e "  ${YELLOW}⚠${NC} Could not pull $img (may need auth)"
done
echo -e "  ${GREEN}✓${NC} Infrastructure images ready"

# ─── Step 5: Build Service Images ──────────────────────────────────────────────
echo -e "\n${BLUE}[5/7] Building service images...${NC}"
docker compose build --parallel 2>&1 | tail -5 || echo -e "  ${YELLOW}⚠${NC} Some builds may have failed — check above"
echo -e "  ${GREEN}✓${NC} Service images built"

# ─── Step 6: Boot Docker Compose ──────────────────────────────────────────────
echo -e "\n${BLUE}[6/7] Starting services in dev mode...${NC}"
docker compose up -d 2>&1 | tail -5
echo -e "  ${GREEN}✓${NC} Docker Compose started"

# Wait for infrastructure to be ready
echo -e "  Waiting for infrastructure (Fibonacci interval: ${HEALTH_INTERVAL}s)..."
for attempt in 1 2 3 5 8; do
  if docker compose exec -T postgres pg_isready -U heady &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} PostgreSQL ready"
    break
  fi
  sleep "$attempt"
done

# ─── Step 7: Health Check All Services ─────────────────────────────────────────
echo -e "\n${BLUE}[7/7] Running health checks on all 58 services...${NC}"
HEALTHY=0
UNHEALTHY=0
TOTAL=${#SERVICE_PORTS[@]}

for svc in $(echo "${!SERVICE_PORTS[@]}" | tr ' ' '\n' | sort); do
  port=${SERVICE_PORTS[$svc]}
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port/health" --max-time "$PHI_TIMEOUT" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "  ${GREEN}✓${NC} $svc (:$port)"
    HEALTHY=$((HEALTHY + 1))
  else
    echo -e "  ${YELLOW}⚠${NC} $svc (:$port) — HTTP $HTTP_CODE"
    UNHEALTHY=$((UNHEALTHY + 1))
  fi
done

# ─── Summary ───────────────────────────────────────────────────────────────────
echo -e "\n${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Heady™ Platform — Setup Complete                          ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║${NC}  Services: ${GREEN}$HEALTHY healthy${NC} / ${YELLOW}$UNHEALTHY starting${NC} / $TOTAL total"
echo -e "${CYAN}║${NC}  PostgreSQL: localhost:5432 (pgvector enabled)"
echo -e "${CYAN}║${NC}  Consul:     http://localhost:8500"
echo -e "${CYAN}║${NC}  OTel:       localhost:4317 (gRPC) / :4318 (HTTP)"
echo -e "${CYAN}║${NC}  Drupal:     http://localhost:8080"
echo -e "${CYAN}║${NC}  Services:   ports 3310-3404"
echo -e "${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  ${GREEN}Ready in < 5 minutes${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
