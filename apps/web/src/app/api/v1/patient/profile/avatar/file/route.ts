import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute } from "@/server/http/route-handler";
import { readPatientAvatarBytes } from "@/server/patient/patient-avatar-service";

export function GET() {
  return handleApiRoute(async () => {
    const { bytes, contentType } = await readPatientAvatarBytes(await requireRequestContext());
    return new NextResponse(new Uint8Array(bytes), {
      headers: { "content-type": contentType, "cache-control": "private, no-store" },
    });
  });
}
