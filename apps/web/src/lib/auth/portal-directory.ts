import type { WonFlowRole } from "./accounts";

/**
 * What each portal is called, and who it is for.
 *
 * One person can legitimately hold several of these — a consultant who also
 * administers the hospital and covers the billing counter is three portals on
 * one set of credentials, not three accounts. The sign-in screen groups by
 * this table so that person sees "Doctor Workspace, Hospital Administration,
 * Billing" rather than three rows reading the same organisation name.
 *
 * `audience` is a presentation grouping, not a security boundary. Nothing here
 * grants access: the server decides that from the identity's own memberships.
 */

export type PortalAudience = "hospital" | "patient";

export interface PortalDescriptor {
  role: WonFlowRole;
  label: string;
  description: string;
  audience: PortalAudience;
  /** Tailwind-free hex, used for the tile accent so the colour system stays in one place. */
  accent: string;
}

export const PORTAL_DIRECTORY: Record<WonFlowRole, PortalDescriptor> = {
  doctor: {
    role: "doctor",
    label: "Doctor Workspace",
    description: "Consultations, care plans, orders and prescriptions",
    audience: "hospital",
    accent: "#4f46e5",
  },
  reception: {
    role: "reception",
    label: "Reception",
    description: "Registration, appointments, the queue and the counter",
    audience: "hospital",
    accent: "#0ea5e9",
  },
  physiotherapist: {
    role: "physiotherapist",
    label: "Physiotherapy",
    description: "Caseload, exercise prescription and precaution orders",
    audience: "hospital",
    accent: "#0891b2",
  },
  nutritionist: {
    role: "nutritionist",
    label: "Dietetics",
    description: "Screening, targets, enzyme dosing and meal plans",
    audience: "hospital",
    accent: "#059669",
  },
  laboratory: {
    role: "laboratory",
    label: "Laboratory",
    description: "Specimen collection, processing and result release",
    audience: "hospital",
    accent: "#7c3aed",
  },
  radiology: {
    role: "radiology",
    label: "Radiology",
    description: "Imaging worklist, reporting and release",
    audience: "hospital",
    accent: "#a855f7",
  },
  pharmacy: {
    role: "pharmacy",
    label: "Pharmacy",
    description: "Dispensing, stock, batches and returns",
    audience: "hospital",
    accent: "#16a34a",
  },
  billing: {
    role: "billing",
    label: "Billing",
    description: "Invoices, payments, refunds and the day's ledger",
    audience: "hospital",
    accent: "#ea580c",
  },
  admin: {
    role: "admin",
    label: "Hospital Administration",
    description: "Team, services, schedules, policies and audit",
    audience: "hospital",
    accent: "#2563eb",
  },
  management: {
    role: "management",
    label: "Management",
    description: "Performance, activity and financial position",
    audience: "hospital",
    accent: "#475569",
  },
  platform: {
    role: "platform",
    label: "Platform Administration",
    description: "Tenants, entitlements and platform-wide configuration",
    audience: "hospital",
    accent: "#0f172a",
  },
  patient: {
    role: "patient",
    label: "Patient Portal",
    description: "Your appointments, recovery tasks, results and documents",
    audience: "patient",
    accent: "#2563eb",
  },
};

export function portalFor(role: string): PortalDescriptor | undefined {
  return PORTAL_DIRECTORY[role as WonFlowRole];
}

export function audienceOf(role: string): PortalAudience {
  return portalFor(role)?.audience ?? "hospital";
}
