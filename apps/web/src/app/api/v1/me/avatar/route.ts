import { NextResponse } from "next/server";

import { database } from "@wonflow/database";

import { safeApiError } from "@/lib/api/route-helpers";
import { readSession } from "@/lib/auth/session-server";
import { findStaffAvatarByMembership } from "@/server/allied/allied-profile-service";
import { findPatientAvatarByIdentity } from "@/server/patient/patient-avatar-service";

/**
 * The signed-in user's profile photo for the application shell.
 *
 * A doctor's photo is kept out of the session payload deliberately: it's
 * stored as a data URL up to 1 MB and the session is read on every request
 * and render. A patient's photo is a real uploaded file, so this instead
 * points the shell at the streaming route that serves it.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const session = await readSession();
    if (!session?.identityId) return NextResponse.json({ avatarUrl: null });
    if (session.membershipId) {
      const doctor = await database.doctorProfile.findFirst({
        where: { staffProfile: { membershipId: session.membershipId } },
        select: { profileImageData: true },
      });
      if (doctor?.profileImageData) {
        return NextResponse.json({ avatarUrl: doctor.profileImageData }, { headers: { "cache-control": "private, no-store" } });
      }

      // Allied health staff (physiotherapists, dietitians) have no
      // DoctorProfile, so their portrait lives on the membership itself and
      // is streamed rather than inlined as a data URL.
      const hasStaffPhoto = await findStaffAvatarByMembership(
        session.membershipId,
        session.tenantId ?? null,
      );

      if (hasStaffPhoto) {
        return NextResponse.json(
          { avatarUrl: "/api/v1/allied/profile/avatar/file" },
          { headers: { "cache-control": "private, no-store" } },
        );
      }
    }
    const patientAvatar = await findPatientAvatarByIdentity(session.identityId, session.tenantId ?? null);
    return NextResponse.json({ avatarUrl: patientAvatar ? "/api/v1/patient/profile/avatar/file" : null }, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    return safeApiError(error);
  }
}
