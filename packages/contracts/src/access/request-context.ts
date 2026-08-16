export type WonFlowRequestScope =
  | "platform"
  | "tenant";

export type WonFlowSourceApplication =
  | "web"
  | "patient-mobile"
  | "doctor-mobile"
  | "worker"
  | "integration"
  | "system";

export interface WonFlowBaseRequestContext {
  requestId: string;
  userId: string;
  identityId: string;
  membershipId: string | null;
  sessionId: string;
  workspace: string;
  locale: string;
  timezone: string;
  currencyCode: string;
  permissionCodes:
    readonly string[];
  sourceApplication:
    WonFlowSourceApplication;
}

export interface WonFlowPlatformRequestContext
  extends WonFlowBaseRequestContext {
  scope: "platform";
  tenantId: null;
  organizationId: null;
  branchId: null;
}

export interface WonFlowTenantRequestContext
  extends WonFlowBaseRequestContext {
  scope: "tenant";
  tenantId: string;
  organizationId: string;
  branchId: string | null;
}

export type WonFlowRequestContext =
  | WonFlowPlatformRequestContext
  | WonFlowTenantRequestContext;

export type WonFlowRequestContextErrorCode =
  | "invalid-request-context"
  | "tenant-context-required"
  | "branch-context-required"
  | "permission-required";

export class WonFlowRequestContextError
  extends Error {
  readonly code:
    WonFlowRequestContextErrorCode;

  // Carried so the HTTP layer can write a denial to the audit log without
  // every one of requirePermission's call sites doing it themselves — see
  // handleApiRoute in apps/web/src/server/http/route-handler.ts.
  readonly context?: WonFlowRequestContext;
  readonly permissionCode?: string;

  constructor(
    code:
      WonFlowRequestContextErrorCode,
    message: string,
    detail?: { context?: WonFlowRequestContext; permissionCode?: string },
  ) {
    super(
      message,
    );

    this.name =
      "WonFlowRequestContextError";

    this.code =
      code;

    this.context = detail?.context;
    this.permissionCode = detail?.permissionCode;
  }
}

function requireNonEmptyString(
  value: unknown,
  fieldName: string,
): string {
  if (
    typeof value !==
      "string" ||
    value.trim() ===
      ""
  ) {
    throw new WonFlowRequestContextError(
      "invalid-request-context",
      `${fieldName} is required.`,
    );
  }

  return value;
}

export function assertWonFlowRequestContext(
  context:
    WonFlowRequestContext,
): void {
  requireNonEmptyString(
    context.requestId,
    "requestId",
  );

  requireNonEmptyString(
    context.userId,
    "userId",
  );

  requireNonEmptyString(
    context.identityId,
    "identityId",
  );

  if (context.scope === "tenant" && !context.membershipId) {
    throw new WonFlowRequestContextError(
      "invalid-request-context",
      "membershipId is required for tenant context.",
    );
  }

  requireNonEmptyString(
    context.sessionId,
    "sessionId",
  );

  requireNonEmptyString(
    context.workspace,
    "workspace",
  );

  requireNonEmptyString(
    context.locale,
    "locale",
  );

  requireNonEmptyString(
    context.timezone,
    "timezone",
  );

  requireNonEmptyString(
    context.currencyCode,
    "currencyCode",
  );

  if (
    !Array.isArray(
      context.permissionCodes,
    )
  ) {
    throw new WonFlowRequestContextError(
      "invalid-request-context",
      "permissionCodes must be an array.",
    );
  }

  if (
    context.scope ===
    "tenant"
  ) {
    requireNonEmptyString(
      context.tenantId,
      "tenantId",
    );

    requireNonEmptyString(
      context.organizationId,
      "organizationId",
    );
  }
}

export function requireTenantContext(
  context:
    WonFlowRequestContext,
): WonFlowTenantRequestContext {
  assertWonFlowRequestContext(
    context,
  );

  if (
    context.scope !==
    "tenant"
  ) {
    throw new WonFlowRequestContextError(
      "tenant-context-required",
      "A tenant request context is required.",
    );
  }

  return context;
}

export function requireBranchId(
  context:
    WonFlowRequestContext,
): string {
  const tenantContext =
    requireTenantContext(
      context,
    );

  if (
    !tenantContext.branchId
  ) {
    throw new WonFlowRequestContextError(
      "branch-context-required",
      "An authorized branch is required.",
    );
  }

  return tenantContext.branchId;
}

export function hasPermission(
  context:
    WonFlowRequestContext,
  permissionCode: string,
): boolean {
  if (context.permissionCodes.includes(permissionCode)) {
    return true;
  }

  // A workspace that can manage a resource can necessarily read the same
  // resource. This keeps older tenant roles working when read permissions are
  // introduced after their original role assignment.
  if (permissionCode.endsWith(".read")) {
    return context.permissionCodes.includes(
      `${permissionCode.slice(0, -".read".length)}.manage`,
    );
  }

  return false;
}

export function requirePermission(
  context:
    WonFlowRequestContext,
  permissionCode: string,
): void {
  if (
    !hasPermission(
      context,
      permissionCode,
    )
  ) {
    throw new WonFlowRequestContextError(
      "permission-required",
      `Permission "${permissionCode}" is required.`,
      { context, permissionCode },
    );
  }
}

export function isSameTenant(
  context:
    WonFlowRequestContext,
  tenantId: string,
): boolean {
  return (
    context.scope ===
      "tenant" &&
    context.tenantId ===
      tenantId
  );
}

export function canAccessBranch(
  context:
    WonFlowRequestContext,
  branchId: string,
): boolean {
  return (
    context.scope ===
      "tenant" &&
    context.branchId ===
      branchId
  );
}
