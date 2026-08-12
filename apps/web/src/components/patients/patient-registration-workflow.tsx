"use client";

import Link from "next/link";

import {
  useState,
} from "react";

import type {
  FormEvent,
  KeyboardEvent,
  ReactNode,
} from "react";

import type {
  MockBranch,
} from "@wonflow/mock-data";

import {
  useWonFlowHospitalService,
} from "@/app/_providers";

import {
  WonFlowAsyncDataBoundary,
  WonFlowErrorState,
} from "@/components/feedback";

import {
  WonFlowActionButton,
  WonFlowOperationalPanel,
  WonFlowPageHeader,
} from "@/components/workspace";

import {
  useWonFlowAsyncData,
} from "@/lib/data";

import {
  buildPatientDisplayName,
  calculatePatientAge,
  createDemoPatientRegistration,
  createInitialPatientRegistrationDraft,
  persistDemoPatientRegistration,
  validatePatientRegistration,
} from "@/lib/patients";

import type {
  DemoPatientRegistrationResult,
  PatientRegistrationDraft,
  PatientRegistrationErrors,
} from "@/lib/patients";

const INPUT_CLASS_NAME = [
  "h-11 w-full",
  "rounded-xl border",
  "border-slate-200",
  "bg-white px-3.5",
  "text-sm text-slate-900",
  "outline-none transition",
  "placeholder:text-slate-400",
  "focus:border-blue-400",
  "focus:ring-2",
  "focus:ring-blue-100",
].join(" ");

const TEXTAREA_CLASS_NAME = [
  "min-h-24 w-full",
  "resize-y rounded-xl",
  "border border-slate-200",
  "bg-white px-3.5 py-3",
  "text-sm text-slate-900",
  "outline-none transition",
  "placeholder:text-slate-400",
  "focus:border-blue-400",
  "focus:ring-2",
  "focus:ring-blue-100",
].join(" ");

type RegistrationFocusableControl =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement
  | HTMLButtonElement;

function handleRegistrationEnterKey(
  event:
    KeyboardEvent<HTMLFormElement>,
): void {
  if (
    event.key !== "Enter" ||
    event.shiftKey ||
    event.ctrlKey ||
    event.altKey ||
    event.metaKey
  ) {
    return;
  }

  const target =
    event.target;

  /**
   * Enter remains available for creating
   * new lines inside text areas.
   */
  if (
    target instanceof
    HTMLTextAreaElement
  ) {
    return;
  }

  /**
   * Buttons, checkboxes and radios keep
   * their normal keyboard behaviour.
   */
  if (
    target instanceof
      HTMLInputElement &&
    (
      target.type ===
        "checkbox" ||
      target.type ===
        "radio" ||
      target.type ===
        "submit" ||
      target.type ===
        "button"
    )
  ) {
    return;
  }

  if (
    !(
      target instanceof
        HTMLInputElement ||
      target instanceof
        HTMLSelectElement
    )
  ) {
    return;
  }

  event.preventDefault();

  const controls =
    Array.from(
      event.currentTarget.elements,
    ).filter(
      (
        element,
      ): element is
        RegistrationFocusableControl =>
        (
          element instanceof
            HTMLInputElement ||
          element instanceof
            HTMLSelectElement ||
          element instanceof
            HTMLTextAreaElement ||
          element instanceof
            HTMLButtonElement
        ) &&
        !element.disabled &&
        element.tabIndex !== -1 &&
        !(
          element instanceof
            HTMLInputElement &&
          element.type === "hidden"
        ),
    );

  const currentIndex =
    controls.indexOf(
      target,
    );

  if (currentIndex < 0) {
    return;
  }

  const nextControl =
    controls[
      currentIndex + 1
    ];

  nextControl?.focus();
}

function PatientIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        cx="12"
        cy="8"
        r="3"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="M5 21a7 7 0 0 1 14 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />

      <path
        d="M19 7h3M20.5 5.5v3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function IdentityIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <rect
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
        width="18"
        x="3"
        y="4"
      />

      <circle
        cx="8"
        cy="10"
        r="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="M5.5 16a3 3 0 0 1 5 0M13 9h5M13 13h5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ContactIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M7 3h4l2 5-3 2a15 15 0 0 0 4 4l2-3 5 2v4a4 4 0 0 1-4 4C9.3 21 3 14.7 3 7a4 4 0 0 1 4-4Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function EmergencyIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M12 3v18M3 12h18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />

      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="m8 12 2.6 2.6L16.5 9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: ReactNode;
}

function Field({
  label,
  required = false,
  error,
  helperText,
  children,
}: FieldProps) {
  return (
    <label className="block">
      <span className="flex items-center gap-1 text-xs font-extrabold text-slate-600">
        {label}

        {required ? (
          <span
            aria-hidden="true"
            className="text-rose-500"
          >
            *
          </span>
        ) : null}
      </span>

      <div className="mt-1.5">
        {children}
      </div>

      {error !== undefined ? (
        <span className="mt-1.5 block text-xs font-semibold text-rose-600">
          {error}
        </span>
      ) : helperText !== undefined ? (
        <span className="mt-1.5 block text-xs leading-5 text-slate-400">
          {helperText}
        </span>
      ) : null}
    </label>
  );
}

interface PatientRegistrationFormProps {
  branches:
    readonly MockBranch[];
}

function PatientRegistrationForm({
  branches,
}: PatientRegistrationFormProps) {
  const [
    draft,
    setDraft,
  ] = useState<
    PatientRegistrationDraft
  >(() =>
    createInitialPatientRegistrationDraft(
      branches[0]?.id ?? "",
    ),
  );

  const [
    errors,
    setErrors,
  ] = useState<
    PatientRegistrationErrors
  >({});

  const [
    savedRegistration,
    setSavedRegistration,
  ] = useState<
    DemoPatientRegistrationResult |
    undefined
  >();

  const selectedBranch =
    branches.find(
      (branch) =>
        branch.id ===
        draft.branchId,
    );

  const displayName =
    buildPatientDisplayName(
      draft,
    );

  const calculatedAge =
    calculatePatientAge(
      draft.dateOfBirth,
    );

  const estimatedAge =
    draft.estimatedAge === ""
      ? undefined
      : Number(
          draft.estimatedAge,
        );

  const displayedAge =
    calculatedAge ??
    (
      Number.isFinite(
        estimatedAge,
      )
        ? estimatedAge
        : undefined
    );

  const completedEssentialFields =
    [
      draft.branchId,
      draft.givenName.trim(),
      draft.fatherName.trim(),
      draft.cnicNumber.trim(),

      draft.gender === "unknown"
        ? ""
        : draft.gender,

      draft.dateOfBirth ||
        draft.estimatedAge,

      draft.mobileNumber.trim(),
    ].filter(Boolean).length;

  const completionPercentage =
    Math.round(
      completedEssentialFields /
      7 *
      100,
    );

  function updateField<
    TField extends
      keyof PatientRegistrationDraft,
  >(
    field: TField,
    value:
      PatientRegistrationDraft[TField],
  ) {
    setDraft(
      (currentDraft) => ({
        ...currentDraft,
        [field]: value,
      }),
    );

    setErrors(
      (currentErrors) => {
        const updatedErrors = {
          ...currentErrors,
        };

        delete updatedErrors[
          field
        ];

        return updatedErrors;
      },
    );
  }

  function submitRegistration(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const validationErrors =
      validatePatientRegistration(
        draft,
      );

    setErrors(
      validationErrors,
    );

    if (
      Object.keys(
        validationErrors,
      ).length > 0
    ) {
      const firstInvalidControl =
        event.currentTarget
          .querySelector<
            HTMLInputElement |
            HTMLSelectElement
          >(
            "[aria-invalid='true']",
          );

      firstInvalidControl
        ?.focus();

      return;
    }

    const registration =
      createDemoPatientRegistration(
        draft,
      );

    persistDemoPatientRegistration(
      registration,
    );

    setSavedRegistration(
      registration,
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function registerAnotherPatient() {
    setDraft(
      createInitialPatientRegistrationDraft(
        draft.branchId,
      ),
    );

    setErrors({});
    setSavedRegistration(
      undefined,
    );
  }

  if (
    savedRegistration !==
    undefined
  ) {
    return (
      <section
        className={[
          "overflow-hidden",
          "rounded-3xl border",
          "border-emerald-200",
          "bg-white shadow-sm",
        ].join(" ")}
      >
        <div
          className={[
            "bg-gradient-to-r",
            "from-emerald-600",
            "to-teal-600",
            "p-6 text-white",
          ].join(" ")}
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <CheckIcon />
            </div>

            <div>
              <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-100">
                Patient Saved
              </div>

              <h2 className="mt-1 text-2xl font-black">
                Registration complete
              </h2>

              <p className="mt-2 text-sm leading-6 text-emerald-50">
                The patient identity has been saved. The patient can now continue to billing, appointment booking or another hospital service.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">
              Registered Patient
            </div>

            <div className="mt-2 text-2xl font-black text-slate-950">
              {
                savedRegistration
                  .displayName
              }
            </div>

            <div className="mt-2 text-sm font-bold text-indigo-700">
              {
                savedRegistration
                  .mrNumber
              }
            </div>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <SummaryItem
                label="Registration Branch"
                value={
                  selectedBranch
                    ?.name ??
                  "Unknown branch"
                }
              />

              <SummaryItem
                label="Father / Guardian"
                value={
                  savedRegistration
                    .draft
                    .fatherName
                }
              />

              <SummaryItem
                label="CNIC / B-Form"
                value={
                  savedRegistration
                    .draft
                    .cnicNumber
                }
              />

              <SummaryItem
                label="Mobile Number"
                value={
                  savedRegistration
                    .draft
                    .mobileNumber
                }
              />

              <SummaryItem
                label="Gender"
                value={
                  savedRegistration
                    .draft
                    .gender
                }
              />

              <SummaryItem
                label="Patient Category"
                value={
                  savedRegistration
                    .draft
                    .patientCategory
                    .replaceAll(
                      "-",
                      " ",
                    )
                }
              />
            </dl>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-sm font-extrabold text-slate-900">
              Next actions
            </div>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Billing will be connected in the next workflow using this patient’s MR number and saved identity.
            </p>

            <div className="mt-4 space-y-2">
              <Link
                className={[
                  "flex min-h-11 w-full",
                  "items-center justify-center",
                  "rounded-xl",
                  "bg-gradient-to-r",
                  "from-emerald-600",
                  "to-teal-600",
                  "px-4 text-sm",
                  "font-bold text-white",
                  "transition",
                  "hover:from-emerald-700",
                  "hover:to-teal-700",
                ].join(" ")}
                href={`/operations/billing/new?patientId=${encodeURIComponent(
                  savedRegistration.id,
                )}`}
              >
                Add Services and Create Bill
              </Link>

              <Link
                className={[
                  "flex min-h-11 w-full",
                  "items-center justify-center",
                  "rounded-xl border",
                  "border-blue-200",
                  "bg-blue-50",
                  "px-4 text-sm",
                  "font-bold text-blue-700",
                  "transition",
                  "hover:bg-blue-100",
                ].join(" ")}
                href={`/operations/appointments/new?patientId=${encodeURIComponent(
                  savedRegistration.id,
                )}`}
              >
                Book Appointment
              </Link>

              <button
                className={[
                  "flex min-h-11 w-full",
                  "items-center justify-center",
                  "rounded-xl",
                  "bg-gradient-to-r",
                  "from-blue-600",
                  "to-indigo-600",
                  "px-4 text-sm",
                  "font-bold text-white",
                  "transition",
                  "hover:from-blue-700",
                  "hover:to-indigo-700",
                ].join(" ")}
                onClick={
                  registerAnotherPatient
                }
                type="button"
              >
                Register Another Patient
              </button>

              <Link
                className={[
                  "flex min-h-11 w-full",
                  "items-center justify-center",
                  "rounded-xl border",
                  "border-slate-200",
                  "bg-white px-4",
                  "text-sm font-bold",
                  "text-slate-700",
                  "transition",
                  "hover:bg-slate-100",
                ].join(" ")}
                href="/operations"
              >
                Return to Operations
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <form
      id="patient-registration-form"
      onKeyDown={
        handleRegistrationEnterKey
      }
      onSubmit={
        submitRegistration
      }
    >
      <div className="wf-workflow-split">
        <div className="wf-workflow-main space-y-6">
          <WonFlowOperationalPanel
            description="Essential patient identity and demographic information."
            icon={<IdentityIcon />}
            title="Patient Identity"
            tone="blue"
          >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Field
                error={
                  errors.branchId
                }
                label="Registration Branch"
                required
              >
                <select
                  aria-invalid={
                    errors.branchId !==
                    undefined
                  }
                  className={
                    INPUT_CLASS_NAME
                  }
                  onChange={(
                    event,
                  ) => {
                    updateField(
                      "branchId",
                      event.target
                        .value,
                    );
                  }}
                  value={
                    draft.branchId
                  }
                >
                  {branches.map(
                    (branch) => (
                      <option
                        key={branch.id}
                        value={branch.id}
                      >
                        {branch.name}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field
                error={
                  errors.givenName
                }
                label="Patient Name"
                required
              >
                <input
                  aria-invalid={
                    errors.givenName !==
                    undefined
                  }
                  autoComplete="given-name"
                  className={
                    INPUT_CLASS_NAME
                  }
                  onChange={(
                    event,
                  ) => {
                    updateField(
                      "givenName",
                      event.target
                        .value,
                    );
                  }}
                  placeholder="Patient name"
                  value={
                    draft.givenName
                  }
                />
              </Field>

              <Field label="Additional Name">
                <input
                  autoComplete="additional-name"
                  className={
                    INPUT_CLASS_NAME
                  }
                  onChange={(
                    event,
                  ) => {
                    updateField(
                      "middleName",
                      event.target
                        .value,
                    );
                  }}
                  placeholder="Optional"
                  value={
                    draft.middleName
                  }
                />
              </Field>

              <Field
                error={
                  errors.fatherName
                }
                label="Father / Guardian Name"
                required
              >
                <input
                  aria-invalid={
                    errors.fatherName !==
                    undefined
                  }
                  autoComplete="off"
                  className={
                    INPUT_CLASS_NAME
                  }
                  onChange={(
                    event,
                  ) => {
                    updateField(
                      "fatherName",
                      event.target
                        .value,
                    );
                  }}
                  placeholder="Father or guardian name"
                  value={
                    draft.fatherName
                  }
                />
              </Field>

              <Field
                error={
                  errors.cnicNumber
                }
                helperText="Enter 13 digits. B-Form is accepted for children."
                label="CNIC / B-Form Number"
                required
              >
                <input
                  aria-invalid={
                    errors.cnicNumber !==
                    undefined
                  }
                  className={
                    INPUT_CLASS_NAME
                  }
                  inputMode="numeric"
                  maxLength={15}
                  onChange={(
                    event,
                  ) => {
                    updateField(
                      "cnicNumber",
                      event.target
                        .value,
                    );
                  }}
                  placeholder="12345-1234567-1"
                  value={
                    draft.cnicNumber
                  }
                />
              </Field>

              <Field
                error={
                  errors.gender
                }
                label="Gender"
                required
              >
                <select
                  aria-invalid={
                    errors.gender !==
                    undefined
                  }
                  className={
                    INPUT_CLASS_NAME
                  }
                  onChange={(
                    event,
                  ) => {
                    updateField(
                      "gender",
                      event.target
                        .value as
                        PatientRegistrationDraft["gender"],
                    );
                  }}
                  value={draft.gender}
                >
                  <option value="unknown">
                    Select gender
                  </option>

                  <option value="female">
                    Female
                  </option>

                  <option value="male">
                    Male
                  </option>

                  <option value="other">
                    Other
                  </option>
                </select>
              </Field>

              <Field
                error={
                  errors.dateOfBirth
                }
                helperText="Use estimated age when the exact date is unknown."
                label="Date of Birth"
              >
                <input
                  aria-invalid={
                    errors.dateOfBirth !==
                    undefined
                  }
                  className={
                    INPUT_CLASS_NAME
                  }
                  onChange={(
                    event,
                  ) => {
                    updateField(
                      "dateOfBirth",
                      event.target
                        .value,
                    );

                    if (
                      event.target
                        .value !== ""
                    ) {
                      updateField(
                        "estimatedAge",
                        "",
                      );
                    }
                  }}
                  type="date"
                  value={
                    draft.dateOfBirth
                  }
                />
              </Field>

              <Field
                error={
                  errors.estimatedAge
                }
                helperText="Use only when the date of birth is unknown."
                label="Estimated Age"
              >
                <input
                  aria-invalid={
                    errors.estimatedAge !==
                    undefined
                  }
                  className={
                    INPUT_CLASS_NAME
                  }
                  inputMode="numeric"
                  max="130"
                  min="0"
                  onChange={(
                    event,
                  ) => {
                    updateField(
                      "estimatedAge",
                      event.target
                        .value,
                    );

                    if (
                      event.target
                        .value !== ""
                    ) {
                      updateField(
                        "dateOfBirth",
                        "",
                      );
                    }
                  }}
                  placeholder="Years"
                  type="number"
                  value={
                    draft.estimatedAge
                  }
                />
              </Field>

              <Field label="Blood Group">
                <select
                  className={
                    INPUT_CLASS_NAME
                  }
                  onChange={(
                    event,
                  ) => {
                    updateField(
                      "bloodGroup",
                      event.target
                        .value,
                    );
                  }}
                  value={
                    draft.bloodGroup
                  }
                >
                  <option value="">
                    Not recorded
                  </option>

                  {[
                    "A+",
                    "A-",
                    "B+",
                    "B-",
                    "AB+",
                    "AB-",
                    "O+",
                    "O-",
                  ].map(
                    (bloodGroup) => (
                      <option
                        key={
                          bloodGroup
                        }
                        value={
                          bloodGroup
                        }
                      >
                        {bloodGroup}
                      </option>
                    ),
                  )}
                </select>
              </Field>
            </div>
          </WonFlowOperationalPanel>

          <WonFlowOperationalPanel
            description="Contact, location and communication preferences."
            icon={<ContactIcon />}
            title="Contact Information"
            tone="violet"
          >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Field
                error={
                  errors.mobileNumber
                }
                label="Mobile Number"
                required
              >
                <input
                  aria-invalid={
                    errors.mobileNumber !==
                    undefined
                  }
                  autoComplete="tel"
                  className={
                    INPUT_CLASS_NAME
                  }
                  inputMode="tel"
                  onChange={(
                    event,
                  ) => {
                    updateField(
                      "mobileNumber",
                      event.target
                        .value,
                    );
                  }}
                  placeholder="+92 300 0000000"
                  value={
                    draft.mobileNumber
                  }
                />
              </Field>

              <Field
                error={
                  errors
                    .alternateMobileNumber
                }
                label="Alternate Mobile"
              >
                <input
                  aria-invalid={
                    errors
                      .alternateMobileNumber !==
                    undefined
                  }
                  className={
                    INPUT_CLASS_NAME
                  }
                  inputMode="tel"
                  onChange={(
                    event,
                  ) => {
                    updateField(
                      "alternateMobileNumber",
                      event.target
                        .value,
                    );
                  }}
                  placeholder="Optional"
                  value={
                    draft
                      .alternateMobileNumber
                  }
                />
              </Field>

              <Field
                error={
                  errors.emailAddress
                }
                label="Email Address"
              >
                <input
                  aria-invalid={
                    errors.emailAddress !==
                    undefined
                  }
                  autoComplete="email"
                  className={
                    INPUT_CLASS_NAME
                  }
                  onChange={(
                    event,
                  ) => {
                    updateField(
                      "emailAddress",
                      event.target
                        .value,
                    );
                  }}
                  placeholder="Optional"
                  type="email"
                  value={
                    draft.emailAddress
                  }
                />
              </Field>

              <Field label="City">
                <input
                  autoComplete="address-level2"
                  className={
                    INPUT_CLASS_NAME
                  }
                  onChange={(
                    event,
                  ) => {
                    updateField(
                      "city",
                      event.target
                        .value,
                    );
                  }}
                  value={draft.city}
                />
              </Field>

              <Field
                label="Preferred Language"
              >
                <select
                  className={
                    INPUT_CLASS_NAME
                  }
                  onChange={(
                    event,
                  ) => {
                    updateField(
                      "preferredLanguage",
                      event.target
                        .value as
                        PatientRegistrationDraft["preferredLanguage"],
                    );
                  }}
                  value={
                    draft
                      .preferredLanguage
                  }
                >
                  <option value="en">
                    English
                  </option>

                  <option value="ur">
                    Urdu
                  </option>
                </select>
              </Field>

              <Field
                label="Patient Category"
              >
                <select
                  className={
                    INPUT_CLASS_NAME
                  }
                  onChange={(
                    event,
                  ) => {
                    updateField(
                      "patientCategory",
                      event.target
                        .value as
                        PatientRegistrationDraft["patientCategory"],
                    );
                  }}
                  value={
                    draft
                      .patientCategory
                  }
                >
                  <option value="self-pay">
                    Self Pay
                  </option>

                  <option value="insurance">
                    Insurance
                  </option>

                  <option value="corporate">
                    Corporate
                  </option>

                  <option value="government">
                    Government
                  </option>

                  <option value="charity">
                    Charity
                  </option>
                </select>
              </Field>

              <div className="sm:col-span-2 xl:col-span-3">
                <Field label="Address">
                  <textarea
                    autoComplete="street-address"
                    className={
                      TEXTAREA_CLASS_NAME
                    }
                    onChange={(
                      event,
                    ) => {
                      updateField(
                        "addressLine",
                        event.target
                          .value,
                      );
                    }}
                    placeholder="House, street, area and additional directions"
                    value={
                      draft.addressLine
                    }
                  />
                </Field>
              </div>
            </div>
          </WonFlowOperationalPanel>

          <WonFlowOperationalPanel
            description="Emergency contact and additional registration information."
            icon={<EmergencyIcon />}
            title="Emergency and Administrative Information"
            tone="amber"
          >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Field
                label="Emergency Contact Name"
              >
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  onChange={(
                    event,
                  ) => {
                    updateField(
                      "emergencyContactName",
                      event.target
                        .value,
                    );
                  }}
                  placeholder="Contact person"
                  value={
                    draft
                      .emergencyContactName
                  }
                />
              </Field>

              <Field label="Relationship">
                <select
                  className={
                    INPUT_CLASS_NAME
                  }
                  onChange={(
                    event,
                  ) => {
                    updateField(
                      "emergencyContactRelation",
                      event.target
                        .value,
                    );
                  }}
                  value={
                    draft
                      .emergencyContactRelation
                  }
                >
                  <option value="">
                    Select relationship
                  </option>

                  {[
                    "Parent",
                    "Spouse",
                    "Sibling",
                    "Child",
                    "Relative",
                    "Friend",
                    "Guardian",
                    "Other",
                  ].map(
                    (relation) => (
                      <option
                        key={relation}
                        value={relation}
                      >
                        {relation}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field
                error={
                  errors
                    .emergencyContactPhone
                }
                label="Emergency Phone"
              >
                <input
                  aria-invalid={
                    errors
                      .emergencyContactPhone !==
                    undefined
                  }
                  className={
                    INPUT_CLASS_NAME
                  }
                  inputMode="tel"
                  onChange={(
                    event,
                  ) => {
                    updateField(
                      "emergencyContactPhone",
                      event.target
                        .value,
                    );
                  }}
                  placeholder="Optional"
                  value={
                    draft
                      .emergencyContactPhone
                  }
                />
              </Field>

              <Field
                label="Referral Source"
              >
                <select
                  className={
                    INPUT_CLASS_NAME
                  }
                  onChange={(
                    event,
                  ) => {
                    updateField(
                      "referralSource",
                      event.target
                        .value,
                    );
                  }}
                  value={
                    draft
                      .referralSource
                  }
                >
                  <option value="walk-in">
                    Walk-in
                  </option>

                  <option value="doctor-referral">
                    Doctor Referral
                  </option>

                  <option value="hospital-referral">
                    Hospital Referral
                  </option>

                  <option value="online-booking">
                    Online Booking
                  </option>

                  <option value="emergency">
                    Emergency
                  </option>

                  <option value="corporate">
                    Corporate
                  </option>
                </select>
              </Field>

              <div className="sm:col-span-2">
                <Field label="Registration Notes">
                  <textarea
                    className={
                      TEXTAREA_CLASS_NAME
                    }
                    onChange={(
                      event,
                    ) => {
                      updateField(
                        "notes",
                        event.target
                          .value,
                      );
                    }}
                    placeholder="Optional administrative notes"
                    value={draft.notes}
                  />
                </Field>
              </div>
            </div>

            <label className="mt-5 flex items-start gap-3 rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100">
              <input
                checked={
                  draft
                    .consentToContact
                }
                className="mt-1 h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                onChange={(
                  event,
                ) => {
                  updateField(
                    "consentToContact",
                    event.target
                      .checked,
                  );
                }}
                type="checkbox"
              />

              <span>
                <span className="block text-sm font-bold text-blue-900">
                  Patient contact permission recorded
                </span>

                <span className="mt-1 block text-xs leading-5 text-blue-700">
                  The hospital may use the provided contact details for appointments and service communication.
                </span>
              </span>
            </label>
          </WonFlowOperationalPanel>
        </div>

        <aside className="wf-workflow-aside">
          <section className="overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-sm">
            <div className="bg-gradient-to-r from-blue-600 to-violet-600 p-5 text-white">
              <div className="text-xs font-extrabold uppercase tracking-[0.15em] text-blue-100">
                Registration Summary
              </div>

              <div className="mt-2 text-xl font-black">
                {displayName === ""
                  ? "New Patient"
                  : displayName}
              </div>

              <div className="mt-1 text-xs text-indigo-100">
                MR number will be generated after save.
              </div>
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>
                  Essential information
                </span>

                <span className="text-indigo-700">
                  {completionPercentage}%
                </span>
              </div>

              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
                  style={{
                    width:
                      `${completionPercentage}%`,
                  }}
                />
              </div>

              <dl className="mt-5 space-y-4">
                <SummaryItem
                  label="Branch"
                  value={
                    selectedBranch
                      ?.name ??
                    "Not selected"
                  }
                />

                <SummaryItem
                  label="Father / Guardian"
                  value={
                    draft.fatherName ||
                    "Not entered"
                  }
                />

                <SummaryItem
                  label="CNIC / B-Form"
                  value={
                    draft.cnicNumber ||
                    "Not entered"
                  }
                />

                <SummaryItem
                  label="Gender"
                  value={
                    draft.gender ===
                    "unknown"
                      ? "Not selected"
                      : draft.gender
                  }
                />

                <SummaryItem
                  label="Age"
                  value={
                    displayedAge ===
                    undefined
                      ? "Not entered"
                      : `${displayedAge} years`
                  }
                />

                <SummaryItem
                  label="Mobile"
                  value={
                    draft
                      .mobileNumber ||
                    "Not entered"
                  }
                />

                <SummaryItem
                  label="Category"
                  value={
                    draft
                      .patientCategory
                      .replaceAll(
                        "-",
                        " ",
                      )
                  }
                />
              </dl>

              <div className="mt-6 rounded-2xl bg-amber-50 p-3.5 text-xs leading-5 text-amber-800 ring-1 ring-amber-100">
                Save the patient identity first. Billing, appointments and hospital services remain separate workflows.
              </div>

              <WonFlowActionButton
                className="mt-5 w-full"
                form="patient-registration-form"
                type="submit"
                variant="primary"
              >
                Save Patient
              </WonFlowActionButton>

              <Link
                className="mt-3 flex min-h-10 items-center justify-center rounded-xl text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                href="/operations"
              >
                Cancel Registration
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </form>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </dt>

      <dd className="mt-1 break-words text-sm font-bold capitalize text-slate-800">
        {value}
      </dd>
    </div>
  );
}

export function PatientRegistrationWorkflow() {
  const hospitalService =
    useWonFlowHospitalService();

  const branches =
    useWonFlowAsyncData({
      key:
        "patient-registration:branches",

      loader: (signal) =>
        hospitalService
          .listBranches(
            signal,
          ),

      isEmpty: (items) =>
        items.length === 0,
    });

  return (
    <div className="space-y-6">
      <WonFlowPageHeader
        breadcrumbs={[
          {
            label:
              "Hospital Operations",
            href: "/operations",
          },
          {
            label:
              "Patients",
          },
          {
            label:
              "Register Patient",
          },
        ]}
        description="Fast hospital-counter registration with essential identity, CNIC, contact and emergency information."
        eyebrow="Patient Management"
        leading={<PatientIcon />}
        metadata={
          <>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 font-bold text-blue-700 ring-1 ring-blue-100">
              Staff registration workflow
            </span>

            <span>
              Press Enter to move forward
            </span>
          </>
        }
        title="Register New Patient"
      />

      <div className="rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 via-white to-blue-50 px-4 py-3 text-xs leading-5 text-slate-600">
        <strong className="text-violet-800">
          Demonstration mode:
        </strong>
        {" "}
        Newly registered patients are fictional and stored locally in this browser during the frontend stage.
      </div>

      <WonFlowAsyncDataBoundary
        emptyDescription="No hospital branches are available for patient registration."
        emptyTitle="No branches available"
        loadingDescription="WonFlow is preparing the registration branch directory."
        loadingTitle="Preparing patient registration"
        onRetry={branches.reload}
        state={branches}
      >
        {(branchRecords) =>
          branchRecords.length ===
          0 ? (
            <WonFlowErrorState
              description="At least one hospital branch is required before a patient can be registered."
              title="Registration unavailable"
            />
          ) : (
            <PatientRegistrationForm
              branches={
                branchRecords
              }
            />
          )
        }
      </WonFlowAsyncDataBoundary>
    </div>
  );
}
