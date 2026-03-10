# Auth Session Service — Runbook

## Service: auth-session | Port: 3360 | Domain: auth.headysystems.com

### Health Check
```bash
curl https://auth.headysystems.com/health
```

### Common Issues

#### Session validation failing (HEADY-AUTH-004)
**Symptoms**: Users getting logged out, 401 errors
**Diagnosis**:
1. Check if `SESSION_SECRET` env var is consistent across deployments
2. Check if client IP changed (fingerprint mismatch)
3. Check session expiry (29,034s short / 86,400s remember-me)
**Fix**: Verify env vars, clear cookies, re-authenticate

#### Rate limiting too aggressive
**Symptoms**: 429 errors during normal usage
**Diagnosis**: Check `X-RateLimit-Remaining` header
**Fix**: Adjust tier (anonymous=34/min, auth=89/min, enterprise=233/min)

#### Cross-domain relay not working
**Symptoms**: Session not propagating across Heady domains
**Diagnosis**: Check browser console for iframe/postMessage errors
**Fix**: Verify origin is in ALLOWED_ORIGINS whitelist

### Scaling
- Min instances: 1 (always-on)
- Concurrency: 89 (fib(11))
- Memory: 512Mi
