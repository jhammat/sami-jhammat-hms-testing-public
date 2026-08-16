import { NextResponse } from "next/server";

import { safeApiError } from "@/lib/api/route-helpers";
import { checkRateLimit, clientAddress, recordFailure } from "@/lib/security/rate-limit";
import { submitPublicBooking } from "@/server/public/public-registration-service";
import type { PublicBookingInput } from "@/server/public/public-registration-service";

// A public, unauthenticated write endpoint that creates real patient and
// appointment records — much tighter than the read-only slots throttle,
// since each successful call has a real database cost and could be spammed.
const WRITE_LIMIT = 5;
const WRITE_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request, { params }: { params: Promise<{ tenantSlug: string }> }) {
  try {
    const throttleKey = `public-registration:book:${clientAddress(request)}`;
    const limit = checkRateLimit(throttleKey, WRITE_LIMIT, WRITE_WINDOW_MS);
    if (!limit.allowed) return NextResponse.json({ error: "Too many booking requests from this address. Try again later." }, { status: 429 });
    recordFailure(throttleKey, WRITE_WINDOW_MS);

    const { tenantSlug } = await params;
    const body = await request.json().catch(() => null) as Partial<PublicBookingInput> | null;
    if (!body?.slotId || !body.givenName || !body.familyName || !body.phone || !body.idempotencyKey) {
      return NextResponse.json({ error: "Fill in your name, mobile number and a booking time." }, { status: 400 });
    }

    const appointment = await submitPublicBooking(tenantSlug, {
      slotId: body.slotId,
      givenName: body.givenName,
      familyName: body.familyName,
      phone: body.phone,
      email: body.email,
      reason: body.reason,
      idempotencyKey: body.idempotencyKey,
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    return safeApiError(error);
  }
}
