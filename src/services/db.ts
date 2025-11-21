import { Pool } from 'pg';
const pool = new Pool();

// Safe parameterized query
export async function safeQuery(text: string, params: any[]) {
  return pool.query(text, params);
}

// Example usage:
// await safeQuery('SELECT * FROM users WHERE email = $1', [email]); 