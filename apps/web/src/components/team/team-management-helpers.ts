import {
  getPracticeRoleDefaultPrivileges,
  isPracticePrivilegeOverrideActive,
  WONFLOW_PRACTICE_PRIVILEGES,
} from "@wonflow/contracts";

import type {
  IsoDateTime,
  PracticePrivilege,
  PracticeRoleCode,
  PracticeTeamMember,
} from "@wonflow/contracts";

export type PrivilegeSelection =
  | "default"
  | "allow"
  | "deny";

export type PrivilegeSelectionMap =
  Partial<
    Record<
      PracticePrivilege,
      PrivilegeSelection
    >
  >;

export const PRACTICE_ROLE_OPTIONS =
  [
    ["owner", "Owner"],
    ["consultant", "Consultant"],
    [
      "senior-registrar",
      "Senior registrar",
    ],
    ["resident", "Resident"],
    [
      "house-surgeon",
      "House surgeon",
    ],
    [
      "clinical-dietitian",
      "Clinical dietitian",
    ],
    ["coordinator", "Coordinator"],
  ] as const satisfies readonly (
    readonly [
      PracticeRoleCode,
      string,
    ]
  )[];

export const INVITABLE_ROLE_OPTIONS =
  PRACTICE_ROLE_OPTIONS.filter(
    ([roleCode]) =>
      roleCode !== "owner",
  );

export const SUPERVISION_OPTIONS =
  [
    [
      "independent",
      "Independent",
    ],
    [
      "countersigned",
      "Requires countersignature",
    ],
    [
      "non-clinical",
      "Non-clinical",
    ],
  ] as const;

export const PATIENT_ACCESS_OPTIONS =
  [
    [
      "all-patients",
      "All patients",
    ],
    [
      "assigned-patients",
      "Assigned patients only",
    ],
    [
      "administrative-only",
      "Administrative details only",
    ],
    [
      "no-patient-access",
      "No patient access",
    ],
  ] as const;

export function titleCase(
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

export function privilegeLabel(
  privilege:
    PracticePrivilege,
): string {
  const [
    domain,
    action,
  ] = privilege.split(".");

  return [
    titleCase(
      action ?? privilege,
    ),
    titleCase(
      domain ?? "",
    ),
  ]
    .filter(Boolean)
    .join(" ");
}

export function privilegeDomainLabel(
  privilege:
    PracticePrivilege,
): string {
  return titleCase(
    privilege.split(".")[0] ??
      "Other",
  );
}

export function getActivePrivilegeSelection(
  member:
    PracticeTeamMember,
  privilege:
    PracticePrivilege,
  at:
    IsoDateTime,
): PrivilegeSelection {
  const activeOverrides =
    member.privilegeOverrides
      .filter(
        (override) =>
          override.privilege ===
            privilege &&
          isPracticePrivilegeOverrideActive(
            override,
            at,
          ),
      );

  if (
    activeOverrides.some(
      (override) =>
        override.effect ===
        "deny",
    )
  ) {
    return "deny";
  }

  if (
    activeOverrides.some(
      (override) =>
        override.effect ===
        "allow",
    )
  ) {
    return "allow";
  }

  return "default";
}

export function createPrivilegeSelections(
  member:
    PracticeTeamMember,
  at:
    IsoDateTime,
): PrivilegeSelectionMap {
  const result:
    PrivilegeSelectionMap = {};

  for (
    const privilege of
    WONFLOW_PRACTICE_PRIVILEGES
  ) {
    result[privilege] =
      getActivePrivilegeSelection(
        member,
        privilege,
        at,
      );
  }

  return result;
}

export function resolveProjectedPrivileges(
  roleCode:
    PracticeRoleCode,
  selections:
    PrivilegeSelectionMap,
): PracticePrivilege[] {
  const result =
    new Set(
      getPracticeRoleDefaultPrivileges(
        roleCode,
      ),
    );

  for (
    const privilege of
    WONFLOW_PRACTICE_PRIVILEGES
  ) {
    if (
      selections[privilege] ===
      "allow"
    ) {
      result.add(privilege);
    }
  }

  for (
    const privilege of
    WONFLOW_PRACTICE_PRIVILEGES
  ) {
    if (
      selections[privilege] ===
      "deny"
    ) {
      result.delete(privilege);
    }
  }

  return WONFLOW_PRACTICE_PRIVILEGES
    .filter(
      (privilege) =>
        result.has(privilege),
    );
}

export function formatIssues(
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

export function toIsoDateTime(
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

export function toDateTimeLocal(
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

export function formatDateTime(
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
