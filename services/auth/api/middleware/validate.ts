import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export function validateMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Example: validate login body
  if (req.path === '/login' && req.method === 'POST') {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(8).required(),
    });
    const { error } = schema.validate(req.body);
    if (error) {
      res.status(400).json({ error: error.details[0].message });
      return;
    }
  }
  next();
} 