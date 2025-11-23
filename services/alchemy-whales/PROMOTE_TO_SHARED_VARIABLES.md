# 🔄 Promote Variables to Shared Variables - Step-by-Step Guide

**Date:** 2025-11-22  
**Status:** Ready to promote duplicate variables

---

## 🎯 Goal

Promote duplicate variables from `alchemy-whales` and `ai-data-feeder` to **Shared Variables** so both services use the same values.

---

## 📋 Variables to Promote (15 duplicates)

These variables exist in BOTH services and should be shared:

1. `AI_ULTIMATE_FRAUD_ENABLED`
2. `ALERT_ON_CRITICAL`
3. `ALERT_ON_HIGH_POTENTIAL`
4. `ALERT_ON_HIGH_RISK`
5. `ALERT_ON_NEW_TOKEN`
6. `MAX_ALERTS_PER_HOUR`
7. `MIN_ALERT_INTERVAL_SECONDS`
8. `QUICKNODE_ENABLED`
9. `QUICKNODE_SOLANA_CU_PER_SEC`
10. `QUICKNODE_SOLANA_HTTP_URL`
11. `QUICKNODE_SOLANA_WS_URL`
12. `SOLANA_REALTIME_MONITORING`
13. `TELEGRAM_BOT_TOKEN`
14. `TELEGRAM_CHAT_ID`
15. `TELEGRAM_ENABLED`

---

## 🚀 Step-by-Step Instructions

### Method 1: Promote from Service Variables (Easier)

#### Step 1: Start with `alchemy-whales` Service

1. **Go to:** Railway Dashboard > **alchemy-whales** > **Variables** tab
2. **Find:** `TELEGRAM_ENABLED` variable
3. **Click:** **⋮** (three dots) icon next to the variable
4. **Select:** **"Promote to Shared Variable"**
5. **Confirm:** Click "Promote" or "Yes"

#### Step 2: Repeat for Each Variable

**Promote these variables one by one:**

**Telegram Variables:**
- `TELEGRAM_ENABLED`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

**Alert Variables:**
- `ALERT_ON_CRITICAL`
- `ALERT_ON_HIGH_POTENTIAL`
- `ALERT_ON_HIGH_RISK`
- `ALERT_ON_NEW_TOKEN`
- `MAX_ALERTS_PER_HOUR`
- `MIN_ALERT_INTERVAL_SECONDS`

**QuickNode Variables:**
- `QUICKNODE_ENABLED`
- `QUICKNODE_SOLANA_CU_PER_SEC`
- `QUICKNODE_SOLANA_HTTP_URL`
- `QUICKNODE_SOLANA_WS_URL`

**Solana Variables:**
- `SOLANA_REALTIME_MONITORING`

**AI Variables:**
- `AI_ULTIMATE_FRAUD_ENABLED`

#### Step 3: Verify Shared Variables

1. **Go to:** Railway Dashboard > **Project Settings** > **Shared Variables**
2. **Check:** You should see all 15 variables listed
3. **Verify:** Both services can now reference these shared variables

#### Step 4: Remove Duplicates from `ai-data-feeder` (Optional)

**After promoting, you can optionally remove duplicates:**

1. **Go to:** Railway Dashboard > **ai-data-feeder** > **Variables**
2. **Find:** Variables that are now shared (they'll show as "Shared Variable")
3. **Delete:** The duplicate service-specific variables (if they exist)
4. **Note:** Railway should automatically use shared variables, but you can clean up duplicates

---

### Method 2: Create Shared Variables Manually

#### Step 1: Go to Shared Variables

1. **Go to:** Railway Dashboard > **Project Settings** > **Shared Variables**
2. **Click:** **"Add"** button

#### Step 2: Add Each Variable

**For each variable:**

1. **Variable Name:** Enter the variable name (e.g., `TELEGRAM_ENABLED`)
2. **Variable Value:** Enter the value (e.g., `true`)
3. **Click:** **"Add"**
4. **Repeat** for all 15 variables

#### Step 3: Verify Services Can Access

1. **Go to:** Railway Dashboard > **alchemy-whales** > **Variables**
2. **Check:** Shared variables should appear (may show as "Shared Variable")
3. **Go to:** Railway Dashboard > **ai-data-feeder** > **Variables**
4. **Check:** Shared variables should appear there too

---

## ✅ Verification Checklist

After promoting variables, verify:

- [ ] All 15 variables appear in Shared Variables
- [ ] `alchemy-whales` can access shared variables
- [ ] `ai-data-feeder` can access shared variables
- [ ] Both services still work correctly
- [ ] No duplicate variables remain (optional cleanup)

---

## 🔍 How to Check if Variables Are Shared

### In Service Variables Tab:

**Shared variables will show:**
- **"Shared Variable"** badge or indicator
- **Reference:** `${{Shared.TELEGRAM_ENABLED}}` or similar
- **Icon:** May show a link/chain icon

### In Shared Variables Tab:

**You'll see:**
- All shared variables listed
- Variable name and value
- Which services reference them (if shown)

---

## 🎯 Quick Reference: Variable Values

**If you need to recreate values, here are typical defaults:**

```bash
# Telegram
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_CHAT_ID=your_chat_id_here

# Alerts
ALERT_ON_CRITICAL=true
ALERT_ON_HIGH_POTENTIAL=true
ALERT_ON_HIGH_RISK=true
ALERT_ON_NEW_TOKEN=false
MAX_ALERTS_PER_HOUR=50
MIN_ALERT_INTERVAL_SECONDS=30

# QuickNode
QUICKNODE_ENABLED=true
QUICKNODE_SOLANA_CU_PER_SEC=300
QUICKNODE_SOLANA_HTTP_URL=your_url_here
QUICKNODE_SOLANA_WS_URL=your_ws_url_here

# Solana
SOLANA_REALTIME_MONITORING=true

# AI
AI_ULTIMATE_FRAUD_ENABLED=true
```

---

## 🐛 Troubleshooting

### Issue: Can't Find "Promote to Shared Variable" Option

**Solution:**
- Make sure you're in the service Variables tab
- Click the **⋮** (three dots) icon next to the variable
- If not visible, use Method 2 (create manually)

### Issue: Variables Not Showing as Shared

**Solution:**
- Check Project Settings > Shared Variables
- Verify variables are listed there
- Services should automatically reference them

### Issue: Service Can't Access Shared Variables

**Solution:**
- Verify variables are in Shared Variables
- Check service is in the same project/environment
- Redeploy service after promoting variables

### Issue: Duplicate Variables After Promoting

**Solution:**
- This is normal - Railway keeps service-specific copies
- You can optionally delete service-specific duplicates
- Shared variables take precedence

---

## 📊 Before vs After

### Before (Current):
- `alchemy-whales`: 15 service-specific variables
- `ai-data-feeder`: 64 service-specific variables
- **Total:** 79 variables (15 duplicates)

### After (Promoted):
- **Shared Variables:** 15 shared variables
- `alchemy-whales`: References 15 shared variables
- `ai-data-feeder`: References 15 shared variables
- **Total:** 15 shared + service-specific = cleaner management

---

## ✅ Benefits After Promoting

1. ✅ **Update Once:** Change shared variable, applies to both services
2. ✅ **No Duplication:** Single source of truth
3. ✅ **Easier Management:** All shared config in one place
4. ✅ **Consistency:** Both services use same values
5. ✅ **Less Maintenance:** Fewer variables to manage

---

## 🚀 Next Steps After Promoting

1. **Test Services:**
   - Verify `alchemy-whales` still works
   - Verify `ai-data-feeder` still works
   - Check logs for any errors

2. **Update Values (If Needed):**
   - Go to Shared Variables
   - Update values once
   - Both services automatically use new values

3. **Clean Up (Optional):**
   - Remove duplicate service-specific variables
   - Keep only shared variables

---

**Status:** Ready to promote variables  
**Method:** Use Method 1 (Promote from Service) - easier and faster

