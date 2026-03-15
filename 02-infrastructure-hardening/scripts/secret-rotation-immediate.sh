#!/usr/bin/env bash
set -euo pipefail

# Heady™ Secret Rotation — Immediate (SEC-02)
# Generates new secrets and provides rotation instructions.
# © 2026 HeadySystems Inc.

echo "╔══════════════════════════════════════════╗"
echo "║  Heady™ Secret Rotation — IMMEDIATE      ║"
echo "╚══════════════════════════════════════════╝"

ROTATION_FILE=$(mktemp /tmp/heady-rotation-XXXXXX)
chmod 600 "$ROTATION_FILE"

echo "Generating new secrets..."

JWT_SECRET=$(openssl rand -hex 32)
API_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)
REDIS_PASSWORD=$(openssl rand -hex 24)

cat > "$ROTATION_FILE" <<SECRETS
# Heady™ Secret Rotation — $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# DESTROY THIS FILE AFTER APPLYING

JWT_SECRET=$JWT_SECRET
API_SECRET=$API_SECRET
SESSION_SECRET=$SESSION_SECRET
REDIS_PASSWORD=$REDIS_PASSWORD
SECRETS

echo ""
echo "Secrets written to: $ROTATION_FILE (mode 600)"
echo ""
echo "=== APPLY ROTATION ==="
echo ""
echo "1. GCP Secret Manager:"
echo "   gcloud secrets versions add jwt-secret --data-file=<(grep JWT_SECRET $ROTATION_FILE | cut -d= -f2)"
echo "   gcloud secrets versions add api-secret --data-file=<(grep API_SECRET $ROTATION_FILE | cut -d= -f2)"
echo "   gcloud secrets versions add session-secret --data-file=<(grep SESSION_SECRET $ROTATION_FILE | cut -d= -f2)"
echo "   gcloud secrets versions add redis-password --data-file=<(grep REDIS_PASSWORD $ROTATION_FILE | cut -d= -f2)"
echo ""
echo "2. Render env vars: Update via dashboard or CLI"
echo ""
echo "3. Cloudflare Workers: wrangler secret put JWT_SECRET / API_SECRET"
echo ""
echo "4. Restart: gcloud run services update heady-manager --region us-central1 --update-env-vars RESTART=$(date +%s)"
echo ""
echo "5. DESTROY: shred -u $ROTATION_FILE"
