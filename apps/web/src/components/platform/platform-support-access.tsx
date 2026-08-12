"use client";

/**
 * Explicit, temporary and audited platform support access.
 *
 * This UI manages SupportAccessSession records. It does not directly
 * open or edit tenant clinical records.
 */

import {
  useMemo,
  useState,
} from "react";

import type {
  FormEvent,
  ReactNode,
} from "react";

import type {
  PermissionCode,
  SupportAccessSession,
  WonFlowId,
} from "@wonflow/contracts";

import {
  WONFLOW_DEMO_ANCHOR_DATE_TIME,
} from "@wonflow/mock-data";

import type {
  WonFlowPlatformAdminSession,
  WonFlowPlatformTenantListItem,
  WonFlowPlatformTenantOverview,
  WonFlowPracticeService,
} from "@wonflow/mock-data";

import {
  platformSupportAccessDecisionFormSchema,
  platformSupportAccessRequestFormSchema,
  platformSupportAccessRevocationFormSchema,
} from "@wonflow/validation";

type SupportPanel =
  | "sessions"
  | "request"
  | "record-use"
  | "audit";

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

function parseLines(
  value: string,
): string[] {
  return value
    .split(/\r?\n/u)
    .map(
      (line) =>
        line.trim(),
    )
    .filter(Boolean);
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
    const field =
      String(
        issue.path[0] ??
        "form",
      );

    result[field] ??=
      issue.message;
  }

  return result;
}

function getEffectiveStatus(
  session:
    SupportAccessSession,
): SupportAccessSession["status"] {
  if (
    (
      session.status ===
        "requested" ||
      session.status ===
        "approved" ||
      session.status ===
        "active"
    ) &&
    session.expiresAt !==
      undefined &&
    session.expiresAt <=
      WONFLOW_DEMO_ANCHOR_DATE_TIME
  ) {
    return "expired";
  }

  return session.status;
}

function statusClasses(
  status:
    SupportAccessSession["status"],
): string {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-800";

    case "requested":
    case "approved":
      return "bg-blue-100 text-blue-800";

    case "expired":
      return "bg-amber-100 text-amber-800";

    case "rejected":
    case "revoked":
      return "bg-red-100 text-red-800";
  }
}

function StatusBadge({
  session,
}: {
  session:
    SupportAccessSession;
}) {
  const status =
    getEffectiveStatus(
      session,
    );

  return (
    <span
      className={[
        "inline-flex rounded-full",
        "px-2 py-1",
        "text-xs font-bold",
        statusClasses(
          status,
        ),
      ].join(" ")}
    >
      {titleCase(
        status,
      )}
    </span>
  );
}

interface PlatformSupportAccessProps {
  service:
    WonFlowPracticeService;

  platformSession:
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
}

export function PlatformSupportAccess({
  service,
  platformSession,
  tenant,
  overview,
  onChanged,
}: PlatformSupportAccessProps) {
  const [
    panel,
    setPanel,
  ] = useState<
    SupportPanel
  >("sessions");

  const [
    decidingSessionId,
    setDecidingSessionId,
  ] = useState<
    WonFlowId | undefined
  >();

  const [
    revokingSessionId,
    setRevokingSessionId,
  ] = useState<
    WonFlowId | undefined
  >();

  const [
    useSessionId,
    setUseSessionId,
  ] = useState<
    WonFlowId | undefined
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

  const sessions =
    useMemo(
      () =>
        [
          ...overview
            .supportAccessSessions,
        ].sort(
          (
            left,
            right,
          ) =>
            right.requestedAt
              .localeCompare(
                left.requestedAt,
              ),
        ),
      [
        overview
          .supportAccessSessions,
      ],
    );

  const activeOwnSessions =
    useMemo(
      () =>
        sessions.filter(
          (session) =>
            getEffectiveStatus(
              session,
            ) ===
              "active" &&
            session.platformUserId ===
              platformSession.userId,
        ),
      [
        platformSession.userId,
        sessions,
      ],
    );

  const selectedUseSession =
    activeOwnSessions.find(
      (session) =>
        session.id ===
        useSessionId,
    );

  async function refresh():
    Promise<void> {
    const next =
      await service
        .getPlatformTenantOverview(
          scope,
        );

    await onChanged(
      next,
    );
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

      setSuccessMessage(
        message,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The support-access operation could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function requestAccess(
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
        const branchIds =
          parseLines(
            readString(
              formData,
              "allowedBranchIds",
            ),
          );

        const parsed =
          platformSupportAccessRequestFormSchema
            .safeParse({
              requestedReason:
                readString(
                  formData,
                  "requestedReason",
                ),

              allowedPermissionCodes:
                parseLines(
                  readString(
                    formData,
                    "allowedPermissionCodes",
                  ),
                ),

              ...(
                branchIds.length ===
                0
                  ? {}
                  : {
                      allowedBranchIds:
                        branchIds,
                    }
              ),

              requestedExpiresAt:
                toIsoDateTime(
                  readString(
                    formData,
                    "requestedExpiresAt",
                  ),
                ),
            });

        if (!parsed.success) {
          setFieldErrors(
            issuesToFieldErrors(
              parsed.error.issues,
            ),
          );

          throw new Error(
            "Review the highlighted support-request fields.",
          );
        }

        await service
          .requestPlatformSupportAccess(
            scope,
            {
              platformUserId:
                platformSession.userId,

              ...parsed.data,
            },
          );

        await refresh();

        form.reset();

        setPanel(
          "sessions",
        );

        return "Support access requested and recorded in the tenant audit history.";
      },
    );
  }

  async function decideAccess(
    event:
      FormEvent<HTMLFormElement>,
    supportSession:
      SupportAccessSession,
  ): Promise<void> {
    event.preventDefault();

    const form =
      event.currentTarget;

    const formData =
      new FormData(form);

    await runTask(
      async () => {
        const decisionActorUserId =
          readString(
            formData,
            "decisionActorUserId",
          );

        if (
          decisionActorUserId ===
          ""
        ) {
          setFieldErrors({
            decisionActorUserId:
              "Enter the deciding platform user ID.",
          });

          throw new Error(
            "A separate decision actor is required.",
          );
        }

        const expiry =
          readOptionalString(
            formData,
            "expiresAt",
          );

        const parsed =
          platformSupportAccessDecisionFormSchema
            .safeParse({
              decision:
                readString(
                  formData,
                  "decision",
                ),

              reason:
                readString(
                  formData,
                  "reason",
                ),

              ...(
                expiry ===
                undefined
                  ? {}
                  : {
                      expiresAt:
                        toIsoDateTime(
                          expiry,
                        ),
                    }
              ),
            });

        if (!parsed.success) {
          setFieldErrors(
            issuesToFieldErrors(
              parsed.error.issues,
            ),
          );

          throw new Error(
            "Review the highlighted decision fields.",
          );
        }

        await service
          .decidePlatformSupportAccess(
            scope,
            {
              supportAccessSessionId:
                supportSession.id,

              decisionActorUserId,

              ...parsed.data,
            },
          );

        await refresh();

        form.reset();

        setDecidingSessionId(
          undefined,
        );

        return parsed.data.decision ===
          "approve"
          ? "Support access approved but not yet activated."
          : "Support access rejected.";
      },
    );
  }

  async function activateAccess(
    supportSession:
      SupportAccessSession,
  ): Promise<void> {
    await runTask(
      async () => {
        await service
          .activatePlatformSupportAccess(
            scope,
            supportSession.id,
            platformSession.userId,
          );

        await refresh();

        return "Support access activated for its approved time window.";
      },
    );
  }

  async function revokeAccess(
    event:
      FormEvent<HTMLFormElement>,
    supportSession:
      SupportAccessSession,
  ): Promise<void> {
    event.preventDefault();

    const form =
      event.currentTarget;

    const formData =
      new FormData(form);

    await runTask(
      async () => {
        const parsed =
          platformSupportAccessRevocationFormSchema
            .safeParse({
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
            "Review the highlighted revocation fields.",
          );
        }

        await service
          .revokePlatformSupportAccess(
            scope,
            {
              supportAccessSessionId:
                supportSession.id,

              actorUserId:
                platformSession.userId,

              ...parsed.data,
            },
          );

        await refresh();

        form.reset();

        setRevokingSessionId(
          undefined,
        );

        return "Support access revoked and recorded.";
      },
    );
  }

  async function recordUse(
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
        if (
          selectedUseSession ===
          undefined
        ) {
          throw new Error(
            "Select an active support session owned by the current platform user.",
          );
        }

        const permissionCode =
          readString(
            formData,
            "permissionCode",
          ) as PermissionCode;

        if (
          !selectedUseSession
            .allowedPermissionCodes
            .includes(
              permissionCode,
            )
        ) {
          throw new Error(
            "The selected support session does not allow that permission.",
          );
        }

        const resourceType =
          readString(
            formData,
            "resourceType",
          );

        const reason =
          readString(
            formData,
            "reason",
          );

        if (
          resourceType ===
          "" ||
          reason ===
          ""
        ) {
          throw new Error(
            "Resource type and access reason are required.",
          );
        }

        await service
          .recordPlatformSupportAccessUse(
            scope,
            {
              supportAccessSessionId:
                selectedUseSession.id,

              platformUserId:
                platformSession.userId,

              permissionCode,

              resourceType,

              resourceId:
                readOptionalString(
                  formData,
                  "resourceId",
                ),

              reason,
            },
          );

        await refresh();

        form.reset();

        setUseSessionId(
          undefined,
        );

        return "Authorized resource access recorded in the append-only support audit.";
      },
    );
  }

  return (
    <section className="mt-6 border-t border-slate-200 pt-6">
      <div>
        <h3 className="text-xl font-black text-slate-950">
          Support access
        </h3>

        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          Support access is explicit, temporary and audited. Creating
          or activating a session does not silently expose tenant
          records; each resource access must still be authorized and
          recorded.
        </p>
      </div>

      <nav
        aria-label="Support access sections"
        className="mt-5 flex gap-2 overflow-x-auto pb-2"
      >
        {[
          [
            "sessions",
            "Sessions",
          ],
          [
            "request",
            "Request access",
          ],
          [
            "record-use",
            "Record access",
          ],
          [
            "audit",
            "Audit history",
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
                    SupportPanel,
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
      "sessions" ? (
        <div className="mt-5 space-y-4">
          {sessions.length ===
          0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
              <div className="font-black text-slate-900">
                No support sessions
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Tenant access cannot occur until an explicit request is
                created.
              </p>
            </div>
          ) : (
            sessions.map(
              (
                supportSession,
              ) => {
                const effectiveStatus =
                  getEffectiveStatus(
                    supportSession,
                  );

                const belongsToCurrentUser =
                  supportSession
                    .platformUserId ===
                  platformSession.userId;

                return (
                  <article
                    className="rounded-2xl border border-slate-200 p-4"
                    key={
                      supportSession.id
                    }
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <code className="text-sm font-bold text-slate-900">
                            {
                              supportSession.id
                            }
                          </code>

                          <StatusBadge
                            session={
                              supportSession
                            }
                          />
                        </div>

                        <p className="mt-2 text-sm text-slate-700">
                          {
                            supportSession.requestedReason
                          }
                        </p>

                        <p className="mt-2 text-xs text-slate-500">
                          Requested by{" "}
                          {
                            supportSession.platformUserId
                          }
                          {" · "}
                          {supportSession
                            .allowedPermissionCodes
                            .length}{" "}
                          permissions
                          {" · expires "}
                          {formatDateTime(
                            supportSession.expiresAt,
                          )}
                        </p>
                      </div>

                      {belongsToCurrentUser ? (
                        <span className="self-start rounded-full bg-violet-100 px-2 py-1 text-[11px] font-bold text-violet-800">
                          Current operator
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {supportSession
                        .allowedPermissionCodes
                        .map(
                          (
                            permission,
                          ) => (
                            <code
                              className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700"
                              key={
                                permission
                              }
                            >
                              {
                                permission
                              }
                            </code>
                          ),
                        )}
                    </div>

                    {effectiveStatus ===
                    "requested" ? (
                      decidingSessionId ===
                      supportSession.id ? (
                        <form
                          className="mt-4 space-y-4 rounded-xl border border-blue-200 bg-blue-50 p-4"
                          onSubmit={(event) => {
                            void decideAccess(
                              event,
                              supportSession,
                            );
                          }}
                        >
                          <Field
                            error={
                              fieldErrors
                                .decisionActorUserId
                            }
                            hint="Approval cannot be performed by the requesting user"
                            label="Decision actor user ID"
                          >
                            <input
                              className={
                                INPUT_CLASS_NAME
                              }
                              name="decisionActorUserId"
                              required
                            />
                          </Field>

                          <Field
                            error={
                              fieldErrors.decision
                            }
                            label="Decision"
                          >
                            <select
                              className={
                                INPUT_CLASS_NAME
                              }
                              name="decision"
                              required
                            >
                              <option value="">
                                Select…
                              </option>

                              <option value="approve">
                                Approve
                              </option>

                              <option value="reject">
                                Reject
                              </option>
                            </select>
                          </Field>

                          <Field
                            error={
                              fieldErrors.expiresAt
                            }
                            hint="Required when approving"
                            label="Approved expiry"
                          >
                            <input
                              className={
                                INPUT_CLASS_NAME
                              }
                              name="expiresAt"
                              type="datetime-local"
                            />
                          </Field>

                          <Field
                            error={
                              fieldErrors.reason
                            }
                            label="Decision reason"
                          >
                            <textarea
                              className={
                                TEXTAREA_CLASS_NAME
                              }
                              name="reason"
                              required
                            />
                          </Field>

                          <div className="flex gap-2">
                            <button
                              className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold"
                              onClick={() => {
                                setDecidingSessionId(
                                  undefined,
                                );
                              }}
                              type="button"
                            >
                              Cancel
                            </button>

                            <button
                              className="h-10 rounded-xl bg-blue-700 px-4 text-sm font-bold text-white disabled:opacity-50"
                              disabled={busy}
                              type="submit"
                            >
                              Save decision
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          className="mt-4 h-10 rounded-xl border border-blue-300 px-4 text-sm font-bold text-blue-800"
                          onClick={() => {
                            setDecidingSessionId(
                              supportSession.id,
                            );
                          }}
                          type="button"
                        >
                          Record decision
                        </button>
                      )
                    ) : null}

                    {effectiveStatus ===
                      "approved" &&
                    belongsToCurrentUser ? (
                      <button
                        className="mt-4 h-10 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white disabled:opacity-50"
                        disabled={busy}
                        onClick={() => {
                          void activateAccess(
                            supportSession,
                          );
                        }}
                        type="button"
                      >
                        Activate approved access
                      </button>
                    ) : null}

                    {effectiveStatus ===
                    "approved" &&
                    !belongsToCurrentUser ? (
                      <p className="mt-4 text-sm font-semibold text-amber-700">
                        Only the requesting platform user may activate
                        this session.
                      </p>
                    ) : null}

                    {effectiveStatus ===
                    "active" ? (
                      revokingSessionId ===
                      supportSession.id ? (
                        <form
                          className="mt-4 space-y-4 rounded-xl border border-red-200 bg-red-50 p-4"
                          onSubmit={(event) => {
                            void revokeAccess(
                              event,
                              supportSession,
                            );
                          }}
                        >
                          <Field
                            error={
                              fieldErrors.confirmation
                            }
                            hint={`Type exactly: ${supportSession.id}`}
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
                            label="Revocation reason"
                          >
                            <textarea
                              className={
                                TEXTAREA_CLASS_NAME
                              }
                              name="reason"
                              required
                            />
                          </Field>

                          <div className="flex gap-2">
                            <button
                              className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold"
                              onClick={() => {
                                setRevokingSessionId(
                                  undefined,
                                );
                              }}
                              type="button"
                            >
                              Cancel
                            </button>

                            <button
                              className="h-10 rounded-xl bg-red-700 px-4 text-sm font-bold text-white disabled:opacity-50"
                              disabled={busy}
                              type="submit"
                            >
                              Revoke access
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          className="mt-4 h-10 rounded-xl border border-red-300 px-4 text-sm font-bold text-red-700"
                          onClick={() => {
                            setRevokingSessionId(
                              supportSession.id,
                            );
                          }}
                          type="button"
                        >
                          Revoke active access
                        </button>
                      )
                    ) : null}
                  </article>
                );
              },
            )
          )}
        </div>
      ) : null}

      {panel ===
      "request" ? (
        <form
          className="mt-5 space-y-5 rounded-2xl border border-violet-200 bg-violet-50 p-5"
          onSubmit={(event) => {
            void requestAccess(
              event,
            );
          }}
        >
          <div>
            <h4 className="text-lg font-black text-slate-950">
              Request tenant support access
            </h4>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              Permission and branch values are entered explicitly.
              WonFlow does not assume which tenant resources support
              staff may access.
            </p>
          </div>

          <Field
            error={
              fieldErrors.requestedReason
            }
            label="Support reason"
          >
            <textarea
              className={
                TEXTAREA_CLASS_NAME
              }
              name="requestedReason"
              required
            />
          </Field>

          <Field
            error={
              fieldErrors.allowedPermissionCodes
            }
            hint="One PermissionCode per line"
            label="Allowed permission codes"
          >
            <textarea
              className={
                TEXTAREA_CLASS_NAME
              }
              name="allowedPermissionCodes"
              placeholder={[
                "patient.read",
                "document.read",
              ].join("\n")}
              required
            />
          </Field>

          <Field
            error={
              fieldErrors.allowedBranchIds
            }
            hint="Optional, one branch ID per line"
            label="Allowed branch IDs"
          >
            <textarea
              className={
                TEXTAREA_CLASS_NAME
              }
              name="allowedBranchIds"
            />
          </Field>

          <Field
            error={
              fieldErrors.requestedExpiresAt
            }
            label="Requested expiry"
          >
            <input
              className={
                INPUT_CLASS_NAME
              }
              name="requestedExpiresAt"
              required
              type="datetime-local"
            />
          </Field>

          <button
            className="h-11 rounded-xl bg-violet-700 px-5 text-sm font-bold text-white disabled:opacity-50"
            disabled={busy}
            type="submit"
          >
            {busy
              ? "Requesting…"
              : "Request support access"}
          </button>
        </form>
      ) : null}

      {panel ===
      "record-use" ? (
        <form
          className="mt-5 space-y-5"
          onSubmit={(event) => {
            void recordUse(
              event,
            );
          }}
        >
          <div>
            <h4 className="text-lg font-black text-slate-950">
              Record authorized resource access
            </h4>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              This mock operation verifies the active support session
              and appends the audit event. It does not render tenant
              clinical data in the platform console.
            </p>
          </div>

          {activeOwnSessions.length ===
          0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
              <div className="font-black text-slate-900">
                No active session for this operator
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Request, approve and activate support access first.
              </p>
            </div>
          ) : (
            <>
              <Field label="Support session">
                <select
                  className={
                    INPUT_CLASS_NAME
                  }
                  onChange={(event) => {
                    setUseSessionId(
                      event.target.value ===
                      ""
                        ? undefined
                        : event.target.value,
                    );
                  }}
                  value={
                    useSessionId ??
                    ""
                  }
                >
                  <option value="">
                    Select…
                  </option>

                  {activeOwnSessions.map(
                    (
                      supportSession,
                    ) => (
                      <option
                        key={
                          supportSession.id
                        }
                        value={
                          supportSession.id
                        }
                      >
                        {
                          supportSession.id
                        }
                        {" — expires "}
                        {formatDateTime(
                          supportSession.expiresAt,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="Permission used">
                <select
                  className={
                    INPUT_CLASS_NAME
                  }
                  disabled={
                    selectedUseSession ===
                    undefined
                  }
                  name="permissionCode"
                  required
                >
                  <option value="">
                    Select…
                  </option>

                  {selectedUseSession
                    ?.allowedPermissionCodes
                    .map(
                      (
                        permission,
                      ) => (
                        <option
                          key={
                            permission
                          }
                          value={
                            permission
                          }
                        >
                          {
                            permission
                          }
                        </option>
                      ),
                    )}
                </select>
              </Field>

              <Field label="Resource type">
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  name="resourceType"
                  placeholder="document"
                  required
                />
              </Field>

              <Field
                hint="Optional"
                label="Resource ID"
              >
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  name="resourceId"
                />
              </Field>

              <Field label="Reason for opening this resource">
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
                disabled={
                  busy ||
                  selectedUseSession ===
                    undefined
                }
                type="submit"
              >
                Record authorized access
              </button>
            </>
          )}
        </form>
      ) : null}

      {panel ===
      "audit" ? (
        <div className="mt-5">
          {overview
            .supportAccessAuditEvents
            .length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
              <div className="font-black text-slate-900">
                No support audit events
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-black text-slate-700">
                      Event
                    </th>
                    <th className="px-4 py-3 font-black text-slate-700">
                      Session
                    </th>

                    <th className="px-4 py-3 font-black text-slate-700">
                      Actor
                    </th>

                    <th className="px-4 py-3 font-black text-slate-700">
                      Resource
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
                  {[...
                    overview
                      .supportAccessAuditEvents,
                  ]
                    .sort(
                      (
                        left,
                        right,
                      ) =>
                        right.occurredAt
                          .localeCompare(
                            left.occurredAt,
                          ),
                    )
                    .map(
                      (event) => (
                        <tr
                          key={
                            event.id
                          }
                        >
                          <td className="px-4 py-3 font-bold text-slate-900">
                            {titleCase(
                              event.type,
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <code className="text-xs text-slate-600">
                              {
                                event.supportAccessSessionId
                              }
                            </code>
                          </td>

                          <td className="px-4 py-3">
                            <code className="text-xs text-slate-600">
                              {
                                event.platformUserId
                              }
                            </code>
                          </td>

                          <td className="px-4 py-3 text-slate-600">
                            {event.resourceType ===
                            undefined
                              ? "Not applicable"
                              : [
                                  event.resourceType,
                                  event.resourceId,
                                  event.permissionCode,
                                ]
                                  .filter(
                                    (
                                      value,
                                    ) =>
                                      value !==
                                      undefined,
                                  )
                                  .join(" · ")}
                          </td>

                          <td className="max-w-sm px-4 py-3 text-slate-600">
                            {event.reason ??
                              "No reason recorded"}
                          </td>

                          <td className="px-4 py-3 text-slate-600">
                            {formatDateTime(
                              event.occurredAt,
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
