# 🚀 Deployment Guide

Complete guide for deploying the Proactive Anomaly Detection System to production.

## 📋 Prerequisites

- Node.js 20+
- Docker & Docker Compose (for containerized deployment)
- PostgreSQL or TimescaleDB (for data persistence)
- Redis (for caching and rate limiting)
- Kubernetes (for cloud deployment)

## 🔧 Environment Setup

### Required Environment Variables

```bash
# Server
PORT=3030
NODE_ENV=production

# Monitoring
ENABLE_REAL_TIME=true
BATCH_SIZE=100
UPDATE_INTERVAL=5000
LOOKBACK_PERIOD=168

# Thresholds
STATISTICAL_THRESHOLD=3
ML_THRESHOLD=0.7
PERCENTILE_THRESHOLD=95

# Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
TELEGRAM_BOT_TOKEN=your-token
TELEGRAM_CHAT_IDS=123456,789012

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=alerts@yourdomain.com
SMTP_PASS=your-password
EMAIL_RECIPIENTS=team@yourdomain.com,ops@yourdomain.com

# Webhook
WEBHOOK_URLS=https://api.yourdomain.com/webhooks/anomaly

# Database (optional, for persistence)
DATABASE_URL=postgresql://user:pass@localhost:5432/anomaly_detection

# Redis (optional, for caching)
REDIS_URL=redis://localhost:6379
```

## 🐳 Docker Deployment

### Build Image

```bash
docker build -t anomaly-detection:latest .
```

### Run Container

```bash
docker run -d \
  --name anomaly-detection \
  -p 3030:3030 \
  -e NODE_ENV=production \
  -e SLACK_WEBHOOK_URL=$SLACK_WEBHOOK_URL \
  --restart unless-stopped \
  anomaly-detection:latest
```

### Docker Compose

```yaml
version: '3.8'

services:
  anomaly-detection:
    build: .
    ports:
      - "3030:3030"
    environment:
      - NODE_ENV=production
      - PORT=3030
      - ENABLE_REAL_TIME=true
      - BATCH_SIZE=100
    volumes:
      - ./data:/app/data
    depends_on:
      - redis
      - postgres
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3030/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 40s

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped

  postgres:
    image: timescale/timescaledb:latest-pg14
    environment:
      - POSTGRES_USER=anomaly
      - POSTGRES_PASSWORD=securepassword
      - POSTGRES_DB=anomaly_detection
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  redis-data:
  postgres-data:
```

Start with:
```bash
docker-compose up -d
```

## ☸️ Kubernetes Deployment

### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: anomaly-detection
  namespace: monitoring
spec:
  replicas: 3
  selector:
    matchLabels:
      app: anomaly-detection
  template:
    metadata:
      labels:
        app: anomaly-detection
    spec:
      containers:
      - name: anomaly-detection
        image: your-registry/anomaly-detection:latest
        ports:
        - containerPort: 3030
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3030"
        - name: SLACK_WEBHOOK_URL
          valueFrom:
            secretKeyRef:
              name: anomaly-secrets
              key: slack-webhook
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3030
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3030
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: anomaly-detection
  namespace: monitoring
spec:
  selector:
    app: anomaly-detection
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3030
  type: LoadBalancer
```

### ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: anomaly-config
  namespace: monitoring
data:
  config.json: |
    {
      "monitoring": {
        "enableRealTime": true,
        "batchSize": 100,
        "updateInterval": 5000
      }
    }
```

### Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: anomaly-secrets
  namespace: monitoring
type: Opaque
stringData:
  slack-webhook: "https://hooks.slack.com/..."
  telegram-token: "your-bot-token"
```

Deploy:
```bash
kubectl apply -f k8s/
```

## 🔄 CI/CD Pipeline

### GitHub Actions

```yaml
name: Deploy Anomaly Detection

on:
  push:
    branches: [main]
    paths:
      - 'services/anomaly-detection/**'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        working-directory: services/anomaly-detection
        run: npm ci
      
      - name: Run tests
        working-directory: services/anomaly-detection
        run: npm test
      
      - name: Build
        working-directory: services/anomaly-detection
        run: npm run build
      
      - name: Build Docker image
        run: |
          docker build -t ${{ secrets.REGISTRY }}/anomaly-detection:${{ github.sha }} \
            services/anomaly-detection
      
      - name: Push to registry
        run: |
          echo ${{ secrets.REGISTRY_PASSWORD }} | docker login -u ${{ secrets.REGISTRY_USER }} --password-stdin
          docker push ${{ secrets.REGISTRY }}/anomaly-detection:${{ github.sha }}
      
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/anomaly-detection \
            anomaly-detection=${{ secrets.REGISTRY }}/anomaly-detection:${{ github.sha }} \
            -n monitoring
```

## 📊 Monitoring & Observability

### Prometheus Metrics

The system exposes metrics at `/metrics`:

```
# Anomalies detected
anomaly_detection_total{type="opportunity|threat|critical|benign"}

# Detection latency
anomaly_detection_duration_seconds

# Alert counts
anomaly_alerts_total{level="info|warning|error|critical"}

# System health
anomaly_system_health{component="detector|classifier|alerter"}
```

### Grafana Dashboard

Import the included Grafana dashboard (`grafana/dashboard.json`) for visualization.

### Logging

Logs are structured JSON for easy parsing:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "message": "Anomaly detected",
  "anomalyId": "abc123",
  "type": "opportunity",
  "source": "trading_volume",
  "score": 0.87
}
```

### Alerts

Configure alerting rules for critical metrics:

```yaml
# Prometheus AlertManager
groups:
  - name: anomaly_detection
    rules:
      - alert: HighAnomalyRate
        expr: rate(anomaly_detection_total[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High anomaly detection rate"
          
      - alert: SystemDown
        expr: up{job="anomaly-detection"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Anomaly detection system is down"
```

## 🔐 Security Best Practices

### 1. Network Security
- Run behind a reverse proxy (nginx/Traefik)
- Use TLS/SSL certificates
- Implement IP whitelisting for admin endpoints
- Use VPC/private networks in cloud

### 2. Authentication
```typescript
// Add JWT authentication middleware
app.use('/api/monitoring', authenticateJWT);
```

### 3. Rate Limiting
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 4. Input Validation
All inputs are validated using schemas. Consider adding additional validation for your use case.

### 5. Secrets Management
- Use Kubernetes secrets or AWS Secrets Manager
- Never commit secrets to version control
- Rotate credentials regularly

## 📈 Scaling

### Horizontal Scaling

The system is stateless and can be horizontally scaled:

```bash
# Kubernetes
kubectl scale deployment anomaly-detection --replicas=5

# Docker Compose
docker-compose up --scale anomaly-detection=5
```

### Load Balancing

Use nginx or cloud load balancer:

```nginx
upstream anomaly_detection {
    least_conn;
    server anomaly-1:3030;
    server anomaly-2:3030;
    server anomaly-3:3030;
}

server {
    listen 80;
    location / {
        proxy_pass http://anomaly_detection;
    }
}
```

### Database Sharding

For large-scale deployments, shard by symbol or data source:

```typescript
// Route BTC data to shard 1, ETH to shard 2, etc.
const shard = getShardForSymbol(symbol);
await shard.processData(dataPoint);
```

## 🧪 Testing Production

### Health Checks

```bash
# Basic health
curl http://localhost:3030/health

# Detailed status
curl http://localhost:3030/api/monitoring/status

# Statistics
curl http://localhost:3030/api/monitoring/statistics
```

### Load Testing

```bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost:3030/health

# Using k6
k6 run loadtest.js
```

### Integration Testing

```bash
# Test data ingestion
curl -X POST http://localhost:3030/api/monitoring/ingest/trade \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTC",
    "price": 45000,
    "volume": 1000000,
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
    "exchange": "Binance",
    "side": "buy"
  }'
```

## 🔄 Backup & Recovery

### Data Backup

```bash
# Backup baselines and configuration
curl http://localhost:3030/api/monitoring/export?format=json > backup.json

# Schedule daily backups
0 2 * * * /scripts/backup-anomaly-data.sh
```

### Disaster Recovery

1. Deploy new instance
2. Restore baselines from backup
3. Replay recent data
4. Verify detection accuracy

## 📚 Maintenance

### Baseline Updates

Baselines auto-update, but periodic full retraining is recommended:

```bash
# Monthly: Retrain baselines with last 3 months of data
curl -X POST http://localhost:3030/api/monitoring/baselines/retrain
```

### Log Rotation

```bash
# logrotate config
/var/log/anomaly-detection/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 nodejs nodejs
}
```

### Database Maintenance

```sql
-- Archive old data monthly
INSERT INTO anomalies_archive 
SELECT * FROM anomalies 
WHERE timestamp < NOW() - INTERVAL '90 days';

DELETE FROM anomalies 
WHERE timestamp < NOW() - INTERVAL '90 days';

-- Vacuum
VACUUM ANALYZE anomalies;
```

## 🎯 Performance Tuning

### Node.js Optimization

```bash
# Increase memory limit
NODE_OPTIONS="--max-old-space-size=4096"

# Enable V8 optimizations
NODE_OPTIONS="--max-old-space-size=4096 --optimize-for-size"
```

### Database Optimization

```sql
-- Create indexes for common queries
CREATE INDEX idx_anomalies_timestamp ON anomalies(timestamp DESC);
CREATE INDEX idx_anomalies_symbol ON anomalies(symbol);
CREATE INDEX idx_anomalies_type ON anomalies(type);

-- Use TimescaleDB hypertables
SELECT create_hypertable('anomalies', 'timestamp');
```

### Caching Strategy

```typescript
// Use Redis for baseline caching
const cachedBaseline = await redis.get(`baseline:${source}:${symbol}`);
if (cachedBaseline) return JSON.parse(cachedBaseline);
```

## 🚨 Troubleshooting

### High Memory Usage
- Reduce batch size
- Decrease lookback period
- Enable data retention limits
- Check for memory leaks

### Slow Detection
- Increase batch processing
- Optimize database queries
- Add caching layer
- Scale horizontally

### Missing Anomalies
- Lower thresholds
- Check baseline quality
- Verify data is flowing
- Review classification rules

### Too Many False Positives
- Increase thresholds
- Add more historical data
- Enable seasonal patterns
- Tune classification rules

## 📞 Support

For production issues:
1. Check logs: `docker logs anomaly-detection`
2. Verify health: `curl /health`
3. Review metrics in Grafana
4. Check alert history
5. Contact: ops@yourdomain.com

---

**Production Ready** • **Scalable** • **Reliable**

