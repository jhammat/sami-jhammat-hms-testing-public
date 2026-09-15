"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Apple,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Stethoscope,
  User,
  Users,
} from "lucide-react";

import { CARE_TEAM_INBOX_CHANGED_EVENT } from "@/lib/clinical/care-team-paths";

/*
 * Client-side shapes of the care timeline API. Kept in step with
 * `care-timeline-service.ts` by hand — the server module imports the database
 * client and must not be pulled into a browser bundle.
 */
type Discipline = "DOCTOR" | "PHYSIOTHERAPY" | "NUTRITION" | "PATIENT" | "SYSTEM";

interface Acknowledgement {
  membershipId: string;
  displayName: string;
  note: string | null;
  acknowledgedAt: string;
}

interface TimelineEntry {
  key: string;
  type: string;
  recordId: string;
  discipline: Discipline;
  occurredAt: string;
  title: string;
  summary: string | null;
  details: Array<{ label: string; value: string }>;
  authorName: string | null;
  authorMembershipId: string | null;
  severity: "INFO" | "WARNING" | "CRITICAL";
  acknowledgements: Acknowledgement[];
}

interface CareTeamMember {
  role: "DOCTOR" | "PHYSIOTHERAPIST" | "NUTRITIONIST";
  staffProfileId: string;
  membershipId: string;
  displayName: string;
  title: string | null;
}

interface Timeline {
  patient: { id: string; patientNumber: string; displayName: string };
  careTeam: CareTeamMember[];
  entries: TimelineEntry[];
  viewerMembershipId: string | null;
}

type Filter = "ALL" | "NEEDS_ME" | "DOCTOR" | "PHYSIOTHERAPY" | "NUTRITION" | "PATIENT";

const DISCIPLINE_STYLE: Record<Discipline, { label: string; chip: string; rail: string; icon: typeof Stethoscope }> = {
  DOCTOR: {
    label: "Doctor",
    chip: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-900",
    rail: "bg-indigo-500",
    icon: Stethoscope,
  },
  PHYSIOTHERAPY: {
    label: "Physiotherapy",
    chip: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-900",
    rail: "bg-teal-500",
    icon: Activity,
  },
  NUTRITION: {
    label: "Nutrition",
    chip: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900",
    rail: "bg-amber-500",
    icon: Apple,
  },
  PATIENT: {
    label: "Patient",
    chip: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-900",
    rail: "bg-sky-500",
    icon: User,
  },
  SYSTEM: {
    label: "Alert",
    chip: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900",
    rail: "bg-rose-500",
    icon: AlertTriangle,
  },
};

const ROLE_LABEL: Record<CareTeamMember["role"], string> = {
  DOCTOR: "Doctor",
  PHYSIOTHERAPIST: "Physiotherapist",
  NUTRITIONIST: "Dietitian",
};

/**
 * Entries the team is expected to read and confirm: the clinical work of each
 * discipline and the alerts. Patient-reported readings are shown but not put in
 * anyone's "needs me" queue — a hundred drain readings a week would bury the
 * nutrition plan the physiotherapist actually needs to see.
 */
const ACKNOWLEDGEABLE: ReadonlySet<Discipline> = new Set(["DOCTOR", "PHYSIOTHERAPY", "NUTRITION", "SYSTEM"]);

const formatWhen = (value: string) =>
  new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

async function readJson(response: Response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? payload?.error ?? "The request could not be completed.");
  }
  return payload;
}

export function CareTeamTimeline({ patientId }: { patientId: string }) {
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [composingKey, setComposingKey] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ key: string; message: string } | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const payload = await readJson(
        await fetch(`/api/v1/clinical/care-timeline?patientId=${encodeURIComponent(patientId)}`, {
          credentials: "same-origin",
          cache: "no-store",
        }),
      );
      setTimeline(payload.timeline as Timeline);
      setLoadError("");
      setLoadedFor(patientId);

      // Opening the record reads what is new on it; clear this patient's badge.
      void fetch("/api/v1/notifications/inbox/read", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      })
        .then(() => window.dispatchEvent(new Event(CARE_TEAM_INBOX_CHANGED_EVENT)))
        .catch(() => {});
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "The care record could not be loaded.");
      setLoadedFor(patientId);
    } finally {
      setRefreshing(false);
    }
  }, [patientId]);

  useEffect(() => {
    // Deferred out of the effect body: load() sets state, and setting state
    // synchronously inside an effect forces a second render pass.
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const viewer = timeline?.viewerMembershipId ?? null;

  const needsMe = useCallback(
    (entry: TimelineEntry) =>
      ACKNOWLEDGEABLE.has(entry.discipline) &&
      viewer !== null &&
      entry.authorMembershipId !== viewer &&
      !entry.acknowledgements.some((ack) => ack.membershipId === viewer),
    [viewer],
  );

  const counts = useMemo(() => {
    const entries = timeline?.entries ?? [];
    return {
      ALL: entries.length,
      NEEDS_ME: entries.filter(needsMe).length,
      DOCTOR: entries.filter((entry) => entry.discipline === "DOCTOR").length,
      PHYSIOTHERAPY: entries.filter((entry) => entry.discipline === "PHYSIOTHERAPY").length,
      NUTRITION: entries.filter((entry) => entry.discipline === "NUTRITION").length,
      PATIENT: entries.filter((entry) => entry.discipline === "PATIENT").length,
    } satisfies Record<Filter, number>;
  }, [timeline, needsMe]);

  const visible = useMemo(() => {
    const entries = timeline?.entries ?? [];
    if (filter === "ALL") return entries;
    if (filter === "NEEDS_ME") return entries.filter(needsMe);
    return entries.filter((entry) => entry.discipline === filter);
  }, [timeline, filter, needsMe]);

  async function acknowledge(entry: TimelineEntry) {
    setBusyKey(entry.key);
    setActionError(null);
    try {
      await readJson(
        await fetch("/api/v1/clinical/care-timeline/acknowledgements", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientId,
            entryType: entry.type,
            recordId: entry.recordId,
            note: note.trim() || undefined,
          }),
        }),
      );
      setComposingKey(null);
      setNote("");
      await load();
    } catch (error) {
      setActionError({ key: entry.key, message: error instanceof Error ? error.message : "Could not acknowledge." });
    } finally {
      setBusyKey(null);
    }
  }

  async function withdraw(entry: TimelineEntry) {
    setBusyKey(entry.key);
    setActionError(null);
    try {
      await readJson(
        await fetch("/api/v1/clinical/care-timeline/acknowledgements", {
          method: "DELETE",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patientId, entryType: entry.type, recordId: entry.recordId }),
        }),
      );
      await load();
    } catch (error) {
      setActionError({ key: entry.key, message: error instanceof Error ? error.message : "Could not withdraw." });
    } finally {
      setBusyKey(null);
    }
  }

  // Loading this patient for the first time (or after switching patients).
  if (loadedFor !== patientId) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white p-10 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <Loader2 className="size-4 animate-spin" /> Loading the shared care record…
      </div>
    );
  }

  if (loadError || !timeline) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
        <p className="font-bold">{loadError || "The care record could not be loaded."}</p>
        <button
          className="mt-3 rounded-xl border border-rose-300 bg-white px-3 py-1.5 font-bold text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300"
          onClick={() => void load()}
          type="button"
        >
          Try again
        </button>
      </div>
    );
  }

  const filters: Array<{ id: Filter; label: string }> = [
    { id: "ALL", label: "All" },
    { id: "NEEDS_ME", label: "Needs my acknowledgement" },
    { id: "DOCTOR", label: "Doctor" },
    { id: "PHYSIOTHERAPY", label: "Physiotherapy" },
    { id: "NUTRITION", label: "Nutrition" },
    { id: "PATIENT", label: "Patient" },
  ];

  return (
    <div className="space-y-4">
      {/* Patient + care team */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Shared care record
            </p>
            <h2 className="truncate text-lg font-black text-slate-950 dark:text-white">{timeline.patient.displayName}</h2>
            <p className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">MRN {timeline.patient.patientNumber}</p>
          </div>
          <button
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            disabled={refreshing}
            onClick={() => void load()}
            type="button"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        <div className="mt-4">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
            <Users className="size-3.5" /> Care team
          </p>
          {timeline.careTeam.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No active care plan or referral names a care team for this patient yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {timeline.careTeam.map((member) => (
                <span
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                  key={`${member.role}:${member.staffProfileId}`}
                >
                  <span className="font-bold text-slate-900 dark:text-white">{member.displayName}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {ROLE_LABEL[member.role]}
                    {member.membershipId === viewer ? " · You" : ""}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5">
        {filters.map((option) => {
          const active = filter === option.id;
          return (
            <button
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                active
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              }`}
              key={option.id}
              onClick={() => setFilter(option.id)}
              type="button"
            >
              {option.label}
              <span
                className={`rounded-full px-1.5 text-[10px] font-black ${
                  active
                    ? "bg-white/20 text-white"
                    : option.id === "NEEDS_ME" && counts.NEEDS_ME > 0
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {counts[option.id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Entries */}
      {visible.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          {filter === "NEEDS_ME"
            ? "You're up to date — nothing from your colleagues is waiting for your acknowledgement."
            : "Nothing recorded in this view yet."}
        </div>
      ) : (
        <ol className="space-y-3">
          {visible.map((entry) => {
            const style = DISCIPLINE_STYLE[entry.discipline];
            const Icon = style.icon;
            const mine = viewer !== null && entry.authorMembershipId === viewer;
            const myAck = entry.acknowledgements.find((ack) => ack.membershipId === viewer);
            const canAcknowledge = ACKNOWLEDGEABLE.has(entry.discipline) && viewer !== null && !mine;
            const busy = busyKey === entry.key;

            return (
              <li
                className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 pl-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
                key={entry.key}
              >
                <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${style.rail}`} />

                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${style.chip}`}>
                        <Icon className="size-3" /> {style.label}
                      </span>
                      {entry.severity !== "INFO" ? (
                        <span
                          className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase ${
                            entry.severity === "CRITICAL"
                              ? "bg-rose-600 text-white"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {entry.severity === "CRITICAL" ? "Critical" : "Attention"}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-1.5 text-sm font-black text-slate-950 dark:text-white">{entry.title}</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {entry.authorName ? `${entry.authorName}${mine ? " (you)" : ""} · ` : ""}
                      {formatWhen(entry.occurredAt)}
                    </p>
                  </div>
                </div>

                {entry.summary ? (
                  <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-slate-700 dark:text-slate-300">{entry.summary}</p>
                ) : null}

                {entry.details.length > 0 ? (
                  <dl className="mt-3 grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
                    {entry.details.map((item, index) => (
                      <div className="min-w-0 text-xs" key={`${item.label}-${index}`}>
                        <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{item.label}</dt>
                        <dd className="break-words font-semibold text-slate-800 dark:text-slate-200">{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}

                {/* Acknowledgements */}
                {entry.acknowledgements.length > 0 ? (
                  <div className="mt-3 space-y-1 rounded-xl bg-emerald-50/70 p-2.5 dark:bg-emerald-950/30">
                    {entry.acknowledgements.map((ack) => (
                      <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-emerald-900 dark:text-emerald-200" key={ack.membershipId}>
                        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
                        <span className="font-bold">{ack.membershipId === viewer ? "You" : ack.displayName}</span>
                        <span className="text-emerald-700/80 dark:text-emerald-300/70">acknowledged · {formatWhen(ack.acknowledgedAt)}</span>
                        {ack.note ? <span className="w-full pl-5 italic text-emerald-800 dark:text-emerald-300">“{ack.note}”</span> : null}
                      </p>
                    ))}
                  </div>
                ) : null}

                {canAcknowledge ? (
                  <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                    {myAck ? (
                      <button
                        className="text-[11px] font-bold text-slate-500 underline hover:text-rose-600 disabled:opacity-50"
                        disabled={busy}
                        onClick={() => void withdraw(entry)}
                        type="button"
                      >
                        {busy ? "Withdrawing…" : "Withdraw my acknowledgement"}
                      </button>
                    ) : composingKey === entry.key ? (
                      <div className="space-y-2">
                        <input
                          autoFocus
                          className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          maxLength={1000}
                          onChange={(event) => setNote(event.target.value)}
                          placeholder="Optional note for the team (e.g. will adjust protein target)"
                          value={note}
                        />
                        <div className="flex gap-2">
                          <button
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                            disabled={busy}
                            onClick={() => void acknowledge(entry)}
                            type="button"
                          >
                            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                            Confirm acknowledgement
                          </button>
                          <button
                            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                            disabled={busy}
                            onClick={() => {
                              setComposingKey(null);
                              setNote("");
                            }}
                            type="button"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                        onClick={() => {
                          setComposingKey(entry.key);
                          setNote("");
                          setActionError(null);
                        }}
                        type="button"
                      >
                        <CheckCircle2 className="size-3.5" /> Acknowledge
                      </button>
                    )}
                    {actionError?.key === entry.key ? (
                      <p className="mt-2 text-[11px] font-bold text-rose-600 dark:text-rose-400">{actionError.message}</p>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
