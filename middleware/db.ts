import knex from 'knex';
import config from '../knexfile';
import { Request, Response, NextFunction } from 'express';

const db = knex(config);

export function attachDb(req: Request, res: Response, next: NextFunction) {
  (req as any).db = db;
  next();
} 