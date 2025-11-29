const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const pool = new Pool({
    host: process.env.TIMESCALE_HOST || 'postgresql.coinet-production.svc.cluster.local',
    port: parseInt(process.env.TIMESCALE_PORT || '5432'),
    database: process.env.TIMESCALE_DB || 'coinet_timeseries',
    user: process.env.TIMESCALE_USER || 'coinet_user',
    password: process.env.TIMESCALE_PASSWORD || 'coinet_pass',
    connectionTimeoutMillis: 5000,
  });

  try {
    const sql = `
-- Coinet v1 Authentication & Persistence Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS briefs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_briefs_user_created ON briefs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_briefs_symbol ON briefs(symbol);
`;
    
    console.log('🗄️ Running database migrations...');
    await pool.query(sql);
    console.log('✅ Database migrations completed');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

if (require.main === module) {
  runMigrations().catch(console.error);
}

module.exports = { runMigrations };
