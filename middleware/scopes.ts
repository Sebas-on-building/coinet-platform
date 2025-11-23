import { Request, Response, NextFunction } from 'express';

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.user?.role === role) {
      next();
      return;
    }
    res.status(403).json({ error: 'Forbidden: role required' });
  };
}

export function requireScope(scope: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.user?.permissions?.includes(scope)) {
      next();
      return;
    }
    res.status(403).json({ error: 'Forbidden: scope required' });
  };
}

// Usage:
// router.get('/admin', requireRole('admin'), handler)
// router.get('/analytics', requireScope('analytics:read'), handler) 