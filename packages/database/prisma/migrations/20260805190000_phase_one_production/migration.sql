-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BranchStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "IdentityStatus" AS ENUM ('INVITED', 'ACTIVE', 'LOCKED', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TokenPurpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'INVITATION_ACCEPTANCE', 'MFA_RECOVERY');

-- CreateEnum
CREATE TYPE "TokenStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MfaStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "WorkspaceCode" AS ENUM ('ADMIN', 'RECEPTION', 'DOCTOR', 'PATIENT', 'LABORATORY', 'RADIOLOGY', 'PHARMACY', 'BILLING', 'MANAGEMENT');

-- CreateEnum
CREATE TYPE "PermissionEffect" AS ENUM ('ALLOW', 'DENY');

-- CreateEnum
CREATE TYPE "PatientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DECEASED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_QUEUE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "EncounterStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ENTERED_IN_ERROR');

-- CreateEnum
CREATE TYPE "DiagnosticType" AS ENUM ('LABORATORY', 'RADIOLOGY');

-- CreateEnum
CREATE TYPE "DiagnosticStatus" AS ENUM ('DRAFT', 'ORDERED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ENTERED_IN_ERROR');

-- CreateEnum
CREATE TYPE "DiagnosticResultStatus" AS ENUM ('PRELIMINARY', 'FINAL', 'AMENDED', 'CORRECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PrescriptionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PARTIALLY_DISPENSED', 'DISPENSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InventoryBatchStatus" AS ENUM ('AVAILABLE', 'QUARANTINED', 'EXPIRED', 'RECALLED', 'DEPLETED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "StoredObjectStatus" AS ENUM ('PENDING', 'AVAILABLE', 'QUARANTINED', 'REJECTED', 'DELETED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'AVAILABLE', 'RELEASED', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'PUSH');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('INFORMATION', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('UNCONFIGURED', 'TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupportAccessStatus" AS ENUM ('REQUESTED', 'APPROVED', 'ACTIVE', 'EXPIRED', 'REVOKED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD_LETTER');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "displayName" VARCHAR(200) NOT NULL,
    "legalName" VARCHAR(250),
    "domain" VARCHAR(250),
    "status" "TenantStatus" NOT NULL DEFAULT 'DRAFT',
    "defaultLocale" VARCHAR(20) NOT NULL DEFAULT 'en',
    "secondaryLocale" VARCHAR(20) DEFAULT 'ur',
    "defaultTimezone" VARCHAR(100) NOT NULL DEFAULT 'Asia/Karachi',
    "defaultCurrencyCode" CHAR(3) NOT NULL DEFAULT 'PKR',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "archivedAt" TIMESTAMPTZ(6),

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "displayName" VARCHAR(200) NOT NULL,
    "legalName" VARCHAR(250),
    "registrationNumber" VARCHAR(120),
    "email" VARCHAR(320),
    "phone" VARCHAR(50),
    "website" VARCHAR(500),
    "logoObjectKey" VARCHAR(1000),
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "settings" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "archivedAt" TIMESTAMPTZ(6),

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "status" "BranchStatus" NOT NULL DEFAULT 'ACTIVE',
    "isMainBranch" BOOLEAN NOT NULL DEFAULT false,
    "email" VARCHAR(320),
    "phone" VARCHAR(50),
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'Asia/Karachi',
    "currencyCode" CHAR(3) NOT NULL DEFAULT 'PKR',
    "address" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "archivedAt" TIMESTAMPTZ(6),

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Identity" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "normalizedEmail" VARCHAR(320) NOT NULL,
    "phone" VARCHAR(50),
    "normalizedPhone" VARCHAR(50),
    "passwordHash" VARCHAR(500),
    "status" "IdentityStatus" NOT NULL DEFAULT 'INVITED',
    "isPlatformAdministrator" BOOLEAN NOT NULL DEFAULT false,
    "platformPermissionCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "emailVerifiedAt" TIMESTAMPTZ(6),
    "phoneVerifiedAt" TIMESTAMPTZ(6),
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMPTZ(6),
    "passwordChangedAt" TIMESTAMPTZ(6),
    "lastAuthenticatedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "archivedAt" TIMESTAMPTZ(6),

    CONSTRAINT "Identity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantMembership" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "primaryBranchId" UUID,
    "displayName" VARCHAR(250) NOT NULL,
    "photoObjectKey" VARCHAR(1000),
    "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',
    "workspaceCodes" "WorkspaceCode"[] DEFAULT ARRAY[]::"WorkspaceCode"[],
    "primaryWorkspace" "WorkspaceCode",
    "preferredLocale" VARCHAR(20) NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "archivedAt" TIMESTAMPTZ(6),

    CONSTRAINT "TenantMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "membershipId" UUID,
    "tenantId" UUID,
    "organizationId" UUID,
    "branchId" UUID,
    "workspace" "WorkspaceCode",
    "tokenHash" CHAR(64) NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "sourceApplication" VARCHAR(50) NOT NULL,
    "deviceId" VARCHAR(200),
    "deviceName" VARCHAR(200),
    "ipAddress" VARCHAR(100),
    "userAgent" TEXT,
    "mfaVerifiedAt" TIMESTAMPTZ(6),
    "lastSeenAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "revokedAt" TIMESTAMPTZ(6),
    "revocationReason" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OneTimeToken" (
    "id" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "tenantId" UUID,
    "purpose" "TokenPurpose" NOT NULL,
    "status" "TokenStatus" NOT NULL DEFAULT 'ACTIVE',
    "tokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "consumedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OneTimeToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfaCredential" (
    "id" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "status" "MfaStatus" NOT NULL DEFAULT 'PENDING',
    "label" VARCHAR(200),
    "secretCiphertext" TEXT NOT NULL,
    "recoveryCodeHashes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verifiedAt" TIMESTAMPTZ(6),
    "lastUsedAt" TIMESTAMPTZ(6),
    "revokedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "MfaCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantInvitation" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "normalizedEmail" VARCHAR(320) NOT NULL,
    "displayName" VARCHAR(250) NOT NULL,
    "organizationId" UUID NOT NULL,
    "primaryBranchId" UUID,
    "workspaceCodes" "WorkspaceCode"[] DEFAULT ARRAY[]::"WorkspaceCode"[],
    "invitedByMembershipId" UUID NOT NULL,
    "acceptedIdentityId" UUID,
    "tokenId" UUID,
    "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(6),
    "revokedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" UUID NOT NULL,
    "code" VARCHAR(160) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "code" VARCHAR(120) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "archivedAt" TIMESTAMPTZ(6),

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,
    "effect" "PermissionEffect" NOT NULL DEFAULT 'ALLOW',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipRole" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "membershipId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "branchId" UUID,
    "validFrom" TIMESTAMPTZ(6),
    "validUntil" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipPermissionGrant" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "membershipId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,
    "branchId" UUID,
    "effect" "PermissionEffect" NOT NULL,
    "reason" VARCHAR(500),
    "validFrom" TIMESTAMPTZ(6),
    "validUntil" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipPermissionGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "patientNumber" VARCHAR(100) NOT NULL,
    "status" "PatientStatus" NOT NULL DEFAULT 'ACTIVE',
    "givenName" VARCHAR(120) NOT NULL,
    "middleName" VARCHAR(120),
    "familyName" VARCHAR(120) NOT NULL,
    "dateOfBirth" DATE,
    "sex" VARCHAR(50),
    "phone" VARCHAR(50),
    "email" VARCHAR(320),
    "address" JSONB,
    "guardianData" JSONB,
    "consentData" JSONB,
    "photoObjectKey" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "archivedAt" TIMESTAMPTZ(6),

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientAccess" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "relationship" VARCHAR(80) NOT NULL DEFAULT 'self',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffProfile" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "membershipId" UUID NOT NULL,
    "branchId" UUID,
    "employeeNumber" VARCHAR(100) NOT NULL,
    "staffType" VARCHAR(80) NOT NULL,
    "status" "StaffStatus" NOT NULL DEFAULT 'ACTIVE',
    "title" VARCHAR(120),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorProfile" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "staffProfileId" UUID NOT NULL,
    "registrationNumber" VARCHAR(150),
    "specialty" VARCHAR(200),
    "durationMinutes" INTEGER NOT NULL DEFAULT 15,
    "publiclyBookable" BOOLEAN NOT NULL DEFAULT false,
    "signatureObjectKey" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "DoctorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceDefinition" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "branchId" UUID,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(250) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 15,
    "priceMinorUnits" INTEGER,
    "currencyCode" CHAR(3) NOT NULL DEFAULT 'PKR',
    "publiclyBookable" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ServiceDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityRule" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "doctorId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "serviceId" UUID,
    "weekday" INTEGER NOT NULL,
    "startsMinute" INTEGER NOT NULL,
    "endsMinute" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "validFrom" DATE NOT NULL,
    "validUntil" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AvailabilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "doctorId" UUID,
    "branchId" UUID NOT NULL,
    "serviceId" UUID,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "source" VARCHAR(80) NOT NULL,
    "reason" TEXT,
    "startsAt" TIMESTAMPTZ(6) NOT NULL,
    "endsAt" TIMESTAMPTZ(6) NOT NULL,
    "checkedInAt" TIMESTAMPTZ(6),
    "tokenNumber" INTEGER,
    "queueStatus" VARCHAR(80),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Encounter" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "appointmentId" UUID,
    "doctorId" UUID,
    "branchId" UUID NOT NULL,
    "status" "EncounterStatus" NOT NULL DEFAULT 'PLANNED',
    "reason" TEXT,
    "clinicalData" JSONB,
    "signedAt" TIMESTAMPTZ(6),
    "releasedAt" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMPTZ(6),
    "endedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Encounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticOrder" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "encounterId" UUID NOT NULL,
    "orderedByMembershipId" UUID NOT NULL,
    "type" "DiagnosticType" NOT NULL,
    "status" "DiagnosticStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" VARCHAR(50) NOT NULL DEFAULT 'routine',
    "code" VARCHAR(120) NOT NULL,
    "name" VARCHAR(300) NOT NULL,
    "specimenOrBodySite" VARCHAR(200),
    "clinicalReason" TEXT,
    "orderedAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "DiagnosticOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticResult" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "status" "DiagnosticResultStatus" NOT NULL DEFAULT 'PRELIMINARY',
    "resultData" JSONB,
    "reportText" TEXT,
    "critical" BOOLEAN NOT NULL DEFAULT false,
    "criticalNotes" TEXT,
    "performedByMembershipId" UUID,
    "verifiedByMembershipId" UUID,
    "releasedByMembershipId" UUID,
    "verifiedAt" TIMESTAMPTZ(6),
    "releasedAt" TIMESTAMPTZ(6),
    "correctionReason" VARCHAR(1000),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "DiagnosticResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medication" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "code" VARCHAR(120) NOT NULL,
    "genericName" VARCHAR(300) NOT NULL,
    "brandName" VARCHAR(300),
    "strength" VARCHAR(150),
    "dosageForm" VARCHAR(150),
    "unit" VARCHAR(80) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Medication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryBatch" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "medicationId" UUID NOT NULL,
    "batchNumber" VARCHAR(150) NOT NULL,
    "expiryDate" DATE NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "status" "InventoryBatchStatus" NOT NULL DEFAULT 'AVAILABLE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "InventoryBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "encounterId" UUID NOT NULL,
    "doctorId" UUID NOT NULL,
    "status" "PrescriptionStatus" NOT NULL DEFAULT 'DRAFT',
    "instructions" TEXT,
    "prescribedAt" TIMESTAMPTZ(6),
    "signedAt" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionItem" (
    "id" UUID NOT NULL,
    "prescriptionId" UUID NOT NULL,
    "medicationId" UUID NOT NULL,
    "dose" VARCHAR(250) NOT NULL,
    "route" VARCHAR(150),
    "frequency" VARCHAR(250) NOT NULL,
    "duration" VARCHAR(200),
    "quantity" DECIMAL(18,4),
    "instructions" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrescriptionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "invoiceNumber" VARCHAR(120) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "currencyCode" CHAR(3) NOT NULL DEFAULT 'PKR',
    "subtotalMinor" INTEGER NOT NULL DEFAULT 0,
    "discountMinor" INTEGER NOT NULL DEFAULT 0,
    "totalMinor" INTEGER NOT NULL DEFAULT 0,
    "paidMinor" INTEGER NOT NULL DEFAULT 0,
    "issuedAt" TIMESTAMPTZ(6),
    "dueAt" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "serviceId" UUID,
    "description" VARCHAR(500) NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 1,
    "unitPriceMinor" INTEGER NOT NULL,
    "totalMinor" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "receivedByMembershipId" UUID NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "method" VARCHAR(80) NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currencyCode" CHAR(3) NOT NULL DEFAULT 'PKR',
    "reference" VARCHAR(250),
    "completedAt" TIMESTAMPTZ(6),
    "reversedAt" TIMESTAMPTZ(6),
    "reversalReason" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoredObject" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "objectKey" VARCHAR(1000) NOT NULL,
    "status" "StoredObjectStatus" NOT NULL DEFAULT 'PENDING',
    "contentType" VARCHAR(250) NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "checksum" VARCHAR(200),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "StoredObject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRecord" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "patientId" UUID,
    "objectId" UUID NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "releasedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "DocumentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "identityId" UUID,
    "patientId" UUID,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "templateCode" VARCHAR(160) NOT NULL,
    "destination" VARCHAR(500),
    "payload" JSONB NOT NULL,
    "scheduledAt" TIMESTAMPTZ(6),
    "sentAt" TIMESTAMPTZ(6),
    "deliveredAt" TIMESTAMPTZ(6),
    "failedAt" TIMESTAMPTZ(6),
    "failureReason" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" UUID NOT NULL,
    "tenantId" UUID,
    "branchId" UUID,
    "actorMembershipId" UUID,
    "sessionId" UUID,
    "requestId" VARCHAR(160) NOT NULL,
    "action" VARCHAR(200) NOT NULL,
    "entityType" VARCHAR(120) NOT NULL,
    "entityId" VARCHAR(200),
    "severity" "AuditSeverity" NOT NULL DEFAULT 'INFORMATION',
    "reason" VARCHAR(1000),
    "metadata" JSONB,
    "sourceApplication" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantSubscription" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "planCode" VARCHAR(120) NOT NULL DEFAULT 'unconfigured',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'UNCONFIGURED',
    "currencyCode" CHAR(3) NOT NULL DEFAULT 'PKR',
    "monthlyAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "seatCount" INTEGER NOT NULL DEFAULT 0,
    "trialEndsAt" TIMESTAMPTZ(6),
    "renewsAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TenantSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantEntitlement" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "moduleCode" VARCHAR(160) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "limits" JSONB,
    "validFrom" TIMESTAMPTZ(6),
    "validUntil" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TenantEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportAccessGrant" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "requestedByIdentityId" UUID NOT NULL,
    "approvedByIdentityId" UUID,
    "status" "SupportAccessStatus" NOT NULL DEFAULT 'REQUESTED',
    "reason" VARCHAR(1000) NOT NULL,
    "permissionCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startsAt" TIMESTAMPTZ(6),
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "approvedAt" TIMESTAMPTZ(6),
    "revokedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SupportAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" UUID NOT NULL,
    "tenantId" UUID,
    "type" VARCHAR(200) NOT NULL,
    "aggregateType" VARCHAR(120) NOT NULL,
    "aggregateId" VARCHAR(200) NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMPTZ(6),
    "lastError" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_domain_key" ON "Tenant"("domain");

-- CreateIndex
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");

-- CreateIndex
CREATE INDEX "Organization_tenantId_status_idx" ON "Organization"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_tenantId_code_key" ON "Organization"("tenantId", "code");

-- CreateIndex
CREATE INDEX "Branch_tenantId_organizationId_status_idx" ON "Branch"("tenantId", "organizationId", "status");

-- CreateIndex
CREATE INDEX "Branch_tenantId_isMainBranch_idx" ON "Branch"("tenantId", "isMainBranch");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_tenantId_code_key" ON "Branch"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Identity_normalizedEmail_key" ON "Identity"("normalizedEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Identity_normalizedPhone_key" ON "Identity"("normalizedPhone");

-- CreateIndex
CREATE INDEX "Identity_status_idx" ON "Identity"("status");

-- CreateIndex
CREATE INDEX "TenantMembership_tenantId_status_idx" ON "TenantMembership"("tenantId", "status");

-- CreateIndex
CREATE INDEX "TenantMembership_identityId_status_idx" ON "TenantMembership"("identityId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TenantMembership_tenantId_identityId_key" ON "TenantMembership"("tenantId", "identityId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthSession_identityId_status_idx" ON "AuthSession"("identityId", "status");

-- CreateIndex
CREATE INDEX "AuthSession_tenantId_membershipId_status_idx" ON "AuthSession"("tenantId", "membershipId", "status");

-- CreateIndex
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "OneTimeToken_tokenHash_key" ON "OneTimeToken"("tokenHash");

-- CreateIndex
CREATE INDEX "OneTimeToken_identityId_purpose_status_idx" ON "OneTimeToken"("identityId", "purpose", "status");

-- CreateIndex
CREATE INDEX "OneTimeToken_expiresAt_idx" ON "OneTimeToken"("expiresAt");

-- CreateIndex
CREATE INDEX "MfaCredential_identityId_status_idx" ON "MfaCredential"("identityId", "status");

-- CreateIndex
CREATE INDEX "TenantInvitation_tenantId_normalizedEmail_status_idx" ON "TenantInvitation"("tenantId", "normalizedEmail", "status");

-- CreateIndex
CREATE INDEX "TenantInvitation_expiresAt_idx" ON "TenantInvitation"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE INDEX "Role_tenantId_isActive_idx" ON "Role"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Role_tenantId_code_key" ON "Role"("tenantId", "code");

-- CreateIndex
CREATE INDEX "RolePermission_tenantId_permissionId_idx" ON "RolePermission"("tenantId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_tenantId_roleId_permissionId_key" ON "RolePermission"("tenantId", "roleId", "permissionId");

-- CreateIndex
CREATE INDEX "MembershipRole_tenantId_membershipId_idx" ON "MembershipRole"("tenantId", "membershipId");

-- CreateIndex
CREATE INDEX "MembershipRole_tenantId_roleId_idx" ON "MembershipRole"("tenantId", "roleId");

-- CreateIndex
CREATE INDEX "MembershipRole_tenantId_branchId_idx" ON "MembershipRole"("tenantId", "branchId");

-- CreateIndex
CREATE INDEX "MembershipPermissionGrant_tenantId_membershipId_idx" ON "MembershipPermissionGrant"("tenantId", "membershipId");

-- CreateIndex
CREATE INDEX "MembershipPermissionGrant_tenantId_permissionId_idx" ON "MembershipPermissionGrant"("tenantId", "permissionId");

-- CreateIndex
CREATE INDEX "MembershipPermissionGrant_tenantId_branchId_idx" ON "MembershipPermissionGrant"("tenantId", "branchId");

-- CreateIndex
CREATE INDEX "Patient_tenantId_status_idx" ON "Patient"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Patient_tenantId_familyName_givenName_idx" ON "Patient"("tenantId", "familyName", "givenName");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_tenantId_patientNumber_key" ON "Patient"("tenantId", "patientNumber");

-- CreateIndex
CREATE INDEX "PatientAccess_identityId_isActive_idx" ON "PatientAccess"("identityId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PatientAccess_patientId_identityId_key" ON "PatientAccess"("patientId", "identityId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffProfile_membershipId_key" ON "StaffProfile"("membershipId");

-- CreateIndex
CREATE INDEX "StaffProfile_tenantId_staffType_status_idx" ON "StaffProfile"("tenantId", "staffType", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StaffProfile_tenantId_employeeNumber_key" ON "StaffProfile"("tenantId", "employeeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorProfile_staffProfileId_key" ON "DoctorProfile"("staffProfileId");

-- CreateIndex
CREATE INDEX "DoctorProfile_tenantId_publiclyBookable_idx" ON "DoctorProfile"("tenantId", "publiclyBookable");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorProfile_tenantId_registrationNumber_key" ON "DoctorProfile"("tenantId", "registrationNumber");

-- CreateIndex
CREATE INDEX "ServiceDefinition_tenantId_branchId_isActive_idx" ON "ServiceDefinition"("tenantId", "branchId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceDefinition_tenantId_code_key" ON "ServiceDefinition"("tenantId", "code");

-- CreateIndex
CREATE INDEX "AvailabilityRule_tenantId_doctorId_weekday_idx" ON "AvailabilityRule"("tenantId", "doctorId", "weekday");

-- CreateIndex
CREATE INDEX "AvailabilityRule_tenantId_branchId_isActive_idx" ON "AvailabilityRule"("tenantId", "branchId", "isActive");

-- CreateIndex
CREATE INDEX "Appointment_tenantId_branchId_startsAt_status_idx" ON "Appointment"("tenantId", "branchId", "startsAt", "status");

-- CreateIndex
CREATE INDEX "Appointment_tenantId_doctorId_startsAt_idx" ON "Appointment"("tenantId", "doctorId", "startsAt");

-- CreateIndex
CREATE INDEX "Appointment_tenantId_patientId_startsAt_idx" ON "Appointment"("tenantId", "patientId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Encounter_appointmentId_key" ON "Encounter"("appointmentId");

-- CreateIndex
CREATE INDEX "Encounter_tenantId_patientId_createdAt_idx" ON "Encounter"("tenantId", "patientId", "createdAt");

-- CreateIndex
CREATE INDEX "Encounter_tenantId_doctorId_status_idx" ON "Encounter"("tenantId", "doctorId", "status");

-- CreateIndex
CREATE INDEX "Encounter_tenantId_branchId_status_idx" ON "Encounter"("tenantId", "branchId", "status");

-- CreateIndex
CREATE INDEX "DiagnosticOrder_tenantId_type_status_createdAt_idx" ON "DiagnosticOrder"("tenantId", "type", "status", "createdAt");

-- CreateIndex
CREATE INDEX "DiagnosticOrder_tenantId_patientId_idx" ON "DiagnosticOrder"("tenantId", "patientId");

-- CreateIndex
CREATE INDEX "DiagnosticResult_orderId_status_idx" ON "DiagnosticResult"("orderId", "status");

-- CreateIndex
CREATE INDEX "DiagnosticResult_critical_releasedAt_idx" ON "DiagnosticResult"("critical", "releasedAt");

-- CreateIndex
CREATE INDEX "Medication_tenantId_isActive_idx" ON "Medication"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Medication_tenantId_code_key" ON "Medication"("tenantId", "code");

-- CreateIndex
CREATE INDEX "InventoryBatch_tenantId_branchId_status_expiryDate_idx" ON "InventoryBatch"("tenantId", "branchId", "status", "expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryBatch_tenantId_branchId_medicationId_batchNumber_key" ON "InventoryBatch"("tenantId", "branchId", "medicationId", "batchNumber");

-- CreateIndex
CREATE INDEX "Prescription_tenantId_patientId_status_idx" ON "Prescription"("tenantId", "patientId", "status");

-- CreateIndex
CREATE INDEX "Prescription_tenantId_doctorId_createdAt_idx" ON "Prescription"("tenantId", "doctorId", "createdAt");

-- CreateIndex
CREATE INDEX "PrescriptionItem_prescriptionId_idx" ON "PrescriptionItem"("prescriptionId");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_branchId_status_createdAt_idx" ON "Invoice"("tenantId", "branchId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_patientId_idx" ON "Invoice"("tenantId", "patientId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_tenantId_invoiceNumber_key" ON "Invoice"("tenantId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");

-- CreateIndex
CREATE INDEX "Payment_tenantId_invoiceId_status_idx" ON "Payment"("tenantId", "invoiceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StoredObject_objectKey_key" ON "StoredObject"("objectKey");

-- CreateIndex
CREATE INDEX "StoredObject_tenantId_status_idx" ON "StoredObject"("tenantId", "status");

-- CreateIndex
CREATE INDEX "DocumentRecord_tenantId_patientId_status_idx" ON "DocumentRecord"("tenantId", "patientId", "status");

-- CreateIndex
CREATE INDEX "Notification_tenantId_status_scheduledAt_idx" ON "Notification"("tenantId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Notification_identityId_createdAt_idx" ON "Notification"("identityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_tenantId_createdAt_idx" ON "AuditEvent"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_tenantId_action_createdAt_idx" ON "AuditEvent"("tenantId", "action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_severity_createdAt_idx" ON "AuditEvent"("severity", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TenantSubscription_tenantId_key" ON "TenantSubscription"("tenantId");

-- CreateIndex
CREATE INDEX "TenantEntitlement_tenantId_enabled_idx" ON "TenantEntitlement"("tenantId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "TenantEntitlement_tenantId_moduleCode_key" ON "TenantEntitlement"("tenantId", "moduleCode");

-- CreateIndex
CREATE INDEX "SupportAccessGrant_tenantId_status_expiresAt_idx" ON "SupportAccessGrant"("tenantId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_availableAt_idx" ON "OutboxEvent"("status", "availableAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_tenantId_createdAt_idx" ON "OutboxEvent"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_primaryBranchId_fkey" FOREIGN KEY ("primaryBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "TenantMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneTimeToken" ADD CONSTRAINT "OneTimeToken_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneTimeToken" ADD CONSTRAINT "OneTimeToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfaCredential" ADD CONSTRAINT "MfaCredential_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantInvitation" ADD CONSTRAINT "TenantInvitation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipRole" ADD CONSTRAINT "MembershipRole_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipRole" ADD CONSTRAINT "MembershipRole_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "TenantMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipRole" ADD CONSTRAINT "MembershipRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipRole" ADD CONSTRAINT "MembershipRole_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipPermissionGrant" ADD CONSTRAINT "MembershipPermissionGrant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipPermissionGrant" ADD CONSTRAINT "MembershipPermissionGrant_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "TenantMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipPermissionGrant" ADD CONSTRAINT "MembershipPermissionGrant_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipPermissionGrant" ADD CONSTRAINT "MembershipPermissionGrant_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAccess" ADD CONSTRAINT "PatientAccess_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAccess" ADD CONSTRAINT "PatientAccess_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "TenantMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorProfile" ADD CONSTRAINT "DoctorProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorProfile" ADD CONSTRAINT "DoctorProfile_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "StaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceDefinition" ADD CONSTRAINT "ServiceDefinition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceDefinition" ADD CONSTRAINT "ServiceDefinition_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRule" ADD CONSTRAINT "AvailabilityRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRule" ADD CONSTRAINT "AvailabilityRule_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRule" ADD CONSTRAINT "AvailabilityRule_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRule" ADD CONSTRAINT "AvailabilityRule_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticOrder" ADD CONSTRAINT "DiagnosticOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticOrder" ADD CONSTRAINT "DiagnosticOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticOrder" ADD CONSTRAINT "DiagnosticOrder_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticResult" ADD CONSTRAINT "DiagnosticResult_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "DiagnosticOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBatch" ADD CONSTRAINT "InventoryBatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBatch" ADD CONSTRAINT "InventoryBatch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBatch" ADD CONSTRAINT "InventoryBatch_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoredObject" ADD CONSTRAINT "StoredObject_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRecord" ADD CONSTRAINT "DocumentRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRecord" ADD CONSTRAINT "DocumentRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRecord" ADD CONSTRAINT "DocumentRecord_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "StoredObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantSubscription" ADD CONSTRAINT "TenantSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantEntitlement" ADD CONSTRAINT "TenantEntitlement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportAccessGrant" ADD CONSTRAINT "SupportAccessGrant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboxEvent" ADD CONSTRAINT "OutboxEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
