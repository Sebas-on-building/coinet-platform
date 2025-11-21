# 🚀 Coinet Platform

World-class AI-powered cryptocurrency trading platform with divine chat capabilities.

## 🏗️ Architecture

- **Express.js** - HTTP server
- **Prisma** - Database ORM
- **PostgreSQL** - Database
- **TypeScript** - Type safety
- **Zod** - Runtime validation

## 📦 Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Database Setup

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# (Optional) Open Prisma Studio
pnpm db:studio
```

### 3. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/coinet"
AI_SERVICE_URL="http://localhost:3001"
```

### 4. Start Development Server

```bash
pnpm dev
```

## 🎯 API Endpoints

### Chat API

- `POST /api/chat/message` - Send message and get AI response
- `GET /api/chat/history/:conversationId` - Get conversation history
- `DELETE /api/chat/message/:messageId` - Delete a message
- `POST /api/chat/regenerate` - Regenerate assistant message

### Health & Status

- `GET /api/health` - Health check
- `GET /api/status` - Detailed status

## 💬 Chat API Example

```bash
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user123" \
  -d '{
    "message": "What is the current Bitcoin price?",
    "context": {
      "includeSources": true,
      "includeCharts": true,
      "analysisDepth": "standard"
    }
  }'
```

## 📊 Features

- ✅ Natural language chat
- ✅ Chart detection from text
- ✅ Source citations
- ✅ Conversation history
- ✅ Message regeneration
- ✅ Agent support

## 🗄️ Database Schema

See `prisma/schema.prisma` for complete schema:
- Conversations
- Messages
- Agents
- Alerts
- Insights

## 🚀 Deployment

Built for Railway deployment with:
- Health checks
- Graceful shutdown
- Database migrations
- Environment configuration

## 📝 Development

- **TypeScript** - Strict mode enabled
- **ESLint** - Code quality
- **Prisma** - Database management
- **Zod** - Runtime validation

---

**Built with ❤️ for perfection**

