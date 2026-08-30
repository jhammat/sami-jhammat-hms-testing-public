import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute } from "@/server/http/route-handler";
import { todayIn } from "@/server/time/business-day";
import { bookMyAppointment, getPatientBookingCatalog, listMyAppointments } from "@/server/patient/patient-self-service";
export function GET(request: Request) { return handleApiRoute(async () => { const context = await requireRequestContext(); const url = new URL(request.url); return NextResponse.json({ catalog: await getPatientBookingCatalog(context, url.searchParams.get("date") ?? todayIn(context.timezone)), appointments: await listMyAppointments(context) }); }); }
export function POST(request: Request) { return handleApiRoute(async () => NextResponse.json({ appointment: await bookMyAppointment(await requireRequestContext(), await request.json()) }, { status: 201 })); }
