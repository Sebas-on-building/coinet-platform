# 4.2 Routing Modes — Operational Doctrine

The Connector & Routing Layer must **not** treat all ingress flows as equivalent.

Different observations enter Coinet under radically different operational conditions: some are **perishable** (realtime), some **periodic** (scheduled), some **only when asked** (on-demand), some **historical** (backfill). Undifferentiated ingestion produces cost blowups, noise, brittleness, and **semantic confusion** (valid data ingested in an invalid operational way).

A **routing mode** is a **formal execution class**, not a transport label. It defines:

- **Why** a retrieval or stream exists  
- **How quickly** it must be processed  
- **What freshness standard** applies  
- **Retry / fallback** acceptability  
- **Which downstream layers** may consume it  
- **Degraded behavior** when constraints fail  
- **Cost / latency budget**

**Canonical modes:** `realtime` · `scheduled` · `on_demand` · `backfill` — **not interchangeable.**

Implementation lives in `routing-modes.ts` (`ROUTING_MODE_CONTRACTS`, `MODE_DEGRADATION_POLICIES`). Envelopes carry `routing_mode`, `ingress_origin`, and `mode_operational_flags` so semantics stay visible downstream (4.2.2, 4.2.9 Rule 4).

---

## 4.2.1 Problems routing modes solve

1. **Urgency separation** — Liquidations vs weekly revenue updates must not share one queue.  
2. **Freshness precision** — Truths decay at different rates.  
3. **Cost control** — No realtime budget on backfill; no backfill flood on interactive paths.  
4. **Reliability isolation** — Failure in one mode must not contaminate others.  
5. **Semantic correctness** — System must know: live vs periodic vs user-triggered vs reconstructed.

---

## 4.2.2 Routing-mode doctrine (declared per path)

Every ingress path declares at minimum: **routing mode**, **latency expectation**, **freshness expectation**, **retry budget**, **fallback depth**, **cache permissibility**, **degradation semantics**, **downstream priority**, plus **allowed downstream consumers** (and for realtime, **forbidden auto-triggers**).

The same provider may appear in **different modes** for different use cases.

---

## 4.2.3 Realtime

**Definition:** Observations whose value decays rapidly; immediate detection, state transitions, urgent response.

**Examples:** Alchemy webhooks, QuickNode websockets, CoinGlass websocket feeds, high-urgency whale/market events.

**Doctrine:** Optimize **minimal latency**, **event continuity**, **freshness**, **immediate downstream eligibility**, **explicit degradation**. Do **not** optimize historical completeness or heavy enrichment **before** capture.

**Rules:** (1) Stream/event semantics — use `ingress_origin: stream_event`. (2) Prefer fast primary paths; enrich later. (3) Tolerate partial early state. (4) Preserve order where possible. (5) Realtime degradation must be explicit (`temporal_downgrade` in flags).

**Freshness:** Strictest buckets (`live`, `fresh`).

**Downstream:** Event engine, contradiction, timing/sequence, alerting, judgment refresh, confidence — **not** automatic full recomputation, narrative reanalysis, or broad historical rebuilds on every low-value event.

---

## 4.2.4 Scheduled

**Definition:** Periodic, refreshable observations without event-level immediacy (CoinGecko, DeFiLlama, DexScreener API snapshots, CryptoPanic, LunarCrush, etc.).

**Doctrine:** **Regularity**, predictable cadence, **broad coverage**, **cost efficiency**, **snapshot integrity**. Not streaming, not user-blocking pseudo-realtime, not unbounded polling.

**Rules:** (1) **Cadence class** per connector (`scheduled_cadence_tier`: high / medium / low frequency). (2) Source-specific freshness economics. (3) Prefer complete snapshots over fake realtime. (4) **Preemptible** by higher-priority modes. (5) Graceful lag — mark age, do not pretend stale is current.

**Internal tiers:** `high_frequency` | `medium_frequency` | `low_frequency` (see registry diagnostics + `ModuleDoctrine`).

---

## 4.2.5 On-demand

**Definition:** Retrieved because a **user**, analyst, or intelligence action **explicitly** requires them now (full reports, drilldowns, comparisons).

**Doctrine:** **Relevance**, controlled latency, **bounded cost**, **narrowest sufficient scope**. Not unbounded tool recursion or hidden full-system refresh.

**Rules:** Anchor to a **question**; **cost/time ceilings**; **partial completion** explicit.

---

## 4.2.6 Backfill

**Definition:** Historical reconstruction, replay, calibration, audits.

**Doctrine:** **Completeness**, **reproducibility**, **auditability**, **isolation** from live user paths.

**Rules:** Always mark **historical/reconstructive** (`ingress_origin: historical_replay`). Incomplete replay → **halt or mark invalid**, never silent partial calibration state.

---

## 4.2.7 Boundaries

| Boundary | Intent |
|----------|--------|
| B1 | Realtime = perishable **event** truth |
| B2 | Scheduled = **periodic** state maintenance |
| B3 | On-demand = depth tied to **explicit need** |
| B4 | Backfill = **historical** reconstruction & self-improvement |

Invalid: scheduled labeled as live stream; backfill starving live paths; on-demand triggering market-wide refresh; scheduled cache presented as stream without downgrade.

---

## 4.2.8 Mode-specific degradation

Encoded in `MODE_DEGRADATION_POLICIES` and reflected in `mode_operational_flags.temporal_downgrade` for realtime.

---

## 4.2.9 Production rules (non-negotiable)

Exported as `PRODUCTION_ROUTING_RULES_4_2_9` in `routing-modes.ts`.

---

## 4.2.10–4.2.11 Industry positioning & final definition

Routing modes are the **formal execution classes** through which external observations enter Coinet under distinct urgency, freshness, cost, and semantic conditions — so realtime, scheduled, on-demand, and backfill are **interpreted and degraded** according to operational meaning, not as one undifferentiated flow.

---

## 4.2.12 Reader execution checklist

Exported as `READER_EXECUTION_DOCTRINE_4_2_12` in `routing-modes.ts`.

1. Define four modes as execution classes.  
2. Assign each ingress path **exactly one** mode.  
3. Define per-mode latency, freshness, fallback, degradation.  
4. Keep mode semantics visible downstream.  
5. Prevent live / periodic / interactive / historical confusion.  
6. Isolate high-urgency workloads.  
7. Audit every connector against declared mode.

---

## Code map

| Artifact | Role |
|----------|------|
| `types.ts` | `RoutingMode`, `IngressOrigin`, `ModeOperationalFlags`, `RoutingModeContract`, `ScheduledCadenceTier` |
| `routing-modes.ts` | Contracts, degradation, boundaries, helpers |
| `base-connector.ts` | Sets `routing_mode`, `ingress_origin`, `mode_operational_flags` |
| `envelope-validator.ts` | Enforces alignment of mode ↔ origin ↔ flags |
| `envelope-factory.ts` | Evidence path; `ModuleDoctrine.scheduled_cadence_tier` |
| `/api/connector-layer/diagnostics` | Live export of contracts, boundaries, checklist |
