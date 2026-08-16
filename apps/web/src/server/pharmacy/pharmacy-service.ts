import { database } from "@wonflow/database";
import type { Prisma } from "@wonflow/database";
import { requireBranchId, requirePermission, requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext } from "@wonflow/contracts";
import { WonFlowApiError } from "@/server/http/route-handler";

const EXPIRY_CRITICAL_DAYS = 30;
const EXPIRY_WARNING_DAYS = 90;

function daysUntil(date: Date, referenceDate = new Date()): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const start = Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate());
  const end = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.ceil((end - start) / msPerDay);
}

function expiryState(date: Date): "expired" | "critical" | "expiring" | "safe" {
  const days = daysUntil(date);
  if (days < 0) return "expired";
  if (days <= EXPIRY_CRITICAL_DAYS) return "critical";
  if (days <= EXPIRY_WARNING_DAYS) return "expiring";
  return "safe";
}

export class PharmacyService {
  // ---- Inventory (Medication catalog + aggregated stock) --------------------------

  async listInventory(rc: WonFlowRequestContext, query: { lowStockOnly?: boolean } = {}) {
    const c = requireTenantContext(rc);
    requirePermission(c, "pharmacy.inventory.read");
    const branchId = requireBranchId(c);
    const [medications, batches] = await Promise.all([
      database.medication.findMany({ where: { tenantId: c.tenantId, isActive: true }, orderBy: { genericName: "asc" } }),
      database.inventoryBatch.findMany({ where: { tenantId: c.tenantId, branchId, status: "AVAILABLE" } }),
    ]);
    const byMedication = new Map<string, { availableQuantity: number; nearestExpiry: Date | null }>();
    for (const batch of batches) {
      const entry = byMedication.get(batch.medicationId) ?? { availableQuantity: 0, nearestExpiry: null };
      entry.availableQuantity += Number(batch.quantity);
      if (!entry.nearestExpiry || batch.expiryDate < entry.nearestExpiry) entry.nearestExpiry = batch.expiryDate;
      byMedication.set(batch.medicationId, entry);
    }
    const items = medications.map((medication) => {
      const stock = byMedication.get(medication.id) ?? { availableQuantity: 0, nearestExpiry: null };
      const reorderLevel = Number(medication.reorderLevel);
      return {
        ...medication,
        availableQuantity: stock.availableQuantity,
        isLowStock: stock.availableQuantity <= reorderLevel,
        nearestExpiry: stock.nearestExpiry,
        nearestExpiryState: stock.nearestExpiry ? expiryState(stock.nearestExpiry) : null,
      };
    });
    return query.lowStockOnly ? items.filter((item) => item.isLowStock) : items;
  }

  async createMedication(rc: WonFlowRequestContext, input: { code: string; genericName: string; brandName?: string; strength?: string; dosageForm?: string; unit: string; reorderLevel?: number }) {
    const c = requireTenantContext(rc);
    requirePermission(c, "pharmacy.catalogue.manage");
    if (!input.code?.trim() || !input.genericName?.trim() || !input.unit?.trim()) throw new WonFlowApiError(400, "medication-fields-required", "A code, generic name and unit are required.");
    const medication = await database.medication.create({ data: { tenantId: c.tenantId, code: input.code.trim(), genericName: input.genericName.trim(), brandName: input.brandName?.trim() || null, strength: input.strength?.trim() || null, dosageForm: input.dosageForm?.trim() || null, unit: input.unit.trim(), reorderLevel: input.reorderLevel ?? 0 } });
    await database.auditEvent.create({ data: { tenantId: c.tenantId, actorMembershipId: c.membershipId, sessionId: c.sessionId, requestId: c.requestId, action: "pharmacy.medication.created", entityType: "medication", entityId: medication.id, severity: "INFORMATION", sourceApplication: c.sourceApplication } });
    return medication;
  }

  async getInventoryItem(rc: WonFlowRequestContext, itemId: string) {
    const c = requireTenantContext(rc);
    requirePermission(c, "pharmacy.inventory.read");
    const branchId = requireBranchId(c);
    const medication = await database.medication.findFirst({ where: { id: itemId, tenantId: c.tenantId } });
    if (!medication) throw new WonFlowApiError(404, "medication-not-found", "The medication could not be found.");
    const batches = await database.inventoryBatch.findMany({ where: { tenantId: c.tenantId, branchId, medicationId: itemId }, orderBy: { expiryDate: "asc" } });
    const availableQuantity = batches.filter((batch) => batch.status === "AVAILABLE").reduce((sum, batch) => sum + Number(batch.quantity), 0);
    return { medication, batches: batches.map((batch) => ({ ...batch, expiryState: expiryState(batch.expiryDate) })), availableQuantity, isLowStock: availableQuantity <= Number(medication.reorderLevel) };
  }

  async updateInventoryItem(rc: WonFlowRequestContext, itemId: string, input: { reorderLevel?: number; isActive?: boolean; reason?: string }) {
    const c = requireTenantContext(rc);
    requirePermission(c, "pharmacy.inventory.manage");
    const branchId = requireBranchId(c);
    const medication = await database.medication.findFirst({ where: { id: itemId, tenantId: c.tenantId } });
    if (!medication) throw new WonFlowApiError(404, "medication-not-found", "The medication could not be found.");
    const data: Prisma.MedicationUpdateInput = {};
    if (input.reorderLevel !== undefined) {
      if (!Number.isFinite(input.reorderLevel) || input.reorderLevel < 0) throw new WonFlowApiError(400, "invalid-reorder-level", "The reorder level must be zero or a positive number.");
      data.reorderLevel = input.reorderLevel;
    }
    if (input.isActive !== undefined) data.isActive = input.isActive;
    const updated = await database.medication.update({ where: { id: itemId }, data });
    await database.auditEvent.create({ data: { tenantId: c.tenantId, branchId, actorMembershipId: c.membershipId, sessionId: c.sessionId, requestId: c.requestId, action: "pharmacy.medication.updated", entityType: "medication", entityId: itemId, severity: "INFORMATION", reason: input.reason?.trim() || null, sourceApplication: c.sourceApplication } });
    return updated;
  }

  // ---- Batches ---------------------------------------------------------------------

  async listBatches(rc: WonFlowRequestContext, query: { medicationId?: string; status?: string } = {}) {
    const c = requireTenantContext(rc);
    requirePermission(c, "pharmacy.inventory.read");
    const branchId = requireBranchId(c);
    return database.inventoryBatch.findMany({
      where: { tenantId: c.tenantId, branchId, ...(query.medicationId ? { medicationId: query.medicationId } : {}), ...(query.status ? { status: query.status as never } : {}) },
      include: { medication: true },
      orderBy: { expiryDate: "asc" },
    });
  }

  /** Receives a batch outside a purchase receipt (e.g. an opening-stock count). Matches the exact atomic increment + StockMovement pattern used everywhere stock changes, so it composes safely with concurrent dispensing on the same batch. */
  async createBatch(rc: WonFlowRequestContext, input: { medicationId: string; batchNumber: string; expiryDate: string; quantity: number; unitCostMinor?: number; reason?: string }) {
    const c = requireTenantContext(rc);
    requirePermission(c, "pharmacy.inventory.manage");
    const branchId = requireBranchId(c);
    if (!Number.isFinite(input.quantity) || input.quantity <= 0) throw new WonFlowApiError(400, "invalid-quantity", "The received quantity must be a positive number.");
    const expiryDate = new Date(input.expiryDate);
    if (Number.isNaN(expiryDate.getTime())) throw new WonFlowApiError(400, "invalid-expiry-date", "The expiry date is invalid.");
    if (expiryState(expiryDate) === "expired") throw new WonFlowApiError(400, "batch-already-expired", "A batch cannot be received already expired.");

    return database.$transaction(async (tx) => {
      if (!await tx.medication.findFirst({ where: { id: input.medicationId, tenantId: c.tenantId }, select: { id: true } })) throw new WonFlowApiError(404, "medication-not-found", "The medication could not be found.");
      const batch = await tx.inventoryBatch.upsert({
        where: { tenantId_branchId_medicationId_batchNumber: { tenantId: c.tenantId, branchId, medicationId: input.medicationId, batchNumber: input.batchNumber } },
        create: { tenantId: c.tenantId, branchId, medicationId: input.medicationId, batchNumber: input.batchNumber, expiryDate, quantity: input.quantity, status: "AVAILABLE" },
        update: { quantity: { increment: input.quantity }, expiryDate, status: "AVAILABLE", version: { increment: 1 } },
      });
      await tx.stockMovement.create({ data: { tenantId: c.tenantId, branchId, medicationId: input.medicationId, inventoryBatchId: batch.id, type: "RECEIPT", quantityDelta: input.quantity, unit: "unit", actorMembershipId: c.membershipId!, referenceType: "manual-batch", reason: input.reason?.trim() || null } });
      return batch;
    });
  }

  // ---- Stock movements (append-only ledger, read-only) ------------------------------

  async listMovements(rc: WonFlowRequestContext, query: { medicationId?: string; inventoryBatchId?: string; type?: string } = {}) {
    const c = requireTenantContext(rc);
    requirePermission(c, "pharmacy.inventory.read");
    const branchId = requireBranchId(c);
    return database.stockMovement.findMany({
      where: { tenantId: c.tenantId, branchId, ...(query.medicationId ? { medicationId: query.medicationId } : {}), ...(query.inventoryBatchId ? { inventoryBatchId: query.inventoryBatchId } : {}), ...(query.type ? { type: query.type as never } : {}) },
      include: { medication: { select: { genericName: true, brandName: true, code: true } } },
      orderBy: { occurredAt: "desc" },
      take: 200,
    });
  }

  // ---- Suppliers ---------------------------------------------------------------------

  async listSuppliers(rc: WonFlowRequestContext) {
    const c = requireTenantContext(rc);
    requirePermission(c, "pharmacy.suppliers.manage");
    return database.supplier.findMany({ where: { tenantId: c.tenantId }, orderBy: { name: "asc" } });
  }

  async createSupplier(rc: WonFlowRequestContext, input: { code: string; name: string; contactPerson?: string; phone?: string; email?: string; address?: string }) {
    const c = requireTenantContext(rc);
    requirePermission(c, "pharmacy.suppliers.manage");
    if (!input.code?.trim() || !input.name?.trim()) throw new WonFlowApiError(400, "supplier-fields-required", "A supplier code and name are required.");
    const supplier = await database.supplier.create({ data: { tenantId: c.tenantId, code: input.code.trim(), name: input.name.trim(), contactPerson: input.contactPerson?.trim() || null, phone: input.phone?.trim() || null, email: input.email?.trim() || null, address: input.address?.trim() || null } });
    await database.auditEvent.create({ data: { tenantId: c.tenantId, actorMembershipId: c.membershipId, sessionId: c.sessionId, requestId: c.requestId, action: "pharmacy.supplier.created", entityType: "supplier", entityId: supplier.id, severity: "INFORMATION", sourceApplication: c.sourceApplication } });
    return supplier;
  }

  // ---- Purchase receipts (receiving stock from a supplier) --------------------------

  async listPurchaseReceipts(rc: WonFlowRequestContext, query: { status?: string } = {}) {
    const c = requireTenantContext(rc);
    requirePermission(c, "pharmacy.purchase-receipts.manage");
    const branchId = requireBranchId(c);
    return database.purchaseReceipt.findMany({ where: { tenantId: c.tenantId, branchId, ...(query.status ? { status: query.status as never } : {}) }, include: { supplier: true, lines: true }, orderBy: { createdAt: "desc" }, take: 200 });
  }

  /** Receiving is a single atomic step: the receipt is created and immediately posts stock — there is no separate draft/post endpoint, so nothing here can leave a receipt recorded without the stock actually landing (or vice versa). */
  async createPurchaseReceipt(rc: WonFlowRequestContext, input: { supplierId: string; supplierInvoiceNumber: string; lines: { medicationId: string; batchNumber: string; expiryDate: string; quantity: number; unitCostMinor: number }[] }) {
    const c = requireTenantContext(rc);
    requirePermission(c, "pharmacy.purchase-receipts.manage");
    const branchId = requireBranchId(c);
    if (!input.lines.length) throw new WonFlowApiError(400, "purchase-receipt-lines-required", "Add at least one line item.");
    if (!input.supplierInvoiceNumber?.trim()) throw new WonFlowApiError(400, "supplier-invoice-number-required", "The supplier's invoice number is required.");

    for (const line of input.lines) {
      if (!Number.isFinite(line.quantity) || line.quantity <= 0) throw new WonFlowApiError(400, "invalid-quantity", "Every line's received quantity must be a positive number.");
      if (!Number.isInteger(line.unitCostMinor) || line.unitCostMinor < 0) throw new WonFlowApiError(400, "invalid-unit-cost", "Every line's unit cost must be a non-negative whole number of minor units.");
      const expiryDate = new Date(line.expiryDate);
      if (Number.isNaN(expiryDate.getTime()) || expiryState(expiryDate) === "expired") throw new WonFlowApiError(400, "batch-already-expired", "A batch cannot be received already expired.");
    }

    return database.$transaction(async (tx) => {
      const supplier = await tx.supplier.findFirst({ where: { id: input.supplierId, tenantId: c.tenantId, status: "ACTIVE" } });
      if (!supplier) throw new WonFlowApiError(404, "supplier-not-found", "The supplier could not be found or is inactive.");
      const medicationIds = [...new Set(input.lines.map((line) => line.medicationId))];
      const medications = await tx.medication.findMany({ where: { tenantId: c.tenantId, id: { in: medicationIds } } });
      if (medications.length !== medicationIds.length) throw new WonFlowApiError(400, "invalid-medication", "A line references a medication that could not be found.");

      const receipt = await tx.purchaseReceipt.create({ data: { tenantId: c.tenantId, branchId, supplierId: supplier.id, supplierInvoiceNumber: input.supplierInvoiceNumber.trim(), status: "POSTED", receivedByMembershipId: c.membershipId!, postedAt: new Date(), lines: { create: input.lines.map((line) => ({ medicationId: line.medicationId, batchNumber: line.batchNumber.trim(), expiryDate: new Date(line.expiryDate), quantity: line.quantity, unitCostMinor: line.unitCostMinor })) } }, include: { lines: true, supplier: true } });

      for (const line of input.lines) {
        const batch = await tx.inventoryBatch.upsert({
          where: { tenantId_branchId_medicationId_batchNumber: { tenantId: c.tenantId, branchId, medicationId: line.medicationId, batchNumber: line.batchNumber.trim() } },
          create: { tenantId: c.tenantId, branchId, medicationId: line.medicationId, batchNumber: line.batchNumber.trim(), expiryDate: new Date(line.expiryDate), quantity: line.quantity, status: "AVAILABLE" },
          update: { quantity: { increment: line.quantity }, expiryDate: new Date(line.expiryDate), status: "AVAILABLE", version: { increment: 1 } },
        });
        await tx.stockMovement.create({ data: { tenantId: c.tenantId, branchId, medicationId: line.medicationId, inventoryBatchId: batch.id, type: "RECEIPT", quantityDelta: line.quantity, unit: "unit", actorMembershipId: c.membershipId!, referenceType: "purchase-receipt", referenceId: receipt.id } });
      }

      await tx.auditEvent.create({ data: { tenantId: c.tenantId, branchId, actorMembershipId: c.membershipId, sessionId: c.sessionId, requestId: c.requestId, action: "pharmacy.purchase-receipt.posted", entityType: "purchase-receipt", entityId: receipt.id, severity: "INFORMATION", sourceApplication: c.sourceApplication } });
      return receipt;
    });
  }

  /** Completed dispenses eligible for a return — nothing lists these anywhere else, so the return worklist has a way to find a dispenseId/dispenseItemId to return against. */
  async listDispenses(rc: WonFlowRequestContext, query: { patientId?: string } = {}) {
    const c = requireTenantContext(rc);
    requirePermission(c, "pharmacy.dispensing.manage");
    const branchId = requireBranchId(c);
    return database.dispense.findMany({
      where: { tenantId: c.tenantId, branchId, status: { in: ["COMPLETED", "PARTIALLY_COMPLETED"] }, ...(query.patientId ? { patientId: query.patientId } : {}) },
      include: { patient: { select: { id: true, givenName: true, familyName: true, patientNumber: true } }, items: { include: { medication: { select: { genericName: true, brandName: true } } } } },
      orderBy: { completedAt: "desc" },
      take: 100,
    });
  }

  // ---- Returns -------------------------------------------------------------------------

  async listReturns(rc: WonFlowRequestContext, query: { status?: string; dispenseId?: string } = {}) {
    const c = requireTenantContext(rc);
    requirePermission(c, "pharmacy.returns.manage");
    const branchId = requireBranchId(c);
    return database.pharmacyReturn.findMany({ where: { tenantId: c.tenantId, branchId, ...(query.status ? { status: query.status as never } : {}), ...(query.dispenseId ? { dispenseId: query.dispenseId } : {}) }, include: { lines: true }, orderBy: { requestedAt: "desc" }, take: 200 });
  }

  async createReturn(rc: WonFlowRequestContext, input: { dispenseId: string; reason: string; lines: { dispenseItemId: string; quantity: number; disposition: "RESTOCK" | "QUARANTINE" | "DESTROY"; packageCondition: "SEALED" | "OPENED" | "DAMAGED" | "EXPIRED" }[] }) {
    const c = requireTenantContext(rc);
    requirePermission(c, "pharmacy.returns.manage");
    const branchId = requireBranchId(c);
    if (!input.reason?.trim()) throw new WonFlowApiError(400, "reason-required", "A reason is required to request a return.");
    if (!input.lines.length) throw new WonFlowApiError(400, "return-lines-required", "Add at least one line to return.");

    return database.$transaction(async (tx) => {
      const dispense = await tx.dispense.findFirst({ where: { id: input.dispenseId, tenantId: c.tenantId, branchId, status: { in: ["COMPLETED", "PARTIALLY_COMPLETED"] } }, include: { items: true } });
      if (!dispense) throw new WonFlowApiError(404, "dispense-not-found", "The dispense could not be found or is not eligible for a return.");

      for (const line of input.lines) {
        if (!Number.isFinite(line.quantity) || line.quantity <= 0) throw new WonFlowApiError(400, "invalid-quantity", "Every return line's quantity must be a positive number.");
        const dispenseItem = dispense.items.find((item) => item.id === line.dispenseItemId);
        if (!dispenseItem) throw new WonFlowApiError(400, "invalid-dispense-item", "A return line references an item that was not dispensed in this transaction.");
        if (line.disposition === "RESTOCK" && line.packageCondition !== "SEALED") throw new WonFlowApiError(400, "restock-requires-sealed-package", "Only a sealed, unopened package can be restocked.");

        const alreadyReturned = await tx.pharmacyReturnLine.aggregate({ where: { dispenseItemId: line.dispenseItemId, return: { status: { in: ["REQUESTED", "APPROVED", "COMPLETED"] } } }, _sum: { quantity: true } });
        const returnable = Number(dispenseItem.quantity) - Number(alreadyReturned._sum.quantity ?? 0);
        if (line.quantity > returnable) throw new WonFlowApiError(409, "return-exceeds-dispensed-quantity", `This return of ${line.quantity} exceeds the returnable quantity of ${returnable} for this item.`);
      }

      const created = await tx.pharmacyReturn.create({
        data: { tenantId: c.tenantId, branchId, patientId: dispense.patientId, dispenseId: dispense.id, reason: input.reason.trim(), requestedByMembershipId: c.membershipId!, lines: { create: input.lines.map((line) => ({ dispenseItemId: line.dispenseItemId, medicationId: dispense.items.find((item) => item.id === line.dispenseItemId)!.medicationId, quantity: line.quantity, disposition: line.disposition, packageCondition: line.packageCondition })) } },
        include: { lines: true },
      });
      await tx.auditEvent.create({ data: { tenantId: c.tenantId, branchId, actorMembershipId: c.membershipId, sessionId: c.sessionId, requestId: c.requestId, action: "pharmacy.return.requested", entityType: "pharmacy-return", entityId: created.id, severity: "INFORMATION", reason: input.reason.trim(), sourceApplication: c.sourceApplication } });
      return created;
    });
  }

  /** approve/reject/complete — the only actions a return can take. Restocking on completion reuses the exact atomic-increment + StockMovement idiom dispensing already established, so it is safe alongside concurrent dispenses against the same batch. */
  async updateReturn(rc: WonFlowRequestContext, returnId: string, input: { action: "approve" | "reject" | "complete"; reason?: string }) {
    const c = requireTenantContext(rc);
    requirePermission(c, "pharmacy.returns.manage");
    const branchId = requireBranchId(c);
    if (!input.reason?.trim()) throw new WonFlowApiError(400, "reason-required", `A reason is required to ${input.action} a return.`);

    return database.$transaction(async (tx) => {
      const pharmacyReturn = await tx.pharmacyReturn.findFirst({ where: { id: returnId, tenantId: c.tenantId, branchId }, include: { lines: true } });
      if (!pharmacyReturn) throw new WonFlowApiError(404, "return-not-found", "The return request could not be found.");

      if (input.action === "approve") {
        if (pharmacyReturn.status !== "REQUESTED") throw new WonFlowApiError(409, "return-not-approvable", "Only a requested return can be approved.");
        const updated = await tx.pharmacyReturn.update({ where: { id: pharmacyReturn.id }, data: { status: "APPROVED", approvedByMembershipId: c.membershipId!, approvedAt: new Date() } });
        await tx.auditEvent.create({ data: { tenantId: c.tenantId, branchId, actorMembershipId: c.membershipId, sessionId: c.sessionId, requestId: c.requestId, action: "pharmacy.return.approved", entityType: "pharmacy-return", entityId: pharmacyReturn.id, severity: "INFORMATION", reason: input.reason!.trim(), sourceApplication: c.sourceApplication } });
        return updated;
      }

      if (input.action === "reject") {
        if (pharmacyReturn.status !== "REQUESTED") throw new WonFlowApiError(409, "return-not-rejectable", "Only a requested return can be rejected.");
        const updated = await tx.pharmacyReturn.update({ where: { id: pharmacyReturn.id }, data: { status: "REJECTED", rejectedAt: new Date(), rejectionReason: input.reason!.trim() } });
        await tx.auditEvent.create({ data: { tenantId: c.tenantId, branchId, actorMembershipId: c.membershipId, sessionId: c.sessionId, requestId: c.requestId, action: "pharmacy.return.rejected", entityType: "pharmacy-return", entityId: pharmacyReturn.id, severity: "INFORMATION", reason: input.reason!.trim(), sourceApplication: c.sourceApplication } });
        return updated;
      }

      // complete
      if (pharmacyReturn.status !== "APPROVED") throw new WonFlowApiError(409, "return-not-completable", "Only an approved return can be completed.");
      for (const line of pharmacyReturn.lines) {
        if (line.disposition !== "RESTOCK") continue;
        const dispenseItem = await tx.dispenseItem.findUnique({ where: { id: line.dispenseItemId } });
        if (!dispenseItem) throw new WonFlowApiError(409, "dispense-item-missing", "The original dispensed item could not be found.");
        const batch = await tx.inventoryBatch.findUnique({ where: { id: dispenseItem.inventoryBatchId } });
        if (!batch) throw new WonFlowApiError(409, "batch-missing", "The original stock batch could not be found.");
        if (line.packageCondition !== "SEALED" || expiryState(batch.expiryDate) === "expired") throw new WonFlowApiError(409, "restock-not-eligible", "This line is no longer eligible for restocking.");
        const restocked = await tx.inventoryBatch.update({ where: { id: batch.id }, data: { quantity: { increment: Number(line.quantity) }, status: "AVAILABLE", version: { increment: 1 } } });
        await tx.stockMovement.create({ data: { tenantId: c.tenantId, branchId, medicationId: line.medicationId, inventoryBatchId: restocked.id, type: "RETURN", quantityDelta: Number(line.quantity), unit: "unit", actorMembershipId: c.membershipId!, referenceType: "pharmacy-return", referenceId: pharmacyReturn.id } });
      }
      const updated = await tx.pharmacyReturn.update({ where: { id: pharmacyReturn.id }, data: { status: "COMPLETED", completedAt: new Date() } });
      await tx.auditEvent.create({ data: { tenantId: c.tenantId, branchId, actorMembershipId: c.membershipId, sessionId: c.sessionId, requestId: c.requestId, action: "pharmacy.return.completed", entityType: "pharmacy-return", entityId: pharmacyReturn.id, severity: "INFORMATION", reason: input.reason!.trim(), sourceApplication: c.sourceApplication } });
      return updated;
    });
  }

  // ---- Stock alerts ----------------------------------------------------------------------

  async getStockAlerts(rc: WonFlowRequestContext) {
    const c = requireTenantContext(rc);
    requirePermission(c, "pharmacy.inventory.read");
    const branchId = requireBranchId(c);
    const [medications, batches] = await Promise.all([
      database.medication.findMany({ where: { tenantId: c.tenantId, isActive: true } }),
      database.inventoryBatch.findMany({ where: { tenantId: c.tenantId, branchId, status: "AVAILABLE" }, include: { medication: { select: { genericName: true, brandName: true, code: true } } } }),
    ]);
    const byMedication = new Map<string, number>();
    for (const batch of batches) byMedication.set(batch.medicationId, (byMedication.get(batch.medicationId) ?? 0) + Number(batch.quantity));

    const lowStock = medications
      .filter((medication) => (byMedication.get(medication.id) ?? 0) <= Number(medication.reorderLevel))
      .map((medication) => ({ medication, availableQuantity: byMedication.get(medication.id) ?? 0, reorderLevel: Number(medication.reorderLevel) }));

    const expiring = batches
      .map((batch) => ({ batch, state: expiryState(batch.expiryDate) }))
      .filter((entry) => entry.state === "expired" || entry.state === "critical" || entry.state === "expiring");

    return { lowStock, expiring };
  }
}

export const pharmacyService = new PharmacyService();
