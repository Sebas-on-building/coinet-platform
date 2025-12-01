# 🚀 Coinet AI Implementation Roadmap

**Goal**: Build world-class AI backend that outperforms competitors by 10,000%  
**Timeline**: 8-12 weeks  
**Priority**: Chat API → Agents → Alerts → Insights → Polish

---

## 🎯 Phase 1: Foundation & Chat System (Week 1-2)

### Week 1: Database & Infrastructure

#### 1.1 Database Setup
**File**: `apps/coinet-platform/prisma/schema.prisma`

```prisma
// Core schema for AI features
model Conversation {
  id        String   @id @default(cuid())
  userId    String
  messages  Message[]
  context   Json?    // Conversation context
  agentId   String?  // Active agent
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id])
  role           String       // "user" | "assistant"
  content        String
  sources        Json?       // Array of sources
  charts         Json?       // Chart configurations
  confidence     Float?
  createdAt      DateTime    @default(now())
}

model Agent {
  id           String   @id @default(cuid())
  userId       String
  name         String
  description  String
  personality  String
  systemPrompt String
  triggers     Json     // Array of triggers
  strategies   Json     // Array of strategies
  dataSources  Json     // Array of data sources
  tags         String[]
  color        String
  enabled      Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Alert {
  id          String   @id @default(cuid())
  userId      String
  name        String
  type        String   // "price" | "technical" | "sentiment" | etc.
  trigger     Json     // Trigger configuration
  actions     Json     // Alert actions
  priority    String   // "low" | "medium" | "high" | "critical"
  enabled     Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Insight {
  id          String   @id @default(cuid())
  type        String
  title       String
  description String
  confidence  Float
  severity    String
  metadata    Json
  expiresAt   DateTime?
  createdAt   DateTime @default(now())
}
```

**Actions**:
- [ ] Install Prisma: `pnpm add -D prisma @prisma/client`
- [ ] Create schema file
- [ ] Run migrations: `pnpm prisma migrate dev`
- [ ] Generate client: `pnpm prisma generate`

#### 1.2 Service Integration Layer
**File**: `apps/coinet-platform/src/services/ai-service.ts`

```typescript
import axios from 'axios';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:3001';

export class AIService {
  async analyze(input: {
    content: string;
    type: 'ticker' | 'url' | 'thread' | 'question' | 'news';
    context?: {
      conversationId?: string;
      agentId?: string;
      analysisDepth?: 'quick' | 'standard' | 'deep';
    };
  }) {
    const response = await axios.post(`${AI_SERVICE_URL}/api/v1/analyze`, input);
    return response.data;
  }

  async stream(input: {
    content: string;
    conversationId?: string;
  }): Promise<ReadableStream> {
    // SSE streaming implementation
    const eventSource = new EventSource(
      `${AI_SERVICE_URL}/api/v1/analyze/stream`,
      {
        method: 'POST',
        body: JSON.stringify(input)
      }
    );
    return eventSource;
  }
}
```

**Actions**:
- [ ] Install axios: `pnpm add axios`
- [ ] Create service wrapper classes
- [ ] Add environment variables

### Week 2: Chat API Implementation

#### 2.1 Chat Routes
**File**: `apps/coinet-platform/src/api/chat/routes.ts`

```typescript
import express from 'express';
import { ChatController } from './controller';
import { ChatService } from './service';
import { authMiddleware } from '../../middleware/auth';

const router = express.Router();
const chatService = new ChatService();
const chatController = new ChatController(chatService);

// POST /api/chat/message
router.post('/message', authMiddleware, chatController.sendMessage);

// POST /api/chat/stream (SSE)
router.get('/stream', authMiddleware, chatController.streamMessage);

// POST /api/chat/regenerate
router.post('/regenerate', authMiddleware, chatController.regenerate);

// GET /api/chat/history
router.get('/history', authMiddleware, chatController.getHistory);

// DELETE /api/chat/message/:id
router.delete('/message/:id', authMiddleware, chatController.deleteMessage);

export default router;
```

#### 2.2 Chat Service
**File**: `apps/coinet-platform/src/api/chat/service.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { AIService } from '../../services/ai-service';
import { ChartDetector } from './chart-detector';
import { SourceManager } from './source-manager';

const prisma = new PrismaClient();

export class ChatService {
  private aiService: AIService;
  private chartDetector: ChartDetector;
  private sourceManager: SourceManager;

  constructor() {
    this.aiService = new AIService();
    this.chartDetector = new ChartDetector();
    this.sourceManager = new SourceManager();
  }

  async sendMessage(userId: string, message: string, conversationId?: string) {
    // 1. Get or create conversation
    let conversation = conversationId
      ? await prisma.conversation.findUnique({ where: { id: conversationId } })
      : null;

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { userId }
      });
    }

    // 2. Store user message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message
      }
    });

    // 3. Detect chart requests
    const chartConfig = this.chartDetector.detect(message);

    // 4. Get conversation context
    const context = await this.getConversationContext(conversation.id);

    // 5. Call AI service
    const aiResponse = await this.aiService.analyze({
      content: message,
      type: 'question',
      context: {
        conversationId: conversation.id,
        analysisDepth: 'standard'
      }
    });

    // 6. Enhance with sources
    const sources = await this.sourceManager.getSources(
      aiResponse.data.symbol || 'BTC',
      aiResponse.data.keyTopics || []
    );

    // 7. Store assistant message
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: aiResponse.data.thesis || aiResponse.data.summary,
        sources: sources,
        charts: chartConfig,
        confidence: aiResponse.data.confidence
      }
    });

    return {
      message: assistantMessage,
      conversationId: conversation.id,
      sources,
      charts: chartConfig
    };
  }

  async streamMessage(userId: string, message: string) {
    // SSE streaming implementation
    // Similar to sendMessage but with streaming
  }

  private async getConversationContext(conversationId: string) {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 10 // Last 10 messages
    });

    return messages.map(m => ({
      role: m.role,
      content: m.content
    }));
  }
}
```

#### 2.3 Chart Detector
**File**: `apps/coinet-platform/src/api/chat/chart-detector.ts`

```typescript
export class ChartDetector {
  detect(text: string): ChartConfig | null {
    const chartKeywords = /chart|price|analysis|trading|bitcoin|ethereum|market/i;
    if (!chartKeywords.test(text)) return null;

    // Extract symbol
    const symbolMatch = text.match(/\b(bitcoin|btc|ethereum|eth|solana|sol|cardano|ada)\b/i);
    const symbol = symbolMatch ? this.normalizeSymbol(symbolMatch[0]) : 'BTC';

    // Extract interval
    const intervalMatch = text.match(/(daily|weekly|4h|1h|monthly)/i);
    const interval = intervalMatch ? this.parseInterval(intervalMatch[0]) : 'D';

    return {
      symbol,
      interval,
      timeframe: '1M' // Default
    };
  }

  private normalizeSymbol(text: string): string {
    const map: Record<string, string> = {
      'bitcoin': 'BTC',
      'btc': 'BTC',
      'ethereum': 'ETH',
      'eth': 'ETH',
      'solana': 'SOL',
      'sol': 'SOL'
    };
    return map[text.toLowerCase()] || 'BTC';
  }

  private parseInterval(text: string): string {
    const map: Record<string, string> = {
      'daily': 'D',
      'weekly': 'W',
      'monthly': 'M',
      '4h': '240',
      '1h': '60'
    };
    return map[text.toLowerCase()] || 'D';
  }
}
```

**Actions for Week 2**:
- [ ] Implement chat routes
- [ ] Create chat service
- [ ] Implement chart detector
- [ ] Add source manager
- [ ] Test chat endpoints
- [ ] Add error handling

---

## 🎯 Phase 2: Agent System (Week 3-4)

### Week 3: Agent Creation API

#### 3.1 Agent Routes
**File**: `apps/coinet-platform/src/api/agents/routes.ts`

```typescript
import express from 'express';
import { AgentController } from './controller';
import { authMiddleware } from '../../middleware/auth';

const router = express.Router();

// POST /api/agents/parse-nl
router.post('/parse-nl', authMiddleware, AgentController.parseNaturalLanguage);

// POST /api/agents/create
router.post('/create', authMiddleware, AgentController.create);

// PUT /api/agents/:id
router.put('/:id', authMiddleware, AgentController.update);

// DELETE /api/agents/:id
router.delete('/:id', authMiddleware, AgentController.delete);

// GET /api/agents
router.get('/', authMiddleware, AgentController.list);

// GET /api/agents/:id/performance
router.get('/:id/performance', authMiddleware, AgentController.getPerformance);

// POST /api/agents/:id/backtest
router.post('/:id/backtest', authMiddleware, AgentController.backtest);

export default router;
```

#### 3.2 NL Parser Integration
**File**: `apps/coinet-platform/src/services/nlp-service.ts`

```typescript
import axios from 'axios';

const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL || 'http://localhost:3002';

export class NLPService {
  async parseAgent(description: string, context?: any) {
    const response = await axios.post(`${NLP_SERVICE_URL}/parse-agent`, {
      description,
      context
    });
    return response.data;
  }

  async refineAgent(original: any, feedback: string) {
    const response = await axios.post(`${NLP_SERVICE_URL}/refine-agent`, {
      original,
      feedback
    });
    return response.data;
  }
}
```

#### 3.3 Agent Service
**File**: `apps/coinet-platform/src/api/agents/service.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { NLPService } from '../../services/nlp-service';

const prisma = new PrismaClient();

export class AgentService {
  private nlpService: NLPService;

  constructor() {
    this.nlpService = new NLPService();
  }

  async parseNaturalLanguage(userId: string, description: string) {
    // Call NLP service
    const parsed = await this.nlpService.parseAgent(description, {
      userId,
      existingAgents: await this.getUserAgents(userId)
    });

    return parsed;
  }

  async createAgent(userId: string, agentData: any) {
    const agent = await prisma.agent.create({
      data: {
        userId,
        ...agentData
      }
    });

    return agent;
  }

  async getUserAgents(userId: string) {
    return prisma.agent.findMany({
      where: { userId, enabled: true }
    });
  }
}
```

**Actions for Week 3-4**:
- [ ] Implement agent routes
- [ ] Create NLP service integration
- [ ] Implement agent storage
- [ ] Add validation
- [ ] Test agent creation

---

## 🎯 Phase 3: Alert System (Week 5-6)

### Week 5: Semantic Alert Parser

#### 5.1 Alert Routes
**File**: `apps/coinet-platform/src/api/alerts/routes.ts`

```typescript
import express from 'express';
import { AlertController } from './controller';
import { authMiddleware } from '../../middleware/auth';

const router = express.Router();

// POST /api/alerts/parse-semantic
router.post('/parse-semantic', authMiddleware, AlertController.parseSemantic);

// POST /api/alerts/create
router.post('/create', authMiddleware, AlertController.create);

// GET /api/alerts
router.get('/', authMiddleware, AlertController.list);

// PUT /api/alerts/:id
router.put('/:id', authMiddleware, AlertController.update);

// DELETE /api/alerts/:id
router.delete('/:id', authMiddleware, AlertController.delete);

// POST /api/alerts/:id/test
router.post('/:id/test', authMiddleware, AlertController.test);

export default router;
```

#### 5.2 Semantic Parser
**File**: `apps/coinet-platform/src/api/alerts/semantic-parser.ts`

```typescript
export class SemanticAlertParser {
  parse(query: string): ParsedAlert {
    // Extract asset
    const asset = this.extractAsset(query);
    
    // Extract price conditions
    const priceCondition = this.extractPriceCondition(query);
    
    // Extract technical indicators
    const technicalCondition = this.extractTechnicalCondition(query);
    
    // Extract sentiment
    const sentimentCondition = this.extractSentimentCondition(query);

    return {
      name: this.generateName(query),
      type: this.determineType(priceCondition, technicalCondition, sentimentCondition),
      trigger: {
        conditions: [
          asset,
          priceCondition,
          technicalCondition,
          sentimentCondition
        ].filter(Boolean),
        logicalOperator: 'AND'
      },
      confidence: this.calculateConfidence(query)
    };
  }

  private extractAsset(text: string): string | null {
    const match = text.match(/\b(bitcoin|btc|ethereum|eth|solana|sol)\b/i);
    return match ? this.normalizeSymbol(match[0]) : null;
  }

  private extractPriceCondition(text: string): PriceCondition | null {
    const pricePattern = /(?:price|cost).*(?:goes|drops|rises|above|below|over|under).*\$?(\d+(?:,\d{3})*(?:\.\d+)?)/i;
    const match = text.match(pricePattern);
    
    if (!match) return null;

    const price = parseFloat(match[1].replace(/,/g, ''));
    const operator = /above|over|rises/.test(text) ? 'gt' : 'lt';

    return {
      field: 'price',
      operator,
      value: price
    };
  }

  private extractTechnicalCondition(text: string): TechnicalCondition | null {
    // RSI
    const rsiMatch = text.match(/rsi\s*(?:below|under|above|over)\s*(\d+)/i);
    if (rsiMatch) {
      return {
        field: 'rsi',
        operator: /below|under/.test(text) ? 'lt' : 'gt',
        value: parseInt(rsiMatch[1])
      };
    }

    // Volume
    const volumeMatch = text.match(/volume\s*(?:spike|increase|decrease)/i);
    if (volumeMatch) {
      return {
        field: 'volume_change_24h',
        operator: /spike|increase/.test(text) ? 'gt' : 'lt',
        value: 100 // percentage
      };
    }

    return null;
  }

  private extractSentimentCondition(text: string): SentimentCondition | null {
    if (/fud|negative|bearish/i.test(text)) {
      return {
        field: 'sentiment_score',
        operator: 'lt',
        value: -0.5
      };
    }

    if (/bullish|positive/i.test(text)) {
      return {
        field: 'sentiment_score',
        operator: 'gt',
        value: 0.5
      };
    }

    return null;
  }

  private normalizeSymbol(text: string): string {
    const map: Record<string, string> = {
      'bitcoin': 'BTC',
      'btc': 'BTC',
      'ethereum': 'ETH',
      'eth': 'ETH',
      'solana': 'SOL',
      'sol': 'SOL'
    };
    return map[text.toLowerCase()] || 'BTC';
  }
}
```

**Actions for Week 5-6**:
- [ ] Implement alert routes
- [ ] Create semantic parser
- [ ] Integrate with evaluate-alert-conditions service
- [ ] Add alert storage
- [ ] Test alert creation

---

## 🎯 Phase 4: Insights & Integration (Week 7-8)

### Week 7: Insights API

#### 7.1 Insights Service Integration
**File**: `apps/coinet-platform/src/services/insights-service.ts`

```typescript
import axios from 'axios';

const INSIGHTS_SERVICE_URL = process.env.INSIGHTS_SERVICE_URL || 'http://localhost:3003';

export class InsightsService {
  async getInsights(filters?: any) {
    const response = await axios.get(`${INSIGHTS_SERVICE_URL}/insights`, {
      params: filters
    });
    return response.data;
  }

  async getMarketIndicators() {
    const response = await axios.get(`${INSIGHTS_SERVICE_URL}/market-indicators`);
    return response.data;
  }
}
```

#### 7.2 WebSocket Setup
**File**: `apps/coinet-platform/src/websocket/server.ts`

```typescript
import { WebSocketServer } from 'ws';
import { Server } from 'http';

export class WebSocketManager {
  private wss: WebSocketServer;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.setupHandlers();
  }

  private setupHandlers() {
    this.wss.on('connection', (ws, req) => {
      // Authenticate connection
      const userId = this.authenticate(req);
      if (!userId) {
        ws.close(1008, 'Unauthorized');
        return;
      }

      ws.on('message', (message) => {
        const data = JSON.parse(message.toString());
        this.handleMessage(ws, userId, data);
      });

      // Subscribe to channels
      ws.on('subscribe', (channels: string[]) => {
        channels.forEach(channel => {
          this.subscribe(userId, channel, ws);
        });
      });
    });
  }

  broadcast(channel: string, data: any) {
    this.wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ channel, data }));
      }
    });
  }
}
```

**Actions for Week 7-8**:
- [ ] Integrate insights service
- [ ] Set up WebSocket server
- [ ] Implement real-time streams
- [ ] Add market indicators endpoint
- [ ] Test streaming

---

## 🎯 Phase 5: Deployment & Polish (Week 9-10)

### Week 9: Railway Deployment

#### 9.1 Multi-Service Railway Setup

**File**: `railway.json` (update)
```json
{
  "build": {
    "builder": "dockerfile",
    "dockerfilePath": "railway.dockerfile"
  },
  "deploy": {
    "startCommand": "node dist/index.js",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "on_failure",
    "restartPolicyMaxRetries": 3
  },
  "services": [
    {
      "name": "coinet-platform",
      "dockerfile": "railway.dockerfile"
    },
    {
      "name": "coinet-ai",
      "dockerfile": "services/coinet-ai/Dockerfile.production"
    },
    {
      "name": "parse-natural-language",
      "dockerfile": "services/parse-natural-language/Dockerfile"
    },
    {
      "name": "generate-ai-insights",
      "dockerfile": "services/generate-ai-insights/Dockerfile"
    },
    {
      "name": "api-gateway",
      "dockerfile": "services/api-gateway/Dockerfile.production"
    }
  ]
}
```

#### 9.2 Environment Variables
```bash
# Railway Environment Variables
DATABASE_URL=
REDIS_URL=
AI_SERVICE_URL=http://coinet-ai:3001
NLP_SERVICE_URL=http://parse-natural-language:3002
INSIGHTS_SERVICE_URL=http://generate-ai-insights:3003
OPENAI_API_KEY=
GOOGLE_AI_API_KEY=
```

**Actions for Week 9-10**:
- [ ] Update Railway configuration
- [ ] Set up service discovery
- [ ] Configure environment variables
- [ ] Deploy all services
- [ ] Test end-to-end
- [ ] Monitor performance

---

## 📝 Implementation Checklist

### Phase 1 (Week 1-2)
- [ ] Database schema and migrations
- [ ] Prisma client setup
- [ ] Chat routes and controllers
- [ ] Chat service implementation
- [ ] Chart detector
- [ ] Source manager
- [ ] SSE streaming
- [ ] Integration with coinet-ai

### Phase 2 (Week 2-3)
- [ ] Agent routes and controllers
- [ ] Agent service
- [ ] NLP service integration
- [ ] Agent storage
- [ ] Agent CRUD operations

### Phase 3 (Week 4)
- [ ] Agent refinement
- [ ] Performance tracking
- [ ] Backtesting (basic)

### Phase 4 (Week 5-6)
- [ ] Alert routes and controllers
- [ ] Semantic parser
- [ ] Alert storage
- [ ] Alert evaluation integration
- [ ] Voice interface (basic)

### Phase 5 (Week 7-8)
- [ ] Insights API
- [ ] WebSocket server
- [ ] Real-time streams
- [ ] Market indicators

### Phase 6 (Week 9-10)
- [ ] Railway multi-service setup
- [ ] Service discovery
- [ ] Environment configuration
- [ ] Monitoring & logging
- [ ] Documentation

---

## 🎯 Success Metrics

### Performance Targets
- [ ] Chat response time: <2s (95th percentile)
- [ ] Agent creation: <3s
- [ ] Alert parsing: <1.5s
- [ ] Insights generation: <1s
- [ ] WebSocket latency: <100ms

### Quality Targets
- [ ] NLP accuracy: 95%+
- [ ] Source citation relevance: 90%+
- [ ] Alert parsing confidence: 85%+
- [ ] Chat satisfaction: 90%+
- [ ] Uptime: 99.9%+

---

**Ready to Start**: Begin with Phase 1, Week 1 tasks!

