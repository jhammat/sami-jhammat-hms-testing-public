"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

/**
 * The supervisor's countersignature queue.
 *
 * A clinician whose profile carries `requiresCountersignature` cannot sign
 * their own note — the service refuses it — so the note stays a draft until
 * their named supervisor reviews it. This screen is how the supervisor finds
 * out. Before it existed the route rendered a fixed banner telling the
 * signed-in consultant that no supervisor identity could be inferred, which
 * reads as a broken session rather than as an empty queue.
 */

interface PendingNote {
  id: string;
  noteType: string;
  updatedAt: string;
  createdAt: string;
  version: number;
  content: unknown;
  encounter: {
    id: string;
    reason: string | null;
    startedAt: string | null;
    status: string;
  };
  patient: {
    id: string;
    patientNumber: string;
    givenName: string;
    familyName: string;
  };
  author: {
    doctorId: string;
    displayName: string;
  };
}

/** The first substantive line of a note, for the queue row. */
function summarise(content: unknown): string {
  if (!content || typeof content !== "object") return "";
  const record = content as Record<string, unknown>;

  for (const key of ["assessment", "subjective", "plan", "objective", "summary", "text"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
}

export function CountersignatureQueue() {
  const [notes, setNotes] = useState<PendingNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/doctor/countersignatures", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setNotes(data.notes ?? []);
        setError(null);
      } else {
        setError(data?.error?.message ?? "The countersignature queue could not be loaded.");
      }
    } catch {
      setError("The countersignature queue could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the loader touches no state before its first await
    void load();
  }, [load]);

  return (
    <main id="main-content" className="space-y-5">
      <header className="wf-page-header rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-700">
              Clinical governance
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-slate-900">
              Countersignature queue
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Notes written by clinicians you supervise. They cannot sign their own, so nothing here
              reaches the patient record until you review and countersign it.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              void load();
            }}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-4 py-2 text-xs font-semibold text-indigo-800 transition hover:bg-indigo-50 disabled:opacity-50"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-2" aria-hidden>
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-24 animate-pulse rounded-2xl bg-slate-200/60" />
          ))}
        </div>
      ) : notes.length === 0 && !error ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 size={22} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800">Nothing is waiting for you</p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
              No note from a clinician you supervise is currently unsigned. If you expected one
              here, ask your administrator to confirm that the clinician&apos;s profile names you as
              their supervisor.
            </p>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => {
            const summary = summarise(note.content);

            return (
              <li key={note.id}>
                <Link
                  href={`/doctor/encounters/${note.encounter.id}`}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-sm"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                        <FileText size={14} className="text-indigo-600" />
                        {note.patient.givenName} {note.patient.familyName}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                        MRN {note.patient.patientNumber}
                      </span>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                        {note.noteType.toLowerCase()} · awaiting countersignature
                      </span>
                    </div>

                    <p className="mt-1.5 text-xs text-slate-500">
                      Written by {note.author.displayName}
                      {note.encounter.reason ? ` · ${note.encounter.reason}` : ""} · last edited{" "}
                      {new Date(note.updatedAt).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>

                    {summary ? (
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{summary}</p>
                    ) : null}
                  </div>

                  <span className="flex shrink-0 items-center gap-1.5 self-center text-xs font-semibold text-indigo-700">
                    <ClipboardCheck size={14} />
                    Review
                    <ChevronRight size={14} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
        <ShieldCheck size={12} />
        A supervised clinician cannot countersign their own note. Every countersignature is audited.
      </p>
    </main>
  );
}
