import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute } from "@/server/http/route-handler";
import { patientPortalService } from "@/server/patient/patient-portal-service";
import { updateMyPatientProfile } from "@/server/patient/patient-self-service";
export function GET() { return handleApiRoute(async () => NextResponse.json({ home: await patientPortalService.getHome(await requireRequestContext()) })); }
export function PUT(request: Request) { return handleApiRoute(async () => NextResponse.json({ patient: await updateMyPatientProfile(await requireRequestContext(), await request.json()) })); }
