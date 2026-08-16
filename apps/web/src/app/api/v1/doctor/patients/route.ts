import { NextResponse } from "next/server";

import { safeApiError } from "@/lib/api/route-helpers";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { listMyConnectedPatients } from "@/server/doctor/doctor-patients-service";

export async function GET() {
  try {
    return NextResponse.json(await listMyConnectedPatients(await requireRequestContext()));
  } catch (error) {
    return safeApiError(error);
  }
}
