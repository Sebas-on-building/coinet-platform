-- CreateTable
CREATE TABLE "omniscore_history" (
    "id" TEXT NOT NULL,
    "projectId" VARCHAR(100) NOT NULL,
    "pos" DOUBLE PRECISION NOT NULL,
    "posRaw" DOUBLE PRECISION,
    "qsScore" DOUBLE PRECISION,
    "osScore" DOUBLE PRECISION,
    "riskScore" DOUBLE PRECISION,
    "engineVersion" VARCHAR(20) NOT NULL,
    "formulaVersion" VARCHAR(10) NOT NULL,
    "regime" VARCHAR(20),
    "capBucket" VARCHAR(20),
    "sector" VARCHAR(30),
    "qsCoverage" DOUBLE PRECISION,
    "osCoverage" DOUBLE PRECISION,
    "degraded" BOOLEAN NOT NULL DEFAULT false,
    "inputsHash" VARCHAR(64),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "omniscore_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "omniscore_history_projectId_createdAt_idx" ON "omniscore_history"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "omniscore_history_projectId_engineVersion_createdAt_idx" ON "omniscore_history"("projectId", "engineVersion", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "omniscore_history_createdAt_idx" ON "omniscore_history"("createdAt" DESC);
