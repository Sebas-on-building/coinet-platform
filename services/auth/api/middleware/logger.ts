import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

// Type augmentation for Express Request to add correlationId is provided in types/express/index.d.ts

export const logger = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers['x-correlation-id'];
  req.correlationId = Array.isArray(header) ? header[0] : header || uuidv4();
  winston.info(`[${req.correlationId}] ${req.method} ${req.url}`);
  next();
}; 