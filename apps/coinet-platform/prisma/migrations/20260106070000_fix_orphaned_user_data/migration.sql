-- =============================================================================
-- FIX ORPHANED USER DATA
-- =============================================================================
-- This migration ensures all orphaned user data is assigned to the system user
-- This should be run after the user/session migration to clean up any remaining issues
-- =============================================================================

-- Ensure system user exists
INSERT INTO "users" ("id", "email", "password", "role", "tier", "active", "name", "createdAt", "updatedAt")
VALUES ('system-orphaned-user', 'system@coinet.ai', '$2a$12$placeholder', 'USER', 'FREE', false, 'System User (Orphaned Data)', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

-- Fix orphaned user_memories
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_memories') THEN
        UPDATE "user_memories" 
        SET "userId" = 'system-orphaned-user'
        WHERE "userId" NOT IN (SELECT "id" FROM "users");
    END IF;
END $$;

-- Fix orphaned user_portfolio
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_portfolio') THEN
        UPDATE "user_portfolio" 
        SET "userId" = 'system-orphaned-user'
        WHERE "userId" NOT IN (SELECT "id" FROM "users");
    END IF;
END $$;

-- Fix orphaned user_watchlist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_watchlist') THEN
        UPDATE "user_watchlist" 
        SET "userId" = 'system-orphaned-user'
        WHERE "userId" NOT IN (SELECT "id" FROM "users");
    END IF;
END $$;

-- Ensure foreign key constraints exist (idempotent)
DO $$
BEGIN
    -- user_memories foreign key
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_memories') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_memories_userId_fkey') THEN
            ALTER TABLE "user_memories" ADD CONSTRAINT "user_memories_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
    
    -- user_portfolio foreign key
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_portfolio') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_portfolio_userId_fkey') THEN
            ALTER TABLE "user_portfolio" ADD CONSTRAINT "user_portfolio_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
    
    -- user_watchlist foreign key
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_watchlist') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_watchlist_userId_fkey') THEN
            ALTER TABLE "user_watchlist" ADD CONSTRAINT "user_watchlist_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;
