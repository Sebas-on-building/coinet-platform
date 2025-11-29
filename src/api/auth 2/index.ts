import { Router } from 'express';
import Joi from 'joi';
import jwt from 'jsonwebtoken';

const router = Router();

// Example: Login endpoint
router.post('/login', async (req, res) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  // TODO: Authenticate user
  // const user = await UserService.login(value.email, value.password);
  // if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  // const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: '1h' });
  // return res.json({ token });
  return res.json({ token: 'mock-jwt-token' });
});

// Example: Register endpoint
router.post('/register', async (req, res) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    name: Joi.string().min(2).required(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  // TODO: Register user
  // const user = await UserService.register(value);
  // const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: '1h' });
  // return res.json({ token });
  return res.json({ token: 'mock-jwt-token' });
});

export default router; 