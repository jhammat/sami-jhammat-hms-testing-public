import { NextResponse } from "next/server";

import { safeApiError } from "@/lib/api/route-helpers";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { hospitalAdministrationService as service } from "@/server/admin/hospital-administration-service";

export async function PATCH(request: Request, { params }: { params: Promise<{ scheduleId: string }> }) {
  try {
    const { scheduleId } = await params;
    return NextResponse.json({ schedule: await service.updateSchedule(await requireRequestContext(), scheduleId, await request.json()) });
  } catch (error) {
    return safeApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ scheduleId: string }> }) {
  try {
    const { scheduleId } = await params;
    return NextResponse.json({ schedule: await service.deleteSchedule(await requireRequestContext(), scheduleId) });
  } catch (error) {
    return safeApiError(error);
  }
}
