# Heady™ Error Code Catalog

> Every error across all 55 services gets a unique code.
> Format: HEADY-{SERVICE}-{NUMBER}

## Auth Session (HEADY-AUTH-xxx)

| Code | HTTP | Description | Fix |
|------|------|-------------|-----|
| HEADY-AUTH-001 | 400 | Missing idToken in request | Include Firebase ID token in POST body |
| HEADY-AUTH-002 | 401 | Invalid or expired Firebase token | Re-authenticate with Firebase |
| HEADY-AUTH-003 | 401 | No session cookie found | User needs to sign in |
| HEADY-AUTH-004 | 401 | Session expired or fingerprint mismatch | Re-authenticate |
| HEADY-AUTH-429 | 429 | Rate limit exceeded | Wait and retry (check Retry-After header) |

## Search (HEADY-SEARCH-xxx)

| Code | HTTP | Description | Fix |
|------|------|-------------|-----|
| HEADY-SEARCH-001 | 400 | Missing search query | Include query parameter |
| HEADY-SEARCH-500 | 500 | Search engine error | Check pgvector connection, retry |

## Notification (HEADY-NOTIF-xxx)

| Code | HTTP | Description | Fix |
|------|------|-------------|-----|
| HEADY-NOTIF-001 | 400 | Missing userId or type | Include required fields |

## Scheduler (HEADY-SCHED-xxx)

| Code | HTTP | Description | Fix |
|------|------|-------------|-----|
| HEADY-SCHED-001 | 400 | Missing job name | Include name in POST body |

## Analytics (HEADY-ANALYTICS-xxx)

| Code | HTTP | Description | Fix |
|------|------|-------------|-----|
| HEADY-ANALYTICS-001 | 404 | Funnel not found | Check funnelId parameter |

## Colab Gateway (HEADY-COLAB-xxx)

| Code | HTTP | Description | Fix |
|------|------|-------------|-----|
| HEADY-COLAB-001 | 404 | Unknown pool | Use hot, warm, or cold |
| HEADY-COLAB-002 | 400 | Missing task type | Include type in POST body |
| HEADY-COLAB-003 | 503 | All runtimes busy | Wait for queue space or retry |
| HEADY-COLAB-004 | 400 | Missing texts array | Include texts[] in POST body |

## Rate Limiter (HEADY-RATE-xxx)

| Code | HTTP | Description | Fix |
|------|------|-------------|-----|
| HEADY-RATE-429 | 429 | Rate limit exceeded | Check X-RateLimit-Remaining header |

---
© 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
