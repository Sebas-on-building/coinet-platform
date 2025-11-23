import { Request, Response, NextFunction } from 'express';

export function requireRole(role: string) {
  return (req: any, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === role) return next();
    res.status(403).json({ error: 'Forbidden' });
  };
}

export function rbacMiddleware(req: any, res: Response, next: NextFunction) {
  // Attach user roles from JWT/session if available
  next();
} 