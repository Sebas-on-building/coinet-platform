import { Request, Response, NextFunction } from 'express';

export function enforceHTTPS(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    res.redirect(301, `https://${req.headers.host}${req.url}`);
    return;
  }
  next();
} 