"use client";

import Link from "next/link";

import {
  Check,
  ChevronDown,
  MapPin,
  Search,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ALL_PRACTICE_LOCATIONS,
  usePracticeLocation,
} from "./practice-location-context";

import {
  findNextPracticeClinic,
  formatPracticeNextClinic,
} from "./practice-location-schedule";

export interface PracticeLocationSwitcherProps {
  compact?: boolean;
  className?: string;
}

function locationTypeLabel(value: string): string {
  return value
    .split("-")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

export function PracticeLocationSwitcher({
  compact = false,
  className = "",
}: PracticeLocationSwitcherProps) {
  const context = usePracticeLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    queueMicrotask(() => searchRef.current?.focus());
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      queueMicrotask(() => trigger?.focus());
    };
  }, [open]);

  const filteredLocations = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (normalized === "") return context.locations;
    return context.locations.filter((location) =>
      [
        location.name,
        location.code,
        location.externalOrganizationName,
        location.address?.city,
      ].some((value) =>
        value?.toLocaleLowerCase().includes(normalized) ?? false,
      ),
    );
  }, [context.locations, query]);

  function nextClinicText(locationId?: string): string {
    const location = locationId === undefined
      ? context.locations.find(
          (candidate) => candidate.id === context.nextClinic?.practiceLocationId,
        )
      : context.locations.find((candidate) => candidate.id === locationId);
    const next = locationId === undefined
      ? context.nextClinic
      : findNextPracticeClinic(
          context.locations,
          context.clinicSessions,
          context.scheduleOverrides,
          locationId,
          new Date(),
        );
    if (location === undefined || next === undefined) {
      return "No upcoming clinic scheduled";
    }
    const formatted = formatPracticeNextClinic(next, location);
    return locationId === undefined && context.selectedLocationId === ALL_PRACTICE_LOCATIONS
      ? `${location.name} · ${formatted}`
      : formatted;
  }

  if (context.loading) {
    return (
      <div className={`${className} rounded-xl border border-indigo-100 bg-white/70 p-2 text-[10px] font-bold text-slate-500`}>
        Loading locations…
      </div>
    );
  }

  if (context.locations.length === 0) {
    return (
      <Link
        className={`${className} flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2 text-[10px] font-black text-amber-900`}
        href="/doctor/locations"
        title="No practice locations configured"
      >
        <MapPin size={15} />
        {!compact ? <span>No practice locations configured</span> : null}
      </Link>
    );
  }

  if (context.locations.length === 1) {
    const location = context.locations[0]!;
    return (
      <div
        className={`${className} flex items-start gap-2 rounded-xl border border-indigo-100 bg-white/75 p-2 text-slate-900`}
        title={`${location.name}. Next clinic: ${nextClinicText(location.id)}`}
      >
        <MapPin className="mt-0.5 shrink-0 text-indigo-600" size={15} />
        {!compact ? (
          <div className="min-w-0">
            <div className="truncate text-[10px] font-black">{location.name}</div>
            <div className="mt-0.5 text-[9px] font-semibold text-slate-500">
              Next clinic: {nextClinicText(location.id)}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  const selectedLabel = context.selectedLocation?.name ?? "All locations";

  return (
    <div className={`${className} relative`}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex w-full items-center gap-2 rounded-xl border border-indigo-100 bg-white/80 p-2 text-left text-slate-900 shadow-sm"
        onClick={() => setOpen((value) => !value)}
        ref={triggerRef}
        title={selectedLabel}
        type="button"
      >
        <MapPin className="shrink-0 text-indigo-600" size={15} />
        {!compact ? (
          <div className="min-w-0 flex-1">
            <div className="truncate text-[10px] font-black">{selectedLabel}</div>
            <div className="mt-0.5 truncate text-[9px] font-semibold text-slate-500">
              Next clinic: {nextClinicText()}
            </div>
          </div>
        ) : null}
        {!compact ? <ChevronDown className="shrink-0 text-slate-400" size={14} /> : null}
      </button>

      {open ? (
        <div
          aria-label="Choose a practice location"
          aria-modal="true"
          className="absolute left-0 top-full z-[120] mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"
          role="dialog"
        >
          <label className="relative block">
            <span className="sr-only">Search practice locations</span>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              aria-label="Search practice locations"
              className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-indigo-400"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search locations"
              ref={searchRef}
              value={query}
            />
          </label>

          <div aria-label="Practice locations" className="mt-2 max-h-72 space-y-1 overflow-y-auto" role="listbox">
            <button
              aria-selected={context.selectedLocationId === ALL_PRACTICE_LOCATIONS}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-indigo-50"
              onClick={() => {
                context.selectLocation(ALL_PRACTICE_LOCATIONS);
                setOpen(false);
              }}
              role="option"
              type="button"
            >
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black text-slate-900">All locations</div>
                <div className="text-[9px] font-semibold text-slate-500">{nextClinicText()}</div>
              </div>
              {context.selectedLocationId === ALL_PRACTICE_LOCATIONS ? <Check size={15} /> : null}
            </button>

            {filteredLocations.map((location) => (
              <button
                aria-selected={context.selectedLocationId === location.id}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-indigo-50"
                key={location.id}
                onClick={() => {
                  context.selectLocation(location.id);
                  setOpen(false);
                }}
                role="option"
                type="button"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-black text-slate-900">{location.name}</div>
                  <div className="truncate text-[9px] font-semibold text-slate-500">
                    {locationTypeLabel(location.type)} · {nextClinicText(location.id)}
                  </div>
                </div>
                {context.selectedLocationId === location.id ? <Check size={15} /> : null}
              </button>
            ))}

            {filteredLocations.length === 0 ? (
              <div className="rounded-xl bg-slate-50 px-3 py-5 text-center text-xs font-semibold text-slate-500">
                No locations match this search.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
