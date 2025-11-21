import knex from 'knex';
import config from '../../knexfile';
import { cacheQuery } from '../cache';

const db = knex(config);

// Get user portfolios
export async function getUserPortfolios(userId: string) {
  return db('portfolios').where({ user_id: userId });
}

// Get portfolio holdings (with cache)
export async function getPortfolioHoldings(portfolioId: string) {
  return cacheQuery(`portfolio:${portfolioId}:holdings`, async () =>
    db('portfolio_holdings').where({ portfolio_id: portfolioId })
    , 10);
}

// Add transaction
export async function addTransaction(tx: any) {
  return db('transactions').insert(tx).returning('*');
} 