import knex from 'knex';

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
});

export interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export async function getById(id: string): Promise<Portfolio | null> {
  const result = await db<Portfolio>('portfolios').where({ id }).first();
  return result || null;
}

export async function create(user_id: string, name: string): Promise<Portfolio> {
  const [portfolio] = await db<Portfolio>('portfolios')
    .insert({ user_id, name })
    .returning('*');
  return portfolio;
}

export async function update(id: string, name: string): Promise<Portfolio | null> {
  const [portfolio] = await db<Portfolio>('portfolios')
    .where({ id })
    .update({ name, updated_at: db.fn.now() })
    .returning('*');
  return portfolio || null;
}

export async function remove(id: string): Promise<boolean> {
  const count = await db<Portfolio>('portfolios').where({ id }).del();
  return count > 0;
}

export async function listByUser(user_id: string): Promise<Portfolio[]> {
  return db<Portfolio>('portfolios').where({ user_id });
} 