import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { safeApiError } from "@/lib/api/route-helpers";
import { hospitalAdministrationService } from "@/server/admin/hospital-administration-service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const { requestId } = await params;
    const body = await request.json();
    const result = await hospitalAdministrationService.reviewFeeRequest(
      await requireRequestContext(),
      requestId,
      body,
    );
    return NextResponse.json(result);
  } catch (error) {
    return safeApiError(error);
  }
}
