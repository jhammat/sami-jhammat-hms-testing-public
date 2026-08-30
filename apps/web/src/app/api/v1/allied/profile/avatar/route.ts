import { NextRequest, NextResponse } from "next/server";

import { requireRequestContext } from "@/lib/auth/permission-service";
import {
  removeAlliedAvatar,
  uploadAlliedAvatar,
} from "@/server/allied/allied-profile-service";
import { handleApiRoute, WonFlowApiError } from "@/server/http/route-handler";

export function POST(request: NextRequest): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      throw new WonFlowApiError(
        400,
        "file-required",
        "Attach an image file under the field name \"file\" and try again.",
      );
    }

    const result = await uploadAlliedAvatar(rc, file);
    return NextResponse.json(result, { status: 201 });
  });
}

export function DELETE(): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const result = await removeAlliedAvatar(rc);
    return NextResponse.json(result);
  });
}
