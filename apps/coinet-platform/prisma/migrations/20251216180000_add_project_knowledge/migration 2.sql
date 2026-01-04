-- CreateTable
CREATE TABLE "project_knowledge" (
    "id" TEXT NOT NULL,
    "projectId" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200),
    "symbol" VARCHAR(20),
    "ticker" VARCHAR(20),
    "aliases" TEXT[],
    "description" TEXT,
    "category" VARCHAR(100),
    "sector" VARCHAR(50),
    "teamInfo" JSONB,
    "partnerships" JSONB,
    "backers" JSONB,
    "audits" JSONB,
    "governanceType" VARCHAR(100),
    "socialLinks" JSONB,
    "contractAddresses" JSONB,
    "researchDepth" VARCHAR(20) NOT NULL DEFAULT 'minimal',
    "dataQuality" VARCHAR(20) NOT NULL DEFAULT 'low',
    "sourcesUsed" TEXT[],
    "lastResearchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_knowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_research_logs" (
    "id" TEXT NOT NULL,
    "projectId" VARCHAR(100) NOT NULL,
    "researchType" VARCHAR(50) NOT NULL,
    "findings" JSONB NOT NULL,
    "sourcesUsed" TEXT[],
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "fieldsUpdated" TEXT[],
    "dataAdded" BOOLEAN NOT NULL DEFAULT false,
    "dataRefined" BOOLEAN NOT NULL DEFAULT false,
    "triggeredBy" VARCHAR(100),
    "userId" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_research_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_knowledge_projectId_key" ON "project_knowledge"("projectId");

-- CreateIndex
CREATE INDEX "project_knowledge_sector_idx" ON "project_knowledge"("sector");

-- CreateIndex
CREATE INDEX "project_knowledge_dataQuality_idx" ON "project_knowledge"("dataQuality");

-- CreateIndex
CREATE INDEX "project_knowledge_lastResearchedAt_idx" ON "project_knowledge"("lastResearchedAt");

-- CreateIndex
CREATE INDEX "project_research_logs_projectId_idx" ON "project_research_logs"("projectId");

-- CreateIndex
CREATE INDEX "project_research_logs_createdAt_idx" ON "project_research_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "project_research_logs" ADD CONSTRAINT "project_research_logs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project_knowledge"("projectId") ON DELETE CASCADE ON UPDATE CASCADE;
