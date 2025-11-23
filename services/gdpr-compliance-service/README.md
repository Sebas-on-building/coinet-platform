# GDPR Compliance Service

## 🚀 Enterprise-Grade GDPR Compliance & Privacy Management

The GDPR Compliance Service provides comprehensive privacy and data protection capabilities for the Coinet AI Platform, ensuring full compliance with GDPR and other privacy regulations.

## 🌟 Features

### ✅ GDPR Article Compliance

- **Article 7**: Consent Management - Granular consent collection and withdrawal
- **Article 15**: Right of Access - Complete data export and access capabilities
- **Article 17**: Right to Erasure - Secure account and data deletion
- **Article 20**: Data Portability - Export data in multiple formats (JSON, CSV, PDF, XML)
- **Article 21**: Right to Object - Consent withdrawal and processing objection
- **Article 25**: Data Protection by Design - Built-in privacy controls

### 🔒 Advanced Privacy Features

- **Consent Lifecycle Management**: Track consent versions, expiry, and withdrawal reasons
- **Data Anonymization**: Pseudonymize personal data while preserving analytics value
- **Data Residency Controls**: Ensure EU user data stays within EU boundaries
- **Privacy Audit Logging**: Immutable audit trails for all privacy-related actions
- **Automated Data Retention**: Configurable retention policies with auto-cleanup
- **Third-Party Compliance**: Monitor and enforce GDPR compliance for external processors

### 📊 Compliance Monitoring

- **Real-time Compliance Dashboard**: Monitor consent rates, data requests, and violations
- **Automated Reporting**: Generate GDPR compliance reports for regulators
- **Audit Trail Search**: Advanced search and filtering of privacy audit logs
- **Compliance Metrics**: Track key privacy KPIs and compliance indicators

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    GDPR Compliance Service                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │   Consent   │  │    GDPR     │  │   Privacy   │  │  Audit  │ │
│  │ Management  │  │   Rights    │  │ Controllers │  │  Logs   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │ Data Export │  │ Anonymization│  │ Data Residency│  │Retention│ │
│  │   Service   │  │   Service   │  │   Controls   │  │Policies │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Prisma    │  │   Winston   │  │   Express   │              │
│  │   Client    │  │    Logger   │  │  Framework  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+ with pgcrypto extension
- Redis (for caching)

### Installation

```bash
# Navigate to the service directory
cd services/gdpr-compliance-service

# Install dependencies
npm install

# Set up database
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

### Configuration

Create a `.env` file based on `.env.example`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/coinet_gdpr

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-32-character-key

# Service Configuration
GDPR_COMPLIANCE_PORT=8009
LOG_LEVEL=info
```

## 📡 API Endpoints

### Consent Management

```http
# Get user consents
GET /api/consent/user

# Grant consent
POST /api/consent/grant
Content-Type: application/json

{
  "consentType": "MARKETING_EMAILS",
  "version": "1.0",
  "consentText": "I consent to receive marketing emails...",
  "expiresAt": "2025-12-31T23:59:59Z"
}

# Withdraw consent
POST /api/consent/withdraw
Content-Type: application/json

{
  "consentType": "ANALYTICS_TRACKING",
  "withdrawalReason": "Changed my mind"
}

# Check consent status
GET /api/consent/check/MARKETING_EMAILS
```

### GDPR Data Rights

```http
# Submit GDPR request
POST /api/gdpr/request
Content-Type: application/json

{
  "requestType": "ACCESS",
  "description": "I want to access my personal data",
  "requestedData": ["personal", "preferences", "activity"]
}

# Get request status
GET /api/gdpr/request/{requestId}

# Export user data
GET /api/gdpr/export?format=JSON&categories=all

# Delete account
POST /api/gdpr/delete
Content-Type: application/json

{
  "confirmDeletion": "DELETE_MY_ACCOUNT_PERMANENTLY",
  "deletionReason": "GDPR erasure request"
}
```

### Privacy Settings

```http
# Get privacy settings
GET /api/privacy/settings

# Update privacy settings
PUT /api/privacy/settings
Content-Type: application/json

{
  "dataProcessingConsent": true,
  "marketingConsent": false,
  "analyticsConsent": true,
  "notificationPreferences": {
    "email": true,
    "push": false,
    "sms": false
  }
}

# Download personal data
GET /api/privacy/download?format=JSON

# Get data retention info
GET /api/privacy/retention-info
```

### Audit & Compliance

```http
# Get user audit logs
GET /api/audit/user?limit=100&category=consent

# Search audit logs (admin only)
GET /api/audit/search?query=data&categories=consent,gdpr

# Generate compliance report (admin only)
GET /api/audit/compliance-report?startDate=2024-01-01&endDate=2024-12-31&format=PDF
```

### Data Retention

```http
# Get retention policies (admin only)
GET /api/retention/policies

# Create retention policy (admin only)
POST /api/retention/policies
Content-Type: application/json

{
  "name": "Personal Data Retention",
  "dataCategory": "personal",
  "retentionPeriod": "DAYS_365",
  "autoDelete": true,
  "description": "Retain personal data for 1 year"
}

# Execute cleanup (admin only)
POST /api/retention/cleanup?dryRun=true
```

### Data Residency

```http
# Get residency rules (admin only)
GET /api/residency/rules

# Create residency rule (admin only)
POST /api/residency/rules
Content-Type: application/json

{
  "name": "EU Data Residency",
  "userRegion": "EU",
  "requiredResidency": "EU",
  "allowedRegions": ["EU", "EEA"],
  "dataCategories": ["personal", "financial"]
}

# Check user compliance
GET /api/residency/compliance/{userId}

# Validate data transfer (admin only)
POST /api/residency/validate-transfer
Content-Type: application/json

{
  "userId": "user-id",
  "targetRegion": "US",
  "dataCategories": ["analytics"],
  "legalBasis": "ADEQUACY_DECISION"
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GDPR_COMPLIANCE_PORT` | Service port | `8009` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `ENCRYPTION_KEY` | Data encryption key | Required |
| `LOG_LEVEL` | Logging level | `info` |
| `AUDIT_RETENTION_DAYS` | Audit log retention | `2555` |

### Database Schema

The service extends the main Prisma schema with GDPR-specific models:

- `UserConsent` - Consent lifecycle management
- `GDPRRequest` - Data subject requests tracking
- `DataRetentionPolicy` - Automated retention rules
- `DataResidencyRule` - Data localization controls
- `PrivacyAuditLog` - Immutable privacy audit trail

## 🔒 Security Features

- **End-to-End Encryption**: All sensitive data encrypted at rest
- **Rate Limiting**: GDPR endpoints have strict rate limits
- **Audit Logging**: All privacy actions are immutably logged
- **Access Controls**: Role-based permissions for admin functions
- **Data Anonymization**: Personal data can be pseudonymized
- **Secure Exports**: Data exports use secure, time-limited URLs

## 📈 Monitoring & Analytics

### Key Metrics

- Consent grant/withdrawal rates
- GDPR request fulfillment times
- Data deletion compliance rates
- Privacy violation incidents
- Audit log integrity checks

### Health Checks

```bash
# Service health
GET /health

# Database connectivity
GET /api/admin/health/db

# Compliance status
GET /api/admin/compliance/status
```

## 🚨 Compliance Alerts

The service can be configured to send alerts for:

- Consent withdrawal spikes
- GDPR request backlogs
- Data residency violations
- Retention policy breaches
- Audit log tampering attempts

## 🔄 Integration Examples

### Third-Party Processor Management

```typescript
// Register third-party processor
await gdprService.registerThirdPartyProcessor({
  name: 'Analytics Provider',
  purpose: 'Website analytics',
  dataCategories: ['usage', 'performance'],
  gdprCompliant: true,
  dpaSigned: true,
  contactInfo: 'privacy@provider.com'
});
```

### Consent Integration

```typescript
// Check consent before processing
const hasConsent = await consentService.checkConsent(
  userId,
  'ANALYTICS_TRACKING'
);

if (hasConsent) {
  // Process analytics data
  await analyticsService.track(event);
}
```

## 📋 GDPR Compliance Checklist

- ✅ **Lawful Basis**: All data processing has legal basis (consent/contract/legitimate interest)
- ✅ **Purpose Limitation**: Data collected only for specified, legitimate purposes
- ✅ **Data Minimization**: Only necessary data collected and retained
- ✅ **Accuracy**: Personal data kept accurate and up-to-date
- ✅ **Storage Limitation**: Data retained no longer than necessary
- ✅ **Integrity & Confidentiality**: Appropriate security measures implemented
- ✅ **Accountability**: Comprehensive records of processing activities

## 🛠️ Development

### Project Structure

```
services/gdpr-compliance-service/
├── src/
│   ├── controllers/        # API endpoint handlers
│   │   ├── ConsentController.ts
│   │   ├── GDPRController.ts
│   │   ├── PrivacyController.ts
│   │   ├── AuditController.ts
│   │   ├── DataRetentionController.ts
│   │   └── DataResidencyController.ts
│   ├── services/          # Business logic
│   │   ├── ConsentService.ts
│   │   ├── GDPRService.ts
│   │   ├── DataExportService.ts
│   │   └── AuditService.ts
│   ├── middleware/        # Custom middleware
│   ├── types/            # TypeScript definitions
│   └── utils/            # Utility functions
├── prisma/
│   └── schema.prisma      # Database schema
├── tests/                # Test suites
└── docs/                 # Documentation
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## 📞 Support

For GDPR compliance questions or issues:

- **Email**: privacy@coinet.ai
- **Slack**: #gdpr-compliance
- **Documentation**: [GDPR Compliance Guide](https://docs.coinet.ai/gdpr)

## 📜 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ for privacy and compliance**
