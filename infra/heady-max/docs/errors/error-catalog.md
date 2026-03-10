# Heady Error Catalog

## Author
Eric Haywood / HeadySystems Inc. — 51 Provisional Patents

## Error Code Format
`HEADY-{SERVICE}-{NUMBER}`

## Severity Levels
- **critical**: System integrity at risk, immediate action required
- **high**: Service degradation, action within 8 minutes
- **medium**: Functional issue, action within 34 minutes
- **low**: Non-critical, informational


## AUTH (auth-session-server)

| Code | Description | Cause | Resolution | Severity |
|------|-------------|-------|------------|----------|
| HEADY-AUTH-001 | Invalid session token | Session token expired or malformed | Re-authenticate via /api/auth/login | high |
| HEADY-AUTH-002 | PKCE verification failed | Code verifier does not match code challenge | Regenerate PKCE challenge and retry OAuth flow | high |
| HEADY-AUTH-003 | Refresh token reuse detected | Previously-used refresh token submitted (potential theft) | Entire token family revoked; user must re-authenticate | critical |
| HEADY-AUTH-004 | Rate limit exceeded | Too many requests from this IP/session | Wait for φ-backoff period (base: 8s), then retry | medium |
| HEADY-AUTH-005 | Insufficient role | User role does not grant access to requested resource | Contact admin to request role upgrade | medium |
| HEADY-AUTH-006 | Session limit reached | User has 89 active sessions (maximum) | Revoke an existing session before creating a new one | low |
| HEADY-AUTH-007 | Invalid tenant | Requested tenant ID not found or inactive | Verify tenant configuration | high |
| HEADY-AUTH-008 | Certificate expired | Service mTLS certificate has expired | Trigger certificate rotation via secret-gateway | critical |

## NOTIFICATION (notification-service)

| Code | Description | Cause | Resolution | Severity |
|------|-------------|-------|------------|----------|
| HEADY-NOTIFICATION-001 | Channel handler missing | No handler registered for requested notification channel | Register the channel handler before sending | high |
| HEADY-NOTIFICATION-002 | Template not found | Requested notification template does not exist | Register template via template engine | medium |
| HEADY-NOTIFICATION-003 | Delivery failed | Notification could not be delivered after all retries | Check dead letter queue; max retries: 8 | high |
| HEADY-NOTIFICATION-004 | Queue full | Notification queue has reached capacity | Hot queue max: 34, warm: 89, cold: 233 | medium |
| HEADY-NOTIFICATION-005 | Webhook URL invalid | Webhook delivery target URL is malformed | Verify webhook URL in notification metadata | medium |

## ANALYTICS (analytics-service)

| Code | Description | Cause | Resolution | Severity |
|------|-------------|-------|------------|----------|
| HEADY-ANALYTICS-001 | Event ingestion failed | Event could not be added to ingestion buffer | Check buffer size and flush if needed | medium |
| HEADY-ANALYTICS-002 | Aggregation window empty | No data points found for requested aggregation window | Verify metric name and time window | low |
| HEADY-ANALYTICS-003 | Coherence below threshold | Service coherence score dropped below 0.618 | Investigate vector drift; restart service if persistent | high |

## BILLING (billing-service)

| Code | Description | Cause | Resolution | Severity |
|------|-------------|-------|------------|----------|
| HEADY-BILLING-001 | Invalid plan tier | Requested pricing plan does not exist | Use one of: free, pro, enterprise | medium |
| HEADY-BILLING-002 | Insufficient credits | User credit balance too low for requested operation | Add credits via /api/billing/credits/add | medium |
| HEADY-BILLING-003 | Stripe webhook verification failed | Webhook signature does not match expected value | Verify Stripe webhook signing secret | high |
| HEADY-BILLING-004 | Invoice generation failed | Could not generate invoice for billing period | Check subscription status and usage data | high |

## SEARCH (search-service)

| Code | Description | Cause | Resolution | Severity |
|------|-------------|-------|------------|----------|
| HEADY-SEARCH-001 | Index not found | Requested search index does not exist | Use one of: code, docs, memory, conversations, all | medium |
| HEADY-SEARCH-002 | Query too long | Search query exceeds maximum length (238592 bytes) | Shorten the query | low |
| HEADY-SEARCH-003 | Vector search timeout | Vector similarity search exceeded timeout (34s) | Reduce result limit or use BM25-only mode | medium |

## SCHEDULER (scheduler-service)

| Code | Description | Cause | Resolution | Severity |
|------|-------------|-------|------------|----------|
| HEADY-SCHEDULER-001 | Lock acquisition failed | Could not acquire distributed lock for job | Job is already running on another instance | medium |
| HEADY-SCHEDULER-002 | Job timeout | Job execution exceeded configured timeout | Increase timeout or optimize job (max: PHI^steps seconds) | medium |
| HEADY-SCHEDULER-003 | Dead letter queue full | Failed job moved to dead letter queue | Review and reprocess dead-lettered jobs (max retries: 8) | high |
| HEADY-SCHEDULER-004 | Circular dependency | Job dependency graph contains a cycle | Remove circular dependencies from job configuration | high |

## MIGRATION (migration-service)

| Code | Description | Cause | Resolution | Severity |
|------|-------------|-------|------------|----------|
| HEADY-MIGRATION-001 | Checksum mismatch | Migration file has been modified since last application | Do not modify applied migrations; create a new migration instead | critical |
| HEADY-MIGRATION-002 | Rollback failed | Compensating migration (down) failed to execute | Manual database intervention may be required | critical |
| HEADY-MIGRATION-003 | Version conflict | Migration version already exists | Use unique semantic version for each migration | medium |

## ASSET (asset-pipeline)

| Code | Description | Cause | Resolution | Severity |
|------|-------------|-------|------------|----------|
| HEADY-ASSET-001 | File too large | Uploaded file exceeds maximum size (624640 bytes = 610KB) | Compress or split the file | medium |
| HEADY-ASSET-002 | Unsupported format | File MIME type not recognized | Use a supported format (image, video, audio, document) | low |
| HEADY-ASSET-003 | Processing failed | Asset processing pipeline encountered an error | Check processing job status for details | medium |
| HEADY-ASSET-004 | Cache miss | Requested asset not in cache tier | Asset will be fetched from storage; expect higher latency | low |

## GATEWAY (colab-gateway)

| Code | Description | Cause | Resolution | Severity |
|------|-------------|-------|------------|----------|
| HEADY-GATEWAY-001 | No available runtime | All Colab runtimes are busy or disconnected | Wait for a runtime to become available or scale workload | high |
| HEADY-GATEWAY-002 | Heartbeat timeout | Runtime heartbeat not received within 39ms | Runtime may have disconnected; auto-reconnect in progress | medium |
| HEADY-GATEWAY-003 | VRAM insufficient | Estimated VRAM requirement exceeds available GPU memory | Route to a runtime with more VRAM or reduce batch size | medium |
| HEADY-GATEWAY-004 | Bridge protocol error | JSON-RPC message malformed or timed out | Retry with φ-backoff (base: PHI seconds, max: 89s) | medium |

## SECURITY (security)

| Code | Description | Cause | Resolution | Severity |
|------|-------------|-------|------------|----------|
| HEADY-SECURITY-001 | Request signature invalid | HMAC-SHA256 request signature verification failed | Ensure inter-service secret is synchronized | critical |
| HEADY-SECURITY-002 | Trust level insufficient | Service trust level below CSL threshold (0.618) | Update service identity trust level | high |
| HEADY-SECURITY-003 | Audit chain broken | Cryptographic hash chain verification detected tampering | Investigate audit log integrity; potential security incident | critical |
| HEADY-SECURITY-004 | Path traversal detected | Request path contains directory traversal patterns | Request blocked by OWASP middleware | high |
