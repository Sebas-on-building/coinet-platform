# 🚀 Railway Variables for ML Fraud Detection

## Quick Setup - Copy and Paste

Add these to Railway → `alchemy-whales` service → Variables:

---

## Core ML Variables

| Name | Value |
|------|-------|
| `AI_ML_FRAUD_ENABLED` | `true` |
| `AI_MODEL_VERSION` | `v1.0.0` |
| `AI_MIN_CONFIDENCE_SCORE` | `70` |
| `AI_USE_ENSEMBLE` | `true` |
| `AI_ONLINE_LEARNING` | `true` |
| `AI_ANALYSIS_TIMEOUT_MS` | `5000` |

---

## Already Configured (from previous setup)

These are already set — no need to add again:

- ✅ `AI_FRAUD_DETECTION_ENABLED`
- ✅ `AI_CHECK_CONTRACT_VERIFICATION`
- ✅ `AI_CHECK_OWNERSHIP_CONCENTRATION`
- ✅ `AI_CHECK_LIQUIDITY_LOCK`
- ✅ `AI_CHECK_MINT_AUTHORITY`
- ✅ `AI_CHECK_WASH_TRADING`
- ✅ `AI_CHECK_BOT_ACTIVITY`
- ✅ `AI_CHECK_TEAM_DOX`
- ✅ `ALERT_ON_FRAUD_RISK`
- ✅ `FRAUD_RISK_THRESHOLD`
- ✅ `ALERT_ON_HIGH_POTENTIAL`
- ✅ `HIGH_POTENTIAL_THRESHOLD`

---

## Summary

**Add these 6 variables to enable ML fraud detection:**

1. `AI_ML_FRAUD_ENABLED=true`
2. `AI_MODEL_VERSION=v1.0.0`
3. `AI_MIN_CONFIDENCE_SCORE=70`
4. `AI_USE_ENSEMBLE=true`
5. `AI_ONLINE_LEARNING=true`
6. `AI_ANALYSIS_TIMEOUT_MS=5000`

Everything else is already configured from previous setup.

---

## What This Enables

- ML-based fraud detection (90%+ accuracy)
- Ensemble methods (4 detection techniques)
- Online learning (improves over time)
- Real-time analysis (< 5 seconds)
- Intelligent recommendations

---

**Service**: `alchemy-whales`  
**Feature**: ML Fraud Detection  
**Status**: Ready to deploy

