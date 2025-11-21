import { Request, Response, NextFunction } from 'express';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions?: string[];
  };
}

export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (req.user?.permissions?.includes(permission)) {
      next();
      return;
    }
    res.status(403).json({ error: 'Forbidden: permission required' });
  };
}

export function requireAnyRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (req.user?.role && roles.includes(req.user.role)) {
      next();
      return;
    }
    res.status(403).json({ error: 'Forbidden: role required' });
  };
} 