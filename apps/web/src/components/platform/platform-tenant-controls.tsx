"use client";

/**
 * Platform controls for one tenant.
 *
 * This component manages commercial subscription data, module
 * entitlements and tenant lifecycle only. It cannot edit tenant-owned
 * clinical or operational configuration, policy or content.
 */

import {
  useMemo,
  useState,
} from "react";

import type {
  FormEvent,
  ReactNode,
} from "react";

import {
  WONFLOW_MODULES,
} from "@wonflow/contracts";

import type {
  ModuleCode,
} from "@wonflow/contracts";

import type {
  WonFlowPlatformAdminSession,
  WonFlowPlatformTenantListItem,
  WonFlowPlatformTenantOverview,
  WonFlowPracticeService,
} from "@wonflow/mock-data";

import {
  platformModuleEntitlementFormSchema,
  platformSubscriptionFormSchema,
  platformTenantLifecycleActionFormSchema,
} from "@wonflow/validation";

type ControlPanel =
  | "subscription"
  | "modules"
  | "lifecycle"
  | "history";

type FieldErrorMap =
  Record<string, string>;

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

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;

  hint?: string;

  error?: string;

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

      {error !== undefined ? (
        <span className="mt-1 block text-xs font-semibold text-red-700">
          {error}
        </span>
      ) : null}
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
      "Enter a valid date and time.",
    );
  }

  return parsed.toISOString();
}

function toOptionalIsoDateTime(
  value:
    string | undefined,
): string | undefined {
  return value === undefined
    ? undefined
    : toIsoDateTime(
        value,
      );
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

  const offset =
    parsed.getTimezoneOffset() *
    60_000;

  return new Date(
    parsed.getTime() -
      offset,
  )
    .toISOString()
    .slice(0, 16);
}

function formatDateTime(
  value:
    string | undefined,
): string {
  if (value === undefined) {
    return "Not set";
  }

  const parsed =
    new Date(value);

  return Number.isNaN(
    parsed.getTime(),
  )
    ? value
    : parsed.toLocaleString();
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

function issuesToFieldErrors(
  issues:
    readonly {
      path:
        readonly PropertyKey[];

      message: string;
    }[],
): FieldErrorMap {
  const result:
    FieldErrorMap = {};

  for (const issue of issues) {
    const key =
      String(
        issue.path[0] ??
        "form",
      );

    result[key] ??=
      issue.message;
  }

  return result;
}

function badgeClasses(
  value: string,
): string {
  switch (value) {
    case "active":
    case "enabled":
    case "completed":
      return "bg-emerald-100 text-emerald-800";

    case "pending-configuration":
    case "trialing":
      return "bg-blue-100 text-blue-800";

    case "suspended":
    case "past-due":
      return "bg-amber-100 text-amber-800";

    case "cancelled":
    case "revoked":
    case "expired":
    case "disabled":
      return "bg-red-100 text-red-800";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function Badge({
  value,
}: {
  value: string;
}) {
  return (
    <span
      className={[
        "inline-flex rounded-full",
        "px-2 py-1",
        "text-[11px] font-bold",
        badgeClasses(value),
      ].join(" ")}
    >
      {titleCase(value)}
    </span>
  );
}

interface PlatformTenantControlsProps {
  service:
    WonFlowPracticeService;

  session:
    WonFlowPlatformAdminSession;

  tenant:
    WonFlowPlatformTenantListItem;

  overview:
    WonFlowPlatformTenantOverview;

  onChanged:
    (
      nextOverview:
        WonFlowPlatformTenantOverview,
    ) =>
      Promise<void> |
      void;

  initialPanel?:
    ControlPanel;
}

export function PlatformTenantControls({
  service,
  session,
  tenant,
  overview,
  onChanged,
  initialPanel =
    "subscription",
}: PlatformTenantControlsProps) {
  const [
    panel,
    setPanel,
  ] = useState<
    ControlPanel
  >(initialPanel);

  const [
    selectedModuleCode,
    setSelectedModuleCode,
  ] = useState<
    ModuleCode | undefined
  >();

  const [
    fieldErrors,
    setFieldErrors,
  ] = useState<
    FieldErrorMap
  >({});

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

  const scope =
    useMemo(
      () => ({
        organizationId:
          tenant.organizationId,
      }),
      [
        tenant.organizationId,
      ],
    );

  const modules =
    useMemo(
      () =>
        WONFLOW_MODULES
          .filter(
            (module) =>
              module
                .supportedScopes
                .some(
                  (scope) =>
                    scope ===
                    "organization",
                ) &&
              module.lifecycleStatus ===
                "active",
          )
          .sort(
            (
              left,
              right,
            ) =>
              left.sortOrder -
              right.sortOrder,
          ),
      [],
    );

  const selectedModule =
    modules.find(
      (module) =>
        module.code ===
        selectedModuleCode,
    );

  const selectedEntitlement =
    overview.moduleEntitlements.find(
      (entitlement) =>
        entitlement.moduleCode ===
        selectedModuleCode,
    );

  const selectedActivation =
    overview.moduleActivations.find(
      (activation) =>
        activation.moduleCode ===
        selectedModuleCode,
    );

  async function refresh():
    Promise<void> {
    const next =
      await service
        .getPlatformTenantOverview(
          scope,
        );

    await onChanged(next);
  }

  async function runTask(
    task:
      () => Promise<string>,
  ): Promise<void> {
    setBusy(true);
    setFieldErrors({});
    setErrorMessage(undefined);
    setSuccessMessage(undefined);

    try {
      const message =
        await task();

      setSuccessMessage(message);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The platform control could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveSubscription(
    event:
      FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const formData =
      new FormData(
        event.currentTarget,
      );

    await runTask(
      async () => {
        const parsed =
          platformSubscriptionFormSchema
            .safeParse({
              planTierCode:
                readString(
                  formData,
                  "planTierCode",
                ),

              seatCount:
                readInteger(
                  formData,
                  "seatCount",
                ),

              billingStatus:
                readString(
                  formData,
                  "billingStatus",
                ),

              trialStartsAt:
                toOptionalIsoDateTime(
                  readOptionalString(
                    formData,
                    "trialStartsAt",
                  ),
                ),

              trialEndsAt:
                toOptionalIsoDateTime(
                  readOptionalString(
                    formData,
                    "trialEndsAt",
                  ),
                ),

              currentBillingPeriodStartsAt:
                toOptionalIsoDateTime(
                  readOptionalString(
                    formData,
                    "currentBillingPeriodStartsAt",
                  ),
                ),

              currentBillingPeriodEndsAt:
                toOptionalIsoDateTime(
                  readOptionalString(
                    formData,
                    "currentBillingPeriodEndsAt",
                  ),
                ),

              expiresAt:
                toOptionalIsoDateTime(
                  readOptionalString(
                    formData,
                    "expiresAt",
                  ),
                ),

              reason:
                readString(
                  formData,
                  "reason",
                ),
            });

        if (!parsed.success) {
          setFieldErrors(
            issuesToFieldErrors(
              parsed.error.issues,
            ),
          );

          throw new Error(
            "Review the highlighted subscription fields.",
          );
        }

        await service
          .savePlatformTenantSubscription(
            scope,
            {
              actorUserId:
                session.userId,

              ...parsed.data,
            },
          );

        await refresh();

        return "Subscription updated and the platform action was recorded.";
      },
    );
  }

  async function saveModule(
    event:
      FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const formData =
      new FormData(
        event.currentTarget,
      );

    await runTask(
      async () => {
        if (
          selectedModuleCode ===
          undefined
        ) {
          throw new Error(
            "Select a module.",
          );
        }

        const parsed =
          platformModuleEntitlementFormSchema
            .safeParse({
              moduleCode:
                selectedModuleCode,

              entitlementStatus:
                readString(
                  formData,
                  "entitlementStatus",
                ),

              activationStatus:
                readString(
                  formData,
                  "activationStatus",
                ),

              effectiveFrom:
                toIsoDateTime(
                  readString(
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

              notes:
                readOptionalString(
                  formData,
                  "notes",
                ),

              reason:
                readString(
                  formData,
                  "reason",
                ),
            });

        if (!parsed.success) {
          setFieldErrors(
            issuesToFieldErrors(
              parsed.error.issues,
            ),
          );

          throw new Error(
            "Review the highlighted module fields.",
          );
        }

        await service
          .setPlatformTenantModuleEntitlement(
            scope,
            {
              actorUserId:
                session.userId,

              ...parsed.data,
            },
          );

        await refresh();

        return "Module entitlement and activation updated atomically.";
      },
    );
  }

  async function executeLifecycleAction(
    event:
      FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const form =
      event.currentTarget;

    const formData =
      new FormData(form);

    await runTask(
      async () => {
        const parsed =
          platformTenantLifecycleActionFormSchema
            .safeParse({
              action:
                readString(
                  formData,
                  "action",
                ),

              confirmation:
                readString(
                  formData,
                  "confirmation",
                ),

              reason:
                readString(
                  formData,
                  "reason",
                ),
            });

        if (!parsed.success) {
          setFieldErrors(
            issuesToFieldErrors(
              parsed.error.issues,
            ),
          );

          throw new Error(
            "Review the highlighted lifecycle fields.",
          );
        }

        const next =
          await service
            .executePlatformTenantLifecycleAction(
              scope,
              {
                actorUserId:
                  session.userId,

                ...parsed.data,
              },
            );

        await onChanged(next);

        form.reset();

        return parsed.data.action ===
          "terminate"
          ? "Tenant terminated. Historical records were preserved."
          : parsed.data.action ===
              "suspend"
            ? "Tenant suspended."
            : "Tenant reactivated.";
      },
    );
  }

  const subscription =
    overview.subscription;

  return (
    <section className="mt-6 border-t border-slate-200 pt-6">
      <div>
        <h3 className="text-xl font-black text-slate-950">
          Tenant controls
        </h3>

        <p className="mt-1 text-sm leading-6 text-slate-600">
          These controls affect commercial access, module availability
          and the tenant lifecycle. They do not modify tenant-owned
          clinical configuration.
        </p>
      </div>

      <nav
        aria-label="Tenant control sections"
        className="mt-5 flex gap-2 overflow-x-auto pb-2"
      >
        {[
          [
            "subscription",
            "Subscription",
          ],
          [
            "modules",
            "Modules",
          ],
          [
            "lifecycle",
            "Lifecycle",
          ],
          [
            "history",
            "Control history",
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
                    ControlPanel,
                );

                setFieldErrors({});
                setErrorMessage(undefined);
                setSuccessMessage(undefined);
              }}
              type="button"
            >
              {label}
            </button>
          ),
        )}
      </nav>

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

      {panel ===
      "subscription" ? (
        subscription ===
        undefined ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-8 text-center">
            <div className="font-black text-slate-900">
              No subscription record
            </div>

            <p className="mt-1 text-sm text-slate-500">
              This tenant cannot be managed until its platform
              subscription exists.
            </p>
          </div>
        ) : (
          <form
            className="mt-5 space-y-5"
            key={
              subscription.updatedAt
            }
            onSubmit={(event) => {
              void saveSubscription(
                event,
              );
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                error={
                  fieldErrors
                    .planTierCode
                }
                label="Plan tier code"
              >
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  defaultValue={
                    subscription.planTierCode
                  }
                  name="planTierCode"
                  required
                />
              </Field>

              <Field
                error={
                  fieldErrors.seatCount
                }
                label="Seat count"
              >
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  defaultValue={
                    subscription.seatCount
                  }
                  min={1}
                  name="seatCount"
                  required
                  type="number"
                />
              </Field>

              <Field
                error={
                  fieldErrors
                    .billingStatus
                }
                label="Billing status"
              >
                <select
                  className={
                    INPUT_CLASS_NAME
                  }
                  defaultValue={
                    subscription.billingStatus
                  }
                  name="billingStatus"
                  required
                >
                  <option value="trialing">
                    Trialing
                  </option>

                  <option value="active">
                    Active
                  </option>

                  <option value="past-due">
                    Past due
                  </option>

                  <option value="suspended">
                    Suspended
                  </option>

                  <option value="cancelled">
                    Cancelled
                  </option>

                  <option value="expired">
                    Expired
                  </option>
                </select>
              </Field>

              <Field label="Trial starts">
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  defaultValue={toDateTimeLocal(
                    subscription.trialStartsAt,
                  )}
                  name="trialStartsAt"
                  type="datetime-local"
                />
              </Field>

              <Field
                error={
                  fieldErrors.trialEndsAt
                }
                label="Trial ends"
              >
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  defaultValue={toDateTimeLocal(
                    subscription.trialEndsAt,
                  )}
                  name="trialEndsAt"
                  type="datetime-local"
                />
              </Field>

              <Field label="Billing period starts">
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  defaultValue={toDateTimeLocal(
                    subscription.currentBillingPeriodStartsAt,
                  )}
                  name="currentBillingPeriodStartsAt"
                  type="datetime-local"
                />
              </Field>

              <Field
                error={
                  fieldErrors
                    .currentBillingPeriodEndsAt
                }
                label="Billing period ends"
              >
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  defaultValue={toDateTimeLocal(
                    subscription.currentBillingPeriodEndsAt,
                  )}
                  name="currentBillingPeriodEndsAt"
                  type="datetime-local"
                />
              </Field>

              <Field label="Subscription expires">
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  defaultValue={toDateTimeLocal(
                    subscription.expiresAt,
                  )}
                  name="expiresAt"
                  type="datetime-local"
                />
              </Field>
            </div>

            <Field
              error={
                fieldErrors.reason
              }
              label="Reason for subscription change"
            >
              <textarea
                className={
                  TEXTAREA_CLASS_NAME
                }
                name="reason"
                required
              />
            </Field>

            <button
              className="h-11 rounded-xl bg-violet-700 px-5 text-sm font-bold text-white disabled:opacity-50"
              disabled={busy}
              type="submit"
            >
              {busy
                ? "Saving…"
                : "Save subscription"}
            </button>
          </form>
        )
      ) : null}

      {panel ===
      "modules" ? (
        <div className="mt-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {modules.map(
              (module) => {
                const entitlement =
                  overview
                    .moduleEntitlements
                    .find(
                      (candidate) =>
                        candidate.moduleCode ===
                        module.code,
                    );

                const activation =
                  overview
                    .moduleActivations
                    .find(
                      (candidate) =>
                        candidate.moduleCode ===
                        module.code,
                    );

                return (
                  <article
                    className={[
                      "rounded-2xl border p-4",
                      selectedModuleCode ===
                      module.code
                        ? "border-violet-300 bg-violet-50"
                        : "border-slate-200",
                    ].join(" ")}
                    key={
                      module.code
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-black text-slate-950">
                          {module.name}
                        </h4>

                        <code className="mt-1 block text-xs text-slate-500">
                          {module.code}
                        </code>
                      </div>

                      {module.isCore ? (
                        <span className="rounded-full bg-slate-900 px-2 py-1 text-[11px] font-bold text-white">
                          Core
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge
                        value={
                          entitlement
                            ?.status ??
                          "not-entitled"
                        }
                      />

                      <Badge
                        value={
                          activation
                            ?.status ??
                          "not-configured"
                        }
                      />
                    </div>

                    <button
                      className="mt-4 h-10 w-full rounded-xl border border-violet-300 text-sm font-bold text-violet-800"
                      onClick={() => {
                        setSelectedModuleCode(
                          module.code,
                        );

                        setFieldErrors({});
                        setErrorMessage(undefined);
                      }}
                      type="button"
                    >
                      Manage module
                    </button>
                  </article>
                );
              },
            )}
          </div>

          {selectedModule !==
          undefined ? (
            <form
              className="mt-5 space-y-5 rounded-2xl border border-violet-200 bg-violet-50 p-5"
              key={[
                selectedModule.code,
                selectedEntitlement
                  ?.updatedAt ??
                  "new",
                selectedActivation
                  ?.updatedAt ??
                  "new",
              ].join(":")}
              onSubmit={(event) => {
                void saveModule(
                  event,
                );
              }}
            >
              <div>
                <h4 className="text-lg font-black text-slate-950">
                  {selectedModule.name}
                </h4>

                <p className="mt-1 text-sm text-slate-600">
                  {selectedModule.description}
                </p>

                {selectedModule.isCore ? (
                  <p className="mt-2 text-xs font-semibold text-amber-800">
                    Core modules must retain an active entitlement and
                    cannot be manually disabled.
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  error={
                    fieldErrors
                      .entitlementStatus
                  }
                  label="Entitlement status"
                >
                  <select
                    className={
                      INPUT_CLASS_NAME
                    }
                    defaultValue={
                      selectedEntitlement
                        ?.status ??
                      ""
                    }
                    name="entitlementStatus"
                    required
                  >
                    <option value="">
                      Select…
                    </option>

                    <option value="active">
                      Active
                    </option>

                    {!selectedModule.isCore ? (
                      <>
                        <option value="expired">
                          Expired
                        </option>

                        <option value="suspended">
                          Suspended
                        </option>

                        <option value="revoked">
                          Revoked
                        </option>
                      </>
                    ) : null}
                  </select>
                </Field>

                <Field
                  error={
                    fieldErrors
                      .activationStatus
                  }
                  label="Activation status"
                >
                  <select
                    className={
                      INPUT_CLASS_NAME
                    }
                    defaultValue={
                      selectedActivation
                        ?.status ??
                      ""
                    }
                    name="activationStatus"
                    required
                  >
                    <option value="">
                      Select…
                    </option>

                    <option value="pending-configuration">
                      Pending configuration
                    </option>

                    <option value="enabled">
                      Enabled
                    </option>

                    {!selectedModule.isCore ? (
                      <>
                        <option value="disabled">
                          Disabled
                        </option>

                        <option value="suspended">
                          Suspended
                        </option>
                      </>
                    ) : null}
                  </select>
                </Field>

                <Field
                  error={
                    fieldErrors
                      .effectiveFrom
                  }
                  label="Effective from"
                >
                  <input
                    className={
                      INPUT_CLASS_NAME
                    }
                    defaultValue={toDateTimeLocal(
                      selectedEntitlement
                        ?.effectiveFrom,
                    )}
                    name="effectiveFrom"
                    required
                    type="datetime-local"
                  />
                </Field>

                <Field
                  error={
                    fieldErrors
                      .effectiveTo
                  }
                  label="Effective to"
                >
                  <input
                    className={
                      INPUT_CLASS_NAME
                    }
                    defaultValue={toDateTimeLocal(
                      selectedEntitlement
                        ?.effectiveTo,
                    )}
                    name="effectiveTo"
                    type="datetime-local"
                  />
                </Field>
              </div>

              <Field label="Internal notes">
                <textarea
                  className={
                    TEXTAREA_CLASS_NAME
                  }
                  defaultValue={
                    selectedEntitlement
                      ?.notes
                  }
                  name="notes"
                />
              </Field>

              <Field
                error={
                  fieldErrors.reason
                }
                label="Reason for module change"
              >
                <textarea
                  className={
                    TEXTAREA_CLASS_NAME
                  }
                  name="reason"
                  required
                />
              </Field>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700"
                  disabled={busy}
                  onClick={() => {
                    setSelectedModuleCode(
                      undefined,
                    );
                  }}
                  type="button"
                >
                  Close
                </button>

                <button
                  className="h-11 rounded-xl bg-violet-700 px-5 text-sm font-bold text-white disabled:opacity-50"
                  disabled={busy}
                  type="submit"
                >
                  {busy
                    ? "Saving…"
                    : "Save module control"}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      ) : null}

      {panel ===
      "lifecycle" ? (
        <form
          className="mt-5 space-y-5 rounded-2xl border border-red-200 bg-red-50 p-5"
          onSubmit={(event) => {
            void executeLifecycleAction(
              event,
            );
          }}
        >
          <div>
            <h4 className="text-lg font-black text-red-950">
              Tenant lifecycle action
            </h4>

            <p className="mt-2 text-sm leading-6 text-red-900">
              Suspension is reversible. Termination revokes owner
              access and module entitlements while retaining historical
              tenant records.
            </p>
          </div>

          <Field
            error={
              fieldErrors.action
            }
            label="Action"
          >
            <select
              className={
                INPUT_CLASS_NAME
              }
              name="action"
              required
            >
              <option value="">
                Select…
              </option>

              <option value="suspend">
                Suspend tenant
              </option>

              {subscription?.billingStatus !==
              "cancelled" ? (
                <option value="reactivate">
                  Reactivate tenant
                </option>
              ) : null}

              <option value="terminate">
                Terminate tenant
              </option>
            </select>
          </Field>

          <Field
            error={
              fieldErrors.confirmation
            }
            hint={`Type exactly: ${tenant.organizationCode}`}
            label="Typed confirmation"
          >
            <input
              autoComplete="off"
              className={
                INPUT_CLASS_NAME
              }
              name="confirmation"
              required
            />
          </Field>

          <Field
            error={
              fieldErrors.reason
            }
            label="Lifecycle reason"
          >
            <textarea
              className={
                TEXTAREA_CLASS_NAME
              }
              name="reason"
              required
            />
          </Field>

          <button
            className="h-11 rounded-xl bg-red-700 px-5 text-sm font-bold text-white disabled:opacity-50"
            disabled={busy}
            type="submit"
          >
            {busy
              ? "Applying…"
              : "Apply lifecycle action"}
          </button>
        </form>
      ) : null}

      {panel ===
      "history" ? (
        <div className="mt-5">
          {overview.controlActions.length ===
          0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
              <div className="font-black text-slate-900">
                No platform control actions
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-black text-slate-700">
                      Action
                    </th>

                    <th className="px-4 py-3 font-black text-slate-700">
                      Status
                    </th>

                    <th className="px-4 py-3 font-black text-slate-700">
                      Actor
                    </th>

                    <th className="px-4 py-3 font-black text-slate-700">
                      Reason
                    </th>

                    <th className="px-4 py-3 font-black text-slate-700">
                      Time
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {[...overview.controlActions]
                    .sort(
                      (
                        left,
                        right,
                      ) =>
                        right.requestedAt
                          .localeCompare(
                            left.requestedAt,
                          ),
                    )
                    .map(
                      (action) => (
                        <tr key={action.id}>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">
                              {titleCase(
                                action.type,
                              )}
                            </div>

                            {action.moduleCode !==
                            undefined ? (
                              <code className="text-xs text-slate-500">
                                {
                                  action.moduleCode
                                }
                              </code>
                            ) : null}
                          </td>

                          <td className="px-4 py-3">
                            <Badge
                              value={
                                action.status
                              }
                            />
                          </td>

                          <td className="px-4 py-3">
                            <code className="text-xs text-slate-600">
                              {
                                action.actorUserId
                              }
                            </code>
                          </td>

                          <td className="max-w-sm px-4 py-3 text-slate-600">
                            {
                              action.reason
                            }
                          </td>

                          <td className="px-4 py-3 text-slate-600">
                            {formatDateTime(
                              action.completedAt ??
                                action.requestedAt,
                            )}
                          </td>
                        </tr>
                      ),
                    )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
