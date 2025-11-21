import Joi, { ObjectSchema } from 'joi';
import { Request, Response, NextFunction } from 'express';

export function validate(schema: ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({ error: error.details.map(d => d.message) });
    }
    req.body = value;
    next();
  };
}

// Example usage:
// const schema = Joi.object({
//   email: Joi.string().email().max(254).required(),
//   symbol: Joi.string().alphanum().min(2).max(10).required(),
// });
// app.post('/api/route', validate(schema), handler); 