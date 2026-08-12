import { NextResponse } from "next/server";

import { safeApiError } from "@/lib/api/route-helpers";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { hospitalAdministrationService as service } from "@/server/admin/hospital-administration-service";

export async function GET() {
  try {
    return NextResponse.json({ policies: await service.listPolicies(await requireRequestContext()) });
  } catch (error) {
    return safeApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json({ policy: await service.createPolicy(await requireRequestContext(), await request.json()) }, { status: 201 });
  } catch (error) {
    return safeApiError(error);
  }
}
