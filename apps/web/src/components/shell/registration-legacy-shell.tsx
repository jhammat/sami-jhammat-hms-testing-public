"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import {
  Activity,
  BadgeDollarSign,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Command,
  FileClock,
  FileText,
  FlaskConical,
  HeartPulse,
  History,
  Landmark,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Menu,
  Network,
  Boxes,
  Pill,
  PackageCheck,
  ReceiptText,
  RotateCcw,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
  Syringe,
  UserPlus,
  UserRound,
  Users,
  X,
} from "lucide-react";

import type {
  LucideIcon,
} from "lucide-react";

import type {
  WorkspaceCode,
} from "@wonflow/database";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  WonFlowLogo,
} from "@/components/brand/wonflow-logo";

import { WonFlowConfirmHost } from "@/components/feedback";

import { ThemeToggle } from "./theme-toggle";

import {
  useWonFlowSession,
} from "@/app/_providers";

interface NavigationItem {
  label: string;
  href: string;

  icon: LucideIcon;

  description: string;

  activePrefixes?: readonly string[];
}

interface NavigationGroup {
  label: string;

  items:
    readonly NavigationItem[];
}

/** Dispatched after a profile photo is saved so the shell chip re-reads it. */
export const WONFLOW_AVATAR_CHANGED_EVENT = "wonflow:profile-photo-changed";

const fullNavigationGroups:
  readonly NavigationGroup[] = [
    {
      label: "Hospital Operations",

      items: [
        {
          label:
            "Operations Overview",

          href: "/operations",

          icon:
            LayoutDashboard,

          description:
            "Hospital activity and operational overview",
        },
        {
          label:
            "Reception Desk",

          href:
            "/operations/reception",

          icon:
            LayoutDashboard,

          description:
            "Search, register, appoint and bill patients in one workspace",
        },
        {
          label:
            "Patient Directory",

          href:
            "/operations/patients",

          icon: Users,

          description:
            "Search and manage patient identities",
        },
        {
          label:
            "Appointments",

          href:
            "/operations/appointments",

          icon:
            CalendarDays,

          description:
            "Appointment directory and scheduling calendar",
        },
        {
          label:
            "Billing Counter",

          href:
            "/operations/billing/new",

          icon:
            ReceiptText,

          description:
            "Create invoices and receive payments",
        },
        {
          label:
            "Billing Refunds",

          href:
            "/operations/billing/refunds",

          icon:
            BadgeDollarSign,

          description:
            "Cashier refunds, payment reversals and credit notes",
        },
        {
          label: "Pharmacy",

          href:
            "/operations/pharmacy",

          icon: Pill,

          description:
            "Prescription queue, medicine stock and dispensing",
        },
        {
          label:
            "Pharmacy Inventory",

          href:
            "/operations/pharmacy/inventory",

          icon: Boxes,

          description:
            "Medicine batches, suppliers, purchasing and expiry alerts",
        },
        {
          label:
            "Medicine Returns",

          href:
            "/operations/pharmacy/returns",

          icon: RotateCcw,

          description:
            "Returned medicines, stock reversal and refund coordination",
        },
      ],
    },
    {
      label:
        "Clinical Workspace",

      items: [
        {
          label:
            "Doctor Dashboard",

          href: "/doctor",

          icon:
            Stethoscope,

          description:
            "Doctor schedule and clinical activity",
        },
        {
          label:
            "Patient Consultations",

          href:
            "/doctor/consultations",

          icon: Activity,

          description:
            "Doctor patient queue and consultations",

          activePrefixes: [
            "/doctor/encounters",
          ],
        },
        {
          label:
            "Radiology Results",

          href:
            "/doctor/radiology-results",

          icon:
            ScanLine,

          description:
            "Review finalized imaging reports and critical findings",
        },
      ],
    },
    {
      label:
        "Diagnostic Services",

      items: [
        {
          label:
            "Laboratory",

          href:
            "/operations/laboratory",

          icon:
            FlaskConical,

          description:
            "Laboratory orders and specimen processing",
        },
        {
          label:
            "Radiology",

          href:
            "/operations/radiology",

          icon:
            ScanLine,

          description:
            "Imaging orders and radiology reporting",
        },
      ],
    },
    {
      label:
        "Administration",

      items: [
        {
          label:
            "Organization",

          href:
            "/organization",

          icon:
            Building2,

          description:
            "Organization and branch administration",
        },
        {
          label:
            "Management",

          href:
            "/management",

          icon:
            BarChart3,

          description:
            "Executive and management insights",
        },
        {
          label:
            "Platform Admin",

          href:
            "/platform",

          icon:
            ShieldCheck,

          description:
            "Tenant and platform administration",
        },
        {
          label:
            "Patient Access",

          href:
            "/patient",

          icon:
            UserRound,

          description:
            "Patient-facing appointments and records",
        },
      ],
    },
  ];

const receptionNavigationGroups:
  readonly NavigationGroup[] = [
    {
      label: "Reception",

      items: [
        {
          label: "Reception Desk",
          href: "/operations/reception",
          icon: LayoutDashboard,
          description:
            "Search, register, appoint and bill patients in one workspace",
        },
        {
          label: "Today’s Appointments",
          href: "/operations/appointments",
          icon: CalendarDays,
          description:
            "View and manage today’s appointment schedule",
        },
        {
          label: "Patient Directory",
          href: "/operations/patients",
          icon: Users,
          description:
            "Search and open existing patient records",
        },
      ],
    },
  ];

const laboratoryNavigationGroups:
  readonly NavigationGroup[] = [
    {
      label: "Laboratory",

      items: [
        {
          label: "Worklist",
          href: "/operations/laboratory",
          icon: FlaskConical,
          description:
            "Every diagnostic order for the branch and date",
        },
        {
          label: "Specimen Collection",
          href: "/operations/laboratory/collection",
          icon: Syringe,
          description:
            "Orders still waiting for a specimen",
        },
        {
          label: "Processing",
          href: "/operations/laboratory/processing",
          icon: Activity,
          description:
            "Specimens accepted and on the bench",
        },
      ],
    },
    {
      label: "Results",

      items: [
        {
          label: "Pending Release",
          href: "/operations/laboratory/release",
          icon: ListOrdered,
          description:
            "Entered results awaiting verification",
        },
        {
          label: "Released Results",
          href: "/operations/laboratory/released",
          icon: PackageCheck,
          description:
            "Verified results and who received them",
        },
        {
          label: "Critical Results",
          href: "/operations/laboratory/critical",
          icon: HeartPulse,
          description:
            "Results flagged for urgent clinical attention",
        },
      ],
    },
  ];

const radiologyNavigationGroups:
  readonly NavigationGroup[] = [
    {
      label: "Radiology",

      items: [
        {
          label: "Worklist",
          href: "/operations/radiology",
          icon: ScanLine,
          description:
            "Every imaging request for the branch and date",
        },
        {
          label: "Studies In Progress",
          href: "/operations/radiology/processing",
          icon: Activity,
          description:
            "Imaging requests currently being performed",
        },
      ],
    },
    {
      label: "Reports",

      items: [
        {
          label: "Pending Release",
          href: "/operations/radiology/release",
          icon: ListOrdered,
          description:
            "Drafted reports awaiting verification",
        },
        {
          label: "Released Reports",
          href: "/operations/radiology/released",
          icon: PackageCheck,
          description:
            "Verified reports and who received them",
        },
        {
          label: "Critical Findings",
          href: "/operations/radiology/critical",
          icon: HeartPulse,
          description:
            "Reports flagged for urgent clinical attention",
        },
      ],
    },
  ];

const pharmacyNavigationGroups:
  readonly NavigationGroup[] = [
    {
      label: "Pharmacy",

      items: [
        {
          label: "Dispensing",
          href: "/operations/pharmacy",
          icon: Pill,
          description:
            "Prescription dispensing worklist",
        },
        {
          label: "Inventory",
          href: "/operations/pharmacy/inventory",
          icon: Boxes,
          description:
            "Stock levels, batches and suppliers",
        },
        {
          label: "Returns",
          href: "/operations/pharmacy/returns",
          icon: RotateCcw,
          description:
            "Medicine returns and restocking",
        },
      ],
    },
  ];

const billingNavigationGroups:
  readonly NavigationGroup[] = [
    {
      label: "Billing",

      items: [
        {
          label: "New Invoice",
          href: "/operations/billing/new",
          icon: ReceiptText,
          description:
            "Raise a patient invoice and collect payment",
        },
        {
          label: "Refunds",
          href: "/operations/billing/refunds",
          icon: RotateCcw,
          description:
            "Review and approve billing refunds",
        },
      ],
    },
  ];

const managementNavigationGroups:
  readonly NavigationGroup[] = [
    {
      label: "Management",

      items: [
        {
          label: "Performance",
          href: "/management",
          icon: BarChart3,
          description:
            "Hospital performance and operational reporting",
        },
      ],
    },
  ];

const doctorNavigationGroups:
  readonly NavigationGroup[] = [
    {
      label: "Doctor Workspace",

      items: [
        {
          label: "Dashboard",
          href: "/doctor",
          icon: LayoutDashboard,
          description:
            "Today’s queue, appointments and clinical activity",
        },
        {
          label: "My Patients",
          href: "/doctor/patients",
          icon: Users,
          description:
            "Recent, follow-up and assigned patients",
        },
        {
          label: "Register Patient",
          href: "/doctor/register-patient",
          icon: UserPlus,
          description:
            "Register a walk-in or a patient bringing previous records",
        },
        {
          label: "Appointments",
          href: "/doctor/appointments",
          icon: CalendarDays,
          description:
            "Doctor appointment schedule and patient queue",
        },
        {
          label: "My Schedule",
          href: "/doctor/schedule",
          icon: CalendarPlus,
          description:
            "Weekly rostered hours patients and reception book against",
        },
      ],
    },
    {
      label: "Clinical",

      items: [
        {
          label: "Consultations",
          href: "/doctor/consultations",
          icon: Activity,
          description:
            "Active and completed consultations",

          activePrefixes: [
            "/doctor/encounters",
          ],
        },
        {
          label: "Results",
          href: "/doctor/results",
          icon: ScanLine,
          description:
            "Review laboratory and radiology results",

          activePrefixes: [
            "/doctor/radiology-results",
          ],
        },
        {
          label: "Documents",
          href: "/doctor/documents",
          icon: FileText,
          description:
            "Patient records, uploads and shared reports",
        },
        {
          label: "Follow-ups",
          href: "/doctor/follow-ups",
          icon: FileClock,
          description:
            "Patients due a follow-up visit",
        },
        {
          label: "History",
          href: "/doctor/history",
          icon: History,
          description:
            "Past consultation and encounter history",
        },
        // Messaging (/doctor/messages, /patient/messages) is deliberately not
        // linked: it has no database tables and no API routes, so both screens
        // render a "no identity was inferred" notice even to a signed-in user.
        // Link them once messaging is actually implemented server-side.
      ],
    },
    {
      label: "Account",

      items: [
        {
          label: "Profile",
          href: "/doctor/profile",
          icon: UserRound,
          description:
            "Doctor profile and availability information",
        },
        {
          label: "Fees & Services",
          href: "/doctor/fees",
          icon: BadgeDollarSign,
          description:
            "Manage consultation services when hospital access allows it",
        },
        {
          label: "Settings",
          href: "/doctor/settings",
          icon: Settings,
          description:
            "Notification and workspace preferences",
        },
      ],
    },
  ];

const patientNavigationGroups:
  readonly NavigationGroup[] = [
    {
      label: "Patient Access",

      items: [
        {
          label: "Home",
          href: "/patient",
          icon: LayoutDashboard,
          description:
            "Appointments, prescriptions and care summary",
        },
        {
          label: "Appointments",
          href: "/patient/appointments",
          icon: CalendarDays,
          description:
            "Book and view hospital appointments",
        },
        {
          label: "Care",
          href: "/patient/care",
          icon: HeartPulse,
          description:
            "Medicines, tests and doctor instructions",
        },
        {
          label: "Reports",
          href: "/patient/reports",
          icon: ScanLine,
          description:
            "View released laboratory and radiology reports",
        },
        {
          label: "Documents",
          href: "/patient/documents",
          icon: FileText,
          description:
            "Upload and share your previous records with your doctor",
        },
        {
          label: "Billing",
          href: "/patient/billing",
          icon: ReceiptText,
          description:
            "Invoices, payments and outstanding balance",
        },
        {
          label: "Profile",
          href: "/patient/profile",
          icon: UserRound,
          description:
            "Personal information and account settings",
        },
      ],
    },
  ];

const adminNavigationGroups:
  readonly NavigationGroup[] = [
    {
      label: "Hospital Overview",

      items: [
        {
          label: "Dashboard",
          href: "/admin",
          icon: LayoutDashboard,
          description:
            "Hospital activity, capacity and financial overview",
        },
        {
          label: "Hospital Setup",
          href: "/admin/setup",
          icon: Settings,
          description:
            "Configure organization identity, defaults and onboarding",
          activePrefixes: [
            "/admin/settings",
          ],
        },
      ],
    },
    {
      label: "People & Locations",

      items: [
        {
          label: "Branches & Locations",
          href: "/admin/locations",
          icon: Building2,
          description:
            "Manage branches, clinic locations and operating hours",
        },
        {
          label: "Team & Permissions",
          href: "/admin/team",
          icon: Users,
          description:
            "Invite users and manage roles, access and assignments",
          activePrefixes: [
            "/admin/users",
            "/admin/staff",
          ],
        },
        {
          label: "Departments",
          href: "/admin/departments",
          icon: Network,
          description:
            "Manage clinical departments doctors are assigned to",
        },
        {
          label: "Doctors & Clinical Staff",
          href: "/admin/doctors",
          icon: Stethoscope,
          description:
            "Manage clinical staff, specialties and branch assignments",
        },
        {
          label: "Schedules",
          href: "/admin/schedules",
          icon: CalendarDays,
          description:
            "Set expected arrival hours for doctors and staff",
        },
      ],
    },
    {
      label: "Services & Governance",

      items: [
        {
          label: "Services & Prices",
          href: "/admin/services",
          icon: BadgeDollarSign,
          description:
            "Manage services, custom services, fees and eligibility",
          activePrefixes: [
            "/admin/catalogue",
          ],
        },
        {
          label: "Payment Accounts",
          href: "/admin/payment-accounts",
          icon: Landmark,
          description:
            "Bank, JazzCash and Easypaisa accounts patients pay online consultations to",
        },
        {
          label: "Policies & Content",
          href: "/admin/policies",
          icon: ShieldCheck,
          description:
            "Configure policies, consent, notices and templates",
          activePrefixes: [
            "/admin/content",
          ],
        },
        {
          label: "Audit Trail",
          href: "/admin/audit",
          icon: BarChart3,
          description:
            "Review hospital configuration and access events",
        },
      ],
    },
  ];

const platformNavigationGroups:
  readonly NavigationGroup[] = [
    {
      label: "Platform Administration",

      items: [
        {
          label: "Overview",
          href: "/platform",
          icon: LayoutDashboard,
          description:
            "Platform-wide tenant, subscription and support overview",
        },
        {
          label: "Tenants",
          href: "/platform/organizations",
          icon: Building2,
          description:
            "Manage hospital organizations onboarded to WonFlow",
          activePrefixes: [
            "/platform/organizations/",
          ],
        },
        {
          label: "Deleted Tenants",
          href: "/platform/deleted-tenants",
          icon: History,
          description: "Retained backup records for deleted tenant organizations",
        },
        {
          label: "Entitlements",
          href: "/platform/entitlements",
          icon: ShieldCheck,
          description:
            "Feature entitlements and module access per tenant",
        },
        {
          label: "Subscriptions",
          href: "/platform/subscriptions",
          icon: ReceiptText,
          description:
            "Billing plans, seats and renewal status",
        },
        {
          label: "Support Access",
          href: "/platform/support",
          icon: Users,
          description:
            "Explicit, temporary and audited tenant support access",
        },
        {
          label: "Platform Audit",
          href: "/platform/audit",
          icon: BarChart3,
          description:
            "Platform-wide configuration and security events",
        },
        {
          label: "System Settings",
          href: "/platform/settings",
          icon: Settings,
          description:
            "Platform defaults, languages and shared experience settings",
        },
      ],
    },
  ];

/**
 * Department workspaces all live under `/operations`, so the path alone cannot
 * identify them. Keying on the signed-in workspace first stops a laboratory,
 * radiology, pharmacy or billing user from being shown the reception sidebar.
 */
const workspaceNavigationGroups:
  Partial<
    Record<
      WorkspaceCode,
      readonly NavigationGroup[]
    >
  > = {
    RECEPTION: receptionNavigationGroups,
    LABORATORY: laboratoryNavigationGroups,
    RADIOLOGY: radiologyNavigationGroups,
    PHARMACY: pharmacyNavigationGroups,
    BILLING: billingNavigationGroups,
    MANAGEMENT: managementNavigationGroups,
  };

function getNavigationGroupsForPath(
  pathname: string,
  workspace?: WorkspaceCode | null,
): readonly NavigationGroup[] {
  if (
    pathname.startsWith(
      "/operations",
    ) ||
    pathname.startsWith(
      "/management",
    )
  ) {
    const workspaceGroups =
      workspace
        ? workspaceNavigationGroups[
            workspace
          ]
        : undefined;

    if (workspaceGroups) {
      return workspaceGroups;
    }
  }

  if (
    pathname.startsWith(
      "/operations",
    )
  ) {
    return receptionNavigationGroups;
  }

  if (
    pathname.startsWith(
      "/doctor",
    )
  ) {
    return doctorNavigationGroups;
  }

  if (
    pathname.startsWith(
      "/patient",
    )
  ) {
    return patientNavigationGroups;
  }

  if (
    pathname.startsWith(
      "/admin",
    ) ||
    pathname.startsWith(
      "/organization",
    )
  ) {
    return adminNavigationGroups;
  }

  if (
    pathname.startsWith(
      "/platform",
    )
  ) {
    return platformNavigationGroups;
  }

  /*
   * Fall back to the signed-in workspace's own navigation. Returning
   * fullNavigationGroups here exposed every workspace's menu (reception,
   * pharmacy, laboratory, billing, doctor…) to whoever landed on an
   * unmatched path — including the brief render of "/" before it redirects
   * to /login. Only an unrecognised path with no workspace at all gets the
   * combined menu now.
   */
  const workspaceFallback = workspace
    ? workspaceNavigationGroups[workspace]
    : undefined;

  if (workspaceFallback) {
    return workspaceFallback;
  }

  if (workspace === "DOCTOR") return doctorNavigationGroups;
  if (workspace === "PATIENT") return patientNavigationGroups;
  if (workspace === "ADMIN") return adminNavigationGroups;

  return fullNavigationGroups;
}

/**
 * Where the sidebar logo should link. This used to be hardcoded to
 * `/operations/reception` for every workspace, so a patient or doctor
 * clicking the logo was sent to a reception page they have no permission to
 * open. Mirrors getNavigationGroupsForPath so the logo always returns to the
 * home of the workspace whose navigation is currently on screen.
 */
function getHomePathForPath(
  pathname: string,
  workspace?: WorkspaceCode | null,
): string {
  if (pathname.startsWith("/doctor")) return "/doctor";
  if (pathname.startsWith("/patient")) return "/patient";
  if (pathname.startsWith("/admin") || pathname.startsWith("/organization")) return "/admin";
  if (pathname.startsWith("/platform")) return "/platform";
  if (pathname.startsWith("/management")) return "/management";

  if (pathname.startsWith("/operations")) {
    switch (workspace) {
      case "LABORATORY":
        return "/operations/laboratory";
      case "RADIOLOGY":
        return "/operations/radiology";
      case "PHARMACY":
        return "/operations/pharmacy";
      case "BILLING":
        return "/operations/billing/new";
      default:
        return "/operations/reception";
    }
  }

  return "/";
}

function getInitials(name: string | undefined): string {
  if (!name) {
    return "?";
  }

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }

  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

function flattenNavigationGroups(
  groups:
    readonly NavigationGroup[],
): readonly NavigationItem[] {
  return groups.flatMap(
    (group) =>
      group.items,
  );
}

function isNavigationItemActive(
  item:
    NavigationItem,

  pathname: string,
): boolean {
  if (
    pathname === item.href
  ) {
    return true;
  }

  return (
    item.activePrefixes?.some(
      (prefix) =>
        pathname.startsWith(
          prefix,
        ),
    ) ?? false
  );
}

function getWorkspaceName(
  pathname: string,
): string {
  if (
    pathname.startsWith(
      "/doctor",
    )
  ) {
    return "Doctor Workspace";
  }

  if (
    pathname.startsWith(
      "/patient",
    )
  ) {
    return "Patient Access";
  }

  if (
    pathname.startsWith(
      "/management",
    )
  ) {
    return "Management Portal";
  }

  if (
    pathname.startsWith(
      "/admin",
    )
  ) {
    return "Hospital Administration";
  }

  if (
    pathname.startsWith(
      "/organization",
   )
 ) {
   return "Organization";
 }

  if (
    pathname.startsWith(
      "/platform",
    )
  ) {
    return "Platform Administration";
  }

  return "Hospital Operations";
}

interface SidebarNavigationProps {
  compact?: boolean;

  onNavigate?: () => void;

  onCompactToggle?: () => void;
}

function SidebarNavigation({
  compact = false,
  onNavigate,
  onCompactToggle,
}: SidebarNavigationProps) {
  const pathname =
    usePathname();

  const session =
    useWonFlowSession();

  const navigationGroups =
    useMemo(
      () =>
        getNavigationGroupsForPath(
          pathname,
          session?.workspace,
        ),
      [pathname, session?.workspace],
    );

  return (
    <div className="flex h-full flex-col">
      <div
        className={[
          "flex h-[76px]",
          "items-center",
          "border-b",
          "wfg-divide",
          compact
            ? "justify-center px-3"
            : "justify-between px-5",
        ].join(" ")}
      >
        <Link
          className={[
            "flex min-w-0 items-center",
            compact
              ? "justify-center"
              : "",
          ].join(" ")}
          href={getHomePathForPath(
            pathname,
            session?.workspace,
          )}
          onClick={
            onNavigate
          }
        >
          <WonFlowLogo
            compact={compact}
          />
        </Link>

        {!compact &&
        onCompactToggle !==
          undefined ? (
          <button
            aria-label="Collapse sidebar"
            className="wfg-control hidden h-9 w-9 items-center justify-center text-indigo-500 hover:text-indigo-700 lg:flex"
            onClick={
              onCompactToggle
            }
            title="Collapse sidebar"
            type="button"
          >
            <ChevronLeft
              size={17}
              strokeWidth={2}
            />
          </button>
        ) : null}
      </div>

      {compact &&
      onCompactToggle !==
        undefined ? (
        <div className="wfg-divide hidden border-b px-3 py-3 lg:block">
          <button
            aria-label="Expand sidebar"
            className="wfg-control flex h-10 w-full items-center justify-center text-indigo-500 hover:text-indigo-700"
            onClick={
              onCompactToggle
            }
            title="Expand sidebar"
            type="button"
          >
            <ChevronRight
              size={17}
              strokeWidth={2}
            />
          </button>
        </div>
      ) : null}

      <nav className="wf-scrollbar flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-6">
          {navigationGroups.map(
            (group) => (
              <section
                key={group.label}
              >
                {!compact ? (
                  <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-500/90">
                    {
                      group.label
                    }
                  </div>
                ) : (
                  <div className="mx-auto mb-2 h-px w-8 bg-indigo-300/50" />
                )}

                <div className="space-y-1">
                  {group.items.map(
                    (item) => {
                      const Icon =
                        item.icon;

                      const active =
                        isNavigationItemActive(
                          item,
                          pathname,
                        );

                      return (
                        <Link
                          aria-current={
                            active
                              ? "page"
                              : undefined
                          }
                          className={[
                            "wfg-nav-item",
                            "group relative flex",
                            "min-h-11 items-center",
                            "text-sm font-semibold",
                            compact
                              ? "justify-center px-2"
                              : "gap-3 px-3",
                            active
                              ? "text-indigo-900"
                              : "text-slate-600 hover:text-indigo-900",
                          ].join(" ")}
                          href={
                            item.href
                          }
                          key={
                            item.href
                          }
                          onClick={
                            onNavigate
                          }
                          title={
                            compact
                              ? item.label
                              : undefined
                          }
                        >
                          {active ? (
                            <span className="absolute inset-y-2.5 left-0 w-[3px] rounded-r-full bg-gradient-to-b from-blue-500 to-violet-600 shadow-[0_0_12px_rgba(75,99,255,0.65)]" />
                          ) : null}

                          <Icon
                            className={[
                              "shrink-0",
                              active
                                ? "text-indigo-600"
                                : "text-slate-400 group-hover:text-indigo-600",
                            ].join(" ")}
                            size={18}
                            strokeWidth={
                              active
                                ? 2.2
                                : 1.9
                            }
                          />

                          {!compact ? (
                            <span className="min-w-0 flex-1 truncate">
                              {
                                item.label
                              }
                            </span>
                          ) : null}
                        </Link>
                      );
                    },
                  )}
                </div>
              </section>
            ),
          )}
        </div>
      </nav>

      <div className="wfg-divide h-3 border-t" />
    </div>
  );
}

interface CommandPaletteProps {
  open: boolean;

  onClose: () => void;
}

function CommandPalette({
  open,
  onClose,
}: CommandPaletteProps) {
  const router =
    useRouter();

  const pathname =
    usePathname();

  const session =
    useWonFlowSession();

  const navigationGroups =
    useMemo(
      () =>
        getNavigationGroupsForPath(
          pathname,
          session?.workspace,
        ),
      [pathname, session?.workspace],
    );

  const allNavigationItems =
    useMemo(
      () =>
        flattenNavigationGroups(
          navigationGroups,
        ),
      [navigationGroups],
    );

  const [
    query,
    setQuery,
  ] = useState("");

  const visibleItems =
    useMemo(() => {
      const normalizedQuery =
        query
          .trim()
          .toLocaleLowerCase();

      if (
        normalizedQuery ===
        ""
      ) {
        return allNavigationItems;
      }

      return allNavigationItems.filter(
        (item) =>
          [
            item.label,
            item.description,
            item.href,
          ]
            .join(" ")
            .toLocaleLowerCase()
            .includes(
              normalizedQuery,
            ),
      );
    }, [
      allNavigationItems,
      query,
    ]);

  if (!open) {
    return null;
  }

  function navigateTo(
    href: string,
  ) {
    router.push(href);

    setQuery("");

    onClose();
  }

  return (
    <div
      aria-label="WonFlow command search"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/30 px-4 pt-[9vh] backdrop-blur-[6px]"
      onClick={
        onClose
      }
      role="dialog"
    >
      <section
        className="wfg-panel w-full max-w-2xl overflow-hidden rounded-[var(--wfg-r-xl)]"
        onClick={(
          event,
        ) => {
          event.stopPropagation();
        }}
      >
        <div className="wfg-divide flex items-center gap-3 border-b px-5">
          <Search
            className="shrink-0 text-slate-400"
            size={19}
            strokeWidth={2}
          />

          <input
            autoFocus
            className="h-16 min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
            onChange={(
              event,
            ) => {
              setQuery(
                event.target.value,
              );
            }}
            placeholder="Search pages, modules and workflows"
            value={query}
          />

          <button
            aria-label="Close command search"
            className="wfg-well flex h-8 items-center px-2.5 text-[10px] font-semibold text-slate-500"
            onClick={
              onClose
            }
            type="button"
          >
            ESC
          </button>
        </div>

        <div className="wf-scrollbar max-h-[58vh] overflow-y-auto p-2">
          {visibleItems.length ===
          0 ? (
            <div className="px-5 py-12 text-center">
              <div className="text-sm font-black text-slate-900">
                No WonFlow page found
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Try searching for patient, appointment, billing, laboratory or doctor.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {visibleItems.map(
                (item) => {
                  const Icon =
                    item.icon;

                  return (
                    <button
                      className="wfg-link-row group flex w-full items-center gap-3 border border-transparent px-3 py-3 text-left"
                      key={item.href}
                      onClick={() => {
                        navigateTo(
                          item.href,
                        );
                      }}
                      type="button"
                    >
                      <div className="wfg-well flex h-10 w-10 shrink-0 items-center justify-center text-slate-500 group-hover:text-blue-700">
                        <Icon
                          size={18}
                          strokeWidth={2}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-black text-slate-900">
                          {
                            item.label
                          }
                        </div>

                        <div className="mt-1 truncate text-xs text-slate-500">
                          {
                            item.description
                          }
                        </div>
                      </div>

                      <ArrowRight
                        className="shrink-0 text-slate-300 group-hover:text-blue-600"
                        size={17}
                      />
                    </button>
                  );
                },
              )}
            </div>
          )}
        </div>

        <footer className="wfg-divide flex items-center justify-between border-t px-5 py-3 text-[10px] font-semibold text-slate-500">
          <span>
            Search WonFlow navigation
          </span>

          <span className="flex items-center gap-1">
            <Command
              size={12}
            />
            K
          </span>
        </footer>
      </section>
    </div>
  );
}

interface PremiumApplicationShellProps {
  children: ReactNode;
}

/**
 * The signed-in user's profile photo for the identity chip.
 *
 * Fetched separately from the session because the photo is a data URL of up to
 * 1 MB and the session payload is read on every request. Re-reads when the
 * doctor profile screen saves a new photo.
 */
function useSignedInAvatar(identityId: string | undefined): string | null {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!identityId) return;
    let isCancelled = false;
    const controller = new AbortController();

    const load = async () => {
      if (isCancelled || controller.signal.aborted) return;
      try {
        const response = await fetch("/api/v1/me/avatar", { cache: "no-store", signal: controller.signal });
        if (!response.ok || isCancelled) return;
        const body = (await response.json()) as { avatarUrl?: string | null };
        if (!isCancelled) {
          setAvatarUrl(body.avatarUrl ?? null);
        }
      } catch (error: unknown) {
        // Silently swallow any fetch abort / cancellation error
        if (
          isCancelled ||
          controller.signal.aborted ||
          (typeof error === "object" && error !== null && "name" in error && (error as { name: string }).name === "AbortError") ||
          (error instanceof Error && (error.name === "AbortError" || error.message.toLowerCase().includes("abort"))) ||
          (typeof DOMException !== "undefined" && error instanceof DOMException && error.name === "AbortError")
        ) {
          return;
        }
      }
    };

    void load().catch(() => {});

    const onAvatarChanged = () => {
      if (!isCancelled) {
        void load().catch(() => {});
      }
    };

    window.addEventListener(WONFLOW_AVATAR_CHANGED_EVENT, onAvatarChanged);
    return () => {
      isCancelled = true;
      try {
        controller.abort();
      } catch {
        // ignore
      }
      window.removeEventListener(WONFLOW_AVATAR_CHANGED_EVENT, onAvatarChanged);
    };
  }, [identityId]);

  // Signed out, or between identities: never show the previous user's photo.
  return identityId === undefined ? null : avatarUrl;
}

export function PremiumApplicationShell({
  children,
}: PremiumApplicationShellProps) {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const session =
    useWonFlowSession();

  const avatarUrl =
    useSignedInAvatar(
      session?.identityId,
    );

  const navigationGroups =
    useMemo(
      () =>
        getNavigationGroupsForPath(
          pathname,
          session?.workspace,
        ),
      [pathname, session?.workspace],
    );

  const allNavigationItems =
    useMemo(
      () =>
        flattenNavigationGroups(
          navigationGroups,
        ),
      [navigationGroups],
    );

  const [
    compactSidebar,
    setCompactSidebar,
  ] = useState(false);

  const [
    mobileNavigationOpen,
    setMobileNavigationOpen,
  ] = useState(false);

  const [
    commandOpen,
    setCommandOpen,
  ] = useState(false);

  const activeNavigationItem =
    allNavigationItems.find(
      (item) =>
        isNavigationItemActive(
          item,
          pathname,
        ),
    );

  const activeNavigationGroup =
    navigationGroups.find(
      (group) =>
        group.items.some(
          (item) =>
            isNavigationItemActive(
              item,
              pathname,
            ),
        ),
    );

  const workspaceName =
    getWorkspaceName(
      pathname,
    );

  useEffect(() => {
    function handleKeyboardShortcut(
      event:
        KeyboardEvent,
    ) {
      const target =
        event.target;

      const targetIsEditable =
        target instanceof
          HTMLElement &&
        (
          target.tagName ===
            "INPUT" ||
          target.tagName ===
            "TEXTAREA" ||
          target.tagName ===
            "SELECT" ||
          target.isContentEditable
        );

      if (
        (
          event.ctrlKey ||
          event.metaKey
        ) &&
        event.key
          .toLocaleLowerCase() ===
          "k"
      ) {
        event.preventDefault();

        setCommandOpen(
          (currentState) =>
            !currentState,
        );

        return;
      }

      if (
        event.key === "/" &&
        !targetIsEditable
      ) {
        event.preventDefault();

        setCommandOpen(true);

        return;
      }

      if (
        event.key === "Escape"
      ) {
        setCommandOpen(false);

        setMobileNavigationOpen(
          false,
        );
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyboardShortcut,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyboardShortcut,
      );
    };
  }, []);

  async function handleLogout() {
    await fetch(
      "/api/auth/logout",
      { method: "POST" },
    );

    router.push("/login");
    router.refresh();
  }

  /*
   * The login screen renders full-page, with no sidebar or header. Keep
   * this decision after every hook so hook order stays stable while
   * navigating between portals.
   */
  if (
    pathname.startsWith(
      "/login",
    )
  ) {
    return <>{children}</>;
  }

  return (
    <div className="wfg-app min-h-screen">
      <WonFlowConfirmHost />
      <aside
        className={[
          "wfg-aside",
          "fixed inset-y-0 left-0",
          "z-50 hidden",
          "transition-[width]",
          "duration-200 lg:block",
          compactSidebar
            ? "w-[84px]"
            : "w-[264px]",
        ].join(" ")}
      >
        <SidebarNavigation
          compact={
            compactSidebar
          }
          onCompactToggle={() => {
            setCompactSidebar(
              (currentState) =>
                !currentState,
            );
          }}
        />
      </aside>

      {mobileNavigationOpen ? (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button
            aria-label="Close mobile navigation"
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
            onClick={() => {
              setMobileNavigationOpen(
                false,
              );
            }}
            type="button"
          />

          <aside className="wfg-aside absolute inset-y-0 left-0 w-[302px] max-w-[86vw] overflow-hidden rounded-r-[var(--wfg-r-xl)]">
            <div className="absolute right-3 top-3 z-10">
              <button
                aria-label="Close navigation"
                className="wfg-control flex h-9 w-9 items-center justify-center text-slate-500"
                onClick={() => {
                  setMobileNavigationOpen(
                    false,
                  );
                }}
                type="button"
              >
                <X
                  size={18}
                />
              </button>
            </div>

            <SidebarNavigation
              onNavigate={() => {
                setMobileNavigationOpen(
                  false,
                );
              }}
            />
          </aside>
        </div>
      ) : null}

      <div
        className={[
          "min-h-screen",
          "transition-[padding]",
          "duration-200",
          compactSidebar
            ? "lg:pl-[84px]"
            : "lg:pl-[264px]",
        ].join(" ")}
      >
        <header className="wfg-topbar sticky top-0 z-40">
          <div className="flex min-h-[76px] items-center gap-3 px-4 sm:px-6 xl:px-8">
            <button
              aria-label="Go back"
              className="wfg-control flex h-10 w-10 shrink-0 items-center justify-center text-slate-600"
              onClick={() => {
                router.back();
              }}
              title="Go back"
              type="button"
            >
              <ChevronLeft size={19} />
            </button>

            <button
              aria-label="Open navigation"
              className="wfg-control flex h-10 w-10 shrink-0 items-center justify-center text-slate-600 lg:hidden"
              onClick={() => {
                setMobileNavigationOpen(
                  true,
                );
              }}
              type="button"
            >
              <Menu
                size={19}
              />
            </button>

            <div className="min-w-0 flex-1">
              <div className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600/90">
                {activeNavigationGroup
                  ?.label ??
                  workspaceName}
              </div>

              <div className="mt-0.5 flex min-w-0 items-center gap-2">
                <h1 className="truncate text-base font-semibold tracking-[-0.02em] text-slate-950 sm:text-lg">
                  {activeNavigationItem
                    ?.label ??
                    workspaceName}
                </h1>

                <span className="hidden text-slate-300 sm:inline">
                  /
                </span>

                <span className="hidden truncate text-xs font-semibold text-slate-400 sm:inline">
                  {workspaceName}
                </span>
              </div>
            </div>

            <button
              className="wfg-control hidden min-h-10 w-full max-w-[330px] items-center gap-3 px-4 text-left text-sm text-slate-500 lg:flex"
              onClick={() => {
                setCommandOpen(true);
              }}
              type="button"
            >
              <Search
                className="shrink-0"
                size={17}
              />

              <span className="min-w-0 flex-1 truncate">
                Search WonFlow
              </span>

              <span className="wfg-well flex items-center gap-1 px-2 py-1 text-[9px] font-semibold text-slate-400">
                <Command
                  size={10}
                />
                K
              </span>
            </button>

            <button
              aria-label="Open global search"
              className="wfg-control flex h-10 w-10 shrink-0 items-center justify-center text-slate-600 lg:hidden"
              onClick={() => {
                setCommandOpen(true);
              }}
              type="button"
            >
              <Search
                size={18}
              />
            </button>

            <div className="hidden h-9 w-px bg-gradient-to-b from-transparent via-slate-300/70 to-transparent sm:block" />

            <ThemeToggle />

            <button
              aria-label="Help and support"
              className="wfg-control hidden h-10 w-10 shrink-0 items-center justify-center text-slate-500 hover:text-blue-700 sm:flex"
              title="Help and support"
              type="button"
            >
              <CircleHelp
                size={18}
              />
            </button>

            <div className="wfg-control flex items-center gap-2 py-1.5 pl-1.5 pr-2">
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-600 to-violet-600 text-[11px] font-semibold text-white shadow-[0_6px_16px_-6px_rgba(75,99,255,0.9)]">
                {avatarUrl === null ? (
                  getInitials(
                    session?.name,
                  )
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element -- the photo is a stored data URL, not an optimisable remote asset. */
                  <img
                    alt=""
                    className="h-full w-full object-cover"
                    src={avatarUrl}
                  />
                )}
              </div>

              <div className="hidden min-w-0 md:block">
                <div className="max-w-28 truncate text-xs font-semibold text-slate-900">
                  {session?.name ??
                    "Signed out"}
                </div>

                <div className="mt-0.5 max-w-28 truncate text-[10px] font-medium text-slate-400">
                  {session?.orgLabel ??
                    ""}
                </div>
              </div>

              <button
                aria-label="Log out"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-600"
                onClick={
                  handleLogout
                }
                title="Log out"
                type="button"
              >
                <LogOut
                  size={16}
                />
              </button>
            </div>
          </div>
        </header>

        <main className="min-w-0 overflow-x-clip px-4 py-5 sm:px-6 sm:py-6 xl:px-7 xl:py-7">
          <div className="mx-auto min-w-0 w-full max-w-[1600px]">
            {children}
          </div>
        </main>
      </div>

      <CommandPalette
        onClose={() => {
          setCommandOpen(false);
        }}
        open={commandOpen}
      />
    </div>
  );
}
