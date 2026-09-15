"use client";

import Link from "next/link";
import { Activity, ClipboardList, FilePenLine, FlaskConical, Stethoscope } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";

/**
 * What the patient's doctor documented, in the patient's own portal.
 *
 * A consultation records four things against the visit - vitals, diagnoses,
 * diagnostic orders and signed clinical notes - and the patient home API was
 * already returning all four. The portal only ever rendered the orders, so a
 * patient could not see the diagnosis they were given or the note their
 * doctor signed. The tabs use the same names as the doctor's consultation
 * screen so both sides talk about the same record.
 *
 * Only signed, released or amended notes reach this page; the server filters
 * drafts out before they leave the database.
 */

type DoctorRef = { staffProfile?: { membership?: { displayName?: string | null } | null } | null } | null;

export interface HealthRecordObservation {
  id: string;
  code: string;
  display: string;
  valueNumber: string | number | null;
  valueText: string | null;
  unit: string | null;
  status: string;
  source?: string | null;
  encounterId: string | null;
  observedAt: string;
}

export interface HealthRecordDiagnosis {
  id: string;
  code: string | null;
  display: string;
  status: string;
  certainty: string;
  isPrimary: boolean;
  notes: string | null;
  createdAt: string;
  encounter?: { startedAt?: string | null; doctor?: DoctorRef } | null;
}

export interface HealthRecordNote {
  id: string;
  noteType: string;
  status: string;
  content: unknown;
  releasedAt: string | null;
  createdAt: string;
  encounter?: { reason?: string | null; startedAt?: string | null; doctor?: DoctorRef } | null;
}

export interface HealthRecordOrder {
  id: string;
  type: string;
  code: string;
  name: string;
  status: string;
  createdAt?: string;
  results: Array<{ id: string; releasedAt: string | null }>;
}

export interface HealthRecordEncounter {
  id: string;
  startedAt: string;
  doctor?: DoctorRef;
}

type Tab = "vitals" | "diagnoses" | "orders" | "notes";

const formatDate = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "Date not recorded";

const humanize = (value: string) => value.replaceAll("_", " ").toLowerCase();

const doctorName = (doctor: DoctorRef | undefined) => doctor?.staffProfile?.membership?.displayName ?? null;

/** SOAP notes are stored as sections; free-text notes as `bodyText`. */
const NOTE_SECTION_LABELS: Record<string, string> = {
  bodyText: "Note",
  chiefComplaint: "Chief complaint",
  subjective: "Subjective",
  objective: "Examination",
  assessment: "Assessment",
  plan: "Plan",
};
const NOTE_SECTION_ORDER = ["bodyText", "chiefComplaint", "subjective", "objective", "assessment", "plan"];
const NOTE_HIDDEN_KEYS = new Set(["amendsNoteId"]);

function noteSections(content: unknown): Array<{ label: string; text: string }> {
  if (typeof content === "string") return content.trim() ? [{ label: "Note", text: content }] : [];
  if (!content || typeof content !== "object") return [];
  const record = content as Record<string, unknown>;
  const keys = [
    ...NOTE_SECTION_ORDER.filter((key) => key in record),
    ...Object.keys(record).filter((key) => !NOTE_SECTION_ORDER.includes(key) && !NOTE_HIDDEN_KEYS.has(key)),
  ];
  return keys
    .map((key) => {
      const value = record[key];
      const text =
        typeof value === "string" ? value : value === null || value === undefined ? "" : JSON.stringify(value);
      return { label: NOTE_SECTION_LABELS[key] ?? humanize(key.replace(/([a-z])([A-Z])/g, "$1_$2")), text: text.trim() };
    })
    .filter((section) => section.text.length > 0);
}

function observationValue(observation: HealthRecordObservation) {
  const value =
    observation.valueText?.trim() ||
    (observation.valueNumber === null || observation.valueNumber === undefined
      ? ""
      : String(Number(observation.valueNumber)));
  if (!value) return "Not recorded";
  return observation.unit && !value.endsWith(observation.unit) ? `${value} ${observation.unit}` : value;
}

function Empty({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center dark:border-slate-800 dark:bg-slate-900/40">
      <span className="grid size-12 place-items-center rounded-2xl bg-white text-blue-600 shadow-xs ring-1 ring-slate-200/60 dark:bg-slate-800 dark:text-blue-400 dark:ring-slate-700">
        <Icon aria-hidden className="size-6" />
      </span>
      <p className="mt-3.5 text-sm font-black text-slate-800 dark:text-slate-200">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">{hint}</p>
    </div>
  );
}

function Pill({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "blue" | "emerald" | "amber" }) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
    blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
    amber: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
  } as const;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function PatientHealthRecord({
  observations,
  diagnoses,
  diagnosticOrders,
  clinicalNotes,
  encounters,
}: {
  observations: HealthRecordObservation[];
  diagnoses: HealthRecordDiagnosis[];
  diagnosticOrders: HealthRecordOrder[];
  clinicalNotes: HealthRecordNote[];
  encounters: HealthRecordEncounter[];
}) {
  const [tab, setTab] = useState<Tab>("vitals");

  const encounterById = useMemo(() => new Map(encounters.map((encounter) => [encounter.id, encounter])), [encounters]);

  /** Newest reading of each vital first, then the full history below it. */
  const latestVitals = useMemo(() => {
    const seen = new Map<string, HealthRecordObservation>();
    for (const observation of [...observations].sort((a, b) => +new Date(b.observedAt) - +new Date(a.observedAt))) {
      const key = observation.display.trim().toLowerCase() || observation.code.toLowerCase();
      if (!seen.has(key)) seen.set(key, observation);
    }
    return [...seen.values()];
  }, [observations]);

  const sortedObservations = useMemo(
    () => [...observations].sort((a, b) => +new Date(b.observedAt) - +new Date(a.observedAt)),
    [observations],
  );

  const tabs: Array<{ id: Tab; label: string; icon: LucideIcon; count: number }> = [
    { id: "vitals", label: "Vitals", icon: Activity, count: observations.length },
    { id: "diagnoses", label: "Diagnoses", icon: Stethoscope, count: diagnoses.length },
    { id: "orders", label: "Diagnostic Orders", icon: FlaskConical, count: diagnosticOrders.length },
    { id: "notes", label: "Clinical Notes", icon: FilePenLine, count: clinicalNotes.length },
  ];

  const recordedBy = (observation: HealthRecordObservation) => {
    if (observation.source === "PATIENT") return "Recorded by you";
    const encounter = observation.encounterId ? encounterById.get(observation.encounterId) : undefined;
    const name = doctorName(encounter?.doctor);
    return name ? `Recorded by ${name}` : "Recorded by your care team";
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-xs sm:p-6 dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div className="grid size-10 place-items-center rounded-2xl bg-linear-to-br from-blue-50 to-indigo-100 text-blue-600 shadow-2xs dark:from-blue-950/50 dark:to-indigo-900/50 dark:text-blue-400">
          <ClipboardList aria-hidden className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">My Health Record</h2>
          <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            What your doctors recorded at your visits
          </p>
        </div>
      </div>

      <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist">
        {tabs.map(({ id, label, icon: Icon, count }) => {
          const active = tab === id;
          return (
            <button
              aria-selected={active}
              className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-2xl border px-3.5 text-xs font-black transition ${
                active
                  ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              }`}
              key={id}
              onClick={() => setTab(id)}
              role="tab"
              type="button"
            >
              <Icon aria-hidden className="size-4" />
              {label}
              <span className={`rounded-full px-1.5 text-[10px] ${active ? "bg-white/25" : "bg-slate-100 dark:bg-slate-800"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="pt-4">
        {tab === "vitals" ? (
          observations.length ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {latestVitals.map((observation) => (
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40" key={observation.id}>
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{observation.display}</p>
                    <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{observationValue(observation)}</p>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{formatDate(observation.observedAt)}</p>
                    <p className="text-[11px] text-slate-400">{recordedBy(observation)}</p>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <table className="w-full min-w-[32rem] text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-2.5">Vital</th>
                      <th className="px-4 py-2.5">Reading</th>
                      <th className="px-4 py-2.5">When</th>
                      <th className="px-4 py-2.5">Recorded by</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sortedObservations.map((observation) => (
                      <tr key={observation.id}>
                        <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200">{observation.display}</td>
                        <td className="px-4 py-2.5 font-black text-slate-900 dark:text-white">{observationValue(observation)}</td>
                        <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{formatDate(observation.observedAt)}</td>
                        <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{recordedBy(observation)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-right text-xs">
                <Link className="font-black text-blue-600 hover:text-blue-700 dark:text-blue-400" href="/patient/vitals">
                  Record a new reading or see your trends →
                </Link>
              </p>
            </div>
          ) : (
            <Empty hint="Vitals taken at your visits, and readings you log at home, will appear here." icon={Activity} title="No vitals recorded yet" />
          )
        ) : null}

        {tab === "diagnoses" ? (
          diagnoses.length ? (
            <ul className="space-y-3">
              {diagnoses.map((diagnosis) => {
                const name = doctorName(diagnosis.encounter?.doctor);
                return (
                  <li className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900" key={diagnosis.id}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 dark:text-white">{diagnosis.display}</p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {diagnosis.code && diagnosis.code !== "UNSPECIFIED" ? `Code ${diagnosis.code} · ` : ""}
                          {name ? `Diagnosed by ${name} · ` : ""}
                          {formatDate(diagnosis.encounter?.startedAt ?? diagnosis.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {diagnosis.isPrimary ? <Pill tone="blue">Primary</Pill> : null}
                        <Pill tone={diagnosis.certainty === "CONFIRMED" ? "emerald" : "amber"}>{humanize(diagnosis.certainty)}</Pill>
                        <Pill>{humanize(diagnosis.status)}</Pill>
                      </div>
                    </div>
                    {diagnosis.notes ? <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{diagnosis.notes}</p> : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty hint="Diagnoses your doctor records during a consultation will appear here." icon={Stethoscope} title="No diagnoses recorded yet" />
          )
        ) : null}

        {tab === "orders" ? (
          diagnosticOrders.length ? (
            <ul className="space-y-3">
              {diagnosticOrders.map((order) => {
                const released = order.results.some((result) => result.releasedAt);
                return (
                  <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900" key={order.id}>
                    <div className="min-w-0">
                      <p className="truncate font-black text-slate-900 dark:text-white">{order.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {humanize(order.type)} · Code {order.code}
                        {order.createdAt ? ` · Ordered ${formatDate(order.createdAt)}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone={released ? "emerald" : "blue"}>{humanize(order.status)}</Pill>
                      {released ? (
                        <Link className="text-xs font-black text-blue-600 hover:text-blue-700 dark:text-blue-400" href="/patient/reports">
                          View report →
                        </Link>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty hint="Laboratory and imaging tests your doctor orders will appear here." icon={FlaskConical} title="No diagnostic orders yet" />
          )
        ) : null}

        {tab === "notes" ? (
          clinicalNotes.length ? (
            <ul className="space-y-4">
              {clinicalNotes.map((note) => {
                const name = doctorName(note.encounter?.doctor);
                const sections = noteSections(note.content);
                return (
                  <li className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900" key={note.id}>
                    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800">
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 dark:text-white">
                          {note.encounter?.reason?.trim() || "Consultation note"}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {name ? `${name} · ` : ""}
                          {formatDate(note.releasedAt ?? note.encounter?.startedAt ?? note.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Pill tone="blue">{humanize(note.noteType)}</Pill>
                        <Pill tone="emerald">{humanize(note.status)}</Pill>
                      </div>
                    </div>
                    {sections.length ? (
                      <dl className="mt-3 space-y-2.5">
                        {sections.map((section) => (
                          <div key={section.label}>
                            <dt className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{section.label}</dt>
                            <dd className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-200">{section.text}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">This note has no written content.</p>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty hint="Notes appear here once your doctor signs them." icon={FilePenLine} title="No clinical notes yet" />
          )
        ) : null}
      </div>
    </section>
  );
}
