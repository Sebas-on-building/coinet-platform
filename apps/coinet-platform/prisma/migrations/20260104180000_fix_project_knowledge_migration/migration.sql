-- Fix failed migration: 20251216180000_add_project_knowledge
-- This migration resolves the failed state and ensures tables match schema

-- Step 1: Drop tables if they exist (from partial migration)
DROP TABLE IF EXISTS "project_research_logs" CASCADE;
DROP TABLE IF EXISTS "project_knowledge" CASCADE;

-- Step 2: Create project_knowledge table with correct schema
CREATE TABLE "project_knowledge" (
    "id" TEXT NOT NULL,
    "projectId" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200),
    "symbol" VARCHAR(20),
    "ticker" VARCHAR(20),
    "aliases" TEXT[],
    "description" TEXT,
    "category" VARCHAR(50),
    "website" VARCHAR(500),
    "whitepaper" VARCHAR(500),
    "teamInfo" JSONB,
    "foundedDate" TIMESTAMP(3),
    "headquarters" VARCHAR(200),
    "partnerships" JSONB,
    "backers" JSONB,
    "audits" JSONB,
    "securityScore" INTEGER,
    "bugBounty" BOOLEAN DEFAULT false,
    "bugBountyUrl" VARCHAR(500),
    "governanceType" VARCHAR(50),
    "governanceUrl" VARCHAR(500),
    "votingPlatform" VARCHAR(100),
    "socialLinks" JSONB,
    "blockchain" VARCHAR(100),
    "contractAddresses" JSONB,
    "codeRepository" VARCHAR(500),
    "isOpenSource" BOOLEAN DEFAULT false,
    "researchDepth" INTEGER NOT NULL DEFAULT 1,
    "lastResearchType" VARCHAR(50),
    "dataQuality" DOUBLE PRECISION,
    "sourcesUsed" TEXT[],
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" VARCHAR(100),
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastResearchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_knowledge_pkey" PRIMARY KEY ("id")
);

-- Step 3: Create project_research_logs table
CREATE TABLE "project_research_logs" (
    "id" TEXT NOT NULL,
    "projectId" VARCHAR(100) NOT NULL,
    "researchType" VARCHAR(50) NOT NULL,
    "query" TEXT,
    "findings" JSONB NOT NULL,
    "sourcesUsed" TEXT[],
    "confidence" DOUBLE PRECISION,
    "fieldsUpdated" TEXT[],
    "dataAdded" BOOLEAN NOT NULL DEFAULT false,
    "dataRefined" BOOLEAN NOT NULL DEFAULT false,
    "triggeredBy" VARCHAR(50),
    "userId" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_research_logs_pkey" PRIMARY KEY ("id")
);

-- Step 4: Create indexes
CREATE UNIQUE INDEX "project_knowledge_projectId_key" ON "project_knowledge"("projectId");
CREATE INDEX "project_knowledge_projectId_idx" ON "project_knowledge"("projectId");
CREATE INDEX "project_knowledge_category_idx" ON "project_knowledge"("category");
CREATE INDEX "project_knowledge_lastResearchedAt_idx" ON "project_knowledge"("lastResearchedAt" DESC);
CREATE INDEX "project_knowledge_researchDepth_idx" ON "project_knowledge"("researchDepth");

CREATE INDEX "project_research_logs_projectId_createdAt_idx" ON "project_research_logs"("projectId", "createdAt" DESC);
CREATE INDEX "project_research_logs_researchType_idx" ON "project_research_logs"("researchType");
CREATE INDEX "project_research_logs_createdAt_idx" ON "project_research_logs"("createdAt" DESC);

-- Step 5: Add foreign key constraint
ALTER TABLE "project_research_logs" ADD CONSTRAINT "project_research_logs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project_knowledge"("projectId") ON DELETE CASCADE ON UPDATE CASCADE;
