import { NextResponse } from "next/server";

import { safeApiError } from "@/lib/api/route-helpers";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { hospitalAdministrationService } from "@/server/admin/hospital-administration-service";

export async function PATCH(request: Request, { params }: { params: Promise<{ doctorId: string }> }) {
  try {
    const { doctorId } = await params;
    const body = (await request.json()) as { publiclyBookable?: unknown };
    const doctor = await hospitalAdministrationService.setDoctorPatientBooking(
      await requireRequestContext(),
      doctorId,
      body.publiclyBookable as boolean,
    );
    return NextResponse.json({ doctor });
  } catch (error) {
    return safeApiError(error);
  }
}
