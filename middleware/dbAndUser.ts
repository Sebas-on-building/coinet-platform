import knex from 'knex';
import config from '../knexfile';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction, RequestHandler } from 'express';

const db = knex(config);

export const injectDb: RequestHandler = (req, res, next) => {
  req.db = db;
  next();
};

function getJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error('JWT_SECRET must be set in environment (min 32 chars). Generate: openssl rand -base64 32');
  }
  return s;
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) {
    res.status(401).json({ error: 'No token' });
    return;
  }
  const token = auth.split(' ')[1];
  try {
    req.user = jwt.verify(token, getJwtSecret()) as any;
    next();
    return;
  } catch {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
};

export default { injectDb, requireAuth }; 