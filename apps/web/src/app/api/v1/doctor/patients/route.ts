import { NextResponse } from "next/server";

import { safeApiError } from "@/lib/api/route-helpers";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { listMyConnectedPatients } from "@/server/doctor/doctor-patients-service";

export async function GET(request: Request) {
  try {
    const search = new URL(request.url).searchParams.get("search") ?? undefined;
    return NextResponse.json(await listMyConnectedPatients(await requireRequestContext(), { search }));
  } catch (error) {
    return safeApiError(error);
  }
}
