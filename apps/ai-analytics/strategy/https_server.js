const fs = require('fs');
const https = require('https');
const path = require('path');
const express = require('express');
const { Logger } = require('./logger');
const logger = new Logger('https-server');

// --- Load TLS Certificates (Let's Encrypt or custom) ---
function loadTLSCerts() {
  // Example: Use environment variables or default paths
  const keyPath = process.env.TLS_KEY_PATH || path.join(__dirname, '../../certs/privkey.pem');
  const certPath = process.env.TLS_CERT_PATH || path.join(__dirname, '../../certs/fullchain.pem');
  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
}

// --- Create HTTPS Server with HSTS ---
function createHTTPSServer(app) {
  const creds = loadTLSCerts();
  const server = https.createServer(creds, app);
  // HSTS header for all responses
  app.use((req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    next();
  });
  return server;
}

// --- Exported API ---
module.exports = {
  loadTLSCerts,
  createHTTPSServer,
}; 