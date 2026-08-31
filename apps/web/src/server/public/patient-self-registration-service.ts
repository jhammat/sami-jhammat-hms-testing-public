import { database } from "@wonflow/database";
import { WonFlowApiError } from "@/server/http/route-handler";
import { hashPassword } from "@/lib/auth/password";

/**
 * A patient creating their own WonFlow account.
 *
 * The screen for this existed and did nothing: it validated the form, then
 * said "Patient account registration service is not connected yet." The reason
 * it was never connected is worth stating, because it constrains what this can
 * safely do.
 *
 * **A new account is never given an existing chart.** Letting someone type a
 * name and a date of birth and receive another person's record is the whole
 * PHI risk in one step, and there is no email or SMS delivery in this codebase
 * to verify anyone against what the hospital already holds. So registration
 * creates a NEW patient record containing only what the person typed about
 * themselves. If they are already known to the hospital, reception links or
 * merges the two from the patient directory, where a human can check.
 *
 * This is the same shape `submitPublicBooking` already uses for a website
 * visitor with no account — one identity, one patient record, nothing
 * inherited — minus the appointment.
 */

export interface PatientSelfRegistrationInput {
  givenName: string;
  familyName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  password: string;
}

/** What the register screen needs to know before it can show a form. */
export interface PublicRegistrationHost {
  tenantId: string;
  tenantSlug: string;
  hospitalName: string;
}

function normalizeOptional(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

/** `SJH-4F2A91` — the same shape reception's own registration produces. */
function patientNumber(): string {
  return `WF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/**
 * Which hospital a visitor on this hostname is registering with.
 *
 * `Tenant.domain` is a unique column and has been since the schema was
 * written; nothing resolved a request against it, which is why a page with no
 * tenant slug in its URL had no hospital to register anyone into.
 *
 * A host that matches nothing returns null rather than falling back to "the
 * first tenant" or listing the tenants that exist. Guessing would enrol a
 * patient at the wrong hospital, and a public list of tenants is a customer
 * list. The screen asks the person to use their hospital's own link instead.
 */
export async function resolvePublicRegistrationHost(
  host: string | null,
): Promise<PublicRegistrationHost | null> {
  const hostname = host?.trim().toLowerCase().split(":")[0];
  if (!hostname) return null;

  const tenant = await database.tenant.findFirst({
    where: { domain: hostname, status: "ACTIVE", archivedAt: null },
    select: { id: true, slug: true, displayName: true },
  });

  if (!tenant) return null;

  return {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    hospitalName: tenant.displayName,
  };
}

export async function registerPatientAccount(
  host: string | null,
  input: PatientSelfRegistrationInput,
): Promise<{ hospitalName: string }> {
  const target = await resolvePublicRegistrationHost(host);

  if (!target) {
    throw new WonFlowApiError(
      404,
      "registration-not-available",
      "This address is not set up for patient registration. Open the link your hospital gave you, or ask their reception desk to create your account.",
    );
  }

  const givenName = input.givenName.trim();
  const familyName = input.familyName.trim();
  const phone = input.phone.trim();
  const email = input.email.trim();
  const normalizedEmail = normalizeOptional(email);

  if (givenName.length < 2 || familyName.length < 2) {
    throw new WonFlowApiError(400, "patient-name-required", "Enter your full name.");
  }

  if (phone.length < 7) {
    throw new WonFlowApiError(400, "patient-phone-required", "Enter a valid mobile number.");
  }

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new WonFlowApiError(400, "patient-email-required", "Enter a valid email address.");
  }

  const dateOfBirth = new Date(`${input.dateOfBirth}T00:00:00.000Z`);
  if (Number.isNaN(dateOfBirth.getTime()) || dateOfBirth > new Date()) {
    throw new WonFlowApiError(400, "invalid-date-of-birth", "Enter a valid date of birth.");
  }

  let passwordHash: string;
  try {
    passwordHash = await hashPassword(input.password);
  } catch (caught) {
    throw new WonFlowApiError(
      400,
      "weak-password",
      caught instanceof Error ? caught.message : "Choose a stronger password.",
    );
  }

  /*
   * An existing identity is refused outright and never updated.
   *
   * The address might belong to a member of staff. Writing a new password
   * hash onto whatever identity happens to hold this email would let anyone
   * take over a doctor's account by typing their address into a public form.
   * The same rule guards `provisionPatientPortalCredentials`.
   */
  if (await database.identity.findUnique({ where: { normalizedEmail } })) {
    throw new WonFlowApiError(
      409,
      "account-already-exists",
      "An account already exists with this email address. Sign in instead, or use “Forgot password”.",
    );
  }

  await database.$transaction(async (transaction) => {
    const identity = await transaction.identity.create({
      data: { email, normalizedEmail, passwordHash, status: "ACTIVE" },
    });

    const patient = await transaction.patient.create({
      data: {
        tenantId: target.tenantId,
        patientNumber: patientNumber(),
        givenName,
        familyName,
        phone,
        normalizedPhone: normalizeOptional(phone),
        email,
        normalizedEmail,
        dateOfBirth,
        // Deliberately not asked for. Sex is a clinical field that belongs in
        // a consultation or at the reception desk, not in a sign-up form, and
        // leaving it unset is honest about not knowing.
        sex: "",
        consentData: { consentToContact: true, referralSource: "patient-self-registration" },
      },
    });

    // Access to their own new record and nothing else, the same grant
    // `submitPublicBooking` makes for a visitor who books without an account.
    await transaction.patientAccess.create({
      data: {
        patientId: patient.id,
        identityId: identity.id,
        isPrimary: true,
        isActive: true,
      },
    });
  });

  return { hospitalName: target.hospitalName };
}
