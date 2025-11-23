import { pool } from './pool';

export async function listHoldings(userId: number) {
  const { rows } = await pool.query('SELECT * FROM holdings WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
  return rows;
}

export async function addHolding(userId: number, symbol: string, amount: number, price: number) {
  const { rows } = await pool.query(
    'INSERT INTO holdings (user_id, symbol, amount, price) VALUES ($1, $2, $3, $4) RETURNING *',
    [userId, symbol, amount, price]
  );
  return rows[0];
}

export async function updateHolding(id: number, userId: number, amount?: number, price?: number) {
  const { rows } = await pool.query(
    'UPDATE holdings SET amount = COALESCE($1, amount), price = COALESCE($2, price) WHERE id = $3 AND user_id = $4 RETURNING *',
    [amount, price, id, userId]
  );
  return rows[0];
}

export async function deleteHolding(id: number, userId: number) {
  await pool.query('DELETE FROM holdings WHERE id = $1 AND user_id = $2', [id, userId]);
} 