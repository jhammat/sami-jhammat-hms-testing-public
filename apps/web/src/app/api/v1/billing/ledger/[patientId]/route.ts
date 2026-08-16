import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { billingService } from "@/server/finance/billing-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET(_request: Request, context: { params: Promise<{ patientId: string }> }) {
  return handleApiRoute(async () => {
    const { patientId } = await context.params;
    return NextResponse.json(await billingService.getPatientLedger(await requireRequestContext(), patientId));
  });
}
