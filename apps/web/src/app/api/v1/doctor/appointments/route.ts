import { NextResponse } from "next/server";
import { database } from "@wonflow/database";
import { requireTenantContext } from "@wonflow/contracts";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute, WonFlowApiError } from "@/server/http/route-handler";

export function GET() {
  return handleApiRoute(async () => {
    const context = requireTenantContext(await requireRequestContext());
    if (context.workspace !== "doctor" || !context.membershipId) throw new WonFlowApiError(403, "doctor-access-required", "A doctor workspace is required.");
    const doctor = await database.doctorProfile.findFirst({ where: { tenantId: context.tenantId, staffProfile: { membershipId: context.membershipId, status: "ACTIVE" } } });
    if (!doctor) throw new WonFlowApiError(403, "doctor-profile-required", "A valid doctor profile is required.");
    const appointments = await database.appointment.findMany({
      where: { tenantId: context.tenantId, doctorId: doctor.id },
      include: { patient: true, service: true, branch: true, queueEntry: true },
      orderBy: { startsAt: "asc" },
      take: 250,
    });
    return NextResponse.json({ appointments });
  });
}
