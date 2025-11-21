import express from 'express';
import { createTransaction, getTransactionsByPortfolio, updateTransaction, deleteTransaction } from './service';

const router = express.Router();

// Create transaction
router.post('/', async (req, res) => {
  const { portfolioId, symbol, side, quantity, price, executedAt } = req.body;
  const transaction = await createTransaction(portfolioId, symbol, side, quantity, price, new Date(executedAt));
  res.json(transaction);
});

// Get transactions by portfolio
router.get('/portfolio/:portfolioId', async (req, res) => {
  const { portfolioId } = req.params;
  const transactions = await getTransactionsByPortfolio(portfolioId);
  res.json(transactions);
});

// Update transaction
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const updated = await updateTransaction(id, data);
  res.json(updated);
});

// Delete transaction
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  await deleteTransaction(id);
  res.json({ success: true });
});

export default router; 