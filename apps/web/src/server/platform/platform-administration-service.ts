import { database } from "@wonflow/database";
import type { Prisma } from "@wonflow/database";
import { requirePermission } from "@wonflow/contracts";
import type { WonFlowPlatformRequestContext } from "@wonflow/contracts";

import { hashPassword, validateNewPassword } from "@/lib/auth/password";
import { ensureWorkspaceRoles } from "@/server/access/workspace-roles";
import { WonFlowApiError } from "@/server/http/route-handler";

const PLATFORM_MODULE_CODES = new Set([
  "practice-dashboard", "practice-booking", "practice-documents", "practice-messaging", "practice-team-management",
  "patient-portal", "public-booking-page", "mobile-apps", "reception-desk", "billing-counter", "laboratory", "radiology", "pharmacy",
]);

const TENANT_ADMIN_PERMISSION_CODES = [
  "organization.audit.read",
  "organization.branches.manage",
  "organization.profile.manage",
  "organization.profile.read",
  "organization.roles.manage",
  "organization.roles.read",
  "organization.schedules.manage",
  "organization.schedules.read",
  "organization.services.manage",
  "organization.services.read",
  "organization.users.manage",
  "organization.users.read",
] as const;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

interface TenantReference {
  tenantId: string;
  tenantSlug?: string;
  tenantDisplayName?: string;
}

interface ActivateTenantInput extends TenantReference {
  legalName?: string;
  domain?: string;
  ownerName: string;
  ownerEmail: string;
  temporaryPassword: string;
  primaryBranchName?: string;
  subscription: {
    planCode: string;
    status: "TRIAL" | "ACTIVE";
    currencyCode: string;
    monthlyAmountMinor: number;
    seatCount: number;
    trialEndsAt?: string;
    renewsAt?: string;
  };
  entitlements?: Array<{ moduleCode: string; enabled: boolean }>;
}

function requiredText(value: string | undefined, label: string, minimum = 2): string {
  const normalized = value?.trim() ?? "";
  if (normalized.length < minimum) throw new WonFlowApiError(400, "invalid-activation", `Enter a valid ${label}.`);
  return normalized;
}

function optionalDate(value: string | undefined, label: string): Date | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new WonFlowApiError(400, "invalid-activation", `${label} is invalid.`);
  return date;
}

async function resolveTenant(transaction: Prisma.TransactionClient, input: TenantReference) {
  let tenant = UUID_PATTERN.test(input.tenantId)
    ? await transaction.tenant.findUnique({ where: { id: input.tenantId } })
    : null;
  const slug = input.tenantSlug?.trim().toLowerCase();
  if (!tenant && slug) tenant = await transaction.tenant.findUnique({ where: { slug } });
  return { tenant, slug };
}

export class PlatformAdministrationService {
  async listTenants(context: WonFlowPlatformRequestContext, scope: "active" | "deleted" = "active") {
    requirePermission(context, "platform.tenants.read");
    return database.tenant.findMany({
      // Deleted tenants are retained as platform-only backups, but separated
      // from the live directory so no one mistakes them for working tenants.
      where: scope === "deleted" ? { archivedAt: { not: null } } : { archivedAt: null },
      orderBy: { createdAt: "desc" },
      include: { organizations: { include: { branches: true } }, subscription: true, entitlements: true },
      take: 500,
    });
  }

  async createTenant(context: WonFlowPlatformRequestContext, input: { displayName: string; legalName?: string; slug: string; domain?: string; organizationCode: string }) {
    requirePermission(context, "platform.tenants.manage");
    return database.$transaction(async (transaction) => {
      const tenant = await transaction.tenant.create({
        data: {
          displayName: input.displayName.trim(),
          legalName: input.legalName?.trim() || null,
          slug: input.slug.trim().toLowerCase(),
          domain: input.domain?.trim().toLowerCase() || null,
          organizations: { create: { code: input.organizationCode.trim().toUpperCase(), displayName: input.displayName.trim(), legalName: input.legalName?.trim() || null } },
          subscription: { create: {} },
        },
        include: { organizations: true, subscription: true },
      });
      await transaction.auditEvent.create({ data: { tenantId: tenant.id, requestId: context.requestId, action: "platform.tenant.created", entityType: "tenant", entityId: tenant.id, severity: "INFORMATION", sourceApplication: context.sourceApplication } });
      return tenant;
    });
  }

  async activateTenant(context: WonFlowPlatformRequestContext, input: ActivateTenantInput) {
    requirePermission(context, "platform.tenants.manage");
    requirePermission(context, "platform.subscriptions.manage");
    if ((input.entitlements?.length ?? 0) > 0) requirePermission(context, "platform.entitlements.manage");

    const ownerName = requiredText(input.ownerName, "owner name");
    const ownerEmail = requiredText(input.ownerEmail, "owner email").toLowerCase();
    if (!EMAIL_PATTERN.test(ownerEmail)) throw new WonFlowApiError(400, "invalid-owner-email", "Enter a valid owner email address.");
    if (!["starter", "professional", "enterprise"].includes(input.subscription.planCode?.trim().toLowerCase())) {
      throw new WonFlowApiError(400, "subscription-required", "Choose a subscription plan before activation.");
    }
    if (input.subscription.status !== "TRIAL" && input.subscription.status !== "ACTIVE") {
      throw new WonFlowApiError(400, "invalid-subscription-status", "Activation requires an active or trial subscription.");
    }
    if (!Number.isInteger(input.subscription.seatCount) || input.subscription.seatCount < 1) {
      throw new WonFlowApiError(400, "invalid-seat-count", "Seat count must be at least one.");
    }
    if (!Number.isInteger(input.subscription.monthlyAmountMinor) || input.subscription.monthlyAmountMinor < 0) {
      throw new WonFlowApiError(400, "invalid-subscription-amount", "Monthly amount must be zero or greater.");
    }
    const currencyCode = input.subscription.currencyCode.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currencyCode)) throw new WonFlowApiError(400, "invalid-currency", "Currency must be a three-letter code.");
    for (const entitlement of input.entitlements ?? []) {
      if (!PLATFORM_MODULE_CODES.has(entitlement.moduleCode) || typeof entitlement.enabled !== "boolean") {
        throw new WonFlowApiError(400, "invalid-entitlement", "One or more entitlements are invalid.");
      }
    }
    try {
      validateNewPassword(input.temporaryPassword);
    } catch (error) {
      throw new WonFlowApiError(400, "invalid-temporary-password", error instanceof Error ? error.message : "The temporary password is invalid.");
    }
    const passwordHash = await hashPassword(input.temporaryPassword);
    const trialEndsAt = optionalDate(input.subscription.trialEndsAt, "Trial end date");
    const renewsAt = optionalDate(input.subscription.renewsAt, "Renewal date");

    return database.$transaction(async (transaction) => {
      const resolved = await resolveTenant(transaction, input);
      if (resolved.tenant?.archivedAt) {
        throw new WonFlowApiError(409, "tenant-archived", "Archived tenant backups cannot be activated.");
      }

      const displayName = input.tenantDisplayName?.trim() || resolved.tenant?.displayName || requiredText(input.tenantDisplayName, "organization name");
      const slug = (input.tenantSlug?.trim() || resolved.tenant?.slug || requiredText(input.tenantSlug, "tenant slug")).toLowerCase();

      const tenant = resolved.tenant
        ? await transaction.tenant.update({
            where: { id: resolved.tenant.id },
            data: {
              slug,
              displayName,
              legalName: input.legalName?.trim() || null,
              domain: input.domain?.trim().toLowerCase() || null,
              status: "ACTIVE",
              archivedAt: null,
              defaultCurrencyCode: currencyCode,
            },
          })
        : await transaction.tenant.create({
            data: {
              slug,
              displayName,
              legalName: input.legalName?.trim() || null,
              domain: input.domain?.trim().toLowerCase() || null,
              status: "ACTIVE",
              defaultCurrencyCode: currencyCode,
            },
          });

      const organization = await transaction.organization.upsert({
        where: { tenantId_code: { tenantId: tenant.id, code: "MAIN" } },
        create: { tenantId: tenant.id, code: "MAIN", displayName, legalName: input.legalName?.trim() || null, email: ownerEmail },
        update: { displayName, legalName: input.legalName?.trim() || null, email: ownerEmail, status: "ACTIVE", archivedAt: null },
      });
      const branch = await transaction.branch.upsert({
        where: { tenantId_code: { tenantId: tenant.id, code: "MAIN" } },
        create: {
          tenantId: tenant.id,
          organizationId: organization.id,
          code: "MAIN",
          name: input.primaryBranchName?.trim() || "Main Branch",
          isMainBranch: true,
          timezone: tenant.defaultTimezone,
          currencyCode,
        },
        update: {
          organizationId: organization.id,
          name: input.primaryBranchName?.trim() || "Main Branch",
          status: "ACTIVE",
          isMainBranch: true,
          archivedAt: null,
          currencyCode,
        },
      });

      const existingIdentity = await transaction.identity.findUnique({
        where: { normalizedEmail: ownerEmail },
        include: { memberships: { select: { tenantId: true } } },
      });
      if (existingIdentity?.isPlatformAdministrator) {
        throw new WonFlowApiError(409, "owner-email-conflict", "The owner email belongs to a platform administrator.");
      }
      if (existingIdentity?.memberships.some((membership) => membership.tenantId !== tenant.id)) {
        throw new WonFlowApiError(409, "owner-email-conflict", "The owner email is already assigned to another tenant.");
      }
      if (existingIdentity?.passwordHash && !existingIdentity.memberships.some((membership) => membership.tenantId === tenant.id)) {
        throw new WonFlowApiError(409, "owner-email-conflict", "The owner email already belongs to another account.");
      }

      const identity = existingIdentity
        ? await transaction.identity.update({
            where: { id: existingIdentity.id },
            data: {
              email: input.ownerEmail.trim(),
              passwordHash,
              mustChangePassword: true,
              passwordChangedAt: null,
              status: "ACTIVE",
              emailVerifiedAt: existingIdentity.emailVerifiedAt ?? new Date(),
              failedLoginCount: 0,
              lockedUntil: null,
              archivedAt: null,
            },
          })
        : await transaction.identity.create({
            data: {
              email: input.ownerEmail.trim(),
              normalizedEmail: ownerEmail,
              passwordHash,
              mustChangePassword: true,
              status: "ACTIVE",
              emailVerifiedAt: new Date(),
            },
          });

      const membership = await transaction.tenantMembership.upsert({
        where: { tenantId_identityId: { tenantId: tenant.id, identityId: identity.id } },
        create: {
          tenantId: tenant.id,
          identityId: identity.id,
          organizationId: organization.id,
          primaryBranchId: branch.id,
          displayName: ownerName,
          status: "ACTIVE",
          workspaceCodes: ["ADMIN"],
          primaryWorkspace: "ADMIN",
        },
        update: {
          organizationId: organization.id,
          primaryBranchId: branch.id,
          displayName: ownerName,
          status: "ACTIVE",
          workspaceCodes: ["ADMIN"],
          primaryWorkspace: "ADMIN",
          archivedAt: null,
        },
      });

      const role = await transaction.role.upsert({
        where: { tenantId_code: { tenantId: tenant.id, code: "ADMIN" } },
        create: { tenantId: tenant.id, code: "ADMIN", name: "Tenant Administrator", description: "Full organization administration access.", isSystem: true },
        update: { name: "Tenant Administrator", isActive: true, archivedAt: null },
      });
      const permissions = await Promise.all(TENANT_ADMIN_PERMISSION_CODES.map((code) => transaction.permission.upsert({
        where: { code },
        create: { code, category: "organization", label: code },
        update: {},
      })));
      for (const permission of permissions) {
        await transaction.rolePermission.upsert({
          where: { tenantId_roleId_permissionId: { tenantId: tenant.id, roleId: role.id, permissionId: permission.id } },
          create: { tenantId: tenant.id, roleId: role.id, permissionId: permission.id, effect: "ALLOW" },
          update: { effect: "ALLOW" },
        });
      }
      // Every workspace the hospital can invite into needs its role to exist up
      // front, otherwise an invited doctor or lab officer lands with no role and
      // no permissions.
      await ensureWorkspaceRoles(transaction, tenant.id);
      await transaction.membershipRole.deleteMany({ where: { tenantId: tenant.id, membershipId: membership.id } });
      await transaction.membershipRole.create({ data: { tenantId: tenant.id, membershipId: membership.id, roleId: role.id, branchId: branch.id } });

      const subscription = await transaction.tenantSubscription.upsert({
        where: { tenantId: tenant.id },
        create: {
          tenantId: tenant.id,
          planCode: input.subscription.planCode.trim().toLowerCase(),
          status: input.subscription.status,
          currencyCode,
          monthlyAmountMinor: input.subscription.monthlyAmountMinor,
          seatCount: input.subscription.seatCount,
          trialEndsAt,
          renewsAt,
        },
        update: {
          planCode: input.subscription.planCode.trim().toLowerCase(),
          status: input.subscription.status,
          currencyCode,
          monthlyAmountMinor: input.subscription.monthlyAmountMinor,
          seatCount: input.subscription.seatCount,
          trialEndsAt,
          renewsAt,
        },
      });
      for (const entitlement of input.entitlements ?? []) {
        await transaction.tenantEntitlement.upsert({
          where: { tenantId_moduleCode: { tenantId: tenant.id, moduleCode: entitlement.moduleCode } },
          create: { tenantId: tenant.id, moduleCode: entitlement.moduleCode, enabled: entitlement.enabled },
          update: { enabled: entitlement.enabled },
        });
      }

      await transaction.authSession.updateMany({
        where: { identityId: identity.id, status: "ACTIVE" },
        data: { status: "REVOKED", revokedAt: new Date(), revocationReason: "temporary-password-issued" },
      });
      await transaction.auditEvent.create({
        data: {
          tenantId: tenant.id,
          requestId: context.requestId,
          action: "platform.tenant.activated",
          entityType: "tenant",
          entityId: tenant.id,
          severity: "WARNING",
          metadata: { actorIdentityId: context.userId, ownerIdentityId: identity.id, ownerEmail, subscriptionStatus: subscription.status },
          sourceApplication: context.sourceApplication,
        },
      });
      await transaction.outboxEvent.create({
        data: {
          tenantId: tenant.id,
          type: "tenant.owner.activated",
          aggregateType: "tenant",
          aggregateId: tenant.id,
          payload: { tenantId: tenant.id, organizationId: organization.id, identityId: identity.id, email: ownerEmail, temporaryPasswordDeliveryRequired: true },
        },
      });

      return {
        tenant: { id: tenant.id, slug: tenant.slug, displayName: tenant.displayName, status: tenant.status },
        owner: { identityId: identity.id, membershipId: membership.id, name: membership.displayName, email: identity.email, mustChangePassword: true },
        subscription,
        loginPath: "/login",
      };
    });
  }

  async setTenantStatus(context: WonFlowPlatformRequestContext, input: { tenantId: string; status: "ACTIVE" | "SUSPENDED"; confirmation: string; reason: string }) {
    requirePermission(context, "platform.tenants.manage");
    if (input.status !== "ACTIVE" && input.status !== "SUSPENDED") {
      throw new WonFlowApiError(400, "invalid-tenant-status", "Use the tenant deletion workflow to archive a tenant.");
    }
    const reason = input.reason?.trim() ?? "";
    if (reason.length < 8) throw new WonFlowApiError(400, "status-reason-required", "Enter a clear reason of at least 8 characters.");
    const confirmation = input.confirmation?.trim();
    const expectedConfirmation = input.status === "ACTIVE" ? "REACTIVATE" : "RESTRICT";
    if (confirmation !== expectedConfirmation && !(input.status === "SUSPENDED" && confirmation === "SUSPEND")) throw new WonFlowApiError(400, "status-confirmation-mismatch", `Type "${expectedConfirmation}" to confirm this action.`);
    input = { ...input, reason };
    return database.$transaction(async (transaction) => {
      const currentTenant = await transaction.tenant.findFirst({ where: { id: input.tenantId, archivedAt: null } });
      if (!currentTenant) throw new WonFlowApiError(404, "tenant-not-found", "The active tenant could not be found.");
      const statusChangedAt = new Date();
      const tenant = await transaction.tenant.update({ where: { id: currentTenant.id }, data: { status: input.status } });
      if (input.status === "SUSPENDED") {
        await Promise.all([
          transaction.authSession.updateMany({ where: { tenantId: tenant.id, status: "ACTIVE" }, data: { status: "REVOKED", revokedAt: statusChangedAt, revocationReason: "tenant-restricted" } }),
          transaction.oneTimeToken.updateMany({ where: { tenantId: tenant.id, status: "ACTIVE" }, data: { status: "REVOKED" } }),
        ]);
      }
      await transaction.auditEvent.create({ data: { tenantId: tenant.id, requestId: context.requestId, action: `platform.tenant.${input.status.toLowerCase()}`, entityType: "tenant", entityId: tenant.id, severity: input.status === "SUSPENDED" ? "CRITICAL" : "WARNING", reason: input.reason.trim(), sourceApplication: context.sourceApplication } });
      return tenant;
    });
  }

  async archiveTenant(
    context: WonFlowPlatformRequestContext,
    input: { tenantId: string; confirmation: string; reason: string },
  ) {
    requirePermission(context, "platform.tenants.manage");

    const confirmation = input.confirmation?.trim() ?? "";
    const reason = input.reason?.trim() ?? "";
    if (reason.length < 8) {
      throw new WonFlowApiError(400, "archive-reason-required", "Enter a clear reason of at least 8 characters.");
    }

    return database.$transaction(async (transaction) => {
      const tenant = await transaction.tenant.findFirst({
        where: { id: input.tenantId, archivedAt: null },
      });
      if (!tenant) {
        throw new WonFlowApiError(404, "tenant-not-found", "The active tenant could not be found.");
      }
      if (tenant.slug === "wonflow-development") {
        throw new WonFlowApiError(403, "internal-tenant-protected", "The internal development tenant cannot be archived here.");
      }
      if (confirmation !== tenant.displayName) {
        throw new WonFlowApiError(400, "archive-confirmation-mismatch", "Type the organization name exactly to confirm archival.");
      }

      const archivedAt = new Date();
      await Promise.all([
        transaction.organization.updateMany({
          where: { tenantId: tenant.id, archivedAt: null },
          data: { status: "ARCHIVED", archivedAt },
        }),
        transaction.branch.updateMany({
          where: { tenantId: tenant.id, archivedAt: null },
          data: { status: "ARCHIVED", archivedAt },
        }),
        transaction.tenantMembership.updateMany({
          where: { tenantId: tenant.id, archivedAt: null },
          data: { status: "ARCHIVED", archivedAt },
        }),
        transaction.authSession.updateMany({
          where: { tenantId: tenant.id, status: "ACTIVE" },
          data: { status: "REVOKED", revokedAt: archivedAt, revocationReason: "tenant-archived" },
        }),
        transaction.oneTimeToken.updateMany({
          where: { tenantId: tenant.id, status: "ACTIVE" },
          data: { status: "REVOKED" },
        }),
        transaction.supportAccessGrant.updateMany({
          where: { tenantId: tenant.id, status: { in: ["REQUESTED", "APPROVED", "ACTIVE"] } },
          data: { status: "REVOKED", revokedAt: archivedAt },
        }),
        transaction.tenantEntitlement.updateMany({
          where: { tenantId: tenant.id, enabled: true },
          data: { enabled: false },
        }),
        transaction.tenantSubscription.updateMany({
          where: { tenantId: tenant.id },
          data: { status: "CANCELLED" },
        }),
      ]);

      const archivedTenant = await transaction.tenant.update({
        where: { id: tenant.id },
        data: { status: "ARCHIVED", archivedAt },
      });
      await transaction.auditEvent.create({
        data: {
          tenantId: tenant.id,
          requestId: context.requestId,
          action: "platform.tenant.archived",
          entityType: "tenant",
          entityId: tenant.id,
          severity: "CRITICAL",
          reason,
          metadata: { actorIdentityId: context.userId, tenantSlug: tenant.slug },
          sourceApplication: context.sourceApplication,
        },
      });
      await transaction.outboxEvent.create({
        data: {
          tenantId: tenant.id,
          type: "tenant.archived",
          aggregateType: "tenant",
          aggregateId: tenant.id,
          payload: { tenantId: tenant.id, tenantSlug: tenant.slug, archivedAt: archivedAt.toISOString() },
        },
      });

      return archivedTenant;
    });
  }

  async permanentlyDeleteTenant(
    context: WonFlowPlatformRequestContext,
    input: { tenantId: string; confirmation: string; reason: string },
  ) {
    requirePermission(context, "platform.tenants.manage");

    const confirmation = input.confirmation?.trim() ?? "";
    const reason = input.reason?.trim() ?? "";
    if (reason.length < 8) {
      throw new WonFlowApiError(400, "delete-reason-required", "Enter a clear reason of at least 8 characters.");
    }

    return database.$transaction(async (transaction) => {
      const tenant = await transaction.tenant.findFirst({
        where: { id: input.tenantId, archivedAt: { not: null } },
        include: { organizations: true },
      });
      if (!tenant) {
        throw new WonFlowApiError(404, "tenant-not-found", "The archived tenant could not be found.");
      }
      if (tenant.slug === "wonflow-development") {
        throw new WonFlowApiError(403, "internal-tenant-protected", "The internal development tenant cannot be permanently deleted.");
      }
      if (confirmation !== "PERMANENTLY DELETE") {
        throw new WonFlowApiError(400, "delete-confirmation-mismatch", 'Type "PERMANENTLY DELETE" to confirm permanent deletion.');
      }

      // Delete all related records in the correct order respecting foreign key constraints
      await transaction.membershipRole.deleteMany({
        where: {
          membership: { tenantId: tenant.id },
        },
      });

      await transaction.rolePermission.deleteMany({
        where: {
          role: { tenantId: tenant.id },
        },
      });

      await transaction.role.deleteMany({
        where: { tenantId: tenant.id },
      });

      await transaction.tenantMembership.deleteMany({
        where: { tenantId: tenant.id },
      });

      await transaction.branch.deleteMany({
        where: { tenantId: tenant.id },
      });

      await transaction.organization.deleteMany({
        where: { tenantId: tenant.id },
      });

      await transaction.tenantEntitlement.deleteMany({
        where: { tenantId: tenant.id },
      });

      await transaction.tenantSubscription.deleteMany({
        where: { tenantId: tenant.id },
      });

      await transaction.auditEvent.deleteMany({
        where: { tenantId: tenant.id },
      });

      await transaction.outboxEvent.deleteMany({
        where: { tenantId: tenant.id },
      });

      await transaction.supportAccessGrant.deleteMany({
        where: { tenantId: tenant.id },
      });

      await transaction.authSession.deleteMany({
        where: { identity: { memberships: { some: { tenantId: tenant.id } } } },
      });

      await transaction.identity.deleteMany({
        where: {
          memberships: { some: { tenantId: tenant.id } },
          isPlatformAdministrator: false,
        },
      });

      // Finally delete the tenant
      await transaction.tenant.delete({
        where: { id: tenant.id },
      });

      await transaction.auditEvent.create({
        data: {
          tenantId: null,
          requestId: context.requestId,
          action: "platform.tenant.permanently-deleted",
          entityType: "tenant",
          entityId: tenant.id,
          severity: "CRITICAL",
          reason,
          metadata: { actorIdentityId: context.userId, tenantSlug: tenant.slug, tenantDisplayName: tenant.displayName },
          sourceApplication: context.sourceApplication,
        },
      });

      return { deletedTenantId: tenant.id, tenantSlug: tenant.slug };
    });
  }

  async restoreTenant(
    context: WonFlowPlatformRequestContext,
    input: { tenantId: string; confirmation: string; reason: string },
  ) {
    requirePermission(context, "platform.tenants.manage");

    const confirmation = input.confirmation?.trim() ?? "";
    const reason = input.reason?.trim() ?? "";
    if (reason.length < 8) {
      throw new WonFlowApiError(400, "restore-reason-required", "Enter a clear reason of at least 8 characters.");
    }

    return database.$transaction(async (transaction) => {
      const tenant = await transaction.tenant.findFirst({
        where: { id: input.tenantId, archivedAt: { not: null } },
        include: { organizations: true },
      });
      if (!tenant) {
        throw new WonFlowApiError(404, "tenant-not-found", "The archived tenant could not be found.");
      }
      if (tenant.slug === "wonflow-development") {
        throw new WonFlowApiError(403, "internal-tenant-protected", "The internal development tenant cannot be restored here.");
      }
      if (confirmation !== "RESTORE") {
        throw new WonFlowApiError(400, "restore-confirmation-mismatch", 'Type "RESTORE" to confirm restoration.');
      }

      const restoredAt = new Date();
      
      // Restore tenant status to ACTIVE (was DRAFT, but restored tenants should be operational)
      const restoredTenant = await transaction.tenant.update({
        where: { id: tenant.id },
        data: { status: "ACTIVE", archivedAt: null },
      });

      // Restore organizations
      await transaction.organization.updateMany({
        where: { tenantId: tenant.id },
        data: { status: "ACTIVE", archivedAt: null },
      });

      // Restore branches
      await transaction.branch.updateMany({
        where: { tenantId: tenant.id },
        data: { status: "ACTIVE", archivedAt: null },
      });

      // Restore memberships
      await transaction.tenantMembership.updateMany({
        where: { tenantId: tenant.id },
        data: { status: "ACTIVE", archivedAt: null },
      });

      // Restore subscription status if it was cancelled
      await transaction.tenantSubscription.updateMany({
        where: { tenantId: tenant.id, status: "CANCELLED" },
        data: { status: "UNCONFIGURED" },
      });

      await transaction.auditEvent.create({
        data: {
          tenantId: tenant.id,
          requestId: context.requestId,
          action: "platform.tenant.restored",
          entityType: "tenant",
          entityId: tenant.id,
          severity: "WARNING",
          reason,
          metadata: { actorIdentityId: context.userId, tenantSlug: tenant.slug, tenantDisplayName: tenant.displayName },
          sourceApplication: context.sourceApplication,
        },
      });

      await transaction.outboxEvent.create({
        data: {
          tenantId: tenant.id,
          type: "tenant.restored",
          aggregateType: "tenant",
          aggregateId: tenant.id,
          payload: { tenantId: tenant.id, tenantSlug: tenant.slug, restoredAt: restoredAt.toISOString() },
        },
      });

      return restoredTenant;
    });
  }

  async setEntitlement(context: WonFlowPlatformRequestContext, input: { tenantId: string; moduleCode: string; enabled: boolean; limits?: object; tenantSlug?: string; tenantDisplayName?: string }) {
    requirePermission(context, "platform.entitlements.manage");
    if (!PLATFORM_MODULE_CODES.has(input.moduleCode) || typeof input.enabled !== "boolean") throw new WonFlowApiError(400, "invalid-entitlement", "The entitlement request is invalid.");
    return database.$transaction(async (transaction) => {
      const resolved = await resolveTenant(transaction, input);
      let tenant = resolved.tenant;
      if (tenant?.archivedAt) throw new WonFlowApiError(409, "tenant-archived", "Archived tenant backups cannot have entitlements changed.");
      if (!tenant) {
        if (!resolved.slug || !input.tenantDisplayName?.trim()) throw new WonFlowApiError(404, "tenant-not-found", "The tenant could not be resolved.");
        tenant = await transaction.tenant.create({ data: { slug: resolved.slug, displayName: input.tenantDisplayName.trim(), status: "DRAFT", organizations: { create: { code: "MAIN", displayName: input.tenantDisplayName.trim() } }, subscription: { create: {} } } });
      }
      const entitlement = await transaction.tenantEntitlement.upsert({ where: { tenantId_moduleCode: { tenantId: tenant.id, moduleCode: input.moduleCode } }, create: { tenantId: tenant.id, moduleCode: input.moduleCode, enabled: input.enabled, limits: input.limits }, update: { enabled: input.enabled, limits: input.limits } });
      await transaction.auditEvent.create({ data: { tenantId: tenant.id, requestId: context.requestId, action: input.enabled ? "platform.entitlement.enabled" : "platform.entitlement.disabled", entityType: "tenant-entitlement", entityId: entitlement.id, severity: "WARNING", metadata: { moduleCode: input.moduleCode, enabled: input.enabled, actorIdentityId: context.userId }, sourceApplication: context.sourceApplication } });
      return entitlement;
    });
  }

  async updateSubscription(context: WonFlowPlatformRequestContext, input: TenantReference & { planCode: string; status: "UNCONFIGURED" | "TRIAL" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELLED"; monthlyAmountMinor: number; seatCount: number; currencyCode: string; trialEndsAt?: string; renewsAt?: string }) {
    requirePermission(context, "platform.subscriptions.manage");
    return database.$transaction(async (transaction) => {
      const resolved = await resolveTenant(transaction, input);
      if (!resolved.tenant) throw new WonFlowApiError(404, "tenant-not-found", "Activate the tenant before saving its subscription.");
      if (resolved.tenant.archivedAt) throw new WonFlowApiError(409, "tenant-archived", "Archived tenant backups cannot have subscriptions changed.");
      const data = {
        planCode: input.planCode,
        status: input.status,
        monthlyAmountMinor: input.monthlyAmountMinor,
        seatCount: input.seatCount,
        currencyCode: input.currencyCode,
        trialEndsAt: optionalDate(input.trialEndsAt, "Trial end date"),
        renewsAt: optionalDate(input.renewsAt, "Renewal date"),
      };
      const subscription = await transaction.tenantSubscription.upsert({ where: { tenantId: resolved.tenant.id }, create: { tenantId: resolved.tenant.id, ...data }, update: data });
      await transaction.auditEvent.create({ data: { tenantId: resolved.tenant.id, requestId: context.requestId, action: "platform.subscription.updated", entityType: "tenant-subscription", entityId: subscription.id, severity: "WARNING", metadata: { actorIdentityId: context.userId, status: subscription.status, planCode: subscription.planCode }, sourceApplication: context.sourceApplication } });
      return subscription;
    });
  }

  async cancelSubscription(context: WonFlowPlatformRequestContext, input: { tenantId: string; confirmation: string; reason: string }) {
    requirePermission(context, "platform.subscriptions.manage");
    const reason = input.reason?.trim() ?? "";
    if (reason.length < 8) throw new WonFlowApiError(400, "cancellation-reason-required", "Enter a clear cancellation reason of at least 8 characters.");
    if (input.confirmation?.trim() !== "CANCEL SUBSCRIPTION") throw new WonFlowApiError(400, "cancellation-confirmation-mismatch", "Type \"CANCEL SUBSCRIPTION\" to confirm cancellation.");
    return database.$transaction(async (transaction) => {
      const tenant = await transaction.tenant.findFirst({ where: { id: input.tenantId, archivedAt: null } });
      if (!tenant) throw new WonFlowApiError(404, "tenant-not-found", "The active tenant could not be found.");
      const subscription = await transaction.tenantSubscription.update({ where: { tenantId: tenant.id }, data: { status: "CANCELLED", renewsAt: new Date() } });
      await transaction.auditEvent.create({ data: { tenantId: tenant.id, requestId: context.requestId, action: "platform.subscription.cancelled", entityType: "tenant-subscription", entityId: subscription.id, severity: "CRITICAL", reason, metadata: { actorIdentityId: context.userId }, sourceApplication: context.sourceApplication } });
      await transaction.outboxEvent.create({ data: { tenantId: tenant.id, type: "tenant.subscription.cancelled", aggregateType: "tenant-subscription", aggregateId: subscription.id, payload: { tenantId: tenant.id, cancelledAt: new Date().toISOString(), reason } } });
      return subscription;
    });
  }

  /** Time-boxed, reason-required and audited — the server, not the client, caps how long a grant can run for. */
  async createSupportAccess(context: WonFlowPlatformRequestContext, input: { tenantId: string; reason: string; permissionCodes?: string[]; expiresAt: string }) {
    requirePermission(context, "platform.support-access.manage");
    const reason = input.reason?.trim() ?? "";
    if (reason.length < 8) throw new WonFlowApiError(400, "support-access-reason-required", "Enter a clear reason of at least 8 characters.");
    const expiresAt = new Date(input.expiresAt);
    const maxExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) throw new WonFlowApiError(400, "support-access-expiry-invalid", "The expiry must be in the future.");
    if (expiresAt.getTime() > maxExpiresAt.getTime()) throw new WonFlowApiError(400, "support-access-expiry-too-long", "Support access cannot be granted for more than 24 hours at a time.");
    return database.$transaction(async (transaction) => {
      const tenant = await transaction.tenant.findFirst({ where: { id: input.tenantId, archivedAt: null } });
      if (!tenant) throw new WonFlowApiError(404, "tenant-not-found", "Support access cannot be created for an archived tenant backup.");
      const grant = await transaction.supportAccessGrant.create({ data: { tenantId: input.tenantId, requestedByIdentityId: context.userId, reason, permissionCodes: input.permissionCodes ?? [], expiresAt } });
      await transaction.auditEvent.create({ data: { tenantId: input.tenantId, requestId: context.requestId, action: "platform.support-access.granted", entityType: "support-access-grant", entityId: grant.id, severity: "WARNING", reason, sourceApplication: context.sourceApplication } });
      return grant;
    });
  }

  async updateSupportAccess(context: WonFlowPlatformRequestContext, input: { accessId: string; status: "APPROVED" | "ACTIVE" | "REVOKED" | "REJECTED"; reason?: string }) {
    requirePermission(context, "platform.support-access.manage");
    const reason = input.reason?.trim() ?? "";
    if (input.status === "REVOKED" && reason.length < 4) throw new WonFlowApiError(400, "support-access-reason-required", "Enter a reason for revoking this grant.");
    // An already-expired grant must never be reactivated — that would let a
    // 24-hour-capped window be extended indefinitely by re-approving it.
    if (input.status === "APPROVED" || input.status === "ACTIVE") {
      const existing = await database.supportAccessGrant.findUnique({ where: { id: input.accessId }, select: { expiresAt: true } });
      if (existing && existing.expiresAt.getTime() <= Date.now()) throw new WonFlowApiError(409, "support-access-expired", "This grant has already expired and cannot be reactivated. Create a new one instead.");
    }
    return database.$transaction(async (transaction) => {
      const grant = await transaction.supportAccessGrant.update({ where: { id: input.accessId }, data: { status: input.status, approvedByIdentityId: input.status === "APPROVED" ? context.userId : undefined, approvedAt: input.status === "APPROVED" ? new Date() : undefined, revokedAt: input.status === "REVOKED" ? new Date() : undefined } });
      await transaction.auditEvent.create({ data: { tenantId: grant.tenantId, requestId: context.requestId, action: `platform.support-access.${input.status.toLowerCase()}`, entityType: "support-access-grant", entityId: grant.id, severity: input.status === "REVOKED" ? "WARNING" : "INFORMATION", reason: reason || null, sourceApplication: context.sourceApplication } });
      return grant;
    });
  }

  /** Self-healing expiry: any ACTIVE grant past its expiresAt is revoked the moment anyone next lists support access — never left "active" waiting for a human to notice. */
  private async expireStaleSupportAccessGrants() {
    await database.supportAccessGrant.updateMany({ where: { status: { in: ["APPROVED", "ACTIVE"] }, expiresAt: { lt: new Date() } }, data: { status: "REVOKED", revokedAt: new Date() } });
  }

  async getDashboard(context: WonFlowPlatformRequestContext) {
    requirePermission(context, "platform.tenants.read");
    requirePermission(context, "platform.audit.read");

    const now = new Date();
    const internalDevelopmentTenantSlug = "wonflow-development";
    const activityStart = new Date(now);
    activityStart.setUTCDate(activityStart.getUTCDate() - 6);
    activityStart.setUTCHours(0, 0, 0, 0);

    const [tenants, supportAccess, activityEvents, recentEvents] = await Promise.all([
      database.tenant.findMany({
        where: { archivedAt: null, slug: { not: internalDevelopmentTenantSlug } },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          slug: true,
          displayName: true,
          status: true,
          defaultCurrencyCode: true,
          createdAt: true,
          updatedAt: true,
          subscription: true,
          entitlements: { where: { enabled: true }, select: { id: true } },
          _count: { select: { branches: true, memberships: true } },
        },
        take: 500,
      }),
      database.supportAccessGrant.findMany({
        where: {
          status: { in: ["REQUESTED", "APPROVED", "ACTIVE"] },
          tenant: { slug: { not: internalDevelopmentTenantSlug } },
        },
        select: { status: true, expiresAt: true },
        take: 500,
      }),
      database.auditEvent.findMany({
        where: {
          createdAt: { gte: activityStart },
          OR: [
            { tenantId: null },
            { tenant: { slug: { not: internalDevelopmentTenantSlug } } },
          ],
        },
        select: { createdAt: true, severity: true },
        take: 10_000,
      }),
      database.auditEvent.findMany({
        where: {
          OR: [
            { tenantId: null },
            { tenant: { slug: { not: internalDevelopmentTenantSlug } } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          action: true,
          entityType: true,
          severity: true,
          reason: true,
          sourceApplication: true,
          createdAt: true,
          tenant: { select: { displayName: true } },
        },
      }),
    ]);

    const tenantStatuses = ["DRAFT", "ACTIVE", "SUSPENDED"] as const;
    const subscriptionStatuses = ["UNCONFIGURED", "TRIAL", "ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELLED"] as const;
    const tenantStatusDistribution = tenantStatuses.map((status) => ({
      status: status.toLowerCase(),
      count: tenants.filter((tenant) => tenant.status === status).length,
    }));
    const subscriptionStatusDistribution = subscriptionStatuses.map((status) => ({
      status: status.toLowerCase().replaceAll("_", "-"),
      count: tenants.filter((tenant) => tenant.subscription?.status === status).length,
    }));

    const planCounts = new Map<string, number>();
    const revenueCounts = new Map<string, number>();
    for (const tenant of tenants) {
      const plan = tenant.subscription?.planCode.trim().toLowerCase() || "unconfigured";
      planCounts.set(plan, (planCounts.get(plan) ?? 0) + 1);
      if (tenant.subscription && ["ACTIVE", "TRIAL"].includes(tenant.subscription.status)) {
        revenueCounts.set(
          tenant.subscription.currencyCode,
          (revenueCounts.get(tenant.subscription.currencyCode) ?? 0) + tenant.subscription.monthlyAmountMinor,
        );
      }
    }

    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const tenantGrowth = Array.from({ length: 6 }, (_, index) => {
      const monthStart = new Date(Date.UTC(startOfMonth.getUTCFullYear(), startOfMonth.getUTCMonth() - (5 - index), 1));
      const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));
      return {
        label: new Intl.DateTimeFormat("en", { month: "short" }).format(monthStart),
        created: tenants.filter((tenant) => tenant.createdAt >= monthStart && tenant.createdAt < monthEnd).length,
        total: tenants.filter((tenant) => tenant.createdAt < monthEnd).length,
      };
    });

    const activityTrend = Array.from({ length: 7 }, (_, index) => {
      const dayStart = new Date(activityStart);
      dayStart.setUTCDate(activityStart.getUTCDate() + index);
      const dayEnd = new Date(dayStart);
      dayEnd.setUTCDate(dayStart.getUTCDate() + 1);
      const events = activityEvents.filter((event) => event.createdAt >= dayStart && event.createdAt < dayEnd);
      return {
        label: new Intl.DateTimeFormat("en", { weekday: "short" }).format(dayStart),
        total: events.length,
        warnings: events.filter((event) => event.severity === "WARNING" || event.severity === "CRITICAL").length,
      };
    });

    const activeSupportAccess = supportAccess.filter((access) => access.status === "ACTIVE" && access.expiresAt > now).length;
    const pendingSupportAccess = supportAccess.filter((access) => access.status === "REQUESTED" || access.status === "APPROVED").length;

    return {
      generatedAt: now.toISOString(),
      totals: {
        tenants: tenants.length,
        activeTenants: tenants.filter((tenant) => tenant.status === "ACTIVE").length,
        configuredSubscriptions: tenants.filter((tenant) => tenant.subscription?.status !== "UNCONFIGURED").length,
        seats: tenants.reduce((total, tenant) => total + (tenant.subscription?.seatCount ?? 0), 0),
        users: tenants.reduce((total, tenant) => total + tenant._count.memberships, 0),
        branches: tenants.reduce((total, tenant) => total + tenant._count.branches, 0),
        enabledEntitlements: tenants.reduce((total, tenant) => total + tenant.entitlements.length, 0),
        activeSupportAccess,
        pendingSupportAccess,
      },
      recurringRevenue: [...revenueCounts.entries()].map(([currencyCode, amountMinor]) => ({ currencyCode, amountMinor })),
      tenantStatusDistribution,
      subscriptionStatusDistribution,
      planDistribution: [...planCounts.entries()].sort((left, right) => right[1] - left[1]).map(([plan, count]) => ({ plan, count })),
      tenantGrowth,
      activityTrend,
      tenants: tenants.slice(0, 8).map((tenant) => ({
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.displayName,
        status: tenant.status.toLowerCase(),
        branches: tenant._count.branches,
        users: tenant._count.memberships,
        plan: tenant.subscription?.planCode.trim().toLowerCase() || "unconfigured",
        billingStatus: tenant.subscription?.status.toLowerCase().replaceAll("_", "-") ?? "unconfigured",
        seats: tenant.subscription?.seatCount ?? 0,
        currencyCode: tenant.subscription?.currencyCode ?? tenant.defaultCurrencyCode,
        monthlyAmountMinor: tenant.subscription?.monthlyAmountMinor ?? 0,
        enabledEntitlements: tenant.entitlements.length,
        updatedAt: tenant.updatedAt.toISOString(),
      })),
      recentActivity: recentEvents.map((event) => ({
        id: event.id,
        action: event.action,
        entityType: event.entityType,
        severity: event.severity.toLowerCase(),
        description: event.reason || `${event.entityType.replaceAll("-", " ")} configuration was updated.`,
        organizationName: event.tenant?.displayName ?? null,
        sourceApplication: event.sourceApplication,
        createdAt: event.createdAt.toISOString(),
      })),
    };
  }

  async listAudit(context: WonFlowPlatformRequestContext) {
    requirePermission(context, "platform.audit.read");
    return database.auditEvent.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  }

  async listSupportAccess(context: WonFlowPlatformRequestContext) {
    requirePermission(context, "platform.support-access.manage");
    await this.expireStaleSupportAccessGrants();
    return database.supportAccessGrant.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { tenant: { select: { id: true, displayName: true } } },
    });
  }
}

export const platformAdministrationService = new PlatformAdministrationService();
