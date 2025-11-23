import express from 'express';
import { createHolding, getHoldingsByPortfolio, updateHolding, deleteHolding } from './service';

const router = express.Router();

// Create holding
router.post('/', async (req, res) => {
  const { portfolioId, symbol, quantity, avgCost } = req.body;
  const holding = await createHolding(portfolioId, symbol, quantity, avgCost);
  res.json(holding);
});

// Get holdings by portfolio
router.get('/portfolio/:portfolioId', async (req, res) => {
  const { portfolioId } = req.params;
  const holdings = await getHoldingsByPortfolio(portfolioId);
  res.json(holdings);
});

// Update holding
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { quantity, avgCost } = req.body;
  const updated = await updateHolding(id, quantity, avgCost);
  res.json(updated);
});

// Delete holding
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  await deleteHolding(id);
  res.json({ success: true });
});

export default router; 