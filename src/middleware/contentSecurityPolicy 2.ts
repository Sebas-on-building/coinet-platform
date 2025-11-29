import { Request, Response, NextFunction } from 'express';

export function contentSecurityPolicy(req: Request, res: Response, next: NextFunction) {
  res.setHeader('Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "connect-src 'self' wss://*",
      "frame-ancestors 'none'"
    ].join('; ')
  );
  next();
} 