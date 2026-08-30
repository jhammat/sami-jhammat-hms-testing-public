import { NextResponse } from "next/server";

import { safeApiError } from "@/lib/api/route-helpers";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { deleteDoctorConnectedPatient } from "@/server/doctor/doctor-patients-service";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ patientId: string }> },
) {
  try {
    const rc = await requireRequestContext();
    const { patientId } = await params;
    const result = await deleteDoctorConnectedPatient(rc, patientId);
    return NextResponse.json(result);
  } catch (error) {
    return safeApiError(error);
  }
}
