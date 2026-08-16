import { NextResponse } from "next/server";

import { safeApiError } from "@/lib/api/route-helpers";
import { getPublicBookingInfo } from "@/server/public/public-registration-service";

export async function GET(_request: Request, { params }: { params: Promise<{ tenantSlug: string }> }) {
  try {
    const { tenantSlug } = await params;
    return NextResponse.json(await getPublicBookingInfo(tenantSlug));
  } catch (error) {
    return safeApiError(error);
  }
}
