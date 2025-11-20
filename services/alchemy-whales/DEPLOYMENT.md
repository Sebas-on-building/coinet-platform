# Deployment Guide - Alchemy Whales Service

## 🚀 Quick Deploy

### Railway Deployment

1. **Install Railway CLI** (if not already installed):
```bash
npm i -g @railway/cli
```

2. **Login to Railway**:
```bash
railway login
```

3. **Initialize Railway Project**:
```bash
cd services/alchemy-whales
railway init
```

4. **Set Environment Variables**:
```bash
railway variables set ALCHEMY_API_KEY_ETH=your_key_here
railway variables set ALCHEMY_API_KEY_POLYGON=your_key_here
railway variables set ALCHEMY_API_KEY_ARBITRUM=your_key_here
railway variables set ALCHEMY_API_KEY_OPTIMISM=your_key_here
railway variables set ALCHEMY_API_KEY_BASE=your_key_here
railway variables set DATABASE_PASSWORD=your_password
railway variables set WEBHOOK_SECRET=your_secret
```

5. **Deploy**:
```bash
railway up
```

### GitHub Codespace

1. **Open in Codespace**:
   - Navigate to repository
   - Click "Code" → "Codespaces" → "Create codespace"

2. **Setup Environment**:
```bash
cd services/alchemy-whales
cp .env.example .env
# Edit .env with your keys
```

3. **Install & Run**:
```bash
npm install
npm run build
npm start
```

### Docker Deployment

```bash
# Build image
docker build -t coinet/alchemy-whales:latest .

# Run container
docker run -d \
  --name alchemy-whales \
  -p 3001:3001 \
  -p 8080:8080 \
  -p 9090:9090 \
  --env-file .env \
  coinet/alchemy-whales:latest
```

### Kubernetes Deployment

```bash
# Apply configurations
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/ingress.yaml
```

## 📋 Required Environment Variables

See `.env.example` for complete list. Minimum required:

- `ALCHEMY_API_KEY_ETH`
- `ALCHEMY_API_KEY_POLYGON`
- `DATABASE_PASSWORD`
- `WEBHOOK_SECRET`

## 🔍 Health Checks

After deployment, verify:

```bash
# Health check
curl http://localhost:8080/health

# Metrics
curl http://localhost:9090/metrics

# Info
curl http://localhost:8080/info
```

## 🐛 Troubleshooting

### Build Failures
- Ensure Node.js 18+ is installed
- Run `npm ci` instead of `npm install`
- Check TypeScript version compatibility

### Runtime Errors
- Verify all environment variables are set
- Check database connectivity
- Review logs: `railway logs` or `kubectl logs`

### Performance Issues
- Adjust rate limits in ConfigMap
- Scale horizontally: `kubectl scale deployment alchemy-whales --replicas=3`
- Monitor metrics endpoint

