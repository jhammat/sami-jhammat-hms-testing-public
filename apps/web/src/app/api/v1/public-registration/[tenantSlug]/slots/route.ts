import { NextResponse } from "next/server";

import { safeApiError } from "@/lib/api/route-helpers";
import { checkRateLimit, clientAddress, recordFailure } from "@/lib/security/rate-limit";
import { getPublicBookingCatalog } from "@/server/public/public-registration-service";

const READ_LIMIT = 60;
const READ_WINDOW_MS = 5 * 60 * 1000;

export async function GET(request: Request, { params }: { params: Promise<{ tenantSlug: string }> }) {
  try {
    const throttleKey = `public-registration:slots:${clientAddress(request)}`;
    const limit = checkRateLimit(throttleKey, READ_LIMIT, READ_WINDOW_MS);
    if (!limit.allowed) return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
    // recordFailure just increments the counter for this key — used here to
    // throttle every request (unauthenticated), not only failed ones.
    recordFailure(throttleKey, READ_WINDOW_MS);

    const { tenantSlug } = await params;
    const url = new URL(request.url);
    const date = url.searchParams.get("date") ?? "";
    const doctorId = url.searchParams.get("doctorId") ?? undefined;
    return NextResponse.json(await getPublicBookingCatalog(tenantSlug, date, doctorId));
  } catch (error) {
    return safeApiError(error);
  }
}
