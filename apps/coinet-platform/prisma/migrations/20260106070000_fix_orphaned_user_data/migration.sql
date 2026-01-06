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
-- Handle duplicates: Multiple orphaned records with same (category, key) will conflict when updated to system user
-- Solution: Delete duplicates BEFORE updating, keeping only the oldest record per (category, key)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_memories') THEN
        -- First, delete duplicate orphaned records
        -- Partition by (category, key) only (not userId) since all will become system user
        -- Keep the oldest record per (category, key) combination
        DELETE FROM "user_memories" 
        WHERE "id" IN (
            SELECT "id" FROM (
                SELECT "id", 
                       ROW_NUMBER() OVER (
                           PARTITION BY "category", "key" 
                           ORDER BY "createdAt" ASC
                       ) as rn
                FROM "user_memories"
                WHERE "userId" NOT IN (SELECT "id" FROM "users")
            ) t
            WHERE rn > 1
        );
        
        -- Then update remaining orphaned records to system user
        -- This is safe now because we've ensured only one record per (category, key) exists
        UPDATE "user_memories" 
        SET "userId" = 'system-orphaned-user'
        WHERE "userId" NOT IN (SELECT "id" FROM "users");
    END IF;
END $$;

-- Fix orphaned user_portfolio
-- Handle duplicates: Multiple orphaned records with same (symbol, exchange) will conflict
-- Unique constraint: (userId, symbol, exchange)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_portfolio') THEN
        -- Delete duplicate orphaned records (keep the oldest one per symbol/exchange)
        DELETE FROM "user_portfolio" 
        WHERE "id" IN (
            SELECT "id" FROM (
                SELECT "id", 
                       ROW_NUMBER() OVER (
                           PARTITION BY "symbol", COALESCE("exchange", '') 
                           ORDER BY "addedAt" ASC
                       ) as rn
                FROM "user_portfolio"
                WHERE "userId" NOT IN (SELECT "id" FROM "users")
            ) t
            WHERE rn > 1
        );
        
        -- Then update remaining orphaned records to system user
        UPDATE "user_portfolio" 
        SET "userId" = 'system-orphaned-user'
        WHERE "userId" NOT IN (SELECT "id" FROM "users");
    END IF;
END $$;

-- Fix orphaned user_watchlist
-- Handle duplicates: Multiple orphaned records with same symbol will conflict
-- Unique constraint: (userId, symbol)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_watchlist') THEN
        -- Delete duplicate orphaned records (keep the oldest one per symbol)
        DELETE FROM "user_watchlist" 
        WHERE "id" IN (
            SELECT "id" FROM (
                SELECT "id", 
                       ROW_NUMBER() OVER (
                           PARTITION BY "symbol" 
                           ORDER BY "addedAt" ASC
                       ) as rn
                FROM "user_watchlist"
                WHERE "userId" NOT IN (SELECT "id" FROM "users")
            ) t
            WHERE rn > 1
        );
        
        -- Then update remaining orphaned records to system user
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
