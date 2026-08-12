import { NextResponse } from "next/server";

import { safeApiError } from "@/lib/api/route-helpers";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { hospitalAdministrationService as service } from "@/server/admin/hospital-administration-service";

export async function GET() {
  try {
    const context = await requireRequestContext();
    const [schedules, doctors, configuration, services] = await Promise.all([
      service.listSchedules(context),
      service.listDoctors(context),
      service.getConfiguration(context),
      service.listServices(context),
    ]);
    return NextResponse.json({ schedules, doctors, configuration, services });
  } catch (error) {
    return safeApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json({ schedule: await service.createSchedule(await requireRequestContext(), await request.json()) }, { status: 201 });
  } catch (error) {
    return safeApiError(error);
  }
}
