import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { educationService } from "@/server/clinical/education-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get("language") || undefined;

    const library = await educationService.getPatientEducationLibrary(rc, lang);
    return NextResponse.json(library);
  });
}
