import { Request, Response, NextFunction } from 'express';

const supportedVersions: string[] = ['v1'];
const deprecatedVersions: string[] = [];

export function enforceVersioning(req: Request, res: Response, next: NextFunction): void {
  const version = req.baseUrl.split('/')[1];
  if (!supportedVersions.includes(version)) {
    if (deprecatedVersions.includes(version)) {
      res.status(426).json({ error: 'API version deprecated. Please upgrade.' });
      return;
    }
    res.status(400).json({ error: 'API version missing or unsupported.' });
    return;
  }
  next();
}

// Usage:
// app.use('/api/v1', enforceVersioning, v1Router)
// app.use('/api/v2', enforceVersioning, v2Router) 