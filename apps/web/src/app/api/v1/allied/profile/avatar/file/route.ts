import { NextResponse } from "next/server";

import { requireRequestContext } from "@/lib/auth/permission-service";
import { readAlliedAvatarBytes } from "@/server/allied/allied-profile-service";
import { handleApiRoute } from "@/server/http/route-handler";

/** Streams the caller's own portrait. Never cached by a shared cache. */
export function GET(): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { bytes, contentType } = await readAlliedAvatarBytes(rc);

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "content-type": contentType,
        "cache-control": "private, no-store",
      },
    });
  });
}
