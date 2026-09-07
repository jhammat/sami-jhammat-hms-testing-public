import { NextResponse } from "next/server";
import { database } from "@wonflow/database";
import { requirePermission, requireTenantContext } from "@wonflow/contracts";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute } from "@/server/http/route-handler";

const DEFAULT_FORMULARY = [
  // Analgesics & NSAIDs
  { code: "MED-PAN-500", genericName: "Paracetamol", brandName: "Panadol", strength: "500mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-PAN-EXT", genericName: "Paracetamol / Caffeine", brandName: "Panadol Extra", strength: "500mg / 65mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-PAN-CF", genericName: "Paracetamol / Pseudoephedrine", brandName: "Panadol CF", strength: "500mg / 30mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-CAL-SYR", genericName: "Paracetamol Suspension", brandName: "Calpol", strength: "120mg/5mL", dosageForm: "Syrup", unit: "bottle" },
  { code: "MED-BRU-400", genericName: "Ibuprofen", brandName: "Brufen", strength: "400mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-BRU-600", genericName: "Ibuprofen", brandName: "Brufen", strength: "600mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-BRU-SYR", genericName: "Ibuprofen Suspension", brandName: "Brufen DS", strength: "200mg/5mL", dosageForm: "Syrup", unit: "bottle" },
  { code: "MED-DSP-300", genericName: "Aspirin (Soluble)", brandName: "Disprin", strength: "300mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-PON-500", genericName: "Mefenamic Acid", brandName: "Ponstan Forte", strength: "500mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-CAF-50", genericName: "Diclofenac Potassium", brandName: "Caflam", strength: "50mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-VOL-50", genericName: "Diclofenac Sodium", brandName: "Voltral", strength: "50mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-VOL-INJ", genericName: "Diclofenac Sodium Injection", brandName: "Voltral", strength: "75mg/3mL", dosageForm: "Injection", unit: "ampoule" },
  { code: "MED-TOR-INJ", genericName: "Ketorolac Tromethamine", brandName: "Toradol", strength: "30mg/mL", dosageForm: "Injection", unit: "ampoule" },

  // Antibiotics & Antimicrobials
  { code: "MED-AUG-625", genericName: "Amoxicillin / Clavulanic Acid", brandName: "Augmentin", strength: "625mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-AUG-1G", genericName: "Amoxicillin / Clavulanic Acid", brandName: "Augmentin", strength: "1g", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-AUG-SYR", genericName: "Amoxicillin / Clavulanate", brandName: "Augmentin DS", strength: "312.5mg/5mL", dosageForm: "Syrup", unit: "bottle" },
  { code: "MED-AMX-500", genericName: "Amoxicillin", brandName: "Amoxil", strength: "500mg", dosageForm: "Capsule", unit: "capsule" },
  { code: "MED-NOV-500", genericName: "Ciprofloxacin HCl", brandName: "Novidat", strength: "500mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-LEF-500", genericName: "Levofloxacin", brandName: "Leflox", strength: "500mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-KLA-500", genericName: "Clarithromycin", brandName: "Klaricid", strength: "500mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-AZI-500", genericName: "Azithromycin", brandName: "Azomax", strength: "500mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-FLG-400", genericName: "Metronidazole", brandName: "Flagyl", strength: "400mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-FLG-SYR", genericName: "Metronidazole Suspension", brandName: "Flagyl", strength: "200mg/5mL", dosageForm: "Syrup", unit: "bottle" },
  { code: "MED-ROC-1G", genericName: "Ceftriaxone Sodium", brandName: "Rocephin", strength: "1g", dosageForm: "Injection", unit: "vial" },

  // Gastrointestinal & Antacids
  { code: "MED-RSK-20", genericName: "Omeprazole", brandName: "Risek", strength: "20mg", dosageForm: "Capsule", unit: "capsule" },
  { code: "MED-RSK-40", genericName: "Omeprazole", brandName: "Risek", strength: "40mg", dosageForm: "Capsule", unit: "capsule" },
  { code: "MED-RSK-IV", genericName: "Omeprazole IV", brandName: "Risek Insta", strength: "40mg", dosageForm: "Injection", unit: "vial" },
  { code: "MED-NEX-40", genericName: "Esomeprazole", brandName: "Nexum", strength: "40mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-GAV-LIQ", genericName: "Sodium Alginate / Antacid", brandName: "Gaviscon Liquid", strength: "Double Action", dosageForm: "Syrup", unit: "bottle" },
  { code: "MED-GRV-50", genericName: "Dimenhydrinate", brandName: "Gravinate", strength: "50mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-GRV-SYR", genericName: "Dimenhydrinate Syrup", brandName: "Gravinate", strength: "15mg/5mL", dosageForm: "Syrup", unit: "bottle" },
  { code: "MED-MOT-10", genericName: "Domperidone", brandName: "Motilium", strength: "10mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-ETX-P", genericName: "Diiodohydroxyquinoline / Phthalylsulfathiazole", brandName: "Entox-P", strength: "200mg", dosageForm: "Tablet", unit: "tablet" },

  // Respiratory, Cold & Allergy
  { code: "MED-ARN-FRT", genericName: "Ibuprofen / Pseudoephedrine", brandName: "Arinac Forte", strength: "400mg / 60mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-ZYR-10", genericName: "Cetirizine HCl", brandName: "Zyrtec", strength: "10mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-SOF-10", genericName: "Loratadine", brandName: "Softin", strength: "10mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-RIG-10", genericName: "Levocetirizine", brandName: "Rigix", strength: "5mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-HYD-SYR", genericName: "Aminophylline / Diphenhydramine", brandName: "Hydryllin", strength: "Expectorant", dosageForm: "Syrup", unit: "bottle" },
  { code: "MED-PUL-SYR", genericName: "Ammonium Chloride / Menthol", brandName: "Pulmonol", strength: "Expectorant", dosageForm: "Syrup", unit: "bottle" },
  { code: "MED-VEN-INH", genericName: "Salbutamol", brandName: "Ventolin Inhaler", strength: "100mcg/puff", dosageForm: "Inhaler", unit: "inhaler" },
  { code: "MED-MON-10", genericName: "Montelukast Sodium", brandName: "Singulair", strength: "10mg", dosageForm: "Tablet", unit: "tablet" },

  // Cardiovascular & Metabolic
  { code: "MED-GLU-500", genericName: "Metformin HCl", brandName: "Glucophage", strength: "500mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-GLU-850", genericName: "Metformin HCl", brandName: "Glucophage", strength: "850mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-LIP-20", genericName: "Atorvastatin Calcium", brandName: "Lipiget", strength: "20mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-CNC-5", genericName: "Bisoprolol Fumarate", brandName: "Concor", strength: "5mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-TEN-50", genericName: "Atenolol", brandName: "Tenormin", strength: "50mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-NRV-5", genericName: "Amlodipine Besylate", brandName: "Norvasc", strength: "5mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-COZ-50", genericName: "Losartan Potassium", brandName: "Cozaar", strength: "50mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-LSX-40", genericName: "Furosemide", brandName: "Lasix", strength: "40mg", dosageForm: "Tablet", unit: "tablet" },

  // Vitamins, Topicals & Emergency
  { code: "MED-SRB-Z", genericName: "Zinc + B-Complex + Vitamin C", brandName: "Surbex Z", strength: "High Potency", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-DEL-5", genericName: "Prednisolone", brandName: "Deltacortril", strength: "5mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-PLX-EYE", genericName: "Polymyxin B / Bacitracin", brandName: "Polyfax Eye Ointment", strength: "4g", dosageForm: "Ointment", unit: "tube" },
  { code: "MED-PLX-SKN", genericName: "Polymyxin B / Bacitracin", brandName: "Polyfax Skin Ointment", strength: "20g", dosageForm: "Ointment", unit: "tube" },
  { code: "MED-BTN-CRM", genericName: "Betamethasone / Neomycin", brandName: "Betnovate-N", strength: "15g", dosageForm: "Cream", unit: "tube" },
  { code: "MED-ORS-SCT", genericName: "Oral Rehydration Salts", brandName: "ORS Sachet", strength: "WHO Formula", dosageForm: "Sachet", unit: "sachet" },
  { code: "MED-XYL-INJ", genericName: "Lidocaine HCl 2%", brandName: "Xylocaine", strength: "2% 20mL", dosageForm: "Injection", unit: "vial" },
];

export function GET() {
  return handleApiRoute(async () => {
    const requestContext = await requireRequestContext();
    const context = requireTenantContext(requestContext);
    const branchId = context.branchId;

    let medications = await database.medication.findMany({
      where: { tenantId: context.tenantId, isActive: true },
      select: {
        id: true,
        code: true,
        genericName: true,
        brandName: true,
        strength: true,
        dosageForm: true,
        unit: true,
        reorderLevel: true,
        isActive: true,
      },
      orderBy: { genericName: "asc" },
    });

    if (medications.length === 0) {
      await database.medication.createMany({
        data: DEFAULT_FORMULARY.map((item) => ({
          tenantId: context.tenantId,
          code: item.code,
          genericName: item.genericName,
          brandName: item.brandName,
          strength: item.strength,
          dosageForm: item.dosageForm,
          unit: item.unit,
          isActive: true,
        })),
        skipDuplicates: true,
      });

      medications = await database.medication.findMany({
        where: { tenantId: context.tenantId, isActive: true },
        select: {
          id: true,
          code: true,
          genericName: true,
          brandName: true,
          strength: true,
          dosageForm: true,
          unit: true,
          reorderLevel: true,
          isActive: true,
        },
        orderBy: { genericName: "asc" },
      });
    }

    // Fetch available batches to calculate live stock availability
    const activeBatches = await database.inventoryBatch.findMany({
      where: {
        tenantId: context.tenantId,
        ...(branchId ? { branchId } : {}),
        status: "AVAILABLE",
        expiryDate: { gt: new Date() },
      },
      select: {
        medicationId: true,
        quantity: true,
      },
    });

    const stockMap = new Map<string, number>();
    for (const b of activeBatches) {
      stockMap.set(b.medicationId, (stockMap.get(b.medicationId) ?? 0) + Number(b.quantity));
    }

    const enhancedMedications = medications.map((med) => {
      const stock = stockMap.get(med.id) ?? 0;
      const inStock = stock > 0;
      return {
        ...med,
        availableQuantity: stock,
        inStock,
        isHospitalAvailable: inStock,
      };
    });

    return NextResponse.json({ medications: enhancedMedications });
  });
}

export function POST(request: Request) {
  return handleApiRoute(async () => {
    const requestContext = await requireRequestContext();
    const context = requireTenantContext(requestContext);
    requirePermission(context, "pharmacy.catalogue.manage");
    const body = (await request.json()) as {
      genericName: string;
      brandName?: string;
      strength?: string;
      dosageForm?: string;
      unit?: string;
      initialStock?: number;
    };

    if (!body.genericName?.trim()) {
      return NextResponse.json({ error: "genericName is required" }, { status: 400 });
    }

    const code = `MED-CUST-${Date.now().toString(36).toUpperCase()}`;
    const medication = await database.medication.create({
      data: {
        tenantId: context.tenantId,
        code,
        genericName: body.genericName.trim(),
        brandName: body.brandName?.trim() || null,
        strength: body.strength?.trim() || null,
        dosageForm: body.dosageForm?.trim() || "Tablet",
        unit: body.unit?.trim() || "unit",
        isActive: true,
      },
    });

    if (body.initialStock && body.initialStock > 0 && context.branchId) {
      const futureExpiry = new Date();
      futureExpiry.setFullYear(futureExpiry.getFullYear() + 2);
      await database.inventoryBatch.create({
        data: {
          tenantId: context.tenantId,
          branchId: context.branchId,
          medicationId: medication.id,
          batchNumber: `BAT-INIT-${Date.now().toString(36).toUpperCase()}`,
          expiryDate: futureExpiry,
          quantity: body.initialStock,
          status: "AVAILABLE",
        },
      }).catch(() => {});
    }

    return NextResponse.json({
      medication: {
        ...medication,
        availableQuantity: body.initialStock ?? 0,
        inStock: (body.initialStock ?? 0) > 0,
        isHospitalAvailable: (body.initialStock ?? 0) > 0,
      },
    }, { status: 201 });
  });
}

export function PATCH(request: Request) {
  return handleApiRoute(async () => {
    const requestContext = await requireRequestContext();
    const context = requireTenantContext(requestContext);
    requirePermission(context, "pharmacy.inventory.manage");
    const body = (await request.json()) as {
      medicationId: string;
      isActive?: boolean;
      reorderLevel?: number;
      adjustStock?: number;
    };

    if (!body.medicationId) {
      return NextResponse.json({ error: "medicationId is required" }, { status: 400 });
    }

    const medication = await database.medication.findFirst({
      where: { id: body.medicationId, tenantId: context.tenantId },
    });

    if (!medication) {
      return NextResponse.json({ error: "Medication not found" }, { status: 404 });
    }

    if (body.isActive !== undefined || body.reorderLevel !== undefined) {
      await database.medication.update({
        where: { id: medication.id },
        data: {
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
          ...(body.reorderLevel !== undefined ? { reorderLevel: body.reorderLevel } : {}),
        },
      });
    }

    if (body.adjustStock !== undefined && context.branchId) {
      if (body.adjustStock > 0) {
        const futureExpiry = new Date();
        futureExpiry.setFullYear(futureExpiry.getFullYear() + 2);
        await database.inventoryBatch.create({
          data: {
            tenantId: context.tenantId,
            branchId: context.branchId,
            medicationId: medication.id,
            batchNumber: `ADJ-${Date.now().toString(36).toUpperCase()}`,
            expiryDate: futureExpiry,
            quantity: body.adjustStock,
            status: "AVAILABLE",
          },
        });
      } else if (body.adjustStock === 0) {
        // Mark all batches unavailable for out of stock
        await database.inventoryBatch.updateMany({
          where: { tenantId: context.tenantId, branchId: context.branchId, medicationId: medication.id },
          data: { status: "EXPIRED" },
        });
      }
    }

    return NextResponse.json({ success: true });
  });
}
