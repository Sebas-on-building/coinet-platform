import { Request, Response, NextFunction } from 'express';

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.permissions?.includes(permission)) return next();
    return res.status(403).json({ error: 'Forbidden: permission required' });
  };
}

export function requireAnyPermission(permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.permissions?.some(p => permissions.includes(p))) return next();
    return res.status(403).json({ error: 'Forbidden: one of permissions required' });
  };
} 