import { NextResponse } from "next/server";

import { requireRequestContext } from "@/lib/auth/permission-service";
import { receptionService } from "@/server/reception/reception-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function DELETE(_request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  return handleApiRoute(async () => {
    const { patientId } = await params;
    return NextResponse.json({ patient: await receptionService.archivePatient(await requireRequestContext(), patientId) });
  });
}
