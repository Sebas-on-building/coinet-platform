# 🚀 Full Stack Integration Guide

**Coinet Platform - Frontend + Backend Integration**

---

## 📋 Quick Start

### 1. Start Backend Server

```bash
cd apps/coinet-platform

# Install dependencies
pnpm install

# Generate Prisma client (optional - can skip if no DATABASE_URL)
pnpm db:generate

# Build TypeScript
pnpm build

# Start server
pnpm start
```

**Backend runs on**: `http://localhost:3000`

### 2. Start Frontend

```bash
cd apps/client-web

# Install dependencies
pnpm install

# Create .env file
echo "VITE_API_URL=http://localhost:3000" > .env

# Start dev server
pnpm dev
```

**Frontend runs on**: `http://localhost:8080`

### 3. Test Integration

1. Open `http://localhost:8080` in browser
2. Send a chat message
3. Check browser Network tab - should see API call to `http://localhost:3000/api/chat/message`
4. Message should appear with real response from backend

---

## 🔗 Integration Points

### Chat Interface ✅

**Frontend**: `apps/client-web/src/components/ChatInterface.tsx`
**Backend**: `apps/coinet-platform/src/api/chat/`

**Flow**:
1. User types message → Frontend
2. Frontend calls `apiClient.sendChatMessage()`
3. Backend processes through `ChatService`
4. Backend calls AI service (if configured)
5. Response with sources/charts returned
6. Frontend displays message

### Current API Calls

| Frontend Action | Backend Endpoint | Status |
|----------------|------------------|--------|
| Send message | `POST /api/chat/message` | ✅ Working |
| Load history | `GET /api/chat/history/:id` | ✅ Working |
| Regenerate | `POST /api/chat/regenerate` | ✅ Working |
| Delete message | `DELETE /api/chat/message/:id` | ✅ Working |

---

## 🔧 Configuration

### Backend CORS

**File**: `apps/coinet-platform/src/index.ts`

Already configured to allow:
- `http://localhost:8080` (Vite frontend)
- `http://localhost:5173` (Vite alternative port)
- `http://localhost:3000` (Same origin)

### Frontend API URL

**File**: `apps/client-web/src/services/api-client.ts`

Uses `VITE_API_URL` environment variable:
- Default: `http://localhost:3000`
- Set via `.env` file: `VITE_API_URL=http://localhost:3000`

### User ID Management

Frontend automatically:
- Generates user ID on first use
- Stores in `localStorage` as `coinet_user_id`
- Sends in `X-User-Id` header to backend

---

## 📊 Data Flow

### Chat Message Flow

```
User Input (Frontend)
    ↓
apiClient.sendChatMessage()
    ↓
POST /api/chat/message
    ↓
ChatController.sendMessage()
    ↓
ChatService.sendMessage()
    ↓
AIService.analyze() [if AI_SERVICE_URL configured]
    ↓
Store in Database [if DATABASE_URL configured]
    ↓
Return Response
    ↓
Frontend displays message
```

---

## 🐛 Troubleshooting

### CORS Errors

**Symptom**: Browser shows CORS error

**Fix**: 
1. Check backend is running on port 3000
2. Check `ALLOWED_ORIGINS` in backend `.env`
3. Restart backend after changing `.env`

### 404 Not Found

**Symptom**: API calls return 404

**Fix**:
1. Verify backend is running: `curl http://localhost:3000/api/health`
2. Check `VITE_API_URL` in frontend `.env`
3. Check backend routes are registered

### Connection Refused

**Symptom**: Network error, connection refused

**Fix**:
1. Start backend first: `cd apps/coinet-platform && pnpm start`
2. Verify it's listening: `curl http://localhost:3000/api/health`
3. Check for port conflicts

---

## ✅ Success Criteria

Integration is successful when:

- [x] Frontend loads without errors
- [x] Chat interface displays
- [x] Sending message calls backend API
- [x] Response appears with sources
- [x] Charts detected and displayed
- [x] No CORS errors in browser console
- [x] Network tab shows successful API calls

---

## 🔄 Next Steps

### Phase 2: Complete Remaining Integrations

1. **Agent Builder** → Connect to `/api/agents/parse-nl`
2. **Semantic Alerts** → Connect to `/api/alerts/parse-semantic`
3. **Insights Panel** → Connect to `/api/insights`
4. **Voice Interface** → Connect to voice endpoints

### Phase 3: Enhancements

1. SSE Streaming for real-time responses
2. WebSocket for live updates
3. Authentication integration
4. Error handling improvements

---

**Full Stack Integration Complete!** 🎉

Frontend and backend are now connected and working together!

