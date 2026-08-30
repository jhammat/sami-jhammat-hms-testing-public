import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { safeApiError } from "@/lib/api/route-helpers";
import { hospitalAdministrationService } from "@/server/admin/hospital-administration-service";

export async function GET() {
  try {
    const feeRequests = await hospitalAdministrationService.listFeeRequests(
      await requireRequestContext(),
    );
    return NextResponse.json({ feeRequests });
  } catch (error) {
    return safeApiError(error);
  }
}
