const fs = require('fs');
const path = require('path');
const { Counter } = require('prom-client');
const os = require('os');

// --- Prometheus Metrics for Secret Usage ---
const secretAccessCounter = new Counter({
  name: 'coinet_secret_access_total',
  help: 'Total secret accesses',
  labelNames: ['secret', 'action', 'status', 'service'],
});

// --- Structured Audit Log Writer ---
function writeAuditLog({ user, action, resource, status, meta = {} }) {
  const entry = {
    timestamp: new Date().toISOString(),
    host: os.hostname(),
    pid: process.pid,
    user,
    action,
    resource,
    status,
    ...meta,
  };
  const logLine = JSON.stringify(entry) + '\n';
  // Write to file (append), or send to SIEM
  fs.appendFileSync(path.join(__dirname, '../../logs/audit.log'), logLine);
}

// --- Audit Secret Access ---
function auditSecretAccess({ user, secret, action, status, meta = {} }) {
  writeAuditLog({ user, action: `secret:${action}`, resource: secret, status, meta });
  secretAccessCounter.inc({ secret, action, status, service: meta.service || 'unknown' });
}

// --- Audit Secret Rotation ---
function auditSecretRotation({ user, secret, status, meta = {} }) {
  writeAuditLog({ user, action: 'secret:rotate', resource: secret, status, meta });
  secretAccessCounter.inc({ secret, action: 'rotate', status, service: meta.service || 'unknown' });
}

module.exports = {
  writeAuditLog,
  auditSecretAccess,
  auditSecretRotation,
  secretAccessCounter,
}; 