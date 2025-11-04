# Deployment Guide

Complete deployment guide for the Market Prices Service.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Development Setup](#development-setup)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Production Checklist](#production-checklist)
6. [Monitoring & Alerts](#monitoring--alerts)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### API Keys

1. **CoinGecko API Key**
   - Sign up at [coingecko.com](https://www.coingecko.com/en/api)
   - Start with Demo tier (free, 30 calls/min)
   - Upgrade to Analyst/Pro for WebSocket access

2. **CoinMarketCap API Key** (Optional, for fallback)
   - Sign up at [coinmarketcap.com/api](https://coinmarketcap.com/api/)
   - Hobbyist tier is free (30 calls/min)

### Infrastructure

- **Database**: PostgreSQL 15+ with TimescaleDB extension
- **Cache**: Redis 7+
- **Node.js**: 20+
- **Docker**: 24+ (for containerized deployment)
- **Kubernetes**: 1.28+ (for K8s deployment)

## Development Setup

### 1. Install Dependencies

```bash
cd services/market-prices
npm install
```

### 2. Configure Environment

```bash
cp env.example .env
```

Edit `.env`:

```env
# CoinGecko
COINGECKO_API_KEY=your_key_here
COINGECKO_TIER=demo  # or analyst, lite, pro
COINGECKO_RATE_LIMIT_PER_MINUTE=30

# CoinMarketCap (optional)
COINMARKETCAP_API_KEY=your_key_here
COINMARKETCAP_RATE_LIMIT_PER_MINUTE=30

# Database
TIMESCALE_HOST=localhost
TIMESCALE_PORT=5432
TIMESCALE_DATABASE=coinet
TIMESCALE_USER=coinet_user
TIMESCALE_PASSWORD=your_secure_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Service
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_WEBSOCKET=true
ENABLE_CMC_FALLBACK=true
```

### 3. Start Infrastructure

Using Docker Compose:

```bash
# Start only database and cache
docker-compose up -d timescaledb redis
```

Or manually:

```bash
# TimescaleDB
docker run -d \
  --name timescaledb \
  -p 5432:5432 \
  -e POSTGRES_DB=coinet \
  -e POSTGRES_USER=coinet_user \
  -e POSTGRES_PASSWORD=your_password \
  timescale/timescaledb:latest-pg15

# Redis
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:7-alpine
```

### 4. Run Development Server

```bash
npm run dev
```

### 5. Test the Service

```bash
npm test
```

## Docker Deployment

### Build Image

```bash
docker build -t coinet/market-prices:latest .
```

### Run with Docker Compose

```bash
# Production mode
docker-compose up -d

# With debug tools (pgAdmin, Redis Commander)
docker-compose --profile debug up -d
```

### Docker Compose Override

Create `docker-compose.override.yml` for local customization:

```yaml
version: '3.8'

services:
  market-prices:
    environment:
      LOG_LEVEL: debug
    ports:
      - "3000:3000"  # If you add HTTP API
```

### Docker Commands

```bash
# View logs
docker-compose logs -f market-prices

# Restart service
docker-compose restart market-prices

# Scale service
docker-compose up -d --scale market-prices=3

# Stop everything
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Kubernetes Deployment

### 1. Create Namespace

```bash
kubectl create namespace coinet
```

### 2. Create Secrets

```bash
# Create from file
kubectl create secret generic market-prices-secrets \
  --from-env-file=.env \
  -n coinet

# Or create manually
kubectl create secret generic market-prices-secrets \
  --from-literal=COINGECKO_API_KEY=your_key \
  --from-literal=COINMARKETCAP_API_KEY=your_key \
  --from-literal=TIMESCALE_PASSWORD=your_password \
  -n coinet
```

### 3. Deploy TimescaleDB

Create `timescaledb-deployment.yaml`:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: timescaledb-pvc
  namespace: coinet
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: timescaledb
  namespace: coinet
spec:
  serviceName: timescaledb
  replicas: 1
  selector:
    matchLabels:
      app: timescaledb
  template:
    metadata:
      labels:
        app: timescaledb
    spec:
      containers:
      - name: timescaledb
        image: timescale/timescaledb:latest-pg15
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: coinet
        - name: POSTGRES_USER
          value: coinet_user
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: market-prices-secrets
              key: TIMESCALE_PASSWORD
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
---
apiVersion: v1
kind: Service
metadata:
  name: timescaledb
  namespace: coinet
spec:
  ports:
  - port: 5432
    targetPort: 5432
  selector:
    app: timescaledb
```

Deploy:

```bash
kubectl apply -f timescaledb-deployment.yaml
```

### 4. Deploy Redis

Create `redis-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: coinet
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        volumeMounts:
        - name: data
          mountPath: /data
      volumes:
      - name: data
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: coinet
spec:
  ports:
  - port: 6379
    targetPort: 6379
  selector:
    app: redis
```

Deploy:

```bash
kubectl apply -f redis-deployment.yaml
```

### 5. Deploy Market Prices Service

Create `market-prices-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: market-prices
  namespace: coinet
spec:
  replicas: 3
  selector:
    matchLabels:
      app: market-prices
  template:
    metadata:
      labels:
        app: market-prices
    spec:
      containers:
      - name: market-prices
        image: coinet/market-prices:latest
        imagePullPolicy: Always
        env:
        - name: COINGECKO_API_KEY
          valueFrom:
            secretKeyRef:
              name: market-prices-secrets
              key: COINGECKO_API_KEY
        - name: COINMARKETCAP_API_KEY
          valueFrom:
            secretKeyRef:
              name: market-prices-secrets
              key: COINMARKETCAP_API_KEY
        - name: TIMESCALE_HOST
          value: timescaledb
        - name: TIMESCALE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: market-prices-secrets
              key: TIMESCALE_PASSWORD
        - name: REDIS_HOST
          value: redis
        - name: NODE_ENV
          value: production
        - name: LOG_LEVEL
          value: info
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          exec:
            command:
            - node
            - -e
            - "require('./dist/index.js').healthCheck().then(h => h ? process.exit(0) : process.exit(1))"
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          exec:
            command:
            - node
            - -e
            - "require('./dist/index.js').healthCheck().then(h => h ? process.exit(0) : process.exit(1))"
          initialDelaySeconds: 30
          periodSeconds: 10
```

Deploy:

```bash
kubectl apply -f market-prices-deployment.yaml
```

### 6. Verify Deployment

```bash
# Check pods
kubectl get pods -n coinet

# View logs
kubectl logs -f deployment/market-prices -n coinet

# Describe pod
kubectl describe pod <pod-name> -n coinet

# Execute command in pod
kubectl exec -it <pod-name> -n coinet -- /bin/sh
```

## Production Checklist

### Security

- [ ] API keys stored in secrets management (Vault, AWS Secrets Manager)
- [ ] Database password is strong and rotated regularly
- [ ] SSL/TLS enabled for database connections
- [ ] Redis protected with password (if exposed)
- [ ] Network policies configured (if K8s)
- [ ] Container runs as non-root user
- [ ] Container image scanned for vulnerabilities
- [ ] Rate limiting at API gateway level

### Reliability

- [ ] Multiple replicas deployed (3+)
- [ ] Auto-scaling configured
- [ ] Health checks configured
- [ ] Graceful shutdown implemented
- [ ] Database backups scheduled
- [ ] Disaster recovery plan documented
- [ ] Failover tested

### Performance

- [ ] Appropriate rate limits set per tier
- [ ] Cache TTL tuned for use case
- [ ] Database indexes optimized
- [ ] Continuous aggregates configured
- [ ] Connection pooling configured
- [ ] Resource limits set appropriately

### Monitoring

- [ ] Logging configured (centralized)
- [ ] Metrics exported (Prometheus)
- [ ] Dashboards created (Grafana)
- [ ] Alerts configured
- [ ] On-call rotation set up
- [ ] Runbooks documented

### Cost Optimization

- [ ] Right-sized infrastructure
- [ ] Appropriate API tier selected
- [ ] Cache hit rate monitored
- [ ] Database retention policies set
- [ ] Unnecessary data purged

## Monitoring & Alerts

### Metrics to Track

1. **Provider Metrics**
   - Request count per provider
   - Request latency (p50, p95, p99)
   - Error rate
   - Rate limit usage
   - Failover events

2. **Cache Metrics**
   - Hit rate
   - Miss rate
   - Eviction rate
   - Memory usage

3. **Database Metrics**
   - Connection count
   - Query latency
   - Write throughput
   - Disk usage

4. **Service Metrics**
   - CPU usage
   - Memory usage
   - Active WebSocket connections
   - Event processing latency

### Prometheus Metrics

Example metrics export:

```typescript
import { register, Counter, Histogram, Gauge } from 'prom-client';

// Request counter
const requestCounter = new Counter({
  name: 'market_prices_requests_total',
  help: 'Total number of requests',
  labelNames: ['provider', 'status']
});

// Request latency
const requestLatency = new Histogram({
  name: 'market_prices_request_duration_seconds',
  help: 'Request duration in seconds',
  labelNames: ['provider', 'endpoint']
});

// Cache hit rate
const cacheHitRate = new Gauge({
  name: 'market_prices_cache_hit_rate',
  help: 'Cache hit rate percentage'
});

// Active WebSocket connections
const wsConnections = new Gauge({
  name: 'market_prices_websocket_connections',
  help: 'Number of active WebSocket connections'
});
```

### Alert Rules

Example Prometheus alert rules:

```yaml
groups:
  - name: market-prices
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: rate(market_prices_requests_total{status="error"}[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          
      # Provider down
      - alert: ProviderDown
        expr: market_prices_provider_up == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Provider {{ $labels.provider }} is down"
          
      # Low cache hit rate
      - alert: LowCacheHitRate
        expr: market_prices_cache_hit_rate < 50
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Cache hit rate is below 50%"
          
      # Database connection issues
      - alert: DatabaseConnectionIssue
        expr: market_prices_db_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Cannot connect to database"
```

## Troubleshooting

### Service Won't Start

**Symptom:** Container exits immediately

**Check:**
```bash
# View logs
docker logs coinet-market-prices

# Common issues:
# 1. Missing environment variables
# 2. Cannot connect to database
# 3. Invalid API keys
```

**Solution:**
- Verify all required environment variables are set
- Check database connectivity
- Validate API keys

### Rate Limit Errors

**Symptom:** Frequent 429 errors in logs

**Check:**
```bash
# Check rate limiter stats
curl http://localhost:3000/stats
```

**Solution:**
- Reduce request frequency
- Upgrade API tier
- Implement better caching
- Use WebSocket instead of REST

### High Memory Usage

**Symptom:** Container OOMKilled

**Check:**
```bash
# Monitor memory
docker stats coinet-market-prices

# Check for memory leaks
kubectl top pod market-prices-xxx -n coinet
```

**Solution:**
- Increase memory limit
- Check for memory leaks
- Reduce WebSocket subscriptions
- Tune cache size

### WebSocket Not Connecting

**Symptom:** No real-time updates

**Check:**
```bash
# Check WebSocket status
# Add HTTP API endpoint for status
curl http://localhost:3000/health
```

**Solution:**
- Verify ENABLE_WEBSOCKET=true
- Check API tier supports WebSocket
- Verify firewall allows WebSocket
- Check rate limits

### Database Connection Pool Exhausted

**Symptom:** "Connection pool exhausted" errors

**Check:**
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity 
WHERE datname = 'coinet';
```

**Solution:**
- Increase pool size
- Check for connection leaks
- Ensure connections are properly closed
- Monitor query performance

### Low Cache Hit Rate

**Symptom:** High API usage despite caching

**Check:**
```bash
# Redis stats
redis-cli info stats
```

**Solution:**
- Increase cache TTL
- Add cache warming
- Check cache key patterns
- Verify Redis memory limit

---

## Support

For deployment issues:

1. Check logs first: `docker logs` or `kubectl logs`
2. Verify configuration
3. Check infrastructure (database, cache)
4. Review [troubleshooting section](#troubleshooting)
5. Contact: support@coinet.com

---

**Next Steps:**
- Set up monitoring dashboards
- Configure alerts
- Schedule backups
- Test disaster recovery
- Document runbooks

