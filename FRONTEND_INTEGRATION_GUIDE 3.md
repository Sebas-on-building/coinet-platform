# 🎨 COINET V1 - FRONTEND INTEGRATION GUIDE

**Purpose**: Step-by-step guide to connect your frontend to the Coinet V1 backend.

---

## 📋 PREREQUISITES

Before starting, ensure:
- ✅ Railway backend is deployed and healthy (`GET /api/health` returns 200)
- ✅ Backend URL documented (e.g., `https://coinet-platform-production.up.railway.app`)
- ✅ Environment variables configured (at minimum: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`)
- ✅ Frontend framework chosen (Next.js, React, Vue, etc.)

---

## 🚀 QUICK START (5 Minutes)

### Option 1: Using Fetch API (Vanilla JavaScript)

```javascript
// 1. Configure backend URL
const BACKEND_URL = 'https://your-railway-url.railway.app';

// 2. Fetch recent signals
async function getSignals() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/signals?limit=20`);
    const data = await response.json();
    console.log('Signals:', data.signals);
    return data.signals;
  } catch (error) {
    console.error('Error fetching signals:', error);
  }
}

// 3. Connect to WebSocket for real-time updates
const ws = new WebSocket(`wss://${BACKEND_URL.replace('https://', '')}`);

ws.onopen = () => {
  console.log('✅ Connected to Coinet!');
  ws.send(JSON.stringify({ 
    type: 'subscribe', 
    signals: ['whale', 'social', 'breakout'] 
  }));
};

ws.onmessage = (event) => {
  const signal = JSON.parse(event.data);
  console.log('📡 New signal:', signal);
  // Update UI with new signal
  displaySignal(signal);
};

ws.onerror = (error) => {
  console.error('❌ WebSocket error:', error);
};

// 4. Display signal in UI
function displaySignal(signal) {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${signal.severity}`;
  alertDiv.innerHTML = `
    <h3>${signal.signalType.toUpperCase()} Alert</h3>
    <p>${signal.explanation}</p>
    <span class="confidence">Confidence: ${signal.confidence}%</span>
    <span class="action">Suggested: ${signal.suggestedAction}</span>
  `;
  document.getElementById('signals-container').prepend(alertDiv);
}

// 5. Initialize
getSignals();
```

---

### Option 2: Using React (Recommended)

#### Step 1: Install Dependencies
```bash
npm install axios socket.io-client
# or
pnpm add axios socket.io-client
```

#### Step 2: Create API Client (`lib/coinetApi.ts`)
```typescript
import axios from 'axios';

const BACKEND_URL = process.env.NEXT_PUBLIC_COINET_API_URL || 'https://your-railway-url.railway.app';

export const coinetApi = axios.create({
  baseURL: BACKEND_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add JWT token if available
coinetApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('coinet_jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Signal API
export const signalService = {
  getSignals: async (limit = 20, page = 1) => {
    const response = await coinetApi.get(`/api/signals?limit=${limit}&page=${page}`);
    return response.data;
  },

  getSignalById: async (id: string) => {
    const response = await coinetApi.get(`/api/signals/${id}`);
    return response.data;
  },

  // Future: Request AI analysis
  requestAnalysis: async (type: string, data: any) => {
    const response = await coinetApi.post('/api/analyze', { type, data });
    return response.data;
  },
};

// Health check
export const healthCheck = async () => {
  const response = await coinetApi.get('/api/health');
  return response.data;
};
```

#### Step 3: Create WebSocket Hook (`hooks/useCoinetWebSocket.ts`)
```typescript
import { useEffect, useState, useRef } from 'react';

export interface Signal {
  id: string;
  signalType: 'whale' | 'social' | 'breakout';
  severity: 'low' | 'medium' | 'high' | 'critical';
  direction: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  explanation: string;
  suggestedAction: 'buy' | 'sell' | 'watch' | 'exit' | 'avoid';
  timestamp: string;
}

export function useCoinetWebSocket(url: string) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Create WebSocket connection
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ Connected to Coinet WebSocket');
      setIsConnected(true);
      
      // Subscribe to all signal types
      ws.send(JSON.stringify({
        type: 'subscribe',
        signals: ['whale', 'social', 'breakout'],
      }));
    };

    ws.onmessage = (event) => {
      try {
        const signal: Signal = JSON.parse(event.data);
        console.log('📡 New signal:', signal);
        
        // Add signal to state (prepend to show newest first)
        setSignals((prev) => [signal, ...prev].slice(0, 100)); // Keep last 100
      } catch (error) {
        console.error('Error parsing signal:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      setIsConnected(false);
    };

    // Cleanup on unmount
    return () => {
      ws.close();
    };
  }, [url]);

  return { signals, isConnected, ws: wsRef.current };
}
```

#### Step 4: Use in Component (`components/SignalFeed.tsx`)
```typescript
'use client';

import { useEffect, useState } from 'react';
import { signalService } from '@/lib/coinetApi';
import { useCoinetWebSocket, Signal } from '@/hooks/useCoinetWebSocket';

const BACKEND_URL = process.env.NEXT_PUBLIC_COINET_API_URL || 'https://your-railway-url.railway.app';
const WS_URL = BACKEND_URL.replace('https://', 'wss://');

export default function SignalFeed() {
  const [historicalSignals, setHistoricalSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Real-time signals via WebSocket
  const { signals: realtimeSignals, isConnected } = useCoinetWebSocket(WS_URL);

  // Fetch historical signals on mount
  useEffect(() => {
    async function loadSignals() {
      try {
        const data = await signalService.getSignals(50, 1);
        setHistoricalSignals(data.signals || []);
      } catch (error) {
        console.error('Error loading signals:', error);
      } finally {
        setLoading(false);
      }
    }
    loadSignals();
  }, []);

  // Combine historical + real-time signals
  const allSignals = [...realtimeSignals, ...historicalSignals];

  return (
    <div className="signal-feed">
      {/* Connection Status */}
      <div className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
        {isConnected ? '🟢 Live' : '🔴 Offline'}
      </div>

      {/* Loading State */}
      {loading && <div>Loading signals...</div>}

      {/* Signals List */}
      <div className="signals-list">
        {allSignals.length === 0 && !loading && (
          <p>No signals yet. Waiting for market activity...</p>
        )}

        {allSignals.map((signal) => (
          <SignalCard key={signal.id} signal={signal} />
        ))}
      </div>
    </div>
  );
}

// Signal Card Component
function SignalCard({ signal }: { signal: Signal }) {
  const severityColors = {
    critical: 'bg-red-600',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500',
  };

  const directionIcons = {
    bullish: '📈',
    bearish: '📉',
    neutral: '➡️',
  };

  return (
    <div className={`signal-card border-l-4 ${severityColors[signal.severity]} p-4 mb-4 bg-gray-800 rounded-lg`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold text-white">
          {signal.signalType.toUpperCase()} {directionIcons[signal.direction]}
        </h3>
        <span className={`px-2 py-1 rounded text-xs ${severityColors[signal.severity]} text-white`}>
          {signal.severity}
        </span>
      </div>

      {/* Explanation */}
      <p className="text-gray-300 mb-3">{signal.explanation}</p>

      {/* Footer */}
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-400">
          Confidence: <strong className="text-white">{signal.confidence}%</strong>
        </span>
        <span className="px-3 py-1 bg-purple-600 text-white rounded">
          {signal.suggestedAction.toUpperCase()}
        </span>
        <span className="text-gray-500">
          {new Date(signal.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
```

#### Step 5: Add to Page (`app/page.tsx`)
```typescript
import SignalFeed from '@/components/SignalFeed';

export default function HomePage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-bold mb-8">Coinet AI - Signal Intelligence</h1>
      <SignalFeed />
    </div>
  );
}
```

#### Step 6: Configure Environment Variable
Create `.env.local`:
```bash
NEXT_PUBLIC_COINET_API_URL=https://your-railway-url.railway.app
```

---

## 🔐 AUTHENTICATION (Optional but Recommended)

### Step 1: Login Flow
```typescript
// Login API
export const authService = {
  login: async (email: string, password: string) => {
    const response = await coinetApi.post('/api/auth/login', { email, password });
    const { token, user } = response.data;
    
    // Store JWT token
    localStorage.setItem('coinet_jwt_token', token);
    localStorage.setItem('coinet_user', JSON.stringify(user));
    
    return { token, user };
  },

  logout: () => {
    localStorage.removeItem('coinet_jwt_token');
    localStorage.removeItem('coinet_user');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('coinet_user');
    return userStr ? JSON.parse(userStr) : null;
  },
};
```

### Step 2: Protected Route
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/coinetApi';

export default function ProtectedPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      router.push('/login');
    } else {
      setUser(currentUser);
    }
  }, [router]);

  if (!user) return <div>Loading...</div>;

  return <div>Welcome, {user.name}!</div>;
}
```

---

## 📊 ADVANCED: AI ANALYSIS INTEGRATION

### Request AI Analysis
```typescript
async function analyzeNewToken(tokenAddress: string) {
  try {
    const analysis = await coinetApi.post('/api/analyze', {
      type: 'new_token',
      data: {
        tokenAddress,
        chainId: 1, // Ethereum mainnet
      },
    });

    console.log('AI Analysis:', analysis.data);
    /*
    Expected response:
    {
      summary: "Token appears to be a legitimate DeFi project...",
      risks: ["Low liquidity", "New project (< 30 days)"],
      opportunities: ["Strong community growth", "Audited smart contract"],
      sentiment: "cautiously_optimistic",
      confidence: 75,
      reasoning: [
        "Step 1: Analyzed smart contract code...",
        "Step 2: Checked liquidity on Uniswap...",
        "Step 3: Reviewed social sentiment..."
      ]
    }
    */
    
    return analysis.data;
  } catch (error) {
    console.error('Error requesting AI analysis:', error);
  }
}
```

### Display AI Analysis
```typescript
function AIAnalysisPanel({ tokenAddress }: { tokenAddress: string }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    setLoading(true);
    const result = await analyzeNewToken(tokenAddress);
    setAnalysis(result);
    setLoading(false);
  };

  return (
    <div className="ai-analysis-panel">
      <button onClick={analyze} disabled={loading}>
        {loading ? 'Analyzing...' : 'Request AI Analysis'}
      </button>

      {analysis && (
        <div className="analysis-result">
          <h3>AI Analysis</h3>
          <p><strong>Summary:</strong> {analysis.summary}</p>
          <p><strong>Sentiment:</strong> {analysis.sentiment}</p>
          <p><strong>Confidence:</strong> {analysis.confidence}%</p>
          
          <h4>Risks</h4>
          <ul>{analysis.risks.map((risk, i) => <li key={i}>{risk}</li>)}</ul>
          
          <h4>Opportunities</h4>
          <ul>{analysis.opportunities.map((opp, i) => <li key={i}>{opp}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
```

---

## 🎨 UI/UX BEST PRACTICES

### 1. Signal Severity Color Coding
```css
.signal-critical { border-left: 4px solid #dc2626; } /* Red */
.signal-high { border-left: 4px solid #f97316; }     /* Orange */
.signal-medium { border-left: 4px solid #eab308; }   /* Yellow */
.signal-low { border-left: 4px solid #3b82f6; }      /* Blue */
```

### 2. Real-Time Animations
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.signal-new {
  animation: pulse 1s ease-in-out 3;
  box-shadow: 0 0 20px rgba(168, 85, 247, 0.5);
}
```

### 3. Connection Status Indicator
```typescript
function ConnectionStatus({ isConnected }: { isConnected: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
      {isConnected ? 'Live' : 'Reconnecting...'}
    </div>
  );
}
```

### 4. Suggested Action Buttons
```typescript
function ActionButton({ action, signal }: { action: string; signal: Signal }) {
  const handleAction = () => {
    // Execute trading action (e.g., open trade modal)
    console.log(`Action: ${action} for signal`, signal);
  };

  const actionColors = {
    buy: 'bg-green-600 hover:bg-green-700',
    sell: 'bg-red-600 hover:bg-red-700',
    watch: 'bg-blue-600 hover:bg-blue-700',
    exit: 'bg-orange-600 hover:bg-orange-700',
  };

  return (
    <button 
      onClick={handleAction}
      className={`px-4 py-2 rounded ${actionColors[action]} text-white transition`}
    >
      {action.toUpperCase()}
    </button>
  );
}
```

---

## 🧪 TESTING YOUR INTEGRATION

### 1. Test REST API
```bash
# Test from terminal
curl https://your-railway-url.railway.app/api/health
curl https://your-railway-url.railway.app/api/signals?limit=5
```

### 2. Test WebSocket (Browser Console)
```javascript
const ws = new WebSocket('wss://your-railway-url.railway.app');
ws.onopen = () => console.log('Connected!');
ws.onmessage = (e) => console.log('Message:', e.data);
ws.send(JSON.stringify({ type: 'subscribe', signals: ['whale', 'social', 'breakout'] }));
```

### 3. Test Signal Display
1. Open frontend app
2. Check browser DevTools → Network tab
3. Verify REST API call to `/api/signals` (Status: 200)
4. Verify WebSocket connection (WS tab shows "101 Switching Protocols")
5. Wait 5-10 minutes for first real-time signal

### 4. Test Error Handling
1. Temporarily stop Railway backend
2. Verify frontend shows "Offline" status
3. Verify graceful error messages (not crashes)
4. Restart backend, verify frontend reconnects automatically

---

## 🚨 TROUBLESHOOTING

### Issue: CORS Error in Browser Console
**Error**: `Access to fetch at 'https://...' from origin 'http://localhost:3000' has been blocked by CORS policy`

**Fix**: Add your frontend domain to CORS whitelist in `services/frontend-api/src/index.ts`:
```typescript
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-frontend-domain.com'],
  credentials: true,
}));
```

Redeploy backend to Railway.

---

### Issue: WebSocket Connection Refused
**Error**: `WebSocket connection failed: Error during WebSocket handshake`

**Fix**: 
1. Use `wss://` (secure), not `ws://`
2. Verify Railway URL is correct (no trailing slash)
3. Check Railway logs for WebSocket errors

---

### Issue: No Signals Appearing
**Possible Causes**:
1. **Backend just started**: Wait 5-10 minutes for first signals
2. **API keys missing**: Check Railway env vars (`ETHERSCAN_API_KEY`, etc.)
3. **Low market activity**: Try during high-volatility hours

**Debug**:
```javascript
// Check if API returns empty array or error
fetch('https://your-railway-url.railway.app/api/signals')
  .then(r => r.json())
  .then(data => console.log('Signals:', data))
  .catch(err => console.error('Error:', err));
```

---

### Issue: JWT Authentication Fails
**Error**: `401 Unauthorized` on API calls

**Fix**:
1. Verify `JWT_SECRET` is set in Railway env vars
2. Check token format in `Authorization` header: `Bearer <token>`
3. Check token expiration (tokens expire after X hours)

---

## 📚 API REFERENCE

### REST Endpoints

#### `GET /api/health`
**Description**: Check backend health status

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-27T12:34:56.789Z",
  "components": { ... },
  "metrics": { ... }
}
```

---

#### `GET /api/signals?limit=20&page=1`
**Description**: Fetch paginated signals

**Query Parameters**:
- `limit` (optional): Number of signals per page (default: 20, max: 100)
- `page` (optional): Page number (default: 1)
- `type` (optional): Filter by type (`whale`, `social`, `breakout`)
- `severity` (optional): Filter by severity (`critical`, `high`, `medium`, `low`)

**Response**:
```json
{
  "signals": [{ ... }],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

---

#### `GET /api/signals/:id`
**Description**: Get specific signal by ID

**Response**:
```json
{
  "id": "whale-0x1234...",
  "signalType": "whale",
  "severity": "high",
  ...
}
```

---

#### `POST /api/analyze`
**Description**: Request AI analysis

**Request Body**:
```json
{
  "type": "new_token",
  "data": {
    "tokenAddress": "0x...",
    "chainId": 1
  }
}
```

**Response**:
```json
{
  "summary": "...",
  "sentiment": "bullish",
  "confidence": 85,
  ...
}
```

---

### WebSocket Protocol

#### Client → Server (Subscribe)
```json
{
  "type": "subscribe",
  "signals": ["whale", "social", "breakout"]
}
```

#### Server → Client (Signal Update)
```json
{
  "id": "whale-0x1234...",
  "signalType": "whale",
  "severity": "high",
  "direction": "bullish",
  "confidence": 85,
  "explanation": "...",
  "suggestedAction": "buy",
  "timestamp": "2025-10-27T12:34:56.789Z"
}
```

#### Client → Server (Unsubscribe)
```json
{
  "type": "unsubscribe",
  "signals": ["social"]
}
```

---

## 🎯 NEXT STEPS

### Immediate (1-2 Hours)
1. ✅ Connect frontend to REST API
2. ✅ Connect frontend to WebSocket
3. ✅ Test signal display in UI
4. ✅ Verify real-time updates work

### Short-Term (1 Week)
1. Add user authentication (JWT)
2. Implement signal filtering (by type, severity)
3. Add AI analysis request flow
4. Create settings page (notification preferences)
5. Add portfolio tracking (if applicable)

### Long-Term (1 Month)
1. Add advanced charting (TradingView integration)
2. Implement backtesting UI
3. Add mobile responsiveness
4. Create onboarding flow for new users
5. Launch beta to select users

---

**Built with ❤️ by the Coinet AI Team**  
**Last Updated**: October 27, 2025  
**Backend API**: https://your-railway-url.railway.app  
**Frontend Example**: https://github.com/Sebas-on-building/coinet-frontend (coming soon)

