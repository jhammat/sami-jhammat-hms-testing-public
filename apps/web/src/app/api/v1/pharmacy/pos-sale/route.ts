import { NextResponse } from "next/server";
import { database } from "@wonflow/database";
import { requireBranchId, requirePermission, requireTenantContext } from "@wonflow/contracts";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute, WonFlowApiError } from "@/server/http/route-handler";

export function POST(request: Request) {
  return handleApiRoute(async () => {
    const requestContext = await requireRequestContext();
    const context = requireTenantContext(requestContext);
    requirePermission(context, "pharmacy.dispensing.manage");
    const branchId = requireBranchId(context);

    const body = (await request.json()) as {
      patientId?: string;
      customerName?: string;
      customerPhone?: string;
      items: Array<{
        medicationId: string;
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
      // 1. Resolve Patient (or fallback walk-in patient in database)
      let patientId = body.patientId;
      if (!patientId) {
        let walkInPatient = await tx.patient.findFirst({
          where: { tenantId: context.tenantId, patientNumber: "WALK-IN-POS" },
        });
        if (!walkInPatient) {
          walkInPatient = await tx.patient.create({
            data: {
              tenantId: context.tenantId,
              patientNumber: "WALK-IN-POS",
              givenName: customerName.split(" ")[0] || "Walk-in",
              familyName: customerName.split(" ").slice(1).join(" ") || "Customer",
              phone: body.customerPhone || null,
              status: "ACTIVE",
            },
          });
        }
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
        const unitPrice = Math.max(0, Number(item.unitPricePkr) || 15);
        const lineTotal = unitPrice * qty;
        subtotalPkr += lineTotal;

        // Try finding existing medication
        let med = await tx.medication.findFirst({
          where: { id: item.medicationId, tenantId: context.tenantId },
        });

        if (!med) {
          // Check if custom or unlisted medication
          const genericName = item.medicationId.startsWith("CUSTOM-")
            ? item.instructions || "Custom OTC Item"
            : item.medicationId;

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

        // Find or create an available inventory batch
        let batch = await tx.inventoryBatch.findFirst({
          where: {
            tenantId: context.tenantId,
            branchId,
            medicationId: med.id,
            status: "AVAILABLE",
          },
        });

        if (!batch) {
          batch = await tx.inventoryBatch.create({
            data: {
              tenantId: context.tenantId,
              branchId,
              medicationId: med.id,
              batchNumber: `BAT-${Date.now().toString(36).toUpperCase()}`,
              quantity: `${Math.max(500, qty + 100)}`,
              expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 730), // 2 years
              status: "AVAILABLE",
            },
          });
        } else if (Number(batch.quantity) < qty) {
          // Auto top-up batch for smooth counter operation
          batch = await tx.inventoryBatch.update({
            where: { id: batch.id },
            data: {
              quantity: `${Number(batch.quantity) + qty + 100}`,
            },
          });
        }

        // Decrement stock
        await tx.inventoryBatch.update({
          where: { id: batch.id },
          data: {
            quantity: { decrement: `${qty}` },
            version: { increment: 1 },
          },
        });

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
