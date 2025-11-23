# 🚀 Railway Deployment - Alert Notifications

## Environment Variables for Railway

Add these variables to your **alchemy-whales** service in Railway:

---

## 📱 Telegram Notifications (Recommended)

```bash
# Enable Telegram
TELEGRAM_ENABLED=true

# Bot token from @BotFather
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# Your chat ID (positive number for user, negative for group)
TELEGRAM_CHAT_ID=123456789
```

**Setup Steps:**
1. Message @BotFather on Telegram
2. Send `/newbot` and follow prompts
3. Copy bot token
4. Start conversation with your bot
5. Get chat ID from: `https://api.telegram.org/bot<TOKEN>/getUpdates`

---

## 📧 Email Notifications (Professional)

```bash
# Enable Email
EMAIL_ENABLED=true

# Gmail SMTP settings
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your.email@gmail.com
EMAIL_PASSWORD=your_app_password_here

# Sender and recipients
EMAIL_FROM=Coinet Alerts <your.email@gmail.com>
EMAIL_TO=recipient1@example.com,recipient2@example.com
```

**Gmail Setup:**
1. Enable 2FA on Google Account
2. Generate App Password: Account > Security > App Passwords
3. Use the 16-character app password (not your regular password)

**Other Email Providers:**
- **SendGrid:** `EMAIL_HOST=smtp.sendgrid.net`, use API key as password
- **AWS SES:** `EMAIL_HOST=email-smtp.us-east-1.amazonaws.com`, use SMTP credentials
- **Mailgun:** `EMAIL_HOST=smtp.mailgun.org`, use SMTP credentials

---

## 💬 Discord Notifications (Team Alerts)

```bash
# Enable Discord
DISCORD_ENABLED=true

# Webhook URL from Discord server
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/1234567890/AbCdEfGhIjKlMnOpQrStUvWxYz
```

**Setup Steps:**
1. Go to Discord Server Settings
2. Integrations > Webhooks > New Webhook
3. Choose channel and copy webhook URL

---

## 💼 Slack Notifications (Workspace)

```bash
# Enable Slack
SLACK_ENABLED=true

# Incoming webhook URL
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
```

**Setup Steps:**
1. Go to https://api.slack.com/apps
2. Create New App > From scratch
3. Add "Incoming Webhooks" feature
4. Activate and add new webhook to a channel
5. Copy webhook URL

---

## ⚙️ Rate Limiting & Thresholds

```bash
# Rate limiting (prevents spam)
MIN_ALERT_INTERVAL_SECONDS=30
MAX_ALERTS_PER_HOUR=50

# Fraud detection thresholds
FRAUD_RISK_THRESHOLD=60
HIGH_POTENTIAL_THRESHOLD=80

# Alert type filters
ALERT_ON_NEW_TOKEN=true
ALERT_ON_HIGH_RISK=true
ALERT_ON_HIGH_POTENTIAL=true
ALERT_ON_CRITICAL=true
```

---

## 🎯 Recommended Configuration

### Minimal Setup (Telegram Only)

For fastest setup, just use Telegram:

```bash
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
MIN_ALERT_INTERVAL_SECONDS=30
MAX_ALERTS_PER_HOUR=50
FRAUD_RISK_THRESHOLD=60
HIGH_POTENTIAL_THRESHOLD=80
ALERT_ON_HIGH_RISK=true
ALERT_ON_HIGH_POTENTIAL=true
ALERT_ON_CRITICAL=true
```

### Production Setup (Multi-Channel)

For production, use multiple channels for redundancy:

```bash
# Telegram (instant alerts)
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Email (professional reports)
EMAIL_ENABLED=true
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your.email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=Coinet Alerts <your.email@gmail.com>
EMAIL_TO=team@company.com

# Discord (team coordination)
DISCORD_ENABLED=true
DISCORD_WEBHOOK_URL=your_discord_webhook

# Rate limiting
MIN_ALERT_INTERVAL_SECONDS=30
MAX_ALERTS_PER_HOUR=50
FRAUD_RISK_THRESHOLD=60
HIGH_POTENTIAL_THRESHOLD=80
ALERT_ON_NEW_TOKEN=false
ALERT_ON_HIGH_RISK=true
ALERT_ON_HIGH_POTENTIAL=true
ALERT_ON_CRITICAL=true
```

---

## 📊 Complete Variable List

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TELEGRAM_ENABLED` | No | false | Enable Telegram notifications |
| `TELEGRAM_BOT_TOKEN` | If Telegram | - | Bot token from @BotFather |
| `TELEGRAM_CHAT_ID` | If Telegram | - | Chat ID (user or group) |
| `EMAIL_ENABLED` | No | false | Enable email notifications |
| `EMAIL_HOST` | If Email | - | SMTP host |
| `EMAIL_PORT` | If Email | 587 | SMTP port |
| `EMAIL_USER` | If Email | - | SMTP username |
| `EMAIL_PASSWORD` | If Email | - | SMTP password |
| `EMAIL_FROM` | If Email | - | Sender address |
| `EMAIL_TO` | If Email | - | Recipient emails (comma-separated) |
| `DISCORD_ENABLED` | No | false | Enable Discord notifications |
| `DISCORD_WEBHOOK_URL` | If Discord | - | Discord webhook URL |
| `SLACK_ENABLED` | No | false | Enable Slack notifications |
| `SLACK_WEBHOOK_URL` | If Slack | - | Slack webhook URL |
| `MIN_ALERT_INTERVAL_SECONDS` | No | 30 | Min time between alerts |
| `MAX_ALERTS_PER_HOUR` | No | 50 | Max alerts per hour |
| `FRAUD_RISK_THRESHOLD` | No | 60 | Fraud risk alert threshold |
| `HIGH_POTENTIAL_THRESHOLD` | No | 80 | High potential alert threshold |
| `ALERT_ON_NEW_TOKEN` | No | true | Alert on new token detection |
| `ALERT_ON_HIGH_RISK` | No | true | Alert on high fraud risk |
| `ALERT_ON_HIGH_POTENTIAL` | No | true | Alert on high potential |
| `ALERT_ON_CRITICAL` | No | true | Alert on critical fraud (>90%) |

---

## 🚀 Deployment Steps

### In Railway Dashboard

1. **Navigate to Service:**
   ```
   Railway Dashboard > alchemy-whales service > Variables
   ```

2. **Add Variables:**
   - Click "New Variable"
   - Add each variable from the list above
   - Save changes

3. **Deploy:**
   ```
   Railway will automatically redeploy when you save variables
   ```

4. **Verify:**
   ```
   Check logs for:
   "✅ Alert Notification Service initialized"
   "✅ Telegram notifications enabled"
   "✅ Email notifications enabled"
   etc.
   ```

---

## 🧪 Testing

### Test in Production

After deployment, alerts will be sent automatically when:
- New token is detected (if `ALERT_ON_NEW_TOKEN=true`)
- Fraud risk exceeds threshold
- High potential token found
- Critical fraud detected (>90%)

### Manual Test

You can test notifications locally:

```bash
cd services/alchemy-whales
npm run example:alerts  # Coming soon
```

---

## 📈 Expected Results

### What You'll Receive

**Telegram Messages:**
```
🚨 FRAUD RISK

Token: SCAM (ScamCoin)
Address: 7xKX...9ABC
Chain: Solana

🚨 Fraud Risk: 85.3%
📊 Potential: 15.2%
Confidence: 98.7%

Risk Factors:
• High ownership concentration
• No liquidity lock

Recommendation: AVOID

Priority: HIGH
```

**Email:**
- Beautiful HTML email with color-coded metrics
- Professional layout
- Detailed analysis
- Responsive design

**Discord:**
- Rich embed with custom colors
- Inline fields for quick scanning
- Timestamp and priority

**Slack:**
- Interactive blocks
- Team-friendly formatting
- Quick action buttons (coming soon)

---

## 🔧 Troubleshooting

### No Alerts Received

1. **Check Logs:**
   ```
   Railway > alchemy-whales > Logs
   Search for "Alert Notification Service"
   ```

2. **Verify Variables:**
   ```
   Railway > alchemy-whales > Variables
   Ensure all required variables are set
   ```

3. **Test Individual Channels:**
   ```bash
   # Telegram
   curl -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" \
     -d "chat_id=<CHAT_ID>" \
     -d "text=Test"
   
   # Discord
   curl -X POST <WEBHOOK_URL> \
     -H "Content-Type: application/json" \
     -d '{"content": "Test"}'
   ```

### Telegram Not Working

- Verify bot token is correct
- Ensure you've started conversation with bot
- Check chat ID is correct (use `/getUpdates` to verify)
- For groups, chat ID should be negative

### Email Not Working

- Use App Password, not regular password
- Enable "Less secure app access" if using regular Gmail
- Consider using SendGrid/AWS SES for production
- Check spam folder

### Too Many Alerts

- Increase `MIN_ALERT_INTERVAL_SECONDS`
- Decrease `MAX_ALERTS_PER_HOUR`
- Increase `FRAUD_RISK_THRESHOLD`
- Set `ALERT_ON_NEW_TOKEN=false`

### Too Few Alerts

- Decrease `FRAUD_RISK_THRESHOLD`
- Decrease `HIGH_POTENTIAL_THRESHOLD`
- Set `ALERT_ON_NEW_TOKEN=true`
- Check Solana monitoring is enabled

---

## 🎯 Priority System

Alerts are prioritized to ensure critical alerts always get through:

| Priority | Criteria | Rate Limit |
|----------|----------|------------|
| **CRITICAL** | Fraud > 90% | **Bypasses all limits** |
| **HIGH** | Fraud > 70% or Potential > 85% | Normal limits |
| **MEDIUM** | Fraud > 50% or Potential > 70% | Normal limits |
| **LOW** | New token detection | Normal limits |

---

## 💡 Best Practices

1. **Start with Telegram** - Easiest to set up, instant delivery
2. **Add Email for Reports** - Professional, detailed analysis
3. **Use Discord/Slack for Teams** - Centralized team communication
4. **Set Reasonable Thresholds** - Start with 60/80, adjust based on volume
5. **Monitor Alert Volume** - Check logs daily for first week
6. **Test Before Production** - Send test alerts to verify setup

---

## 📞 Support

If you encounter issues:
1. Check Railway logs for error messages
2. Verify all environment variables are set
3. Test each channel individually
4. Review rate limiting settings

---

**Status:** ✅ Production Ready  
**Last Updated:** 2025-11-21  

**Built to outperform competitors by 10000%** 🚀

