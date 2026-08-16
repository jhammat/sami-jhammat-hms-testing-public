import { NextResponse } from "next/server";

import { requireRequestContext } from "@/lib/auth/permission-service";
import { receptionService } from "@/server/reception/reception-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET(_request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  return handleApiRoute(async () => {
    const { patientId } = await params;
    const rc = await requireRequestContext();
    return NextResponse.json({ patient: await receptionService.getPatient(rc, patientId) });
  });
}

export function PATCH(request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  return handleApiRoute(async () => {
    const { patientId } = await params;
    const body = await request.json();
    const rc = await requireRequestContext();
    return NextResponse.json({ patient: await receptionService.updatePatient(rc, patientId, body) });
  });
}

export function DELETE(_request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  return handleApiRoute(async () => {
    const { patientId } = await params;
    return NextResponse.json({ patient: await receptionService.archivePatient(await requireRequestContext(), patientId) });
  });
}
