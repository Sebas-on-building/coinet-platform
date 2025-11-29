import express from 'express';
import { createPortfolio, getPortfoliosByUser, updatePortfolioName, deletePortfolio } from '../service';

const router = express.Router();

// Create portfolio
router.post('/', async (req, res) => {
  const { userId, name } = req.body;
  const portfolio = await createPortfolio(userId, name);
  res.json(portfolio);
});

// Get portfolios by user
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  const portfolios = await getPortfoliosByUser(userId);
  res.json(portfolios);
});

// Update portfolio name
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const updated = await updatePortfolioName(id, name);
  res.json(updated);
});

// Delete portfolio
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  await deletePortfolio(id);
  res.json({ success: true });
});

export default router; 