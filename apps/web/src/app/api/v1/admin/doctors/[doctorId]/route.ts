import { NextResponse } from "next/server";

import { safeApiError } from "@/lib/api/route-helpers";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { hospitalAdministrationService } from "@/server/admin/hospital-administration-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ doctorId: string }> },
) {
  try {
    const { doctorId } = await params;
    const doctor = await hospitalAdministrationService.getDoctor(
      await requireRequestContext(),
      doctorId,
    );
    return NextResponse.json({ doctor });
  } catch (error) {
    return safeApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ doctorId: string }> },
) {
  try {
    const { doctorId } = await params;
    const body = await request.json();
    const doctor = await hospitalAdministrationService.updateDoctor(
      await requireRequestContext(),
      doctorId,
      body,
    );
    return NextResponse.json({ doctor });
  } catch (error) {
    return safeApiError(error);
  }
}
