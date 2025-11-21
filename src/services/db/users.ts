import { pool } from './pool';

export async function getUserByEmail(email: string) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0];
}

export async function addUser(email: string, passwordHash: string, name?: string) {
  const { rows } = await pool.query(
    'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING *',
    [email, passwordHash, name]
  );
  return rows[0];
}

export async function getUserById(id: number) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0];
} 