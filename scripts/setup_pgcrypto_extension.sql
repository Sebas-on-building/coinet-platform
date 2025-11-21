-- Setup pgcrypto extension for cryptographic functions in audit logging
-- This is required for tamper-proof audit log signatures

-- Enable pgcrypto extension (requires superuser privileges)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Grant usage to coinet_user
GRANT USAGE ON SCHEMA public TO coinet_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO coinet_user;

-- Verify extension is available
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';
