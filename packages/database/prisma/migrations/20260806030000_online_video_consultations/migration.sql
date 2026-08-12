CREATE TYPE "ConsultationMode" AS ENUM ('IN_PERSON', 'ONLINE');
CREATE TYPE "VideoCallStatus" AS ENUM ('WAITING', 'ACTIVE', 'ENDED');

ALTER TABLE "ServiceDefinition"
  ADD COLUMN "consultationMode" "ConsultationMode" NOT NULL DEFAULT 'IN_PERSON';

ALTER TABLE "Appointment"
  ADD COLUMN "consultationMode" "ConsultationMode" NOT NULL DEFAULT 'IN_PERSON';

CREATE TABLE "VideoCallSession" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "appointmentId" UUID NOT NULL,
  "status" "VideoCallStatus" NOT NULL DEFAULT 'WAITING',
  "patientJoinedAt" TIMESTAMPTZ(6),
  "doctorJoinedAt" TIMESTAMPTZ(6),
  "startedAt" TIMESTAMPTZ(6),
  "endedAt" TIMESTAMPTZ(6),
  "expiresAt" TIMESTAMPTZ(6) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "VideoCallSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VideoCallSignal" (
  "id" UUID NOT NULL,
  "sessionId" UUID NOT NULL,
  "senderRole" VARCHAR(20) NOT NULL,
  "signalType" VARCHAR(20) NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "VideoCallSignal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VideoCallSession_appointmentId_key" ON "VideoCallSession"("appointmentId");
CREATE INDEX "VideoCallSession_tenantId_status_expiresAt_idx" ON "VideoCallSession"("tenantId", "status", "expiresAt");
CREATE INDEX "VideoCallSignal_sessionId_createdAt_idx" ON "VideoCallSignal"("sessionId", "createdAt");
CREATE INDEX "VideoCallSignal_expiresAt_idx" ON "VideoCallSignal"("expiresAt");

ALTER TABLE "VideoCallSession"
  ADD CONSTRAINT "VideoCallSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VideoCallSession"
  ADD CONSTRAINT "VideoCallSession_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoCallSignal"
  ADD CONSTRAINT "VideoCallSignal_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VideoCallSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
