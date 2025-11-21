# Divine World-Class Email & SMS Service

A comprehensive, enterprise-grade notification service with high-deliverability email providers, SMS gateways, advanced templating, compliance features, and intelligent suppression management.

## 🌟 Features

### 🚀 High-Deliverability Email Providers
- **AWS SES** - Amazon Simple Email Service with industry-leading deliverability
- **SendGrid** - Powerful email delivery platform with advanced analytics
- **Automatic Fallback** - Seamless failover between providers for maximum reliability
- **Provider Health Monitoring** - Real-time health checks and performance metrics

### 🎨 Advanced Templating Engine
- **Handlebars.js** - Powerful templating with custom helpers
- **Multi-language Support** - i18next integration for internationalization
- **Dynamic Placeholders** - Support for variables, dates, currency formatting
- **HTML & Plain Text** - Automatic generation of both formats
- **Template Validation** - Comprehensive validation of template data

### 📊 Batch Processing & Scheduling
- **Efficient Batching** - Optimized bulk email processing
- **Rate Limiting** - Built-in rate limiting to prevent overwhelming providers
- **Campaign Management** - Full lifecycle campaign management
- **Segmentation** - Advanced recipient segmentation rules
- **Throttling** - Configurable sending rates per campaign

### 🚫 Intelligent Suppression Management
- **Opt-out Handling** - Automatic processing of unsubscribe requests
- **Bounce Management** - Intelligent bounce categorization and suppression
- **Complaint Tracking** - Automatic suppression for spam complaints
- **Custom Rules** - Flexible suppression rules (domain, email, pattern-based)
- **Expiration Management** - Time-based suppression list cleanup

### 📈 Comprehensive Analytics & Tracking
- **Open Tracking** - Pixel-based open tracking
- **Click Tracking** - Link click tracking with redirect handling
- **Bounce Analytics** - Detailed bounce categorization and reporting
- **Delivery Metrics** - Comprehensive delivery and engagement metrics
- **Provider Performance** - Per-provider performance analytics

### ⚖️ Compliance & Legal
- **CAN-SPAM Compliance** - Automatic header insertion and unsubscribe handling
- **GDPR Ready** - Consent tracking and data protection features
- **DMARC/DKIM Support** - Email authentication verification
- **Physical Address** - Automatic footer inclusion
- **Unsubscribe Pages** - One-click unsubscribe functionality

### 📱 SMS Gateway Integration
- **Twilio** - Leading SMS provider with global reach and delivery receipts
- **Nexmo (Vonage)** - Enterprise SMS platform with advanced routing
- **Automatic Fallback** - Seamless failover between SMS providers
- **Provider Health Monitoring** - Real-time health checks and performance metrics

### 💬 Advanced SMS Templating
- **SMS-Optimized Templates** - Character-aware templating with length optimization
- **Multi-language Support** - SMS localization for global messaging
- **Dynamic Placeholders** - Support for variables, dates, currency in SMS
- **Smart Truncation** - Intelligent message shortening while preserving meaning
- **Promotional Detection** - Automatic detection and handling of promotional content

### ⚡ Intelligent Rate Limiting
- **Per-Destination Limits** - Prevent overwhelming individual recipients
- **Per-Provider Limits** - Manage provider costs and respect API limits
- **Priority-Based Scaling** - Critical messages bypass normal rate limits
- **User-Specific Overrides** - Custom rate limits for enterprise customers
- **Cost Management** - Built-in cost estimation and monitoring

### 📡 Delivery Status & Webhooks
- **Real-time Status Updates** - Live tracking of SMS delivery status
- **Delivery Receipts** - Confirmation of successful delivery
- **Webhook Processing** - Automatic handling of provider status updates
- **Failure Analysis** - Detailed error categorization and reporting
- **Retry Logic** - Intelligent retry for temporary failures

### 🔄 Smart Fallback System
- **Multi-Channel Fallback** - Automatic fallback to push notifications or email
- **Context-Aware Routing** - Different fallback strategies for different message types
- **Timeout Management** - Configurable fallback timeouts
- **Success Tracking** - Track which channel ultimately succeeded
- **Cost Optimization** - Minimize costs while maximizing delivery success

### ⚙️ User Preference Management
- **Opt-in/Opt-out** - Granular control over SMS preferences
- **Promotional vs Transactional** - Separate preferences for different SMS types
- **Provider Preferences** - User-selected preferred SMS providers
- **Rate Limit Overrides** - Custom limits for specific users
- **Privacy Compliance** - Respect user communication preferences

### 🌐 Advanced Webhook Integrations
- **Webhook Registration** - Allow users to register webhook endpoints for custom integrations
- **Secure Payload Signing** - HMAC-SHA256 signature verification for webhook security
- **Configurable Retry Policies** - Exponential backoff with configurable retry limits
- **At-least-once Delivery** - Guaranteed delivery with idempotency keys
- **Transformation Templates** - Support for JSON, XML, and form-data payload formats
- **Multi-system Support** - Pre-built templates for Slack, Discord, and generic systems
- **Real-time Monitoring** - Dashboard for webhook delivery status and replay failed deliveries

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (for persistence)
- Redis (for caching and queues)
- AWS SES or SendGrid account

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp env.example .env
# Edit .env with your configuration

# Start in development mode
npm run dev

# Or build and start
npm run build
npm start
```

### Configuration

Copy `env.example` to `.env` and configure:

```env
# Server
NODE_ENV=development
PORT=4005

# Email Providers
AWS_SES_REGION=us-east-1
AWS_SES_ACCESS_KEY_ID=your-access-key
AWS_SES_SECRET_ACCESS_KEY=your-secret

SENDGRID_API_KEY=your-sendgrid-key
SENDGRID_WEBHOOK_SECRET=your-webhook-secret

# Compliance
UNSUBSCRIBE_BASE_URL=https://yourdomain.com/unsubscribe
TRACKING_BASE_URL=https://yourdomain.com/track
```

## 📡 API Endpoints

### Health & Status
- `GET /health` - Service health check
- `GET /providers/health` - Provider health status
- `GET /providers/stats` - Provider statistics

### Email Sending
- `POST /email/send` - Send single email
- `POST /email/batch` - Send batch of emails

### Template Management
- `POST /templates` - Create email template
- `GET /templates` - List all templates

### Campaign Management
- `POST /campaigns` - Create email campaign

### Suppression Management
- `POST /suppression/check` - Check email suppression status
- `POST /suppression/add` - Add email to suppression list
- `DELETE /suppression/:email` - Remove email from suppression

### Webhooks
- `POST /webhooks/email-events` - Email event webhook (SendGrid/SES)
- `POST /webhooks/unsubscribe` - Unsubscribe webhook
- `GET /unsubscribe` - Unsubscribe page

### SMS Sending
- `POST /sms/send` - Send single SMS
- `POST /sms/batch` - Send batch of SMS messages

### SMS Template Management
- `POST /sms/templates` - Create SMS template
- `GET /sms/templates` - List all SMS templates

### SMS Status & Management
- `GET /sms/status/:messageId` - Get SMS delivery status
- `GET /sms/providers/health` - SMS provider health status
- `GET /sms/providers/stats` - SMS provider statistics

### SMS Webhooks
- `POST /sms/webhooks/status` - SMS status webhook (Twilio/Nexmo)

### Webhook Management
- `POST /webhooks/endpoints` - Register webhook endpoint
- `GET /webhooks/endpoints` - List webhook endpoints
- `GET /webhooks/endpoints/:id` - Get webhook endpoint details
- `PUT /webhooks/endpoints/:id` - Update webhook endpoint
- `DELETE /webhooks/endpoints/:id` - Delete webhook endpoint

### Webhook Monitoring
- `GET /webhooks/deliveries` - Get webhook delivery history
- `GET /webhooks/deliveries/:id` - Get specific delivery details
- `POST /webhooks/deliveries/:id/replay` - Replay failed webhook delivery
- `GET /webhooks/metrics` - Get webhook delivery metrics

### Webhook Templates
- `POST /webhooks/templates` - Create webhook transformation template
- `GET /webhooks/templates` - List transformation templates

### Webhook Verification
- `POST /webhooks/verify/:id` - Verify webhook signature (for external services)

## 📧 Email Sending Examples

### Send Simple Email

```bash
curl -X POST http://localhost:4005/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["user@example.com"],
    "from": "noreply@coinet.com",
    "subject": "Welcome to Coinet!",
    "html": "<h1>Welcome!</h1><p>Thank you for joining us.</p>",
    "text": "Welcome! Thank you for joining us."
  }'
```

### Send Templated Email

```bash
curl -X POST http://localhost:4005/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["user@example.com"],
    "templateId": "welcome-template",
    "templateData": {
      "firstName": "John",
      "platformName": "Coinet Platform"
    }
  }'
```

## 📱 SMS Sending Examples

### Send Simple SMS

```bash
curl -X POST http://localhost:4005/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "body": "Hello! Your verification code is 123456",
    "priority": "high"
  }'
```

### Send Templated SMS

```bash
curl -X POST http://localhost:4005/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "templateId": "verification-sms",
    "templateData": {
      "code": "123456",
      "expiry": "10 minutes"
    },
    "priority": "critical"
  }'
```

### Send SMS with Fallback

```bash
curl -X POST http://localhost:4005/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "body": "Urgent: Your account requires immediate attention",
    "priority": "critical",
    "fallbackConfig": {
      "enabled": true,
      "channels": ["email"],
      "conditions": {
        "timeoutMs": 60000,
        "errorCodes": ["INVALID_PHONE_NUMBER"]
      }
    }
  }'
```

## 🌐 Webhook Integration Examples

### Register Webhook Endpoint

```bash
curl -X POST http://localhost:4005/webhooks/endpoints \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Slack Notifications",
    "url": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK",
    "events": ["email.sent", "sms.sent"],
    "retryPolicy": {
      "enabled": true,
      "maxRetries": 3,
      "initialDelay": 1000,
      "maxDelay": 30000,
      "backoffMultiplier": 2
    }
  }'
```

### Create Transformation Template

```bash
curl -X POST http://localhost:4005/webhooks/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Slack Email Notification",
    "description": "Transform email events for Slack",
    "template": "{ \"text\": \"{{eventType}}\", \"blocks\": [{\"type\": \"header\", \"text\": {\"type\": \"plain_text\", \"text\": \"{{payload.subject}}\"}}]}",
    "outputFormat": "json"
  }'
```

### Monitor Webhook Deliveries

```bash
curl -X GET "http://localhost:4005/webhooks/deliveries?limit=10"
```

## 🛠️ Technology Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with comprehensive middleware
- **Email Providers**: AWS SES, SendGrid (extensible)
- **SMS Providers**: Twilio, Nexmo/Vonage (extensible)
- **Webhook Security**: HMAC-SHA256 signature verification
- **Templating**: Handlebars.js with i18next for both email and SMS
- **Security**: Helmet, CORS, rate limiting, webhook signature verification
- **Monitoring**: Winston logging, health checks, webhook delivery monitoring

## 🔒 Security Features

- Webhook signature verification
- Rate limiting and abuse protection
- CORS protection
- Input validation and sanitization
- Audit logging

## 📊 Monitoring & Analytics

- Real-time health monitoring
- Provider performance metrics
- Suppression list analytics
- Delivery and engagement tracking
- Proactive alerting system

## 🤖 Discord & Telegram Bot Integration

The Notification Service includes world-class bot integrations for Discord servers and Telegram chats, providing seamless alert delivery and interactive command support.

### 🚀 Features

#### **Multi-Platform Support**
- **Discord Bots** - Full Discord API integration with slash commands and rich embeds
- **Telegram Bots** - Complete Telegram Bot API support with inline keyboards and markdown formatting
- **Unified Interface** - Consistent API across both platforms

#### **Intelligent Message Formatting**
- **Markdown Support** - Rich text formatting with **bold**, *italic*, `code`, and more
- **Platform-Specific Features** - Discord embeds, Telegram inline keyboards
- **Smart Content Detection** - Automatic formatting based on message type and priority

#### **Interactive Commands**
- **`/help`** - Display available commands and usage
- **`/subscribe [event_type]`** - Subscribe to specific event notifications
- **`/unsubscribe [event_type]`** - Unsubscribe from event notifications
- **`/list`** - Show current subscriptions
- **`/filter [key=value]`** - Configure notification filters
- **`/explain [event_id]`** - Get detailed event explanations

#### **Rate Limiting & Reliability**
- **Discord Rate Limits** - 5 messages/second per channel, 1000 API calls/hour
- **Telegram Rate Limits** - 30 messages/second, 20 messages/minute per chat
- **Automatic Retry Logic** - Exponential backoff for failed deliveries
- **Health Monitoring** - Real-time bot status and performance tracking

#### **Security & Authentication**
- **Secure Token Storage** - Environment-based token configuration
- **Request Validation** - Comprehensive input sanitization
- **Audit Logging** - Complete interaction history for compliance

### 🔧 Configuration

Add bot configuration to your `.env` file:

```env
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your-discord-bot-token-here
DISCORD_CHANNEL_ID=your-discord-channel-id-here

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your-telegram-bot-token-here
TELEGRAM_CHAT_ID=your-telegram-chat-id-here
```

### 📡 API Endpoints

#### **Subscription Management**
```bash
# Subscribe to notifications
curl -X POST http://localhost:4005/bots/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "platform": "discord",
    "eventTypes": ["email.sent", "sms.delivered"],
    "channelId": "123456789012345678"
  }'

# Unsubscribe from notifications
curl -X POST http://localhost:4005/bots/unsubscribe \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "platform": "discord",
    "eventTypes": ["email.sent"]
  }'

# Get user subscriptions
curl -X GET "http://localhost:4005/bots/subscriptions/user123"
```

#### **Direct Messaging**
```bash
# Send message via Discord bot
curl -X POST http://localhost:4005/bots/send \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "discord",
    "content": "Hello from the notification service!",
    "channelId": "123456789012345678",
    "priority": "normal",
    "formatting": {
      "markdown": true,
      "embeds": true
    }
  }'

# Send message via Telegram bot
curl -X POST http://localhost:4005/bots/send \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "content": "Hello from the notification service!",
    "chatId": "-1001234567890",
    "priority": "high"
  }'
```

#### **Metrics & Monitoring**
```bash
# Get bot metrics
curl -X GET "http://localhost:4005/bots/metrics"

# Get bot health status (included in main health endpoint)
curl -X GET "http://localhost:4005/health"
```

### 🎯 Bot Commands

#### **Discord Commands** (Slash Commands)
- `/help` - Show available commands
- `/subscribe email.sent` - Subscribe to email sent events
- `/unsubscribe email.sent` - Unsubscribe from email sent events
- `/list` - Show current subscriptions
- `/filter priority=high` - Filter for high priority events only
- `/explain event-12345` - Get explanation for event

#### **Telegram Commands** (Text Commands)
- `/help` - Show available commands
- `/subscribe email.sent` - Subscribe to email sent events
- `/unsubscribe email.sent` - Unsubscribe from email sent events
- `/list` - Show current subscriptions
- `/filter priority=high` - Filter for high priority events only
- `/explain event-12345` - Get explanation for event

### 🔒 Security Features

- **Token Encryption** - Bot tokens stored securely in environment variables
- **Request Validation** - All API requests validated for security
- **Audit Logging** - Complete interaction logs for compliance
- **Rate Limiting** - Built-in protection against abuse
- **Input Sanitization** - All user inputs sanitized before processing

### 📈 Analytics & Monitoring

- **Message Delivery Tracking** - Success/failure rates per platform
- **Command Usage Statistics** - Popular commands and usage patterns
- **Performance Metrics** - Response times and throughput
- **Error Monitoring** - Detailed error tracking and alerting
- **Subscription Analytics** - Active subscriptions and growth trends

### 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Bot Integration Architecture              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌──────────────────┐    ┌─────────┐  │
│  │  Bot Service    │    │ Message Formatter│    │ Bot API │  │
│  │                 │    │                  │    │         │  │
│  │ • Event Routing │◄──►│ • Markdown      │◄──►│ • REST  │  │
│  │ • Subscription  │    │ • Platform Opt  │    │ • WebSocket│  │
│  │ • Command Proc  │    │ • Template Eng  │    │ • Events│  │
│  └─────────────────┘    └──────────────────┘    └─────────┘  │
│           │                        │                        │
│           ▼                        ▼                        ▼
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                 Bot Platform Integration                 │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  ┌──────────────┐    ┌──────────────┐    ┌─────────────┐  │  │
│  │  │ Discord Bot  │    │Telegram Bot  │    │ Rate Limiter│  │  │
│  │  │              │    │              │    │             │  │  │
│  │  │ • Slash Cmds │    │ • Text Cmds  │    │ • Platform  │  │  │
│  │  │ • Embeds     │    │ • Inline KB  │    │ • Limits    │  │  │
│  │  │ • Webhooks   │    │ • Webhooks   │    │ • Retry     │  │  │
│  │  └──────────────┘    └──────────────┘    └─────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Notification Service                         │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐  │
│  │   Email Service │    │ Provider Manager │    │ Email Providers │  │
│  │                 │    │                  │    │                 │  │
│  │ • Templates     │◄──►│ • Fallback       │◄──►│ • AWS SES       │  │
│  │ • Campaigns     │    │ • Health Check   │    │ • SendGrid      │  │
│  │ • Suppression   │    │ • Load Balance   │    │ • Rate Limiting │  │
│  └─────────────────┘    └──────────────────┘    └─────────────────┘  │
│           │                        │                        │           │
│           ▼                        ▼                        ▼           │
│  ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐  │
│  │     SMS Service │    │ Provider Manager │    │ SMS Providers   │  │
│  │                 │    │                  │    │                 │  │
│  │ • Templates     │◄──►│ • Fallback       │◄──►│ • Twilio        │  │
│  │ • Campaigns     │    │ • Health Check   │    │ • Nexmo         │  │
│  │ • Rate Limiting│    │ • Load Balance   │    │ • Rate Limiting │  │
│  └─────────────────┘    └──────────────────┘    └─────────────────┘  │
│           │                        │                        │           │
│           ▼                        ▼                        ▼           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                   Shared Services                                │  │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │  ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐  │  │
│  │  │   Suppression   │    │ Template Engine  │    │   Compliance    │  │  │
│  │  │   Service       │    │                  │    │   Engine        │  │  │
│  │  │                 │    │ • Handlebars     │    │                 │  │  │
│  │  │ • Bounce Mgmt   │    │ • i18next        │    │ • CAN-SPAM      │  │  │
│  │  │ • Complaint     │    │ • Validation     │    │ • GDPR          │  │  │
│  │  │ • Unsubscribe   │    │                  │    │ • Headers       │  │  │
│  │  └─────────────────┘    └──────────────────┘    └─────────────────┘  │  │
│  │           │                        │                        │           │  │
│  │           ▼                        ▼                        ▼           │  │
│  │  ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐  │  │
│  │  │   Rate Limiter  │    │ Status Tracker   │    │ Fallback Service│  │  │
│  │  │                 │    │                  │    │                 │  │  │
│  │  │ • Per Dest      │    │ • Delivery       │    │ • Push/Email    │  │  │
│  │  │ • Per Provider  │    │ • Receipts       │    │ • Multi-channel │  │  │
│  │  │ • Cost Mgmt     │    │ • Analytics      │    │ • Timeout Mgmt  │  │  │
│  │  └─────────────────┘    └──────────────────┘    └─────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## 🚀 Production Ready

- Horizontal scaling support
- Docker containerization
- Kubernetes deployment ready
- Comprehensive error handling
- Graceful degradation
- High availability design

---

**Built with ❤️ for the Coinet Platform - Divine World-Class Email Service**

