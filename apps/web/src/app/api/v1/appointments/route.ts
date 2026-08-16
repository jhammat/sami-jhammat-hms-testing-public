import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { receptionService as s } from "@/server/reception/reception-service";
import { handleApiRoute } from "@/server/http/route-handler";

function parseIntParam(value: string | null): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

// Server-computed available slots and the paginated, server-filtered
// appointment list both live on this collection endpoint rather than as
// separate routes.
export function GET(request: Request) {
  return handleApiRoute(async () => {
    const context = await requireRequestContext();
    const params = new URL(request.url).searchParams;

    if (params.get("slots") === "1") {
      const doctorId = params.get("doctorId") ?? "";
      const branchId = params.get("branchId") ?? "";
      const date = params.get("date") ?? "";
      const durationMinutes = parseIntParam(params.get("durationMinutes")) ?? 20;

      const result = await s.listAppointmentSlots(context, {
        doctorId,
        branchId,
        date,
        serviceDurationMinutes: durationMinutes,
      });

      return NextResponse.json(result);
    }

    const sortParam = params.get("sort");
    const sort = sortParam === "time-descending" ? "time-descending" : "time-ascending";

    const result = await s.listAppointments(context, {
      query: params.get("query") ?? undefined,
      branchId: params.get("branchId") ?? undefined,
      practitionerId: params.get("practitionerId") ?? undefined,
      status: params.get("status") ?? undefined,
      date: params.get("date") ?? undefined,
      dateFrom: params.get("dateFrom") ?? undefined,
      dateTo: params.get("dateTo") ?? undefined,
      page: parseIntParam(params.get("page")),
      pageSize: parseIntParam(params.get("pageSize")),
      sort,
    });

    return NextResponse.json(result);
  });
}

export function POST(request: Request) {
  return handleApiRoute(async () => NextResponse.json({ appointment: await s.bookAppointment(await requireRequestContext(), await request.json()) }, { status: 201 }));
}
