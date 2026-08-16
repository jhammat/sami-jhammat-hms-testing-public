import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute, WonFlowApiError } from "@/server/http/route-handler";
import { removePatientAvatar, uploadPatientAvatar } from "@/server/patient/patient-avatar-service";

export function POST(request: Request) {
  return handleApiRoute(async () => {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new WonFlowApiError(400, "file-required", "Choose a photo to upload.");
    return NextResponse.json(await uploadPatientAvatar(await requireRequestContext(), file));
  });
}

export function DELETE() {
  return handleApiRoute(async () => NextResponse.json(await removePatientAvatar(await requireRequestContext())));
}
