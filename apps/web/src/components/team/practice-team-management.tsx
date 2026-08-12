"use client";

/**
 * Owner-facing team, permission, patient-access and message-triage
 * management.
 *
 * Every persisted change uses WonFlowPracticeService. UI authorization
 * resolves through the practice-session privilege helper.
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
  canPracticeTeamMemberAccessPatient,
  getPracticeRoleDefaultPrivileges,
  hasPracticePrivilege,
  resolvePracticeTeamMemberPrivileges,
  WONFLOW_PRACTICE_PRIVILEGES,
} from "@wonflow/contracts";

import type {
  PracticeLocation,
  PracticeMessageTriageRule,
  PracticePrivilege,
  PracticeRoleCode,
  PracticeTeamInvitation,
  PracticeTeamMember,
  WonFlowId,
} from "@wonflow/contracts";

import {
  createWonFlowMockSessionService,
  hasWonFlowPracticeSessionPrivilege,
  WONFLOW_DEMO_ANCHOR_DATE_TIME,
} from "@wonflow/mock-data";

import {
  resolveProposedPracticePrivileges,
  wouldRemoveLastActiveTeamManager,
} from "./team-management-safety";
import { TeamPermissionPreview } from "./team-permission-preview";

import type {
  PracticePatientAccessView,
  PracticePrivilegeOverrideCandidate,
  PracticeTeamManagementView,
  WonFlowMockSession,
} from "@wonflow/mock-data";

import {
  practiceMessageTriageRuleFormSchema,
  practicePrivilegeOverrideFormSchema,
  practiceTeamInvitationFormSchema,
  practiceTeamMemberFormSchema,
} from "@wonflow/validation";

import {
  useWonFlowApplication,
} from "@/app/_providers";

import {
  createPrivilegeSelections,
  formatDateTime,
  formatIssues,
  INVITABLE_ROLE_OPTIONS,
  PATIENT_ACCESS_OPTIONS,
  PRACTICE_ROLE_OPTIONS,
  privilegeLabel,
  resolveProjectedPrivileges,
  SUPERVISION_OPTIONS,
  titleCase,
  toDateTimeLocal,
  toIsoDateTime,
} from "./team-management-helpers";

import type {
  PrivilegeSelection,
  PrivilegeSelectionMap,
} from "./team-management-helpers";

type TeamPanel =
  | "members"
  | "invitations"
  | "permissions"
  | "patient-access"
  | "triage";

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

function readBoolean(
  formData: FormData,
  key: string,
): boolean {
  return (
    formData.get(key) ===
    "on"
  );
}

function statusClasses(
  status: string,
): string {
  switch (status) {
    case "active":
    case "accepted":
      return "bg-emerald-100 text-emerald-800";

    case "pending":
    case "suspended":
      return "bg-amber-100 text-amber-800";

    case "revoked":
    case "inactive":
      return "bg-red-100 text-red-800";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function PermissionPreview({
  privileges,
  warning,
}: {
  privileges:
    readonly PracticePrivilege[];
  warning?: string;
}) {
  return (
    <TeamPermissionPreview
      privileges={privileges}
      warning={warning}
    />
  );
}

interface MemberEditorProps {
  member:
    PracticeTeamMember;

  ownerTeamMemberId:
    WonFlowId;

  members:
    PracticeTeamMember[];

  locations:
    PracticeLocation[];

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

function MemberEditor({
  member,
  ownerTeamMemberId,
  members,
  locations,
  busy,
  onCancel,
  onSubmit,
}: MemberEditorProps) {
  const [
    roleCode,
    setRoleCode,
  ] = useState<
    PracticeRoleCode
  >(
    member.roleCode,
  );

  const [
    supervisionLevel,
    setSupervisionLevel,
  ] = useState(
    member.supervisionLevel,
  );

  const [
    allLocations,
    setAllLocations,
  ] = useState(
    member.allPracticeLocations,
  );

  const isOwner =
    member.id ===
    ownerTeamMemberId;

  const projectedPrivileges =
    useMemo(
      () =>
        resolvePracticeTeamMemberPrivileges(
          {
            ...member,
            roleCode,
          },
          WONFLOW_DEMO_ANCHOR_DATE_TIME,
        ),
      [
        member,
        roleCode,
      ],
    );

  const supervisorOptions =
    members.filter(
      (candidate) =>
        candidate.id !==
          member.id &&
        candidate.status ===
          "active" &&
        candidate.supervisionLevel ===
          "independent" &&
        hasPracticePrivilege(
          candidate,
          "consultations.countersign",
          WONFLOW_DEMO_ANCHOR_DATE_TIME,
        ),
    );

  return (
    <form
      className="space-y-5"
      key={member.id}
      onSubmit={onSubmit}
    >
      {isOwner ? (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm font-semibold text-violet-900">
          This is the care team’s explicit owner. The owner role and
          active membership status are protected.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Display name">
          <input
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              member.displayName
            }
            name="displayName"
            required
          />
        </Field>

        <Field label="User ID">
          <input
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              member.userId
            }
            disabled
          />
        </Field>

        <Field
          hint="Optional"
          label="Practitioner ID"
        >
          <input
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              member.practitionerId
            }
            name="practitionerId"
          />
        </Field>

        <Field label="Role">
          <select
            className={
              INPUT_CLASS_NAME
            }
            disabled={isOwner}
            name="roleCode"
            onChange={(
              event,
            ) => {
              setRoleCode(
                event.target
                  .value as
                  PracticeRoleCode,
              );
            }}
            value={roleCode}
          >
            {PRACTICE_ROLE_OPTIONS
              .filter(
                ([candidate]) =>
                  isOwner ||
                  candidate !==
                    "owner",
              )
              .map(
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

        <Field label="Supervision">
          <select
            className={
              INPUT_CLASS_NAME
            }
            name="supervisionLevel"
            onChange={(
              event,
            ) => {
              setSupervisionLevel(
                event.target.value as
                  typeof member.supervisionLevel,
              );
            }}
            value={
              supervisionLevel
            }
          >
            {SUPERVISION_OPTIONS.map(
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

        <Field label="Patient access">
          <select
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              member.patientAccessScope
            }
            name="patientAccessScope"
          >
            {PATIENT_ACCESS_OPTIONS.map(
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

        {supervisionLevel ===
        "countersigned" ? (
          <Field label="Supervisor">
            <select
              className={
                INPUT_CLASS_NAME
              }
              defaultValue={
                member.supervisorTeamMemberId ??
                ""
              }
              name="supervisorTeamMemberId"
              required
            >
              <option value="">
                Select…
              </option>

              {supervisorOptions.map(
                (candidate) => (
                  <option
                    key={
                      candidate.id
                    }
                    value={
                      candidate.id
                    }
                  >
                    {
                      candidate.displayName
                    }
                  </option>
                ),
              )}
            </select>
          </Field>
        ) : null}

        <Field label="Membership status">
          <select
            className={
              INPUT_CLASS_NAME
            }
            defaultValue={
              member.status
            }
            disabled={isOwner}
            name="status"
          >
            <option value="active">
              Active
            </option>

            <option value="suspended">
              Suspended
            </option>

            <option value="inactive">
              Inactive
            </option>
          </select>
        </Field>
      </div>

      <fieldset className="rounded-2xl border border-slate-200 p-4">
        <legend className="px-2 text-sm font-black text-slate-900">
          Location assignments
        </legend>

        <label className={CHECKBOX_CLASS_NAME}>
          <input
            checked={allLocations}
            name="allPracticeLocations"
            onChange={(
              event,
            ) => {
              setAllLocations(
                event.target.checked,
              );
            }}
            type="checkbox"
          />

          All current practice locations
        </label>

        {!allLocations ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {locations
              .filter(
                (location) =>
                  location.status !==
                  "archived",
              )
              .map(
                (location) => (
                  <label
                    className={
                      CHECKBOX_CLASS_NAME
                    }
                    key={
                      location.id
                    }
                  >
                    <input
                      defaultChecked={
                        member.practiceLocationIds.includes(
                          location.id,
                        )
                      }
                      name="practiceLocationIds"
                      type="checkbox"
                      value={
                        location.id
                      }
                    />

                    {
                      location.name
                    }
                  </label>
                ),
              )}
          </div>
        ) : null}
      </fieldset>

      <label className={CHECKBOX_CLASS_NAME}>
        <input
          defaultChecked={
            member.independentlyBookable
          }
          name="independentlyBookable"
          type="checkbox"
        />

        May be booked directly
      </label>

      <PermissionPreview
        privileges={
          projectedPrivileges
        }
      />

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
            : "Save member"}
        </button>
      </div>
    </form>
  );
}

interface PermissionEditorProps {
  member:
    PracticeTeamMember;

  members:
    readonly PracticeTeamMember[];

  busy:
    boolean;

  onCancel:
    () => void;

  onSave:
    (
      overrides:
        PracticePrivilegeOverrideCandidate[],
    ) => Promise<void>;
}

function PermissionEditor({
  member,
  members,
  busy,
  onCancel,
  onSave,
}: PermissionEditorProps) {
  const [
    selections,
    setSelections,
  ] = useState<
    PrivilegeSelectionMap
  >(
    () =>
      createPrivilegeSelections(
        member,
        WONFLOW_DEMO_ANCHOR_DATE_TIME,
      ),
  );

  const [
    reason,
    setReason,
  ] = useState("");

  const [
    effectiveTo,
    setEffectiveTo,
  ] = useState("");

  const projectedPrivileges =
    useMemo(
      () =>
        resolveProjectedPrivileges(
          member.roleCode,
          selections,
        ),
      [
        member.roleCode,
        selections,
      ],
    );

  const lastManagerWarning =
    wouldRemoveLastActiveTeamManager({
      members,
      targetMemberId: member.id,
      nextPrivileges: projectedPrivileges,
      at: WONFLOW_DEMO_ANCHOR_DATE_TIME,
    })
      ? "Saving this configuration would remove the organization’s final active team manager."
      : undefined;

  const defaultPrivileges =
    useMemo(
      () =>
        new Set(
          getPracticeRoleDefaultPrivileges(
            member.roleCode,
          ),
        ),
      [member.roleCode],
    );

  async function save():
    Promise<void> {
    const trimmedReason =
      reason.trim();

    const selectedOverrides =
      WONFLOW_PRACTICE_PRIVILEGES
        .filter(
          (privilege) =>
            selections[
              privilege
            ] !==
            "default",
        );

    const currentlyOverridden =
      member.privilegeOverrides.some(
        (override) =>
          override.effectiveFrom <=
            WONFLOW_DEMO_ANCHOR_DATE_TIME &&
          (
            override.effectiveTo ===
              undefined ||
            override.effectiveTo >=
              WONFLOW_DEMO_ANCHOR_DATE_TIME
          ),
      );

    if (
      (
        selectedOverrides.length >
          0 ||
        currentlyOverridden
      ) &&
      trimmedReason === ""
    ) {
      throw new Error(
        "Enter a reason for the permission change.",
      );
    }

    const expiry =
      effectiveTo === ""
        ? undefined
        : toIsoDateTime(
            effectiveTo,
          );

    const overrides:
      PracticePrivilegeOverrideCandidate[] =
      [];

    for (
      const privilege of
      selectedOverrides
    ) {
      const effect =
        selections[
          privilege
        ];

      if (
        effect !== "allow" &&
        effect !== "deny"
      ) {
        continue;
      }

      const parsed =
        practicePrivilegeOverrideFormSchema
          .safeParse({
            privilege,

            effect,

            reason:
              trimmedReason,

            effectiveTo:
              expiry,
          });

      if (!parsed.success) {
        throw new Error(
          formatIssues(
            parsed.error.issues,
          ),
        );
      }

      overrides.push(
        parsed.data,
      );
    }

    await onSave(
      overrides,
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="text-xs font-black uppercase tracking-wide text-slate-500">
          Member
        </div>

        <div className="mt-1 text-lg font-black text-slate-950">
          {member.displayName}
        </div>

        <div className="mt-1 text-sm text-slate-600">
          Role defaults:{" "}
          {titleCase(
            member.roleCode,
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-black text-slate-700">
                Permission
              </th>

              <th className="px-4 py-3 font-black text-slate-700">
                Role default
              </th>

              <th className="px-4 py-3 font-black text-slate-700">
                Member setting
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {WONFLOW_PRACTICE_PRIVILEGES.map(
              (privilege) => (
                <tr key={privilege}>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900">
                      {
                        privilegeLabel(
                          privilege,
                        )
                      }
                    </div>

                    <code className="text-xs text-slate-500">
                      {privilege}
                    </code>
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {defaultPrivileges.has(
                      privilege,
                    )
                      ? "Allowed"
                      : "Not granted"}
                  </td>

                  <td className="px-4 py-3">
                    <select
                      className={
                        INPUT_CLASS_NAME
                      }
                      onChange={(
                        event,
                      ) => {
                        setSelections(
                          (
                            current,
                          ) => ({
                            ...current,

                            [privilege]:
                              event
                                .target
                                .value as
                                PrivilegeSelection,
                          }),
                        );
                      }}
                      value={
                        selections[
                          privilege
                        ] ??
                        "default"
                      }
                    >
                      <option value="default">
                        Use role default
                      </option>

                      <option value="allow">
                        Explicitly allow
                      </option>

                      <option value="deny">
                        Explicitly deny
                      </option>
                    </select>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Reason for permission change">
          <textarea
            className={
              TEXTAREA_CLASS_NAME
            }
            onChange={(
              event,
            ) => {
              setReason(
                event.target.value,
              );
            }}
            value={reason}
          />
        </Field>

        <Field
          hint="Optional"
          label="Override expiry"
        >
          <input
            className={
              INPUT_CLASS_NAME
            }
            onChange={(
              event,
            ) => {
              setEffectiveTo(
                event.target.value,
              );
            }}
            type="datetime-local"
            value={
              effectiveTo
            }
          />
        </Field>
      </div>

      <PermissionPreview
        privileges={
          projectedPrivileges
        }
        warning={lastManagerWarning}
      />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
          onClick={() => {
            void save();
          }}
          type="button"
        >
          {busy
            ? "Saving…"
            : "Save permission overrides"}
        </button>
      </div>
    </div>
  );
}

export function PracticeTeamManagement() {
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
      [
        practiceService,
      ],
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
    actorTeamMemberId,
    setActorTeamMemberId,
  ] = useState<
    WonFlowId | undefined
  >();

  const [
    careTeamId,
    setCareTeamId,
  ] = useState<
    WonFlowId | undefined
  >();

  const [
    canManage,
    setCanManage,
  ] = useState<
    boolean | undefined
  >();

  const [
    view,
    setView,
  ] = useState<
    PracticeTeamManagementView | undefined
  >();

  const [
    panel,
    setPanel,
  ] = useState<
    TeamPanel
  >("members");

  const [
    editingMemberId,
    setEditingMemberId,
  ] = useState<
    WonFlowId | undefined
  >();

  const [
    permissionMemberId,
    setPermissionMemberId,
  ] = useState<
    WonFlowId | undefined
  >();

  const [
    showInvitationForm,
    setShowInvitationForm,
  ] = useState(false);

  const [
    invitationRole,
    setInvitationRole,
  ] = useState("");

  const [
    invitationSupervision,
    setInvitationSupervision,
  ] = useState("");

  const [
    invitationAllLocations,
    setInvitationAllLocations,
  ] = useState(false);

  const [
    revokingInvitationId,
    setRevokingInvitationId,
  ] = useState<
    WonFlowId | undefined
  >();

  const [
    revocationReason,
    setRevocationReason,
  ] = useState("");

  const [
    patientAccess,
    setPatientAccess,
  ] = useState<
    PracticePatientAccessView | undefined
  >();

  const [
    endingAssignmentId,
    setEndingAssignmentId,
  ] = useState<
    WonFlowId | undefined
  >();

  const [
    assignmentEndReason,
    setAssignmentEndReason,
  ] = useState("");

  const [
    editingTriageRuleId,
    setEditingTriageRuleId,
  ] = useState<
    WonFlowId | undefined
  >();

  const [
    showTriageForm,
    setShowTriageForm,
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

  async function refreshView(
    resolvedTenant =
      tenant,
    resolvedCareTeamId =
      careTeamId,
    resolvedActorId =
      actorTeamMemberId,
  ): Promise<void> {
    if (
      resolvedTenant ===
        undefined ||
      resolvedCareTeamId ===
        undefined ||
      resolvedActorId ===
        undefined
    ) {
      return;
    }

    const result =
      await practiceService
        .getPracticeTeamManagementView(
          resolvedTenant.scope,
          resolvedCareTeamId,
          resolvedActorId,
        );

    setView(result);

    setPermissionMemberId(
      (
        current,
      ) =>
        current ??
        result.team.careTeam
          .ownerTeamMemberId,
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
            careTeamPage,
            memberPage,
          ] = await Promise.all([
            practiceService
              .careTeams
              .list(
                resolvedTenant.scope,
                {
                  limit: 1_000,
                },
              ),

            practiceService
              .teamMembers
              .list(
                resolvedTenant.scope,
                {
                  limit: 1_000,
                },
              ),
          ]);

          const actor =
            memberPage.items.find(
              (member) =>
                member.userId ===
                  resolvedTenant
                    .ownerUserId &&
                member.status ===
                  "active",
            );

          if (
            actor === undefined
          ) {
            if (active) {
              setTenant(
                resolvedTenant,
              );

              setCanManage(
                false,
              );

              setErrorMessage(
                "Complete the owner-team setup before managing team permissions.",
              );
            }

            return;
          }

          const careTeam =
            careTeamPage.items.find(
              (candidate) =>
                candidate.id ===
                actor.careTeamId,
            );

          if (
            careTeam === undefined
          ) {
            throw new Error(
              "The owner team could not be resolved.",
            );
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
                    actor.id,

                  at:
                    WONFLOW_DEMO_ANCHOR_DATE_TIME,
                },
              );

          const allowed =
            hasWonFlowPracticeSessionPrivilege(
              resolvedSession,
              "team.manage",
              WONFLOW_DEMO_ANCHOR_DATE_TIME,
            );

          if (!active) {
            return;
          }

          setTenant(
            resolvedTenant,
          );

          setSession(
            resolvedSession,
          );

          setActorTeamMemberId(
            actor.id,
          );

          setCareTeamId(
            careTeam.id,
          );

          setCanManage(
            allowed,
          );

          if (allowed) {
            const result =
              await practiceService
                .getPracticeTeamManagementView(
                  resolvedTenant.scope,
                  careTeam.id,
                  actor.id,
                );

            if (!active) {
              return;
            }

            setView(result);

            setPermissionMemberId(
              (current) =>
                current ??
                result.team.careTeam
                  .ownerTeamMemberId,
            );
          }
        } catch (error) {
          if (active) {
            setErrorMessage(
              error instanceof Error
                ? error.message
                : "Team management could not be loaded.",
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
          : "The team-management change could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  const editingMember =
    view?.team.members.find(
      (member) =>
        member.id ===
        editingMemberId,
    );

  const permissionMember =
    view?.team.members.find(
      (member) =>
        member.id ===
        permissionMemberId,
    );

  const editingTriageRule =
    view?.triageRules.find(
      (rule) =>
        rule.id ===
        editingTriageRuleId,
    );

  const activeMembers =
    view?.team.members.filter(
      (member) =>
        member.status ===
        "active",
    ) ?? [];

  const supervisorOptions =
    activeMembers.filter(
      (member) =>
        member.supervisionLevel ===
          "independent" &&
        hasPracticePrivilege(
          member,
          "consultations.countersign",
          WONFLOW_DEMO_ANCHOR_DATE_TIME,
        ),
    );

  async function saveMember(
    event:
      FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const form =
      event.currentTarget;

    await runTask(
      async () => {
        if (
          tenant ===
            undefined ||
          actorTeamMemberId ===
            undefined ||
          view ===
            undefined ||
          editingMember ===
            undefined
        ) {
          return;
        }

        const formData =
          new FormData(form);

        const isOwner =
          editingMember.id ===
          view.team.careTeam
            .ownerTeamMemberId;

        const allLocations =
          readBoolean(
            formData,
            "allPracticeLocations",
          );

        const supervisionLevel =
          readString(
            formData,
            "supervisionLevel",
          );

        const parsed =
          practiceTeamMemberFormSchema
            .safeParse({
              userId:
                editingMember.userId,

              practitionerId:
                readOptionalString(
                  formData,
                  "practitionerId",
                ),

              displayName:
                readString(
                  formData,
                  "displayName",
                ),

              roleCode:
                isOwner
                  ? editingMember.roleCode
                  : readString(
                      formData,
                      "roleCode",
                    ),

              supervisionLevel,

              patientAccessScope:
                readString(
                  formData,
                  "patientAccessScope",
                ),

              supervisorTeamMemberId:
                supervisionLevel ===
                  "countersigned"
                  ? readOptionalString(
                      formData,
                      "supervisorTeamMemberId",
                    )
                  : undefined,

              allPracticeLocations:
                allLocations,

              practiceLocationIds:
                allLocations
                  ? []
                  : formData
                      .getAll(
                        "practiceLocationIds",
                      )
                      .map(String),

              independentlyBookable:
                readBoolean(
                  formData,
                  "independentlyBookable",
                ),

              status:
                isOwner
                  ? editingMember.status
                  : readString(
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

        await practiceService
          .savePracticeTeamMember(
            tenant.scope,
            {
              teamMemberId:
                editingMember.id,

              actorTeamMemberId,

              member:
                parsed.data,
            },
          );

        await refreshView();

        setEditingMemberId(
          undefined,
        );

        setSuccessMessage(
          "Team member updated.",
        );
      },
    );
  }

  async function inviteMember(
    event:
      FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const form =
      event.currentTarget;

    await runTask(
      async () => {
        if (
          tenant ===
            undefined ||
          actorTeamMemberId ===
            undefined ||
          view ===
            undefined
        ) {
          return;
        }

        const formData =
          new FormData(form);

        const allLocations =
          readBoolean(
            formData,
            "allPracticeLocations",
          );

        const supervisionLevel =
          readString(
            formData,
            "supervisionLevel",
          );

        const parsed =
          practiceTeamInvitationFormSchema
            .safeParse({
              careTeamId:
                view.team.careTeam.id,

              email:
                readString(
                  formData,
                  "email",
                ),

              displayName:
                readString(
                  formData,
                  "displayName",
                ),

              roleCode:
                readString(
                  formData,
                  "roleCode",
                ),

              supervisionLevel,

              patientAccessScope:
                readString(
                  formData,
                  "patientAccessScope",
                ),

              supervisorTeamMemberId:
                supervisionLevel ===
                  "countersigned"
                  ? readOptionalString(
                      formData,
                      "supervisorTeamMemberId",
                    )
                  : undefined,

              allPracticeLocations:
                allLocations,

              practiceLocationIds:
                allLocations
                  ? []
                  : formData
                      .getAll(
                        "practiceLocationIds",
                      )
                      .map(String),

              independentlyBookable:
                readBoolean(
                  formData,
                  "independentlyBookable",
                ),

              invitedByTeamMemberId:
                actorTeamMemberId,

              expiresAt:
                toIsoDateTime(
                  readString(
                    formData,
                    "expiresAt",
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
          .invitePracticeTeamMember(
            tenant.scope,
            parsed.data,
          );

        await refreshView();

        form.reset();

        setInvitationRole("");
        setInvitationSupervision("");
        setInvitationAllLocations(
          false,
        );
        setShowInvitationForm(
          false,
        );

        setSuccessMessage(
          "Team invitation created.",
        );
      },
    );
  }

  async function revokeInvitation(
    invitation:
      PracticeTeamInvitation,
  ): Promise<void> {
    await runTask(
      async () => {
        if (
          tenant ===
            undefined ||
          actorTeamMemberId ===
            undefined
        ) {
          return;
        }

        const reason =
          revocationReason.trim();

        if (reason === "") {
          throw new Error(
            "Enter a revocation reason.",
          );
        }

        await practiceService
          .revokePracticeTeamInvitation(
            tenant.scope,
            {
              invitationId:
                invitation.id,

              actorTeamMemberId,

              reason,
            },
          );

        await refreshView();

        setRevokingInvitationId(
          undefined,
        );

        setRevocationReason("");

        setSuccessMessage(
          "Invitation revoked.",
        );
      },
    );
  }

  async function savePermissions(
    overrides:
      PracticePrivilegeOverrideCandidate[],
  ): Promise<void> {
    await runTask(
      async () => {
        if (
          tenant ===
            undefined ||
          actorTeamMemberId ===
            undefined ||
          permissionMember ===
            undefined ||
          view === undefined
        ) {
          return;
        }

        const nextPrivileges =
          resolveProposedPracticePrivileges(
            permissionMember.roleCode,
            overrides,
          );

        if (
          wouldRemoveLastActiveTeamManager({
            members: view.team.members,
            targetMemberId: permissionMember.id,
            nextPrivileges,
            at: WONFLOW_DEMO_ANCHOR_DATE_TIME,
          })
        ) {
          throw new Error(
            "At least one active team member must retain the team.manage privilege.",
          );
        }

        await practiceService
          .replacePracticePrivilegeOverrides(
            tenant.scope,
            {
              teamMemberId:
                permissionMember.id,

              actorTeamMemberId,

              overrides,
            },
          );

        await refreshView();

        setSuccessMessage(
          "Permission overrides updated.",
        );
      },
    );
  }

  async function loadPatientAccess(
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
          tenant ===
            undefined ||
          careTeamId ===
            undefined ||
          actorTeamMemberId ===
            undefined
        ) {
          return;
        }

        const patientId =
          readString(
            formData,
            "patientId",
          );

        if (patientId === "") {
          throw new Error(
            "Enter a patient ID.",
          );
        }

        const result =
          await practiceService
            .getPracticePatientAccessView(
              tenant.scope,
              careTeamId,
              patientId,
              actorTeamMemberId,
            );

        setPatientAccess(
          result,
        );
      },
    );
  }

  async function endAssignment():
    Promise<void> {
    await runTask(
      async () => {
        if (
          tenant ===
            undefined ||
          endingAssignmentId ===
            undefined
        ) {
          return;
        }

        const reason =
          assignmentEndReason.trim();

        if (reason === "") {
          throw new Error(
            "Enter a reason for ending access.",
          );
        }

        await practiceService
          .endPracticePatientAssignment(
            tenant.scope,
            {
              assignmentId:
                endingAssignmentId,

              actorTeamMemberId:
                actorTeamMemberId as
                  WonFlowId,

              reason,
            },
          );

        if (
          patientAccess !==
            undefined &&
          careTeamId !==
            undefined &&
          actorTeamMemberId !==
            undefined
        ) {
          setPatientAccess(
            await practiceService
              .getPracticePatientAccessView(
                tenant.scope,
                careTeamId,
                patientAccess.patientId,
                actorTeamMemberId,
              ),
          );
        }

        await refreshView();

        setEndingAssignmentId(
          undefined,
        );

        setAssignmentEndReason("");

        setSuccessMessage(
          "Patient assignment ended.",
        );
      },
    );
  }

  async function saveTriageRule(
    event:
      FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const form =
      event.currentTarget;

    await runTask(
      async () => {
        if (
          tenant ===
            undefined ||
          actorTeamMemberId ===
            undefined
        ) {
          return;
        }

        const formData =
          new FormData(form);

        const effectiveTo =
          readOptionalString(
            formData,
            "effectiveTo",
          );

        const parsed =
          practiceMessageTriageRuleFormSchema
            .safeParse({
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

              categoryIds:
                formData
                  .getAll(
                    "categoryIds",
                  )
                  .map(String),

              priorities:
                formData
                  .getAll(
                    "priorities",
                  )
                  .map(String),

              escalateAfterMinutes:
                readInteger(
                  formData,
                  "escalateAfterMinutes",
                ),

              fromTeamMemberId:
                readOptionalString(
                  formData,
                  "fromTeamMemberId",
                ),

              toTeamMemberId:
                readString(
                  formData,
                  "toTeamMemberId",
                ),

              reason:
                readString(
                  formData,
                  "reason",
                ),

              status:
                readString(
                  formData,
                  "status",
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
            });

        if (!parsed.success) {
          throw new Error(
            formatIssues(
              parsed.error.issues,
            ),
          );
        }

        await practiceService
          .savePracticeMessageTriageRule(
            tenant.scope,
            {
              triageRuleId:
                editingTriageRule
                  ?.id,

              actorTeamMemberId,

              rule:
                parsed.data,
            },
          );

        await refreshView();

        setShowTriageForm(
          false,
        );

        setEditingTriageRuleId(
          undefined,
        );

        setSuccessMessage(
          editingTriageRule ===
          undefined
            ? "Message-triage rule created."
            : "Message-triage rule updated.",
        );
      },
    );
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
          Loading team management…
        </div>
      </main>
    );
  }

  if (
    canManage !== true ||
    view === undefined
  ) {
    return (
      <main className="mx-auto max-w-4xl p-4 sm:p-6">
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="text-xs font-extrabold uppercase tracking-wide text-amber-700">
            Access restricted
          </div>

          <h1 className="mt-2 text-2xl font-black text-slate-950">
            Team-management permission is required
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-700">
            The active practice session must hold{" "}
            <code>team.manage</code>.
          </p>

          {session ===
          undefined ? (
            <p className="mt-2 text-sm text-slate-600">
              {errorMessage ??
                "Complete owner-team setup first."}
            </p>
          ) : null}
        </section>
      </main>
    );
  }

  const accessibleMembers =
    patientAccess?.members.filter(
      (member) =>
        canPracticeTeamMemberAccessPatient(
          member,
          patientAccess.activeAssignments,
          patientAccess.patientId,
          WONFLOW_DEMO_ANCHOR_DATE_TIME,
        ),
    ) ?? [];

  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-violet-700">
          Access management
        </div>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
          Team and permissions
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Manage membership, supervision, location assignments,
          individual permission adjustments, patient access and message
          escalation rules.
        </p>

        <nav
          aria-label="Team management sections"
          className="mt-5 flex gap-2 overflow-x-auto pb-2"
        >
          {[
            [
              "members",
              "Members",
            ],
            [
              "invitations",
              "Invitations",
            ],
            [
              "permissions",
              "Permissions",
            ],
            [
              "patient-access",
              "Patient access",
            ],
            [
              "triage",
              "Message triage",
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
                      TeamPanel,
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
        "members" ? (
          <div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  Team members
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Add new people through the invitation workflow.
                </p>
              </div>

              <button
                className="h-10 rounded-xl bg-violet-700 px-4 text-sm font-bold text-white"
                onClick={() => {
                  setPanel(
                    "invitations",
                  );

                  setShowInvitationForm(
                    true,
                  );
                }}
                type="button"
              >
                Invite member
              </button>
            </div>

            {editingMember !==
            undefined ? (
              <div className="mt-6">
                <MemberEditor
                  busy={busy}
                  locations={
                    view.locations
                  }
                  member={
                    editingMember
                  }
                  members={
                    view.team.members
                  }
                  onCancel={() => {
                    setEditingMemberId(
                      undefined,
                    );
                  }}
                  onSubmit={(event) => {
                    void saveMember(
                      event,
                    );
                  }}
                  ownerTeamMemberId={
                    view.team.careTeam
                      .ownerTeamMemberId
                  }
                />
              </div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {view.team.members.map(
                  (member) => {
                    const locationNames =
                      member.allPracticeLocations
                        ? [
                            "All locations",
                          ]
                        : view.locations
                            .filter(
                              (
                                location,
                              ) =>
                                member.practiceLocationIds.includes(
                                  location.id,
                                ),
                            )
                            .map(
                              (
                                location,
                              ) =>
                                location.name,
                            );

                    const supervisor =
                      view.team.members.find(
                        (
                          candidate,
                        ) =>
                          candidate.id ===
                          member.supervisorTeamMemberId,
                      );

                    return (
                      <article
                        className="rounded-2xl border border-slate-200 p-4"
                        key={
                          member.id
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-black text-slate-950">
                              {
                                member.displayName
                              }
                            </h3>

                            <p className="mt-1 text-xs text-slate-500">
                              {titleCase(
                                member.roleCode,
                              )}
                            </p>
                          </div>

                          <span
                            className={[
                              "rounded-full px-2 py-1 text-[11px] font-bold",
                              statusClasses(
                                member.status,
                              ),
                            ].join(" ")}
                          >
                            {titleCase(
                              member.status,
                            )}
                          </span>
                        </div>

                        <dl className="mt-4 space-y-2 text-sm">
                          <div>
                            <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                              Supervision
                            </dt>

                            <dd className="mt-1 font-semibold text-slate-800">
                              {titleCase(
                                member.supervisionLevel,
                              )}
                              {supervisor !==
                              undefined
                                ? ` — ${supervisor.displayName}`
                                : ""}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                              Patient access
                            </dt>

                            <dd className="mt-1 font-semibold text-slate-800">
                              {titleCase(
                                member.patientAccessScope,
                              )}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                              Locations
                            </dt>

                            <dd className="mt-1 font-semibold text-slate-800">
                              {locationNames.length >
                              0
                                ? locationNames.join(
                                    ", ",
                                  )
                                : "No locations assigned"}
                            </dd>
                          </div>
                        </dl>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button
                            className="h-10 rounded-xl border border-slate-300 text-sm font-bold text-slate-700"
                            onClick={() => {
                              setEditingMemberId(
                                member.id,
                              );
                            }}
                            type="button"
                          >
                            Edit
                          </button>

                          <button
                            className="h-10 rounded-xl border border-violet-300 text-sm font-bold text-violet-800"
                            onClick={() => {
                              setPermissionMemberId(
                                member.id,
                              );

                              setPanel(
                                "permissions",
                              );
                            }}
                            type="button"
                          >
                            Permissions
                          </button>
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            )}
          </div>
        ) : null}

        {panel ===
        "invitations" ? (
          <div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  Team invitations
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Invitations precede user and team-member creation.
                </p>
              </div>

              <button
                className="h-10 rounded-xl bg-violet-700 px-4 text-sm font-bold text-white"
                onClick={() => {
                  setShowInvitationForm(
                    true,
                  );
                }}
                type="button"
              >
                New invitation
              </button>
            </div>

            {showInvitationForm ? (
              <form
                className="mt-6 space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                onSubmit={(event) => {
                  void inviteMember(
                    event,
                  );
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Email">
                    <input
                      className={
                        INPUT_CLASS_NAME
                      }
                      name="email"
                      required
                      type="email"
                    />
                  </Field>

                  <Field label="Display name">
                    <input
                      className={
                        INPUT_CLASS_NAME
                      }
                      name="displayName"
                      required
                    />
                  </Field>

                  <Field label="Role">
                    <select
                      className={
                        INPUT_CLASS_NAME
                      }
                      name="roleCode"
                      onChange={(
                        event,
                      ) => {
                        setInvitationRole(
                          event.target.value,
                        );
                      }}
                      required
                      value={
                        invitationRole
                      }
                    >
                      <option value="">
                        Select…
                      </option>

                      {INVITABLE_ROLE_OPTIONS.map(
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

                  <Field label="Supervision">
                    <select
                      className={
                        INPUT_CLASS_NAME
                      }
                      name="supervisionLevel"
                      onChange={(
                        event,
                      ) => {
                        setInvitationSupervision(
                          event.target.value,
                        );
                      }}
                      required
                      value={
                        invitationSupervision
                      }
                    >
                      <option value="">
                        Select…
                      </option>

                      {SUPERVISION_OPTIONS.map(
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

                  <Field label="Patient access">
                    <select
                      className={
                        INPUT_CLASS_NAME
                      }
                      name="patientAccessScope"
                      required
                    >
                      <option value="">
                        Select…
                      </option>

                      {PATIENT_ACCESS_OPTIONS.map(
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

                  {invitationSupervision ===
                  "countersigned" ? (
                    <Field label="Supervisor">
                      <select
                        className={
                          INPUT_CLASS_NAME
                        }
                        name="supervisorTeamMemberId"
                        required
                      >
                        <option value="">
                          Select…
                        </option>

                        {supervisorOptions.map(
                          (
                            member,
                          ) => (
                            <option
                              key={
                                member.id
                              }
                              value={
                                member.id
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
                  ) : null}

                  <Field label="Invitation expires">
                    <input
                      className={
                        INPUT_CLASS_NAME
                      }
                      name="expiresAt"
                      required
                      type="datetime-local"
                    />
                  </Field>
                </div>

                <fieldset className="rounded-2xl border border-slate-200 bg-white p-4">
                  <legend className="px-2 text-sm font-black text-slate-900">
                    Location assignments
                  </legend>

                  <label className={CHECKBOX_CLASS_NAME}>
                    <input
                      checked={
                        invitationAllLocations
                      }
                      name="allPracticeLocations"
                      onChange={(
                        event,
                      ) => {
                        setInvitationAllLocations(
                          event.target.checked,
                        );
                      }}
                      type="checkbox"
                    />

                    All current practice locations
                  </label>

                  {!invitationAllLocations ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {view.locations
                        .filter(
                          (
                            location,
                          ) =>
                            location.status !==
                            "archived",
                        )
                        .map(
                          (
                            location,
                          ) => (
                            <label
                              className={
                                CHECKBOX_CLASS_NAME
                              }
                              key={
                                location.id
                              }
                            >
                              <input
                                name="practiceLocationIds"
                                type="checkbox"
                                value={
                                  location.id
                                }
                              />

                              {
                                location.name
                              }
                            </label>
                          ),
                        )}
                    </div>
                  ) : null}
                </fieldset>

                <label className={CHECKBOX_CLASS_NAME}>
                  <input
                    name="independentlyBookable"
                    type="checkbox"
                  />

                  May be booked directly
                </label>

                {PRACTICE_ROLE_OPTIONS.some(
                  ([role]) =>
                    role ===
                    invitationRole,
                ) ? (
                  <PermissionPreview
                    privileges={getPracticeRoleDefaultPrivileges(
                      invitationRole as
                        PracticeRoleCode,
                    )}
                  />
                ) : null}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    className="h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700"
                    disabled={busy}
                    onClick={() => {
                      setShowInvitationForm(
                        false,
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
                      ? "Creating…"
                      : "Create invitation"}
                  </button>
                </div>
              </form>
            ) : null}

            <div className="mt-6 space-y-3">
              {view.team.invitations.length ===
              0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                  <div className="font-black text-slate-900">
                    No invitations
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    New team members begin through a controlled
                    invitation.
                  </p>
                </div>
              ) : (
                view.team.invitations.map(
                  (
                    invitation,
                  ) => (
                    <article
                      className="rounded-2xl border border-slate-200 p-4"
                      key={
                        invitation.id
                      }
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="font-black text-slate-950">
                            {
                              invitation.displayName
                            }
                          </h3>

                          <p className="mt-1 text-sm text-slate-600">
                            {
                              invitation.email
                            }
                          </p>

                          <p className="mt-2 text-xs text-slate-500">
                            {titleCase(
                              invitation.roleCode,
                            )}{" "}
                            · Expires{" "}
                            {formatDateTime(
                              invitation.expiresAt,
                            )}
                          </p>
                        </div>

                        <span
                          className={[
                            "self-start rounded-full px-2 py-1 text-xs font-bold",
                            statusClasses(
                              invitation.status,
                            ),
                          ].join(" ")}
                        >
                          {titleCase(
                            invitation.status,
                          )}
                        </span>
                      </div>

                      {invitation.status ===
                      "pending" ? (
                        revokingInvitationId ===
                        invitation.id ? (
                          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                            <Field label="Revocation reason">
                              <textarea
                                className={
                                  TEXTAREA_CLASS_NAME
                                }
                                onChange={(
                                  event,
                                ) => {
                                  setRevocationReason(
                                    event.target.value,
                                  );
                                }}
                                value={
                                  revocationReason
                                }
                              />
                            </Field>

                            <div className="mt-3 flex gap-2">
                              <button
                                className="h-10 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700"
                                onClick={() => {
                                  setRevokingInvitationId(
                                    undefined,
                                  );

                                  setRevocationReason(
                                    "",
                                  );
                                }}
                                type="button"
                              >
                                Cancel
                              </button>

                              <button
                                className="h-10 rounded-xl bg-red-700 px-4 text-sm font-bold text-white"
                                disabled={busy}
                                onClick={() => {
                                  void revokeInvitation(
                                    invitation,
                                  );
                                }}
                                type="button"
                              >
                                Revoke invitation
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            className="mt-4 h-10 rounded-xl border border-red-300 px-4 text-sm font-bold text-red-700"
                            onClick={() => {
                              setRevokingInvitationId(
                                invitation.id,
                              );
                            }}
                            type="button"
                          >
                            Revoke
                          </button>
                        )
                      ) : null}
                    </article>
                  ),
                )
              )}
            </div>
          </div>
        ) : null}

        {panel ===
        "permissions" ? (
          <div>
            <h2 className="text-2xl font-black text-slate-950">
              Permission editor
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Role defaults are pre-filled. Use overrides only for
              deliberate member-specific differences.
            </p>

            <div className="mt-5 max-w-xl">
              <Field label="Team member">
                <select
                  className={
                    INPUT_CLASS_NAME
                  }
                  onChange={(
                    event,
                  ) => {
                    setPermissionMemberId(
                      event.target.value,
                    );
                  }}
                  value={
                    permissionMemberId ??
                    ""
                  }
                >
                  {view.team.members.map(
                    (member) => (
                      <option
                        key={
                          member.id
                        }
                        value={
                          member.id
                        }
                      >
                        {
                          member.displayName
                        }{" "}
                        —{" "}
                        {titleCase(
                          member.roleCode,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </Field>
            </div>

            {permissionMember !==
            undefined ? (
              <div className="mt-6">
                <PermissionEditor
                  busy={busy}
                  key={
                    permissionMember.id
                  }
                  member={
                    permissionMember
                  }
                  members={
                    view.team.members
                  }
                  onCancel={() => {
                    setPanel(
                      "members",
                    );
                  }}
                  onSave={
                    savePermissions
                  }
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {panel ===
        "patient-access" ? (
          <div>
            <h2 className="text-2xl font-black text-slate-950">
              Patient-access review
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Enter a patient ID to see which active members currently
              have clinical access and why.
            </p>

            <form
              className="mt-5 flex flex-col gap-3 sm:flex-row"
              onSubmit={(event) => {
                void loadPatientAccess(
                  event,
                );
              }}
            >
              <input
                className={
                  INPUT_CLASS_NAME
                }
                name="patientId"
                placeholder="Patient ID"
                required
              />

              <button
                className="h-11 shrink-0 rounded-xl bg-violet-700 px-5 text-sm font-bold text-white"
                disabled={busy}
                type="submit"
              >
                Review access
              </button>
            </form>

            {patientAccess !==
            undefined ? (
              <div className="mt-6">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Patient ID
                  </div>

                  <code className="mt-1 block font-bold text-slate-900">
                    {
                      patientAccess.patientId
                    }
                  </code>
                </div>

                {accessibleMembers.length ===
                0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                    <div className="font-black text-slate-900">
                      No active clinical access
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {accessibleMembers.map(
                      (member) => {
                        const assignments =
                          patientAccess.activeAssignments.filter(
                            (
                              assignment,
                            ) =>
                              assignment.teamMemberId ===
                              member.id,
                          );

                        return (
                          <article
                            className="rounded-2xl border border-slate-200 p-4"
                            key={
                              member.id
                            }
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <h3 className="font-black text-slate-950">
                                  {
                                    member.displayName
                                  }
                                </h3>

                                <p className="mt-1 text-sm text-slate-600">
                                  {
                                    titleCase(
                                      member.patientAccessScope,
                                    )
                                  }
                                </p>
                              </div>

                              <span className="self-start rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">
                                Has access
                              </span>
                            </div>
                            {member.patientAccessScope ===
                            "all-patients" ? (
                              <p className="mt-3 text-sm text-slate-700">
                                Access comes from the member’s
                                organization-wide patient scope.
                              </p>
                            ) : null}

                            {assignments.map(
                              (
                                assignment,
                              ) => (
                                <div
                                  className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                                  key={
                                    assignment.id
                                  }
                                >
                                  <div className="text-sm font-bold text-slate-900">
                                    {titleCase(
                                      assignment.reason,
                                    )}
                                  </div>

                                  {assignment.assignmentReason !==
                                  undefined ? (
                                    <p className="mt-1 text-sm text-slate-600">
                                      {
                                        assignment.assignmentReason
                                      }
                                    </p>
                                  ) : null}

                                  {endingAssignmentId ===
                                  assignment.id ? (
                                    <div className="mt-3">
                                      <Field label="Reason for ending access">
                                        <textarea
                                          className={
                                            TEXTAREA_CLASS_NAME
                                          }
                                          onChange={(
                                            event,
                                          ) => {
                                            setAssignmentEndReason(
                                              event.target.value,
                                            );
                                          }}
                                          value={
                                            assignmentEndReason
                                          }
                                        />
                                      </Field>

                                      <div className="mt-3 flex gap-2">
                                        <button
                                          className="h-10 rounded-xl border border-slate-300 px-4 text-sm font-bold"
                                          onClick={() => {
                                            setEndingAssignmentId(
                                              undefined,
                                            );

                                            setAssignmentEndReason(
                                              "",
                                            );
                                          }}
                                          type="button"
                                        >
                                          Cancel
                                        </button>

                                        <button
                                          className="h-10 rounded-xl bg-red-700 px-4 text-sm font-bold text-white"
                                          disabled={busy}
                                          onClick={() => {
                                            void endAssignment();
                                          }}
                                          type="button"
                                        >
                                          End assignment
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      className="mt-3 h-9 rounded-xl border border-red-300 px-3 text-xs font-bold text-red-700"
                                      onClick={() => {
                                        setEndingAssignmentId(
                                          assignment.id,
                                        );
                                      }}
                                      type="button"
                                    >
                                      End access
                                    </button>
                                  )}
                                </div>
                              ),
                            )}
                          </article>
                        );
                      },
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {panel ===
        "triage" ? (
          <div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  Message-triage rules
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Category names come from tenant configuration. Empty
                  category or priority selections apply to all.
                </p>
              </div>

              <button
                className="h-10 rounded-xl bg-violet-700 px-4 text-sm font-bold text-white"
                onClick={() => {
                  setEditingTriageRuleId(
                    undefined,
                  );

                  setShowTriageForm(
                    true,
                  );
                }}
                type="button"
              >
                Add rule
              </button>
            </div>

            {showTriageForm ? (
              <form
                className="mt-6 space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                key={
                  editingTriageRule?.id ??
                  "new-rule"
                }
                onSubmit={(event) => {
                  void saveTriageRule(
                    event,
                  );
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Rule name">
                    <input
                      className={
                        INPUT_CLASS_NAME
                      }
                      defaultValue={
                        editingTriageRule
                          ?.name
                      }
                      name="name"
                      required
                    />
                  </Field>

                  <Field label="Escalate after minutes">
                    <input
                      className={
                        INPUT_CLASS_NAME
                      }
                      defaultValue={
                        editingTriageRule
                          ?.escalateAfterMinutes
                      }
                      min={0}
                      name="escalateAfterMinutes"
                      required
                      type="number"
                    />
                  </Field>

                  <Field label="Escalate from">
                    <select
                      className={
                        INPUT_CLASS_NAME
                      }
                      defaultValue={
                        editingTriageRule
                          ?.fromTeamMemberId ??
                        ""
                      }
                      name="fromTeamMemberId"
                    >
                      <option value="">
                        Current assignee
                      </option>

                      {activeMembers.map(
                        (member) => (
                          <option
                            key={
                              member.id
                            }
                            value={
                              member.id
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

                  <Field label="Escalate to">
                    <select
                      className={
                        INPUT_CLASS_NAME
                      }
                      defaultValue={
                        editingTriageRule
                          ?.toTeamMemberId ??
                        ""
                      }
                      name="toTeamMemberId"
                      required
                    >
                      <option value="">
                        Select…
                      </option>

                      {activeMembers.map(
                        (member) => (
                          <option
                            key={
                              member.id
                            }
                            value={
                              member.id
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

                  <Field label="Effective from">
                    <input
                      className={
                        INPUT_CLASS_NAME
                      }
                      defaultValue={toDateTimeLocal(
                        editingTriageRule
                          ?.effectiveFrom,
                      )}
                      name="effectiveFrom"
                      required
                      type="datetime-local"
                    />
                  </Field>

                  <Field label="Effective to">
                    <input
                      className={
                        INPUT_CLASS_NAME
                      }
                      defaultValue={toDateTimeLocal(
                        editingTriageRule
                          ?.effectiveTo,
                      )}
                      name="effectiveTo"
                      type="datetime-local"
                    />
                  </Field>

                  <Field label="Status">
                    <select
                      className={
                        INPUT_CLASS_NAME
                      }
                      defaultValue={
                        editingTriageRule
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

                      <option value="inactive">
                        Inactive
                      </option>
                    </select>
                  </Field>
                </div>

                <Field label="Description">
                  <textarea
                    className={
                      TEXTAREA_CLASS_NAME
                    }
                    defaultValue={
                      editingTriageRule
                        ?.description
                    }
                    name="description"
                  />
                </Field>

                <Field label="Escalation reason">
                  <textarea
                    className={
                      TEXTAREA_CLASS_NAME
                    }
                    defaultValue={
                      editingTriageRule
                        ?.reason
                    }
                    name="reason"
                    required
                  />
                </Field>

                <fieldset className="rounded-xl border border-slate-200 bg-white p-4">
                  <legend className="px-2 text-sm font-black">
                    Message categories
                  </legend>

                  {view.messageCategories.length ===
                  0 ? (
                    <p className="mt-2 text-sm text-slate-600">
                      No categories are configured. Leave this empty to
                      apply the rule to every future active category.
                    </p>
                  ) : (
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      {view.messageCategories
                        .filter(
                          (
                            category,
                          ) =>
                            category.status !==
                            "archived",
                        )
                        .map(
                          (
                            category,
                          ) => (
                            <label
                              className={
                                CHECKBOX_CLASS_NAME
                              }
                              key={
                                category.id
                              }
                            >
                              <input
                                defaultChecked={
                                  editingTriageRule
                                    ?.categoryIds
                                    .includes(
                                      category.id,
                                    ) ??
                                  false
                                }
                                name="categoryIds"
                                type="checkbox"
                                value={
                                  category.id
                                }
                              />

                              {
                                category.displayName
                              }
                            </label>
                          ),
                        )}
                    </div>
                  )}
                </fieldset>

                <fieldset className="rounded-xl border border-slate-200 bg-white p-4">
                  <legend className="px-2 text-sm font-black">
                    Priorities
                  </legend>

                  <div className="mt-2 flex flex-wrap gap-4">
                    {[
                      "routine",
                      "high",
                      "urgent",
                    ].map(
                      (priority) => (
                        <label
                          className={
                            CHECKBOX_CLASS_NAME
                          }
                          key={
                            priority
                          }
                        >
                          <input
                            defaultChecked={
                              editingTriageRule
                                ?.priorities
                                .includes(
                                  priority as
                                    "routine" |
                                    "high" |
                                    "urgent",
                                ) ??
                              false
                            }
                            name="priorities"
                            type="checkbox"
                            value={
                              priority
                            }
                          />

                          {
                            titleCase(
                              priority,
                            )
                          }
                        </label>
                      ),
                    )}
                  </div>
                </fieldset>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    className="h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700"
                    disabled={busy}
                    onClick={() => {
                      setShowTriageForm(
                        false,
                      );

                      setEditingTriageRuleId(
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
                      : editingTriageRule ===
                          undefined
                        ? "Create rule"
                        : "Save rule"}
                  </button>
                </div>
              </form>
            ) : null}

            <div className="mt-6 space-y-3">
              {view.triageRules.length ===
              0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                  <div className="font-black text-slate-900">
                    No triage rules
                  </div>
                </div>
              ) : (
                view.triageRules.map(
                  (
                    rule:
                      PracticeMessageTriageRule,
                  ) => {
                    const recipient =
                      view.team.members.find(
                        (
                          member,
                        ) =>
                          member.id ===
                          rule.toTeamMemberId,
                      );

                    return (
                      <article
                        className="rounded-2xl border border-slate-200 p-4"
                        key={
                          rule.id
                        }
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="font-black text-slate-950">
                              {
                                rule.name
                              }
                            </h3>

                            <p className="mt-1 text-sm text-slate-600">
                              Escalates after{" "}
                              {
                                rule.escalateAfterMinutes
                              }{" "}
                              minutes to{" "}
                              {recipient
                                ?.displayName ??
                                rule.toTeamMemberId}
                            </p>

                            <p className="mt-2 text-xs text-slate-500">
                              {rule.categoryIds.length ===
                              0
                                ? "All active categories"
                                : `${rule.categoryIds.length} selected categories`}{" "}
                              ·{" "}
                              {rule.priorities.length ===
                              0
                                ? "All priorities"
                                : rule.priorities
                                    .map(
                                      titleCase,
                                    )
                                    .join(
                                      ", ",
                                    )}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={[
                                "rounded-full px-2 py-1 text-xs font-bold",
                                statusClasses(
                                  rule.status,
                                ),
                              ].join(" ")}
                            >
                              {titleCase(
                                rule.status,
                              )}
                            </span>

                            {rule.status !==
                            "archived" ? (
                              <button
                                className="h-9 rounded-xl border border-violet-300 px-3 text-xs font-bold text-violet-800"
                                onClick={() => {
                                  setEditingTriageRuleId(
                                    rule.id,
                                  );

                                  setShowTriageForm(
                                    true,
                                  );
                                }}
                                type="button"
                              >
                                Edit
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    );
                  },
                )
              )}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
