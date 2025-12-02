# 📚 Coinet Platform API Documentation

Complete API reference for Coinet Platform - Divine Perfection Edition.

## Base URL

```
Production: https://your-railway-url.up.railway.app
Development: http://localhost:3000
```

## Authentication

Most endpoints require a `X-User-Id` header:

```http
X-User-Id: user_1234567890_abc123
```

The user ID is auto-generated and stored in localStorage on the frontend.

---

## 🎯 Chat API

### Send Chat Message

Send a message to the AI and get a response with full market context.

**Endpoint:** `POST /api/chat/message`

**Headers:**
```http
Content-Type: application/json
X-User-Id: user_1234567890_abc123
```

**Request Body:**
```json
{
  "message": "What about $SUPRA?",
  "conversationId": "conv_abc123",  // Optional: continue existing conversation
  "agentId": "agent_xyz789",         // Optional: use specific agent
  "context": {
    "includeSources": true,          // Include source citations
    "includeCharts": true,            // Include chart configs
    "analysisDepth": "standard"       // "quick" | "standard" | "deep"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": {
      "id": "msg_123",
      "role": "assistant",
      "content": "SUPRA is currently trading at $0.00118...",
      "sources": [
        {
          "id": "src_1",
          "domain": "coingecko.com",
          "url": "https://...",
          "title": "Supra Price",
          "excerpt": "..."
        }
      ],
      "charts": [
        {
          "symbol": "SUPRAUSD",
          "interval": "1H",
          "type": "tradingview"
        }
      ],
      "confidence": 0.85,
      "createdAt": "2024-01-15T10:30:00Z"
    },
    "conversationId": "conv_abc123",
    "conversationTitle": "SUPRA Discussion"
  },
  "metadata": {
    "processingTime": 1250,
    "tokens": 450,
    "model": "grok-4-1-fast-non-reasoning"
  }
}
```

**Example with cURL:**
```bash
curl -X POST https://your-backend/api/chat/message \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user_123" \
  -d '{
    "message": "What about $SUPRA?",
    "context": {
      "includeSources": true,
      "includeCharts": true
    }
  }'
```

---

### Get Conversation History

Retrieve all messages from a conversation.

**Endpoint:** `GET /api/chat/history/:conversationId`

**Headers:**
```http
X-User-Id: user_1234567890_abc123
```

**Response:**
```json
{
  "success": true,
  "data": {
    "conversation": {
      "id": "conv_abc123",
      "title": "SUPRA Discussion",
      "messages": [
        {
          "id": "msg_1",
          "role": "user",
          "content": "What about $SUPRA?",
          "createdAt": "2024-01-15T10:30:00Z"
        },
        {
          "id": "msg_2",
          "role": "assistant",
          "content": "SUPRA is currently trading...",
          "sources": [...],
          "charts": [...],
          "createdAt": "2024-01-15T10:30:01Z"
        }
      ],
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:01Z"
    }
  }
}
```

---

### Regenerate Message

Regenerate the last assistant message in a conversation.

**Endpoint:** `POST /api/chat/regenerate`

**Headers:**
```http
Content-Type: application/json
X-User-Id: user_1234567890_abc123
```

**Request Body:**
```json
{
  "conversationId": "conv_abc123",
  "messageId": "msg_2"
}
```

**Response:** Same as Send Chat Message

---

### Delete Message

Delete a message from a conversation.

**Endpoint:** `DELETE /api/chat/message/:messageId?conversationId=:conversationId`

**Headers:**
```http
X-User-Id: user_1234567890_abc123
```

**Response:**
```json
{
  "success": true
}
```

---

## 🔬 Diagnostic & Testing

### Comprehensive Diagnostics

Test all services and get detailed status information.

**Endpoint:** `GET /api/diagnostic?symbol=SUPRA`

**Query Parameters:**
- `symbol` (optional): Symbol to test (default: "SUPRA")

**Response:**
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "testSymbol": "SUPRA",
  "services": {
    "database": {
      "status": "✅ connected",
      "latency": "12ms"
    },
    "symbolDetector": {
      "status": "✅ working",
      "detected": [
        {
          "symbol": "SUPRA",
          "id": "supra",
          "confidence": 0.95
        }
      ],
      "cacheSize": 10000,
      "isInitialized": true
    },
    "marketData": {
      "status": "✅ working",
      "requested": ["SUPRA"],
      "found": ["SUPRA"],
      "missing": [],
      "sources": ["coingecko", "dexscreener"],
      "fetchTime": "450ms",
      "rateLimits": {
        "COINGECKO": { "callCount": 5, "remaining": 5 },
        "DEXSCREENER": { "callCount": 10, "remaining": 290 }
      }
    },
    "whaleService": {
      "status": "✅ connected",
      "monitoredChains": ["Ethereum", "Polygon", "Arbitrum"],
      "capabilities": ["Real-time transfer monitoring", "AI fraud detection"]
    },
    "sentimentService": {
      "status": "✅ working",
      "fearGreed": {
        "value": 45,
        "classification": "Fear",
        "trend": "improving"
      }
    },
    "newsService": {
      "status": "✅ working",
      "articlesFound": 5,
      "sentiment": "neutral"
    },
    "aiService": {
      "status": "✅ configured",
      "provider": "grok",
      "healthy": true,
      "latency": "120ms"
    }
  },
  "environment": {
    "NODE_ENV": "production",
    "DATABASE_URL": "✅ configured",
    "XAI_API_KEY": "✅ configured",
    "COINGECKO_API_KEY": "⚠️ free tier (rate limited)",
    "COINGLASS_API_KEY": "⚠️ missing (liquidation data)"
  },
  "recommendations": [
    "Consider upgrading to CoinGecko Pro for better rate limits",
    "Add COINGLASS_API_KEY for liquidation/funding data"
  ],
  "summary": {
    "overall": "✅ ALL SYSTEMS GO",
    "working": "7/7 services"
  }
}
```

---

### Quick Price Test

Quick test to check if a coin returns price data.

**Endpoint:** `GET /api/test/price/:symbol`

**Example:**
```bash
curl https://your-backend/api/test/price/SUPRA
```

**Response:**
```json
{
  "symbol": "SUPRA",
  "detected": [
    {
      "symbol": "SUPRA",
      "id": "supra",
      "confidence": 0.95
    }
  ],
  "price": {
    "symbol": "SUPRA",
    "name": "Supra",
    "price": 0.00118197,
    "changePercent24h": 4.15,
    "volume24h": 1234567,
    "marketCap": 50000000,
    "source": "coingecko",
    "confidence": 0.9
  },
  "sources": ["coingecko"],
  "missing": [],
  "fetchTime": 450
}
```

---

## 🏥 Health & Status

### Health Check

Simple health check for Railway/deployment monitoring.

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "ok": true,
  "service": "coinet-platform",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600,
  "environment": "production",
  "database": {
    "healthy": true,
    "latency": 12,
    "configured": true
  }
}
```

---

### Detailed Status

Get detailed service status and statistics.

**Endpoint:** `GET /api/status`

**Response:**
```json
{
  "status": "operational",
  "service": "coinet-platform",
  "version": "1.0.0",
  "uptime": 3600,
  "environment": "production",
  "database": {
    "connected": true,
    "latency": 12
  },
  "memory": {
    "rss": 125829120,
    "heapTotal": 67108864,
    "heapUsed": 50331648
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 📊 Supported Coins

The platform supports **14,000+ cryptocurrencies** including:

- **Major coins**: BTC, ETH, SOL, XRP, DOGE, ADA, AVAX, LINK, DOT, MATIC
- **New tokens**: SUPRA, PEPE, WIF, GOAT, ai16z, Virtual, Fartcoin
- **DEX tokens**: Any token on Uniswap, PancakeSwap, Raydium, etc.
- **Any CoinGecko-listed coin**: Automatically detected from user messages

---

## 🔄 Rate Limits

### CoinGecko
- **Free tier**: 10-30 requests/minute
- **Pro tier**: 500 requests/minute (with API key)

### DexScreener
- **Free tier**: 300 requests/minute

### Coinglass
- **Free tier**: Check Coinglass documentation
- **Pro tier**: Higher limits with API key

### Internal Services
- **market-prices**: 60 requests/minute
- **alchemy-whales**: Check service documentation

---

## 🚨 Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  },
  "requestId": "req_1234567890_abc123"
}
```

### Common Error Codes

- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid request data
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `SERVICE_UNAVAILABLE` - External service down
- `INTERNAL_SERVER_ERROR` - Server error

---

## 📝 Examples

### Complete Chat Flow

```javascript
// 1. Send initial message
const response1 = await fetch('https://your-backend/api/chat/message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-User-Id': 'user_123'
  },
  body: JSON.stringify({
    message: 'What about $SUPRA?',
    context: {
      includeSources: true,
      includeCharts: true
    }
  })
});

const data1 = await response1.json();
const conversationId = data1.data.conversationId;

// 2. Continue conversation
const response2 = await fetch('https://your-backend/api/chat/message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-User-Id': 'user_123'
  },
  body: JSON.stringify({
    message: 'What about the funding rates?',
    conversationId: conversationId
  })
});

// 3. Get full history
const history = await fetch(
  `https://your-backend/api/chat/history/${conversationId}`,
  {
    headers: {
      'X-User-Id': 'user_123'
    }
  }
);
```

---

## 🔐 Security

- All endpoints require `X-User-Id` header
- User IDs are validated server-side
- Rate limiting is enforced per user
- CORS is configured for allowed origins
- Sensitive data is never logged

---

## 📞 Support

For issues or questions:
1. Check `/api/diagnostic` endpoint for service status
2. Review Railway deployment logs
3. Verify environment variables are set correctly

---

**Last Updated**: January 2024  
**API Version**: 1.0.0

