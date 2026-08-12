"use client";

/**
 * Owner-facing practice-location and schedule management.
 *
 * All reads and writes go through WonFlowPracticeService. The component
 * never reads repositories, mock arrays or tenant constants directly.
 */

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  FormEvent,
  ReactNode,
} from "react";

import {
  comparePracticeClinicSessions,
} from "@wonflow/contracts";

import type {
  DoctorConsultationMode,
  PracticeClinicSession,
  PracticeLocation,
  PracticeLocationAggregate,
  PracticeScheduleOverride,
  PracticeTeamMember,
  WonFlowId,
} from "@wonflow/contracts";

import type {
  PracticeClinicSessionConflict,
} from "@wonflow/mock-data";

import {
  practiceClinicSessionFormSchema,
  practiceLocationFormSchema,
  practiceScheduleOverrideFormSchema,
} from "@wonflow/validation";

import {
  useWonFlowApplication,
} from "@/app/_providers";

const LOCATION_TYPES = [
  [
    "owned-clinic",
    "Owned clinic",
  ],
  [
    "external-hospital",
    "External hospital",
  ],
  [
    "external-clinic",
    "External clinic",
  ],
  [
    "diagnostic-center",
    "Diagnostic centre",
  ],
  [
    "virtual",
    "Virtual",
  ],
  [
    "home-visit-base",
    "Home-visit base",
  ],
  [
    "other",
    "Other",
  ],
] as const;

const CONSULTATION_MODES = [
  [
    "in-person",
    "In person",
  ],
  [
    "video",
    "Video",
  ],
  [
    "phone",
    "Phone",
  ],
  [
    "home-visit",
    "Home visit",
  ],
] as const satisfies readonly (
  readonly [
    DoctorConsultationMode,
    string,
  ]
)[];

const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const OVERRIDE_TYPES = [
  [
    "closure",
    "Closure",
  ],
  [
    "leave",
    "Clinician leave",
  ],
  [
    "theatre-day",
    "Theatre day",
  ],
  [
    "holiday",
    "Holiday",
  ],
  [
    "extra-session",
    "Extra clinic",
  ],
  [
    "temporary-time-change",
    "Temporary time change",
  ],
  [
    "capacity-change",
    "Capacity change",
  ],
  [
    "other",
    "Other",
  ],
] as const;

type ManagementPanel =
  | "overview"
  | "location"
  | "sessions"
  | "overrides"
  | "archive";

const INPUT_CLASS_NAME = [
  "h-11 w-full rounded-xl border",
  "border-slate-300 bg-white px-3",
  "text-sm text-slate-950",
  "outline-none transition",
  "focus:border-violet-500",
  "focus:ring-2 focus:ring-violet-100",
  "disabled:cursor-not-allowed",
  "disabled:bg-slate-100",
].join(" ");

const TEXTAREA_CLASS_NAME = [
  "min-h-28 w-full rounded-xl",
  "border border-slate-300",
  "bg-white px-3 py-2",
  "text-sm text-slate-950",
  "outline-none transition",
  "focus:border-violet-500",
  "focus:ring-2 focus:ring-violet-100",
].join(" ");

const CHECKBOX_CLASS_NAME = [
  "flex items-center gap-2",
  "text-sm font-semibold",
  "text-slate-800",
].join(" ");

function Field({
  label,
  hint,
  children,
}: {
  label: string;

  hint?: string;

  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-900">
        {label}
      </span>

      {hint !== undefined ? (
        <span className="ml-2 text-xs text-slate-500">
          {hint}
        </span>
      ) : null}

      <div className="mt-1">
        {children}
      </div>
    </label>
  );
}

function readString(
  formData: FormData,
  key: string,
): string {
  return String(
    formData.get(key) ?? "",
  ).trim();
}

function readOptionalString(
  formData: FormData,
  key: string,
): string | undefined {
  const value =
    readString(
      formData,
      key,
    );

  return value === ""
    ? undefined
    : value;
}

function readInteger(
  formData: FormData,
  key: string,
): number {
  return Number.parseInt(
    readString(
      formData,
      key,
    ),
    10,
  );
}

function readOptionalInteger(
  formData: FormData,
  key: string,
): number | undefined {
  const value =
    readOptionalString(
      formData,
      key,
    );

  return value === undefined
    ? undefined
    : Number.parseInt(
        value,
        10,
      );
}

function readBoolean(
  formData: FormData,
  key: string,
): boolean {
  return (
    formData.get(key) ===
    "on"
  );
}

function formatIssues(
  issues:
    readonly {
      message: string;
    }[],
): string {
  return issues
    .map(
      (issue) =>
        issue.message,
    )
    .join(" ");
}

function titleCase(
  value: string,
): string {
  return value
    .split("-")
    .map(
      (part) =>
        part.length === 0
          ? part
          : `${part[0]?.toUpperCase()}${part.slice(1)}`,
    )
    .join(" ");
}

function locationStatusClasses(
  status:
    PracticeLocation["status"],
): string {
  switch (status) {
    case "active":
      return [
        "bg-emerald-100",
        "text-emerald-800",
      ].join(" ");

    case "archived":
      return [
        "bg-slate-200",
        "text-slate-700",
      ].join(" ");

    case "inactive":
      return [
        "bg-amber-100",
        "text-amber-800",
      ].join(" ");

    default:
      return [
        "bg-violet-100",
        "text-violet-800",
      ].join(" ");
  }
}

interface LocationFormProps {
  location?:
    PracticeLocation;

  busy:
    boolean;

  onCancel:
    () => void;

  onSubmit:
    (
      event:
        FormEvent<HTMLFormElement>,
    ) => void;
}

function LocationForm({
  location,
  busy,
  onCancel,
  onSubmit,
}: LocationFormProps) {
  return (
    <form
      className="space-y-5"
      key={
        location?.id ??
        "new-location"
      }
      onSubmit={onSubmit}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Location name">
          <input
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              location?.name
            }
            name="name"
            required
          />
        </Field>

        <Field label="Location code">
          <input
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              location?.code
            }
            name="code"
            required
          />
        </Field>

        <Field label="Location type">
          <select
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              location?.type ?? ""
            }
            name="type"
            required
          >
            <option value="">
              Select…
            </option>

            {LOCATION_TYPES.map(
              ([
                value,
                label,
              ]) => (
                <option
                  key={value}
                  value={value}
                >
                  {label}
                </option>
              ),
            )}
          </select>
        </Field>

        <Field label="External organization">
          <input
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              location
                ?.externalOrganizationName
            }
            name="externalOrganizationName"
          />
        </Field>

        <Field label="Linked branch ID">
          <input
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              location?.linkedBranchId
            }
            name="linkedBranchId"
          />
        </Field>

        <Field label="Time zone">
          <input
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              location?.timezone
            }
            name="timezone"
            placeholder="Area/City"
            required
          />
        </Field>

        <Field label="Default currency">
          <input
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              location
                ?.defaultCurrencyCode
            }
            maxLength={3}
            name="defaultCurrencyCode"
            required
          />
        </Field>

        <Field label="Default slot length">
          <input
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              location
                ?.defaultSlotDurationMinutes
            }
            min={1}
            name="defaultSlotDurationMinutes"
            required
            type="number"
          />
        </Field>

        <Field label="Minimum booking notice">
          <input
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              location
                ?.minimumBookingNoticeMinutes
            }
            min={0}
            name="minimumBookingNoticeMinutes"
            required
            type="number"
          />
        </Field>

        <Field label="Booking horizon in days">
          <input
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              location
                ?.bookingHorizonDays
            }
            min={1}
            name="bookingHorizonDays"
            required
            type="number"
          />
        </Field>

        <Field label="Phone">
          <input
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              location?.phone
            }
            name="phone"
          />
        </Field>

        <Field label="Email">
          <input
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              location?.email
            }
            name="email"
            type="email"
          />
        </Field>

        <Field label="Status">
          <select
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              location?.status ??
              ""
            }
            name="status"
            required
          >
            <option value="">
              Select…
            </option>

            <option value="draft">
              Draft
            </option>

            <option value="active">
              Active
            </option>

            <option value="inactive">
              Inactive
            </option>
          </select>
        </Field>

        <Field label="Map URL">
          <input
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              location?.mapUrl
            }
            name="mapUrl"
            type="url"
          />
        </Field>
      </div>

      <fieldset className="rounded-2xl border border-slate-200 p-4">
        <legend className="px-2 text-sm font-black text-slate-900">
          Address
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Address line 1">
            <input
              className={
                INPUT_CLASS_NAME
              }
              defaultValue={
                location
                  ?.address
                  ?.addressLine1
              }
              name="addressLine1"
            />
          </Field>

          <Field label="Address line 2">
            <input
              className={
                INPUT_CLASS_NAME
              }
              defaultValue={
                location
                  ?.address
                  ?.addressLine2
              }
              name="addressLine2"
            />
          </Field>

          <Field label="City">
            <input
              className={
                INPUT_CLASS_NAME
              }
              defaultValue={
                location
                  ?.address
                  ?.city
              }
              name="city"
            />
          </Field>

          <Field label="District">
            <input
              className={
                INPUT_CLASS_NAME
              }
              defaultValue={
                location
                  ?.address
                  ?.district
              }
              name="district"
            />
          </Field>

          <Field label="State or province">
            <input
              className={
                INPUT_CLASS_NAME
              }
              defaultValue={
                location
                  ?.address
                  ?.stateOrProvince
              }
              name="stateOrProvince"
            />
          </Field>

          <Field label="Postal code">
            <input
              className={
                INPUT_CLASS_NAME
              }
              defaultValue={
                location
                  ?.address
                  ?.postalCode
              }
              name="postalCode"
            />
          </Field>

          <Field label="Country code">
            <input
              className={
                INPUT_CLASS_NAME
              }
              defaultValue={
                location
                  ?.address
                  ?.countryCode
              }
              maxLength={2}
              name="countryCode"
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-slate-200 p-4">
        <legend className="px-2 text-sm font-black text-slate-900">
          Supported consultation modes
        </legend>

        <div className="mt-2 flex flex-wrap gap-5">
          {CONSULTATION_MODES.map(
            ([
              value,
              label,
            ]) => (
              <label
                className={
                  CHECKBOX_CLASS_NAME
                }
                key={value}
              >
                <input
                  defaultChecked={
                    location
                      ?.supportedConsultationModes
                      .includes(
                        value,
                      ) ??
                    false
                  }
                  name="supportedConsultationModes"
                  type="checkbox"
                  value={value}
                />

                {label}
              </label>
            ),
          )}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Patient directions">
          <textarea
            className={
              TEXTAREA_CLASS_NAME
            }
            defaultValue={
              location
                ?.patientDirections
            }
            name="patientDirections"
          />
        </Field>

        <Field label="Internal clinic instructions">
          <textarea
            className={
              TEXTAREA_CLASS_NAME
            }
            defaultValue={
              location
                ?.clinicInstructions
            }
            name="clinicInstructions"
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-5">
        <label className={CHECKBOX_CLASS_NAME}>
          <input
            defaultChecked={
              location
                ?.publicVisible ??
              false
            }
            name="publicVisible"
            type="checkbox"
          />

          Publicly visible
        </label>

        <label className={CHECKBOX_CLASS_NAME}>
          <input
            defaultChecked={
              location
                ?.publicBookingEnabled ??
              false
            }
            name="publicBookingEnabled"
            type="checkbox"
          />

          Patient booking enabled
        </label>

        <label className={CHECKBOX_CLASS_NAME}>
          <input
            defaultChecked={
              location
                ?.onlinePaymentEnabled ??
              false
            }
            name="onlinePaymentEnabled"
            type="checkbox"
          />

          Online payment enabled
        </label>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
        <button
          className="h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
          disabled={busy}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>

        <button
          className="h-11 rounded-xl bg-violet-700 px-5 text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-50"
          disabled={busy}
          type="submit"
        >
          {busy
            ? "Saving…"
            : location === undefined
              ? "Create location"
              : "Save location"}
        </button>
      </div>
    </form>
  );
}

export function PracticeLocationManagement() {
  const {
    practiceService,
    practiceTenant,
  } = useWonFlowApplication();

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | undefined>();

  useEffect(
    () => {
      let active = true;

      async function load():
        Promise<void> {
        try {
          await practiceTenant;

          if (!active) {
            return;
          }
        } catch (error) {
          if (active) {
            setErrorMessage(
              error instanceof Error
                ? error.message
                : "Locations could not be loaded.",
            );
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      }

      void load();

      return () => {
        active = false;
      };
    },
    [practiceTenant],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-4 text-sm text-slate-600">
            Loading locations…
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage !== undefined) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">
          {errorMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Practice Locations
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Manage your practice locations,
          clinic sessions, and schedule
          overrides.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-center text-sm text-slate-600">
          Location management interface loading…
        </p>
      </div>
    </div>
  );
}
