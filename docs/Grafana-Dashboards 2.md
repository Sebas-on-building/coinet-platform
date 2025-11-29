# Grafana Dashboards for Coinet Platform

## 1. HTTP Metrics Dashboard
- **Panels:** Request Rate, Latency Histogram, Error Rate by Endpoint
- **Example Panel JSON:**
```json
{
  "type": "graph",
  "title": "HTTP Request Rate",
  "targets": [{
    "expr": "sum(rate(coinet_http_requests_total[1m])) by (endpoint)",
    "legendFormat": "{{endpoint}}"
  }],
  "fieldConfig": { "defaults": { "color": { "mode": "palette-classic" } } }
}
```
- **Design:** Apple/Canva style, clean, rounded, subtle gradients, endpoint icons.

## 2. Error Rate Dashboard
- **Panels:** 4xx/5xx Error Rate, Error Count by Service
- **Example Panel JSON:**
```json
{
  "type": "stat",
  "title": "HTTP 5xx Error Rate",
  "targets": [{
    "expr": "sum(rate(coinet_http_errors_total{status=~\"5..\"}[5m]))",
    "legendFormat": "5xx"
  }],
  "colorMode": "value",
  "thresholds": { "mode": "absolute", "steps": [{"color": "green"}, {"value": 5, "color": "red"}] }
}
```
- **Design:** Red/green color cues, TradingView-style alert banners.

## 3. Kafka Consumer Lag Dashboard
- **Panels:** Lag by Topic/Partition, Max Lag
- **Example Panel JSON:**
```json
{
  "type": "bar-gauge",
  "title": "Kafka Consumer Lag",
  "targets": [{
    "expr": "coinet_kafka_consumer_lag",
    "legendFormat": "{{topic}}:{{partition}}"
  }],
  "orientation": "horizontal"
}
```
- **Design:** Solana-style neon accents, dark mode.

## 4. Cache Hit/Miss Dashboard
- **Panels:** Cache Hit Rate, Miss Rate
- **Example Panel JSON:**
```json
{
  "type": "piechart",
  "title": "Cache Hit/Miss",
  "targets": [
    { "expr": "sum(coinet_cache_hits_total)", "legendFormat": "Hits" },
    { "expr": "sum(coinet_cache_misses_total)", "legendFormat": "Misses" }
  ]
}
```
- **Design:** Canva-style pie, animated transitions.

## 5. DB Query Duration Dashboard
- **Panels:** Query Duration Histogram, P99/P95
- **Example Panel JSON:**
```json
{
  "type": "heatmap",
  "title": "DB Query Duration",
  "targets": [{
    "expr": "histogram_quantile(0.99, sum(rate(coinet_db_query_duration_seconds_bucket[5m])) by (le))"
  }]
}
```
- **Design:** Apple glassmorphism, smooth gradients.

## 6. Notification Delivery Dashboard
- **Panels:** Success/Failure Rate, Notification Latency
- **Example Panel JSON:**
```json
{
  "type": "stat",
  "title": "Notification Success Rate",
  "targets": [
    { "expr": "sum(coinet_notification_success_total)", "legendFormat": "Success" },
    { "expr": "sum(coinet_notification_failure_total)", "legendFormat": "Failure" }
  ]
}
```
- **Design:** TradingView-style status, animated check/cross icons.

## 7. Websocket Activity Dashboard
- **Panels:** Active Connections, Connection Rate
- **Example Panel JSON:**
```json
{
  "type": "gauge",
  "title": "Active Websockets",
  "targets": [{ "expr": "coinet_active_websockets" }]
}
```
- **Design:** Solana/Apple fusion, glowing gauge.

## 8. Alerts Triggered Dashboard
- **Panels:** Alerts Triggered Over Time, By User
- **Example Panel JSON:**
```json
{
  "type": "timeseries",
  "title": "Alerts Triggered",
  "targets": [{ "expr": "increase(coinet_alerts_triggered_total[1h])" }]
}
```
- **Design:** Canva-style timeline, user avatars.

## 9. System Metrics Dashboard
- **Panels:** CPU, Memory, Disk, Network
- **Example Panel JSON:**
```json
{
  "type": "timeseries",
  "title": "CPU Usage",
  "targets": [{ "expr": "process_cpu_seconds_total" }]
}
```
- **Design:** Apple/TradingView, minimal, responsive.

## 10. Request Tracing & Correlation
- **Panels:** RequestID search, Trace waterfall
- **Design:** Search bar (Canva style), trace tree (TradingView/Apple fusion), click to expand details.

## 11. Alerting
- **How-To:**
  - Set alert rules for any metric (e.g., error rate > 5%, lag > 1000, notification failures > 0).
  - Example:
```json
{
  "alert": {
    "expr": "sum(rate(coinet_http_errors_total[5m])) > 5",
    "for": "5m",
    "labels": { "severity": "critical" },
    "annotations": { "summary": "High error rate detected" }
  }
}
```
- **Design:** Alert banners, Apple/TradingView/Canva fusion, actionable links.

---

# All dashboards are modular, extensible, and pixel-perfect. Add new metrics by copying a section and updating the Prometheus query. All panels use unified design tokens and are ready for dark/light mode, mobile, and custom branding. 