import { NextResponse } from "next/server";
import { database } from "@wonflow/database";
import { requireTenantContext } from "@wonflow/contracts";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute } from "@/server/http/route-handler";

const DEFAULT_FORMULARY = [
  { code: "MED-PCM-500", genericName: "Paracetamol", brandName: "Panadol", strength: "500mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-AUG-625", genericName: "Amoxicillin / Clavulanic Acid", brandName: "Augmentin", strength: "625mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-OMP-20", genericName: "Omeprazole", brandName: "Risek", strength: "20mg", dosageForm: "Capsule", unit: "capsule" },
  { code: "MED-IBU-400", genericName: "Ibuprofen", brandName: "Brufen", strength: "400mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-AZI-500", genericName: "Azithromycin", brandName: "Zithromax", strength: "500mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-MET-500", genericName: "Metformin HCl", brandName: "Glucophage", strength: "500mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-AML-5", genericName: "Amlodipine Besylate", brandName: "Norvasc", strength: "5mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-CIP-500", genericName: "Ciprofloxacin", brandName: "Ciproxin", strength: "500mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-CTZ-10", genericName: "Cetirizine HCl", brandName: "Zyrtec", strength: "10mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-SAL-100", genericName: "Salbutamol", brandName: "Ventolin Inhaler", strength: "100mcg/puff", dosageForm: "Inhaler", unit: "inhaler" },
  { code: "MED-LOS-50", genericName: "Losartan Potassium", brandName: "Cozaar", strength: "50mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-ATV-20", genericName: "Atorvastatin Calcium", brandName: "Lipitor", strength: "20mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-CFT-1G", genericName: "Ceftriaxone Sodium", brandName: "Rocephin", strength: "1g", dosageForm: "Injection", unit: "vial" },
  { code: "MED-MTZ-400", genericName: "Metronidazole", brandName: "Flagyl", strength: "400mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-PRD-5", genericName: "Prednisolone", brandName: "Deltacortril", strength: "5mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-MON-10", genericName: "Montelukast Sodium", brandName: "Singulair", strength: "10mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-PAN-40", genericName: "Pantoprazole", brandName: "Controloc", strength: "40mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-ESC-10", genericName: "Escitalopram", brandName: "Lexapro", strength: "10mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-CLP-75", genericName: "Clopidogrel", brandName: "Plavix", strength: "75mg", dosageForm: "Tablet", unit: "tablet" },
  { code: "MED-FUR-40", genericName: "Furosemide", brandName: "Lasix", strength: "40mg", dosageForm: "Tablet", unit: "tablet" },
];

export function GET() {
  return handleApiRoute(async () => {
    const requestContext = await requireRequestContext();
    const context = requireTenantContext(requestContext);
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
        },
        orderBy: { genericName: "asc" },
      });
    }

    return NextResponse.json({ medications });
  });
}
