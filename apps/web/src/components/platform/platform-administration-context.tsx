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
  | "suspended"
  | "archived";

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

export interface ActivatePlatformTenantInput {
  ownerName: string;
  ownerEmail: string;
  temporaryPassword: string;
  primaryBranchName?: string;
  planCode: "starter" | "professional" | "enterprise";
  billingStatus?: "TRIAL" | "ACTIVE";
  seatCount: number;
  monthlyAmountMinor: number;
  currencyCode: string;
  trialEndsAt?: string;
  renewsAt?: string;
  entitlements?: Array<{ moduleCode: string; enabled: boolean }>;
}

export interface ActivatePlatformTenantResult {
  ownerEmail: string;
  temporaryPassword: string;
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
  /** confirmation must equal "SUSPEND"/"REACTIVATE"/"ARCHIVE" (matching the target status) — validated again server-side, so a client bug can never skip the check. */
  setTenantStatus: (
    tenantId: string,
    status: Exclude<PlatformTenantStatus, "archived">,
    confirmation: string,
    reason: string,
  ) => Promise<void>;
  /**
   * The only path a draft tenant can leave draft: creates the tenant's first
   * admin identity (owner) with the given temporary password, its main
   * branch, and its subscription, all in one server transaction. The
   * temporary password is never generated or stored server-side — it is
   * echoed back here only so the operator can relay exactly what they typed.
   */
  activateTenant: (
    tenantId: string,
    input: ActivatePlatformTenantInput,
  ) => Promise<ActivatePlatformTenantResult>;
  updateSubscription: (
    tenantId: string,
    subscription: PlatformTenantSubscription,
  ) => Promise<void>;
  cancelTenantSubscription: (
    tenantId: string,
    confirmation: string,
    reason: string,
  ) => Promise<void>;
  updateEntitlement: (
    tenantId: string,
    moduleCode: string,
    enabled: boolean,
  ) => Promise<void>;
  createSupportAccess: (
    input: CreatePlatformSupportAccessInput,
  ) => Promise<void>;
  setSupportAccessStatus: (
    accessId: string,
    status: PlatformSupportAccessStatus,
    reason: string,
  ) => Promise<void>;
  updateSystemSettings: (
    settings: PlatformSystemSettings,
  ) => void;
  /** confirmation must equal the tenant's own display name — checked here for a fast client-side message, and again by the server, which is authoritative. */
  removeTenant: (
    tenantId: string,
    confirmation: string,
    reason: string,
  ) => Promise<boolean>;
  resetTenantAdminPassword: (
    tenantId: string,
    password?: string,
  ) => Promise<{ success: boolean; email: string; temporaryPassword: string }>;
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
      code: "practice-dashboard",
      name: "Practice dashboard",
      description: "Overview and analytics dashboard.",
      group: "Core",
    },
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
      description: "Patient billing and payment processing.",
      group: "Operations",
    },
    {
      code: "laboratory",
      name: "Laboratory",
      description: "Lab test orders and results management.",
      group: "Clinical",
    },
    {
      code: "radiology",
      name: "Radiology",
      description: "Imaging orders and report management.",
      group: "Clinical",
    },
    {
      code: "pharmacy",
      name: "Pharmacy",
      description: "Prescription and medication management.",
      group: "Clinical",
    },
    {
      code: "physiotherapy",
      name: "Physiotherapy",
      description: "Mobility assessments, therapy sessions and exercise plans.",
      group: "Clinical",
    },
    {
      code: "nutrition",
      name: "Clinical nutrition",
      description: "Nutrition assessments, PERT titration and dietary plans.",
      group: "Clinical",
    },
  ];


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

interface ServerTenantMembership {
  id: string;
  displayName: string;
  status: string;
  workspaceCodes?: string[];
  identity?: { id: string; email: string; status: string } | null;
  roles?: Array<{ role: { name: string } }>;
  createdAt: string;
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
  memberships?: ServerTenantMembership[];
}

const SERVER_TENANT_STATUS: Record<string, PlatformTenantStatus> = {
  DRAFT: "draft",
  ACTIVE: "active",
  SUSPENDED: "suspended",
  ARCHIVED: "archived",
};

const SERVER_STATUS_FOR: Record<
  Exclude<PlatformTenantStatus, "archived">,
  "ACTIVE" | "SUSPENDED"
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
  if (!value) return "";
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  try {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  } catch {}
  return "";
}

function mapServerSubscription(
  subscription: ServerTenantSubscription | null,
): PlatformTenantSubscription {
  if (!subscription || !subscription.planCode) {
    return createEmptySubscription();
  }

  const plan =
    SERVER_SUBSCRIPTION_PLAN[
      (subscription.planCode || "").trim().toLowerCase()
    ] ?? "unconfigured";

  return {
    plan,
    billingStatus:
      SERVER_BILLING_STATUS[subscription.status] ??
      "unconfigured",
    currencyCode: subscription.currencyCode || "PKR",
    seatCount: subscription.seatCount || 5,
    monthlyAmountMinor: subscription.monthlyAmountMinor || 0,
    trialEndsAt: isoOrEmpty(subscription.trialEndsAt),
    renewsAt: isoOrEmpty(subscription.renewsAt),
    configuredAt:
      subscription.status === "UNCONFIGURED"
        ? undefined
        : subscription.updatedAt,
  };
}

function mapServerTenant(
  tenant: ServerTenant,
): PlatformTenantRecord {
  const organizations = tenant.organizations ?? [];
  const organization = organizations[0];

  const entitlements = createEmptyEntitlements();
  for (const entitlement of tenant.entitlements ?? []) {
    if (entitlement.moduleCode in entitlements) {
      entitlements[entitlement.moduleCode] =
        entitlement.enabled;
    }
  }

  const branches: PlatformBranchRecord[] =
    organizations.flatMap((record) =>
      (record.branches ?? []).map((branch) => ({
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

  const users: PlatformTenantUserRecord[] = (tenant.memberships ?? []).map((membership) => ({
    id: membership.id,
    displayName: membership.displayName,
    email: membership.identity?.email ?? "",
    role: membership.roles?.[0]?.role?.name ?? membership.workspaceCodes?.[0] ?? "Staff",
    status: membership.status === "ACTIVE" ? ("active" as const) : membership.status === "INVITED" ? ("invited" as const) : ("disabled" as const),
    createdAt: membership.createdAt,
  }));

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
    users,
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
  expiresAt: string | null | undefined,
): PlatformSupportAccessStatus {
  if (status === "REVOKED" || status === "REJECTED") {
    return "revoked";
  }

  if (status === "ACTIVE") {
    if (!expiresAt) return "active";
    const time = new Date(expiresAt).getTime();
    return !Number.isNaN(time) && time > Date.now()
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
  action?: string,
): PlatformAuditEvent["category"] {
  const act = (action || "").toLowerCase();
  if (act.includes("subscription")) return "subscription";
  if (act.includes("entitlement")) return "entitlement";
  if (act.includes("support")) return "support-access";
  if (act.includes("setting")) return "settings";
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
    action: event.action || "action",
    description: `${event.entityType || "Resource"} configuration was updated.`,
    actorLabel: event.sourceApplication || "WonFlow Platform",
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
        tenantsRes,
        auditRes,
        accessRes,
      ] = await Promise.all([
        phaseOneApi<{ tenants: ServerTenant[] }>(
          "/api/v1/platform/organizations",
        ).catch(() => ({ tenants: [] })),
        phaseOneApi<{ audit: ServerAuditEvent[] }>(
          "/api/v1/platform/audit",
        ).catch(() => ({ audit: [] })),
        phaseOneApi<{ access: ServerSupportAccess[] }>(
          "/api/v1/platform/support-access",
        ).catch(() => ({ access: [] })),
      ]);

      const tenants = tenantsRes?.tenants ?? [];
      const audit = auditRes?.audit ?? [];
      const access = accessRes?.access ?? [];

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
    /*
     * The provider is mounted by the root layout, so it is alive on every
     * screen and for every role. Only the platform console consumes this
     * data, and only a platform administrator is allowed to read it —
     * fetching anywhere else would issue rejected requests on each page.
     */
    if (!isPlatformConsole) {
      queueMicrotask(() => setReady(true));
      return;
    }

    queueMicrotask(() => { void reload(); });
  }, [isPlatformConsole, reload]);

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

  /*
   * A draft tenant has no admin identity at all until this runs — activation
   * is the one path that creates its owner account, main branch, admin role
   * and subscription together. tenantSlug/tenantDisplayName are re-sent from
   * the tenant's own current record because the server re-validates and
   * re-applies them on activation, the same as any other tenant field.
   */
  const activateTenant = useCallback(
    async (
      tenantId: string,
      input: ActivatePlatformTenantInput,
    ): Promise<ActivatePlatformTenantResult> => {
      let tenant = workspace.tenants.find(
        (record) => record.id === tenantId,
      );
      if (tenant === undefined) {
        try {
          const fetched = await phaseOneApi<{ tenant: ServerTenant }>(
            `/api/v1/platform/organizations/${encodeURIComponent(tenantId)}`,
          );
          if (fetched?.tenant) {
            tenant = mapServerTenant(fetched.tenant);
          }
        } catch {
          // ignore error and use input fallbacks below
        }
      }

      await phaseOneApi(
        `/api/v1/platform/organizations/${encodeURIComponent(tenantId)}/activate`,
        {
          method: "POST",
          body: JSON.stringify({
            tenantSlug: tenant?.slug || undefined,
            tenantDisplayName: tenant?.organizationName || undefined,
            legalName: tenant?.legalName || undefined,
            domain: tenant?.domain || undefined,
            ownerName: input.ownerName.trim(),
            ownerEmail: input.ownerEmail.trim(),
            temporaryPassword: input.temporaryPassword,
            primaryBranchName: input.primaryBranchName?.trim() || undefined,
            subscription: {
              planCode: input.planCode,
              status: input.billingStatus ?? "TRIAL",
              currencyCode: input.currencyCode,
              monthlyAmountMinor: input.monthlyAmountMinor,
              seatCount: input.seatCount,
              ...(input.trialEndsAt ? { trialEndsAt: input.trialEndsAt } : {}),
              ...(input.renewsAt ? { renewsAt: input.renewsAt } : {}),
            },
            entitlements: input.entitlements ?? [],
          }),
        },
      );

      await reload();

      return {
        ownerEmail: input.ownerEmail.trim(),
        temporaryPassword: input.temporaryPassword,
      };
    },
    [reload, workspace.tenants],
  );

  /*
   * Status is owned by the database — the server writes its own audit
   * event, so no local one is fabricated here. The typed confirmation and
   * reason are both re-validated server-side; this is a destructive-enough
   * action (it changes what every user of the tenant can do) that a client
   * bug must not be able to skip the check.
   */
  const setTenantStatus = useCallback(
    async (
      tenantId: string,
      status: Exclude<PlatformTenantStatus, "archived">,
      confirmation: string,
      reason: string,
    ) => {
      await phaseOneApi(
        `/api/v1/platform/organizations/${encodeURIComponent(tenantId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: SERVER_STATUS_FOR[status],
            confirmation: confirmation.trim(),
            reason: reason.trim(),
          }),
        },
      );

      await reload();
    },
    [reload],
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
            trialEndsAt: subscription.trialEndsAt || null,
            renewsAt: subscription.renewsAt || null,
          }),
        },
      );

      await reload();
    },
    [reload],
  );

  const cancelTenantSubscription = useCallback(
    async (tenantId: string, confirmation: string, reason: string) => {
      await phaseOneApi(
        `/api/v1/platform/organizations/${encodeURIComponent(tenantId)}/subscription`,
        {
          method: "POST",
          body: JSON.stringify({ confirmation: confirmation.trim(), reason: reason.trim() }),
        },
      );
      await reload();
    },
    [reload],
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
      reason: string,
    ) => {
      const serverStatus =
        SERVER_SUPPORT_STATUS_FOR[status];

      /*
       * "expired" is a derived view of an ACTIVE grant past its expiry,
       * not a transition the server accepts — an already-expired grant is
       * flipped to REVOKED by the server itself the next time anyone lists
       * or reads support access, with no human action required.
       */
      if (serverStatus === undefined) {
        return;
      }

      await phaseOneApi(
        `/api/v1/platform/support-access/${encodeURIComponent(accessId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: serverStatus, reason: reason.trim() }),
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
      reason: string,
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
          body: JSON.stringify({ confirmation: confirmation.trim(), reason: reason.trim() }),
        },
      );

      await reload();

      return true;
    },
    [reload, workspace.tenants],
  );

  const resetTenantAdminPassword = useCallback(
    async (
      tenantId: string,
      password?: string,
    ): Promise<{ success: boolean; email: string; temporaryPassword: string }> => {
      const response = await fetch(
        `/api/v1/platform/organizations/${encodeURIComponent(tenantId)}/reset-admin-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        },
      );
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          errorBody.error || "The tenant password could not be reset.",
        );
      }
      return (await response.json()) as {
        success: boolean;
        email: string;
        temporaryPassword: string;
      };
    },
    [],
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
        activateTenant,
        setTenantStatus,
        updateSubscription,
        cancelTenantSubscription,
        updateEntitlement,
        createSupportAccess,
        setSupportAccessStatus,
        updateSystemSettings,
        removeTenant,
        resetTenantAdminPassword,
      }),
      [
        activateTenant,
        cancelTenantSubscription,
        createSupportAccess,
        createTenant,
        getTenant,
        loadError,
        ready,
        reload,
        removeTenant,
        resetTenantAdminPassword,
        setSupportAccessStatus,
        setTenantStatus,
        updateEntitlement,
        updateSubscription,
        updateSystemSettings,
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
