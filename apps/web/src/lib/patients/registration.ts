import type { RegisterPatientInput } from "@/lib/api/patients";

export type PatientRegistrationGender =
  | "female"
  | "male"
  | "other"
  | "unknown";

export type PatientRegistrationCategory =
  | "self-pay"
  | "insurance"
  | "corporate"
  | "government"
  | "charity";

export type PatientPreferredLanguage =
  | "en"
  | "ur";

export interface PatientRegistrationDraft {
  branchId: string;

  givenName: string;
  middleName: string;

  /**
   * Required hospital identity field.
   * For children, this may contain the
   * father or legal guardian's name.
   */
  fatherName: string;

  gender:
    PatientRegistrationGender;

  dateOfBirth: string;
  estimatedAge: string;

  mobileNumber: string;
  alternateMobileNumber: string;
  emailAddress: string;

  /**
   * CNIC for adults or B-Form number
   * for children.
   */
  cnicNumber: string;

  bloodGroup: string;

  patientCategory:
    PatientRegistrationCategory;

  preferredLanguage:
    PatientPreferredLanguage;

  city: string;
  addressLine: string;

  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;

  referralSource: string;
  notes: string;

  consentToContact: boolean;
}

export type PatientRegistrationErrors =
  Partial<
    Record<
      keyof PatientRegistrationDraft,
      string
    >
  >;

/**
 * A saved patient, as every patient screen renders it — the shape returned
 * for a newly registered patient, and the shape every patient in the
 * directory is mapped into. `id` and `mrNumber` are always server-assigned;
 * nothing in this codebase generates them in the browser.
 */
export interface DemoPatientRegistrationResult {
  id: string;
  mrNumber: string;

  displayName: string;

  registeredAt: string;

  draft:
    PatientRegistrationDraft;
}

export function createInitialPatientRegistrationDraft(
  branchId: string,
): PatientRegistrationDraft {
  return {
    branchId,

    givenName: "",
    middleName: "",
    fatherName: "",

    gender: "unknown",

    dateOfBirth: "",
    estimatedAge: "",

    mobileNumber: "",
    alternateMobileNumber: "",
    emailAddress: "",

    cnicNumber: "",
    bloodGroup: "",

    patientCategory:
      "self-pay",

    preferredLanguage: "en",

    city: "Islamabad",
    addressLine: "",

    emergencyContactName: "",
    emergencyContactRelation: "",
    emergencyContactPhone: "",

    referralSource:
      "walk-in",

    notes: "",

    consentToContact: true,
  };
}

export function buildPatientDisplayName(
  draft:
    PatientRegistrationDraft,
): string {
  return [
    draft.givenName,
    draft.middleName,
  ]
    .map(
      (value) =>
        value.trim(),
    )
    .filter(Boolean)
    .join(" ");
}

export function normalizePatientPhone(
  value: string,
): string {
  return value.replace(
    /[\s\-()]/g,
    "",
  );
}

export function normalizePatientCnic(
  value: string,
): string {
  return value.replace(
    /\D/g,
    "",
  );
}

export function formatPatientCnic(
  value: string,
): string {
  const normalized =
    normalizePatientCnic(
      value,
    );

  if (
    normalized.length !== 13
  ) {
    return normalized;
  }

  return [
    normalized.slice(0, 5),
    normalized.slice(5, 12),
    normalized.slice(12),
  ].join("-");
}

function isValidPhone(
  value: string,
): boolean {
  const normalized =
    normalizePatientPhone(
      value,
    );

  return /^\+?[0-9]{10,15}$/.test(
    normalized,
  );
}

function isValidEmail(
  value: string,
): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value,
  );
}

function isValidPatientCnic(
  value: string,
): boolean {
  return /^\d{13}$/.test(
    normalizePatientCnic(
      value,
    ),
  );
}

export function calculatePatientAge(
  dateOfBirth: string,
): number | undefined {
  if (dateOfBirth === "") {
    return undefined;
  }

  const birthDate =
    new Date(dateOfBirth);

  if (
    Number.isNaN(
      birthDate.getTime(),
    )
  ) {
    return undefined;
  }

  const currentDate =
    new Date();

  let age =
    currentDate.getFullYear() -
    birthDate.getFullYear();

  const monthDifference =
    currentDate.getMonth() -
    birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (
      monthDifference === 0 &&
      currentDate.getDate() <
        birthDate.getDate()
    )
  ) {
    age -= 1;
  }

  return age >= 0
    ? age
    : undefined;
}

export function validatePatientRegistration(
  draft:
    PatientRegistrationDraft,
): PatientRegistrationErrors {
  const errors:
    PatientRegistrationErrors = {};

  if (draft.branchId === "") {
    errors.branchId =
      "Select the registration branch.";
  }

  if (
    draft.givenName.trim()
      .length < 2
  ) {
    errors.givenName =
      "Enter the patient’s name.";
  }

  if (
    draft.fatherName.trim()
      .length < 2
  ) {
    errors.fatherName =
      "Enter the father or guardian name.";
  }

  if (
    !isValidPatientCnic(
      draft.cnicNumber,
    )
  ) {
    errors.cnicNumber =
      "Enter a valid 13-digit CNIC or B-Form number.";
  }

  if (
    draft.gender === "unknown"
  ) {
    errors.gender =
      "Select the patient’s gender.";
  }

  const calculatedAge =
    calculatePatientAge(
      draft.dateOfBirth,
    );

  const estimatedAge =
    Number(
      draft.estimatedAge,
    );

  if (
    draft.dateOfBirth === "" &&
    draft.estimatedAge === ""
  ) {
    errors.dateOfBirth =
      "Enter date of birth or estimated age.";

    errors.estimatedAge =
      "Enter estimated age when date of birth is unknown.";
  }

  if (
    draft.dateOfBirth !== "" &&
    calculatedAge === undefined
  ) {
    errors.dateOfBirth =
      "Enter a valid date of birth.";
  }

  if (
    draft.estimatedAge !== "" &&
    (
      !Number.isInteger(
        estimatedAge,
      ) ||
      estimatedAge < 0 ||
      estimatedAge > 130
    )
  ) {
    errors.estimatedAge =
      "Estimated age must be between 0 and 130.";
  }

  if (
    !isValidPhone(
      draft.mobileNumber,
    )
  ) {
    errors.mobileNumber =
      "Enter a valid mobile number.";
  }

  if (
    draft.alternateMobileNumber !==
      "" &&
    !isValidPhone(
      draft
        .alternateMobileNumber,
    )
  ) {
    errors.alternateMobileNumber =
      "Enter a valid alternate number.";
  }

  if (
    draft.emailAddress !== "" &&
    !isValidEmail(
      draft.emailAddress,
    )
  ) {
    errors.emailAddress =
      "Enter a valid email address.";
  }

  if (
    draft.emergencyContactPhone !==
      "" &&
    !isValidPhone(
      draft
        .emergencyContactPhone,
    )
  ) {
    errors.emergencyContactPhone =
      "Enter a valid emergency contact number.";
  }

  return errors;
}

/**
 * The Patient record has separate givenName/familyName columns, but this
 * form (like the reception quick-add flow) collects one combined identity
 * name with no dedicated surname field. The last word of the combined name
 * becomes the family name, matching the convention already used at
 * reception; a single-word name has no family name.
 */
function splitPatientName(
  displayName: string,
): { givenName: string; familyName: string } {
  const parts = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const givenName =
    parts.shift() ?? "";

  const familyName =
    parts.length > 0
      ? (parts.pop() as string)
      : "";

  return {
    givenName:
      [givenName, ...parts]
        .filter(Boolean)
        .join(" "),
    familyName,
  };
}

/**
 * Shapes the registration form into the POST body. All persistence,
 * patient-number generation and duplicate detection happen server-side —
 * this function only normalizes and reorganizes what the person typed.
 */
export function buildRegisterPatientPayload(
  draft:
    PatientRegistrationDraft,
): RegisterPatientInput {
  const { givenName, familyName } =
    splitPatientName(
      buildPatientDisplayName(draft),
    );

  return {
    givenName,
    familyName,
    middleName:
      draft.middleName.trim() ||
      undefined,

    dateOfBirth:
      draft.dateOfBirth || undefined,

    sex:
      draft.gender === "unknown"
        ? undefined
        : draft.gender,

    phone: normalizePatientPhone(
      draft.mobileNumber,
    ),

    alternateMobileNumber:
      draft.alternateMobileNumber ===
      ""
        ? undefined
        : normalizePatientPhone(
            draft.alternateMobileNumber,
          ),

    email:
      draft.emailAddress || undefined,

    fatherName: draft.fatherName,

    bloodGroup:
      draft.bloodGroup || undefined,

    patientCategory:
      draft.patientCategory,

    preferredLanguage:
      draft.preferredLanguage,

    city: draft.city || undefined,

    addressLine:
      draft.addressLine || undefined,

    emergencyContactName:
      draft.emergencyContactName ||
      undefined,

    emergencyContactRelation:
      draft.emergencyContactRelation ||
      undefined,

    emergencyContactPhone:
      draft.emergencyContactPhone ===
      ""
        ? undefined
        : normalizePatientPhone(
            draft.emergencyContactPhone,
          ),

    referralSource:
      draft.referralSource,

    notes: draft.notes || undefined,

    consentToContact:
      draft.consentToContact,

    identifiers: [
      {
        type: "cnic",
        system: "cnic",
        value: formatPatientCnic(
          draft.cnicNumber,
        ),
        isPrimary: true,
      },
    ],
  };
}
