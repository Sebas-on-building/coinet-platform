import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // Log error, mask sensitive info
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
} 