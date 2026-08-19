"use client";

import {
  useMemo,
  useState,
} from "react";

import type {
  FormEvent,
} from "react";

import {
  Building2,
  MapPin,
  Network,
} from "lucide-react";

import {
  AuthFrame,
} from "./auth-frame";

export interface WorkspaceBranchOption {
  id: string;
  name: string;
  code?: string;
}

export interface WorkspaceOrganizationOption {
  id: string;
  name: string;
  branches:
    readonly WorkspaceBranchOption[];
}

export interface WorkspaceSelection {
  organizationId: string;
  branchId: string | null;
  workspace: string;
}

export interface WorkspaceSelectorProps {
  productName: string;

  organizations?:
    readonly WorkspaceOrganizationOption[];

  workspaces?:
    readonly {
      value: string;
      label: string;
    }[];

  value?: WorkspaceSelection;

  busy?: boolean;

  error?: string;

  onChange?: (
    selection:
      WorkspaceSelection,
  ) => void;

  onContinue?: (
    selection:
      WorkspaceSelection,
  ) => void | Promise<void>;
}

const inputClassName = [
  "min-h-11 w-full rounded-xl",
  "border border-slate-200 bg-white",
  "px-3.5 text-sm text-slate-950",
  "outline-none transition",
  "focus:border-blue-500",
  "focus:ring-4 focus:ring-blue-100",
  "disabled:cursor-not-allowed",
  "disabled:bg-slate-100",
  "disabled:text-slate-500",
  "dark:border-slate-800 dark:bg-slate-950/60 dark:text-white dark:focus:ring-blue-950/50 dark:disabled:bg-slate-900/60 dark:disabled:text-slate-600",
].join(" ");

export function WorkspaceSelector({
  productName,
  organizations = [],
  workspaces = [
    {
      value: "default",
      label: "Assigned workspace",
    },
  ],
  value,
  busy = false,
  error,
  onChange,
  onContinue,
}: WorkspaceSelectorProps) {
  const [
    internalSelection,
    setInternalSelection,
  ] = useState<
    WorkspaceSelection
  >({
    organizationId: "",
    branchId: null,
    workspace:
      workspaces[0]?.value ??
      "default",
  });

  const selection =
    value ??
    internalSelection;

  const selectedOrganization =
    useMemo(
      () =>
        organizations.find(
          (
            organization,
          ) =>
            organization.id ===
            selection.organizationId,
        ),
      [
        organizations,
        selection.organizationId,
      ],
    );

  const availableBranches =
    selectedOrganization?.branches ??
    [];

  const branchRequired =
    availableBranches.length >
    0;

  const canContinue =
    selection.organizationId !==
      "" &&
    (
      !branchRequired ||
      selection.branchId !==
        null
    ) &&
    selection.workspace !==
      "";

  function update(
    next:
      WorkspaceSelection,
  ) {
    if (
      value === undefined
    ) {
      setInternalSelection(
        next,
      );
    }

    onChange?.(
      next,
    );
  }

  async function submit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !canContinue ||
      busy
    ) {
      return;
    }

    await onContinue?.(
      selection,
    );
  }

  return (
    <AuthFrame
      description="Choose only an organization, branch and workspace assigned to your account."
      productName={productName}
      title="Select your workspace"
    >
      {organizations.length ===
      0 ? (
        <div
          className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4"
          role="status"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-violet-700 shadow-sm ring-1 ring-violet-100">
              <Network
                aria-hidden="true"
                size={19}
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-violet-950">
                No organizations are available
              </p>

              <p className="mt-1 text-xs leading-5 text-violet-800">
                An authorized administrator must assign an organization
                before a workspace can be selected.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <form
        className="mt-5 space-y-4"
        onSubmit={submit}
      >
        <label
          className="block"
          htmlFor="workspace-organization"
        >
          <span className="text-sm font-semibold text-slate-700">
            Organization
          </span>

          <div className="relative mt-1.5">
            <Building2
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              size={17}
            />

            <select
              className={`${inputClassName} appearance-none pl-10`}
              disabled={
                organizations.length ===
                  0 ||
                busy
              }
              id="workspace-organization"
              onChange={(
                event,
              ) => {
                update({
                  ...selection,
                  organizationId:
                    event.target.value,
                  branchId: null,
                });
              }}
              value={
                selection.organizationId
              }
            >
              <option value="">
                Select organization
              </option>

              {organizations.map(
                (
                  organization,
                ) => (
                  <option
                    key={
                      organization.id
                    }
                    value={
                      organization.id
                    }
                  >
                    {
                      organization.name
                    }
                  </option>
                ),
              )}
            </select>
          </div>
        </label>

        <label
          className="block"
          htmlFor="workspace-branch"
        >
          <span className="text-sm font-semibold text-slate-700">
            Branch
          </span>

          <div className="relative mt-1.5">
            <MapPin
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              size={17}
            />

            <select
              className={`${inputClassName} appearance-none pl-10`}
              disabled={
                !selectedOrganization ||
                availableBranches.length ===
                  0 ||
                busy
              }
              id="workspace-branch"
              onChange={(
                event,
              ) => {
                update({
                  ...selection,
                  branchId:
                    event.target.value ||
                    null,
                });
              }}
              value={
                selection.branchId ??
                ""
              }
            >
              <option value="">
                {!selectedOrganization
                  ? "Select an organization first"
                  : availableBranches.length ===
                      0
                    ? "No branch selection required"
                    : "Select branch"}
              </option>

              {availableBranches.map(
                (
                  branch,
                ) => (
                  <option
                    key={branch.id}
                    value={branch.id}
                  >
                    {branch.name}
                    {branch.code
                      ? ` · ${branch.code}`
                      : ""}
                  </option>
                ),
              )}
            </select>
          </div>
        </label>

        <label
          className="block"
          htmlFor="workspace-type"
        >
          <span className="text-sm font-semibold text-slate-700">
            Workspace
          </span>

          <select
            className={`${inputClassName} mt-1.5`}
            disabled={
              workspaces.length ===
                0 ||
              busy
            }
            id="workspace-type"
            onChange={(
              event,
            ) => {
              update({
                ...selection,
                workspace:
                  event.target.value,
              });
            }}
            value={
              selection.workspace
            }
          >
            {workspaces.map(
              (
                workspace,
              ) => (
                <option
                  key={
                    workspace.value
                  }
                  value={
                    workspace.value
                  }
                >
                  {workspace.label}
                </option>
              ),
            )}
          </select>
        </label>

        {error ? (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <button
          className={[
            "min-h-11 w-full rounded-xl",
            "bg-blue-700 px-4",
            "text-sm font-semibold text-white",
            "transition hover:bg-blue-800",
            "focus-visible:outline-none",
            "focus-visible:ring-4",
            "focus-visible:ring-blue-200",
            "disabled:cursor-not-allowed",
            "disabled:opacity-50",
          ].join(" ")}
          disabled={
            !canContinue ||
            busy
          }
          type="submit"
        >
          {busy
            ? "Opening workspace…"
            : "Continue"}
        </button>
      </form>
    </AuthFrame>
  );
}
