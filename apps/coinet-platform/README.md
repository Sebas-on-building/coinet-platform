# 🚀 Coinet Platform - Divine Perfection Edition

World-class AI-powered cryptocurrency trading platform with revolutionary features that surpass ChatGPT and Perplexity.

## 🏗️ Architecture

- **Express.js** - HTTP server
- **Prisma** - Database ORM
- **PostgreSQL** - Database
- **TypeScript** - Type safety
- **Zod** - Runtime validation
- **Grok (xAI)** - Primary AI provider
- **OpenAI** - Fallback AI provider

## 📦 Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# (Optional) Open Prisma Studio
npm run db:studio
```

### 3. Environment Variables

Copy `.env.example` to `.env` and configure:

**Required:**
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/coinet"
PORT=3000
```

**AI Service (at least one required):**
```bash
XAI_API_KEY="your-grok-api-key"          # Primary (Grok)
# OR
OPENAI_API_KEY="sk-your-openai-key"      # Fallback
```

**Recommended (for full features):**
```bash
COINGECKO_API_KEY="your-key"            # Pro tier (better rate limits)
COINGLASS_API_KEY="your-key"            # Liquidation/funding data
CRYPTOPANIC_API_KEY="your-key"          # News aggregation
CMC_API_KEY="your-key"                  # Backup price data
```

**External Services:**
```bash
MARKET_PRICES_URL="https://market-prices-production.up.railway.app"
ALCHEMY_WHALES_URL="https://alchemy-whales-production.up.railway.app"
```

### 4. Build

```bash
npm run build
```

### 5. Start

```bash
npm start
```

## 🎯 API Endpoints

### Chat API

- `POST /api/chat/message` - Send message and get AI response with full market context
- `GET /api/chat/history/:conversationId` - Get conversation history
- `DELETE /api/chat/message/:messageId` - Delete a message
- `POST /api/chat/regenerate` - Regenerate assistant message

### Diagnostic & Testing

- `GET /api/health` - Health check (for Railway)
- `GET /api/status` - Detailed service status
- `GET /api/diagnostic?symbol=SUPRA` - **Comprehensive service diagnostics** - Tests all services
- `GET /api/test/price/:symbol` - Quick price test for any coin

### Root

- `GET /` - Service info and endpoint list

## 🚀 Railway Deployment

This service is configured for Railway deployment. Make sure:

1. Root directory is set to: `apps/coinet-platform`
2. Environment variables are configured (see above)
3. Database migrations run automatically on deploy
4. Health check endpoint: `/api/health`

## 📊 Core Features

### ✅ Universal Coin Data (14,000+ coins)
- **Symbol Detection**: Automatically detects coins from user messages
- **Dynamic Price Fetching**: Real-time prices for ANY coin via:
  - CoinGecko API (14,000+ coins)
  - CoinMarketCap (backup)
  - DexScreener (DEX-only tokens like new memecoins)
  - Internal market-prices service (cached)
- **Intelligent Fallback**: If one API fails, automatically tries the next

### ✅ User Memory & Personalization
- **Portfolio Tracking**: Remembers user holdings
- **Watchlist**: Tracks coins user is watching
- **Preferences**: Risk tolerance, trading style, favorite coins
- **Auto-Learning**: Extracts preferences from conversations
- **Cross-Session Memory**: Remembers users across conversations

### ✅ Deep Market Intelligence
- **Whale Monitoring**: Real-time whale movements via alchemy-whales service
- **Liquidation Data**: 24h liquidations, long/short ratios, risk levels
- **Funding Rates**: Perpetual funding rates across exchanges with cost warnings
- **Open Interest**: OI tracking and trends
- **News Aggregation**: Real-time crypto news with sentiment analysis
- **Fear & Greed Index**: Market sentiment tracking

### ✅ AI-Powered Analysis
- **Grok Integration**: Primary AI (xAI's Grok)
- **Context-Aware**: Injects live market data, whale activity, news, sentiment
- **Personalized**: Uses user memory for tailored responses
- **Trading Insights**: Provides actionable trading intelligence

### ✅ Chat Features
- Natural language chat
- Chart detection from text
- Source citations
- Conversation history
- Message regeneration
- Agent support

## 🔬 Diagnostic Endpoint

The `/api/diagnostic` endpoint tests all services and provides:
- ✅ Service health status
- ✅ Environment variable configuration
- ✅ API connectivity
- ✅ Rate limit status
- ✅ Specific recommendations for fixing issues

**Example:**
```bash
curl https://your-backend/api/diagnostic?symbol=SUPRA
```

## 🎯 Key Differentiators vs ChatGPT/Perplexity

| Feature | ChatGPT | Perplexity | **Coinet AI** |
|---------|---------|------------|---------------|
| Real-time crypto prices | ❌ | ⚠️ Limited | ✅ **Any coin (14K+)** |
| Whale alerts | ❌ | ❌ | ✅ **Integrated** |
| Liquidation data | ❌ | ❌ | ✅ **Real-time** |
| Funding rates | ❌ | ❌ | ✅ **Multi-exchange** |
| User memory | ✅ | ❌ | ✅ **Trading-focused** |
| Live charts | ❌ | ❌ | ✅ **Synced** |
| Crypto-native | ❌ | ❌ | ✅ **Built for traders** |

## 📚 Service Architecture

```
User Message
    ↓
Symbol Detector (detects coins)
    ↓
Parallel Fetch:
  ├─ Market Data (CoinGecko → CMC → DexScreener)
  ├─ Whale Activity (alchemy-whales)
  ├─ Liquidation Data (Coinglass)
  ├─ Funding Rates (Coinglass)
  ├─ News (CryptoPanic)
  ├─ Sentiment (Fear & Greed)
  └─ User Memory (portfolio, preferences)
    ↓
AI Context Assembly
    ↓
Grok AI Analysis
    ↓
Response with Sources & Charts
```

## 🔧 Troubleshooting

### "No data for SUPRA" error

1. **Check diagnostic endpoint**: `/api/diagnostic?symbol=SUPRA`
2. **Verify CoinGecko API**: Should work even without API key (free tier)
3. **Check DexScreener**: Should catch DEX-only tokens
4. **Verify symbol detection**: Check if SUPRA is detected correctly

### AI not responding

1. **Check API keys**: At least one of `XAI_API_KEY` or `OPENAI_API_KEY` required
2. **Check logs**: Look for API errors in Railway logs
3. **Test AI health**: `/api/diagnostic` shows AI service status

### Database errors

1. **Verify DATABASE_URL**: Must be valid PostgreSQL connection string
2. **Check migrations**: Run `npm run db:migrate` locally
3. **Railway auto-migrates**: Migrations run automatically on deploy

## 📝 Development

```bash
# Development with auto-reload
npm run dev:watch

# Quick build and run
npm run dev:quick

# TypeScript direct execution
npm run dev:ts
```

## 🎯 Next Steps

- [ ] Add chart pattern recognition
- [ ] Implement liquidation heatmaps
- [ ] Add social sentiment (Twitter/Reddit)
- [ ] Create trading strategy backtesting
- [ ] Build alert system

---

**Built with ❤️ by the Coinet AI Team**  
**Version**: 1.0.0 - Divine Perfection Edition
