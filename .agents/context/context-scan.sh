#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# Heady Context Scanner — Auto-generates HEADY_CONTEXT.md
# Run before any AI agent session to ensure fresh context.
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

REPO_ROOT="${1:-/home/headyme/Heady}"
CONTEXT_FILE="${REPO_ROOT}/HEADY_CONTEXT.md"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "🧠 Heady Context Scanner — scanning ${REPO_ROOT}..."

# ── Gather live state ────────────────────────────────────────────

# Package info
PKG_NAME=$(python3 -c "import json; print(json.load(open('${REPO_ROOT}/package.json')).get('name','unknown'))" 2>/dev/null || echo "heady-systems")
PKG_VERSION=$(python3 -c "import json; print(json.load(open('${REPO_ROOT}/package.json')).get('version','0.0.0'))" 2>/dev/null || echo "0.0.0")

# Services
SERVICES=$(ls -1 "${REPO_ROOT}/services/" 2>/dev/null | tr '\n' ', ' | sed 's/,$//')

# Sites
SITES=$(ls -1 "${REPO_ROOT}/services/heady-web/sites/" 2>/dev/null | tr '\n' ', ' | sed 's/,$//')

# File counts
TOTAL_FILES=$(find "${REPO_ROOT}" -type f -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | wc -l)
JS_FILES=$(find "${REPO_ROOT}" -type f -name "*.js" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | wc -l)
TS_FILES=$(find "${REPO_ROOT}" -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | wc -l)

# Git state
GIT_BRANCH=$(cd "${REPO_ROOT}" && git branch --show-current 2>/dev/null || echo "unknown")
GIT_COMMIT=$(cd "${REPO_ROOT}" && git log -1 --format="%h %s" 2>/dev/null || echo "unknown")
GIT_DIRTY=$(cd "${REPO_ROOT}" && git status --porcelain 2>/dev/null | wc -l)

# Cloud Run services (if gcloud available)
CLOUD_RUN=""
if command -v gcloud &>/dev/null; then
    CLOUD_RUN=$(gcloud run services list --region us-east1 --format='value(name,status.url)' 2>/dev/null | head -10 || echo "")
fi

# ── Update the Current State section ──────────────────────────────

# Read existing context, update the auto-generated footer
if [[ -f "${CONTEXT_FILE}" ]]; then
    # Replace the ## Current State section at the end
    sed -i '/^## Current State/,$d' "${CONTEXT_FILE}"
fi

cat >> "${CONTEXT_FILE}" << EOF
## Current State (auto-updated by context-scan.sh)
- **Scanned:** ${TIMESTAMP}
- **Package:** ${PKG_NAME} v${PKG_VERSION}
- **Branch:** ${GIT_BRANCH}
- **Last commit:** ${GIT_COMMIT}
- **Dirty files:** ${GIT_DIRTY}
- **Total files:** ${TOTAL_FILES} (${JS_FILES} JS, ${TS_FILES} TS/TSX)
- **Services:** ${SERVICES}
- **Sites:** ${SITES}
EOF

if [[ -n "${CLOUD_RUN}" ]]; then
    echo "- **Cloud Run services:**" >> "${CONTEXT_FILE}"
    echo "${CLOUD_RUN}" | while IFS=$'\t' read -r name url; do
        echo "  - ${name}: ${url}" >> "${CONTEXT_FILE}"
    done
fi

echo ""
echo "✅ Context updated: ${CONTEXT_FILE}"
echo "   ${TOTAL_FILES} files | ${SERVICES} | branch: ${GIT_BRANCH}"
