import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute } from "@/server/http/route-handler";
import {
  getPatientPortalAccessStatus,
  provisionPatientPortalCredentials,
} from "@/server/patient/patient-portal-credential-service";

export function GET(
  _request: Request,
  props: { params: Promise<{ patientId: string }> },
) {
  return handleApiRoute(async () => {
    const { patientId } = await props.params;
    const context = await requireRequestContext();
    return NextResponse.json(await getPatientPortalAccessStatus(context, patientId));
  });
}

export function POST(
  request: Request,
  props: { params: Promise<{ patientId: string }> },
) {
  return handleApiRoute(async () => {
    const { patientId } = await props.params;
    const context = await requireRequestContext();
    let body: { email?: string; password?: string } | undefined;
    try {
      body = (await request.json()) as { email?: string; password?: string };
    } catch {
      // Empty body is acceptable for auto-generated credentials
    }
    return NextResponse.json(await provisionPatientPortalCredentials(context, patientId, body));
  });
}
