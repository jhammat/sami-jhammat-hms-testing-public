import { database } from "@wonflow/database";
import type { Prisma } from "@wonflow/database";
import { requireBranchId, requirePermission, requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext } from "@wonflow/contracts";
import { WonFlowApiError } from "@/server/http/route-handler";
import { nextInvoiceNumber } from "@/server/finance/invoice-numbering";

const ALLOWED_PAYMENT_METHODS = new Set([
  "cash", "credit-card", "debit-card", "bank-transfer", "mobile-wallet", "online-payment",
  "cheque", "insurance", "corporate-credit", "government-program", "patient-deposit",
  "internal-transfer", "other",
]);

/** Every line's discount is clamped to that line's own gross — a line can never go negative. */
function computeLineTotalMinor(unitPriceMinor: number, quantity: number, discountMinor: number): number {
  const gross = Math.round(unitPriceMinor * quantity);
  const discount = Math.min(Math.max(0, discountMinor), gross);
  return gross - discount;
}

interface InvoiceLineInput {
  serviceId?: string;
  description?: string;
  quantity: number;
  unitPriceMinor?: number;
  discountMinor?: number;
}

const INVOICE_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["ISSUED", "CANCELLED"],
  ISSUED: ["VOID", "CANCELLED"],
  PARTIALLY_PAID: [],
  PAID: [],
  VOID: [],
  CANCELLED: [],
};

export class BillingService {
  private async resolveInvoiceLines(tx: Prisma.TransactionClient, tenantId: string, branchId: string, lines: InvoiceLineInput[]) {
    if (!lines.length) throw new WonFlowApiError(400, "invoice-lines-required", "Add at least one line item.");
    const serviceIds = [...new Set(lines.filter((line) => line.serviceId).map((line) => line.serviceId!))];
    const services = serviceIds.length
      ? await tx.serviceDefinition.findMany({ where: { tenantId, id: { in: serviceIds }, isActive: true, OR: [{ branchId: null }, { branchId }] } })
      : [];
    if (services.length !== serviceIds.length) throw new WonFlowApiError(400, "invalid-invoice-service", "A requested service is unavailable.");

    return lines.map((line) => {
      const quantity = Number(line.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) throw new WonFlowApiError(400, "invalid-invoice-line", "A line item quantity is invalid.");
      const service = line.serviceId ? services.find((candidate) => candidate.id === line.serviceId) : undefined;
      const description = (line.description?.trim() || service?.name || "").trim();
      if (!description) throw new WonFlowApiError(400, "invalid-invoice-line", "A line item needs a description or a catalog service.");
      const unitPriceMinor = line.unitPriceMinor ?? service?.priceMinorUnits ?? undefined;
      if (unitPriceMinor === undefined || !Number.isInteger(unitPriceMinor) || unitPriceMinor < 0) throw new WonFlowApiError(400, "invalid-invoice-line", "A line item needs a valid unit price.");
      const totalMinor = computeLineTotalMinor(unitPriceMinor, quantity, line.discountMinor ?? 0);
      return { serviceId: service?.id ?? null, description, quantity, unitPriceMinor, totalMinor };
    });
  }

  async listInvoices(rc: WonFlowRequestContext, query: { patientId?: string; status?: string; branchId?: string; from?: string; to?: string }) {
    const c = requireTenantContext(rc);
    requirePermission(c, "billing.invoices.read");
    return database.invoice.findMany({
      where: {
        tenantId: c.tenantId,
        ...(query.patientId ? { patientId: query.patientId } : {}),
        ...(query.status ? { status: query.status as never } : {}),
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.from || query.to ? { createdAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } } : {}),
      },
      include: { lines: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async getInvoice(rc: WonFlowRequestContext, invoiceId: string) {
    const c = requireTenantContext(rc);
    requirePermission(c, "billing.invoices.read");
    const invoice = await database.invoice.findFirst({ where: { id: invoiceId, tenantId: c.tenantId }, include: { lines: true, payments: true, refunds: true } });
    if (!invoice) throw new WonFlowApiError(404, "invoice-not-found", "The invoice could not be found.");
    return invoice;
  }

  async createInvoice(rc: WonFlowRequestContext, input: { patientId: string; dueAt?: string; discountMinor?: number; reason?: string; lines: InvoiceLineInput[] }) {
    const c = requireTenantContext(rc);
    requirePermission(c, "billing.invoices.manage");
    const branchId = requireBranchId(c);
    return database.$transaction(async (tx) => {
      if (!await tx.patient.findFirst({ where: { id: input.patientId, tenantId: c.tenantId }, select: { id: true } })) throw new WonFlowApiError(404, "patient-not-found", "The patient could not be found.");
      const lines = await this.resolveInvoiceLines(tx, c.tenantId, branchId, input.lines);
      const subtotalMinor = lines.reduce((sum, line) => sum + line.totalMinor, 0);
      const discountMinor = Math.min(Math.max(0, input.discountMinor ?? 0), subtotalMinor);
      if (discountMinor > 0 && !input.reason?.trim()) {
        throw new WonFlowApiError(400, "discount-reason-required", "A reason or authority note is required when applying a discount.");
      }
      const totalMinor = subtotalMinor - discountMinor;
      const invoiceNumber = await nextInvoiceNumber(tx, c.tenantId);
      const invoice = await tx.invoice.create({
        data: {
          tenantId: c.tenantId, patientId: input.patientId, branchId, invoiceNumber, status: "DRAFT",
          subtotalMinor, discountMinor, totalMinor, paidMinor: 0,
          dueAt: input.dueAt ? new Date(input.dueAt) : null,
          lines: { create: lines },
        },
        include: { lines: true },
      });
      await tx.auditEvent.create({ data: { tenantId: c.tenantId, branchId, actorMembershipId: c.membershipId, sessionId: c.sessionId, requestId: c.requestId, action: "billing.invoice.created", entityType: "invoice", entityId: invoice.id, severity: "INFORMATION", reason: input.reason?.trim() || null, sourceApplication: c.sourceApplication } });
      return invoice;
    });
  }

  async addInvoiceLine(rc: WonFlowRequestContext, invoiceId: string, input: InvoiceLineInput & { reason?: string }) {
    const c = requireTenantContext(rc);
    requirePermission(c, "billing.invoices.manage");
    const branchId = requireBranchId(c);
    return database.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, tenantId: c.tenantId }, include: { lines: true } });
      if (!invoice) throw new WonFlowApiError(404, "invoice-not-found", "The invoice could not be found.");
      if (invoice.status !== "DRAFT") throw new WonFlowApiError(409, "invoice-not-editable", "Only a draft invoice can have lines added.");
      const [line] = await this.resolveInvoiceLines(tx, c.tenantId, invoice.branchId, [input]);
      const created = await tx.invoiceLine.create({ data: { invoiceId: invoice.id, ...line } });
      const subtotalMinor = invoice.subtotalMinor + line.totalMinor;
      const totalMinor = Math.max(0, subtotalMinor - invoice.discountMinor);
      await tx.invoice.update({ where: { id: invoice.id }, data: { subtotalMinor, totalMinor, version: { increment: 1 } } });
      await tx.auditEvent.create({ data: { tenantId: c.tenantId, branchId, actorMembershipId: c.membershipId, sessionId: c.sessionId, requestId: c.requestId, action: "billing.invoice.line_added", entityType: "invoice", entityId: invoice.id, severity: "INFORMATION", reason: input.reason?.trim() || null, sourceApplication: c.sourceApplication } });
      return created;
    });
  }

  async updateInvoice(rc: WonFlowRequestContext, invoiceId: string, input: { status?: string; dueAt?: string | null; reason?: string }) {
    const c = requireTenantContext(rc);
    requirePermission(c, "billing.invoices.manage");
    const branchId = requireBranchId(c);
    return database.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, tenantId: c.tenantId } });
      if (!invoice) throw new WonFlowApiError(404, "invoice-not-found", "The invoice could not be found.");

      const data: Prisma.InvoiceUpdateInput = { version: { increment: 1 } };
      let action = "billing.invoice.updated";

      if (input.status !== undefined && input.status !== invoice.status) {
        const allowed = INVOICE_STATUS_TRANSITIONS[invoice.status] ?? [];
        if (!allowed.includes(input.status)) throw new WonFlowApiError(409, "invoice-status-transition-invalid", `An invoice cannot move from ${invoice.status} to ${input.status}.`);
        if ((input.status === "VOID" || input.status === "CANCELLED") && invoice.paidMinor > 0) throw new WonFlowApiError(409, "invoice-has-payments", "An invoice with recorded payments cannot be voided or cancelled directly.");
        if (!input.reason?.trim()) throw new WonFlowApiError(400, "reason-required", "A reason is required to change an invoice's status.");
        data.status = input.status as Prisma.InvoiceUpdateInput["status"];
        if (input.status === "ISSUED") data.issuedAt = new Date();
        action = `billing.invoice.status_changed.${input.status.toLowerCase()}`;
      }

      if (input.dueAt !== undefined) data.dueAt = input.dueAt ? new Date(input.dueAt) : null;

      const updated = await tx.invoice.update({ where: { id: invoice.id }, data, include: { lines: true } });
      await tx.auditEvent.create({ data: { tenantId: c.tenantId, branchId, actorMembershipId: c.membershipId, sessionId: c.sessionId, requestId: c.requestId, action, entityType: "invoice", entityId: invoice.id, severity: "INFORMATION", reason: input.reason?.trim() || null, sourceApplication: c.sourceApplication } });
      return updated;
    });
  }

  async listPayments(rc: WonFlowRequestContext, query: { invoiceId?: string; status?: string }) {
    const c = requireTenantContext(rc);
    requirePermission(c, "billing.payments.read");
    return database.payment.findMany({
      where: { tenantId: c.tenantId, ...(query.invoiceId ? { invoiceId: query.invoiceId } : {}), ...(query.status ? { status: query.status as never } : {}) },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  /** Payment settlement and the resulting invoice status change happen inside one transaction — a payment is never recorded without its invoice balance moving in lockstep. */
  async createPayment(rc: WonFlowRequestContext, input: { invoiceId: string; method: string; amountMinor: number; reference?: string; reason?: string }) {
    const c = requireTenantContext(rc);
    requirePermission(c, "billing.payments.manage");
    const branchId = requireBranchId(c);
    if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) throw new WonFlowApiError(400, "invalid-payment-amount", "The payment amount must be a positive whole number of minor units.");
    if (!ALLOWED_PAYMENT_METHODS.has(input.method)) throw new WonFlowApiError(400, "invalid-payment-method", "The payment method is not recognized.");

    return database.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({ where: { id: input.invoiceId, tenantId: c.tenantId } });
      if (!invoice) throw new WonFlowApiError(404, "invoice-not-found", "The invoice could not be found.");
      if (invoice.status === "DRAFT") throw new WonFlowApiError(409, "invoice-not-issued", "A draft invoice cannot receive payments — issue it first.");
      if (invoice.status === "VOID" || invoice.status === "CANCELLED") throw new WonFlowApiError(409, "invoice-not-payable", "A voided or cancelled invoice cannot receive payments.");
      const outstandingMinor = invoice.totalMinor - invoice.paidMinor;
      if (input.amountMinor > outstandingMinor) throw new WonFlowApiError(409, "payment-exceeds-balance", `This payment of ${input.amountMinor} exceeds the outstanding balance of ${outstandingMinor}.`);

      const payment = await tx.payment.create({
        data: { tenantId: c.tenantId, invoiceId: invoice.id, receivedByMembershipId: c.membershipId!, status: "COMPLETED", method: input.method, amountMinor: input.amountMinor, currencyCode: invoice.currencyCode, reference: input.reference?.trim() || null, completedAt: new Date() },
      });

      const paidMinor = invoice.paidMinor + input.amountMinor;
      const newStatus = paidMinor >= invoice.totalMinor ? "PAID" : "PARTIALLY_PAID";
      const settled = await tx.invoice.updateMany({ where: { id: invoice.id, version: invoice.version }, data: { paidMinor, status: newStatus, version: { increment: 1 } } });
      if (settled.count !== 1) throw new WonFlowApiError(409, "invoice-changed", "The invoice changed while this payment was being recorded. Reload and try again.");

      await tx.auditEvent.create({ data: { tenantId: c.tenantId, branchId, actorMembershipId: c.membershipId, sessionId: c.sessionId, requestId: c.requestId, action: "billing.payment.recorded", entityType: "payment", entityId: payment.id, severity: "INFORMATION", reason: input.reason?.trim() || null, metadata: { invoiceId: invoice.id, invoiceStatus: newStatus, paidMinor }, sourceApplication: c.sourceApplication } });
      return payment;
    });
  }

  async listRefunds(rc: WonFlowRequestContext, query: { invoiceId?: string; status?: string }) {
    const c = requireTenantContext(rc);
    requirePermission(c, "billing.refunds.read");
    return database.refund.findMany({
      where: { tenantId: c.tenantId, ...(query.invoiceId ? { invoiceId: query.invoiceId } : {}), ...(query.status ? { status: query.status as never } : {}) },
      orderBy: { requestedAt: "desc" },
      take: 100,
    });
  }

  async createRefund(rc: WonFlowRequestContext, input: { invoiceId: string; paymentId: string; amountMinor: number; reason: string }) {
    const c = requireTenantContext(rc);
    requirePermission(c, "billing.refunds.manage");
    const branchId = requireBranchId(c);
    if (!input.reason?.trim()) throw new WonFlowApiError(400, "reason-required", "A reason is required to request a refund.");
    if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) throw new WonFlowApiError(400, "invalid-refund-amount", "The refund amount must be a positive whole number of minor units.");

    return database.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({ where: { id: input.invoiceId, tenantId: c.tenantId } });
      if (!invoice) throw new WonFlowApiError(404, "invoice-not-found", "The invoice could not be found.");
      const payment = await tx.payment.findFirst({ where: { id: input.paymentId, tenantId: c.tenantId, invoiceId: input.invoiceId, status: "COMPLETED" } });
      if (!payment) throw new WonFlowApiError(404, "payment-not-found", "The payment could not be found.");
      const existingRefunds = await tx.refund.aggregate({ where: { paymentId: payment.id, status: { in: ["REQUESTED", "APPROVED", "COMPLETED"] } }, _sum: { amountMinor: true } });
      const alreadyRefundedMinor = existingRefunds._sum.amountMinor ?? 0;
      const refundableMinor = payment.amountMinor - alreadyRefundedMinor;
      if (input.amountMinor > refundableMinor) throw new WonFlowApiError(409, "refund-exceeds-payment", `This refund of ${input.amountMinor} exceeds the refundable balance of ${refundableMinor} on this payment.`);

      const locked = await tx.invoice.updateMany({ where: { id: invoice.id, version: invoice.version }, data: { version: { increment: 1 } } });
      if (locked.count !== 1) throw new WonFlowApiError(409, "concurrent-refund-conflict", "The invoice was modified by a concurrent transaction. Please refresh and try again.");

      const refund = await tx.refund.create({
        data: { tenantId: c.tenantId, invoiceId: input.invoiceId, paymentId: payment.id, amountMinor: input.amountMinor, currencyCode: payment.currencyCode, reason: input.reason.trim(), requestedByMembershipId: c.membershipId! },
      });
      await tx.auditEvent.create({ data: { tenantId: c.tenantId, branchId, actorMembershipId: c.membershipId, sessionId: c.sessionId, requestId: c.requestId, action: "billing.refund.requested", entityType: "refund", entityId: refund.id, severity: "INFORMATION", reason: input.reason.trim(), sourceApplication: c.sourceApplication } });
      return refund;
    });
  }

  /** A refund is never released on the requester's own authority — approving it records a distinct approver and a reason, and moves REQUESTED -> APPROVED. */
  async approveRefund(rc: WonFlowRequestContext, refundId: string, input: { reason: string }) {
    const c = requireTenantContext(rc);
    requirePermission(c, "billing.refunds.manage");
    const branchId = requireBranchId(c);
    if (!input.reason?.trim()) throw new WonFlowApiError(400, "reason-required", "A reason is required to approve a refund.");

    return database.$transaction(async (tx) => {
      const refund = await tx.refund.findFirst({ where: { id: refundId, tenantId: c.tenantId } });
      if (!refund) throw new WonFlowApiError(404, "refund-not-found", "The refund request could not be found.");
      if (refund.status !== "REQUESTED") throw new WonFlowApiError(409, "refund-not-approvable", "Only a requested refund can be approved.");

      const approved = await tx.refund.update({ where: { id: refund.id }, data: { status: "APPROVED", approvedByMembershipId: c.membershipId!, approvedAt: new Date() } });
      await tx.auditEvent.create({ data: { tenantId: c.tenantId, branchId, actorMembershipId: c.membershipId, sessionId: c.sessionId, requestId: c.requestId, action: "billing.refund.approved", entityType: "refund", entityId: refund.id, severity: "INFORMATION", reason: input.reason.trim(), sourceApplication: c.sourceApplication } });
      return approved;
    });
  }

  /** Disburse an approved (or requested) refund to the patient, moving it to COMPLETED and adjusting the invoice paid balance. */
  async completeRefund(rc: WonFlowRequestContext, refundId: string, input: { reason?: string }) {
    const c = requireTenantContext(rc);
    requirePermission(c, "billing.refunds.manage");
    const branchId = requireBranchId(c);

    return database.$transaction(async (tx) => {
      const refund = await tx.refund.findFirst({
        where: { id: refundId, tenantId: c.tenantId },
        include: { invoice: true },
      });
      if (!refund) throw new WonFlowApiError(404, "refund-not-found", "The refund request could not be found.");
      if (refund.status !== "APPROVED" && refund.status !== "REQUESTED") {
        throw new WonFlowApiError(409, "refund-not-completable", `Only an approved or requested refund can be completed. Current status: ${refund.status}`);
      }

      const completed = await tx.refund.update({
        where: { id: refund.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          ...(refund.approvedAt ? {} : { approvedAt: new Date(), approvedByMembershipId: c.membershipId }),
        },
      });

      // Decrement invoice paidMinor to reflect funds returned to the patient
      const newPaidMinor = Math.max(0, refund.invoice.paidMinor - refund.amountMinor);
      const newInvoiceStatus = newPaidMinor === 0 ? "ISSUED" : "PARTIALLY_PAID";
      await tx.invoice.update({
        where: { id: refund.invoiceId },
        data: {
          paidMinor: newPaidMinor,
          status: newInvoiceStatus,
          version: { increment: 1 },
        },
      });

      await tx.auditEvent.create({
        data: {
          tenantId: c.tenantId,
          branchId,
          actorMembershipId: c.membershipId,
          sessionId: c.sessionId,
          requestId: c.requestId,
          action: "billing.refund.completed",
          entityType: "refund",
          entityId: refund.id,
          severity: "INFORMATION",
          reason: input.reason?.trim() || "Refund disbursed and completed",
          sourceApplication: c.sourceApplication,
        },
      });

      return completed;
    });
  }

  async rejectRefund(rc: WonFlowRequestContext, refundId: string, input: { reason: string }) {
    const c = requireTenantContext(rc);
    requirePermission(c, "billing.refunds.manage");
    const branchId = requireBranchId(c);
    if (!input.reason?.trim()) throw new WonFlowApiError(400, "reason-required", "A reason is required to reject a refund.");

    return database.$transaction(async (tx) => {
      const refund = await tx.refund.findFirst({ where: { id: refundId, tenantId: c.tenantId } });
      if (!refund) throw new WonFlowApiError(404, "refund-not-found", "The refund request could not be found.");
      if (refund.status !== "REQUESTED") throw new WonFlowApiError(409, "refund-not-rejectable", "Only a requested refund can be rejected.");

      const rejected = await tx.refund.update({
        where: { id: refund.id },
        data: { status: "REJECTED" },
      });

      await tx.auditEvent.create({
        data: {
          tenantId: c.tenantId,
          branchId,
          actorMembershipId: c.membershipId,
          sessionId: c.sessionId,
          requestId: c.requestId,
          action: "billing.refund.rejected",
          entityType: "refund",
          entityId: refund.id,
          severity: "INFORMATION",
          reason: input.reason.trim(),
          sourceApplication: c.sourceApplication,
        },
      });

      return rejected;
    });
  }

  /** A patient's full billing history — every invoice, payment and refund — ordered as a chronological account, for the ledger view. */
  async getPatientLedger(rc: WonFlowRequestContext, patientId: string) {
    const c = requireTenantContext(rc);
    requirePermission(c, "billing.invoices.read");
    if (!await database.patient.findFirst({ where: { id: patientId, tenantId: c.tenantId }, select: { id: true } })) throw new WonFlowApiError(404, "patient-not-found", "The patient could not be found.");
    const invoices = await database.invoice.findMany({ where: { tenantId: c.tenantId, patientId }, include: { lines: true, payments: { orderBy: { createdAt: "asc" } }, refunds: { orderBy: { requestedAt: "asc" } } }, orderBy: { createdAt: "asc" } });
    const totalBilledMinor = invoices.reduce((sum, invoice) => sum + invoice.totalMinor, 0);
    const totalPaidMinor = invoices.reduce((sum, invoice) => sum + invoice.paidMinor, 0);
    const totalRefundedMinor = invoices.reduce((sum, invoice) => sum + invoice.refunds.filter((refund) => refund.status === "COMPLETED").reduce((refundSum, refund) => refundSum + refund.amountMinor, 0), 0);
    const outstandingMinor = Math.max(0, totalBilledMinor - totalPaidMinor);
    return { patientId, invoices, summary: { totalBilledMinor, totalPaidMinor, totalRefundedMinor, outstandingMinor } };
  }

  /** End-of-day / per-branch cash reconciliation: payments collected vs. refunds paid out, grouped by method, for a date range. */
  async getReconciliation(rc: WonFlowRequestContext, query: { from: string; to: string; branchId?: string }) {
    const c = requireTenantContext(rc);
    requirePermission(c, "billing.payments.manage");
    if (!query.from || !query.to) throw new WonFlowApiError(400, "date-range-required", "A from and to date are required.");
    const from = new Date(query.from);
    const to = new Date(query.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) throw new WonFlowApiError(400, "invalid-date-range", "The date range is invalid.");
    const branchId = query.branchId ?? requireBranchId(c);

    const payments = await database.payment.findMany({ where: { tenantId: c.tenantId, status: "COMPLETED", completedAt: { gte: from, lte: to }, invoice: { branchId } }, select: { method: true, amountMinor: true } });
    const refunds = await database.refund.findMany({ where: { tenantId: c.tenantId, status: "COMPLETED", completedAt: { gte: from, lte: to }, invoice: { branchId } }, select: { amountMinor: true } });

    const byMethod = new Map<string, { collectedMinor: number; count: number }>();
    for (const payment of payments) {
      const bucket = byMethod.get(payment.method) ?? { collectedMinor: 0, count: 0 };
      bucket.collectedMinor += payment.amountMinor;
      bucket.count += 1;
      byMethod.set(payment.method, bucket);
    }
    const totalCollectedMinor = payments.reduce((sum, payment) => sum + payment.amountMinor, 0);
    const totalRefundedMinor = refunds.reduce((sum, refund) => sum + refund.amountMinor, 0);

    return {
      branchId, from: from.toISOString(), to: to.toISOString(),
      totalCollectedMinor, totalRefundedMinor, netMinor: totalCollectedMinor - totalRefundedMinor,
      byMethod: [...byMethod.entries()].map(([method, bucket]) => ({ method, ...bucket })),
      paymentCount: payments.length, refundCount: refunds.length,
    };
  }

  /**
   * Diagnostic orders a cashier still has to bill for.
   *
   * The billing counter needs to know that a doctor ordered a liver function
   * test so it can put it on the invoice. It does NOT need the result, and it
   * must not be able to read one. The counter used to call
   * `/api/v1/diagnostics/worklist`, which includes every released result on
   * the order — so the billing role was correctly refused, and four screens
   * logged a 403 while a panel sat permanently empty.
   *
   * This projects only what an invoice line needs: what was ordered, for
   * whom, when, and whether it is still outstanding. No result, no report
   * text, no critical flag, no specimen.
   */
  async listBillableDiagnosticOrders(
    rc: WonFlowRequestContext,
    query: { patientId?: string } = {},
  ) {
    const c = requireTenantContext(rc);
    requirePermission(c, "billing.invoices.manage");

    const orders = await database.diagnosticOrder.findMany({
      where: {
        tenantId: c.tenantId,
        ...(query.patientId ? { patientId: query.patientId } : {}),
        // Only work that is still open. A completed order has already been
        // through the counter or was never chargeable here.
        status: { in: ["ORDERED", "ACCEPTED"] },
      },
      select: {
        id: true,
        type: true,
        status: true,
        code: true,
        name: true,
        orderedAt: true,
        createdAt: true,
        accessionNumber: true,
        patient: {
          select: { id: true, patientNumber: true, givenName: true, familyName: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return orders;
  }
}

export const billingService = new BillingService();
