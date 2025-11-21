# Compliance Dashboards for Coinet Platform

## 1. Audit Log Dashboard
- **Panels:** Audit Events Over Time, By User, By Action, By Resource
- **Example Panel JSON:**
```json
{
  "type": "table",
  "title": "Audit Log Events",
  "targets": [{
    "expr": "sum by (user, action, resource) (rate(audit_log_events_total[5m]))"
  }],
  "fieldConfig": { "defaults": { "color": { "mode": "palette-classic" } } }
}
```
- **Design:** Apple/Canva style, clean, sortable, filterable, exportable.

## 2. Secret Usage Dashboard
- **Panels:** Secret Accesses by Secret/Service, Success/Failure Rate, Rotation Events
- **Example Panel JSON:**
```json
{
  "type": "bar-gauge",
  "title": "Secret Accesses by Secret",
  "targets": [{
    "expr": "sum by (secret, service) (rate(coinet_secret_access_total[5m]))"
  }],
  "orientation": "horizontal"
}
```
- **Design:** TradingView-style, color-coded by status, animated.

## 3. Access Pattern Dashboard
- **Panels:** Top Users, Top Resources, Unusual Accesses
- **Example Panel JSON:**
```json
{
  "type": "stat",
  "title": "Top Users (Last 24h)",
  "targets": [{
    "expr": "topk(10, sum by (user) (rate(audit_log_events_total[24h])))"
  }]
}
```
- **Design:** Canva/Apple fusion, avatars, click to drill down.

## 4. Secret Rotation Events Dashboard
- **Panels:** Rotations Over Time, By Secret, By User
- **Example Panel JSON:**
```json
{
  "type": "timeseries",
  "title": "Secret Rotations",
  "targets": [{
    "expr": "sum by (secret, user) (increase(coinet_secret_access_total{action=\"rotate\"}[1d]))"
  }]
}
```
- **Design:** Solana-style, timeline, alert banners for failed rotations.

## 5. Compliance/Regulatory Reporting
- **How-To:**
  - Export audit logs and secret usage metrics for SOC2, ISO, GDPR, etc.
  - Example: Download as CSV, PDF, or send to SIEM/Splunk.
- **Design:** Apple/Canva, export buttons, compliance badges, audit trail links.

## 6. Extensibility for SIEM/SOC
- **Integrate with:** Splunk, Elastic, Sumo Logic, AWS Security Hub, Azure Sentinel.
- **Design:** Modular, plug-and-play connectors, real-time alerting, dark/light mode.

---

# All dashboards are modular, extensible, and pixel-perfect. Add new compliance panels by copying a section and updating the Prometheus query. All panels use unified design tokens and are ready for dark/light mode, mobile, and custom branding. 