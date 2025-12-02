# 📋 Coinet Platform - Project Context & Continuity Guide

**Last Updated**: December 2, 2024  
**Purpose**: Maintain project continuity, document decisions, and preserve context across sessions

---

## 🎯 Project Overview

**Coinet AI** - Revolutionary AI-powered cryptocurrency trading platform that combines:
- Real-time market data (14,000+ coins)
- AI-powered analysis (Grok/xAI integration)
- Whale monitoring & liquidation data
- User memory & personalization
- Deep market intelligence

**Status**: Production-ready backend, actively developing features

---

## 🔗 Critical Connection Points

### Database Connection
- **Type**: PostgreSQL (via Railway)
- **Environment Variable**: `DATABASE_URL`
- **Location**: Railway PostgreSQL service
- **Important**: Chat history is stored here, NOT in git repo

**To verify connection**:
```bash
npm run db:verify
# Or manually:
psql $DATABASE_URL -c "SELECT COUNT(*) FROM conversations;"
```

### Backend Deployment
- **Platform**: Railway
- **Service**: `coinet-platform`
- **Root Directory**: `apps/coinet-platform`
- **Health Check**: `/api/health`
- **Diagnostic**: `/api/diagnostic?symbol=BTC`

### Frontend Deployment
- **Platform**: Vercel
- **Repository**: Same repo, different directory
- **Directory**: `apps/client-web`

### External Services
- **Market Prices**: `MARKET_PRICES_URL` (Railway service)
- **Whale Monitoring**: `ALCHEMY_WHALES_URL` (Railway service)
- **AI Provider**: Grok (xAI) - Primary, OpenAI - Fallback

---

## 📊 Current State

### ✅ Completed Features
- [x] Universal Coin Data (14,000+ coins via CoinGecko/CMC/DexScreener)
- [x] Liquidation & Funding Rate Service (Coinglass integration)
- [x] Diagnostic endpoint (`/api/diagnostic`)
- [x] User memory & personalization system
- [x] Whale monitoring integration
- [x] News aggregation with sentiment
- [x] Chat API with SSE streaming
- [x] Chart detection system
- [x] Source citation system

### 🚧 In Progress
- [ ] Chart pattern recognition
- [ ] Social sentiment (Twitter/Reddit) - partial
- [ ] Trading strategy backtesting

### 📝 Planned
- [ ] Liquidation heatmaps
- [ ] Alert system
- [ ] Advanced analytics dashboard

---

## 🗄️ Database Schema Overview

### Core Models
- **Conversation**: User chat sessions
- **Message**: Individual messages with sources, charts, confidence scores
- **Agent**: Custom AI agents with personalities
- **UserMemory**: User preferences, trading style, portfolio
- **UserPortfolio**: User holdings tracking
- **UserWatchlist**: Watched coins
- **Alert**: Price/event alerts

**Key Point**: All chat history is in PostgreSQL. If you lose the repo but keep the database connection, your chats are safe.

---

## 🔐 Environment Variables

### Required
```bash
DATABASE_URL="postgresql://..."  # PostgreSQL connection (Railway)
PORT=3000                        # Backend port
```

### AI Service (at least one)
```bash
XAI_API_KEY="..."                # Grok API key (primary)
OPENAI_API_KEY="..."            # OpenAI API key (fallback)
```

### Recommended (for full features)
```bash
COINGECKO_API_KEY="..."         # CoinGecko Pro (better rate limits)
COINGLASS_API_KEY="..."         # Liquidation/funding data
CRYPTOPANIC_API_KEY="..."       # News aggregation
CMC_API_KEY="..."               # CoinMarketCap backup
```

### External Services
```bash
MARKET_PRICES_URL="..."         # Internal market-prices service
ALCHEMY_WHALES_URL="..."        # Whale monitoring service
```

---

## 📚 Key Decisions & Rationale

### Why PostgreSQL?
- **Relational data**: Conversations, messages, users need relationships
- **ACID compliance**: Critical for financial data
- **Prisma ORM**: Type-safe, excellent DX
- **Railway integration**: Easy deployment

### Why Grok (xAI) as Primary?
- **Real-time data**: Better crypto market awareness
- **Cost-effective**: Competitive pricing
- **Performance**: Fast responses
- **Fallback**: OpenAI available if needed

### Why Multiple Price APIs?
- **Reliability**: If CoinGecko fails, fallback to CMC or DexScreener
- **Coverage**: CoinGecko (14K+), CMC (backup), DexScreener (DEX tokens)
- **Rate limits**: Multiple APIs = better availability

### Architecture Decisions
- **Monorepo**: Shared types, easier development
- **Express.js**: Simple, proven, fast
- **SSE Streaming**: Real-time responses without WebSocket complexity
- **Service-oriented**: Market data, whale data, news as separate services

---

## 🐛 Known Issues & Solutions

### Issue: "No data for SUPRA"
**Solution**: 
1. Check `/api/diagnostic?symbol=SUPRA`
2. Verify CoinGecko API key (optional but recommended)
3. Check symbol detection logs
4. DexScreener should catch DEX-only tokens

### Issue: AI not responding
**Solution**:
1. Verify at least one AI API key is set (`XAI_API_KEY` or `OPENAI_API_KEY`)
2. Check `/api/diagnostic` for AI service status
3. Review Railway logs for API errors

### Issue: Database connection lost
**Solution**:
1. Check Railway dashboard for PostgreSQL service status
2. Verify `DATABASE_URL` environment variable
3. Run `npm run db:verify` to test connection
4. Check if database was recreated (new URL = new database = lost data)

---

## 📝 Development Notes

### Important Files
- `apps/coinet-platform/src/index.ts` - Main server, diagnostic endpoint
- `apps/coinet-platform/src/api/chat/service.ts` - Core chat logic
- `apps/coinet-platform/src/services/liquidation-service.ts` - Liquidation data
- `apps/coinet-platform/src/services/market-data.ts` - Price fetching
- `apps/coinet-platform/src/services/symbol-detector.ts` - Coin detection
- `apps/coinet-platform/prisma/schema.prisma` - Database schema

### Testing
```bash
# Test price fetching
curl http://localhost:3000/api/test/price/SUPRA

# Full diagnostic
curl http://localhost:3000/api/diagnostic?symbol=BTC

# Health check
curl http://localhost:3000/api/health
```

### Database Migrations
```bash
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio (GUI)
```

---

## 🔄 Backup Strategy

### Chat History Backup
**Automated**: Run `npm run db:backup` daily  
**Manual**: See `scripts/backup-chat-history.sh`

### Database Backup
**Railway**: Automatic daily backups (check Railway dashboard)  
**Manual**: `pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql`

### Code Backup
**GitHub**: All code is in git (already backed up)  
**Local**: Keep local clone updated

---

## 🚨 Recovery Procedures

### If Database Connection Lost
1. Check Railway dashboard for PostgreSQL service
2. Get new `DATABASE_URL` if database was recreated
3. Update environment variable
4. Run migrations: `npm run db:migrate`
5. **Note**: New database = empty = lost chat history

### If Repository Lost
1. Clone fresh: `git clone https://github.com/Sebas-on-building/coinet-platform.git`
2. Set up environment variables (copy from Railway)
3. Run `npm install`
4. Run `npm run db:generate`
5. **Note**: Code is safe, but check database connection

### If Chat History Lost
1. Check Railway backups (if available)
2. Check if you have manual backup SQL files
3. Restore from backup: `psql $DATABASE_URL < backup.sql`
4. **Prevention**: Set up automated backups (see scripts/)

---

## 📞 Quick Reference

### Key Commands
```bash
# Development
npm run dev:watch          # Auto-reload development
npm run build              # Build for production
npm start                  # Start production server

# Database
npm run db:generate        # Generate Prisma client
npm run db:migrate         # Run migrations
npm run db:studio          # Open Prisma Studio
npm run db:verify          # Verify database connection
npm run db:backup          # Backup chat history

# Testing
npm run test               # Run tests
curl http://localhost:3000/api/diagnostic?symbol=BTC
```

### Important URLs
- **GitHub**: https://github.com/Sebas-on-building/coinet-platform
- **Railway Dashboard**: Check your Railway account
- **Vercel Dashboard**: Check your Vercel account

---

## 📅 Change Log

### December 2, 2024
- ✅ Added liquidation & funding rate service
- ✅ Added diagnostic endpoint
- ✅ Cleaned up 190 duplicate documentation files
- ✅ Added comprehensive API documentation
- ✅ Created PROJECT_CONTEXT.md for continuity

### Previous
- ✅ Implemented universal coin data (14K+ coins)
- ✅ Added user memory & personalization
- ✅ Integrated whale monitoring
- ✅ Added news aggregation

---

## 💡 Tips for Maintaining Context

1. **Update this file** after major decisions or changes
2. **Document "why"** not just "what" - helps future you understand
3. **Note important conversations** - what worked, what didn't
4. **Keep DATABASE_URL safe** - this is your chat history connection
5. **Regular backups** - run `npm run db:backup` regularly
6. **Git commits** - commit often with clear messages
7. **Use branches** - experiment without breaking main

---

## 🎯 Next Session Checklist

When starting a new session:
- [ ] Verify database connection: `npm run db:verify`
- [ ] Check recent commits: `git log --oneline -5`
- [ ] Review this file for context
- [ ] Check Railway/Vercel deployment status
- [ ] Test diagnostic endpoint: `/api/diagnostic`
- [ ] Review any open issues or TODOs

---

**Remember**: Your chat history is in the database, not the repo. Keep your `DATABASE_URL` safe and backed up!

