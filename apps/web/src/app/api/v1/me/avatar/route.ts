import { NextResponse } from "next/server";

import { database } from "@wonflow/database";

import { safeApiError } from "@/lib/api/route-helpers";
import { readSession } from "@/lib/auth/session-server";

/**
 * The signed-in user's profile photo for the application shell.
 *
 * Kept out of the session payload deliberately: the photo is stored as a data
 * URL up to 1 MB and the session is read on every request and render.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const session = await readSession();
    if (!session?.membershipId) return NextResponse.json({ avatarUrl: null });
    const doctor = await database.doctorProfile.findFirst({
      where: { staffProfile: { membershipId: session.membershipId } },
      select: { profileImageData: true },
    });
    return NextResponse.json({ avatarUrl: doctor?.profileImageData ?? null }, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    return safeApiError(error);
  }
}
