-- =============================================================================
-- ADD USER AND SESSION MODELS FOR AUTHENTICATION
-- =============================================================================
-- Migration to add User and Session models for JWT-based authentication
-- =============================================================================

-- Create UserRole enum (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
        CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'MODERATOR');
    END IF;
END $$;

-- Create UserTier enum (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserTier') THEN
        CREATE TYPE "UserTier" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');
    END IF;
END $$;

-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "tier" "UserTier" NOT NULL DEFAULT 'FREE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "avatar" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_active_idx" ON "users"("active");

CREATE UNIQUE INDEX IF NOT EXISTS "sessions_token_key" ON "sessions"("token");
CREATE INDEX IF NOT EXISTS "sessions_userId_idx" ON "sessions"("userId");
CREATE INDEX IF NOT EXISTS "sessions_token_idx" ON "sessions"("token");
CREATE INDEX IF NOT EXISTS "sessions_expiresAt_idx" ON "sessions"("expiresAt");
CREATE INDEX IF NOT EXISTS "sessions_isActive_idx" ON "sessions"("isActive");

-- Add foreign key constraints (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'sessions_userId_fkey'
    ) THEN
        ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Handle existing user_preferences: Create placeholder users for orphaned preferences
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        IF EXISTS (SELECT 1 FROM "user_preferences" WHERE "userId" NOT IN (SELECT "id" FROM "users")) THEN
            -- Ensure system user exists
            INSERT INTO "users" ("id", "email", "password", "role", "tier", "active", "name", "createdAt", "updatedAt")
            VALUES ('system-orphaned-user', 'system@coinet.ai', '$2a$12$placeholder', 'USER', 'FREE', false, 'System User (Orphaned Data)', NOW(), NOW())
            ON CONFLICT ("id") DO NOTHING;
            
            -- Update orphaned preferences
            UPDATE "user_preferences" 
            SET "userId" = 'system-orphaned-user'
            WHERE "userId" NOT IN (SELECT "id" FROM "users");
        END IF;
    END IF;
END $$;

-- Add foreign key to user_preferences if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_preferences_userId_fkey'
    ) THEN
        ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Handle existing conversations: Create placeholder users for orphaned conversations
-- This must happen BEFORE adding foreign key constraints
DO $$
BEGIN
    -- Ensure users table exists first
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        -- Create a system user for orphaned data (only if users table exists and has orphaned data)
        IF EXISTS (SELECT 1 FROM "conversations" WHERE "userId" NOT IN (SELECT "id" FROM "users")) THEN
            -- Create a system user for orphaned data
            INSERT INTO "users" ("id", "email", "password", "role", "tier", "active", "name", "createdAt", "updatedAt")
            VALUES ('system-orphaned-user', 'system@coinet.ai', '$2a$12$placeholder', 'USER', 'FREE', false, 'System User (Orphaned Data)', NOW(), NOW())
            ON CONFLICT ("id") DO NOTHING;
            
            -- Update orphaned conversations to use the system user
            UPDATE "conversations" 
            SET "userId" = 'system-orphaned-user'
            WHERE "userId" NOT IN (SELECT "id" FROM "users");
        END IF;
    END IF;
END $$;

-- Add foreign key to conversations if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'conversations_userId_fkey'
    ) THEN
        ALTER TABLE "conversations" ADD CONSTRAINT "conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Handle existing agents: Create placeholder users for orphaned agents
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        IF EXISTS (SELECT 1 FROM "agents" WHERE "userId" NOT IN (SELECT "id" FROM "users")) THEN
            -- Ensure system user exists
            INSERT INTO "users" ("id", "email", "password", "role", "tier", "active", "name", "createdAt", "updatedAt")
            VALUES ('system-orphaned-user', 'system@coinet.ai', '$2a$12$placeholder', 'USER', 'FREE', false, 'System User (Orphaned Data)', NOW(), NOW())
            ON CONFLICT ("id") DO NOTHING;
            
            -- Update orphaned agents
            UPDATE "agents" 
            SET "userId" = 'system-orphaned-user'
            WHERE "userId" NOT IN (SELECT "id" FROM "users");
        END IF;
    END IF;
END $$;

-- Add foreign key to agents if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'agents_userId_fkey'
    ) THEN
        ALTER TABLE "agents" ADD CONSTRAINT "agents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Handle existing alerts: Create placeholder users for orphaned alerts
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        IF EXISTS (SELECT 1 FROM "alerts" WHERE "userId" NOT IN (SELECT "id" FROM "users")) THEN
            -- Ensure system user exists
            INSERT INTO "users" ("id", "email", "password", "role", "tier", "active", "name", "createdAt", "updatedAt")
            VALUES ('system-orphaned-user', 'system@coinet.ai', '$2a$12$placeholder', 'USER', 'FREE', false, 'System User (Orphaned Data)', NOW(), NOW())
            ON CONFLICT ("id") DO NOTHING;
            
            -- Update orphaned alerts
            UPDATE "alerts" 
            SET "userId" = 'system-orphaned-user'
            WHERE "userId" NOT IN (SELECT "id" FROM "users");
        END IF;
    END IF;
END $$;

-- Add foreign key to alerts if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'alerts_userId_fkey'
    ) THEN
        ALTER TABLE "alerts" ADD CONSTRAINT "alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
