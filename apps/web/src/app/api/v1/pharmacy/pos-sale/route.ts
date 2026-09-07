import { NextResponse } from "next/server";
import { database } from "@wonflow/database";
import { requireBranchId, requirePermission, requireTenantContext } from "@wonflow/contracts";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute, WonFlowApiError } from "@/server/http/route-handler";

/**
 * The counter's sales ledger for this branch.
 *
 * Every POS sale already writes an Invoice, its lines, a Payment and stock
 * movements, so the ledger is read back from those rather than from a copy the
 * browser kept. A till that only remembered its own sales could not be
 * reconciled, disagreed between workstations, and lost the day on a cache
 * clear.
 */
export function GET(request: Request) {
  return handleApiRoute(async () => {
    const requestContext = await requireRequestContext();
    const context = requireTenantContext(requestContext);
    requirePermission(context, "pharmacy.dispensing.manage");
    const branchId = requireBranchId(context);

    const limitParam = Number(new URL(request.url).searchParams.get("limit"));
    const take = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(Math.trunc(limitParam), 200) : 50;

    const invoices = await database.invoice.findMany({
      where: { tenantId: context.tenantId, branchId, invoiceNumber: { startsWith: "POS-RX-" } },
      include: { lines: true, payments: { orderBy: { createdAt: "desc" }, take: 1 }, patient: true },
      orderBy: { issuedAt: "desc" },
      take,
    });

    const minorToPkr = (value: number) => value / 100;
    const receipts = invoices.map((invoice) => {
      const subtotalPkr = minorToPkr(invoice.subtotalMinor);
      const discountPkr = minorToPkr(invoice.discountMinor);
      const netTotalPkr = minorToPkr(invoice.totalMinor);
      const afterDiscountPkr = Math.max(0, subtotalPkr - discountPkr);
      const taxPkr = Math.max(0, netTotalPkr - afterDiscountPkr);
      const patientName = [invoice.patient?.givenName, invoice.patient?.familyName].filter(Boolean).join(" ").trim();
      return {
        dispenseId: `POS-DISP-${invoice.id.slice(0, 8)}`,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: patientName || "Walk-in Customer",
        customerPhone: invoice.patient?.phone ?? null,
        patientId: invoice.patientId,
        dispensedAt: (invoice.issuedAt ?? invoice.createdAt).toISOString(),
        paymentMethod: invoice.payments[0]?.method ?? (invoice.status === "PAID" ? "CASH" : "UNPAID"),
        isPaid: invoice.status === "PAID",
        subtotalPkr,
        discountPercent: subtotalPkr > 0 ? Math.round((discountPkr / subtotalPkr) * 100) : 0,
        discountPkr,
        taxPercent: afterDiscountPkr > 0 ? Math.round((taxPkr / afterDiscountPkr) * 100) : 0,
        taxPkr,
        netTotalPkr,
        items: invoice.lines.map((line) => ({
          medicationId: "",
          inventoryBatchId: "",
          batchNumber: "",
          medicationName: line.description,
          strength: null,
          unit: "unit",
          quantity: Number(line.quantity),
          unitPricePkr: minorToPkr(line.unitPriceMinor),
          lineTotalPkr: minorToPkr(line.totalMinor),
          instructions: null,
        })),
        notes: null,
      };
    });

    return NextResponse.json({ receipts });
  });
}

export function POST(request: Request) {
  return handleApiRoute(async () => {
    const requestContext = await requireRequestContext();
    const context = requireTenantContext(requestContext);
    requirePermission(context, "pharmacy.dispensing.manage");
    const branchId = requireBranchId(context);

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const body = (await request.json()) as {
      patientId?: string;
      customerName?: string;
      customerPhone?: string;
      items: Array<{
        medicationId?: string;
        medicationName?: string;
        inventoryBatchId?: string;
        quantity: number;
        unitPricePkr: number;
        instructions?: string;
      }>;
      paymentMethod?: "CASH" | "CARD" | "ONLINE" | "UNPAID";
      discountPercent?: number;
      taxPercent?: number;
      notes?: string;
    };

    if (!body.items || body.items.length === 0) {
      throw new WonFlowApiError(400, "items-required", "Please add at least one medication item to dispense.");
    }

    const customerName = body.customerName?.trim() || "Walk-in Customer";
    const paymentMethod = body.paymentMethod || "CASH";
    const discountPercent = Math.max(0, Math.min(100, Number(body.discountPercent) || 0));
    const taxPercent = Math.max(0, Math.min(100, Number(body.taxPercent) || 0));

    const receipt = await database.$transaction(async (tx) => {
      // 1. Resolve Patient (or create walk-in patient record with customer's actual details)
      let patientId = body.patientId;
      if (!patientId) {
        const uniqueSuffix = `${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
        const walkInPatient = await tx.patient.create({
          data: {
            tenantId: context.tenantId,
            patientNumber: `POS-${uniqueSuffix}`,
            givenName: customerName.split(" ")[0] || "Walk-in",
            familyName: customerName.split(" ").slice(1).join(" ") || "Customer",
            phone: body.customerPhone || null,
            status: "ACTIVE",
          },
        });
        patientId = walkInPatient.id;
      }

      // 2. Validate, auto-provision if custom, and decrement each batch stock
      let subtotalPkr = 0;
      const verifiedItems: Array<{
        medicationId: string;
        inventoryBatchId: string;
        batchNumber: string;
        medicationName: string;
        strength: string | null;
        unit: string;
        quantity: number;
        unitPricePkr: number;
        lineTotalPkr: number;
        instructions: string | null;
      }> = [];

      for (const item of body.items) {
        const qty = Math.max(1, Number(item.quantity) || 1);
        if (
          item.unitPricePkr === undefined ||
          item.unitPricePkr === null ||
          Number.isNaN(Number(item.unitPricePkr)) ||
          Number(item.unitPricePkr) <= 0
        ) {
          throw new WonFlowApiError(400, "invalid-unit-price", "Each item requires a valid positive unit price in PKR.");
        }
        const unitPrice = Number(item.unitPricePkr);
        const lineTotal = unitPrice * qty;
        subtotalPkr += lineTotal;

        // Try finding existing medication
        let med = null;
        if (item.medicationId && UUID_REGEX.test(item.medicationId)) {
          med = await tx.medication.findFirst({
            where: { id: item.medicationId, tenantId: context.tenantId },
          });
        }
        if (!med && item.medicationId) {
          med = await tx.medication.findFirst({
            where: {
              tenantId: context.tenantId,
              OR: [
                { code: item.medicationId },
                { genericName: { equals: item.medicationId, mode: "insensitive" } },
                { brandName: { equals: item.medicationId, mode: "insensitive" } },
              ],
            },
          });
        }
        if (!med && (item.medicationName || item.medicationId)) {
          const searchKey = (item.medicationName || item.medicationId || "").trim();
          const namePart = searchKey.split(/[\s-]+/)[0] || searchKey;

          // First try to find a medication that actually has available stock at this branch
          med = await tx.medication.findFirst({
            where: {
              tenantId: context.tenantId,
              OR: [
                { genericName: { contains: namePart, mode: "insensitive" } },
                { brandName: { contains: namePart, mode: "insensitive" } },
              ],
              inventoryBatches: {
                some: {
                  branchId,
                  status: "AVAILABLE",
                  quantity: { gt: 0 },
                  expiryDate: { gt: new Date() },
                },
              },
            },
          });

          // Fallback to general match if no stock at branch
          if (!med) {
            med = await tx.medication.findFirst({
              where: {
                tenantId: context.tenantId,
                OR: [
                  { genericName: { equals: searchKey, mode: "insensitive" } },
                  { brandName: { equals: searchKey, mode: "insensitive" } },
                  { genericName: { contains: namePart, mode: "insensitive" } },
                  { brandName: { contains: namePart, mode: "insensitive" } },
                ],
              },
            });
          }
        }

        if (!med) {
          // Check if custom or unlisted medication
          const genericName = (item.medicationName || item.instructions || item.medicationId || "Custom OTC Item").trim();
          med = await tx.medication.create({
            data: {
              tenantId: context.tenantId,
              code: `MED-${Date.now().toString(36).toUpperCase()}`,
              genericName,
              dosageForm: "Tablet",
              unit: "unit",
              isActive: true,
            },
          });
        }

        // Find available inventory batch following FEFO (First-Expired, First-Out)
        const now = new Date();
        let batch = null;
        if (item.inventoryBatchId && UUID_REGEX.test(item.inventoryBatchId)) {
          batch = await tx.inventoryBatch.findFirst({
            where: {
              id: item.inventoryBatchId,
              tenantId: context.tenantId,
              branchId,
              medicationId: med.id,
              status: "AVAILABLE",
              expiryDate: { gt: now },
            },
          });
        }

        if (!batch) {
          batch = await tx.inventoryBatch.findFirst({
            where: {
              tenantId: context.tenantId,
              branchId,
              medicationId: med.id,
              status: "AVAILABLE",
              expiryDate: { gt: now },
            },
            orderBy: { expiryDate: "asc" },
          });
        }

        if (!batch) {
          throw new WonFlowApiError(
            409,
            "insufficient-stock",
            `No available, unexpired stock found for ${med.genericName}${med.brandName ? ` (${med.brandName})` : ""}.`
          );
        }

        const currentQty = Number(batch.quantity);
        if (currentQty < qty) {
          throw new WonFlowApiError(
            409,
            "insufficient-stock",
            `Insufficient stock for ${med.genericName} (Batch ${batch.batchNumber}). Requested: ${qty}, available: ${currentQty}.`
          );
        }

        // Concurrency-safe stock deduction
        const decrementResult = await tx.inventoryBatch.updateMany({
          where: {
            id: batch.id,
            quantity: { gte: `${qty}` },
          },
          data: {
            quantity: { decrement: `${qty}` },
            version: { increment: 1 },
          },
        });

        if (decrementResult.count === 0) {
          throw new WonFlowApiError(
            409,
            "insufficient-stock",
            `Stock for ${med.genericName} changed before sale completion. Please re-check stock.`
          );
        }

        if (currentQty - qty <= 0) {
          await tx.inventoryBatch.update({
            where: { id: batch.id },
            data: { status: "DEPLETED" },
          });
        }

        const medName = med.brandName ? `${med.genericName} (${med.brandName})` : med.genericName;
        verifiedItems.push({
          medicationId: med.id,
          inventoryBatchId: batch.id,
          batchNumber: batch.batchNumber,
          medicationName: medName,
          strength: med.strength,
          unit: med.unit,
          quantity: qty,
          unitPricePkr: unitPrice,
          lineTotalPkr: lineTotal,
          instructions: item.instructions?.trim() || null,
        });
      }

      // Calculate totals
      const discountPkr = Math.round((subtotalPkr * discountPercent) / 100);
      const afterDiscountPkr = Math.max(0, subtotalPkr - discountPkr);
      const taxPkr = Math.round((afterDiscountPkr * taxPercent) / 100);
      const netTotalPkr = afterDiscountPkr + taxPkr;

      const subtotalMinor = subtotalPkr * 100;
      const discountMinor = discountPkr * 100;
      const totalMinor = netTotalPkr * 100;

      // 3. Create Official Invoice
      const invoiceNumber = `POS-RX-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
      const isPaid = paymentMethod !== "UNPAID";

      const invoice = await tx.invoice.create({
        data: {
          tenantId: context.tenantId,
          patientId,
          branchId,
          invoiceNumber,
          status: isPaid ? "PAID" : "ISSUED",
          currencyCode: "PKR",
          subtotalMinor,
          discountMinor,
          totalMinor,
          paidMinor: isPaid ? totalMinor : 0,
          issuedAt: new Date(),
          lines: {
            create: verifiedItems.map((v) => ({
              description: `${v.medicationName} ${v.strength ? `(${v.strength})` : ""} - Qty: ${v.quantity} (Batch ${v.batchNumber})`,
              quantity: v.quantity,
              unitPriceMinor: v.unitPricePkr * 100,
              totalMinor: v.lineTotalPkr * 100,
            })),
          },
        },
      });

      // 4. Create Payment if paid
      if (isPaid) {
        await tx.payment.create({
          data: {
            tenantId: context.tenantId,
            invoiceId: invoice.id,
            receivedByMembershipId: context.membershipId!,
            status: "COMPLETED",
            method: paymentMethod,
            amountMinor: totalMinor,
            currencyCode: "PKR",
            reference: `POS-SALE-${paymentMethod}`,
            completedAt: new Date(),
          },
        });
      }

      const dispenseId = `POS-DISP-${invoice.id.slice(0, 8)}`;

      // 5. Record Stock Movements
      for (const v of verifiedItems) {
        await tx.stockMovement.create({
          data: {
            tenantId: context.tenantId,
            branchId,
            medicationId: v.medicationId,
            inventoryBatchId: v.inventoryBatchId,
            type: "DISPENSE",
            quantityDelta: `-${v.quantity}`,
            unit: v.unit,
            actorMembershipId: context.membershipId!,
            referenceType: "pos-dispense",
            referenceId: invoice.id,
            reason: `POS Counter Dispensation to ${customerName}`,
          },
        });
      }

      // 6. Audit log
      await tx.auditEvent.create({
        data: {
          tenantId: context.tenantId,
          branchId,
          actorMembershipId: context.membershipId,
          sessionId: context.sessionId,
          requestId: context.requestId,
          action: "pharmacy.pos.dispensed",
          entityType: "invoice",
          entityId: invoice.id,
          severity: "INFORMATION",
          sourceApplication: context.sourceApplication,
        },
      });

      return {
        dispenseId,
        invoiceId: invoice.id,
        invoiceNumber,
        customerName,
        customerPhone: body.customerPhone || null,
        patientId,
        dispensedAt: new Date().toISOString(),
        paymentMethod,
        isPaid,
        subtotalPkr,
        discountPercent,
        discountPkr,
        taxPercent,
        taxPkr,
        netTotalPkr,
        items: verifiedItems,
        notes: body.notes || null,
      };
    });

    return NextResponse.json({ receipt }, { status: 201 });
  });
}
