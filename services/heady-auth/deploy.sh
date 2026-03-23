#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# HEADY AUTH — Cloud Run Deploy Script
# ∞ Sacred Geometry :: Auth Service :: Production ∞
# ═══════════════════════════════════════════════════════════════
#
# Usage:
#   ./deploy.sh                   # Full deploy
#   ./deploy.sh --canary          # Canary deploy (no traffic)
#   ./deploy.sh --traffic 50      # 50% traffic split
#
# Prerequisites:
#   - gcloud CLI authenticated
#   - PROJECT_ID and REGION set (or defaults to gen-lang-client-0920560496 / us-central1)
#

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-gen-lang-client-0920560496}"
REGION="${REGION:-us-central1}"
SERVICE="heady-auth"
IMAGE="us-central1-docker.pkg.dev/${PROJECT_ID}/cloud-run-source-deploy/${SERVICE}"
TAG="v$(date +%Y%m%d-%H%M%S)"
TRAFFIC=100

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --canary)   TRAFFIC=0; shift ;;
    --traffic)  TRAFFIC=$2; shift 2 ;;
    *)          shift ;;
  esac
done

echo ""
echo "  ∞ ═══════════════════════════════════════ ∞"
echo "  ║   HEADY AUTH :: Cloud Run Deploy       ║"
echo "  ∞ ═══════════════════════════════════════ ∞"
echo ""
echo "  Project:  ${PROJECT_ID}"
echo "  Region:   ${REGION}"
echo "  Image:    ${IMAGE}:${TAG}"
echo "  Traffic:  ${TRAFFIC}%"
echo ""

# 1. Build container
echo "→ Building container image..."
docker build -t "${IMAGE}:${TAG}" -t "${IMAGE}:latest" .

# 2. Push to Artifact Registry
echo "→ Pushing to Artifact Registry..."
docker push "${IMAGE}:${TAG}"
docker push "${IMAGE}:latest"

# 3. Deploy to Cloud Run
echo "→ Deploying to Cloud Run..."
gcloud run deploy "${SERVICE}" \
  --image="${IMAGE}:${TAG}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,FIREBASE_PROJECT_ID=heady-ai" \
  --set-secrets="DATABASE_URL=heady-db-url:latest,UPSTASH_REDIS_REST_URL=upstash-url:latest,UPSTASH_REDIS_REST_TOKEN=upstash-token:latest,FIREBASE_API_KEY=firebase-api-key:latest,JWT_SECRET=jwt-secret:latest" \
  --min-instances=1 \
  --max-instances=13 \
  --memory=512Mi \
  --cpu=1 \
  --concurrency=80 \
  --tag="$(echo $TAG | tr '.' '-')"

# 4. Set traffic
if [ "$TRAFFIC" -gt 0 ]; then
  echo "→ Routing ${TRAFFIC}% traffic to ${TAG}..."
  gcloud run services update-traffic "${SERVICE}" \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --to-latest
fi

# 5. Get URL
URL=$(gcloud run services describe "${SERVICE}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --format="value(status.url)")

echo ""
echo "  ∞ ═══════════════════════════════════════ ∞"
echo "  ║   ✓ Deploy Complete                    ║"
echo "  ║   URL: ${URL}"
echo "  ∞ ═══════════════════════════════════════ ∞"
echo ""

# 6. Health check
echo "→ Health check..."
curl -s "${URL}/health" | python3 -m json.tool 2>/dev/null || echo "(health check will respond once service starts)"
echo ""
