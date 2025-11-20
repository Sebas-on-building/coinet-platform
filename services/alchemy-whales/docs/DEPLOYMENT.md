# Alchemy Whales Service - Deployment Guide

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- Redis 6+
- Alchemy API keys for desired chains

### Local Development

```bash
# 1. Clone and navigate
cd services/alchemy-whales

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
nano .env  # Add your API keys

# 4. Setup database
psql -U postgres -d coinet_whales -f src/database/schema.sql

# 5. Build
npm run build

# 6. Start service
npm start
```

## 🐳 Docker Deployment

### Build Image

```bash
docker build -t coinet/alchemy-whales:latest .
```

### Run with Docker Compose

```yaml
version: '3.8'

services:
  alchemy-whales:
    image: coinet/alchemy-whales:latest
    ports:
      - "3001:3001"  # Webhooks
      - "8080:8080"  # Health
      - "9090:9090"  # Metrics
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:8080/health/live', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: coinet_whales
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./src/database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

volumes:
  postgres_data:
  redis_data:
```

```bash
docker-compose up -d
```

## ☸️ Kubernetes Deployment

### 1. Create Namespace

```bash
kubectl create namespace coinet
```

### 2. Configure Secrets

```bash
# Create secrets from literal values
kubectl create secret generic alchemy-whales-secrets \
  --from-literal=ALCHEMY_API_KEY_ETH='your_ethereum_key' \
  --from-literal=ALCHEMY_API_KEY_POLYGON='your_polygon_key' \
  --from-literal=ALCHEMY_API_KEY_ARBITRUM='your_arbitrum_key' \
  --from-literal=ALCHEMY_API_KEY_OPTIMISM='your_optimism_key' \
  --from-literal=ALCHEMY_API_KEY_BASE='your_base_key' \
  --from-literal=DATABASE_PASSWORD='your_db_password' \
  --from-literal=WEBHOOK_SECRET='your_webhook_secret' \
  --namespace=coinet

# Or create from env file
kubectl create secret generic alchemy-whales-secrets \
  --from-env-file=.env.production \
  --namespace=coinet
```

### 3. Apply ConfigMap

```bash
kubectl apply -f k8s/configmap.yaml
```

### 4. Deploy Application

```bash
kubectl apply -f k8s/deployment.yaml
```

### 5. Configure Ingress (optional)

```bash
kubectl apply -f k8s/ingress.yaml
```

### 6. Verify Deployment

```bash
# Check pods
kubectl get pods -n coinet -l app=alchemy-whales

# Check services
kubectl get svc -n coinet -l app=alchemy-whales

# View logs
kubectl logs -n coinet -l app=alchemy-whales --tail=100 -f

# Check health
kubectl port-forward -n coinet svc/alchemy-whales 8080:8080
curl http://localhost:8080/health
```

## 🔧 Configuration

### Environment Variables

#### Required

- `ALCHEMY_API_KEY_ETH` - Ethereum Alchemy API key
- `ALCHEMY_API_KEY_POLYGON` - Polygon Alchemy API key
- `ALCHEMY_API_KEY_ARBITRUM` - Arbitrum Alchemy API key
- `ALCHEMY_API_KEY_OPTIMISM` - Optimism Alchemy API key
- `ALCHEMY_API_KEY_BASE` - Base Alchemy API key
- `DATABASE_PASSWORD` - PostgreSQL password
- `WEBHOOK_SECRET` - Secret for webhook signature verification

#### Optional

- `WHALE_THRESHOLD_USD` - Minimum USD for whale classification (default: 100000)
- `LARGE_WHALE_THRESHOLD_USD` - Large whale threshold (default: 1000000)
- `MEGA_WHALE_THRESHOLD_USD` - Mega whale threshold (default: 10000000)
- `RATE_LIMIT_MAX_REQUESTS_PER_SECOND` - API rate limit (default: 25)
- `ENABLE_NOTIFICATIONS` - Enable notification service (default: true)
- `LOG_LEVEL` - Logging level (default: info)

### Database Setup

#### PostgreSQL

```sql
-- Create database
CREATE DATABASE coinet_whales;

-- Create user
CREATE USER whales_app WITH ENCRYPTED PASSWORD 'your_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE coinet_whales TO whales_app;

-- Connect and run schema
\c coinet_whales
\i src/database/schema.sql
```

#### Migrations

Future migrations will be placed in `src/database/migrations/`.

### Alchemy Webhook Setup

1. Go to [Alchemy Dashboard](https://dashboard.alchemy.com/)
2. Select your app
3. Navigate to "Webhooks"
4. Click "Create Webhook"
5. Configure:
   - **Webhook Type**: Address Activity
   - **Webhook URL**: `https://your-domain.com/webhooks/alchemy`
   - **Addresses**: Add whale addresses to monitor
   - **Network**: Select chains
6. Save webhook ID and secret

## 📊 Monitoring

### Prometheus Metrics

```bash
# View metrics
curl http://localhost:9090/metrics

# Key metrics:
# - alchemy_whales_transfers_total
# - alchemy_whales_whale_transfers_total
# - alchemy_whales_api_requests_total
# - alchemy_whales_api_latency_seconds
# - alchemy_whales_cache_hit_rate
```

### Grafana Dashboard

Import the dashboard from `docs/grafana-dashboard.json`.

### Health Checks

```bash
# Overall health
curl http://localhost:8080/health

# Liveness probe
curl http://localhost:8080/health/live

# Readiness probe
curl http://localhost:8080/health/ready

# Service info
curl http://localhost:8080/info
```

## 🔐 Security

### API Keys

- Store API keys in Kubernetes secrets or secure vault
- Never commit API keys to version control
- Rotate keys regularly

### Database

- Use SSL/TLS for database connections in production
- Implement row-level security (RLS)
- Regular backups

### Network

- Use Kubernetes Network Policies
- Enable pod security policies
- Configure ingress with TLS

### Webhook Security

- Verify webhook signatures
- Use HTTPS endpoints
- Implement rate limiting

## 📈 Scaling

### Horizontal Scaling

```bash
# Scale up
kubectl scale deployment alchemy-whales --replicas=5 -n coinet

# Autoscaling
kubectl autoscale deployment alchemy-whales \
  --min=3 --max=10 \
  --cpu-percent=70 \
  -n coinet
```

### Database Optimization

- Connection pooling (configured by default)
- Indexes on frequently queried columns
- Partition large tables by chain/date
- Regular VACUUM and ANALYZE

### Caching Strategy

- Redis for hot data
- Aggressive caching for whale profiles
- Cache invalidation on new transfers

## 🐛 Troubleshooting

### Common Issues

#### API Rate Limiting

```bash
# Check rate limiter metrics
curl http://localhost:9090/metrics | grep rate_limit

# Adjust rate limits in ConfigMap
kubectl edit configmap alchemy-whales-config -n coinet
```

#### Database Connection Issues

```bash
# Check database connectivity
kubectl exec -it <pod-name> -n coinet -- \
  psql -h $DATABASE_HOST -U $DATABASE_USER -d $DATABASE_NAME

# Check connection pool
curl http://localhost:8080/health | jq '.components.database'
```

#### High Memory Usage

```bash
# Check memory metrics
kubectl top pods -n coinet -l app=alchemy-whales

# Adjust resource limits
kubectl edit deployment alchemy-whales -n coinet
```

## 🔄 Updates

### Rolling Update

```bash
# Update image
kubectl set image deployment/alchemy-whales \
  alchemy-whales=coinet/alchemy-whales:v1.1.0 \
  -n coinet

# Check rollout status
kubectl rollout status deployment/alchemy-whales -n coinet
```

### Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/alchemy-whales -n coinet

# Rollback to specific revision
kubectl rollout undo deployment/alchemy-whales \
  --to-revision=2 \
  -n coinet
```

## 📝 Maintenance

### Backup

```bash
# Database backup
pg_dump -h localhost -U whales_app coinet_whales > backup.sql

# Redis backup
redis-cli SAVE
cp /var/lib/redis/dump.rdb backup/
```

### Cleanup

```bash
# Clear old cache entries
redis-cli FLUSHDB

# Vacuum database
psql -U whales_app -d coinet_whales -c "VACUUM ANALYZE;"
```

## 📞 Support

- Documentation: [docs.coinet.io/whales](https://docs.coinet.io/whales)
- Issues: [GitHub Issues](https://github.com/coinet/coinet/issues)
- Discord: [discord.gg/coinet](https://discord.gg/coinet)

