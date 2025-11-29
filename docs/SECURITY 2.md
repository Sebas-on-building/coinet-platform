# Security & Compliance

## Architecture
- All sensitive data is encrypted in transit (HTTPS enforced)
- API endpoints are protected by authentication and rate limiting
- Database access is restricted and parameterized

## OWASP Testing
- Automated OWASP ZAP scans run on every PR and push to main/master
- Results are reviewed and critical issues are fixed before deployment

## Secrets Scanning
- GitGuardian and similar tools scan all code for secrets on every PR and push
- Developers must never commit secrets or API keys

## HTTPS Redirects
- All HTTP traffic is redirected to HTTPS in production
- Middleware: `src/middleware/httpsRedirect.ts`

## Content Security Policy
- Strict CSP headers are set for all web UI responses
- Middleware: `src/middleware/contentSecurityPolicy.ts`

## Incident Response Runbook
1. Triage: Identify and assess the incident
2. Contain: Limit the blast radius (revoke keys, block access)
3. Eradicate: Remove the vulnerability or threat
4. Recover: Restore systems and monitor
5. Postmortem: Document and improve

## Contact
- Security team: security@coinet.com 