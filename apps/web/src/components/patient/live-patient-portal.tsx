"use client";

import Link from "next/link";
import {
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  FileText,
  FlaskConical,
  HeartPulse,
  Pill,
  RefreshCw,
  ShieldAlert,
  Stethoscope,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { WonFlowPageHeader } from "@/components/workspace";

type Section = "home" | "care" | "reports" | "profile";

interface PatientHome {
  patient: { id: string; patientNumber: string; givenName: string; middleName: string | null; familyName: string; dateOfBirth: string | null; sex: string | null; phone: string | null; email: string | null };
  appointments: Array<{ id: string; startsAt: string; status: string; service: { name: string }; branch: { name: string } }>;
  prescriptions: Array<{ id: string; status: string; instructions: string | null; items: Array<{ id: string; dosage: string | null; frequency: string | null; duration: string | null; medication: { genericName: string; brandName: string | null; strength: string | null } }> }>;
  diagnosticOrders: Array<{ id: string; type: string; code: string; name: string; status: string; results: Array<{ id: string; reportText: string | null; resultData: unknown; critical: boolean; releasedAt: string | null }> }>;
  documents: Array<{ id: string; category: string; title: string; status: string; createdAt: string }>;
}

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", ...(value.includes("T") ? { timeStyle: "short" as const } : {}) }).format(new Date(value))
    : "Not provided";

const formatTime = (value: string) => new Intl.DateTimeFormat("en-PK", { timeStyle: "short" }).format(new Date(value));

const humanize = (value: string) => value.replaceAll("_", " ").toLowerCase();

/** Tone classes are limited to the palette that globals.css remaps for dark mode. */
const toneClasses = {
  blue: "border-blue-100 bg-blue-50 text-blue-700",
  violet: "border-blue-100 bg-violet-50 text-violet-700",
  emerald: "border-blue-100 bg-emerald-50 text-emerald-700",
  amber: "border-blue-100 bg-amber-50 text-amber-700",
  slate: "border-slate-200 bg-slate-50 text-slate-600",
} as const;

type Tone = keyof typeof toneClasses;

function statusTone(status: string): Tone {
  const value = status.toUpperCase();
  if (["CANCELLED", "NO_SHOW", "REJECTED"].includes(value)) return "amber";
  if (["COMPLETED", "RELEASED", "CONFIRMED", "ACTIVE", "VERIFIED"].includes(value)) return "emerald";
  if (["PENDING", "REQUESTED", "IN_PROGRESS", "IN_QUEUE", "CHECKED_IN"].includes(value)) return "blue";
  return "slate";
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${toneClasses[statusTone(status)]}`}>
      {humanize(status)}
    </span>
  );
}

function SectionCard({ title, description, action, children }: { title: string; description?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ icon: Icon, title, hint, action }: { icon: LucideIcon; title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
      <span className="grid size-11 place-items-center rounded-2xl bg-blue-50 text-blue-600">
        <Icon aria-hidden className="size-5" />
      </span>
      <p className="mt-3 text-sm font-black text-slate-700">{title}</p>
      {hint ? <p className="mt-1 max-w-sm text-sm text-slate-500">{hint}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function PortalSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your secure care record</span>
      <div className="h-36 animate-pulse rounded-3xl bg-slate-100" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-56 animate-pulse rounded-3xl bg-slate-100" />
        <div className="h-56 animate-pulse rounded-3xl bg-slate-100" />
      </div>
    </div>
  );
}

export function LivePatientPortal({ section }: { section: Section }) {
  const [home, setHome] = useState<PatientHome | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v1/patient/home", { credentials: "same-origin", cache: "no-store" });
      const body = await response.json() as { home?: PatientHome; error?: string };
      if (!response.ok || !body.home) throw new Error(body.error ?? "Your care record could not be loaded.");
      setHome(body.home);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your care record could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  const patientName = useMemo(
    () => home ? [home.patient.givenName, home.patient.middleName, home.patient.familyName].filter(Boolean).join(" ") : "",
    [home],
  );

  const upcoming = useMemo(() => {
    if (!home) return [];
    // eslint-disable-next-line react-hooks/purity -- splitting past from upcoming visits needs the current instant.
    const now = Date.now();
    return home.appointments
      .filter((item) => new Date(item.startsAt).getTime() >= now && item.status.toUpperCase() !== "CANCELLED")
      .sort((first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime());
  }, [home]);

  const criticalResults = useMemo(
    () => home ? home.diagnosticOrders.filter((order) => order.results.some((result) => result.critical)) : [],
    [home],
  );

  if (loading) return <PortalSkeleton />;

  if (error || !home) {
    return (
      <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-slate-200 bg-red-50 p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-white text-red-600">
          <ShieldAlert aria-hidden className="size-6" />
        </span>
        <h1 className="mt-4 text-xl font-black text-slate-900">Patient record unavailable</h1>
        <p className="mt-2 text-sm text-slate-600">{error}</p>
        <button
          className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white transition hover:bg-blue-700"
          onClick={() => void load()}
          type="button"
        >
          Try again
        </button>
      </div>
    );
  }

  const title = section === "home" ? `Welcome, ${home.patient.givenName}` : section === "care" ? "My care" : section === "reports" ? "My reports" : "My profile";
  const nextAppointment = upcoming[0];

  const tiles: Array<{ label: string; value: number; href: string; icon: LucideIcon }> = [
    { label: "Upcoming appointments", value: upcoming.length, href: "/patient/appointments", icon: CalendarDays },
    { label: "Active prescriptions", value: home.prescriptions.length, href: "/patient/care", icon: Pill },
    { label: "Released reports", value: home.diagnosticOrders.length, href: "/patient/reports", icon: FlaskConical },
    { label: "Documents", value: home.documents.length, href: "/patient/documents", icon: FileText },
  ];

  return (
    <div className="space-y-5">
      <WonFlowPageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-black text-white shadow-sm transition hover:from-blue-700 hover:to-indigo-700"
              href="/patient/appointments/book"
            >
              <CalendarPlus aria-hidden className="size-4" />
              Book appointment
            </Link>
            <button
              aria-label="Refresh my care record"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-60"
              disabled={refreshing}
              onClick={() => void load("refresh")}
              type="button"
            >
              <RefreshCw aria-hidden className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        }
        description={`Medical record ${home.patient.patientNumber} · securely connected with your hospital care team.`}
        eyebrow="My WonFlow care"
        title={title}
      />

      {criticalResults.length ? (
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-red-50 p-4">
          <ShieldAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-black text-slate-900">
              {criticalResults.length === 1 ? "A result needs your attention" : `${criticalResults.length} results need your attention`}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Please contact your care team about {criticalResults.map((order) => order.name).join(", ")}.
            </p>
            <Link className="mt-2 inline-block text-sm font-black text-red-700 underline underline-offset-4" href="/patient/reports">
              View reports
            </Link>
          </div>
        </div>
      ) : null}

      {section === "home" ? (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {tiles.map((tile) => (
              <Link
                className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md sm:p-5"
                href={tile.href}
                key={tile.label}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">{tile.label}</span>
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                    <tile.icon aria-hidden className="size-4" />
                  </span>
                </div>
                <div className="mt-3 text-3xl font-black text-slate-900">{tile.value}</div>
              </Link>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard
              title="Next appointments"
              description="Your confirmed visits, soonest first."
              action={
                <Link className="text-sm font-black text-blue-700 underline underline-offset-4" href="/patient/appointments">
                  See all
                </Link>
              }
            >
              {nextAppointment ? (
                <div className="mt-4 space-y-3">
                  <article className="flex items-center gap-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <div className="grid shrink-0 place-items-center rounded-xl bg-white px-3 py-2 text-center shadow-sm">
                      <span className="text-[11px] font-black uppercase text-slate-500">
                        {new Intl.DateTimeFormat("en-PK", { month: "short" }).format(new Date(nextAppointment.startsAt))}
                      </span>
                      <span className="text-2xl font-black leading-none text-slate-900">
                        {new Intl.DateTimeFormat("en-PK", { day: "2-digit" }).format(new Date(nextAppointment.startsAt))}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-black text-slate-900">{nextAppointment.service.name}</span>
                        <StatusPill status={nextAppointment.status} />
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatTime(nextAppointment.startsAt)} · {nextAppointment.branch.name}
                      </p>
                    </div>
                  </article>
                  {upcoming.slice(1, 4).map((item) => (
                    <article className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" key={item.id}>
                      <div className="min-w-0">
                        <div className="truncate font-bold text-slate-900">{item.service.name}</div>
                        <div className="text-xs text-slate-500">{formatDate(item.startsAt)} · {item.branch.name}</div>
                      </div>
                      <StatusPill status={item.status} />
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={CalendarDays}
                  title="No upcoming appointments"
                  hint="Book a consultation and it will appear here straight away."
                  action={
                    <Link className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-700" href="/patient/appointments/book">
                      <CalendarPlus aria-hidden className="size-4" />
                      Book appointment
                    </Link>
                  }
                />
              )}
            </SectionCard>

            <SectionCard
              title="Recent reports"
              description="Laboratory and imaging results released to you."
              action={
                <Link className="text-sm font-black text-blue-700 underline underline-offset-4" href="/patient/reports">
                  See all
                </Link>
              }
            >
              {home.diagnosticOrders.length ? (
                <div className="mt-4 space-y-3">
                  {home.diagnosticOrders.slice(0, 4).map((item) => (
                    <article className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-emerald-50 px-4 py-3" key={item.id}>
                      <div className="min-w-0">
                        <div className="truncate font-bold text-slate-900">{item.name}</div>
                        <div className="text-xs text-slate-500">{item.type} · {item.code}</div>
                      </div>
                      <StatusPill status={item.status} />
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState icon={FlaskConical} title="No released reports" hint="Results appear here once your care team releases them." />
              )}
            </SectionCard>
          </div>

          <SectionCard title="Quick actions" description="Common things patients do here.">
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Book appointment", hint: "Choose a doctor and time", href: "/patient/appointments/book", icon: CalendarPlus },
                { label: "Upload a document", hint: "Share reports with your team", href: "/patient/documents/upload", icon: Upload },
                { label: "My medicines", hint: "Dosage and instructions", href: "/patient/care", icon: Pill },
                { label: "My profile", hint: "Contact and identity details", href: "/patient/profile", icon: ClipboardList },
              ].map((action) => (
                <Link
                  className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-blue-100 hover:bg-blue-50"
                  href={action.href}
                  key={action.label}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-blue-600 shadow-sm">
                    <action.icon aria-hidden className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-black text-slate-900">{action.label}</span>
                    <span className="block text-xs text-slate-500">{action.hint}</span>
                  </span>
                </Link>
              ))}
            </div>
          </SectionCard>
        </>
      ) : null}

      {section === "care" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Medicines and instructions" description="Prescriptions your doctor has issued.">
            {home.prescriptions.length ? (
              <div className="mt-4 space-y-3">
                {home.prescriptions.map((prescription) => (
                  <article className="rounded-2xl border border-blue-100 bg-violet-50 p-4" key={prescription.id}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
                        <Pill aria-hidden className="size-4" />
                        Prescription
                      </span>
                      <StatusPill status={prescription.status} />
                    </div>
                    <ul className="mt-3 space-y-3">
                      {prescription.items.map((item) => (
                        <li key={item.id}>
                          <div className="font-black text-slate-900">
                            {item.medication.brandName ?? item.medication.genericName} {item.medication.strength}
                          </div>
                          {item.medication.brandName ? (
                            <div className="text-xs text-slate-500">{item.medication.genericName}</div>
                          ) : null}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {[item.dosage, item.frequency, item.duration].filter(Boolean).length ? (
                              [item.dosage, item.frequency, item.duration].filter(Boolean).map((detail) => (
                                <span className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-600" key={detail}>
                                  {detail}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-slate-500">Follow the prescribed instructions.</span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                    {prescription.instructions ? (
                      <p className="mt-3 rounded-xl bg-white p-3 text-sm font-semibold text-slate-700">{prescription.instructions}</p>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState icon={Pill} title="No active prescriptions" hint="Medicines prescribed during a consultation will be listed here." />
            )}
          </SectionCard>

          <SectionCard title="Tests and follow-up" description="Orders raised by your care team.">
            {home.diagnosticOrders.length ? (
              <div className="mt-4 space-y-3">
                {home.diagnosticOrders.map((order) => (
                  <article className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3" key={order.id}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Stethoscope aria-hidden className="size-4 shrink-0 text-blue-600" />
                        <span className="truncate font-black text-slate-900">{order.name}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{order.type} · {order.code}</div>
                    </div>
                    <StatusPill status={order.status} />
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState icon={HeartPulse} title="No tests or follow-up" hint="Tests ordered for you will appear here with their progress." />
            )}
          </SectionCard>
        </div>
      ) : null}

      {section === "reports" ? (
        <SectionCard
          title="Released laboratory and radiology reports"
          description="Only results your care team has released are shown."
          action={
            <Link className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-700" href="/patient/documents">
              <FileText aria-hidden className="size-4" />
              My documents
            </Link>
          }
        >
          {home.diagnosticOrders.length ? (
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              {home.diagnosticOrders.map((order) => (
                <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" key={order.id}>
                  <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-emerald-50 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate font-black text-slate-900">{order.name}</div>
                      <div className="text-xs font-bold text-slate-500">{order.type} · {order.code}</div>
                    </div>
                    <StatusPill status={order.status} />
                  </header>
                  <div className="space-y-3 p-4">
                    {order.results.map((result) => (
                      <div key={result.id}>
                        {result.critical ? (
                          <p className="mb-2 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-black text-red-700">
                            <ShieldAlert aria-hidden className="size-4" />
                            Critical result — contact your care team.
                          </p>
                        ) : null}
                        <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 font-sans text-sm text-slate-700">
                          {result.reportText ?? (result.resultData ? JSON.stringify(result.resultData, null, 2) : "Result released without narrative notes.")}
                        </pre>
                        <p className="mt-2 text-xs text-slate-400">Released {formatDate(result.releasedAt)}</p>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState icon={FlaskConical} title="No reports released yet" hint="When a laboratory or imaging report is released to you it will appear here in full." />
          )}
        </SectionCard>
      ) : null}

      {section === "profile" ? (
        <SectionCard title="Identity and contact details" description="Shared with your hospital care team.">
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              ["Full name", patientName],
              ["MR number", home.patient.patientNumber],
              ["Date of birth", formatDate(home.patient.dateOfBirth)],
              ["Sex", home.patient.sex ?? "Not provided"],
              ["Phone", home.patient.phone ?? "Not provided"],
              ["Email", home.patient.email ?? "Not provided"],
            ].map(([label, value]) => (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={label}>
                <dt className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</dt>
                <dd className="mt-1 font-bold text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>
      ) : null}
    </div>
  );
}
