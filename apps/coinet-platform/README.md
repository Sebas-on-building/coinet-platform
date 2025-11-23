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

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/coinet"
AI_SERVICE_URL="http://localhost:3001"
PORT=3000
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

- `POST /api/chat/message` - Send message and get AI response
- `GET /api/chat/history/:conversationId` - Get conversation history
- `DELETE /api/chat/message/:messageId` - Delete a message
- `POST /api/chat/regenerate` - Regenerate assistant message

### Health & Status

- `GET /api/health` - Health check
- `GET /api/status` - Detailed status

## 🚀 Railway Deployment

This service is configured for Railway deployment. Make sure:

1. Root directory is set to: `apps/coinet-platform`
2. Environment variables are configured
3. Database migrations run on deploy

## 📊 Features

- ✅ Natural language chat
- ✅ Chart detection from text
- ✅ Source citations
- ✅ Conversation history
- ✅ Message regeneration
- ✅ Agent support
