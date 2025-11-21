import { Request, Response, NextFunction } from 'express';

const allowedOrigins = [
  'https://coinet.co',
  'https://admin.coinet.co',
  // Add more trusted origins here
];

export function cors(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    return next();
  }
  res.status(403).json({ error: 'CORS: Origin not allowed' });
}
// Usage: app.use(cors); 