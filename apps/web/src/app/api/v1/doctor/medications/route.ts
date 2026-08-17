import { NextResponse } from "next/server";
import { database } from "@wonflow/database";
import { requireTenantContext } from "@wonflow/contracts";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET() {
  return handleApiRoute(async () => {
    const requestContext = await requireRequestContext();
    const context = requireTenantContext(requestContext);
    const medications = await database.medication.findMany({
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
    return NextResponse.json({ medications });
  });
}
