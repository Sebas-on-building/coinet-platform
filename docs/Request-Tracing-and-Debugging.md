# Request Tracing, Debugging, and Extension in Coinet

## 1. Tracing with requestId
- Every request is assigned a unique `requestId` (correlation ID) at the API gateway.
- Propagated via `X-Request-ID` header to all downstream services.
- All logs and metrics include `requestId`.
- **Example:**
```js
// In Express middleware
function correlationIdMiddleware(req, res, next) {
  req.requestId = req.headers['x-request-id'] || generateRequestId();
  res.setHeader('X-Request-ID', req.requestId);
  next();
}
```

## 2. End-to-End Trace Across Services
- Use `requestId` to search logs in ELK/Signoz/Splunk.
- **Example Query:**
```json
{
  "query": { "match": { "requestId": "abc123xyz" } }
}
```
- Grafana panel: search bar for requestId, waterfall/trace view.

## 3. Debugging Flows
- Filter logs by `requestId` to see all actions for a user/session.
- Trace errors, performance, and business events.
- **Example:**
```json
{
  "query": { "bool": { "must": [
    { "match": { "requestId": "abc123xyz" } },
    { "match": { "level": "ERROR" } }
  ]}}
}
```

## 4. Extending Tracing
- Add `requestId` to any new service, log, or metric.
- **Example:**
```js
logger.info('Portfolio updated', { requestId, userId, ... });
```
- Add to custom metrics as label if needed.

## 5. Example Queries
- Find all requests for a user:
```json
{
  "query": { "match": { "userId": "user-42" } }
}
```
- Find all failed notifications for a request:
```json
{
  "query": { "bool": { "must": [
    { "match": { "requestId": "abc123xyz" } },
    { "match": { "error": "NotificationFailure" } }
  ]}}
}
```

## 6. UI/UX for Trace Search and Visualization
- **Design:**
  - Apple/Canva/TradingView/Solana fusion.
  - Search bar (Canva style), auto-complete for requestId/userId.
  - Trace waterfall: expandable tree, color-coded by service/level.
  - Click to expand log details, copy requestId, jump to related metrics.
  - Responsive, dark/light mode, pixel-perfect.

---

# All tracing and debugging features are modular, extensible, and ready for new services. Add new trace points by including `requestId` in logs/metrics. UI is designed for zero-friction debugging and world-class experience. 