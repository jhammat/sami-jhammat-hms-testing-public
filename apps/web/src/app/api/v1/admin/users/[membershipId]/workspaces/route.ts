import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { safeApiError } from "@/lib/api/route-helpers";
import { hospitalAdministrationService as s } from "@/server/admin/hospital-administration-service";
import type { WorkspaceCode } from "@wonflow/database";

export async function PUT(r: Request, { params }: { params: Promise<{ membershipId: string }> }) {
  try {
    const { membershipId } = await params;
    const body = (await r.json()) as {
      workspaceCodes: WorkspaceCode[];
      departmentId?: string | null;
      primaryBranchId?: string | null;
    };
    const updated = await s.updateUserWorkspaces(await requireRequestContext(), membershipId, body);
    return NextResponse.json({ user: updated });
  } catch (e) {
    return safeApiError(e);
  }
}

export async function PATCH(r: Request, { params }: { params: Promise<{ membershipId: string }> }) {
  return PUT(r, { params });
}
