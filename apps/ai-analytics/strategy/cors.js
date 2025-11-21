const allowedOrigins = process.env.COINET_CORS_ORIGINS ? process.env.COINET_CORS_ORIGINS.split(',') : [
  'https://app.coinet.com',
  'https://admin.coinet.com',
  'https://analytics.coinet.com',
];

function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Request-ID');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
  } else if (origin) {
    return res.status(403).json({ error: 'CORS: Origin not allowed' });
  }
  next();
}

module.exports = { corsMiddleware }; 