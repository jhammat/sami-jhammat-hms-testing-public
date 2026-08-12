import { NextResponse } from "next/server";
import { database } from "@wonflow/database";
import { requirePermission, requireTenantContext } from "@wonflow/contracts";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute } from "@/server/http/route-handler";
export function GET(request: Request) { return handleApiRoute(async () => { const context = requireTenantContext(await requireRequestContext()); requirePermission(context, "appointments.read"); const url = new URL(request.url), date = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10), start = new Date(`${date}T00:00:00.000Z`), end = new Date(`${date}T23:59:59.999Z`); const appointments = await database.appointment.findMany({ where: { tenantId: context.tenantId, branch: { organizationId: context.organizationId }, startsAt: { gte: start, lte: end } }, include: { patient: true, branch: true, service: true, doctor: { include: { staffProfile: { include: { membership: true } } } }, queueEntry: true }, orderBy: { startsAt: "asc" } }); return NextResponse.json({ appointments }); }); }
