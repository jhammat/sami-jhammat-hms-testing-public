import { database } from "@wonflow/database";
import type { PaymentAccountMethod } from "@wonflow/database";
import { requirePermission, requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext, WonFlowTenantRequestContext } from "@wonflow/contracts";

import { WonFlowApiError } from "@/server/http/route-handler";

/**
 * Where a hospital tells patients to send money for an online consultation
 * that requires prepayment. Tenant-configured, never hardcoded — a bank
 * account number baked into the codebase could not be corrected without a
 * deploy, and would be the same account for every hospital on the platform.
 */

const audit = (
  tx: Parameters<Parameters<typeof database.$transaction>[0]>[0],
  c: WonFlowTenantRequestContext,
  action: string,
  entityId: string,
) =>
  tx.auditEvent.create({
    data: {
      tenantId: c.tenantId, branchId: c.branchId, actorMembershipId: c.membershipId,
      sessionId: c.sessionId, requestId: c.requestId, action, entityType: "payment-account",
      entityId, severity: "INFORMATION", sourceApplication: c.sourceApplication,
    },
  });

export class PaymentAccountsService {
  private context(rc: WonFlowRequestContext) {
    return requireTenantContext(rc);
  }

  async listPaymentAccounts(rc: WonFlowRequestContext) {
    const c = this.context(rc);
    requirePermission(c, "organization.profile.manage");
    return database.paymentAccount.findMany({ where: { tenantId: c.tenantId }, orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] });
  }

  async createPaymentAccount(rc: WonFlowRequestContext, input: {
    method?: PaymentAccountMethod;
    bankName?: string;
    accountTitle: string;
    accountNumber: string;
    iban?: string;
    isEnabled?: boolean;
    displayOrder?: number;
  }) {
    const c = this.context(rc);
    requirePermission(c, "organization.profile.manage");
    if (!input.accountTitle?.trim()) throw new WonFlowApiError(400, "invalid-account-title", "Enter the account holder's name.");
    if (!input.accountNumber?.trim()) throw new WonFlowApiError(400, "invalid-account-number", "Enter an account number.");

    return database.$transaction(async (tx) => {
      const entity = await tx.paymentAccount.create({
        data: {
          tenantId: c.tenantId,
          method: input.method ?? "BANK_TRANSFER",
          bankName: input.bankName?.trim() || null,
          accountTitle: input.accountTitle.trim(),
          accountNumber: input.accountNumber.trim(),
          iban: input.iban?.trim() || null,
          isEnabled: input.isEnabled ?? true,
          displayOrder: input.displayOrder ?? 0,
        },
      });
      await audit(tx, c, "admin.payment-account.created", entity.id);
      return entity;
    });
  }

  async updatePaymentAccount(rc: WonFlowRequestContext, id: string, input: {
    method?: PaymentAccountMethod;
    bankName?: string | null;
    accountTitle?: string;
    accountNumber?: string;
    iban?: string | null;
    isEnabled?: boolean;
    displayOrder?: number;
  }) {
    const c = this.context(rc);
    requirePermission(c, "organization.profile.manage");
    const existing = await database.paymentAccount.findFirst({ where: { id, tenantId: c.tenantId } });
    if (!existing) throw new WonFlowApiError(404, "payment-account-not-found", "This payment account could not be found.");
    if (input.accountTitle !== undefined && !input.accountTitle.trim()) throw new WonFlowApiError(400, "invalid-account-title", "Enter the account holder's name.");
    if (input.accountNumber !== undefined && !input.accountNumber.trim()) throw new WonFlowApiError(400, "invalid-account-number", "Enter an account number.");

    return database.$transaction(async (tx) => {
      const entity = await tx.paymentAccount.update({
        where: { id: existing.id },
        data: {
          method: input.method,
          bankName: input.bankName === undefined ? undefined : input.bankName?.trim() || null,
          accountTitle: input.accountTitle?.trim(),
          accountNumber: input.accountNumber?.trim(),
          iban: input.iban === undefined ? undefined : input.iban?.trim() || null,
          isEnabled: input.isEnabled,
          displayOrder: input.displayOrder,
        },
      });
      await audit(tx, c, "admin.payment-account.updated", entity.id);
      return entity;
    });
  }

  async deletePaymentAccount(rc: WonFlowRequestContext, id: string) {
    const c = this.context(rc);
    requirePermission(c, "organization.profile.manage");
    const existing = await database.paymentAccount.findFirst({ where: { id, tenantId: c.tenantId } });
    if (!existing) throw new WonFlowApiError(404, "payment-account-not-found", "This payment account could not be found.");
    return database.$transaction(async (tx) => {
      await tx.paymentAccount.delete({ where: { id: existing.id } });
      await audit(tx, c, "admin.payment-account.deleted", existing.id);
      return { id: existing.id };
    });
  }
}

export const paymentAccountsService = new PaymentAccountsService();
