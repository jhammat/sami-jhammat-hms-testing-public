"use client";

import Link from "next/link";

import {
  Bell,
  CalendarDays,
  MapPin,
  Stethoscope,
} from "lucide-react";

import type {
  ReactNode,
} from "react";

import {
  DoctorProfileAvatar,
} from "./doctor-profile-avatar";

import {
  useDoctorPortalContext,
} from "./doctor-portal-shell";

import {
  ALL_PRACTICE_LOCATIONS,
  usePracticeLocation,
} from "@/components/shell";

export interface DoctorPageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: ReactNode;
  action?: ReactNode;
  actions?: ReactNode;
  metadata?: ReactNode;
  branchName?: string;
  date?: string;
  showDate?: boolean;
  className?: string;
}

function formatBusinessDate(
  value: string,
): string {
  return new Date(
    `${value}T12:00:00`,
  ).toLocaleDateString(
    "en-PK",
    {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );
}

function formatStatus(
  value?: string,
): string {
  switch (value) {
    case "available":
      return "Available";

    case "on-break":
      return "On Break";

    case "finished":
      return "Finished";

    case "not-started":
      return "Not Started";

    default:
      return "No Sitting";
  }
}

function getStatusStyle(
  value?: string,
): string {
  switch (value) {
    case "available":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "on-break":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "finished":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "not-started":
      return "border-blue-200 bg-blue-50 text-blue-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

export function DoctorPageHeader({
  title,
  description,
  eyebrow = "Doctor Portal",
  icon,
  action,
  actions,
  metadata,
  branchName,
  date,
  showDate = true,
  className = "",
}: DoctorPageHeaderProps) {
  const {
    doctor,
    businessDate,
    sitting,
    loading,
  } = useDoctorPortalContext();
  const {
    selectedLocation,
    selectedLocationId,
  } = usePracticeLocation();

  return (
    <header
      className={[
        "relative overflow-hidden",
        "rounded-[24px] border",
        "border-indigo-200/80",
        "bg-gradient-to-br",
        "from-cyan-50",
        "via-white",
        "to-violet-100",
        "text-slate-950",
        "shadow-[0_22px_55px_rgba(79,70,229,0.16)]",
        className,
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-cyan-400 via-indigo-500 to-violet-600" />
      <div className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full bg-cyan-300/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 right-8 h-72 w-72 rounded-full bg-violet-400/35 blur-3xl" />

      <div className="relative flex flex-col gap-4 px-4 py-4 sm:px-5 sm:py-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-indigo-600">
              {eyebrow}
            </span>

            <span
              className={[
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.08em]",
                loading
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : getStatusStyle(
                      sitting?.status,
                    ),
              ].join(" ")}
            >
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-current"
              />

              {loading
                ? "Loading"
                : formatStatus(
                    sitting?.status,
                  )}
            </span>
          </div>

          <div className="mt-2 flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-indigo-100 bg-white/85 text-indigo-600 shadow-sm"
            >
              {icon ?? (
                <Stethoscope
                  size={18}
                />
              )}
            </span>

            <h1 className="min-w-0 truncate text-xl font-black tracking-[-0.035em] text-slate-950 sm:text-2xl">
              {title}
            </h1>
          </div>

          {description !==
          undefined ? (
            <p className="mt-2 max-w-3xl text-[11px] font-semibold leading-5 text-slate-600 sm:text-xs">
              {description}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[9px] font-bold text-slate-600">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-white/75 px-2.5 py-1.5 shadow-sm">
              <MapPin
                aria-hidden="true"
                className="text-indigo-500"
                size={12}
              />

              {branchName ??
                selectedLocation?.name ??
                (selectedLocationId === ALL_PRACTICE_LOCATIONS
                  ? "All locations"
                  : "No location selected")}
            </span>

            {showDate ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-white/75 px-2.5 py-1.5 shadow-sm">
                <CalendarDays
                  aria-hidden="true"
                  className="text-indigo-500"
                  size={12}
                />

                {formatBusinessDate(
                  date ??
                    businessDate,
                )}
              </span>
            ) : null}

            {sitting?.roomLabel !==
            undefined ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50/90 px-2.5 py-1.5 font-black text-emerald-700 shadow-sm">
                {sitting.roomLabel}
              </span>
            ) : null}

            {metadata}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 sm:justify-end">
          <div className="flex flex-1 flex-wrap items-center gap-2 sm:flex-none sm:justify-end">
            <Link
              aria-label="Open reports and documents"
              className="grid h-10 w-10 place-items-center rounded-xl border border-indigo-100 bg-white/80 text-indigo-600 shadow-sm transition hover:border-indigo-200 hover:bg-white hover:text-indigo-700"
              href="/doctor/inbox"
            >
              <Bell
                aria-hidden="true"
                size={17}
              />
            </Link>

            {action}
            {actions}
          </div>

          <div className="rounded-full border border-white bg-white/75 p-1.5 shadow-[0_14px_30px_rgba(79,70,229,0.18)] ring-1 ring-indigo-100">
            <DoctorProfileAvatar
              doctor={doctor}
              shape="circle"
              showStatus
              size="xl"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
