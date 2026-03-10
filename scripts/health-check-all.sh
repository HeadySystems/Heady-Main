#!/usr/bin/env bash
# Heady™ Platform — Health Check All 58 Services
# All services operate as concurrent equals — NO priority ordering.
# © 2024-2026 HeadySystems Inc. All Rights Reserved.

set -uo pipefail

# ─── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# ─── Fibonacci Timeout ─────────────────────────────────────────────────────────
TIMEOUT=5  # Fibonacci seconds

# ─── All 58 Services (service:port) ───────────────────────────────────────────
SERVICES=(
  "heady-brain:3310"
  "heady-brains:3311"
  "heady-soul:3312"
  "heady-conductor:3313"
  "heady-infer:3314"
  "heady-embed:3315"
  "heady-memory:3316"
  "heady-vector:3317"
  "heady-projection:3318"
  "heady-bee-factory:3319"
  "heady-hive:3320"
  "heady-orchestration:3321"
  "heady-federation:3322"
  "heady-guard:3323"
  "heady-security:3324"
  "heady-governance:3325"
  "heady-health:3326"
  "heady-eval:3327"
  "heady-maintenance:3328"
  "heady-testing:3329"
  "heady-web:3330"
  "heady-buddy:3331"
  "heady-ui:3332"
  "heady-onboarding:3333"
  "heady-pilot-onboarding:3334"
  "heady-task-browser:3335"
  "auto-success-engine:3340"
  "hcfullpipeline-executor:3341"
  "heady-chain:3342"
  "heady-cache:3343"
  "ai-router:3350"
  "api-gateway:3351"
  "model-gateway:3352"
  "domain-router:3353"
  "mcp-server:3360"
  "google-mcp:3361"
  "memory-mcp:3362"
  "perplexity-mcp:3363"
  "jules-mcp:3364"
  "huggingface-gateway:3365"
  "colab-gateway:3366"
  "silicon-bridge:3367"
  "discord-bot:3368"
  "heady-vinci:3380"
  "heady-autobiographer:3381"
  "heady-midi:3382"
  "budget-tracker:3390"
  "cli-service:3391"
  "prompt-manager:3392"
  "secret-gateway:3393"
  "auth-session-server:3397"
  "notification-service:3398"
  "analytics-service:3399"
  "billing-service:3400"
  "search-service:3401"
  "scheduler-service:3402"
  "migration-service:3403"
  "asset-pipeline:3404"
)

HOST="${1:-localhost}"
HEALTHY=0
UNHEALTHY=0
UNREACHABLE=0
TOTAL=${#SERVICES[@]}

echo -e "${CYAN}${BOLD}Heady™ Platform Health Check — $TOTAL services${NC}"
echo -e "${CYAN}Host: $HOST | Timeout: ${TIMEOUT}s (Fibonacci)${NC}"
echo -e "────────────────────────────────────────────────────────────"

for entry in "${SERVICES[@]}"; do
  svc="${entry%%:*}"
  port="${entry##*:}"

  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    "http://${HOST}:${port}/health" \
    --max-time "$TIMEOUT" 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "  ${GREEN}✓ PASS${NC}  ${svc} (:${port})"
    HEALTHY=$((HEALTHY + 1))
  elif [ "$HTTP_CODE" = "000" ]; then
    echo -e "  ${RED}✗ DOWN${NC}  ${svc} (:${port}) — unreachable"
    UNREACHABLE=$((UNREACHABLE + 1))
  else
    echo -e "  ${YELLOW}⚠ FAIL${NC}  ${svc} (:${port}) — HTTP ${HTTP_CODE}"
    UNHEALTHY=$((UNHEALTHY + 1))
  fi
done

echo -e "────────────────────────────────────────────────────────────"
echo -e "${BOLD}Results:${NC} ${GREEN}$HEALTHY healthy${NC} | ${YELLOW}$UNHEALTHY unhealthy${NC} | ${RED}$UNREACHABLE unreachable${NC} | $TOTAL total"

FAILED=$((UNHEALTHY + UNREACHABLE))
if [ "$FAILED" -gt 0 ]; then
  echo -e "${RED}${BOLD}$FAILED service(s) not healthy${NC}"
  exit 1
else
  echo -e "${GREEN}${BOLD}All $TOTAL services healthy${NC}"
  exit 0
fi
