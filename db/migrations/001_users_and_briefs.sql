-- Coinet v1 Authentication & Persistence Schema
-- Run once on startup (idempotent)

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

-- Insert test user (password: Test123!@#)
INSERT INTO users (email, password_hash) 
VALUES ('founder@coinet.ai', '$argon2id$v=19$m=65536,t=3,p=4$randomsalthere$hashedpasswordhere')
ON CONFLICT (email) DO NOTHING;
