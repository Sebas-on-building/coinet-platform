# 🔐 COINET V1 - ENVIRONMENT VARIABLES GUIDE

**Purpose**: Complete guide to configuring all environment variables for Coinet V1.

---

## 📋 QUICK START

### Minimum Variables (Required for Basic Operation)
```bash
# Core Infrastructure
DATABASE_URL=postgresql://user:password@host:5432/coinet
REDIS_URL=redis://user:password@host:6379
NODE_ENV=production
PORT=8080

# Security
JWT_SECRET=your_random_secret_here_min_32_chars
```

### Recommended Variables (For Full Functionality)
```bash
# API Keys
ETHERSCAN_API_KEY=your_etherscan_key
OPENAI_API_KEY=sk-your_openai_key
TELEGRAM_BOT_TOKEN=123456:ABC-your_telegram_token

# CoinGecko — COINGECKO_API_PLAN defaults to 'demo' when COINGECKO_API_KEY is set
# (Demo keys use api.coingecko.com + x-cg-demo-api-key). Set to 'pro' ONLY after
# upgrading to a paid Pro key (routes to pro-api.coingecko.com + x-cg-pro-api-key).
COINGECKO_API_KEY=CG-your_demo_or_pro_key
COINGECKO_API_PLAN=demo

# CMC AI Agent Hub (MCP) — macro/derivatives co-primary Layer-1 source.
# CMC_MCP_API_KEY is preferred; if unset, CMC_API_KEY is reused. With no key the
# Agent Hub is simply skipped (degrades to null, never blocks judgment).
# CMC_MCP_URL / CMC_MCP_TOOL_* only need overriding if the published MCP endpoint
# or tool slugs change.
CMC_MCP_API_KEY=your_coinmarketcap_key
# CMC_MCP_URL=https://mcp.coinmarketcap.com/mcp
# CMC_MCP_TOOL_GLOBAL=getGlobalMetrics
# CMC_MCP_TOOL_DERIVATIVES=getDerivativesData

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your_app_password
```

---

## 🔧 DETAILED CONFIGURATION

### 1. Core Infrastructure Variables

#### `DATABASE_URL` (REQUIRED)
**Purpose**: PostgreSQL connection string for persistent storage.

**Format**: `postgresql://username:password@host:port/database?sslmode=require`

**Railway Setup**:
1. Railway Dashboard → Add New → Database → PostgreSQL
2. Once created, go to PostgreSQL service → Connect
3. Copy the "DATABASE_URL" connection string
4. Paste into `coinet-platform` service → Variables → Add `DATABASE_URL`

**Example**:
```bash
DATABASE_URL=postgresql://postgres:K9mXp2Lq8@containers-us-west-123.railway.app:5432/railway
```

**What It's Used For**:
- Storing detected signals (whale alerts, breakouts, social trends)
- Crypto knowledge base (RAG system)
- User preferences and subscriptions
- AI analysis history

---

#### `REDIS_URL` (REQUIRED)
**Purpose**: Redis connection string for event bus and caching.

**Format**: `redis://username:password@host:port`

**Railway Setup**:
1. Railway Dashboard → Add New → Database → Redis
2. Once created, go to Redis service → Connect
3. Copy the "REDIS_URL" connection string
4. Paste into `coinet-platform` service → Variables → Add `REDIS_URL`

**Example**:
```bash
REDIS_URL=redis://default:abc123xyz@containers-us-west-456.railway.app:6379
```

**What It's Used For**:
- Event bus (Redis Streams) for signal distribution
- Caching frequent queries (API responses, LLM results)
- Rate limiting state
- Real-time WebSocket connection management

---

#### `NODE_ENV` (REQUIRED)
**Purpose**: Environment mode for Node.js runtime.

**Values**: `production`, `development`, `test`

**Railway Setup**:
```bash
NODE_ENV=production
```

**What It Does**:
- Enables production optimizations (minification, error handling)
- Disables verbose logging
- Uses production database connections

---

#### `PORT` (OPTIONAL - Railway Provides)
**Purpose**: HTTP server port.

**Default**: Railway automatically sets this (usually `8080` or `3000`)

**Manual Setup** (only if needed):
```bash
PORT=8080
```

**What It's Used For**:
- Express.js listens on this port
- Railway health checks target this port

---

### 2. API Keys (Data Ingestion)

#### `ETHERSCAN_API_KEY` (RECOMMENDED)
**Purpose**: Enables on-chain whale tracking.

**How to Get**:
1. Go to https://etherscan.io
2. Sign up for free account
3. My Account → API Keys → Create API Key
4. Copy the key

**Railway Setup**:
```bash
ETHERSCAN_API_KEY=ABCD1234YOURAPIKEY
```

**Free Tier Limits**:
- 5 calls/second
- 100,000 calls/day

**What It's Used For**:
- Whale Tracker (`whale-tracker.ts`)
- Fetching Ethereum transaction data
- Detecting large wallet movements

**If Missing**: Whale tracking will be disabled, but other signals still work.

---

#### `BINANCE_API_KEY` (OPTIONAL)
**Purpose**: Enables authenticated Binance API calls (not required for public WebSocket).

**How to Get**:
1. Go to https://www.binance.com
2. Account → API Management
3. Create API Key (read-only permissions)
4. Copy API Key and Secret

**Railway Setup**:
```bash
BINANCE_API_KEY=your_api_key
BINANCE_API_SECRET=your_api_secret
```

**What It's Used For**:
- Higher rate limits for market data
- Access to account-specific data (if needed)

**If Missing**: Public WebSocket still works for price/volume data.

---

#### `TWITTER_API_KEY` (OPTIONAL)
**Purpose**: Enables Twitter viral trend detection.

**How to Get**:
1. Go to https://developer.twitter.com
2. Apply for developer account
3. Create app → Keys and tokens
4. Copy API Key and Bearer Token

**Railway Setup**:
```bash
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
TWITTER_BEARER_TOKEN=your_bearer_token
```

**Free Tier Limits** (Twitter API v2):
- 500,000 tweets/month

**What It's Used For**:
- Viral Trend Detector (`viral-trend-detector.ts`)
- Tracking crypto mentions, sentiment
- Detecting social sentiment surges

**If Missing**: Social sentiment detection will be limited to Reddit (if configured).

---

#### `REDDIT_API_KEY` (OPTIONAL)
**Purpose**: Enables Reddit viral trend detection.

**How to Get**:
1. Go to https://www.reddit.com/prefs/apps
2. Create app (script type)
3. Copy client ID and secret

**Railway Setup**:
```bash
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
REDDIT_USER_AGENT=CoinetBot/1.0
```

**What It's Used For**:
- Viral Trend Detector (`viral-trend-detector.ts`)
- Tracking r/cryptocurrency, r/bitcoin mentions
- Detecting community sentiment shifts

**If Missing**: Social sentiment will rely on Twitter only (if configured).

---

### 3. AI/LLM API Keys

#### `OPENAI_API_KEY` (RECOMMENDED)
**Purpose**: Enables GPT-4 analysis and reasoning.

**How to Get**:
1. Go to https://platform.openai.com
2. Sign up or log in
3. API Keys → Create new secret key
4. Copy the key (starts with `sk-`)

**Railway Setup**:
```bash
OPENAI_API_KEY=sk-proj-YOURAPIKEY1234567890
```

**Pricing**:
- GPT-4 Turbo: $10/1M input tokens, $30/1M output tokens
- Budget wisely! ~$0.01 per analysis

**What It's Used For**:
- Multi-LLM Orchestrator (`multi-llm-orchestrator.ts`)
- Deep reasoning tasks (new token analysis, whale behavior)
- Sentiment synthesis
- Psychology/bias detection

**If Missing**: AI analysis features will not work.

---

#### `GEMINI_API_KEY` (OPTIONAL)
**Purpose**: Enables Google Gemini for factual crypto knowledge.

**How to Get**:
1. Go to https://ai.google.dev
2. Sign up for API access
3. Create API key
4. Copy the key

**Railway Setup**:
```bash
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

**Pricing**:
- Free tier: 60 requests/minute
- Paid: Pay-as-you-go

**What It's Used For**:
- Factual queries about crypto projects
- Technical documentation retrieval
- Fallback for OpenAI

**If Missing**: System falls back to OpenAI only.

---

#### `GROK_API_KEY` (OPTIONAL)
**Purpose**: Enables xAI Grok for real-time news verification.

**How to Get**:
1. Go to https://x.ai (xAI website)
2. Request API access (currently limited beta)
3. Copy API key once approved

**Railway Setup**:
```bash
GROK_API_KEY=YOUR_GROK_API_KEY
GROK_API_URL=https://api.x.ai/v1
```

**What It's Used For**:
- Real-time news fact-checking
- Detecting fake crypto news
- Fast, concise explanations

**If Missing**: System falls back to OpenAI/Gemini.

---

### 4. Notification Services

#### `TELEGRAM_BOT_TOKEN` (RECOMMENDED)
**Purpose**: Enables Telegram alert delivery.

**How to Get**:
1. Open Telegram
2. Search for @BotFather
3. Send `/newbot`
4. Follow instructions to create bot
5. Copy the token (looks like `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

**Railway Setup**:
```bash
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
```

**What It's Used For**:
- Telegram Bot (`telegram-bot.ts`)
- Instant signal alerts to users
- Priority-based notifications (🚨 critical, ⚠️ high, ℹ️ medium)

**If Missing**: Telegram alerts disabled (email still works if configured).

---

#### `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (OPTIONAL)
**Purpose**: Enables email alert delivery.

**Gmail Setup** (most common):
1. Enable 2-Factor Authentication on your Google account
2. Go to https://myaccount.google.com/security
3. App passwords → Generate password
4. Copy the 16-character password

**Railway Setup**:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your_16_char_app_password
```

**Other SMTP Providers**:
- **SendGrid**: `smtp.sendgrid.net:587` (recommended for production)
- **AWS SES**: `email-smtp.us-east-1.amazonaws.com:587`
- **Mailgun**: `smtp.mailgun.org:587`

**What It's Used For**:
- Email Service (`email-service.ts`)
- Signal digest emails
- Critical alert notifications

**If Missing**: Email alerts disabled (Telegram still works if configured).

---

### 5. Security & Authentication

#### `JWT_SECRET` (REQUIRED)
**Purpose**: Secret key for JWT token signing (API authentication).

**How to Generate**:
```bash
# On Mac/Linux:
openssl rand -base64 32

# Or use online generator:
# https://randomkeygen.com (use "Fort Knox Password")
```

**Railway Setup**:
```bash
JWT_SECRET=your_random_32_char_secret_here
```

**Security Requirements**:
- Minimum 32 characters
- Random, unpredictable
- Never commit to GitHub

**What It's Used For**:
- Signing JWT tokens for API authentication
- Verifying user identity in API requests

**If Missing**: API authentication will fail.

---

#### `ENCRYPTION_KEY` (OPTIONAL)
**Purpose**: Encrypt sensitive user data in database.

**How to Generate**:
```bash
openssl rand -hex 32
```

**Railway Setup**:
```bash
ENCRYPTION_KEY=your_64_char_hex_string_here
```

**What It's Used For**:
- Encrypting user API keys in database
- Encrypting wallet addresses

**If Missing**: Sensitive data stored in plain text (not recommended for production).

---

### 6. Configuration & Tuning

#### `LOG_LEVEL` (OPTIONAL)
**Purpose**: Control logging verbosity.

**Values**: `debug`, `info`, `warn`, `error`

**Railway Setup**:
```bash
LOG_LEVEL=info
```

**Recommendations**:
- **Development**: `debug` (see everything)
- **Production**: `info` (balanced)
- **High-traffic**: `warn` (reduce noise)

---

#### `SIGNAL_BATCH_SIZE` (OPTIONAL)
**Purpose**: Number of signals to process in each batch.

**Default**: `10`

**Railway Setup**:
```bash
SIGNAL_BATCH_SIZE=20
```

**Tuning**:
- **High volume**: Increase to `50` (faster processing)
- **Low resources**: Decrease to `5` (lower memory)

---

#### `RATE_LIMIT_REQUESTS_PER_MINUTE` (OPTIONAL)
**Purpose**: API rate limit for external calls.

**Default**: `60` (1 request/second)

**Railway Setup**:
```bash
RATE_LIMIT_RPM=60
```

**Tuning**:
- **Free tier APIs**: Keep at `60`
- **Paid tier**: Increase to `300` or higher

---

## 📝 COMPLETE .env TEMPLATE

Save this as `.env.example` in your repository:

```bash
# ===== CORE INFRASTRUCTURE =====
DATABASE_URL=postgresql://user:password@host:5432/coinet
REDIS_URL=redis://user:password@host:6379
NODE_ENV=production
PORT=8080

# ===== SECURITY =====
JWT_SECRET=your_random_secret_min_32_chars
ENCRYPTION_KEY=your_random_hex_64_chars

# ===== DATA INGESTION =====
ETHERSCAN_API_KEY=your_etherscan_key
BINANCE_API_KEY=your_binance_key_optional
BINANCE_API_SECRET=your_binance_secret_optional
TWITTER_API_KEY=your_twitter_key_optional
TWITTER_API_SECRET=your_twitter_secret_optional
TWITTER_BEARER_TOKEN=your_twitter_bearer_token_optional
REDDIT_CLIENT_ID=your_reddit_client_id_optional
REDDIT_CLIENT_SECRET=your_reddit_client_secret_optional

# ===== AI/LLM =====
OPENAI_API_KEY=sk-your_openai_key
GEMINI_API_KEY=your_gemini_key_optional
GROK_API_KEY=your_grok_key_optional

# ===== NOTIFICATIONS =====
TELEGRAM_BOT_TOKEN=123456:ABC-your_telegram_token
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your_app_password

# ===== CONFIGURATION =====
LOG_LEVEL=info
SIGNAL_BATCH_SIZE=10
RATE_LIMIT_RPM=60
```

---

## 🚀 RAILWAY SETUP INSTRUCTIONS

### Step 1: Add Variables via Railway Dashboard
1. Go to https://railway.app/dashboard
2. Click on `coinet-platform` project
3. Click on `coinet-platform` service
4. Go to **Variables** tab
5. Click **+ New Variable**
6. Add each variable one by one

### Step 2: Verify Variables
After adding all variables:
1. Scroll down in Variables tab
2. Click **Show** next to each variable to verify correctness
3. **Important**: Do NOT share these values publicly

### Step 3: Trigger Redeploy
1. Go to **Deployments** tab
2. Click ⋮ menu on latest deployment
3. Click **Redeploy**
4. Wait 2-3 minutes for redeploy

---

## ✅ VALIDATION CHECKLIST

Before deploying, ensure:
- [ ] `DATABASE_URL` and `REDIS_URL` are correct (test with Railway's built-in databases)
- [ ] `JWT_SECRET` is at least 32 characters
- [ ] `OPENAI_API_KEY` starts with `sk-` (valid format)
- [ ] `ETHERSCAN_API_KEY` is valid (test at https://etherscan.io/myapikey)
- [ ] `TELEGRAM_BOT_TOKEN` is valid (test by sending message to bot)
- [ ] `SMTP_HOST` and credentials are correct (send test email)
- [ ] All sensitive values are NOT committed to GitHub

---

## 🔒 SECURITY BEST PRACTICES

1. **Never Commit to GitHub**: Use `.gitignore` to exclude `.env` files
2. **Rotate Keys Regularly**: Change API keys every 90 days
3. **Use Read-Only Keys**: For Binance, Twitter, Reddit (when possible)
4. **Monitor Usage**: Check API dashboards for unusual activity
5. **Backup Railway Variables**: Keep a secure copy (e.g., 1Password)

---

## 📞 SUPPORT

**If you're missing API keys**:
- Etherscan: https://etherscan.io/myapikey
- OpenAI: https://platform.openai.com/api-keys
- Telegram: https://t.me/BotFather

**If variables aren't working**:
1. Check spelling (case-sensitive!)
2. Verify Railway redeploy triggered
3. Check Deploy Logs for error messages
4. Test individual keys on provider websites

---

**Built with ❤️ by the Coinet AI Team**  
**Last Updated**: October 27, 2025

