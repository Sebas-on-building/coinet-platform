# 🏆 OMNISCORE v2.2 — DIVINE PERFECTION

## What's New

OmniScore v2.2 elevates project analysis from a single composite number into a **regime-aware, quality-gated, adversarially robust decision system** that outputs both:

* an **investable assessment** (resistant to hype contamination), and
* an **actionable improvement roadmap** for founders.

Backtesting and walk-forward evaluation are used where sufficient history exists.

---

## 1) Reflexivity Firewall (QS vs OS)

We fully separate:

* **Quality Score (QS):** what the project *is*
  (TEAM, TECH, SEC, GOV, ECO)

* **Opportunity Score (OS):** what market conditions *might reward*
  (MARKET, VAL, ADOPT, COMM, TOKEN)

This prevents narrative momentum or price-driven signals from inflating fundamental quality.

**Quality Gate:** If QS data coverage *(quality-weighted variable availability)* falls below 60%, OS display is gated to prevent "market noise looks like opportunity."

---

## 2) Hierarchical Weights

Weights are structured as:

```text
w = w^global + δ^sector + δ^cap + δ^regime
```

This enables context-specific scoring that remains stable and defensible across cycles.

---

## 3) Segment-Specific Freshness Decay

We apply **segment-aware decay defaults** (tunable via calibration):

| Domain        | Decay Speed        | Rationale                         |
| ------------- | ------------------ | --------------------------------- |
| TEAM / GOV    | Very slow (months) | Fundamentals don't change quickly |
| SEC           | Slow (weeks)       | Audits remain valid               |
| TECH          | Medium (days)      | Code changes regularly            |
| MARKET / COMM | Fast (hours)       | Markets move rapidly              |

---

## 4) Adversarial Hype Resistance

COMM and ADOPT are adjusted with bot- and anomaly-risk penalties:

```text
COMM_adj = COMM × (1 - BotRisk) × (1 - AnomalyScore)
```

**COMM/ADOPT are capped by anomaly penalties and validated against multi-source consistency.** This reduces susceptibility to bought growth, wash signals, and artificial narrative spikes.

---

## 5) Multi-Uncertainty Decomposition

We separate uncertainty into:

```text
Var(POS) = Var_data + Var_model + Var_regime
```

Scores are displayed with confidence bands and explicit data coverage so users can see where uncertainty originates.

---

## 6) Event-Risk Override (Severity-Weighted)

A dedicated **Red Flag Engine** identifies high-severity conditions:

* large unlock cliffs
* recent exploits
* legal/regulatory shocks
* extreme bridge concentration
* tight treasury runway

**Mathematical adjustment:**

```text
POS_adj = POS - γ × ERS
```

Where **ERS** = Event Risk Severity (0–1) and **γ = 15** *(default cap; tunable per sector).*

---

## 7) Narrative vs Reality Gap (NRG)

```text
NRG = z(COMM + MARKET) - z(ADOPT + SEC + TECH)
```

Interpreted using **percentile thresholds derived from regime- and sector-conditioned historical distributions**.

Percentiles are computed per regime + sector:

| Percentile | Interpretation         |
| ---------- | ---------------------- |
| Top 10%    | Overhyped 🔴           |
| 35th–65th  | Fairly valued 🟡       |
| Bottom 10% | Severely underhyped 💎 |

---

## 8) Counterfactual Improvement Simulator

Founders receive **realistic, constrained** upgrade scenarios with:

* expected QS uplift
* cost/time ranges
* budget caps & hiring limits
* feasibility weighting
* realism checks

---

## Why v2.2 Is a Real Moat

OmniScore v2.2 combines:

* reflexivity separation
* hierarchical weights
* adversarial social defenses
* event-risk overrides
* multi-uncertainty reporting
* counterfactual improvement planning

into one unified system.

---

## API Endpoint

```bash
curl "https://api.coinet.ai/api/omniscore/v2?project=supra"
```

---

## What's Next (v2.3 Roadmap)

* Cross-chain entity resolution
* Sector plug-in packs (40 core + 200 sector-specific variables)
* Reflexivity leak monitoring (`Corr(QS, ΔPrice_30d)` tracking)
* Causal-ish protections (separate signals from reflections of price)

---

## The One-Line Summary

> **OmniScore is not a single score. It is a regime-aware, quality-gated, adversarially robust decision system that outputs both an investable assessment and an actionable improvement roadmap.**

---

## Methodology Footer

Scores are probabilistic estimates. Confidence depends on data coverage, regime stability, and model maturity.

---

*OmniScore v2.2 | Coinet Platform | Divine Perfection Depth Standard*

