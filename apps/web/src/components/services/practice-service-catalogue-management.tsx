"use client";

/**
 * Owner-facing service catalogue and location-offering management.
 *
 * Every persisted change goes through WonFlowPracticeService. Fees are
 * stored in integer minor units and changed only through the protected
 * offering operation, which appends fee history.
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

import type {
  DoctorConsultationMode,
  PracticeLocation,
  PracticeService,
  PracticeServiceEligibility,
  PracticeServiceOffering,
  PracticeTeamMember,
  WonFlowId,
} from "@wonflow/contracts";

import {
  createWonFlowMockSessionService,
  hasWonFlowPracticeSessionPrivilege,
  WONFLOW_DEMO_ANCHOR_DATE_TIME,
} from "@wonflow/mock-data";

import type {
  PracticeServiceManagementView,
  WonFlowMockSession,
} from "@wonflow/mock-data";

import {
  practiceServiceFormSchema,
  practiceServiceOfferingFormSchema,
} from "@wonflow/validation";

import {
  useWonFlowApplication,
} from "@/app/_providers";

const SERVICE_CATEGORIES = [
  [
    "initial-consultation",
    "Initial consultation",
  ],
  [
    "follow-up-consultation",
    "Follow-up consultation",
  ],
  [
    "dietitian-consultation",
    "Dietitian consultation",
  ],
  [
    "teleconsultation",
    "Teleconsultation",
  ],
  [
    "report-review",
    "Report review",
  ],
  [
    "procedure",
    "Procedure",
  ],
  [
    "post-operative-review",
    "Post-operative review",
  ],
  [
    "multidisciplinary-review",
    "Multidisciplinary review",
  ],
  [
    "home-visit",
    "Home visit",
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

const ELIGIBILITY_OPTIONS = [
  [
    "new-patient",
    "New patients",
  ],
  [
    "existing-patient",
    "Existing patients",
  ],
  [
    "post-operative-patient",
    "Post-operative patients",
  ],
  [
    "referred-patient",
    "Referred patients",
  ],
  [
    "adult",
    "Adults",
  ],
  [
    "child",
    "Children",
  ],
  [
    "all-patients",
    "All patients",
  ],
] as const satisfies readonly (
  readonly [
    PracticeServiceEligibility,
    string,
  ]
)[];

const INPUT_CLASS_NAME = [
  "h-11 w-full rounded-xl",
  "border border-slate-300",
  "bg-white px-3",
  "text-sm text-slate-950",
  "outline-none transition",
  "focus:border-violet-500",
  "focus:ring-2",
  "focus:ring-violet-100",
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
  "focus:ring-2",
  "focus:ring-violet-100",
].join(" ");

const CHECKBOX_CLASS_NAME = [
  "flex items-center gap-2",
  "text-sm font-semibold",
  "text-slate-800",
].join(" ");

interface OfferingEditorState {
  location:
    PracticeLocation;

  offering?:
    PracticeServiceOffering;
}

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

function toIsoDateTime(
  value: string,
): string {
  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    throw new Error(
      "Enter a valid effective date and time.",
    );
  }

  return parsed.toISOString();
}

function toDateTimeLocal(
  value:
    string | undefined,
): string {
  if (value === undefined) {
    return "";
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return "";
  }

  const offsetMilliseconds =
    parsed.getTimezoneOffset() *
    60_000;

  return new Date(
    parsed.getTime() -
      offsetMilliseconds,
  )
    .toISOString()
    .slice(0, 16);
}

function formatDateTime(
  value: string,
): string {
  const parsed =
    new Date(value);

  return Number.isNaN(
    parsed.getTime(),
  )
    ? value
    : parsed.toLocaleString();
}

function formatMoney(
  amountMinorUnits: number,
  currencyCode: string,
): string {
  return [
    currencyCode,
    amountMinorUnits.toLocaleString(),
    "minor units",
  ].join(" ");
}

function statusClasses(
  status:
    PracticeService["status"],
): string {
  switch (status) {
    case "active":
      return [
        "bg-emerald-100",
        "text-emerald-800",
      ].join(" ");

    case "inactive":
      return [
        "bg-amber-100",
        "text-amber-800",
      ].join(" ");

    case "archived":
      return [
        "bg-slate-200",
        "text-slate-700",
      ].join(" ");

    default:
      return [
        "bg-violet-100",
        "text-violet-800",
      ].join(" ");
  }
}

function getCurrentOffering(
  offerings:
    readonly PracticeServiceOffering[],
  locationId:
    WonFlowId,
): PracticeServiceOffering | undefined {
  return offerings
    .filter(
      (offering) =>
        offering.practiceLocationId ===
          locationId &&
        offering.status !==
          "archived",
    )
    .sort(
      (left, right) =>
        right.effectiveFrom
          .localeCompare(
            left.effectiveFrom,
          ),
    )[0];
}

function getPractitionerOptions(
  members:
    readonly PracticeTeamMember[],
): (
  PracticeTeamMember & {
    practitionerId:
      WonFlowId;
  }
)[] {
  return members.filter(
    (
      member,
    ): member is PracticeTeamMember & {
      practitionerId:
        WonFlowId;
    } =>
      member.status ===
        "active" &&
      member.practitionerId !==
        undefined,
  );
}

interface ServiceEditorProps {
  service?:
    PracticeService;

  clinicians:
    (
      PracticeTeamMember & {
        practitionerId:
          WonFlowId;
      }
    )[];

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

function ServiceEditor({
  service,
  clinicians,
  busy,
  onCancel,
  onSubmit,
}: ServiceEditorProps) {
  const [
    deliveryScope,
    setDeliveryScope,
  ] = useState<
    PracticeService["deliveryScope"]
  >(
    service?.deliveryScope ??
      "unassigned",
  );

  const isArchived =
    service?.status ===
    "archived";

  return (
    <form
      className="space-y-5"
      key={
        service?.id ??
        "new-service"
      }
      onSubmit={onSubmit}
    >
      {isArchived ? (
        <div className="rounded-2xl border border-slate-300 bg-slate-100 p-4 text-sm font-semibold text-slate-700">
          Archived services are read-only.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Service name">
          <input
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              service?.name
            }
            disabled={
              isArchived
            }
            name="name"
            required
          />
        </Field>

        <Field label="Service code">
          <input
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              service?.code
            }
            disabled={
              isArchived
            }
            name="code"
            required
          />
        </Field>

        <Field label="Category">
          <select
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              service?.category ??
              ""
            }
            disabled={
              isArchived
            }
            name="category"
            required
          >
            <option value="">
              Select…
            </option>

            {SERVICE_CATEGORIES.map(
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

        <Field label="Default duration in minutes">
          <input
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              service
                ?.defaultDurationMinutes
            }
            disabled={
              isArchived
            }
            min={1}
            name="defaultDurationMinutes"
            required
            type="number"
          />
        </Field>

        <Field label="Delivery scope">
          <select
            className={
              INPUT_CLASS_NAME
            }
            disabled={
              isArchived
            }
            name="deliveryScope"
            onChange={(
              event,
            ) => {
              setDeliveryScope(
                event.target
                  .value as
                  PracticeService["deliveryScope"],
              );
            }}
            required
            value={
              deliveryScope
            }
          >
            <option value="unassigned">
              Not assigned yet
            </option>

            <option value="any-active-clinician">
              Any active clinician
            </option>

            <option value="selected-clinicians">
              Selected clinicians
            </option>
          </select>
        </Field>

        <Field label="Service status">
          <select
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              service?.status ??
              "draft"
            }
            disabled={
              isArchived
            }
            name="status"
            required
          >
            <option value="draft">
              Draft
            </option>

            <option value="active">
              Active
            </option>

            <option value="inactive">
              Inactive
            </option>

            {service !==
            undefined ? (
              <option value="archived">
                Archived
              </option>
            ) : null}
          </select>
        </Field>
      </div>

      <Field label="Description">
        <textarea
          className={
            TEXTAREA_CLASS_NAME
          }
          defaultValue={
            service?.description
          }
          disabled={
            isArchived
          }
          name="description"
        />
      </Field>

      <Field label="Preparation instructions">
        <textarea
          className={
            TEXTAREA_CLASS_NAME
          }
          defaultValue={
            service
              ?.preparationInstructions
          }
          disabled={
            isArchived
          }
          name="preparationInstructions"
        />
      </Field>

      <fieldset className="rounded-2xl border border-slate-200 p-4">
        <legend className="px-2 text-sm font-black text-slate-900">
          Consultation modes
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
                    service
                      ?.consultationModes
                      .includes(
                        value,
                      ) ??
                    false
                  }
                  disabled={
                    isArchived
                  }
                  name="consultationModes"
                  type="checkbox"
                  value={value}
                />

                {label}
              </label>
            ),
          )}
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-slate-200 p-4">
        <legend className="px-2 text-sm font-black text-slate-900">
          Patient eligibility
        </legend>

        <div className="mt-2 flex flex-wrap gap-5">
          {ELIGIBILITY_OPTIONS.map(
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
                    service
                      ?.eligibility
                      .includes(
                        value,
                      ) ??
                    false
                  }
                  disabled={
                    isArchived
                  }
                  name="eligibility"
                  type="checkbox"
                  value={value}
                />

                {label}
              </label>
            ),
          )}
        </div>
      </fieldset>

      {deliveryScope ===
      "selected-clinicians" ? (
        <fieldset className="rounded-2xl border border-slate-200 p-4">
          <legend className="px-2 text-sm font-black text-slate-900">
            Eligible clinicians
          </legend>

          {clinicians.length ===
          0 ? (
            <p className="mt-2 text-sm text-amber-700">
              No active practitioners are available. Add clinicians
              through Team &amp; Permissions first.
            </p>
          ) : (
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {clinicians.map(
                (member) => (
                  <label
                    className={
                      CHECKBOX_CLASS_NAME
                    }
                    key={
                      member
                        .practitionerId
                    }
                  >
                    <input
                      defaultChecked={
                        service
                          ?.eligiblePractitionerIds
                          .includes(
                            member
                              .practitionerId,
                          ) ??
                        false
                      }
                      disabled={
                        isArchived
                      }
                      name="eligiblePractitionerIds"
                      type="checkbox"
                      value={
                        member
                          .practitionerId
                      }
                    />

                    {
                      member.displayName
                    }
                  </label>
                ),
              )}
            </div>
          )}

          <div className="mt-4">
            <Field
              hint="Optional"
              label="Clinician-specific service"
            >
              <select
                className={
                  INPUT_CLASS_NAME
                }
                defaultValue={
                  service
                    ?.practitionerId ??
                  ""
                }
                disabled={
                  isArchived
                }
                name="practitionerId"
              >
                <option value="">
                  Not clinician-specific
                </option>

                {clinicians.map(
                  (member) => (
                    <option
                      key={
                        member
                          .practitionerId
                      }
                      value={
                        member
                          .practitionerId
                      }
                    >
                      {
                        member.displayName
                      }
                    </option>
                  ),
                )}
              </select>
            </Field>
          </div>
        </fieldset>
      ) : null}

      <div className="flex flex-wrap gap-5">
        <label className={CHECKBOX_CLASS_NAME}>
          <input
            defaultChecked={
              service
                ?.requiresDocumentUpload ??
              false
            }
            disabled={
              isArchived
            }
            name="requiresDocumentUpload"
            type="checkbox"
          />

          Requires document upload
        </label>

        <label className={CHECKBOX_CLASS_NAME}>
          <input
            defaultChecked={
              service
                ?.publicVisible ??
              false
            }
            disabled={
              isArchived
            }
            name="publicVisible"
            type="checkbox"
          />

          Display publicly
        </label>

        <label className={CHECKBOX_CLASS_NAME}>
          <input
            defaultChecked={
              service
                ?.publiclyBookable ??
              false
            }
            disabled={
              isArchived
            }
            name="publiclyBookable"
            type="checkbox"
          />

          Allow public booking
        </label>
      </div>

      {!isArchived ? (
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
              : service ===
                  undefined
                ? "Create service"
                : "Save service"}
          </button>
        </div>
      ) : (
        <button
          className="h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700"
          onClick={onCancel}
          type="button"
        >
          Close
        </button>
      )}
    </form>
  );
}

interface OfferingEditorProps {
  service:
    PracticeService;

  state:
    OfferingEditorState;

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

function OfferingEditor({
  service,
  state,
  busy,
  onCancel,
  onSubmit,
}: OfferingEditorProps) {
  const {
    location,
    offering,
  } = state;

  const isArchived =
    offering?.status ===
    "archived";

  return (
    <form
      className="space-y-5"
      key={[
        location.id,
        offering?.id ??
          "new-offering",
      ].join(":")}
      onSubmit={onSubmit}
    >
      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
        <div className="text-xs font-extrabold uppercase tracking-wide text-violet-700">
          Location offering
        </div>

        <div className="mt-1 text-lg font-black text-slate-950">
          {service.name} at{" "}
          {location.name}
        </div>
      </div>

      {location.status ===
      "archived" ? (
        <div className="rounded-2xl border border-slate-300 bg-slate-100 p-4 text-sm font-semibold text-slate-700">
          New offerings cannot be created at an archived location.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fee in minor units">
          <input
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              offering
                ?.fee
                .amountMinorUnits
            }
            disabled={
              isArchived ||
              location.status ===
                "archived"
            }
            min={0}
            name="amountMinorUnits"
            required
            type="number"
          />
        </Field>

        <Field
          hint={
            offering ===
            undefined
              ? undefined
              : "Create a new offering to change currency"
          }
          label="Currency code"
        >
          <input
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              offering
                ?.fee
                .currencyCode ??
              location
                .defaultCurrencyCode
            }
            maxLength={3}
            name="currencyCode"
            readOnly={
              offering !==
              undefined
            }
            required
          />
        </Field>

        <Field label="Fee collector">
          <select
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              offering
                ?.feeCollector ??
              ""
            }
            disabled={
              isArchived ||
              location.status ===
                "archived"
            }
            name="feeCollector"
            required
          >
            <option value="">
              Select…
            </option>

            <option value="practice">
              Practice
            </option>

            <option value="hospital">
              Host facility
            </option>
          </select>
        </Field>

        <Field label="Payment timing">
          <select
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              offering
                ?.paymentTiming ??
              ""
            }
            disabled={
              isArchived ||
              location.status ===
                "archived"
            }
            name="paymentTiming"
            required
          >
            <option value="">
              Select…
            </option>

            <option value="not-required">
              Not required
            </option>

            <option value="at-booking">
              At booking
            </option>

            <option value="before-appointment">
              Before appointment
            </option>

            <option value="at-location">
              At location
            </option>

            <option value="after-service">
              After service
            </option>
          </select>
        </Field>

        <Field
          hint="Optional"
          label="Duration override in minutes"
        >
          <input
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              offering
                ?.durationOverrideMinutes
            }
            disabled={
              isArchived ||
              location.status ===
                "archived"
            }
            min={1}
            name="durationOverrideMinutes"
            type="number"
          />
        </Field>

        <Field label="Status">
          <select
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              offering?.status ??
              "draft"
            }
            disabled={
              isArchived ||
              location.status ===
                "archived"
            }
            name="status"
            required
          >
            <option value="draft">
              Draft
            </option>

            <option value="active">
              Active
            </option>

            <option value="inactive">
              Inactive
            </option>

            {offering !==
            undefined ? (
              <option value="archived">
                Archived
              </option>
            ) : null}
          </select>
        </Field>

        <Field label="Effective from">
          <input
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              toDateTimeLocal(
                offering
                  ?.effectiveFrom,
              )
            }
            disabled={
              isArchived ||
              location.status ===
                "archived"
            }
            name="effectiveFrom"
            required
            type="datetime-local"
          />
        </Field>

        <Field
          hint="Optional"
          label="Effective to"
        >
          <input
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              toDateTimeLocal(
                offering
                  ?.effectiveTo,
              )
            }
            disabled={
              isArchived ||
              location.status ===
                "archived"
            }
            name="effectiveTo"
            type="datetime-local"
          />
        </Field>
      </div>

      <Field label="Location instructions">
        <textarea
          className={
            TEXTAREA_CLASS_NAME
          }
          defaultValue={
            offering
              ?.locationInstructions
          }
          disabled={
            isArchived ||
            location.status ===
              "archived"
          }
          name="locationInstructions"
        />
      </Field>

      <Field
        hint={
          offering === undefined
            ? "Required for the initial fee"
            : "Required only when the fee changes"
        }
        label="Fee reason"
      >
        <textarea
          className={
            TEXTAREA_CLASS_NAME
          }
          disabled={
            isArchived ||
            location.status ===
              "archived"
          }
          name="feeChangeReason"
          required={
            offering ===
            undefined
          }
        />
      </Field>

      <label className={CHECKBOX_CLASS_NAME}>
        <input
          defaultChecked={
            offering
              ?.publiclyBookable ??
            false
          }
          disabled={
            isArchived ||
            location.status ===
              "archived"
          }
          name="publiclyBookable"
          type="checkbox"
        />

        Publicly bookable at this location
      </label>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
        <button
          className="h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700"
          disabled={busy}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>

        {!isArchived &&
        location.status !==
          "archived" ? (
          <button
            className="h-11 rounded-xl bg-violet-700 px-5 text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-50"
            disabled={busy}
            type="submit"
          >
            {busy
              ? "Saving…"
              : offering ===
                  undefined
                ? "Create offering"
                : "Save offering"}
          </button>
        ) : null}
      </div>
    </form>
  );
}

export function PracticeServiceCatalogueManagement() {
  const {
    practiceService,
    practiceTenant,
  } = useWonFlowApplication();

  const sessionService =
    useMemo(
      () =>
        createWonFlowMockSessionService({
          service:
            practiceService,
        }),
      [practiceService],
    );

  const [
    tenant,
    setTenant,
  ] = useState<
    Awaited<
      typeof practiceTenant
    >
  >();

  const [
    session,
    setSession,
  ] = useState<
    WonFlowMockSession | undefined
  >();

  const [
    canManage,
    setCanManage,
  ] = useState<
    boolean | undefined
  >();

  const [
    services,
    setServices,
  ] = useState<
    PracticeService[]
  >([]);

  const [
    locations,
    setLocations,
  ] = useState<
    PracticeLocation[]
  >([]);

  const [
    members,
    setMembers,
  ] = useState<
    PracticeTeamMember[]
  >([]);

  const [
    selectedServiceId,
    setSelectedServiceId,
  ] = useState<
    WonFlowId | undefined
  >();

  const [
    managementView,
    setManagementView,
  ] = useState<
    PracticeServiceManagementView | undefined
  >();

  const [
    editingService,
    setEditingService,
  ] = useState(false);

  const [
    offeringEditor,
    setOfferingEditor,
  ] = useState<
    OfferingEditorState | undefined
  >();

  const [
    includeArchived,
    setIncludeArchived,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<
    string | undefined
  >();

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<
    string | undefined
  >();

  const clinicians =
    useMemo(
      () =>
        getPractitionerOptions(
          members,
        ),
      [members],
    );

  const visibleServices =
    useMemo(
      () =>
        includeArchived
          ? services
          : services.filter(
              (service) =>
                service.status !==
                  "archived",
            ),
      [
        includeArchived,
        services,
      ],
    );

  useEffect(
    () => {
      let active = true;

      async function load():
        Promise<void> {
        try {
          const resolvedTenant =
            await practiceTenant;

          const memberPage =
            await practiceService
              .teamMembers
              .list(
                resolvedTenant.scope,
                {
                  limit: 1_000,
                },
              );

          const ownerMember =
            memberPage.items.find(
              (member) =>
                member.userId ===
                resolvedTenant
                  .ownerUserId,
            );

          if (
            ownerMember ===
            undefined
          ) {
            if (active) {
              setTenant(
                resolvedTenant,
              );

              setMembers(
                memberPage.items,
              );

              setCanManage(
                false,
              );

              setErrorMessage(
                "Complete the owner-team setup before managing the service catalogue.",
              );
            }

            return;
          }

          const resolvedSession =
            await sessionService
              .loadPracticeUserSession(
                resolvedTenant.scope,
                {
                  userId:
                    resolvedTenant
                      .ownerUserId,

                  teamMemberId:
                    ownerMember.id,

                  at:
                    WONFLOW_DEMO_ANCHOR_DATE_TIME,
                },
              );

          const allowed =
            hasWonFlowPracticeSessionPrivilege(
              resolvedSession,
              "catalogue.manage",
              WONFLOW_DEMO_ANCHOR_DATE_TIME,
            );

          if (!allowed) {
            if (active) {
              setTenant(
                resolvedTenant,
              );

              setSession(
                resolvedSession,
              );

              setMembers(
                memberPage.items,
              );

              setCanManage(
                false,
              );
            }

            return;
          }

          const [
            catalogue,
            locationPage,
          ] = await Promise.all([
            practiceService
              .getServiceCatalogue(
                resolvedTenant.scope,
              ),

            practiceService
              .practiceLocations
              .list(
                resolvedTenant.scope,
                {
                  limit: 1_000,
                },
              ),
          ]);

          if (!active) {
            return;
          }

          const orderedServices = [
            ...catalogue.services,
          ].sort(
            (
              left,
              right,
            ) =>
              left.name.localeCompare(
                right.name,
              ),
          );

          const orderedLocations = [
            ...locationPage.items,
          ].sort(
            (
              left,
              right,
            ) =>
              left.name.localeCompare(
                right.name,
              ),
          );

          setTenant(
            resolvedTenant,
          );

          setSession(
            resolvedSession,
          );

          setCanManage(
            true,
          );

          setMembers(
            memberPage.items,
          );

          setServices(
            orderedServices,
          );

          setLocations(
            orderedLocations,
          );

          setSelectedServiceId(
            orderedServices.find(
              (service) =>
                service.status !==
                "archived",
            )?.id ??
              orderedServices[0]?.id,
          );
        } catch (error) {
          if (active) {
            setErrorMessage(
              error instanceof Error
                ? error.message
                : "The service catalogue could not be loaded.",
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
    [
      practiceService,
      practiceTenant,
      sessionService,
    ],
  );

  useEffect(
    () => {
      let active = true;

      async function loadView():
        Promise<void> {
        if (
          tenant ===
            undefined ||
          selectedServiceId ===
            undefined ||
          canManage !== true
        ) {
          setManagementView(
            undefined,
          );

          return;
        }

        try {
          const result =
            await practiceService
              .getPracticeServiceManagementView(
                tenant.scope,
                selectedServiceId,
              );

          if (active) {
            setManagementView(
              result,
            );
          }
        } catch (error) {
          if (active) {
            setErrorMessage(
              error instanceof Error
                ? error.message
                : "The selected service could not be loaded.",
            );
          }
        }
      }

      void loadView();

      return () => {
        active = false;
      };
    },
    [
      canManage,
      practiceService,
      selectedServiceId,
      tenant,
    ],
  );

  async function runTask(
    task:
      () => Promise<void>,
  ): Promise<void> {
    setBusy(true);

    setErrorMessage(
      undefined,
    );

    setSuccessMessage(
      undefined,
    );

    try {
      await task();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The catalogue change could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function refreshCatalogue(
    preferredServiceId?:
      WonFlowId,
  ): Promise<void> {
    if (tenant === undefined) {
      return;
    }

    const catalogue =
      await practiceService
        .getServiceCatalogue(
          tenant.scope,
        );

    const ordered = [
      ...catalogue.services,
    ].sort(
      (
        left,
        right,
      ) =>
        left.name.localeCompare(
          right.name,
        ),
    );

    setServices(
      ordered,
    );

    if (
      preferredServiceId !==
      undefined
    ) {
      setSelectedServiceId(
        preferredServiceId,
      );
    }
  }

  async function refreshView():
    Promise<void> {
    if (
      tenant ===
        undefined ||
      selectedServiceId ===
        undefined
    ) {
      return;
    }

    setManagementView(
      await practiceService
        .getPracticeServiceManagementView(
          tenant.scope,
          selectedServiceId,
        ),
    );
  }

  async function saveService(
    event:
      FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    await runTask(
      async () => {
        if (
          tenant ===
            undefined ||
          canManage !== true
        ) {
          return;
        }

        const formData =
          new FormData(
            event.currentTarget,
          );

        const parsed =
          practiceServiceFormSchema
            .safeParse({
              practitionerId:
                readOptionalString(
                  formData,
                  "practitionerId",
                ),

              deliveryScope:
                readString(
                  formData,
                  "deliveryScope",
                ),

              eligiblePractitionerIds:
                formData
                  .getAll(
                    "eligiblePractitionerIds",
                  )
                  .map(String),

              code:
                readString(
                  formData,
                  "code",
                ),

              name:
                readString(
                  formData,
                  "name",
                ),

              description:
                readOptionalString(
                  formData,
                  "description",
                ),

              category:
                readString(
                  formData,
                  "category",
                ),

              defaultDurationMinutes:
                readInteger(
                  formData,
                  "defaultDurationMinutes",
                ),

              consultationModes:
                formData
                  .getAll(
                    "consultationModes",
                  )
                  .map(String),

              eligibility:
                formData
                  .getAll(
                    "eligibility",
                  )
                  .map(String),

              preparationInstructions:
                readOptionalString(
                  formData,
                  "preparationInstructions",
                ),

              requiresDocumentUpload:
                readBoolean(
                  formData,
                  "requiresDocumentUpload",
                ),

              publicVisible:
                readBoolean(
                  formData,
                  "publicVisible",
                ),

              publiclyBookable:
                readBoolean(
                  formData,
                  "publiclyBookable",
                ),

              status:
                readString(
                  formData,
                  "status",
                ),
            });

        if (!parsed.success) {
          throw new Error(
            formatIssues(
              parsed.error.issues,
            ),
          );
        }

        const current =
          editingService
            ? managementView
                ?.service
            : undefined;

        const saved =
          await practiceService
            .savePracticeService(
              tenant.scope,
              {
                serviceId:
                  current?.id,

                service:
                  parsed.data,
              },
            );

        await refreshCatalogue(
          saved.id,
        );

        setSelectedServiceId(
          saved.id,
        );

        setManagementView(
          await practiceService
            .getPracticeServiceManagementView(
              tenant.scope,
              saved.id,
            ),
        );

        setEditingService(
          false,
        );

        setSuccessMessage(
          current === undefined
            ? "Service created."
            : saved.status ===
                "archived"
              ? "Service archived. Its offerings and fee history remain available for historical records."
              : "Service updated.",
        );
      },
    );
  }

  async function saveOffering(
    event:
      FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    await runTask(
      async () => {
        if (
          tenant ===
            undefined ||
          managementView ===
            undefined ||
          offeringEditor ===
            undefined ||
          canManage !== true
        ) {
          return;
        }

        const formData =
          new FormData(
            event.currentTarget,
          );

        const effectiveTo =
          readOptionalString(
            formData,
            "effectiveTo",
          );

        const parsed =
          practiceServiceOfferingFormSchema
            .safeParse({
              practiceServiceId:
                managementView
                  .service.id,

              practiceLocationId:
                offeringEditor
                  .location.id,

              fee: {
                amountMinorUnits:
                  readInteger(
                    formData,
                    "amountMinorUnits",
                  ),

                currencyCode:
                  readString(
                    formData,
                    "currencyCode",
                  ),
              },

              feeCollector:
                readString(
                  formData,
                  "feeCollector",
                ),

              paymentTiming:
                readString(
                  formData,
                  "paymentTiming",
                ),

              durationOverrideMinutes:
                readOptionalInteger(
                  formData,
                  "durationOverrideMinutes",
                ),

              locationInstructions:
                readOptionalString(
                  formData,
                  "locationInstructions",
                ),

              publiclyBookable:
                readBoolean(
                  formData,
                  "publiclyBookable",
                ),

              effectiveFrom:
                toIsoDateTime(
                  readString(
                    formData,
                    "effectiveFrom",
                  ),
                ),

              effectiveTo:
                effectiveTo ===
                  undefined
                  ? undefined
                  : toIsoDateTime(
                      effectiveTo,
                    ),

              status:
                readString(
                  formData,
                  "status",
                ),
            });

        if (!parsed.success) {
          throw new Error(
            formatIssues(
              parsed.error.issues,
            ),
          );
        }

        const result =
          await practiceService
            .savePracticeServiceOffering(
              tenant.scope,
              {
                offeringId:
                  offeringEditor
                    .offering
                    ?.id,

                offering:
                  parsed.data,

                actorUserId:
                  tenant.ownerUserId,

                feeChangeReason:
                  readOptionalString(
                    formData,
                    "feeChangeReason",
                  ),
              },
            );

        setOfferingEditor(
          undefined,
        );

        await refreshView();

        setSuccessMessage(
          result.feeChange !==
          undefined
            ? "Offering saved and fee history appended."
            : "Offering saved without changing its fee.",
        );
      },
    );
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
          Loading service catalogue…
        </div>
      </main>
    );
  }

  if (
    canManage !== true
  ) {
    return (
      <main className="mx-auto max-w-4xl p-4 sm:p-6">
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="text-xs font-extrabold uppercase tracking-wide text-amber-700">
            Access restricted
          </div>

          <h1 className="mt-2 text-2xl font-black text-slate-950">
            Catalogue management permission is required
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-700">
            The active practice session does not have the{" "}
            <code>catalogue.manage</code> privilege.
          </p>

          {session ===
          undefined ? (
            <p className="mt-2 text-sm text-slate-600">
              {errorMessage ??
                "Complete the owner-team setup and then open this page again."}
            </p>
          ) : null}
        </section>
      </main>
    );
  }

  const selectedService =
    managementView?.service;

  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-violet-700">
          Practice management
        </div>

        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">
              Service catalogue and fees
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Define services, eligible clinicians and location-specific
              offerings. Fee changes append history rather than rewriting
              earlier values.
            </p>
          </div>

          <button
            className="h-11 rounded-xl bg-violet-700 px-5 text-sm font-bold text-white hover:bg-violet-800"
            onClick={() => {
              setSelectedServiceId(
                undefined,
              );

              setManagementView(
                undefined,
              );

              setEditingService(
                true,
              );

              setOfferingEditor(
                undefined,
              );
            }}
            type="button"
          >
            Create service
          </button>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <h2 className="text-sm font-black text-slate-900">
              Services
            </h2>

            <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
              <input
                checked={
                  includeArchived
                }
                onChange={(e) => {
                  setIncludeArchived(
                    e.target
                      .checked,
                  );
                }}
                type="checkbox"
              />

              Show archived
            </label>
          </div>

          <div className="divide-y divide-slate-200 max-h-96 overflow-y-auto">
            {visibleServices.length ===
            0 ? (
              <div className="p-4 text-center text-sm text-slate-500 sm:p-5">
                No services yet
              </div>
            ) : (
              visibleServices.map(
                (service) => (
                  <button
                    className={[
                      "w-full px-4 py-3 text-left transition sm:px-5 hover:bg-slate-50",
                      selectedServiceId ===
                      service.id
                        ? "bg-violet-50 border-l-2 border-violet-600"
                        : "",
                    ].join(" ")}
                    key={service.id}
                    onClick={() => {
                      setSelectedServiceId(
                        service.id,
                      );

                      setEditingService(
                        false,
                      );

                      setOfferingEditor(
                        undefined,
                      );
                    }}
                    type="button"
                  >
                    <div className="text-sm font-bold text-slate-900">
                      {service.name}
                    </div>

                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={[
                          "inline-block rounded px-2 py-0.5 text-xs font-semibold",
                          statusClasses(
                            service
                              .status,
                          ),
                        ].join(" ")}
                      >
                        {service.status}
                      </span>

                      {service.code ? (
                        <span className="text-xs text-slate-500">
                          {
                            service.code
                          }
                        </span>
                      ) : null}
                    </div>
                  </button>
                ),
              )
            )}
          </div>
        </aside>

        <div className="lg:col-span-2 space-y-6">
          {errorMessage ? (
            <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 sm:p-5">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-700 sm:p-5">
              {successMessage}
            </div>
          ) : null}

          {editingService ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5 text-sm font-black text-slate-900">
                {selectedService ===
                undefined
                  ? "Create Service"
                  : "Edit Service"}
              </div>

              <ServiceEditor
                busy={busy}
                clinicians={
                  clinicians
                }
                onCancel={() => {
                  setEditingService(
                    false,
                  );
                }}
                onSubmit={
                  saveService
                }
                service={
                  selectedService
                }
              />
            </section>
          ) : selectedService !==
            undefined ? (
            <>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-2xl font-black text-slate-950">
                      {
                        selectedService
                          .name
                      }
                    </h2>

                    <p className="mt-1 text-sm text-slate-600">
                      {selectedService
                        .description}
                    </p>
                  </div>

                  {selectedService.status !==
                  "archived" ? (
                    <button
                      className="h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                      onClick={() => {
                        setEditingService(
                          true,
                        );
                      }}
                      type="button"
                    >
                      Edit service
                    </button>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-3 text-sm">
                  <div>
                    <span className="font-bold text-slate-700">
                      Code
                    </span>

                    <div className="mt-1 text-slate-900">
                      {
                        selectedService
                          .code
                      }
                    </div>
                  </div>

                  <div>
                    <span className="font-bold text-slate-700">
                      Category
                    </span>

                    <div className="mt-1 text-slate-900">
                      {selectedService
                        .category
                        .split("-")
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(" ")}
                    </div>
                  </div>

                  <div>
                    <span className="font-bold text-slate-700">
                      Duration
                    </span>

                    <div className="mt-1 text-slate-900">
                      {
                        selectedService
                          .defaultDurationMinutes
                      }
                      min
                    </div>
                  </div>

                  <div>
                    <span className="font-bold text-slate-700">
                      Delivery scope
                    </span>

                    <div className="mt-1 text-slate-900">
                      {selectedService
                        .deliveryScope
                        .split("-")
                        .map((w, i) =>
                          i === 0
                            ? w
                              .charAt(0)
                              .toUpperCase() +
                            w.slice(1)
                            : w,
                        )
                        .join(" ")}
                    </div>
                  </div>

                  <div>
                    <span className="font-bold text-slate-700">
                      Status
                    </span>

                    <div className="mt-1">
                      <span
                        className={[
                          "inline-block rounded px-2 py-1 text-xs font-semibold",
                          statusClasses(
                            selectedService
                              .status,
                          ),
                        ].join(" ")}
                      >
                        {
                          selectedService
                            .status
                        }
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="font-bold text-slate-700">
                      Public booking
                    </span>

                    <div className="mt-1 text-slate-900">
                      {selectedService
                        .publiclyBookable
                        ? "Enabled"
                        : "Disabled"}
                    </div>
                  </div>
                </div>
              </section>

              {managementView !==
              undefined ? (
                <>
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black text-slate-950">
                        Location offerings
                      </h3>

                      <button
                        className="h-9 rounded-lg bg-violet-600 px-4 text-xs font-bold text-white hover:bg-violet-700"
                        onClick={() => {
                          const location
                            =
                            locations[0];

                          if (
                            location !==
                            undefined
                          ) {
                            setOfferingEditor(
                              {
                                location,
                              },
                            );
                          }
                        }}
                        type="button"
                      >
                        Add offering
                      </button>
                    </div>

                    <div className="mt-4 space-y-3">
                      {locations.map(
                        (location) => {
                          const current
                            =
                            getCurrentOffering(
                              managementView
                                .offerings,
                              location.id,
                            );

                          return (
                            <div
                              className="rounded-xl border border-slate-200 p-4"
                              key={
                                location.id
                              }
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <div className="font-bold text-slate-900">
                                    {
                                      location
                                        .name
                                    }
                                  </div>

                                  {current !==
                                  undefined ? (
                                    <>
                                      <div className="mt-2 text-sm text-slate-600">
                                        Fee:{" "}
                                        {formatMoney(
                                          current
                                            .fee
                                            .amountMinorUnits,
                                          current
                                            .fee
                                            .currencyCode,
                                        )}
                                      </div>

                                      <div className="text-sm text-slate-600">
                                        Effective:{" "}
                                        {formatDateTime(
                                          current
                                            .effectiveFrom,
                                        )}
                                        {current
                                          .effectiveTo !==
                                        undefined
                                          ? ` - ${formatDateTime(
                                              current
                                                .effectiveTo,
                                            )}`
                                          : " (ongoing)"}
                                      </div>

                                      <div className="text-sm text-slate-600">
                                        Status:{" "}
                                        {current
                                          .status}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="mt-2 text-sm text-slate-500">
                                      No active
                                      offering
                                    </div>
                                  )}
                                </div>

                                <button
                                  className="h-9 rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                                  onClick={() => {
                                    setOfferingEditor(
                                      {
                                        location,
                                        offering:
                                          current,
                                      },
                                    );
                                  }}
                                  type="button"
                                >
                                  {current !==
                                  undefined
                                    ? "Edit"
                                    : "Create"}
                                </button>
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </section>

                  {managementView
                    .feeHistory
                    .length > 0 ? (
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                      <h3 className="text-lg font-black text-slate-950">
                        Fee history
                      </h3>

                      <div className="mt-4 space-y-2">
                        {managementView.feeHistory
                          .sort(
                            (
                              left,
                              right,
                            ) =>
                              right
                                .effectiveFrom
                                .localeCompare(
                                  left
                                    .effectiveFrom,
                                ),
                          )
                          .map(
                            (
                              feeChange,
                            ) => (
                              <div
                                className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm"
                                key={
                                  feeChange.id
                                }
                              >
                                <div className="font-bold text-slate-900">
                                  {feeChange
                                    .previousFee !==
                                  undefined
                                    ? formatMoney(
                                        feeChange
                                          .previousFee
                                          .amountMinorUnits,
                                        feeChange
                                          .previousFee
                                          .currencyCode,
                                      )
                                    : "Initial fee"}{" "}
                                  →{" "}
                                  {formatMoney(
                                    feeChange
                                      .newFee
                                      .amountMinorUnits,
                                    feeChange
                                      .newFee
                                      .currencyCode,
                                  )}
                                </div>

                                <div className="mt-1 text-slate-600">
                                  Effective:{" "}
                                  {formatDateTime(
                                    feeChange
                                      .effectiveFrom,
                                  )}
                                </div>

                                <div className="mt-1 text-slate-600">
                                  Reason:{" "}
                                  {
                                    feeChange
                                      .reason
                                  }
                                </div>

                                <div className="text-xs text-slate-500 mt-1">
                                  Changed by{" "}
                                  {
                                    feeChange
                                      .changedByUserId
                                  }{" "}
                                  on{" "}
                                  {formatDateTime(
                                    feeChange
                                      .createdAt,
                                  )}
                                </div>
                              </div>
                            ),
                          )}
                      </div>
                    </section>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}

          {offeringEditor !==
          undefined ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <OfferingEditor
                busy={busy}
                onCancel={() => {
                  setOfferingEditor(
                    undefined,
                  );
                }}
                onSubmit={
                  saveOffering
                }
                service={
                  selectedService!
                }
                state={
                  offeringEditor
                }
              />
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
