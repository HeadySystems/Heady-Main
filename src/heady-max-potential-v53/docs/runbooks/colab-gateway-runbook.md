# Colab Gateway — Runbook

## Service: colab-gateway | Port: 3352

### Health Check
```bash
curl http://localhost:3352/health
```

### Common Issues

#### Runtime disconnected
**Symptoms**: Tasks queuing, no GPU utilization
**Diagnosis**:
1. Check Colab notebook is running
2. Check WebSocket connection status
3. Check runtime heartbeat timestamp
**Fix**: Restart Colab notebook, verify gateway URL

#### Hot runtime failure → Warm promotion
**Symptoms**: Increased latency, auto-promotion logged
**Diagnosis**: Check `/health` for pool status
**Fix**: Restart Hot runtime, it will resume when healthy

#### Queue overflow (HEADY-COLAB-003)
**Symptoms**: 503 errors, queue depth at 233 max
**Diagnosis**: All runtimes busy or disconnected
**Fix**: Wait for runtime capacity, restart runtimes if needed

### GPU Monitoring
- Heartbeat interval: 29,034ms (φ⁷ × 1000)
- Health threshold: 2 × heartbeat interval
