import { NextResponse } from "next/server";

import { safeApiError } from "@/lib/api/route-helpers";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { hospitalAdministrationService } from "@/server/admin/hospital-administration-service";

export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json() as { authority?: "DOCTOR" | "HOSPITAL" };
    if (body.authority !== "DOCTOR" && body.authority !== "HOSPITAL") {
      return NextResponse.json({ error: "Select who controls doctor fees." }, { status: 400 });
    }
    const organization = await hospitalAdministrationService.updateDoctorFeeAuthority(
      await requireRequestContext(),
      body.authority,
    );
    return NextResponse.json({ organization });
  } catch (error) {
    return safeApiError(error);
  }
}
