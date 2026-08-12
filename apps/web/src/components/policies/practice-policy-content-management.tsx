"use client";

/**
 * Owner-facing booking policy, tenant content, notification-template and
 * terminology management.
 *
 * Persisted writes use protected WonFlowPracticeService operations.
 * Previously created content and template versions remain immutable.
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
  PracticeBookingPolicy,
  PracticeLocation,
  PracticeService,
  PracticeServiceOffering,
  TenantContentBlock,
  TenantNotificationTemplate,
  TenantTerminology,
  WonFlowId,
} from "@wonflow/contracts";

import {
  WONFLOW_DEMO_ANCHOR_DATE_TIME,
} from "@wonflow/mock-data";

import type {
  PracticeBookingPolicyCandidate,
  PracticePolicyContentManagementView,
  TenantContentVersionCandidate,
  TenantNotificationTemplateVersionCandidate,
  TenantPolicySettingsCandidate,
  TenantTerminologyCandidate,
} from "@wonflow/mock-data";

import {
  practiceBookingPolicyFormSchema,
  tenantContentVersionFormSchema,
  tenantNotificationTemplateVersionFormSchema,
  tenantPolicySettingsFormSchema,
  tenantTerminologyFormSchema,
} from "@wonflow/validation";

import {
  useWonFlowApplication,
} from "@/app/_providers";

import {
  formatDateTime,
  formatIssues,
  formatTemplateVariables,
  parseTemplateVariables,
  readBoolean,
  readInteger,
  readOptionalInteger,
  readOptionalString,
  readString,
  renderTemplatePreview,
  titleCase,
  toDateTimeLocal,
  toOptionalIsoDateTime,
} from "./policy-content-helpers";

type PolicyPanel =
  | "booking"
  | "settings"
  | "content"
  | "notifications"
  | "terminology";

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

function statusClasses(
  status: string,
): string {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-800";

    case "scheduled":
      return "bg-blue-100 text-blue-800";

    case "draft":
      return "bg-violet-100 text-violet-800";

    case "inactive":
      return "bg-amber-100 text-amber-800";

    case "archived":
    case "retired":
      return "bg-slate-200 text-slate-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

interface BookingPolicyEditorProps {
  policy?:
    PracticeBookingPolicy;

  locations:
    PracticeLocation[];

  services:
    PracticeService[];

  offerings:
    PracticeServiceOffering[];

  busy:
    boolean;

  onCancel:
    () => void;

  onSave:
    (
      candidate:
        PracticeBookingPolicyCandidate,
    ) => Promise<void>;
}

function BookingPolicyEditor({
  policy,
  locations,
  services,
  offerings,
  busy,
  onCancel,
  onSave,
}: BookingPolicyEditorProps) {
  const [
    locationId,
    setLocationId,
  ] = useState(
    policy?.practiceLocationId ??
      "",
  );

  const [
    serviceId,
    setServiceId,
  ] = useState(
    policy?.practiceServiceId ??
      "",
  );

  const immutableScope =
    policy !== undefined;

  const availableOfferings =
    offerings.filter(
      (offering) =>
        (
          locationId === "" ||
          offering.practiceLocationId ===
            locationId
        ) &&
        (
          serviceId === "" ||
          offering.practiceServiceId ===
            serviceId
        ) &&
        offering.status !==
          "archived",
    );

  async function submit(
    event:
      FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const formData =
      new FormData(
        event.currentTarget,
      );

    const parsed =
      practiceBookingPolicyFormSchema
        .safeParse({
          practiceLocationId:
            locationId === ""
              ? undefined
              : locationId,

          practiceServiceId:
            serviceId === ""
              ? undefined
              : serviceId,

          practiceServiceOfferingId:
            readOptionalString(
              formData,
              "practiceServiceOfferingId",
            ),

          minimumBookingNoticeMinutes:
            readInteger(
              formData,
              "minimumBookingNoticeMinutes",
            ),

          cancellationWindowMinutes:
            readInteger(
              formData,
              "cancellationWindowMinutes",
            ),

          maximumReschedules:
            readInteger(
              formData,
              "maximumReschedules",
            ),

          noShowHandling:
            readString(
              formData,
              "noShowHandling",
            ),

          enforcePrepayment:
            readBoolean(
              formData,
              "enforcePrepayment",
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

    await onSave(
      parsed.data,
    );
  }

  if (
    policy?.status ===
    "archived"
  ) {
    return (
      <div className="rounded-2xl border border-slate-300 bg-slate-100 p-5">
        <p className="text-sm font-semibold text-slate-700">
          Archived policies are read-only.
        </p>

        <button
          className="mt-4 h-10 rounded-xl border border-slate-300 px-4 text-sm font-bold"
          onClick={onCancel}
          type="button"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <form
      className="space-y-5"
      key={
        policy?.id ??
        "new-policy"
      }
      onSubmit={(event) => {
        void submit(
          event,
        );
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          hint="Blank means organization-wide"
          label="Location scope"
        >
          <select
            className={
              INPUT_CLASS_NAME
            }
            disabled={
              immutableScope
            }
            onChange={(
              event,
            ) => {
              setLocationId(
                event.target.value,
              );
            }}
            value={locationId}
          >
            <option value="">
              All locations
            </option>

            {locations
              .filter(
                (location) =>
                  location.status !==
                  "archived",
              )
              .map(
                (location) => (
                  <option
                    key={
                      location.id
                    }
                    value={
                      location.id
                    }
                  >
                    {
                      location.name
                    }
                  </option>
                ),
              )}
          </select>
        </Field>
        <Field
          hint="Blank means every service"
          label="Service scope"
        >
          <select
            className={
              INPUT_CLASS_NAME
            }
            disabled={
              immutableScope
            }
            onChange={(
              event,
            ) => {
              setServiceId(
                event.target.value,
              );
            }}
            value={serviceId}
          >
            <option value="">
              All services
            </option>

            {services
              .filter(
                (service) =>
                  service.status !==
                  "archived",
              )
              .map(
                (service) => (
                  <option
                    key={
                      service.id
                    }
                    value={
                      service.id
                    }
                  >
                    {
                      service.name
                    }
                  </option>
                ),
              )}
          </select>
        </Field>

        <Field
          hint="Optional most-specific scope"
          label="Location offering"
        >
          <select
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              policy
                ?.practiceServiceOfferingId ??
              ""
            }
            disabled={
              immutableScope
            }
            name="practiceServiceOfferingId"
          >
            <option value="">
              No offering scope
            </option>

            {availableOfferings.map(
              (offering) => {
                const service =
                  services.find(
                    (candidate) =>
                      candidate.id ===
                      offering.practiceServiceId,
                  );

                const location =
                  locations.find(
                    (candidate) =>
                      candidate.id ===
                      offering.practiceLocationId,
                  );

                return (
                  <option
                    key={
                      offering.id
                    }
                    value={
                      offering.id
                    }
                  >
                    {service?.name ??
                      offering.practiceServiceId}
                    {" — "}
                    {location?.name ??
                      offering.practiceLocationId}
                  </option>
                );
              },
            )}
          </select>
        </Field>

        <Field label="Minimum booking notice in minutes">
          <input
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              policy
                ?.minimumBookingNoticeMinutes
            }
            min={0}
            name="minimumBookingNoticeMinutes"
            required
            type="number"
          />
        </Field>

        <Field label="Cancellation window in minutes">
          <input
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              policy
                ?.cancellationWindowMinutes
            }
            min={0}
            name="cancellationWindowMinutes"
            required
            type="number"
          />
        </Field>

        <Field label="Maximum reschedules">
          <input
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              policy
                ?.maximumReschedules
            }
            min={0}
            name="maximumReschedules"
            required
            type="number"
          />
        </Field>

        <Field label="No-show handling">
          <select
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              policy
                ?.noShowHandling ??
              ""
            }
            name="noShowHandling"
            required
          >
            <option value="">
              Select…
            </option>

            <option value="record-only">
              Record only
            </option>

            <option value="require-staff-review">
              Require staff review
            </option>

            <option value="restrict-future-online-booking">
              Restrict future online booking
            </option>
          </select>
        </Field>

        <Field label="Status">
          <select
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              policy?.status ??
              "draft"
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

            {policy !==
            undefined ? (
              <option value="archived">
                Archived
              </option>
            ) : null}
          </select>
        </Field>
      </div>

      <label className={CHECKBOX_CLASS_NAME}>
        <input
          defaultChecked={
            policy
              ?.enforcePrepayment ??
            false
          }
          name="enforcePrepayment"
          type="checkbox"
        />

        Require configured prepayment before confirmation
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

        <button
          className="h-11 rounded-xl bg-violet-700 px-5 text-sm font-bold text-white disabled:opacity-50"
          disabled={busy}
          type="submit"
        >
          {busy
            ? "Saving…"
            : policy ===
                undefined
              ? "Create policy"
              : "Save policy"}
        </button>
      </div>
    </form>
  );
}

interface ContentVersionEditorProps {
  previous?:
    TenantContentBlock;

  busy:
    boolean;

  onCancel:
    () => void;

  onSave:
    (
      candidate:
        TenantContentVersionCandidate,
    ) => Promise<void>;
}

function ContentVersionEditor({
  previous,
  busy,
  onCancel,
  onSave,
}: ContentVersionEditorProps) {
  const [
    title,
    setTitle,
  ] = useState(
    previous?.title ??
      "",
  );

  const [
    body,
    setBody,
  ] = useState(
    previous?.body ??
      "",
  );

  async function submit(
    event:
      FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const formData =
      new FormData(
        event.currentTarget,
      );

    const parsed =
      tenantContentVersionFormSchema
        .safeParse({
          purpose:
            previous?.purpose ??
            readString(
              formData,
              "purpose",
            ),

          languageCode:
            previous?.languageCode ??
            readString(
              formData,
              "languageCode",
            ),

          title:
            title.trim() === ""
              ? undefined
              : title.trim(),

          body,

          status:
            readString(
              formData,
              "status",
            ),

          effectiveFrom:
            toOptionalIsoDateTime(
              readOptionalString(
                formData,
                "effectiveFrom",
              ),
            ),

          effectiveTo:
            toOptionalIsoDateTime(
              readOptionalString(
                formData,
                "effectiveTo",
              ),
            ),
        });

    if (!parsed.success) {
      throw new Error(
        formatIssues(
          parsed.error.issues,
        ),
      );
    }

    await onSave(
      parsed.data,
    );
  }

  return (
    <form
      className="space-y-5"
      key={
        previous?.id ??
        "new-content"
      }
      onSubmit={(event) => {
        void submit(
          event,
        );
      }}
    >
      {previous !==
      undefined ? (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
          Creating a new version of{" "}
          <strong>
            {previous.purpose}
          </strong>{" "}
          in{" "}
          <strong>
            {previous.languageCode}
          </strong>
          . Version {previous.version} remains preserved.
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Content purpose key">
          <input
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              previous?.purpose
            }
            disabled={
              previous !==
              undefined
            }
            name="purpose"
            placeholder="patient-consent"
            required
          />
        </Field>

        <Field label="Language code">
          <input
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              previous
                ?.languageCode
            }
            disabled={
              previous !==
              undefined
            }
            name="languageCode"
            required
          />
        </Field>

        <Field label="Status">
          <select
            className={
              INPUT_CLASS_NAME
            }
            defaultValue="draft"
            name="status"
            required
          >
            <option value="draft">
              Draft
            </option>

            <option value="scheduled">
              Scheduled
            </option>

            <option value="active">
              Active
            </option>
          </select>
        </Field>

        <Field label="Effective from">
          <input
            className={
              INPUT_CLASS_NAME
            }
            name="effectiveFrom"
            type="datetime-local"
          />
        </Field>

        <Field label="Effective to">
          <input
            className={
              INPUT_CLASS_NAME
            }
            name="effectiveTo"
            type="datetime-local"
          />
        </Field>

        <Field label="Title">
          <input
            className={
              INPUT_CLASS_NAME
            }
            onChange={(
              event,
            ) => {
              setTitle(
                event.target.value,
              );
            }}
            value={title}
          />
        </Field>
      </div>

      <Field label="Content body">
        <textarea
          className={
            TEXTAREA_CLASS_NAME
          }
          onChange={(
            event,
          ) => {
            setBody(
              event.target.value,
            );
          }}
          required
          value={body}
        />
      </Field>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="text-xs font-black uppercase tracking-wide text-slate-500">
          Patient-facing preview
        </div>

        {title.trim() !==
        "" ? (
          <h4 className="mt-2 text-lg font-black text-slate-950">
            {title}
          </h4>
        ) : null}

        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {body === ""
            ? "Enter content to preview it."
            : body}
        </p>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          className="h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold"
          disabled={busy}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>

        <button
          className="h-11 rounded-xl bg-violet-700 px-5 text-sm font-bold text-white disabled:opacity-50"
          disabled={busy}
          type="submit"
        >
          {busy
            ? "Creating…"
            : "Create version"}
        </button>
      </div>
    </form>
  );
}

interface NotificationTemplateEditorProps {
  previous?:
    TenantNotificationTemplate;

  busy:
    boolean;

  onCancel:
    () => void;

  onSave:
    (
      candidate:
        TenantNotificationTemplateVersionCandidate,
    ) => Promise<void>;
}

function NotificationTemplateEditor({
  previous,
  busy,
  onCancel,
  onSave,
}: NotificationTemplateEditorProps) {
  const [
    subject,
    setSubject,
  ] = useState(
    previous
      ?.subjectTemplate ??
      "",
  );

  const [
    body,
    setBody,
  ] = useState(
    previous
      ?.bodyTemplate ??
      "",
  );

  const [
    variablesText,
    setVariablesText,
  ] = useState(
    formatTemplateVariables(
      previous?.variables ??
        [],
    ),
  );

  async function submit(
    event:
      FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const formData =
      new FormData(
        event.currentTarget,
      );

    const parsed =
      tenantNotificationTemplateVersionFormSchema
        .safeParse({
          eventCode:
            previous?.eventCode ??
            readString(
              formData,
              "eventCode",
            ),

          channel:
            previous?.channel ??
            readString(
              formData,
              "channel",
            ),

          languageCode:
            previous?.languageCode ??
            readString(
              formData,
              "languageCode",
            ),

          subjectTemplate:
            subject.trim() === ""
              ? undefined
              : subject,

          bodyTemplate:
            body,

          variables:
            parseTemplateVariables(
              variablesText,
            ),

          status:
            readString(
              formData,
              "status",
            ),

          effectiveFrom:
            toOptionalIsoDateTime(
              readOptionalString(
                formData,
                "effectiveFrom",
              ),
            ),

          effectiveTo:
            toOptionalIsoDateTime(
              readOptionalString(
                formData,
                "effectiveTo",
              ),
            ),
        });

    if (!parsed.success) {
      throw new Error(
        formatIssues(
          parsed.error.issues,
        ),
      );
    }

    await onSave(
      parsed.data,
    );
  }

  return (
    <form
      className="space-y-5"
      key={
        previous?.id ??
        "new-template"
      }
      onSubmit={(event) => {
        void submit(
          event,
        );
      }}
    >
      {previous !==
      undefined ? (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
          Creating a new version of{" "}
          <strong>
            {previous.eventCode}
          </strong>{" "}
          for{" "}
          <strong>
            {previous.channel}
          </strong>
          . Version {previous.version} remains preserved.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Event code">
          <input
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              previous?.eventCode
            }
            disabled={
              previous !==
              undefined
            }
            name="eventCode"
            placeholder="appointment-confirmed"
            required
          />
        </Field>

        <Field label="Channel">
          <select
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              previous?.channel ??
              ""
            }
            disabled={
              previous !==
              undefined
            }
            name="channel"
            required
          >
            <option value="">
              Select…
            </option>

            <option value="email">
              Email
            </option>

            <option value="sms">
              SMS
            </option>

            <option value="whatsapp">
              WhatsApp
            </option>

            <option value="push">
              Push
            </option>
          </select>
        </Field>

        <Field label="Language code">
          <input
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              previous
                ?.languageCode
            }
            disabled={
              previous !==
              undefined
            }
            name="languageCode"
            required
          />
        </Field>

        <Field label="Status">
          <select
            className={
              INPUT_CLASS_NAME
            }
            defaultValue="draft"
            name="status"
            required
          >
            <option value="draft">
              Draft
            </option>

            <option value="scheduled">
              Scheduled
            </option>

            <option value="active">
              Active
            </option>
          </select>
        </Field>

        <Field label="Effective from">
          <input
            className={
              INPUT_CLASS_NAME
            }
            name="effectiveFrom"
            type="datetime-local"
          />
        </Field>

        <Field label="Effective to">
          <input
            className={
              INPUT_CLASS_NAME
            }
            name="effectiveTo"
            type="datetime-local"
          />
        </Field>
      </div>

      <Field
        hint="Optional for channels without subjects"
        label="Subject template"
      >
        <input
          className={
            INPUT_CLASS_NAME
          }
          onChange={(
            event,
          ) => {
            setSubject(
              event.target.value,
            );
          }}
          value={subject}
        />
      </Field>

      <Field label="Body template">
        <textarea
          className={
            TEXTAREA_CLASS_NAME
          }
          onChange={(
            event,
          ) => {
            setBody(
              event.target.value,
            );
          }}
          required
          value={body}
        />
      </Field>

      <Field
        hint="One line: name|required|Description"
        label="Declared variables"
      >
        <textarea
          className={
            TEXTAREA_CLASS_NAME
          }
          onChange={(
            event,
          ) => {
            setVariablesText(
              event.target.value,
            );
          }}
          placeholder={[
            "patient.name|required|Patient display name",
            "appointment.time|required|Appointment time",
            "location.name|optional|Location name",
          ].join("\n")}
          value={
            variablesText
          }
        />
      </Field>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="text-xs font-black uppercase tracking-wide text-slate-500">
          Notification preview
        </div>

        {subject.trim() !==
        "" ? (
          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 font-bold text-slate-950">
            {renderTemplatePreview(
              subject,
            )}
          </div>
        ) : null}

        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {body === ""
            ? "Enter the notification body to preview it."
            : renderTemplatePreview(
                body,
              )}
        </p>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          className="h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold"
          disabled={busy}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>

        <button
          className="h-11 rounded-xl bg-violet-700 px-5 text-sm font-bold text-white disabled:opacity-50"
          disabled={busy}
          type="submit"
        >
          {busy
            ? "Creating…"
            : "Create template version"}
        </button>
      </div>
    </form>
  );
}

export function PracticePolicyContentManagement() {
  const {
    practiceService,
    practiceTenant,
  } = useWonFlowApplication();

  const [
    tenant,
    setTenant,
  ] = useState<
    Awaited<
      typeof practiceTenant
    >
  >();

  const [
    view,
    setView,
  ] = useState<
    PracticePolicyContentManagementView | undefined
  >();

  const [
    locations,
    setLocations,
  ] = useState<
    PracticeLocation[]
  >([]);

  const [
    services,
    setServices,
  ] = useState<
    PracticeService[]
  >([]);

  const [
    offerings,
    setOfferings,
  ] = useState<
    PracticeServiceOffering[]
  >([]);

  const [
    panel,
    setPanel,
  ] = useState<
    PolicyPanel
  >("booking");

  const [
    editingPolicyId,
    setEditingPolicyId,
  ] = useState<
    WonFlowId | undefined
  >();

  const [
    showPolicyEditor,
    setShowPolicyEditor,
  ] = useState(false);

  const [
    previousContentId,
    setPreviousContentId,
  ] = useState<
    WonFlowId | undefined
  >();

  const [
    showContentEditor,
    setShowContentEditor,
  ] = useState(false);

  const [
    previousTemplateId,
    setPreviousTemplateId,
  ] = useState<
    WonFlowId | undefined
  >();

  const [
    showTemplateEditor,
    setShowTemplateEditor,
  ] = useState(false);

  const [
    editingTerminologyId,
    setEditingTerminologyId,
  ] = useState<
    WonFlowId | undefined
  >();

  const [
    showTerminologyEditor,
    setShowTerminologyEditor,
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

  const editingPolicy =
    view?.bookingPolicies.find(
      (policy) =>
        policy.id ===
        editingPolicyId,
    );

  const previousContent =
    view?.settings.contentBlocks.find(
      (content) =>
        content.id ===
        previousContentId,
    );

  const previousTemplate =
    view?.settings.notificationTemplates.find(
      (template) =>
        template.id ===
        previousTemplateId,
    );

  const editingTerminology =
    view?.settings.terminology.find(
      (terminology) =>
        terminology.id ===
        editingTerminologyId,
    );

  const sortedContent =
    useMemo(
      () =>
        [
          ...(
            view?.settings
              .contentBlocks ??
            []
          ),
        ].sort(
          (
            left,
            right,
          ) =>
            right.createdAt.localeCompare(
              left.createdAt,
            ),
        ),
      [view],
    );

  const sortedTemplates =
    useMemo(
      () =>
        [
          ...(
            view?.settings
              .notificationTemplates ??
            []
          ),
        ].sort(
          (
            left,
            right,
          ) =>
            right.createdAt.localeCompare(
              left.createdAt,
            ),
        ),
      [view],
    );

  async function refresh():
    Promise<void> {
    if (tenant === undefined) {
      return;
    }

    setView(
      await practiceService
        .getPracticePolicyContentManagementView(
          tenant.scope,
          tenant.ownerUserId,
        ),
    );
  }

  useEffect(
    () => {
      let active = true;

      async function load():
        Promise<void> {
        try {
          const resolvedTenant =
            await practiceTenant;

          const [
            managementView,
            locationPage,
            servicePage,
            offeringPage,
          ] = await Promise.all([
            practiceService
              .getPracticePolicyContentManagementView(
                resolvedTenant.scope,
                resolvedTenant.ownerUserId,
              ),

            practiceService
              .practiceLocations
              .list(
                resolvedTenant.scope,
                {
                  limit: 1_000,
                },
              ),

            practiceService
              .practiceServices
              .list(
                resolvedTenant.scope,
                {
                  limit: 1_000,
                },
              ),

            practiceService
              .serviceOfferings
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

          setTenant(
            resolvedTenant,
          );

          setView(
            managementView,
          );

          setLocations(
            locationPage.items,
          );

          setServices(
            servicePage.items,
          );

          setOfferings(
            offeringPage.items,
          );
        } catch (error) {
          if (active) {
            setErrorMessage(
              error instanceof Error
                ? error.message
                : "Policy and content management could not be loaded.",
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
          : "The change could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveBookingPolicy(
    candidate:
      PracticeBookingPolicyCandidate,
  ): Promise<void> {
    await runTask(
      async () => {
        if (tenant === undefined) {
          return;
        }

        await practiceService
          .savePracticeBookingPolicy(
            tenant.scope,
            {
              actorUserId:
                tenant.ownerUserId,

              bookingPolicyId:
                editingPolicy?.id,

              policy:
                candidate,
            },
          );

        await refresh();

        setShowPolicyEditor(
          false,
        );

        setEditingPolicyId(
          undefined,
        );

        setSuccessMessage(
          editingPolicy ===
          undefined
            ? "Booking policy created."
            : "Booking policy updated.",
        );
      },
    );
  }

  async function savePolicySettings(
    event:
      FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const form =
      event.currentTarget;

    await runTask(
      async () => {
        if (tenant === undefined) {
          return;
        }

        const formData =
          new FormData(form);

        const parsed =
          tenantPolicySettingsFormSchema
            .safeParse({
              defaultBookingPolicyId:
                readOptionalString(
                  formData,
                  "defaultBookingPolicyId",
                ),

              cancellationPolicyContentBlockId:
                readOptionalString(
                  formData,
                  "cancellationPolicyContentBlockId",
                ),

              refundPolicyContentBlockId:
                readOptionalString(
                  formData,
                  "refundPolicyContentBlockId",
                ),

              messageResponseCommitmentMinutes:
                readOptionalInteger(
                  formData,
                  "messageResponseCommitmentMinutes",
                ),

              documentRetentionDays:
                readOptionalInteger(
                  formData,
                  "documentRetentionDays",
                ),
            });

        if (!parsed.success) {
          throw new Error(
            formatIssues(
              parsed.error.issues,
            ),
          );
        }

        await practiceService
          .saveTenantPolicySettings(
            tenant.scope,
            {
              actorUserId:
                tenant.ownerUserId,

              settings:
                parsed.data as
                  TenantPolicySettingsCandidate,
            },
          );
        await refresh();

        setSuccessMessage(
          "Tenant policy settings updated.",
        );
      },
    );
  }

  async function createContentVersion(
    candidate:
      TenantContentVersionCandidate,
  ): Promise<void> {
    await runTask(
      async () => {
        if (tenant === undefined) {
          return;
        }

        await practiceService
          .createTenantContentVersion(
            tenant.scope,
            {
              actorUserId:
                tenant.ownerUserId,

              previousContentBlockId:
                previousContent?.id,

              content:
                candidate,
            },
          );

        await refresh();

        setShowContentEditor(
          false,
        );

        setPreviousContentId(
          undefined,
        );

        setSuccessMessage(
          "Content version created. Earlier versions were preserved.",
        );
      },
    );
  }

  async function createTemplateVersion(
    candidate:
      TenantNotificationTemplateVersionCandidate,
  ): Promise<void> {
    await runTask(
      async () => {
        if (tenant === undefined) {
          return;
        }

        await practiceService
          .createTenantNotificationTemplateVersion(
            tenant.scope,
            {
              actorUserId:
                tenant.ownerUserId,

              previousTemplateId:
                previousTemplate?.id,

              template:
                candidate,
            },
          );

        await refresh();

        setShowTemplateEditor(
          false,
        );

        setPreviousTemplateId(
          undefined,
        );

        setSuccessMessage(
          "Notification-template version created.",
        );
      },
    );
  }

  async function saveTerminology(
    event:
      FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const form =
      event.currentTarget;

    await runTask(
      async () => {
        if (tenant === undefined) {
          return;
        }

        const formData =
          new FormData(form);

        const parsed =
          tenantTerminologyFormSchema
            .safeParse({
              termKey:
                editingTerminology
                  ?.termKey ??
                readString(
                  formData,
                  "termKey",
                ),

              languageCode:
                editingTerminology
                  ?.languageCode ??
                readString(
                  formData,
                  "languageCode",
                ),

              singularLabel:
                readString(
                  formData,
                  "singularLabel",
                ),

              pluralLabel:
                readOptionalString(
                  formData,
                  "pluralLabel",
                ),

              shortLabel:
                readOptionalString(
                  formData,
                  "shortLabel",
                ),

              status:
                readString(
                  formData,
                  "status",
                ),

              effectiveFrom:
                toOptionalIsoDateTime(
                  readOptionalString(
                    formData,
                    "effectiveFrom",
                  ),
                ),

              effectiveTo:
                toOptionalIsoDateTime(
                  readOptionalString(
                    formData,
                    "effectiveTo",
                  ),
                ),
            });

        if (!parsed.success) {
          throw new Error(
            formatIssues(
              parsed.error.issues,
            ),
          );
        }

        await practiceService
          .saveTenantTerminology(
            tenant.scope,
            {
              actorUserId:
                tenant.ownerUserId,

              terminologyId:
                editingTerminology?.id,

              terminology:
                parsed.data as
                  TenantTerminologyCandidate,
            },
          );

        await refresh();

        setShowTerminologyEditor(
          false,
        );

        setEditingTerminologyId(
          undefined,
        );

        setSuccessMessage(
          editingTerminology ===
          undefined
            ? "Terminology override created."
            : "Terminology override updated.",
        );
      },
    );
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
          Loading policies and content…
        </div>
      </main>
    );
  }

  if (
    tenant === undefined ||
    view === undefined
  ) {
    return (
      <main className="mx-auto max-w-4xl p-4 sm:p-6">
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="text-xs font-extrabold uppercase tracking-wide text-amber-700">
            Access restricted
          </div>

          <h1 className="mt-2 text-2xl font-black text-slate-950">
            Organization-owner access is required
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-700">
            {errorMessage ??
              "The active user does not have an effective organization-owner assignment."}
          </p>
        </section>
      </main>
    );
  }

  const policySettings =
    view.settings
      .policySettings;

  const cancellationContent =
    view.settings
      .contentBlocks
      .filter(
        (content) =>
          content.purpose ===
            "cancellation-policy" &&
          content.status !==
            "retired",
      );

  const refundContent =
    view.settings
      .contentBlocks
      .filter(
        (content) =>
          content.purpose ===
            "refund-policy" &&
          content.status !==
            "retired",
      );

  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-violet-700">
          Owner configuration
        </div>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
          Policies and content
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Manage operational policy values and tenant-authored wording.
          Published content and notification edits create new versions
          rather than rewriting historical text.
        </p>

        <p className="mt-3 text-xs text-slate-500">
          Mock service time:{" "}
          <strong>
            {formatDateTime(
              WONFLOW_DEMO_ANCHOR_DATE_TIME,
            )}
          </strong>
        </p>

        <nav
          aria-label="Policy and content sections"
          className="mt-5 flex gap-2 overflow-x-auto pb-2"
        >
          {[
            [
              "booking",
              "Booking policies",
            ],
            [
              "settings",
              "Commitments",
            ],
            [
              "content",
              "Patient content",
            ],
            [
              "notifications",
              "Notifications",
            ],
            [
              "terminology",
              "Terminology",
            ],
          ].map(
            ([
              value,
              label,
            ]) => (
              <button
                className={[
                  "whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold",
                  panel === value
                    ? "bg-violet-700 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                ].join(" ")}
                key={value}
                onClick={() => {
                  setPanel(
                    value as
                      PolicyPanel,
                  );

                  setErrorMessage(
                    undefined,
                  );
                }}
                type="button"
              >
                {label}
              </button>
            ),
          )}
        </nav>
      </header>

      {errorMessage !==
      undefined ? (
        <div
          className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"
          role="alert"
        >
          {errorMessage}
        </div>
      ) : null}

      {successMessage !==
      undefined ? (
        <div
          className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"
          role="status"
        >
          {successMessage}
        </div>
      ) : null}

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        {panel ===
        "booking" ? (
          <div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  Booking policies
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Policies may be organization-wide or scoped to a
                  location, service or offering.
                </p>
              </div>

              <button
                className="h-10 rounded-xl bg-violet-700 px-4 text-sm font-bold text-white"
                onClick={() => {
                  setEditingPolicyId(
                    undefined,
                  );

                  setShowPolicyEditor(
                    true,
                  );
                }}
                type="button"
              >
                Add policy
              </button>
            </div>

            {showPolicyEditor ? (
              <div className="mt-6">
                <BookingPolicyEditor
                  busy={busy}
                  locations={
                    locations
                  }
                  offerings={
                    offerings
                  }
                  onCancel={() => {
                    setShowPolicyEditor(
                      false,
                    );

                    setEditingPolicyId(
                      undefined,
                    );
                  }}
                  onSave={
                    saveBookingPolicy
                  }
                  policy={
                    editingPolicy
                  }
                  services={
                    services
                  }
                />
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {view.bookingPolicies.length ===
                0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                    <div className="font-black text-slate-900">
                      No booking policies
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      No notice, cancellation, reschedule or no-show
                      values are assumed.
                    </p>
                  </div>
                ) : (
                  view.bookingPolicies.map(
                    (policy) => (
                      <article
                        className="rounded-2xl border border-slate-200 p-4"
                        key={
                          policy.id
                        }
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="font-black text-slate-950">
                              {policy.practiceServiceOfferingId !==
                              undefined
                                ? "Offering policy"
                                : policy.practiceServiceId !==
                                    undefined
                                  ? "Service policy"
                                  : policy.practiceLocationId !==
                                      undefined
                                    ? "Location policy"
                                    : "Organization default policy"}
                            </h3>

                            <p className="mt-2 text-sm text-slate-600">
                              Notice{" "}
                              {
                                policy.minimumBookingNoticeMinutes
                              }{" "}
                              min · cancellation{" "}
                              {
                                policy.cancellationWindowMinutes
                              }{" "}
                              min ·{" "}
                              {
                                policy.maximumReschedules
                              }{" "}
                              reschedules
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              No-show:{" "}
                              {titleCase(
                                policy.noShowHandling,
                              )}
                              {" · "}
                              {policy.enforcePrepayment
                                ? "Prepayment enforced"
                                : "No enforced prepayment"}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={[
                                "rounded-full px-2 py-1 text-xs font-bold",
                                statusClasses(
                                  policy.status,
                                ),
                              ].join(" ")}
                            >
                              {titleCase(
                                policy.status,
                              )}
                            </span>

                            <button
                              className="h-9 rounded-xl border border-violet-300 px-3 text-xs font-bold text-violet-800"
                              onClick={() => {
                                setEditingPolicyId(
                                  policy.id,
                                );

                                setShowPolicyEditor(
                                  true,
                                );
                              }}
                              type="button"
                            >
                              {policy.status ===
                              "archived"
                                ? "View"
                                : "Edit"}
                            </button>
                          </div>
                        </div>
                      </article>
                    ),
                  )
                )}
              </div>
            )}
          </div>
        ) : null}

        {panel ===
        "settings" ? (
          <form
            className="space-y-5"
            key={
              policySettings?.id ??
              "new-settings"
            }
            onSubmit={(event) => {
              void savePolicySettings(
                event,
              );
            }}
          >
            <div>
              <h2 className="text-2xl font-black text-slate-950">
                Tenant commitments and references
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Every value remains optional until the owner confirms it.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Default booking policy">
                <select
                  className={
                    INPUT_CLASS_NAME
                  }
                  defaultValue={
                    policySettings
                      ?.defaultBookingPolicyId ??
                    ""
                  }
                  name="defaultBookingPolicyId"
                >
                  <option value="">
                    No default selected
                  </option>

                  {view.bookingPolicies
                    .filter(
                      (policy) =>
                        policy.status !==
                        "archived",
                    )
                    .map(
                      (policy) => (
                        <option
                          key={
                            policy.id
                          }
                          value={
                            policy.id
                          }
                        >
                          {policy.practiceServiceOfferingId !==
                          undefined
                            ? "Offering policy"
                            : policy.practiceServiceId !==
                                undefined
                              ? "Service policy"
                              : policy.practiceLocationId !==
                                  undefined
                                ? "Location policy"
                                : "Organization-wide policy"}
                          {" — "}
                          {
                            policy.minimumBookingNoticeMinutes
                          }{" "}
                          min notice
                        </option>
                      ),
                    )}
                </select>
              </Field>

              <Field label="Cancellation-policy wording">
                <select
                  className={
                    INPUT_CLASS_NAME
                  }
                  defaultValue={
                    policySettings
                      ?.cancellationPolicyContentBlockId ??
                    ""
                  }
                  name="cancellationPolicyContentBlockId"
                >
                  <option value="">
                    No version selected
                  </option>

                  {cancellationContent.map(
                    (content) => (
                      <option
                        key={
                          content.id
                        }
                        value={
                          content.id
                        }
                      >
                        {content.languageCode}
                        {" · v"}
                        {content.version}
                        {" · "}
                        {titleCase(
                          content.status,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="Refund-policy wording">
                <select
                  className={
                    INPUT_CLASS_NAME
                  }
                  defaultValue={
                    policySettings
                      ?.refundPolicyContentBlockId ??
                    ""
                  }
                  name="refundPolicyContentBlockId"
                >
                  <option value="">
                    No version selected
                  </option>

                  {refundContent.map(
                    (content) => (
                      <option
                        key={
                          content.id
                        }
                        value={
                          content.id
                        }
                      >
                        {content.languageCode}
                        {" · v"}
                        {content.version}
                        {" · "}
                        {titleCase(
                          content.status,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="Message response commitment in minutes">
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  defaultValue={
                    policySettings
                      ?.messageResponseCommitmentMinutes
                  }
                  min={0}
                  name="messageResponseCommitmentMinutes"
                  type="number"
                />
              </Field>

              <Field label="Document retention in days">
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  defaultValue={
                    policySettings
                      ?.documentRetentionDays
                  }
                  min={0}
                  name="documentRetentionDays"
                  type="number"
                />
              </Field>
            </div>

            <button
              className="h-11 rounded-xl bg-violet-700 px-5 text-sm font-bold text-white disabled:opacity-50"
              disabled={busy}
              type="submit"
            >
              {busy
                ? "Saving…"
                : "Save commitments"}
            </button>
          </form>
        ) : null}

        {panel ===
        "content" ? (
          <div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  Patient-facing content
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Consent, safety, booking, cancellation, refund and
                  instruction wording is authored entirely by the tenant.
                </p>
              </div>

              <button
                className="h-10 rounded-xl bg-violet-700 px-4 text-sm font-bold text-white"
                onClick={() => {
                  setPreviousContentId(
                    undefined,
                  );

                  setShowContentEditor(
                    true,
                  );
                }}
                type="button"
              >
                New content stream
              </button>
            </div>

            {showContentEditor ? (
              <div className="mt-6">
                <ContentVersionEditor
                  busy={busy}
                  onCancel={() => {
                    setShowContentEditor(
                      false,
                    );

                    setPreviousContentId(
                      undefined,
                    );
                  }}
                  onSave={
                    createContentVersion
                  }
                  previous={
                    previousContent
                  }
                />
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {sortedContent.length ===
                0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                    <div className="font-black text-slate-900">
                      No content versions
                    </div>
                  </div>
                ) : (
                  sortedContent.map(
                    (content) => (
                      <article
                        className="rounded-2xl border border-slate-200 p-4"
                        key={
                          content.id
                        }
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-black text-slate-950">
                                {content.title ??
                                  content.purpose}
                              </h3>

                              <span
                                className={[
                                  "rounded-full px-2 py-1 text-xs font-bold",
                                  statusClasses(
                                    content.status,
                                  ),
                                ].join(" ")}
                              >
                                {titleCase(
                                  content.status,
                                )}
                              </span>
                            </div>

                            <p className="mt-1 text-xs text-slate-500">
                              {content.purpose}
                              {" · "}
                              {content.languageCode}
                              {" · version "}
                              {content.version}
                            </p>

                            <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                              {content.body}
                            </p>

                            <p className="mt-2 text-xs text-slate-500">
                              Effective{" "}
                              {formatDateTime(
                                content.effectiveFrom,
                              )}
                              {" · created "}
                              {formatDateTime(
                                content.createdAt,
                              )}
                            </p>
                          </div>

                          <button
                            className="h-9 shrink-0 rounded-xl border border-violet-300 px-3 text-xs font-bold text-violet-800"
                            onClick={() => {
                              setPreviousContentId(
                                content.id,
                              );

                              setShowContentEditor(
                                true,
                              );
                            }}
                            type="button"
                          >
                            Create new version
                          </button>
                        </div>
                      </article>
                    ),
                  )
                )}
              </div>
            )}
          </div>
        ) : null}

        {panel ===
        "notifications" ? (
          <div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  Notification templates
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Event codes and variables are configuration data.
                  Undeclared placeholders are rejected.
                </p>
              </div>

              <button
                className="h-10 rounded-xl bg-violet-700 px-4 text-sm font-bold text-white"
                onClick={() => {
                  setPreviousTemplateId(
                    undefined,
                  );

                  setShowTemplateEditor(
                    true,
                  );
                }}
                type="button"
              >
                New template stream
              </button>
            </div>

            {showTemplateEditor ? (
              <div className="mt-6">
                <NotificationTemplateEditor
                  busy={busy}
                  onCancel={() => {
                    setShowTemplateEditor(
                      false,
                    );

                    setPreviousTemplateId(
                      undefined,
                    );
                  }}
                  onSave={
                    createTemplateVersion
                  }
                  previous={
                    previousTemplate
                  }
                />
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {sortedTemplates.length ===
                0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                    <div className="font-black text-slate-900">
                      No notification templates
                    </div>
                  </div>
                ) : (
                  sortedTemplates.map(
                    (template) => (
                      <article
                        className="rounded-2xl border border-slate-200 p-4"
                        key={
                          template.id
                        }
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-black text-slate-950">
                                {
                                  template.eventCode
                                }
                              </h3>

                              <span
                                className={[
                                  "rounded-full px-2 py-1 text-xs font-bold",
                                  statusClasses(
                                    template.status,
                                  ),
                                ].join(" ")}
                              >
                                {titleCase(
                                  template.status,
                                )}
                              </span>
                            </div>

                            <p className="mt-1 text-xs text-slate-500">
                              {titleCase(
                                template.channel,
                              )}
                              {" · "}
                              {template.languageCode}
                              {" · version "}
                              {template.version}
                            </p>

                            {template.subjectTemplate !==
                            undefined ? (
                              <p className="mt-3 font-bold text-slate-900">
                                {renderTemplatePreview(
                                  template.subjectTemplate,
                                )}
                              </p>
                            ) : null}

                            <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                              {renderTemplatePreview(
                                template.bodyTemplate,
                              )}
                            </p>

                            <p className="mt-2 text-xs text-slate-500">
                              {
                                template.variables.length
                              }{" "}
                              declared variables
                            </p>
                          </div>

                          <button
                            className="h-9 shrink-0 rounded-xl border border-violet-300 px-3 text-xs font-bold text-violet-800"
                            onClick={() => {
                              setPreviousTemplateId(
                                template.id,
                              );

                              setShowTemplateEditor(
                                true,
                              );
                            }}
                            type="button"
                          >
                            Create new version
                          </button>
                        </div>
                      </article>
                    ),
                  )
                )}
              </div>
            )}
          </div>
        ) : null}

        {panel ===
        "terminology" ? (
          <div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  Terminology overrides
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Stable product keys may be displayed using the
                  organization’s preferred vocabulary.
                </p>
              </div>

              <button
                className="h-10 rounded-xl bg-violet-700 px-4 text-sm font-bold text-white"
                onClick={() => {
                  setEditingTerminologyId(
                    undefined,
                  );

                  setShowTerminologyEditor(
                    true,
                  );
                }}
                type="button"
              >
                Add override
              </button>
            </div>

            {showTerminologyEditor ? (
              <form
                className="mt-6 space-y-5"
                key={
                  editingTerminology?.id ??
                  "new-terminology"
                }
                onSubmit={(event) => {
                  void saveTerminology(
                    event,
                  );
                }}
              >
                {editingTerminology?.status ===
                "retired" ? (
                  <div className="rounded-2xl border border-slate-300 bg-slate-100 p-4 text-sm font-semibold text-slate-700">
                    Retired terminology overrides are read-only.
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Stable term key">
                        <input
                          className={
                            INPUT_CLASS_NAME
                          }
                          defaultValue={
                            editingTerminology
                              ?.termKey
                          }
                          disabled={
                            editingTerminology !==
                            undefined
                          }
                          name="termKey"
                          placeholder="navigation.item.practice.patients"
                          required
                        />
                      </Field>

                      <Field label="Language code">
                        <input
                          className={
                            INPUT_CLASS_NAME
                          }
                          defaultValue={
                            editingTerminology
                              ?.languageCode
                          }
                          disabled={
                            editingTerminology !==
                            undefined
                          }
                          name="languageCode"
                          required
                        />
                      </Field>

                      <Field label="Singular label">
                        <input
                          className={
                            INPUT_CLASS_NAME
                          }
                          defaultValue={
                            editingTerminology
                              ?.singularLabel
                          }
                          name="singularLabel"
                          required
                        />
                      </Field>

                      <Field label="Plural label">
                        <input
                          className={
                            INPUT_CLASS_NAME
                          }
                          defaultValue={
                            editingTerminology
                              ?.pluralLabel
                          }
                          name="pluralLabel"
                        />
                      </Field>

                      <Field label="Short label">
                        <input
                          className={
                            INPUT_CLASS_NAME
                          }
                          defaultValue={
                            editingTerminology
                              ?.shortLabel
                          }
                          name="shortLabel"
                        />
                      </Field>

                      <Field label="Status">
                        <select
                          className={
                            INPUT_CLASS_NAME
                          }
                          defaultValue={
                            editingTerminology
                              ?.status ??
                            "draft"
                          }
                          name="status"
                        >
                          <option value="draft">
                            Draft
                          </option>

                          <option value="active">
                            Active
                          </option>

                          {editingTerminology !==
                          undefined ? (
                            <option value="retired">
                              Retired
                            </option>
                          ) : null}
                        </select>
                      </Field>

                      <Field label="Effective from">
                        <input
                          className={
                            INPUT_CLASS_NAME
                          }
                          defaultValue={toDateTimeLocal(
                            editingTerminology
                              ?.effectiveFrom,
                          )}
                          name="effectiveFrom"
                          type="datetime-local"
                        />
                      </Field>

                      <Field label="Effective to">
                        <input
                          className={
                            INPUT_CLASS_NAME
                          }
                          defaultValue={toDateTimeLocal(
                            editingTerminology
                              ?.effectiveTo,
                          )}
                          name="effectiveTo"
                          type="datetime-local"
                        />
                      </Field>
                    </div>

                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                      <button
                        className="h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold"
                        disabled={busy}
                        onClick={() => {
                          setShowTerminologyEditor(
                            false,
                          );

                          setEditingTerminologyId(
                            undefined,
                          );
                        }}
                        type="button"
                      >
                        Cancel
                      </button>

                      <button
                        className="h-11 rounded-xl bg-violet-700 px-5 text-sm font-bold text-white disabled:opacity-50"
                        disabled={busy}
                        type="submit"
                      >
                        {busy
                          ? "Saving…"
                          : "Save terminology"}
                      </button>
                    </div>
                  </>
                )}
              </form>
            ) : (
              <div className="mt-6 space-y-3">
                {view.settings.terminology.length ===
                0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                    <div className="font-black text-slate-900">
                      No terminology overrides
                    </div>
                  </div>
                ) : (
                  view.settings.terminology.map(
                    (
                      terminology:
                        TenantTerminology,
                    ) => (
                      <article
                        className="rounded-2xl border border-slate-200 p-4"
                        key={
                          terminology.id
                        }
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="font-black text-slate-950">
                              {
                                terminology.singularLabel
                              }
                            </h3>

                            <p className="mt-1 text-xs text-slate-500">
                              {
                                terminology.termKey
                              }
                              {" · "}
                              {
                                terminology.languageCode
                              }
                            </p>

                            <p className="mt-2 text-sm text-slate-600">
                              Plural:{" "}
                              {terminology.pluralLabel ??
                                "Not set"}
                              {" · Short: "}
                              {terminology.shortLabel ??
                                "Not set"}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={[
                                "rounded-full px-2 py-1 text-xs font-bold",
                                statusClasses(
                                  terminology.status,
                                ),
                              ].join(" ")}
                            >
                              {titleCase(
                                terminology.status,
                              )}
                            </span>

                            <button
                              className="h-9 rounded-xl border border-violet-300 px-3 text-xs font-bold text-violet-800"
                              onClick={() => {
                                setEditingTerminologyId(
                                  terminology.id,
                                );

                                setShowTerminologyEditor(
                                  true,
                                );
                              }}
                              type="button"
                            >
                              {terminology.status ===
                              "retired"
                                ? "View"
                                : "Edit"}
                            </button>
                          </div>
                        </div>
                      </article>
                    ),
                  )
                )}
              </div>
            )}
          </div>
        ) : null}
      </section>
    </main>
  );
}
