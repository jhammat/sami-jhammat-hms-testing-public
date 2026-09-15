"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { HeartHandshake, Loader2, Search } from "lucide-react";

import { CARE_TEAM_INBOX_CHANGED_EVENT } from "@/lib/clinical/care-team-paths";

import { CareTeamTimeline } from "./care-team-timeline";

interface CareTeamPatient {
  patientId: string;
  patientNumber: string;
  displayName: string;
  carePlanTitle: string | null;
  unreadUpdates: number;
}

/**
 * The care-team page shared by the doctor, physiotherapy and dietetics portals.
 *
 * The selected patient lives in the URL (`?patientId=`), so a notification, a
 * button on another screen or a pasted link all land on the same record, and
 * the back button behaves.
 */
export function CareTeamWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams?.get("patientId") ?? "";

  const [patients, setPatients] = useState<CareTeamPatient[]>([]);
  const [listLoaded, setListLoaded] = useState(false);
  const [listError, setListError] = useState("");
  const [query, setQuery] = useState("");

  const loadPatients = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/clinical/care-timeline/patients", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message ?? "Your patients could not be loaded.");
      setPatients(payload?.patients ?? []);
      setListError("");
    } catch (error) {
      setListError(error instanceof Error ? error.message : "Your patients could not be loaded.");
    } finally {
      setListLoaded(true);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadPatients();
    });
    // Unread badges change when a record is opened or a notification is read elsewhere.
    const refresh = () => void loadPatients();
    window.addEventListener(CARE_TEAM_INBOX_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(CARE_TEAM_INBOX_CHANGED_EVENT, refresh);
  }, [loadPatients]);

  const select = (patientId: string) => {
    router.replace(`${pathname}?patientId=${encodeURIComponent(patientId)}`, { scroll: false });
  };

  const q = query.trim().toLowerCase();
  const filtered = q
    ? patients.filter(
        (patient) =>
          patient.displayName.toLowerCase().includes(q) ||
          patient.patientNumber.toLowerCase().includes(q) ||
          (patient.carePlanTitle ?? "").toLowerCase().includes(q),
      )
    : patients;

  return (
    <div className="space-y-4 px-3.5 py-4 sm:px-6 sm:py-6 lg:px-8">
      <header className="rounded-3xl border border-indigo-100 bg-linear-to-br from-indigo-50 via-white to-teal-50 p-5 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-indigo-600 text-white">
            <HeartHandshake className="size-5" />
          </span>
          <div>
            <h1 className="text-lg font-black text-slate-950 dark:text-white">Care Team Record</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              One shared record per patient. See what the doctor, physiotherapist, dietitian and patient have
              recorded, and acknowledge your colleagues’ entries.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Patient list */}
        <aside className="space-y-2 lg:sticky lg:top-24 lg:self-start">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              aria-label="Search your patients"
              className="h-10 w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, MRN or care plan"
              value={query}
            />
          </div>

          <div className="max-h-[70vh] space-y-1.5 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
            {!listLoaded ? (
              <p className="flex items-center justify-center gap-2 p-6 text-xs text-slate-500">
                <Loader2 className="size-4 animate-spin" /> Loading your patients…
              </p>
            ) : listError ? (
              <p className="p-4 text-xs font-bold text-rose-600">{listError}</p>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                {patients.length === 0
                  ? "You are not on the care team for any patient yet. Patients appear here once a care plan names you or a referral is assigned to you."
                  : "No patient matches that search."}
              </p>
            ) : (
              filtered.map((patient) => {
                const active = patient.patientId === selectedId;
                return (
                  <button
                    aria-current={active ? "true" : undefined}
                    className={`flex w-full items-start justify-between gap-2 rounded-2xl px-3 py-2.5 text-left transition ${
                      active
                        ? "bg-indigo-600 text-white"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                    key={patient.patientId}
                    onClick={() => select(patient.patientId)}
                    type="button"
                  >
                    <span className="min-w-0">
                      <span className={`block truncate text-xs font-black ${active ? "text-white" : "text-slate-900 dark:text-white"}`}>
                        {patient.displayName}
                      </span>
                      <span className={`block truncate font-mono text-[10px] ${active ? "text-indigo-100" : "text-slate-500"}`}>
                        {patient.patientNumber}
                      </span>
                      {patient.carePlanTitle ? (
                        <span className={`block truncate text-[10px] ${active ? "text-indigo-100" : "text-slate-500 dark:text-slate-400"}`}>
                          {patient.carePlanTitle}
                        </span>
                      ) : null}
                    </span>
                    {patient.unreadUpdates > 0 ? (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${
                          active ? "bg-white text-indigo-700" : "bg-rose-600 text-white"
                        }`}
                        title={`${patient.unreadUpdates} unread team update${patient.unreadUpdates === 1 ? "" : "s"}`}
                      >
                        {patient.unreadUpdates}
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Record */}
        {/* A section, not <main>: the portal shell already renders the page landmark. */}
        <section aria-label="Shared care record" className="min-w-0">
          {selectedId ? (
            <CareTeamTimeline key={selectedId} patientId={selectedId} />
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              Choose a patient to open their shared care record.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
