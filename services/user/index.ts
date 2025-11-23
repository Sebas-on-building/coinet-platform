import express from 'express';
import { getUserById, updateUser, getUserPreferences, updateUserPreferences, getUserBilling } from './userStore';

const app = express();
app.use(express.json());

app.get('/users/:id', async (req, res) => {
  const user = await getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

app.put('/users/:id', async (req, res) => {
  const user = await updateUser(req.params.id, req.body);
  res.json(user);
});

app.get('/users/:id/preferences', async (req, res) => {
  const prefs = await getUserPreferences(req.params.id);
  res.json(prefs);
});

app.put('/users/:id/preferences', async (req, res) => {
  const prefs = await updateUserPreferences(req.params.id, req.body);
  res.json(prefs);
});

app.get('/users/:id/billing', async (req, res) => {
  const billing = await getUserBilling(req.params.id);
  res.json(billing);
});

app.listen(4001, () => console.log('UserService running on port 4001')); 