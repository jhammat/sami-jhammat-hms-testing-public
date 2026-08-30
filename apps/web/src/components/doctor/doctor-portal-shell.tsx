"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radio, Video, X, Zap } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import type {
  MockPractitioner,
} from "@wonflow/mock-data";

import {
  useWonFlowSession,
} from "@/app/_providers";

import { phaseOneApi } from "@/lib/api/phase-one-api";

import {
  PracticeLocationProvider,
  usePracticeLocation,
} from "@/components/shell";

import type {
  DemoDoctorSitting,
} from "@/lib/doctor-sittings";

import {
  useWonFlowAsyncData,
} from "@/lib/data";

import {
  sortDemoQueueEntries,
} from "@/lib/queue";

import type {
  DemoQueueEntry,
} from "@/lib/queue";

import {
  findActiveSitting,
  getDoctorDashboard,
  getDoctorSittings,
  toDemoClinicalEncounter,
  toDemoDoctorSitting,
  toDemoQueueEntry,
} from "@/lib/api/doctor-api";

import type {
  DemoClinicalEncounter,
} from "@/lib/clinical";

import type {
  DoctorDashboard,
  DoctorSittingsResponse,
} from "@/lib/api/doctor-api";

import {
  DoctorProfileAvatar,
} from "./doctor-profile-avatar";

export type DoctorPortalIdentity = MockPractitioner & {
  email?: string;
  title?: string;
  registrationNumber?: string;
  qualifications?: string;
  biography?: string;
  contactPhone?: string;
  durationMinutes?: number;
  publiclyBookable?: boolean;
};

// In-memory, session-lived: which business date is being viewed is
// interface state, not user data, so it never claims to persist across a
// reload — it is simply remembered for the rest of this browser tab's life.
let rememberedBusinessDate: string | undefined;

interface DoctorDirectory {
  profile: DoctorPortalIdentity;
  branches: { id: string; name: string }[];
}

export interface DoctorPortalContextValue {
  doctor?: DoctorPortalIdentity;
  doctors: DoctorPortalIdentity[];
  branches: { id: string; name: string }[];

  doctorId: string;
  businessDate: string;

  sitting?: DemoDoctorSitting;
  queueEntries: DemoQueueEntry[];
  encounters: DemoClinicalEncounter[];
  roster: DoctorSittingsResponse["roster"];

  loading: boolean;

  setDoctorId(value: string): void;
  setBusinessDate(value: string): void;

  reload(): void;
}

const DoctorPortalContext =
  createContext<
    DoctorPortalContextValue | undefined
  >(undefined);

export function useDoctorPortalContext():
  DoctorPortalContextValue {
  const context =
    useContext(
      DoctorPortalContext,
    );

  if (context === undefined) {
    throw new Error(
      "useDoctorPortalContext must be used inside DoctorPortalShell.",
    );
  }

  return context;
}

function getCurrentBusinessDate():
  string {
  const date = new Date();

  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1,
    ).padStart(2, "0"),
    String(
      date.getDate(),
    ).padStart(2, "0"),
  ].join("-");
}

function isBusinessDate(
  value: string | null | undefined,
): value is string {
  return (
    value != null &&
    /^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  );
}

function formatSittingStatus(
  sitting?: DemoDoctorSitting,
): string {
  switch (sitting?.status) {
    case "available":
      return "Available";
    case "on-break":
      return "On break";
    case "finished":
      return "Finished";
    case "not-started":
      return "Not started";
    case undefined:
      return "No sitting";
  }
}

function getSittingStatusStyle(
  sitting?: DemoDoctorSitting,
): string {
  switch (sitting?.status) {
    case "available":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "on-break":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "finished":
      return "bg-slate-100 text-slate-600 ring-slate-200";
    case "not-started":
    case undefined:
      return "bg-blue-50 text-blue-700 ring-blue-200";
  }
}

export interface DoctorPortalIdentityProps {
  compact?: boolean;
  className?: string;
}

export function DoctorPortalIdentity({
  compact = false,
  className = "",
}: DoctorPortalIdentityProps) {
  const {
    doctor,
    sitting,
    loading,
  } = useDoctorPortalContext();

  if (compact) {
    return (
      <div
        className={[
          "flex min-w-0 items-center gap-2.5",
          className,
        ].join(" ")}
      >
        <DoctorProfileAvatar
          doctor={doctor}
          shape="circle"
          showStatus
          size="sm"
        />

        <div className="min-w-0">
          <div className="truncate text-xs font-black text-slate-950">
            {loading &&
            doctor === undefined
              ? "Loading doctor…"
              : doctor?.displayName ??
                "Doctor unavailable"}
          </div>

          <div className="mt-0.5 truncate text-[10px] font-semibold text-slate-500">
            {doctor?.specialtyName ??
              "Clinical workspace"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        "rounded-2xl border border-indigo-100 bg-white/75 p-2.5 shadow-[0_8px_22px_rgba(79,70,229,0.08)] backdrop-blur-sm",
        className,
      ].join(" ")}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <DoctorProfileAvatar
          doctor={doctor}
          shape="circle"
          showStatus
          size="md"
        />

        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-black tracking-[-0.02em] text-slate-950">
            {loading &&
            doctor === undefined
              ? "Loading doctor…"
              : doctor?.displayName ??
                "Doctor unavailable"}
          </div>

          <div className="mt-0.5 truncate text-[9px] font-bold text-indigo-600">
            {doctor?.specialtyName ??
              "Clinical workspace"}
          </div>
          <span
            className={[
              "mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[8px] font-black ring-1",
              getSittingStatusStyle(
                sitting,
              ),
            ].join(" ")}
          >
            {formatSittingStatus(
              sitting,
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

export interface DoctorPortalShellProps {
  children: ReactNode;
}

export function DoctorPortalShell({
  children,
}: DoctorPortalShellProps) {
  return (
    <PracticeLocationProvider>
      <DoctorPortalShellContent>
        {children}
      </DoctorPortalShellContent>
    </PracticeLocationProvider>
  );
}

function DoctorPortalShellContent({
  children,
}: DoctorPortalShellProps) {
  const session = useWonFlowSession();
  const {
    matchesLegacyBranch,
  } = usePracticeLocation();

  const directory =
    useWonFlowAsyncData<DoctorDirectory>({
      key: "doctor-portal:directory",
      loader: async (signal) => {
        return phaseOneApi<DoctorDirectory>("/api/v1/doctor/profile", { signal });
      },
      isEmpty: (value) => value.profile.id.length === 0,
    });

  const directoryDoctors = useMemo(
    () => directory.data?.profile ? [directory.data.profile] : [],
    [directory.data],
  );
  const directoryBranches = useMemo(
    () => directory.data?.branches ?? [],
    [directory.data],
  );

  const [
    doctorId,
    setDoctorIdState,
  ] = useState("");

  const [
    businessDate,
    setBusinessDateState,
  ] = useState(
    getCurrentBusinessDate,
  );

  const dashboard =
    useWonFlowAsyncData<DoctorDashboard>({
      key: `doctor-portal:dashboard:${businessDate}`,
      loader: async (signal) => {
        const { dashboard: value } = await getDoctorDashboard(businessDate);
        void signal;
        return value;
      },
      isEmpty: (value) => value.appointments.length === 0,
    });

  const sittingsResource =
    useWonFlowAsyncData<DoctorSittingsResponse>({
      key: `doctor-portal:sittings:${businessDate}`,
      loader: async (signal) => {
        const value = await getDoctorSittings(businessDate);
        void signal;
        return value;
      },
      isEmpty: (value) => value.sittings.length === 0,
    });

  const rawSittings = useMemo<DemoDoctorSitting[]>(
    () => (sittingsResource.data?.sittings ?? []).map(toDemoDoctorSitting),
    [sittingsResource.data],
  );

  const activeSittingRecord = useMemo(
    () => {
      const branchId = directoryBranches[0]?.id ?? "";
      return findActiveSitting(sittingsResource.data?.sittings ?? [], branchId, businessDate);
    },
    [businessDate, directoryBranches, sittingsResource.data],
  );

  const roster = useMemo<DoctorSittingsResponse["roster"]>(
    () => sittingsResource.data?.roster ?? [],
    [sittingsResource.data],
  );

  const rawQueueEntries = useMemo<DemoQueueEntry[]>(
    () => {
      const currentDoctorId = directory.data?.profile.id;
      if (currentDoctorId === undefined) return [];
      return (dashboard.data?.appointments ?? [])
        .map((appointment) => toDemoQueueEntry(appointment, businessDate, currentDoctorId, activeSittingRecord))
        .filter((entry): entry is DemoQueueEntry => entry !== undefined);
    },
    [activeSittingRecord, businessDate, dashboard.data, directory.data],
  );

  const doctors = useMemo<DoctorPortalIdentity[]>(() => {
    return directoryDoctors;
  }, [directoryDoctors]);

  const [
    mobileNavigationOpen,
    setMobileNavigationOpen,
  ] = useState(false);

  const mobileCloseButtonRef =
    useRef<HTMLButtonElement>(
      null,
    );

  const mobileNavigationDialogRef =
    useRef<HTMLElement>(null);

  const mobileNavigationTriggerRef =
    useRef<HTMLButtonElement>(
      null,
    );

  const dashboardReload = dashboard.reload;
  const sittingsReload = sittingsResource.reload;

  const reloadOperationalData =
    useCallback(() => {
      dashboardReload();
      sittingsReload();
    }, [dashboardReload, sittingsReload]);

  useEffect(() => {
    queueMicrotask(() => {
      reloadOperationalData();

      if (
        isBusinessDate(
          rememberedBusinessDate,
        )
      ) {
        setBusinessDateState(
          rememberedBusinessDate,
        );
      }
    });
  }, [reloadOperationalData]);

  // The queue and sitting are real, server-side data now — reception can
  // check a patient in from an entirely different browser/session, so poll
  // rather than rely on same-tab demo events to notice new arrivals.
  useEffect(() => {
    const interval = window.setInterval(() => {
      dashboardReload();
      sittingsReload();
    }, 20_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [dashboardReload, sittingsReload]);

  useEffect(() => {
    if (
      directory.data === undefined
    ) {
      return;
    }

    queueMicrotask(() => {
      const nextDoctor =
        doctors.find(
          (doctor) =>
            doctor.displayName.toLowerCase() === session?.name.toLowerCase(),
        ) ?? doctors[0];

      if (nextDoctor === undefined) {
        return;
      }

      setDoctorIdState(
        nextDoctor.id,
      );
    });
  }, [
    businessDate,
    directory.data,
    doctorId,
    doctors,
    session?.name,
  ]);

  useEffect(() => {
    if (!mobileNavigationOpen) {
      return;
    }

    const previousBodyOverflow =
      document.body.style.overflow;
    const navigationTrigger =
      mobileNavigationTriggerRef.current;

    document.body.style.overflow =
      "hidden";

    function manageDialogKeyboard(
      event: KeyboardEvent,
    ): void {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileNavigationOpen(
          false,
        );

        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog =
        mobileNavigationDialogRef.current;
      const focusable =
        dialog === null
          ? []
          : Array.from(
              dialog.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
              ),
            );

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last =
        focusable[
          focusable.length - 1
        ];

      if (
        !dialog?.contains(
          document.activeElement,
        )
      ) {
        event.preventDefault();
        first?.focus();
      } else if (
        event.shiftKey &&
        document.activeElement === first
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first?.focus();
      }
    }

    window.addEventListener(
      "keydown",
      manageDialogKeyboard,
    );

    queueMicrotask(() => {
      mobileCloseButtonRef.current
        ?.focus();
    });

    return () => {
      window.removeEventListener(
        "keydown",
        manageDialogKeyboard,
      );

      document.body.style.overflow =
        previousBodyOverflow;

      queueMicrotask(() => {
        navigationTrigger?.focus();
      });
    };
  }, [mobileNavigationOpen]);

  const doctor =
    doctors.find(
      (item) =>
        item.id === doctorId,
    );

  const sitting =
    rawSittings.find(
      (item) =>
        item.practitionerId === doctorId &&
        matchesLegacyBranch(item.branchId) &&
        item.businessDate.slice(0, 10) === businessDate.slice(0, 10),
    ) ??
    rawSittings.find(
      (item) =>
        item.practitionerId === doctorId &&
        item.businessDate.slice(0, 10) === businessDate.slice(0, 10),
    );

  const queueEntries =
    useMemo(
      () =>
        sortDemoQueueEntries(
          rawQueueEntries.filter(
            (entry) =>
              entry.practitionerId ===
                doctorId &&
              matchesLegacyBranch(
                entry.branchId,
              ) &&
              entry.businessDate ===
                businessDate,
          ),
        ),
      [
        businessDate,
        doctorId,
        matchesLegacyBranch,
        rawQueueEntries,
      ],
    );

  const encounters =
    useMemo<DemoClinicalEncounter[]>(
      () => (dashboard.data?.appointments ?? [])
        .map((appointment) => toDemoClinicalEncounter(appointment, doctorId))
        .filter((encounter): encounter is DemoClinicalEncounter => encounter !== undefined),
      [dashboard.data, doctorId],
    );

  const setDoctorId =
    useCallback(
      (value: string) => {
        const nextDoctor =
          doctors.find(
            (item) =>
              item.id === value,
          );

        if (nextDoctor === undefined) {
          return;
        }

        setDoctorIdState(value);
      },
      [doctors],
    );

  const setBusinessDate =
    useCallback(
      (value: string) => {
        if (
          !isBusinessDate(value)
        ) {
          return;
        }

        setBusinessDateState(value);
        rememberedBusinessDate = value;
      },
      [],
    );

  const reloadDirectory = directory.reload;

  const reload =
    useCallback(() => {
      reloadOperationalData();
      reloadDirectory();
    }, [
      reloadDirectory,
      reloadOperationalData,
    ]);

  const contextValue =
    useMemo<DoctorPortalContextValue>(
      () => ({
        doctor,
        doctors,
        branches: directoryBranches,
        doctorId,
        businessDate,
        sitting,
        queueEntries,
        encounters,
        roster,
        loading:
          directory.status ===
            "idle" ||
          directory.status ===
            "loading",
        setDoctorId,
        setBusinessDate,
        reload,
      }),
      [
        businessDate,
        directory.status,
        doctor,
        doctors,
        directoryBranches,
        doctorId,
        encounters,
        queueEntries,
        reload,
        roster,
        setBusinessDate,
        setDoctorId,
        sitting,
      ],
    );

  /*
   * The unified WonFlow shell (registration-legacy-shell.tsx) now supplies
   * the sidebar and header for every portal, including Doctor. This
   * provider only needs to expose doctor identity, schedule and queue data
   * to the pages beneath it.
   */
  return (
    <DoctorPortalContext.Provider
      value={contextValue}
    >
      <DoctorLiveVideoCallNotifier />
      {children}
    </DoctorPortalContext.Provider>
  );
}

/**
 * The live-call banner.
 *
 * Declared at module scope, and it matters. This function used to sit
 * INSIDE DoctorPortalShellContent — written at column zero, so it read as a
 * top-level declaration, but lexically nested. React therefore saw a brand
 * new component type on every parent render, and the doctor shell re-renders
 * on every queue poll and every twenty-second sitting check. The banner was
 * unmounted and remounted each time, which reset its `dismissed` state: a
 * doctor who dismissed the banner got it back within seconds, and its own
 * polling effect restarted on every remount.
 */
function DoctorLiveVideoCallNotifier() {
  const pathname = usePathname();
  const [liveCall, setLiveCall] = useState<{
    id: string;
    patientName: string;
    patientNumber: string;
    serviceName: string;
    reason: string;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const res = await fetch("/api/v1/doctor/video-consultations", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { liveCall?: { id: string; patientName: string; patientNumber: string; serviceName: string; reason: string } };
          if (active) setLiveCall(data.liveCall ?? null);
        }
      } catch {}
    };
    void check();
    const interval = window.setInterval(check, 20_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  // Hide banner if currently inside the video room or video appointment page
  if (!liveCall || dismissed || pathname?.startsWith("/doctor/video-room") || pathname?.includes("/video")) {
    return null;
  }

  return (
    <div className="sticky top-2 z-[90] mb-3 animate-bounce-short">
      <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 p-3.5 text-white shadow-xl shadow-emerald-500/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="relative grid size-9 place-items-center rounded-xl bg-white/20 text-white backdrop-blur">
              <Radio className="size-5 animate-pulse text-emerald-200" />
              <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-emerald-300 ring-2 ring-emerald-200 animate-ping" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-300 px-2 py-0.2 text-[9px] font-black uppercase tracking-wider text-emerald-950">
                  Live Video Call
                </span>
                <span className="text-[11px] font-bold text-emerald-100">
                  {liveCall.serviceName}
                </span>
              </div>
              <p className="text-xs font-black">
                {liveCall.patientName} ({liveCall.patientNumber}) · {liveCall.reason}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-1.5 text-xs font-black text-emerald-950 shadow-md transition hover:scale-105"
              href="/doctor/video-room"
            >
              <Zap className="size-3.5 text-emerald-600" />
              Join Live Video Room
            </Link>
            <button
              aria-label="Dismiss banner"
              className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white"
              onClick={() => setDismissed(true)}
              type="button"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
