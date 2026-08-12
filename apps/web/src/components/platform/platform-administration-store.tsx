"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { phaseOneApi } from "@/lib/api/phase-one-api";

export type PlatformTenantStatus =
  | "draft"
  | "active"
  | "suspended";

export type PlatformSubscriptionPlan =
  | "unconfigured"
  | "starter"
  | "professional"
  | "enterprise";

export type PlatformBillingStatus =
  | "unconfigured"
  | "trial"
  | "active"
  | "past-due"
  | "cancelled";

export type PlatformAuditSeverity =
  | "information"
  | "warning"
  | "critical";

export type PlatformSupportAccessStatus =
  | "pending"
  | "active"
  | "revoked"
  | "expired";

export interface PlatformBranchRecord {
  id: string;
  name: string;
  code: string;
  city: string;
  status: "active" | "inactive";
  createdAt: string;
}

export interface PlatformTenantUserRecord {
  id: string;
  displayName: string;
  email: string;
  role: string;
  status: "invited" | "active" | "disabled";
  photoDataUrl?: string;
  createdAt: string;
}

export interface PlatformTenantSubscription {
  plan: PlatformSubscriptionPlan;
  billingStatus: PlatformBillingStatus;
  currencyCode: string;
  seatCount: number;
  monthlyAmountMinor: number;
  trialEndsAt: string;
  renewsAt: string;
  /**
   * Set once the subscription has been saved from the Subscription tab.
   * Seat count and monthly amount are owned by that tab from then on, and are
   * shown read-only everywhere else.
   */
  configuredAt?: string;
}

export interface PlatformTenantSettings {
  defaultBranchName: string;
  defaultLocale: string;
  secondaryLocale: string;
  timezone: string;
  currencyCode: string;
}

export interface PlatformTenantRecord {
  id: string;
  backendTenantId?: string;
  organizationName: string;
  slug: string;
  domain: string;
  legalName: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  logoDataUrl?: string;
  status: PlatformTenantStatus;
  createdAt: string;
  updatedAt: string;
  branches: PlatformBranchRecord[];
  users: PlatformTenantUserRecord[];
  subscription: PlatformTenantSubscription;
  entitlements: Record<string, boolean>;
  settings: PlatformTenantSettings;
}

export interface PlatformAuditEvent {
  id: string;
  organizationId?: string;
  organizationName?: string;
  category:
    | "tenant"
    | "subscription"
    | "entitlement"
    | "support-access"
    | "settings";
  severity: PlatformAuditSeverity;
  action: string;
  description: string;
  actorLabel: string;
  createdAt: string;
}

export interface PlatformSupportAccessRecord {
  id: string;
  organizationId: string;
  organizationName: string;
  requestedBy: string;
  reason: string;
  status: PlatformSupportAccessStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformSystemSettings {
  defaultCurrencyCode: string;
  defaultBranchName: string;
  defaultLocale: string;
  secondaryLocale: string;
  defaultTimezone: string;
  supportAvatarMode: "photo-or-initials";
  criticalAuditTone: "deep-red";
  routeLoader: "rotating-w";
}

export interface PlatformAdministrationWorkspace {
  version: 1;
  tenants: PlatformTenantRecord[];
  auditEvents: PlatformAuditEvent[];
  supportAccess: PlatformSupportAccessRecord[];
  systemSettings: PlatformSystemSettings;
}

export interface CreatePlatformTenantInput {
  organizationName: string;
  slug: string;
  domain: string;
  legalName: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
}

export interface UpdatePlatformTenantProfileInput {
  organizationName: string;
  slug: string;
  domain: string;
  legalName: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  logoDataUrl?: string;
}

export interface CreatePlatformBranchInput {
  name: string;
  code: string;
  city: string;
}

export interface CreatePlatformTenantUserInput {
  displayName: string;
  email: string;
  role: string;
  photoDataUrl?: string;
}

export interface ApplyPlatformTenantActivationInput {
  backendTenantId: string;
  ownerName: string;
  ownerEmail: string;
  subscription: PlatformTenantSubscription;
}

export interface CreatePlatformSupportAccessInput {
  organizationId: string;
  requestedBy: string;
  reason: string;
  expiresAt: string;
}

export interface PlatformAdministrationContextValue {
  ready: boolean;
  /** Set when the tenant projection could not be read from the server. */
  loadError: string | null;
  /** Re-reads tenants from the database. */
  reload: () => Promise<void>;
  workspace: PlatformAdministrationWorkspace;
  getTenant: (tenantId: string) => PlatformTenantRecord | undefined;
  createTenant: (input: CreatePlatformTenantInput) => Promise<string>;
  updateTenantProfile: (
    tenantId: string,
    input: UpdatePlatformTenantProfileInput,
  ) => void;
  setTenantStatus: (
    tenantId: string,
    status: PlatformTenantStatus,
    reason: string,
  ) => Promise<void>;
  addBranch: (
    tenantId: string,
    input: CreatePlatformBranchInput,
  ) => void;
  addTenantUser: (
    tenantId: string,
    input: CreatePlatformTenantUserInput,
  ) => void;
  updateSubscription: (
    tenantId: string,
    subscription: PlatformTenantSubscription,
  ) => Promise<void>;
  applyTenantActivation: (
    tenantId: string,
    input: ApplyPlatformTenantActivationInput,
  ) => void;
  updateEntitlement: (
    tenantId: string,
    moduleCode: string,
    enabled: boolean,
  ) => Promise<void>;
  updateTenantSettings: (
    tenantId: string,
    settings: PlatformTenantSettings,
  ) => void;
  createSupportAccess: (
    input: CreatePlatformSupportAccessInput,
  ) => Promise<void>;
  setSupportAccessStatus: (
    accessId: string,
    status: PlatformSupportAccessStatus,
  ) => Promise<void>;
  updateSystemSettings: (
    settings: PlatformSystemSettings,
  ) => void;
  removeTenant: (
    tenantId: string,
    confirmation: string,
  ) => Promise<boolean>;
}

export interface PlatformModuleDefinition {
  code: string;
  name: string;
  description: string;
  group: "Core" | "Clinical" | "Operations" | "Access";
}

export const PLATFORM_MODULE_CATALOG:
  readonly PlatformModuleDefinition[] = [
    {
      code: "practice-booking",
      name: "Practice booking",
      description: "Catalogue-driven appointment booking and scheduling.",
      group: "Core",
    },
    {
      code: "practice-documents",
      name: "Practice documents",
      description: "Patient and clinician document workflows.",
      group: "Core",
    },
    {
      code: "practice-messaging",
      name: "Practice messaging",
      description: "Patient and care-team messaging.",
      group: "Core",
    },
    {
      code: "practice-team-management",
      name: "Team management",
      description: "Organization users, roles and clinical supervision.",
      group: "Core",
    },
    {
      code: "patient-portal",
      name: "Patient portal",
      description: "Web access for patient care and account workflows.",
      group: "Access",
    },
    {
      code: "public-booking-page",
      name: "Public booking",
      description: "Public organization booking experience.",
      group: "Access",
    },
    {
      code: "mobile-apps",
      name: "Mobile applications",
      description: "Patient and clinician mobile application access.",
      group: "Access",
    },
    {
      code: "reception-desk",
      name: "Reception",
      description: "Registration, appointments and queue operations.",
      group: "Operations",
    },
    {
      code: "billing-counter",
      name: "Billing",
      description: "Patient billing, invoices and payments.",
      group: "Operations",
    },
    {
      code: "laboratory",
      name: "Laboratory",
      description: "Laboratory worklists and results.",
      group: "Clinical",
    },
    {
      code: "radiology",
      name: "Radiology",
      description: "Imaging worklists and reports.",
      group: "Clinical",
    },
    {
      code: "pharmacy",
      name: "Pharmacy",
      description: "Dispensing and medicine inventory.",
      group: "Clinical",
    },
  ];

const STORAGE_KEY =
  "wonflow:platform-administration:workspace:v1";

const DEFAULT_SYSTEM_SETTINGS: PlatformSystemSettings = {
  defaultCurrencyCode: "PKR",
  defaultBranchName: "Main Branch",
  defaultLocale: "en",
  secondaryLocale: "ur",
  defaultTimezone: "Asia/Karachi",
  supportAvatarMode: "photo-or-initials",
  criticalAuditTone: "deep-red",
  routeLoader: "rotating-w",
};

const EMPTY_WORKSPACE: PlatformAdministrationWorkspace = {
  version: 1,
  tenants: [],
  auditEvents: [],
  supportAccess: [],
  systemSettings: DEFAULT_SYSTEM_SETTINGS,
};

const PlatformAdministrationContext =
  createContext<PlatformAdministrationContextValue | undefined>(
    undefined,
  );

function createIdentifier(prefix: string): string {
  const suffix =
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${prefix}-${suffix}`;
}

function createAuditEvent(
  input: Omit<PlatformAuditEvent, "id" | "createdAt">,
): PlatformAuditEvent {
  return {
    ...input,
    id: createIdentifier("audit"),
    createdAt: new Date().toISOString(),
  };
}

function createEmptyEntitlements(): Record<string, boolean> {
  return Object.fromEntries(
    PLATFORM_MODULE_CATALOG.map((module) => [
      module.code,
      false,
    ]),
  );
}

function createEmptySubscription(): PlatformTenantSubscription {
  return {
    plan: "unconfigured",
    billingStatus: "unconfigured",
    currencyCode: "PKR",
    seatCount: 0,
    monthlyAmountMinor: 0,
    trialEndsAt: "",
    renewsAt: "",
  };
}

/* =========================================================
   Server projection
   The platform console reads its tenants from the live
   database so every screen agrees with the Overview
   dashboard. These types mirror the payload returned by
   GET /api/v1/platform/organizations.
   ========================================================= */

interface ServerTenantBranch {
  id: string;
  code: string;
  name: string;
  status: string;
  address?: { city?: string } | null;
  createdAt: string;
}

interface ServerTenantOrganization {
  id: string;
  code: string;
  displayName: string;
  legalName: string | null;
  email: string | null;
  phone: string | null;
  branches: ServerTenantBranch[];
}

interface ServerTenantSubscription {
  planCode: string;
  status: string;
  currencyCode: string;
  monthlyAmountMinor: number;
  seatCount: number;
  trialEndsAt: string | null;
  renewsAt: string | null;
  updatedAt: string;
}

interface ServerTenant {
  id: string;
  slug: string;
  displayName: string;
  legalName: string | null;
  domain: string | null;
  status: string;
  defaultLocale: string;
  secondaryLocale: string | null;
  defaultTimezone: string;
  defaultCurrencyCode: string;
  createdAt: string;
  updatedAt: string;
  organizations: ServerTenantOrganization[];
  subscription: ServerTenantSubscription | null;
  entitlements: Array<{ moduleCode: string; enabled: boolean }>;
}

const SERVER_TENANT_STATUS: Record<string, PlatformTenantStatus> = {
  DRAFT: "draft",
  ACTIVE: "active",
  SUSPENDED: "suspended",
};

const SERVER_STATUS_FOR: Record<
  PlatformTenantStatus,
  "ACTIVE" | "SUSPENDED" | "ARCHIVED"
> = {
  /*
   * The server has no DRAFT transition on setTenantStatus — a tenant only
   * leaves draft through activation — so "draft" is never sent here.
   */
  draft: "SUSPENDED",
  active: "ACTIVE",
  suspended: "SUSPENDED",
};

const SERVER_BILLING_STATUS: Record<string, PlatformBillingStatus> = {
  UNCONFIGURED: "unconfigured",
  TRIAL: "trial",
  ACTIVE: "active",
  PAST_DUE: "past-due",
  SUSPENDED: "past-due",
  CANCELLED: "cancelled",
};

const SERVER_BILLING_STATUS_FOR: Record<
  PlatformBillingStatus,
  "UNCONFIGURED" | "TRIAL" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELLED"
> = {
  unconfigured: "UNCONFIGURED",
  trial: "TRIAL",
  active: "ACTIVE",
  "past-due": "PAST_DUE",
  cancelled: "CANCELLED",
};

const SERVER_SUBSCRIPTION_PLAN: Record<string, PlatformSubscriptionPlan> = {
  unconfigured: "unconfigured",
  starter: "starter",
  professional: "professional",
  enterprise: "enterprise",
};

function isoOrEmpty(value: string | null | undefined): string {
  return value ?? "";
}

function mapServerSubscription(
  subscription: ServerTenantSubscription | null,
): PlatformTenantSubscription {
  if (subscription === null) {
    return createEmptySubscription();
  }

  const plan =
    SERVER_SUBSCRIPTION_PLAN[
      subscription.planCode.trim().toLowerCase()
    ] ?? "unconfigured";

  return {
    plan,
    billingStatus:
      SERVER_BILLING_STATUS[subscription.status] ??
      "unconfigured",
    currencyCode: subscription.currencyCode,
    seatCount: subscription.seatCount,
    monthlyAmountMinor: subscription.monthlyAmountMinor,
    trialEndsAt: isoOrEmpty(subscription.trialEndsAt),
    renewsAt: isoOrEmpty(subscription.renewsAt),
    /*
     * The server has no separate "configured" flag. A subscription that
     * has moved off the UNCONFIGURED default has been saved from the
     * subscription tab, which is what configuredAt signals to the UI.
     */
    configuredAt:
      subscription.status === "UNCONFIGURED"
        ? undefined
        : subscription.updatedAt,
  };
}

function mapServerTenant(
  tenant: ServerTenant,
): PlatformTenantRecord {
  const organization = tenant.organizations[0];

  const entitlements = createEmptyEntitlements();
  for (const entitlement of tenant.entitlements) {
    if (entitlement.moduleCode in entitlements) {
      entitlements[entitlement.moduleCode] =
        entitlement.enabled;
    }
  }

  const branches: PlatformBranchRecord[] =
    tenant.organizations.flatMap((record) =>
      record.branches.map((branch) => ({
        id: branch.id,
        name: branch.name,
        code: branch.code,
        city: branch.address?.city ?? "",
        status:
          branch.status === "ACTIVE"
            ? ("active" as const)
            : ("inactive" as const),
        createdAt: branch.createdAt,
      })),
    );

  return {
    id: tenant.id,
    backendTenantId: tenant.id,
    organizationName: tenant.displayName,
    slug: tenant.slug,
    domain: tenant.domain ?? "",
    legalName: tenant.legalName ?? "",
    primaryContactName: "",
    primaryContactEmail: organization?.email ?? "",
    primaryContactPhone: organization?.phone ?? "",
    status:
      SERVER_TENANT_STATUS[tenant.status] ?? "draft",
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
    branches,
    users: [],
    subscription: mapServerSubscription(
      tenant.subscription,
    ),
    entitlements,
    settings: {
      defaultBranchName:
        branches.find((branch) => branch.status === "active")
          ?.name ?? DEFAULT_SYSTEM_SETTINGS.defaultBranchName,
      defaultLocale: tenant.defaultLocale,
      secondaryLocale:
        tenant.secondaryLocale ??
        DEFAULT_SYSTEM_SETTINGS.secondaryLocale,
      timezone: tenant.defaultTimezone,
      currencyCode: tenant.defaultCurrencyCode,
    },
  };
}

interface ServerAuditEvent {
  id: string;
  tenantId: string | null;
  action: string;
  entityType: string;
  severity: string;
  sourceApplication: string;
  createdAt: string;
}

interface ServerSupportAccess {
  id: string;
  tenantId: string;
  reason: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  tenant: { id: string; displayName: string } | null;
}

const SERVER_AUDIT_SEVERITY: Record<string, PlatformAuditSeverity> = {
  INFORMATION: "information",
  WARNING: "warning",
  CRITICAL: "critical",
};

/*
 * The console exposes four states where the server keeps five. The mapping
 * mirrors how the Overview dashboard already counts them — REQUESTED and
 * APPROVED are both "awaiting action", and an ACTIVE grant past its expiry
 * is shown as expired — so the two screens can never disagree.
 */
function mapSupportAccessStatus(
  status: string,
  expiresAt: string,
): PlatformSupportAccessStatus {
  if (status === "REVOKED" || status === "REJECTED") {
    return "revoked";
  }

  if (status === "ACTIVE") {
    return new Date(expiresAt).getTime() > Date.now()
      ? "active"
      : "expired";
  }

  return "pending";
}

/*
 * Audit rows are categorised by the action namespace the server writes
 * ("platform.tenant.created" -> tenant), so the console's category filter
 * keeps working against real events.
 */
function auditCategoryFor(
  action: string,
): PlatformAuditEvent["category"] {
  if (action.includes("subscription")) return "subscription";
  if (action.includes("entitlement")) return "entitlement";
  if (action.includes("support")) return "support-access";
  if (action.includes("setting")) return "settings";
  return "tenant";
}

function mapServerAuditEvent(
  event: ServerAuditEvent,
  tenantNames: Map<string, string>,
): PlatformAuditEvent {
  const organizationName =
    event.tenantId === null
      ? undefined
      : tenantNames.get(event.tenantId);

  return {
    id: event.id,
    organizationId: event.tenantId ?? undefined,
    organizationName,
    category: auditCategoryFor(event.action),
    severity:
      SERVER_AUDIT_SEVERITY[event.severity] ??
      "information",
    action: event.action,
    description: `${event.entityType} configuration was updated.`,
    actorLabel: event.sourceApplication,
    createdAt: event.createdAt,
  };
}

const SERVER_SUPPORT_STATUS_FOR: Partial<
  Record<
    PlatformSupportAccessStatus,
    "APPROVED" | "ACTIVE" | "REVOKED" | "REJECTED"
  >
> = {
  pending: "APPROVED",
  active: "ACTIVE",
  revoked: "REVOKED",
};

function mapServerSupportAccess(
  access: ServerSupportAccess,
): PlatformSupportAccessRecord {
  return {
    id: access.id,
    organizationId: access.tenantId,
    organizationName:
      access.tenant?.displayName ?? "Unknown tenant",
    requestedBy: "Platform administrator",
    reason: access.reason,
    status: mapSupportAccessStatus(
      access.status,
      access.expiresAt,
    ),
    expiresAt: access.expiresAt,
    createdAt: access.createdAt,
    updatedAt: access.updatedAt,
  };
}

function parseStoredWorkspace(
  value: string | null,
): PlatformAdministrationWorkspace {
  if (value === null) {
    return EMPTY_WORKSPACE;
  }

  try {
    const parsed = JSON.parse(value) as
      Partial<PlatformAdministrationWorkspace>;

    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.tenants) ||
      !Array.isArray(parsed.auditEvents) ||
      !Array.isArray(parsed.supportAccess)
    ) {
      return EMPTY_WORKSPACE;
    }

    return {
      version: 1,
      tenants: parsed.tenants,
      auditEvents: parsed.auditEvents,
      supportAccess: parsed.supportAccess,
      systemSettings: {
        ...DEFAULT_SYSTEM_SETTINGS,
        ...(parsed.systemSettings ?? {}),
      },
    };
  } catch {
    return EMPTY_WORKSPACE;
  }
}

function updateTenantRecord(
  workspace: PlatformAdministrationWorkspace,
  tenantId: string,
  update: (
    tenant: PlatformTenantRecord,
  ) => PlatformTenantRecord,
): PlatformAdministrationWorkspace {
  return {
    ...workspace,
    tenants: workspace.tenants.map((tenant) =>
      tenant.id === tenantId
        ? update(tenant)
        : tenant,
    ),
  };
}

export function PlatformAdministrationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isPlatformConsole =
    pathname?.startsWith("/platform") ?? false;

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] =
    useState<string | null>(null);
  const [workspace, setWorkspace] =
    useState<PlatformAdministrationWorkspace>(
      EMPTY_WORKSPACE,
    );

  /*
   * Tenants are owned by the database, so the console projects them from
   * the API on every load. Only the operator's own preferences still live
   * in localStorage — they have no server representation.
   */
  const reload = useCallback(async () => {
    try {
      const [
        { tenants },
        { audit },
        { access },
      ] = await Promise.all([
        phaseOneApi<{ tenants: ServerTenant[] }>(
          "/api/v1/platform/organizations",
        ),
        phaseOneApi<{ audit: ServerAuditEvent[] }>(
          "/api/v1/platform/audit",
        ),
        phaseOneApi<{ access: ServerSupportAccess[] }>(
          "/api/v1/platform/support-access",
        ),
      ]);

      /*
       * An expired session is answered with a redirect to the sign-in page,
       * which parses as a 200 with no JSON body rather than an error.
       */
      if (!Array.isArray(tenants)) {
        throw new Error(
          "The platform session has expired. Sign in again to continue.",
        );
      }

      const mappedTenants = tenants.map(mapServerTenant);
      const tenantNames = new Map(
        mappedTenants.map((tenant) => [
          tenant.id,
          tenant.organizationName,
        ]),
      );

      setWorkspace((current) => ({
        ...current,
        tenants: mappedTenants,
        auditEvents: audit.map((event) =>
          mapServerAuditEvent(event, tenantNames),
        ),
        supportAccess: access.map(
          mapServerSupportAccess,
        ),
      }));
      setLoadError(null);
    } catch (error) {
      /*
       * A failed projection must not silently show an empty console:
       * that reads identically to "you have no tenants".
       */
      setLoadError(
        error instanceof Error
          ? error.message
          : "Tenants could not be loaded.",
      );
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    // localStorage is only reachable client-side; this restores the
    // operator preferences after mount, not a prop/state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWorkspace((current) => ({
      ...current,
      systemSettings: parseStoredWorkspace(
        window.localStorage.getItem(STORAGE_KEY),
      ).systemSettings,
    }));

    /*
     * The provider is mounted by the root layout, so it is alive on every
     * screen and for every role. Only the platform console consumes this
     * data, and only a platform administrator is allowed to read it —
     * fetching anywhere else would issue rejected requests on each page.
     */
    if (!isPlatformConsole) {
      setReady(true);
      return;
    }

    void reload();
  }, [isPlatformConsole, reload]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        tenants: [],
        auditEvents: [],
        supportAccess: [],
        systemSettings: workspace.systemSettings,
      } satisfies PlatformAdministrationWorkspace),
    );
  }, [ready, workspace.systemSettings]);

  const getTenant = useCallback(
    (tenantId: string) =>
      workspace.tenants.find(
        (tenant) => tenant.id === tenantId,
      ),
    [workspace.tenants],
  );

  /*
   * The tenant is created on the server so it exists for every other
   * screen — the Overview dashboard, the registry and the API — rather
   * than only in this browser. The returned id is the database id.
   */
  const createTenant = useCallback(
    async (
      input: CreatePlatformTenantInput,
    ): Promise<string> => {
      const organizationName =
        input.organizationName.trim();
      const slug = input.slug.trim().toLowerCase();

      const { tenant } = await phaseOneApi<{
        tenant: ServerTenant;
      }>("/api/v1/platform/organizations", {
        method: "POST",
        body: JSON.stringify({
          displayName: organizationName,
          legalName: input.legalName.trim(),
          slug,
          domain: input.domain.trim(),
          /*
           * The server requires an organization code. Derive a stable one
           * from the slug so the operator is not asked for a value that
           * carries no meaning to them.
           */
          organizationCode: slug
            .replaceAll(/[^a-z0-9]+/g, "-")
            .replaceAll(/^-+|-+$/g, "")
            .slice(0, 80)
            .toUpperCase(),
        }),
      });

      await reload();

      return tenant.id;
    },
    [reload],
  );

  const updateTenantProfile = useCallback(
    (
      tenantId: string,
      input: UpdatePlatformTenantProfileInput,
    ) => {
      setWorkspace((current) => {
        const existing = current.tenants.find(
          (tenant) => tenant.id === tenantId,
        );

        if (existing === undefined) {
          return current;
        }

        const updated = updateTenantRecord(
          current,
          tenantId,
          (tenant) => ({
            ...tenant,
            ...input,
            organizationName:
              input.organizationName.trim(),
            slug: input.slug.trim(),
            domain: input.domain.trim(),
            legalName: input.legalName.trim(),
            primaryContactName:
              input.primaryContactName.trim(),
            primaryContactEmail:
              input.primaryContactEmail.trim(),
            primaryContactPhone:
              input.primaryContactPhone.trim(),
            updatedAt: new Date().toISOString(),
          }),
        );

        return {
          ...updated,
          auditEvents: [
            createAuditEvent({
              organizationId: tenantId,
              organizationName:
                input.organizationName.trim(),
              category: "tenant",
              severity: "information",
              action: "tenant.profile.updated",
              description:
                "Tenant organization details were updated.",
              actorLabel: "Platform administrator",
            }),
            ...current.auditEvents,
          ],
        };
      });
    },
    [],
  );

  /*
   * Status is owned by the database — the server writes its own audit
   * event, so no local one is fabricated here.
   */
  const setTenantStatus = useCallback(
    async (
      tenantId: string,
      status: PlatformTenantStatus,
      reason: string,
    ) => {
      await phaseOneApi(
        `/api/v1/platform/organizations/${encodeURIComponent(tenantId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: SERVER_STATUS_FOR[status],
            reason:
              reason.trim() ||
              `Tenant status changed to ${status}.`,
          }),
        },
      );

      await reload();
    },
    [reload],
  );

  const addBranch = useCallback(
    (
      tenantId: string,
      input: CreatePlatformBranchInput,
    ) => {
      setWorkspace((current) => {
        const existing = current.tenants.find(
          (tenant) => tenant.id === tenantId,
        );

        if (existing === undefined) {
          return current;
        }

        const branch: PlatformBranchRecord = {
          id: createIdentifier("branch"),
          name: input.name.trim(),
          code: input.code.trim(),
          city: input.city.trim(),
          status: "active",
          createdAt: new Date().toISOString(),
        };

        const updated = updateTenantRecord(
          current,
          tenantId,
          (tenant) => ({
            ...tenant,
            branches: [...tenant.branches, branch],
            updatedAt: new Date().toISOString(),
          }),
        );

        return {
          ...updated,
          auditEvents: [
            createAuditEvent({
              organizationId: tenantId,
              organizationName:
                existing.organizationName,
              category: "tenant",
              severity: "information",
              action: "tenant.branch.created",
              description:
                `Branch “${branch.name}” was added.`,
              actorLabel: "Platform administrator",
            }),
            ...current.auditEvents,
          ],
        };
      });
    },
    [],
  );

  const addTenantUser = useCallback(
    (
      tenantId: string,
      input: CreatePlatformTenantUserInput,
    ) => {
      setWorkspace((current) => {
        const existing = current.tenants.find(
          (tenant) => tenant.id === tenantId,
        );

        if (existing === undefined) {
          return current;
        }

        const user: PlatformTenantUserRecord = {
          id: createIdentifier("tenant-user"),
          displayName: input.displayName.trim(),
          email: input.email.trim(),
          role: input.role.trim(),
          status: "invited",
          photoDataUrl: input.photoDataUrl,
          createdAt: new Date().toISOString(),
        };

        const updated = updateTenantRecord(
          current,
          tenantId,
          (tenant) => ({
            ...tenant,
            users: [...tenant.users, user],
            updatedAt: new Date().toISOString(),
          }),
        );

        return {
          ...updated,
          auditEvents: [
            createAuditEvent({
              organizationId: tenantId,
              organizationName:
                existing.organizationName,
              category: "tenant",
              severity: "information",
              action: "tenant.user.invited",
              description:
                `An invitation record was created for ${user.email}.`,
              actorLabel: "Platform administrator",
            }),
            ...current.auditEvents,
          ],
        };
      });
    },
    [],
  );

  const updateSubscription = useCallback(
    async (
      tenantId: string,
      subscription: PlatformTenantSubscription,
    ) => {
      await phaseOneApi(
        `/api/v1/platform/organizations/${encodeURIComponent(tenantId)}/subscription`,
        {
          method: "PUT",
          body: JSON.stringify({
            planCode: subscription.plan,
            status:
              SERVER_BILLING_STATUS_FOR[
                subscription.billingStatus
              ],
            monthlyAmountMinor:
              subscription.monthlyAmountMinor,
            seatCount: subscription.seatCount,
            currencyCode: subscription.currencyCode,
            /*
             * Empty strings are the form's "unset"; the server expects the
             * field to be absent rather than an unparseable date.
             */
            ...(subscription.trialEndsAt
              ? { trialEndsAt: subscription.trialEndsAt }
              : {}),
            ...(subscription.renewsAt
              ? { renewsAt: subscription.renewsAt }
              : {}),
          }),
        },
      );

      await reload();
    },
    [reload],
  );

  const applyTenantActivation = useCallback(
    (
      tenantId: string,
      input: ApplyPlatformTenantActivationInput,
    ) => {
      setWorkspace((current) => {
        const existing = current.tenants.find((tenant) => tenant.id === tenantId);
        if (!existing) return current;
        const existingOwner = existing.users.find(
          (user) => user.email.toLowerCase() === input.ownerEmail.toLowerCase(),
        );
        const owner: PlatformTenantUserRecord = {
          id: existingOwner?.id ?? createIdentifier("tenant-user"),
          displayName: input.ownerName.trim(),
          email: input.ownerEmail.trim(),
          role: "Tenant Administrator",
          status: "active",
          photoDataUrl: existingOwner?.photoDataUrl,
          createdAt: existingOwner?.createdAt ?? new Date().toISOString(),
        };
        const users = existingOwner
          ? existing.users.map((user) => user.id === existingOwner.id ? owner : user)
          : [...existing.users, owner];
        const updated = updateTenantRecord(current, tenantId, (tenant) => ({
          ...tenant,
          backendTenantId: input.backendTenantId,
          status: "active",
          primaryContactName: input.ownerName.trim(),
          primaryContactEmail: input.ownerEmail.trim(),
          subscription: input.subscription,
          users,
          updatedAt: new Date().toISOString(),
        }));
        return {
          ...updated,
          auditEvents: [
            createAuditEvent({
              organizationId: tenantId,
              organizationName: existing.organizationName,
              category: "tenant",
              severity: "warning",
              action: "tenant.activated",
              description: `Tenant and owner access activated for ${owner.email}.`,
              actorLabel: "Platform administrator",
            }),
            ...current.auditEvents,
          ],
        };
      });
    },
    [],
  );

  const updateEntitlement = useCallback(
    async (
      tenantId: string,
      moduleCode: string,
      enabled: boolean,
    ) => {
      await phaseOneApi(
        `/api/v1/platform/organizations/${encodeURIComponent(tenantId)}/entitlements/${encodeURIComponent(moduleCode)}`,
        {
          method: "PUT",
          body: JSON.stringify({ enabled }),
        },
      );

      await reload();
    },
    [reload],
  );

  const updateTenantSettings = useCallback(
    (
      tenantId: string,
      settings: PlatformTenantSettings,
    ) => {
      setWorkspace((current) => {
        const existing = current.tenants.find(
          (tenant) => tenant.id === tenantId,
        );

        if (existing === undefined) {
          return current;
        }

        const updated = updateTenantRecord(
          current,
          tenantId,
          (tenant) => ({
            ...tenant,
            settings,
            updatedAt: new Date().toISOString(),
          }),
        );

        return {
          ...updated,
          auditEvents: [
            createAuditEvent({
              organizationId: tenantId,
              organizationName:
                existing.organizationName,
              category: "settings",
              severity: "information",
              action: "tenant.settings.updated",
              description:
                "Tenant defaults and localization settings were updated.",
              actorLabel: "Platform administrator",
            }),
            ...current.auditEvents,
          ],
        };
      });
    },
    [],
  );

  const createSupportAccess = useCallback(
    async (
      input: CreatePlatformSupportAccessInput,
    ) => {
      await phaseOneApi("/api/v1/platform/support-access", {
        method: "POST",
        body: JSON.stringify({
          tenantId: input.organizationId,
          reason: input.reason.trim(),
          expiresAt: input.expiresAt,
        }),
      });

      await reload();
    },
    [reload],
  );

  const setSupportAccessStatus = useCallback(
    async (
      accessId: string,
      status: PlatformSupportAccessStatus,
    ) => {
      const serverStatus =
        SERVER_SUPPORT_STATUS_FOR[status];

      /*
       * "expired" is a derived view of an ACTIVE grant past its expiry,
       * not a transition the server accepts.
       */
      if (serverStatus === undefined) {
        return;
      }

      await phaseOneApi(
        `/api/v1/platform/support-access/${encodeURIComponent(accessId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: serverStatus }),
        },
      );

      await reload();
    },
    [reload],
  );

  const updateSystemSettings = useCallback(
    (settings: PlatformSystemSettings) => {
      setWorkspace((current) => ({
        ...current,
        systemSettings: settings,
        auditEvents: [
          createAuditEvent({
            category: "settings",
            severity: "warning",
            action: "platform.settings.updated",
            description:
              "Platform-wide configuration defaults were updated.",
            actorLabel: "Platform administrator",
          }),
          ...current.auditEvents,
        ],
      }));
    },
    [],
  );

  /*
   * Archives the tenant on the server. The typed confirmation is still
   * checked here so the operator cannot archive the wrong organization.
   */
  const removeTenant = useCallback(
    async (
      tenantId: string,
      confirmation: string,
    ): Promise<boolean> => {
      const tenant = workspace.tenants.find(
        (record) => record.id === tenantId,
      );

      if (
        tenant === undefined ||
        confirmation !== tenant.organizationName
      ) {
        return false;
      }

      await phaseOneApi(
        `/api/v1/platform/organizations/${encodeURIComponent(tenantId)}`,
        {
          method: "DELETE",
          body: JSON.stringify({
            reason: `Archived from the platform console by confirmation of "${confirmation}".`,
          }),
        },
      );

      await reload();

      return true;
    },
    [reload, workspace.tenants],
  );

  const value =
    useMemo<PlatformAdministrationContextValue>(
      () => ({
        ready,
        loadError,
        reload,
        workspace,
        getTenant,
        createTenant,
        updateTenantProfile,
        setTenantStatus,
        addBranch,
        addTenantUser,
        updateSubscription,
        applyTenantActivation,
        updateEntitlement,
        updateTenantSettings,
        createSupportAccess,
        setSupportAccessStatus,
        updateSystemSettings,
        removeTenant,
      }),
      [
        addBranch,
        addTenantUser,
        applyTenantActivation,
        createSupportAccess,
        createTenant,
        getTenant,
        loadError,
        ready,
        reload,
        removeTenant,
        setSupportAccessStatus,
        setTenantStatus,
        updateEntitlement,
        updateSubscription,
        updateSystemSettings,
        updateTenantProfile,
        updateTenantSettings,
        workspace,
      ],
    );

  return (
    <PlatformAdministrationContext.Provider
      value={value}
    >
      {children}
    </PlatformAdministrationContext.Provider>
  );
}

export function usePlatformAdministration():
  PlatformAdministrationContextValue {
  const context = useContext(
    PlatformAdministrationContext,
  );

  if (context === undefined) {
    throw new Error(
      "usePlatformAdministration must be used inside PlatformAdministrationProvider.",
    );
  }

  return context;
}
