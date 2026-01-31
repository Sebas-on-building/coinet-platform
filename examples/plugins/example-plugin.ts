import { Express } from 'express';

export function examplePlugin(app: Express) {
  app.get('/auth/example', (req, res) => {
    res.json({ message: 'Example plugin auth method' });
  });
} 