# Runbook: Colab Pro+ Runtime Management

## Overview
Heady uses 3 Google Colab Pro+ memberships as the latent space ops layer, providing GPU-accelerated embedding generation, vector operations, and Monte Carlo simulations.

## Runtime Architecture

| Runtime | Role | GPU | Primary Function |
|---------|------|-----|------------------|
| Runtime 1 | Embedding Engine | T4/A100 | HeadyEmbed — 384D embedding generation, MRL truncation |
| Runtime 2 | Vector Ops | T4/A100 | Colab Vector Space Ops — similarity search, clustering |
| Runtime 3 | Simulation | T4/A100 | HeadyMC — Monte Carlo simulations, pattern analysis |

## Health Checks

```bash
# Check all runtime statuses
curl -s http://localhost:3310/api/colab/status | jq .

# Check individual runtime
curl -s http://localhost:3310/api/colab/runtime/1/health | jq .
```

## Common Issues

### Runtime Disconnected
Colab runtimes disconnect after ~12 hours (idle) or ~24 hours (active).

**Resolution:**
1. Check Colab deploy automation status:
   ```bash
   curl -s http://localhost:3310/api/colab/deploy/status | jq .
   ```
2. Trigger reconnection:
   ```bash
   curl -X POST http://localhost:3310/api/colab/runtime/RUNTIME_ID/reconnect
   ```
3. If auto-reconnect fails, manually reconnect via Google Colab UI
4. Re-run notebook initialization cells

### GPU Out of Memory
Batch sizes may exceed GPU memory, especially on T4 (16GB).

**Resolution:**
1. Check current batch sizes:
   ```bash
   curl -s http://localhost:3310/api/colab/runtime/RUNTIME_ID/metrics | jq .memoryUtilization
   ```
2. Reduce batch size to next lower Fibonacci number:
   - Current fib(8) = 21 → reduce to fib(7) = 13
   - Current fib(7) = 13 → reduce to fib(6) = 8
3. Clear GPU cache via bridge:
   ```bash
   curl -X POST http://localhost:3310/api/colab/runtime/RUNTIME_ID/clear-cache
   ```

### Bridge Connection Lost
The Colab Bridge (colab-bridge.js) connects local services to Colab runtimes.

**Resolution:**
1. Check bridge status:
   ```bash
   curl -s http://localhost:3310/api/colab/bridge/status | jq .
   ```
2. Restart bridge:
   ```bash
   curl -X POST http://localhost:3310/api/colab/bridge/restart
   ```
3. Verify reconnection:
   ```bash
   curl -s http://localhost:3310/api/colab/bridge/ping | jq .
   ```

## Notebook Templates
Notebook templates are in `src/colab/colab-notebook-templates.js`. After updating:
1. Re-deploy notebooks via automation:
   ```bash
   curl -X POST http://localhost:3310/api/colab/deploy/notebooks
   ```
2. Verify deployment:
   ```bash
   curl -s http://localhost:3310/api/colab/deploy/status | jq .deployedNotebooks
   ```

## Cost Management
- Each Colab Pro+ membership: ~$50/month
- Total: ~$150/month for 3 runtimes
- Monitor GPU utilization to ensure cost-effective usage
- Consider scaling down to 2 runtimes during low-traffic periods

## Contacts
- **Founder/Chief Architect**: Eric Haywood (eric@headyconnection.org)
