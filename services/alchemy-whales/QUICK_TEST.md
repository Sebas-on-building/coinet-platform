# ✅ Quick Service Test

## Correct Endpoints

The monitoring server runs on **port 9090** (not 8080). All endpoints are on the same port:

### Health Check
```bash
curl http://localhost:9090/health
```

### Metrics
```bash
curl http://localhost:9090/metrics
```

### Service Info
```bash
curl http://localhost:9090/info
```

### Liveness Probe
```bash
curl http://localhost:9090/health/live
```

### Readiness Probe
```bash
curl http://localhost:9090/health/ready
```

## Webhook Endpoint

Webhooks are on a separate port (3001):
```bash
curl http://localhost:3001/webhooks/alchemy
```

## Quick Test Script

```bash
# Health check
echo "1. Health:"
curl -s http://localhost:9090/health | jq . || curl -s http://localhost:9090/health

# Metrics
echo -e "\n2. Metrics (first 10 lines):"
curl -s http://localhost:9090/metrics | head -10

# Info
echo -e "\n3. Service Info:"
curl -s http://localhost:9090/info | jq . || curl -s http://localhost:9090/info
```

## Port Summary

- **Port 3001**: Webhook server (`/webhooks/alchemy`)
- **Port 9090**: Monitoring server (`/health`, `/metrics`, `/info`)

