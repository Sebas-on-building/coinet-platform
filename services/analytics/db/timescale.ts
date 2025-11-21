import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.TIMESCALEDB_URL || 'postgres://user:pass@localhost:5432/timescale',
  max: 10,
  idleTimeoutMillis: 30000,
});

export async function query(text: string, params?: any[]) {
  const res = await pool.query(text, params);
  return res.rows;
}

export { pool }; 