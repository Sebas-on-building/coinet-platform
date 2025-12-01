-- Phase 3: User Memory System Migration
-- Creates tables for persistent user memory, portfolio, and watchlist

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "MemoryCategory" AS ENUM ('preference', 'portfolio', 'watchlist', 'goal', 'context', 'interaction', 'insight');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable: user_memories
CREATE TABLE IF NOT EXISTS "user_memories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "MemoryCategory" NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "source" TEXT,
    "lastAccessed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "user_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable: user_portfolio
CREATE TABLE IF NOT EXISTS "user_portfolio" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "avgCost" DOUBLE PRECISION,
    "exchange" TEXT,
    "wallet" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable: user_watchlist
CREATE TABLE IF NOT EXISTS "user_watchlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT,
    "targetBuy" DOUBLE PRECISION,
    "targetSell" DOUBLE PRECISION,
    "notes" TEXT,
    "alertEnabled" BOOLEAN NOT NULL DEFAULT true,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: user_memories
CREATE UNIQUE INDEX IF NOT EXISTS "user_memories_userId_category_key_key" ON "user_memories"("userId", "category", "key");
CREATE INDEX IF NOT EXISTS "user_memories_userId_idx" ON "user_memories"("userId");
CREATE INDEX IF NOT EXISTS "user_memories_userId_category_idx" ON "user_memories"("userId", "category");

-- CreateIndex: user_portfolio
CREATE UNIQUE INDEX IF NOT EXISTS "user_portfolio_userId_symbol_exchange_key" ON "user_portfolio"("userId", "symbol", "exchange");
CREATE INDEX IF NOT EXISTS "user_portfolio_userId_idx" ON "user_portfolio"("userId");

-- CreateIndex: user_watchlist
CREATE UNIQUE INDEX IF NOT EXISTS "user_watchlist_userId_symbol_key" ON "user_watchlist"("userId", "symbol");
CREATE INDEX IF NOT EXISTS "user_watchlist_userId_idx" ON "user_watchlist"("userId");

