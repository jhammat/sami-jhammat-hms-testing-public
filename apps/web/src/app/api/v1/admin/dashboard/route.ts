import { NextResponse } from "next/server";

import { safeApiError } from "@/lib/api/route-helpers";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { getOrganizationAdminDashboard } from "@/server/admin/organization-dashboard-service";

export async function GET(): Promise<NextResponse> {
  try {
    const dashboard = await getOrganizationAdminDashboard(
      await requireRequestContext(),
    );
    return NextResponse.json({ dashboard });
  } catch (error) {
    return safeApiError(error);
  }
}
