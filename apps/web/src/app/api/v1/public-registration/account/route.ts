import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { handleApiRoute } from "@/server/http/route-handler";
import {
  registerPatientAccount,
  resolvePublicRegistrationHost,
} from "@/server/public/patient-self-registration-service";
import {
  checkRateLimit,
  clientAddress,
  recordFailure,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

/**
 * Patient self-registration.
 *
 * Unauthenticated by design — the person has no account yet, which is the
 * point — so it is throttled per source address. The limit counts every
 * attempt rather than only failures: a script creating accounts succeeds each
 * time, so counting failures alone would not slow it down at all.
 */
const REGISTRATION_LIMIT = Number(process.env.WONFLOW_REGISTRATION_LIMIT ?? 10);
const REGISTRATION_WINDOW_MS = 60 * 60 * 1000;

/** Whether this hostname belongs to a hospital, so the form knows what to say. */
export async function GET() {
  return handleApiRoute(async () => {
    const host = (await headers()).get("host");
    const target = await resolvePublicRegistrationHost(host);

    if (!target) {
      return NextResponse.json({ available: false }, { status: 200 });
    }

    // The tenant id stays on the server. The screen only needs a name to show.
    return NextResponse.json({ available: true, hospitalName: target.hospitalName });
  });
}

export async function POST(request: Request) {
  const throttleKey = `patient-registration:${clientAddress(request)}`;
  const limit = checkRateLimit(throttleKey, REGISTRATION_LIMIT, REGISTRATION_WINDOW_MS);
  if (!limit.allowed) return rateLimitResponse(limit);

  return handleApiRoute(async () => {
    recordFailure(throttleKey, REGISTRATION_WINDOW_MS);

    const body = (await request.json().catch(() => null)) as {
      givenName?: string;
      familyName?: string;
      email?: string;
      phone?: string;
      dateOfBirth?: string;
      password?: string;
    } | null;

    if (!body) {
      return NextResponse.json(
        { error: "Complete the form and try again.", code: "invalid-request" },
        { status: 400 },
      );
    }

    const host = (await headers()).get("host");

    const { hospitalName } = await registerPatientAccount(host, {
      givenName: body.givenName ?? "",
      familyName: body.familyName ?? "",
      email: body.email ?? "",
      phone: body.phone ?? "",
      dateOfBirth: body.dateOfBirth ?? "",
      password: body.password ?? "",
    });

    return NextResponse.json({ hospitalName }, { status: 201 });
  });
}
