# Railway Deployment Setup Guide

## 🚂 Quick Deploy to Railway

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

### Step 2: Login to Railway

```bash
railway login
```

### Step 3: Create New Project

```bash
cd services/alchemy-whales
railway init
```

Select:
- **Create new project** → Name: `alchemy-whales`
- **Empty project** → Select this

### Step 4: Link to Existing Project (if already created)

```bash
railway link
```

### Step 5: Set Environment Variables

```bash
# Required Alchemy API Keys
railway variables set ALCHEMY_API_KEY_ETH=your_ethereum_key
railway variables set ALCHEMY_API_KEY_POLYGON=your_polygon_key
railway variables set ALCHEMY_API_KEY_ARBITRUM=your_arbitrum_key
railway variables set ALCHEMY_API_KEY_OPTIMISM=your_optimism_key
railway variables set ALCHEMY_API_KEY_BASE=your_base_key

# Database Configuration
railway variables set DATABASE_HOST=your_postgres_host
railway variables set DATABASE_PORT=5432
railway variables set DATABASE_NAME=coinet_whales
railway variables set DATABASE_USER=postgres
railway variables set DATABASE_PASSWORD=your_password
railway variables set DATABASE_SSL=true

# Redis Configuration (if using Railway Redis)
railway variables set REDIS_HOST=your_redis_host
railway variables set REDIS_PORT=6379
railway variables set REDIS_PASSWORD=your_redis_password

# Webhook Configuration
railway variables set WEBHOOK_SECRET=your_secure_random_secret

# Optional Configuration
railway variables set NODE_ENV=production
railway variables set LOG_LEVEL=info
railway variables set ENABLE_NOTIFICATIONS=true
```

### Step 6: Add PostgreSQL Service (Railway)

1. Go to Railway dashboard
2. Click "New" → "Database" → "Add PostgreSQL"
3. Railway will automatically set `DATABASE_URL`
4. Update variables to use Railway's PostgreSQL:
```bash
railway variables set DATABASE_HOST=${{Postgres.PGHOST}}
railway variables set DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
railway variables set DATABASE_USER=${{Postgres.PGUSER}}
railway variables set DATABASE_NAME=${{Postgres.PGDATABASE}}
```

### Step 7: Add Redis Service (Optional)

1. Go to Railway dashboard
2. Click "New" → "Database" → "Add Redis"
3. Update variables:
```bash
railway variables set REDIS_HOST=${{Redis.REDIS_HOST}}
railway variables set REDIS_PORT=${{Redis.REDIS_PORT}}
railway variables set REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
```

### Step 8: Deploy

```bash
railway up
```

Or deploy via GitHub:
1. Connect GitHub repository in Railway dashboard
2. Select branch: `main` or `feature/ai-data-feeder`
3. Railway will auto-deploy on push

### Step 9: Verify Deployment

```bash
# Get deployment URL
railway domain

# Check logs
railway logs

# Check health
curl https://your-app.railway.app/health
```

## 🔧 Railway Configuration Files

The service includes:
- `railway.json` - Railway build configuration
- `nixpacks.toml` - Nixpacks build configuration
- `.railwayignore` - Files to exclude from deployment

## 📊 Monitoring

After deployment, access:
- **Health**: `https://your-app.railway.app/health`
- **Metrics**: `https://your-app.railway.app/metrics`
- **Info**: `https://your-app.railway.app/info`

## 🔐 Security Best Practices

1. **Never commit API keys** - Use Railway variables
2. **Use strong secrets** - Generate with `openssl rand -hex 32`
3. **Enable SSL** - Railway provides HTTPS automatically
4. **Rotate secrets** - Regularly update API keys

## 🐛 Troubleshooting

### Build Failures
```bash
# Check build logs
railway logs --build

# Verify Node.js version
railway variables set NODE_VERSION=18
```

### Runtime Errors
```bash
# View application logs
railway logs

# Check environment variables
railway variables
```

### Database Connection Issues
```bash
# Verify PostgreSQL is running
railway status

# Check connection string
railway variables | grep DATABASE
```

## 📈 Scaling

Railway automatically scales based on traffic. For manual scaling:

1. Go to Railway dashboard
2. Select service → Settings → Scaling
3. Adjust resources as needed

## 💰 Cost Optimization

- Use Railway's free tier for development
- Monitor usage in dashboard
- Set up alerts for cost thresholds
- Use Railway's built-in PostgreSQL (free tier available)

## 🔄 CI/CD Integration

The service includes GitHub Actions workflow (`.github/workflows/deploy.yml`) for automatic deployment:

1. Push to `main` branch
2. GitHub Actions builds and tests
3. Railway deploys automatically (if configured)

## 📞 Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Service Docs: See `README.md`

