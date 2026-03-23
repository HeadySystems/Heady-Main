#!/bin/bash
# ═══════════════════════════════════════════════════════
# HeadySystems Production Smoke Test
# Run: bash scripts/smoke-test-production.sh
# ═══════════════════════════════════════════════════════

BASE="${HEADY_API_URL:-https://heady-manager-bf4q4zywhq-uc.a.run.app}"
PASS=0; FAIL=0; TOTAL=0

check() {
  local name=$1 url=$2 expected=$3 method=${4:-GET}
  TOTAL=$((TOTAL+1))
  
  if [ "$method" = "POST" ]; then
    status=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{}' "$url" --max-time 10)
  else
    status=$(curl -s -o /dev/null -w '%{http_code}' "$url" --max-time 10)
  fi
  
  if [ "$status" = "$expected" ]; then
    echo "  ✅ $name (HTTP $status)"
    PASS=$((PASS+1))
  else
    echo "  ❌ $name (HTTP $status, expected $expected)"
    FAIL=$((FAIL+1))
  fi
}

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  HeadySystems Production Smoke Tests"
echo "  Target: $BASE"
echo "  Time:   $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "═══════════════════════════════════════════════════════"
echo ""

echo "── Health & Status ──────────────────────────────────"
check 'Health Check'          "$BASE/api/brain/health"           200
check 'System Status'         "$BASE/api/system/status"          200
check 'Pipeline State'        "$BASE/api/pipeline/state"         200

echo ""
echo "── Registry & Nodes ─────────────────────────────────"
check 'Registry'              "$BASE/api/registry"               200
check 'Nodes'                 "$BASE/api/nodes"                  200
check 'Readiness'             "$BASE/api/readiness/evaluate"     200

echo ""
echo "── Health Checks ────────────────────────────────────"
check 'Health Snapshot'       "$BASE/api/health-checks/snapshot" 200

echo ""
echo "── Auth Gates ───────────────────────────────────────"
check 'Pipeline Run (no auth)'  "$BASE/api/pipeline/run"         401  POST
check '404 Handler'             "$BASE/api/nonexistent"          404

echo ""
echo "── Buddy Chat ───────────────────────────────────────"
check 'Buddy Chat'            "$BASE/api/buddy/chat"             200  POST

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed ($TOTAL total)"
ORS=$((PASS * 100 / TOTAL))
echo "  ORS:     $ORS%"
[ $FAIL -eq 0 ] && echo "  Status:  ✅ ALL CLEAR — ORS $ORS%" || echo "  Status:  ❌ FAILURES DETECTED — ORS $ORS%"
echo "  φ = 1.618033988749895"
echo "═══════════════════════════════════════════════════════"
echo ""
