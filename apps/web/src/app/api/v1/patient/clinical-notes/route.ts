import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { patientPortalService as s } from "@/server/patient/patient-portal-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET() {
  return handleApiRoute(async () => NextResponse.json({ notes: await s.listClinicalNotes(await requireRequestContext()) }));
}
