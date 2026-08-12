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

export interface DemoPatientRegistrationResult {
  id: string;
  mrNumber: string;

  displayName: string;

  registeredAt: string;

  draft:
    PatientRegistrationDraft;
}

const DEMO_PATIENT_STORAGE_KEY =
  "wonflow-demo-patient-registrations";

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

function generatePatientIdentifier():
  string {
  if (
    typeof globalThis.crypto
      ?.randomUUID === "function"
  ) {
    return globalThis.crypto
      .randomUUID();
  }

  return [
    "demo-patient",
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2),
  ].join("-");
}

function generateMrNumber():
  string {
  const year =
    new Date().getFullYear();

  const randomPart =
    Math.floor(
      100000 +
      Math.random() * 900000,
    );

  return `MR-${year}-${randomPart}`;
}

export function createDemoPatientRegistration(
  draft:
    PatientRegistrationDraft,
): DemoPatientRegistrationResult {
  return {
    id:
      generatePatientIdentifier(),

    mrNumber:
      generateMrNumber(),

    displayName:
      buildPatientDisplayName(
        draft,
      ),

    registeredAt:
      new Date().toISOString(),

    draft: {
      ...draft,

      cnicNumber:
        formatPatientCnic(
          draft.cnicNumber,
        ),

      mobileNumber:
        normalizePatientPhone(
          draft.mobileNumber,
        ),

      alternateMobileNumber:
        normalizePatientPhone(
          draft
            .alternateMobileNumber,
        ),

      emergencyContactPhone:
        normalizePatientPhone(
          draft
            .emergencyContactPhone,
        ),
    },
  };
}

export function persistDemoPatientRegistration(
  registration:
    DemoPatientRegistrationResult,
): void {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  const existingValue =
    window.localStorage.getItem(
      DEMO_PATIENT_STORAGE_KEY,
    );

  let registrations:
    DemoPatientRegistrationResult[] =
    [];

  if (existingValue !== null) {
    try {
      const parsedValue:
        unknown =
        JSON.parse(
          existingValue,
        );

      if (
        Array.isArray(
          parsedValue,
        )
      ) {
        registrations =
          parsedValue as
            DemoPatientRegistrationResult[];
      }
    } catch {
      registrations = [];
    }
  }

  const updatedRegistrations =
    [
      registration,
      ...registrations,
    ].slice(0, 50);

  window.localStorage.setItem(
    DEMO_PATIENT_STORAGE_KEY,
    JSON.stringify(
      updatedRegistrations,
    ),
  );

  window.dispatchEvent(
    new Event(
      "wonflow:demo-patients-changed",
    ),
  );
}

export function readDemoPatientRegistrations():
  DemoPatientRegistrationResult[] {
  if (
    typeof window === "undefined"
  ) {
    return [];
  }

  const storedValue =
    window.localStorage.getItem(
      DEMO_PATIENT_STORAGE_KEY,
    );

  if (storedValue === null) {
    return [];
  }

  try {
    const parsedValue:
      unknown =
      JSON.parse(storedValue);

    if (
      !Array.isArray(
        parsedValue,
      )
    ) {
      return [];
    }

    return parsedValue as
      DemoPatientRegistrationResult[];
  } catch {
    return [];
  }
}
