-- CreateEnum
CREATE TYPE "DocumentUploadStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABORTED');

-- CreateTable
CREATE TABLE "DocumentUploadSession" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "fileName" VARCHAR(500) NOT NULL,
    "contentType" VARCHAR(250) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "totalSizeBytes" BIGINT NOT NULL,
    "chunkSizeBytes" INTEGER NOT NULL,
    "receivedBytes" BIGINT NOT NULL DEFAULT 0,
    "nextChunkIndex" INTEGER NOT NULL DEFAULT 0,
    "status" "DocumentUploadStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "DocumentUploadSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAccessToken" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "token" VARCHAR(128) NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "usedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentAccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentUploadSession_tenantId_patientId_status_idx" ON "DocumentUploadSession" ("tenantId", "patientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentAccessToken_token_key" ON "DocumentAccessToken" ("token");

-- CreateIndex
CREATE INDEX "DocumentAccessToken_tenantId_documentId_idx" ON "DocumentAccessToken" ("tenantId", "documentId");

-- AddForeignKey
ALTER TABLE "DocumentUploadSession" ADD CONSTRAINT "DocumentUploadSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccessToken" ADD CONSTRAINT "DocumentAccessToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccessToken" ADD CONSTRAINT "DocumentAccessToken_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
