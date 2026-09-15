"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  ChevronRight,
  Clock,
  Download,
  FileCheck2,
  FileText,
  FlaskConical,
  HeartPulse,
  MapPin,
  Pill,
  ReceiptText,
  RefreshCw,
  ShieldAlert,
  Printer,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Upload,
  User,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DonutChart, StackedBar, type DonutSlice } from "@/components/charts";
import { useWonFlowSession } from "@/app/_providers";
import { printPrescriptionSlip } from "@/lib/printing/prescription-slip";

import { WONFLOW_AVATAR_CHANGED_EVENT } from "@/components/shell";
import { OfflineStatusBar } from "./offline-status-bar";


type Section = "home" | "care" | "reports" | "billing";

interface PatientHome {
  patient: {
    id: string;
    patientNumber: string;
    givenName: string;
    middleName: string | null;
    familyName: string;
    dateOfBirth: string | null;
    sex: string | null;
    phone: string | null;
    email: string | null;
  };
  appointments: Array<{
    id: string;
    startsAt: string;
    status: string;
    /** IN_PERSON or ONLINE. Decides whether a video room exists at all. */
    consultationMode?: string | null;
    service: { name: string };
    branch: { name: string };
  }>;
  prescriptions: Array<{
    id: string;
    status: string;
    instructions: string | null;
    prescribedAt?: string | null;
    createdAt: string;
    doctor?: {
      staffProfile?: {
        membership?: {
          displayName?: string | null;
        } | null;
      } | null;
    } | null;
    items: Array<{
      id: string;
      dose?: string | null;
      dosage?: string | null;
      route?: string | null;
      frequency: string | null;
      duration?: string | null;
      quantity?: number | string | null;
      instructions?: string | null;
      medication: { genericName: string; brandName: string | null; strength: string | null };
    }>;
  }>;
  diagnosticOrders: Array<{
    id: string;
    type: string;
    code: string;
    name: string;
    status: string;
    results: Array<{ id: string; reportText: string | null; resultData: unknown; critical: boolean; releasedAt: string | null }>;
    attachments: Array<{ id: string; title: string; contentType: string; sizeBytes: string; objectStatus: string; uploadedByPatient: boolean; createdAt: string }>;
  }>;
  documents: Array<{ id: string; category: string; title: string; status: string; createdAt: string }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    currencyCode: string;
    totalMinor: number;
    paidMinor: number;
    issuedAt: string | null;
    createdAt: string;
    lines: Array<{ id: string; description: string; quantity: number; totalMinor: number }>;
    payments: Array<{ id: string; status: string; method: string; amountMinor: number; completedAt: string | null; createdAt: string }>;
  }>;
}

const formatMoney = (minor: number, currencyCode: string) =>
  new Intl.NumberFormat("en-PK", { style: "currency", currency: currencyCode }).format(minor / 100);

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", ...(value.includes("T") ? { timeStyle: "short" as const } : {}) }).format(new Date(value))
    : "Not provided";

const formatTime = (value: string) => new Intl.DateTimeFormat("en-PK", { timeStyle: "short" }).format(new Date(value));

const humanize = (value: string) => value.replaceAll("_", " ").toLowerCase();

const toneClasses = {
  blue: "border-blue-200/80 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  violet: "border-purple-200/80 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
  emerald: "border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  amber: "border-amber-200/80 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  slate: "border-slate-200/80 bg-slate-50 text-slate-600 dark:bg-slate-900/40 dark:text-slate-400",
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
  const tone = statusTone(status);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider shadow-2xs ${toneClasses[tone]}`}>
      <span className={`size-1.5 rounded-full ${tone === "emerald" ? "bg-emerald-500" : tone === "blue" ? "bg-blue-500" : tone === "amber" ? "bg-amber-500" : "bg-slate-400"}`} />
      {humanize(status)}
    </span>
  );
}

function SectionCard({
  title,
  description,
  action,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-xs backdrop-blur-xs transition hover:shadow-md sm:p-6 dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          {Icon ? (
            <div className="grid size-10 place-items-center rounded-2xl bg-linear-to-br from-blue-50 to-indigo-100 text-blue-600 shadow-2xs dark:from-blue-950/50 dark:to-indigo-900/50 dark:text-blue-400">
              <Icon aria-hidden className="size-5" />
            </div>
          ) : null}
          <div>
            <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">{title}</h2>
            {description ? <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">{description}</p> : null}
          </div>
        </div>
        {action}
      </div>
      <div className="pt-4">{children}</div>
    </section>
  );
}

function EmptyState({ icon: Icon, title, hint, action }: { icon: LucideIcon; title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-linear-to-b from-slate-50/50 to-slate-100/50 px-6 py-10 text-center dark:border-slate-800 dark:from-slate-900/30 dark:to-slate-900/60">
      <span className="grid size-12 place-items-center rounded-2xl bg-white text-blue-600 shadow-xs ring-1 ring-slate-200/60 dark:bg-slate-800 dark:text-blue-400 dark:ring-slate-700">
        <Icon aria-hidden className="size-6" />
      </span>
      <p className="mt-3.5 text-sm font-black text-slate-800 dark:text-slate-200">{title}</p>
      {hint ? <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

function formatBytes(sizeBytes: string): string {
  const bytes = Number(sizeBytes);
  if (!Number.isFinite(bytes) || bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DiagnosticAttachments({
  orderId,
  attachments,
  onUploaded,
}: {
  orderId: string;
  attachments: PatientHome["diagnosticOrders"][number]["attachments"];
  onUploaded: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleFile = useCallback(
    async (file: File) => {
      setUploading(true);
      setUploadError("");
      try {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch(`/api/v1/patient/diagnostics/orders/${orderId}/attachments`, {
          method: "POST",
          credentials: "same-origin",
          body: form,
        });
        const body = (await response.json()) as { error?: string; scanResult?: string };
        if (!response.ok) throw new Error(body.error ?? "The file could not be attached.");
        if (body.scanResult === "INFECTED") throw new Error("This file failed a security scan and was not attached.");
        onUploaded();
      } catch (cause) {
        setUploadError(cause instanceof Error ? cause.message : "The file could not be attached.");
      } finally {
        setUploading(false);
      }
    },
    [orderId, onUploaded],
  );

  return (
    <div className="mt-3 rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
        <FileCheck2 className="size-4" />
        Images & reports for this test
      </div>
      {attachments.length ? (
        <ul className="mt-2.5 space-y-2">
          {attachments.map((attachment) => (
            <li className="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-white px-3.5 py-2.5 text-sm shadow-2xs dark:border-slate-800 dark:bg-slate-900" key={attachment.id}>
              <a
                className="flex items-center gap-2 truncate font-bold text-blue-700 hover:text-blue-800 dark:text-blue-400"
                href={`/api/v1/patient/diagnostics/orders/${orderId}/attachments/${attachment.id}/file`}
                rel="noreferrer"
                target="_blank"
              >
                <Download className="size-3.5 shrink-0 text-blue-500" />
                <span className="truncate">{attachment.title}</span>
              </a>
              <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {formatBytes(attachment.sizeBytes)} · {attachment.uploadedByPatient ? "you" : "care team"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">No external files attached to this order yet.</p>
      )}
      <label className="mt-3 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 text-xs font-black text-blue-700 shadow-2xs transition hover:border-blue-300 hover:bg-blue-50/80 dark:border-blue-900 dark:bg-slate-900 dark:text-blue-300">
        <Upload aria-hidden className="size-4" />
        {uploading ? "Uploading file…" : "Add report or photo (PDF, JPEG, PNG)"}
        <input
          accept="application/pdf,image/jpeg,image/png,image/webp"
          capture="environment"
          className="sr-only"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void handleFile(file);
          }}
          type="file"
        />
      </label>
      {uploadError ? <p className="mt-2 text-xs font-bold text-red-600">{uploadError}</p> : null}
    </div>
  );
}

function PatientAvatarUpload({ givenName, version, onChanged }: { givenName: string; version: number; onChanged: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  /*
   * Whether a photo exists is ASKED, not assumed.
   *
   * This used to start as `true`, so every patient who had never uploaded a
   * photo — which is most of them, on first sign-in — fired a request for an
   * avatar file that did not exist, logged a 404 in the console, and only
   * then fell back to their initial. `/api/v1/me/avatar` answers the question
   * directly and costs one cheap request instead of one guaranteed failure.
   */
  const [hasPhoto, setHasPhoto] = useState(false);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const response = await fetch("/api/v1/me/avatar", { credentials: "same-origin" });
        if (!response.ok) return;
        const body = (await response.json()) as { avatarUrl?: string | null };
        if (active) setHasPhoto(Boolean(body.avatarUrl));
      } catch {
        // No photo shown; the initial is a complete fallback, not a degraded one.
      }
    })();

    return () => {
      active = false;
    };
  }, [version]);

  const handleFile = useCallback(
    async (file: File) => {
      setUploading(true);
      setUploadError("");
      try {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch("/api/v1/patient/profile/avatar", { method: "POST", credentials: "same-origin", body: form });
        if (!response.ok) {
          const body = ((await response.json().catch(() => null)) as { error?: string } | null);
          throw new Error(body?.error ?? "The photo could not be saved.");
        }
        setHasPhoto(true);
        onChanged();
        window.dispatchEvent(new Event(WONFLOW_AVATAR_CHANGED_EVENT));
      } catch (cause) {
        setUploadError(cause instanceof Error ? cause.message : "The photo could not be saved.");
      } finally {
        setUploading(false);
      }
    },
    [onChanged],
  );

  return (
    <div className="relative">
      <label
        className="group relative flex size-14 cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 text-white shadow-md ring-2 ring-white/30 transition hover:scale-105"
        title={uploading ? "Uploading…" : "Change profile photo"}
      >
        {hasPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" className="size-full object-cover" key={version} onError={() => setHasPhoto(false)} src={`/api/v1/patient/profile/avatar/file?v=${version}`} />
        ) : (
          <span aria-hidden className="text-xl font-black">{givenName.charAt(0).toUpperCase()}</span>
        )}
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/40 text-[10px] font-black text-white opacity-0 backdrop-blur-2xs transition group-hover:opacity-100">
          {uploading ? "…" : "Change"}
        </span>
        <input
          accept="image/jpeg,image/png,image/webp"
          capture="user"
          className="sr-only"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void handleFile(file);
          }}
          type="file"
        />
      </label>
      {uploadError ? <p className="absolute top-full left-0 mt-1 w-44 rounded-lg bg-red-50 p-1.5 text-[11px] font-bold text-red-600 shadow-sm">{uploadError}</p> : null}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your secure care record</span>
      <div className="h-40 animate-pulse rounded-3xl bg-linear-to-r from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[0, 1, 2, 3, 4].map((key) => (
          <div key={key} className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/60" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800/60" />
        <div className="h-64 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800/60" />
      </div>
    </div>
  );
}

export function PatientAccessDashboard({ section }: { section: Section }) {
  // The hospital name for the printed slip; the patient home payload carries
  // the patient but not the organisation issuing the prescription.
  const session = useWonFlowSession();
  const [home, setHome] = useState<PatientHome | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [loadedAt, setLoadedAt] = useState(0);

  const load = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v1/patient/home", { credentials: "same-origin", cache: "no-store" });
      const body = (await response.json()) as { home?: PatientHome; error?: string };
      if (!response.ok || !body.home) throw new Error(body.error ?? "Your care record could not be loaded.");
      setHome(body.home);
      setLoadedAt(Date.now());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your care record could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  /**
   * Renders one prescription as a printable sheet.
   *
   * `autoPrint` opens the print dialog straight away (the Print button); the
   * PDF button opens the same sheet and leaves the dialog to the patient, so
   * they can pick "Save as PDF" as the destination without a dialog appearing
   * over the page first.
   */
  const printPrescription = useCallback(
    (prescription: PatientHome["prescriptions"][number], autoPrint: boolean) => {
      if (!home) return;
      printPrescriptionSlip(
        {
          hospitalName: session?.orgLabel ?? "Hospital",
          prescriptionId: prescription.id,
          prescribedAt: formatDate(prescription.prescribedAt ?? prescription.createdAt),
          status: prescription.status,
          doctorName: prescription.doctor?.staffProfile?.membership?.displayName ?? null,
          patientName: `${home.patient.givenName} ${home.patient.familyName}`.trim(),
          patientNumber: home.patient.patientNumber,
          instructions: prescription.instructions,
          items: prescription.items.map((item) => ({
            name: item.medication.brandName ?? item.medication.genericName,
            genericName: item.medication.genericName,
            strength: item.medication.strength,
            dose: item.dose ?? item.dosage ?? null,
            frequency: item.frequency,
            duration: item.duration ?? null,
            route: item.route ?? null,
            quantity: item.quantity === null || item.quantity === undefined ? null : String(item.quantity),
            instructions: item.instructions ?? null,
          })),
        },
        autoPrint,
      );
    },
    [home, session?.orgLabel],
  );

  const upcoming = useMemo(() => {
    if (!home) return [];
    return home.appointments
      .filter((item) => new Date(item.startsAt).getTime() >= loadedAt && item.status.toUpperCase() !== "CANCELLED")
      .sort((first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime());
  }, [home, loadedAt]);

  const criticalResults = useMemo(
    () => (home ? home.diagnosticOrders.filter((order) => order.results.some((result) => result.critical)) : []),
    [home],
  );

  if (loading) return <DashboardSkeleton />;

  if (error || !home) {
    return (
      <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-red-200 bg-linear-to-b from-red-50 to-white p-8 text-center shadow-lg dark:border-red-900/50 dark:from-red-950/30 dark:to-slate-900">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-100 text-red-600 shadow-xs dark:bg-red-900/50 dark:text-red-400">
          <ShieldAlert aria-hidden className="size-7" />
        </span>
        <h1 className="mt-4 text-xl font-black text-slate-900 dark:text-white">Patient Record Unavailable</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{error}</p>
        <button
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 px-6 py-3 font-black text-white shadow-md transition hover:from-blue-700 hover:to-indigo-700"
          onClick={() => void load()}
          type="button"
        >
          <RefreshCw className="size-4" />
          Retry Connection
        </button>
      </div>
    );
  }

  const nextAppointment = upcoming[0];
  const outstandingInvoices = home.invoices.filter((invoice) => invoice.totalMinor > invoice.paidMinor);

  /**
   * The three part-to-whole summaries the overview leads with.
   *
   * These sit after the loading and error guards on purpose: `home` is
   * non-null from here down, and hoisting them into `useMemo` at the top
   * of the component would mean re-deriving them against a null record on
   * every load. The lists here are a patient's own record — tens of rows,
   * not thousands — so plain derivation is cheaper than memo bookkeeping.
   */
  const statusTone: Record<string, string> = {
    COMPLETED: "var(--viz-good)",
    RELEASED: "var(--viz-good)",
    SCHEDULED: "var(--viz-1)",
    CONFIRMED: "var(--viz-1)",
    IN_PROGRESS: "var(--viz-3)",
    PENDING: "var(--viz-4)",
    REQUESTED: "var(--viz-4)",
    CANCELLED: "var(--viz-mute-mark)",
    NO_SHOW: "var(--viz-critical)",
  };

  const countByStatus = (rows: { status: string }[]): DonutSlice[] => {
    const counts = new Map<string, number>();

    rows.forEach((row) => {
      counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
    });

    return [...counts.entries()].map(([status, value]) => ({
      id: status,
      label: humanize(status).replace(/^./, (character) => character.toUpperCase()),
      value,
      color: statusTone[status] ?? "var(--viz-mute-mark)",
    }));
  };

  const appointmentMix = countByStatus(home.appointments);
  const diagnosticMix = countByStatus(home.diagnosticOrders);

  const billing = {
    paid: home.invoices.reduce((sum, invoice) => sum + invoice.paidMinor, 0),
    outstanding: home.invoices.reduce(
      (sum, invoice) => sum + Math.max(0, invoice.totalMinor - invoice.paidMinor),
      0,
    ),
    currency: home.invoices[0]?.currencyCode ?? "",
  };

  const tiles = [
    {
      label: "Appointments",
      value: upcoming.length,
      unit: "upcoming",
      href: "/patient/appointments",
      icon: CalendarDays,
      gradient: "from-blue-600 to-indigo-600",
      accent: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/40",
    },
    {
      label: "Prescriptions",
      value: home.prescriptions.length,
      unit: "active",
      href: "/patient/care",
      icon: Pill,
      gradient: "from-emerald-600 to-teal-600",
      accent: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      label: "Test Reports",
      value: home.diagnosticOrders.length,
      unit: "released",
      href: "/patient/reports",
      icon: FlaskConical,
      gradient: "from-cyan-600 to-blue-600",
      accent: "text-cyan-600 dark:text-cyan-400",
      bg: "bg-cyan-50 dark:bg-cyan-950/40",
    },
    {
      label: "Documents",
      value: home.documents.length,
      unit: "saved",
      href: "/patient/documents",
      icon: FileText,
      gradient: "from-purple-600 to-indigo-600",
      accent: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/40",
    },
    {
      label: "Outstanding",
      value: outstandingInvoices.length,
      unit: "invoices",
      href: "/patient/billing",
      icon: ReceiptText,
      gradient: "from-amber-500 to-orange-600",
      accent: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/40",
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Offline Status Bar ─────────────────────────────────────────── */}
      <OfflineStatusBar />

      {/* ── Hero Welcome Banner ────────────────────────────────────────── */}

      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-blue-700 via-indigo-700 to-violet-800 p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 size-96 rounded-full bg-cyan-500/15 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <PatientAvatarUpload
              givenName={home.patient.givenName}
              onChanged={() => setAvatarVersion((current) => current + 1)}
              version={avatarVersion}
            />

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-0.5 text-xs font-black tracking-wider text-cyan-200 uppercase backdrop-blur-md">
                  <ShieldCheck className="size-3.5" />
                  Verified Patient
                </span>
                <span className="text-xs font-mono font-bold text-indigo-200">MRN: {home.patient.patientNumber}</span>
              </div>

              <h1 className="mt-1.5 text-2xl font-black tracking-tight sm:text-3xl">
                {section === "home"
                  ? `Welcome, ${home.patient.givenName} ${home.patient.familyName}`
                  : section === "care"
                    ? "My Prescriptions & Care Plan"
                    : section === "reports"
                      ? "Diagnostic Reports & Tests"
                      : "Billing & Hospital Invoices"}
              </h1>

              <p className="mt-1 text-sm font-medium text-indigo-100">
                Connected securely to your hospital clinical record and care team.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-emerald-500 px-4 text-sm font-black text-white shadow-md transition hover:bg-emerald-600 hover:shadow-lg active:scale-98"
              href="/patient/recovery"
            >
              <HeartPulse aria-hidden className="size-4" />
              Recovery Plan
            </Link>

            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/30 bg-white/15 px-4 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/25 active:scale-98"
              href="/patient/caregivers"
            >
              <User aria-hidden className="size-4" />
              Caregivers
            </Link>

            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-indigo-700 shadow-md transition hover:bg-indigo-50 hover:shadow-lg active:scale-98"
              href="/patient/appointments/book"
            >
              <CalendarPlus aria-hidden className="size-4 text-indigo-600" />
              Book Appointment
            </Link>

            <button
              aria-label="Refresh my care record"
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-4 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20 disabled:opacity-50"
              disabled={refreshing}
              onClick={() => void load("refresh")}
              type="button"
            >
              <RefreshCw aria-hidden className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Critical Alerts ────────────────────────────────────────────── */}
      {criticalResults.length ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-4.5 shadow-sm dark:border-red-900/50 dark:bg-red-950/40">
          <ShieldAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <p className="text-sm font-black text-red-950 dark:text-red-200">
              {criticalResults.length === 1 ? "Important Medical Result Needs Attention" : `${criticalResults.length} Medical Results Need Attention`}
            </p>
            <p className="mt-0.5 text-xs text-red-800 dark:text-red-300">
              Please contact your physician or care team regarding {criticalResults.map((order) => order.name).join(", ")}.
            </p>
            <Link className="mt-2 inline-flex items-center gap-1 text-xs font-black text-red-700 underline underline-offset-4 hover:text-red-800 dark:text-red-300" href="/patient/reports">
              View Detailed Reports <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      ) : null}

      {/* ── Section Views ──────────────────────────────────────────────── */}
      {section === "home" ? (
        <>
          {/* Recovery Plan Quick Card */}
          <div className="flex flex-col justify-between gap-4 rounded-3xl border border-emerald-200/80 bg-linear-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-5 shadow-xs transition hover:shadow-md sm:flex-row sm:items-center dark:border-emerald-900/50 dark:from-emerald-950/30 dark:to-cyan-950/20">
            <div className="flex items-center gap-3.5">
              <div className="grid size-12 place-items-center rounded-2xl bg-linear-to-br from-emerald-600 to-teal-700 text-white shadow-md">
                <HeartPulse className="size-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Active Recovery Plan & Daily Tasks</h3>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Track vital signs, drain outputs, incision checks, exercises, and post-op protocols.
                </p>
              </div>
            </div>
            <Link
              href="/patient/recovery"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700 active:scale-98"
            >
              <span>Open Recovery Plan</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-5">
            {tiles.map((tile) => (
              <Link
                className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
                href={tile.href}
                key={tile.label}
              >
                <div className="flex items-start justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{tile.label}</span>
                  <span className={`grid size-10 place-items-center rounded-2xl ${tile.bg} ${tile.accent} shadow-2xs transition group-hover:scale-110`}>
                    <tile.icon aria-hidden className="size-5" />
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">{tile.value}</span>
                  <span className="text-xs font-bold text-slate-400">{tile.unit}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Where the patient's record actually stands. Three
              part-to-whole questions a patient genuinely asks: what is
              happening with my appointments, my tests, and my bills. */}
          <div className="grid gap-5 lg:grid-cols-3">
            <DonutChart
              title="Your appointments"
              subtitle="By status"
              slices={appointmentMix}
              centerLabel="Appointments"
              size={168}
              thickness={20}
              emptyMessage="No appointments yet"
              emptyHint="Book one from the quick actions below."
            />

            {/* The patient portal deliberately loads only results a clinician
                has RELEASED, so this can never show a test that is merely
                ordered. It used to say "No tests ordered yet", which told a
                patient with a pending test that nothing had been ordered. */}
            <DonutChart
              title="Your test results"
              subtitle="Results your clinician has released to you"
              slices={diagnosticMix}
              centerLabel="Results"
              size={168}
              thickness={20}
              emptyMessage="No results released yet"
              emptyHint="A test can be under way without appearing here until it is reported and released."
            />

            <div className="wf-viz flex flex-col justify-center rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(11,18,32,0.04)]">
              <p className="text-sm font-semibold tracking-[-0.01em] text-slate-900">
                Your billing
              </p>

              <p className="mt-0.5 text-xs leading-5 text-slate-500">
                Paid against outstanding
              </p>

              <p className="mt-4 text-[26px] font-semibold leading-none tracking-[-0.03em] text-slate-900">
                {billing.currency ? formatMoney(billing.outstanding, billing.currency) : "—"}
              </p>

              <p className="mt-1 text-xs text-slate-500">Outstanding balance</p>

              <StackedBar
                className="mt-4"
                segments={[
                  { id: "paid", label: "Paid", value: billing.paid, color: "var(--viz-good)" },
                  {
                    id: "due",
                    label: "Outstanding",
                    value: billing.outstanding,
                    color: "var(--viz-mute-mark)",
                  },
                ]}
                valueFormatter={(value) =>
                  billing.currency ? formatMoney(value, billing.currency) : String(value)
                }
              />
            </div>
          </div>

          {/* Core Content Grid */}
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {/* Next Appointment Card */}
            <SectionCard
              action={
                <Link className="inline-flex items-center gap-1 text-xs font-black text-blue-700 hover:underline dark:text-blue-400" href="/patient/appointments">
                  View all <ChevronRight className="size-3.5" />
                </Link>
              }
              description="Your scheduled hospital consultations"
              icon={CalendarDays}
              title="Next Appointments"
            >
              {nextAppointment ? (
                <div className="space-y-3.5">
                  <article className="relative overflow-hidden rounded-2xl border border-blue-200/80 bg-linear-to-r from-blue-50/80 to-indigo-50/50 p-4.5 shadow-xs dark:border-blue-900/50 dark:from-blue-950/30 dark:to-indigo-950/20">
                    <div className="flex items-center gap-4">
                      <div className="grid shrink-0 place-items-center rounded-2xl bg-linear-to-b from-blue-600 to-indigo-600 px-3.5 py-2.5 text-center text-white shadow-md">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-100">
                          {new Intl.DateTimeFormat("en-PK", { month: "short" }).format(new Date(nextAppointment.startsAt))}
                        </span>
                        <span className="text-2xl font-black leading-none tracking-tight">
                          {new Intl.DateTimeFormat("en-PK", { day: "2-digit" }).format(new Date(nextAppointment.startsAt))}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-black text-slate-900 dark:text-white">{nextAppointment.service.name}</span>
                          <StatusPill status={nextAppointment.status} />
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1 font-semibold">
                            <Clock className="size-3.5 text-blue-600" />
                            {formatTime(nextAppointment.startsAt)}
                          </span>
                          <span className="inline-flex items-center gap-1 font-semibold">
                            <MapPin className="size-3.5 text-indigo-600" />
                            {nextAppointment.branch.name}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Only an ONLINE appointment has a video room. This used
                        to render for every appointment, so a patient booked
                        into the physical clinic was invited to join a call
                        that does not exist instead of attending in person. */}
                    <div className="mt-3 flex items-center justify-end gap-2 border-t border-blue-200/50 pt-2.5 dark:border-blue-900/40">
                      {nextAppointment.consultationMode === "ONLINE" ? (
                        <Link
                          className="inline-flex items-center gap-1.5 rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 px-3.5 py-1.5 text-xs font-black text-white shadow-sm hover:from-purple-700 hover:to-indigo-700"
                          href={`/patient/appointments/${nextAppointment.id}/video`}
                        >
                          <Video className="size-3.5" />
                          <span>Join Video Consultation</span>
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          <MapPin className="size-3.5" />
                          Attend in person at {nextAppointment.branch.name}
                        </span>
                      )}
                    </div>
                  </article>

                  {upcoming.slice(1, 4).map((item) => (
                    <article className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 shadow-2xs transition hover:bg-slate-100/70 dark:border-slate-800 dark:bg-slate-900/50" key={item.id}>
                      <div className="min-w-0">
                        <div className="truncate font-bold text-slate-900 dark:text-white">{item.service.name}</div>
                        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(item.startsAt)} · {item.branch.name}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusPill status={item.status} />
                        {item.consultationMode === "ONLINE" ? (
                          <Link
                            className="inline-flex items-center gap-1 rounded-lg bg-purple-100 px-2.5 py-1 text-[11px] font-bold text-purple-800 hover:bg-purple-200 dark:bg-purple-950 dark:text-purple-300"
                            href={`/patient/appointments/${item.id}/video`}
                            title="Open Video Consultation Room"
                          >
                            <Video className="size-3" />
                            <span>Join Video</span>
                          </Link>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  action={
                    <Link className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-black text-white shadow-sm transition hover:from-blue-700 hover:to-indigo-700" href="/patient/appointments/book">
                      <CalendarPlus className="size-4" />
                      Book an Appointment
                    </Link>
                  }
                  hint="No upcoming hospital appointments scheduled."
                  icon={CalendarDays}
                  title="No Upcoming Visits"
                />
              )}
            </SectionCard>

            {/* Active Prescriptions Card */}
            <SectionCard
              action={
                <Link className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 hover:underline dark:text-emerald-400" href="/patient/care">
                  View all <ChevronRight className="size-3.5" />
                </Link>
              }
              description="Doctor prescribed medications and dosage guide"
              icon={Pill}
              title="Active Prescriptions"
            >
              {home.prescriptions.length ? (
                <div className="space-y-3.5">
                  {home.prescriptions.slice(0, 3).map((prescription) => {
                    const doctorName = prescription.doctor?.staffProfile?.membership?.displayName;
                    const rxDate = prescription.prescribedAt ? formatDate(prescription.prescribedAt) : formatDate(prescription.createdAt);
                    return (
                      <article className="rounded-2xl border border-emerald-200/80 bg-linear-to-r from-emerald-50/70 to-teal-50/40 p-4 shadow-2xs dark:border-emerald-900/50 dark:from-emerald-950/20 dark:to-slate-900" key={prescription.id}>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/60 pb-2.5 dark:border-emerald-900/40">
                          <div className="flex items-center gap-2">
                            <span className="grid size-7 place-items-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                              <Pill className="size-3.5" />
                            </span>
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                              {doctorName ? `Prescribed by ${doctorName}` : "Prescription Order"}
                            </span>
                          </div>
                          <StatusPill status={prescription.status} />
                        </div>

                        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          Prescribed: {rxDate}
                        </div>

                        <ul className="mt-2.5 space-y-2">
                          {prescription.items.map((item) => {
                            const doseVal = item.dose || item.dosage;
                            return (
                              <li className="rounded-xl border border-white/80 bg-white/90 p-2.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/80" key={item.id}>
                                <div className="flex items-baseline justify-between gap-2">
                                  <span className="font-black text-slate-900 dark:text-white">
                                    {item.medication.brandName ?? item.medication.genericName} {item.medication.strength ?? ""}
                                  </span>
                                  {item.quantity ? (
                                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                      Qty: {String(item.quantity)}
                                    </span>
                                  ) : null}
                                </div>
                                {item.medication.brandName && item.medication.genericName !== item.medication.brandName ? (
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.medication.genericName}</div>
                                ) : null}
                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                  {[doseVal, item.frequency, item.duration, item.route].filter(Boolean).map((detail) => (
                                    <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200" key={String(detail)}>
                                      {detail}
                                    </span>
                                  ))}
                                </div>
                                {item.instructions ? (
                                  <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 italic">
                                    &ldquo;{item.instructions}&rdquo;
                                  </p>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>

                        {prescription.instructions ? (
                          <div className="mt-2.5 rounded-xl bg-white/80 p-2.5 text-xs text-slate-600 shadow-2xs dark:bg-slate-900/80 dark:text-slate-300">
                            <strong className="text-emerald-700 dark:text-emerald-400">Doctor Advice: </strong>
                            {prescription.instructions}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  action={
                    <Link className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-black text-white shadow-sm transition hover:from-emerald-700 hover:to-teal-700" href="/patient/appointments/book">
                      <CalendarPlus className="size-4" />
                      Book Consultation
                    </Link>
                  }
                  hint="Medications prescribed during doctor consultations will appear here."
                  icon={Pill}
                  title="No Active Prescriptions"
                />
              )}
            </SectionCard>

            {/* Diagnostic Reports Card */}
            <SectionCard
              action={
                <Link className="inline-flex items-center gap-1 text-xs font-black text-blue-700 hover:underline dark:text-blue-400" href="/patient/reports">
                  View all <ChevronRight className="size-3.5" />
                </Link>
              }
              description="Laboratory tests and radiology results"
              icon={FlaskConical}
              title="Recent Diagnostic Reports"
            >
              {home.diagnosticOrders.length ? (
                <div className="space-y-3.5">
                  {home.diagnosticOrders.slice(0, 4).map((item) => (
                    <article className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition hover:border-blue-200 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900" key={item.id}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400">
                          <FlaskConical className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-black text-slate-900 dark:text-white">{item.name}</div>
                          <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {item.type} · Code: {item.code}
                          </div>
                        </div>
                      </div>
                      <StatusPill status={item.status} />
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  hint="When your physician or laboratory releases reports, they will appear here."
                  icon={FlaskConical}
                  title="No Released Reports"
                />
              )}
            </SectionCard>
          </div>

          {/* Quick Actions Bar */}
          <SectionCard description="Fast shortcuts to common patient operations" icon={Sparkles} title="Quick Actions">
            <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Book Appointment", hint: "Choose doctor and time", href: "/patient/appointments/book", icon: CalendarPlus, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400" },
                { label: "Upload Document", hint: "Share outside reports", href: "/patient/documents", icon: Upload, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400" },
                { label: "My Prescriptions", hint: "Dosage & medicine guide", href: "/patient/care", icon: Pill, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400" },
                { label: "Profile & Identity", hint: "Personal & emergency info", href: "/patient/profile", icon: User, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400" },
              ].map((action) => (
                <Link
                  className="group flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                  href={action.href}
                  key={action.label}
                >
                  <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${action.color} shadow-2xs transition group-hover:scale-105`}>
                    <action.icon aria-hidden className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-black text-slate-900 group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-400">{action.label}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{action.hint}</span>
                  </span>
                </Link>
              ))}
            </div>
          </SectionCard>
        </>
      ) : null}

      {/* ── Prescriptions & Care Tab ────────────────────────────────────── */}
      {section === "care" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard description="Medications prescribed by hospital practitioners" icon={Pill} title="Medicines & Daily Dosages">
            {home.prescriptions.length ? (
              <div className="space-y-4">
                {home.prescriptions.map((prescription) => {
                  const doctorName = prescription.doctor?.staffProfile?.membership?.displayName;
                  const rxDate = prescription.prescribedAt ? formatDate(prescription.prescribedAt) : formatDate(prescription.createdAt);
                  return (
                    <article className="rounded-3xl border border-purple-100 bg-linear-to-b from-purple-50/50 to-white p-5 shadow-xs dark:border-purple-900/40 dark:from-purple-950/20 dark:to-slate-900" key={prescription.id}>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-100 pb-3 dark:border-purple-900/30">
                        <div>
                          <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-purple-700 dark:text-purple-300">
                            <Pill className="size-4" />
                            Prescription Order
                          </span>
                          <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {doctorName ? `Prescribed by ${doctorName}` : "Hospital Clinical Team"} · {rxDate}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusPill status={prescription.status} />
                          {/*
                            * A copy the patient can keep.
                            *
                            * The prescription could be read here and nowhere
                            * else — nothing to hand the pharmacy counter, file,
                            * or show a clinician elsewhere. Both buttons open
                            * the same printable sheet; the browser's print
                            * dialog is what turns it into a PDF, which is how
                            * every other printable in this app works.
                            */}
                          <button
                            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-white px-2.5 py-1.5 text-[11px] font-black text-purple-700 transition hover:bg-purple-50 dark:border-purple-900 dark:bg-slate-900 dark:text-purple-300 dark:hover:bg-purple-950/50"
                            onClick={() => printPrescription(prescription, true)}
                            title="Print this prescription"
                            type="button"
                          >
                            <Printer className="size-3.5" />
                            <span className="hidden sm:inline">Print</span>
                          </button>
                          <button
                            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-white px-2.5 py-1.5 text-[11px] font-black text-purple-700 transition hover:bg-purple-50 dark:border-purple-900 dark:bg-slate-900 dark:text-purple-300 dark:hover:bg-purple-950/50"
                            onClick={() => printPrescription(prescription, false)}
                            title="Open a printable copy to save as PDF"
                            type="button"
                          >
                            <Download className="size-3.5" />
                            <span className="hidden sm:inline">PDF</span>
                          </button>
                        </div>
                      </div>

                      <ul className="mt-3.5 space-y-3.5">
                        {prescription.items.map((item) => {
                          const doseVal = item.dose || item.dosage;
                          return (
                            <li className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900" key={item.id}>
                              <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <div className="font-black text-slate-900 dark:text-white">
                                  {item.medication.brandName ?? item.medication.genericName} {item.medication.strength ?? ""}
                                </div>
                                {item.quantity ? (
                                  <span className="text-xs font-bold text-purple-700 dark:text-purple-400">
                                    Qty: {String(item.quantity)}
                                  </span>
                                ) : null}
                              </div>
                              {item.medication.brandName && item.medication.genericName !== item.medication.brandName ? (
                                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.medication.genericName}</div>
                              ) : null}
                              <div className="mt-2.5 flex flex-wrap gap-2">
                                {[doseVal, item.frequency, item.duration, item.route].filter(Boolean).map((detail) => (
                                  <span className="rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-800 dark:border-purple-900 dark:bg-purple-950/60 dark:text-purple-200" key={String(detail)}>
                                    {detail}
                                  </span>
                                ))}
                              </div>
                              {item.instructions ? (
                                <p className="mt-2 text-xs italic text-slate-600 dark:text-slate-400">
                                  &ldquo;{item.instructions}&rdquo;
                                </p>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>

                      {prescription.instructions ? (
                        <div className="mt-3.5 rounded-2xl bg-white p-3.5 text-xs font-semibold leading-relaxed text-slate-700 shadow-2xs dark:bg-slate-900 dark:text-slate-300">
                          <span className="font-black text-purple-700 dark:text-purple-400">Doctor Instructions: </span>
                          {prescription.instructions}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptyState hint="Prescriptions issued during consultations will appear here with instructions." icon={Pill} title="No Active Prescriptions" />
            )}
          </SectionCard>

          <SectionCard description="Clinical tests ordered for you" icon={HeartPulse} title="Lab Orders & Follow-ups">
            {home.diagnosticOrders.length ? (
              <div className="space-y-3.5">
                {home.diagnosticOrders.map((order) => (
                  <article className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-linear-to-r from-blue-50/50 to-white p-4 shadow-2xs dark:border-blue-900/30 dark:from-blue-950/20 dark:to-slate-900" key={order.id}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                        <Stethoscope className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-black text-slate-900 dark:text-white">{order.name}</div>
                        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {order.type} · Code: {order.code}
                        </div>
                      </div>
                    </div>
                    <StatusPill status={order.status} />
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState hint="Tests or investigations ordered by clinicians will appear here." icon={HeartPulse} title="No Pending Tests" />
            )}
          </SectionCard>
        </div>
      ) : null}

      {/* ── Reports Tab ────────────────────────────────────────────────── */}
      {section === "reports" ? (
        <SectionCard
          action={
            <Link className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:from-blue-700 hover:to-indigo-700" href="/patient/documents">
              <FileText className="size-3.5" />
              Manage All Documents
            </Link>
          }
          description="Detailed lab tests, radiology results, and official attachments released by your hospital"
          icon={FlaskConical}
          title="Official Diagnostic Reports"
        >
          {home.diagnosticOrders.length ? (
            <div className="grid gap-6 xl:grid-cols-2">
              {home.diagnosticOrders.map((order) => (
                <article className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900" key={order.id}>
                  <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="min-w-0">
                      <div className="truncate font-black text-slate-900 dark:text-white">{order.name}</div>
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {order.type} · Code: {order.code}
                      </div>
                    </div>
                    <StatusPill status={order.status} />
                  </header>

                  <div className="space-y-4 p-5">
                    {order.results.map((result) => (
                      <div key={result.id}>
                        {result.critical ? (
                          <div className="mb-3 flex items-center gap-2.5 rounded-2xl bg-red-50 p-3.5 text-xs font-black text-red-700 shadow-2xs dark:bg-red-950/40 dark:text-red-300">
                            <ShieldAlert className="size-4 shrink-0" />
                            Critical Observation — Immediate physician consultation recommended.
                          </div>
                        ) : null}
                        <pre className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 font-sans text-xs leading-relaxed text-slate-800 shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                          {result.reportText ?? (result.resultData ? JSON.stringify(result.resultData, null, 2) : "Report issued without narrative notes.")}
                        </pre>
                        <p className="mt-2 text-right text-[11px] font-bold text-slate-400">Released {formatDate(result.releasedAt)}</p>
                      </div>
                    ))}
                    <DiagnosticAttachments attachments={order.attachments} onUploaded={() => void load("refresh")} orderId={order.id} />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState hint="Laboratory or imaging reports will be available here once approved by clinical staff." icon={FlaskConical} title="No Released Reports Yet" />
          )}
        </SectionCard>
      ) : null}

      {/* ── Billing & Invoices Tab ──────────────────────────────────────── */}
      {section === "billing" ? (
        <SectionCard description="Hospital invoices, fee breakdowns, and payment receipts" icon={ReceiptText} title="Invoices & Account Balance">
          {home.invoices.length ? (
            <div className="space-y-5">
              {home.invoices.map((invoice) => {
                const outstandingMinor = invoice.totalMinor - invoice.paidMinor;
                return (
                  <article className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900" key={invoice.id}>
                    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/40">
                      <div className="min-w-0">
                        <div className="text-base font-black text-slate-900 dark:text-white">Invoice #{invoice.invoiceNumber}</div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Issued {formatDate(invoice.issuedAt ?? invoice.createdAt)}</div>
                      </div>
                      <StatusPill status={invoice.status} />
                    </header>

                    <div className="space-y-4 p-5">
                      <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                        {invoice.lines.map((line) => (
                          <li className="flex items-center justify-between gap-3 py-2.5" key={line.id}>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {line.description} {line.quantity > 1 ? `× ${line.quantity}` : ""}
                            </span>
                            <span className="font-black text-slate-900 dark:text-white">{formatMoney(line.totalMinor, invoice.currencyCode)}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Summary Banner */}
                      <div className="grid grid-cols-3 gap-3 rounded-2xl bg-slate-50 p-4 text-center dark:bg-slate-800/60">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total Billed</p>
                          <p className="mt-1 text-base font-black text-slate-900 dark:text-white">{formatMoney(invoice.totalMinor, invoice.currencyCode)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Amount Paid</p>
                          <p className="mt-1 text-base font-black text-emerald-600 dark:text-emerald-400">{formatMoney(invoice.paidMinor, invoice.currencyCode)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Balance Due</p>
                          <p className={`mt-1 text-base font-black ${outstandingMinor > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                            {formatMoney(outstandingMinor, invoice.currencyCode)}
                          </p>
                        </div>
                      </div>

                      {/* Payment History */}
                      {invoice.payments.length ? (
                        <div className="pt-2">
                          <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Recorded Payment Transactions</p>
                          <ul className="mt-2.5 space-y-2">
                            {invoice.payments.map((payment) => (
                              <li className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-800/40" key={payment.id}>
                                <span className="font-semibold text-slate-600 dark:text-slate-400">
                                  {formatDate(payment.completedAt ?? payment.createdAt)} · {payment.method}
                                </span>
                                <span className="flex items-center gap-2 font-black text-slate-900 dark:text-white">
                                  {formatMoney(payment.amountMinor, invoice.currencyCode)}
                                  <StatusPill status={payment.status} />
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 dark:text-slate-400">Payments can be completed at hospital reception or billing counters.</p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState hint="Hospital billing invoices and receipt statements will be listed here." icon={ReceiptText} title="No Invoices Issued Yet" />
          )}
        </SectionCard>
      ) : null}
    </div>
  );
}
