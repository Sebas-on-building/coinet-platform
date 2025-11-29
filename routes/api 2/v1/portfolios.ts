import express from 'express';
import { getUserPortfolios, getPortfolioHoldings, addTransaction } from '../../../services/db/portfolio';
import { cacheQuery } from '../../../services/cache';
import { injectDb, requireAuth } from '../../../middleware/dbAndUser';

const router = express.Router();
router.use(injectDb);
router.use(requireAuth);

// Create portfolio
router.post('/', async (req, res) => {
  const { name } = req.body;
  const userId = req.user!.id;
  const [portfolio] = await req.db('portfolios').insert({ user_id: userId, name }).returning('*');
  res.json(portfolio);
});

// List user portfolios
router.get('/', async (req, res) => {
  const userId = req.user!.id;
  const portfolios = await getUserPortfolios(userId);
  res.json(portfolios);
});

// Get portfolio details
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const portfolio = await req.db('portfolios').where({ id }).first();
  const holdings = await getPortfolioHoldings(id);
  res.json({ ...portfolio, holdings });
});

// Update (rename) portfolio
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const [portfolio] = await req.db('portfolios').where({ id }).update({ name }).returning('*');
  res.json(portfolio);
});

// Delete portfolio
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  await req.db('portfolios').where({ id }).del();
  res.json({ ok: true });
});

// Add/update holdings
router.post('/:id/holdings', async (req, res) => {
  const { id } = req.params;
  const { symbol, quantity, avg_cost } = req.body;
  const [holding] = await req.db('portfolio_holdings')
    .insert({ portfolio_id: id, symbol, quantity, avg_cost })
    .onConflict(['portfolio_id', 'symbol'])
    .merge()
    .returning('*');
  res.json(holding);
});

// Remove a holding
router.delete('/:id/holdings/:holdingId', async (req, res) => {
  const { holdingId } = req.params;
  await req.db('portfolio_holdings').where({ id: holdingId }).del();
  res.json({ ok: true });
});

export default router; 