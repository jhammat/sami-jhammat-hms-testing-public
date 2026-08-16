"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  Microscope,
  ScanLine,
  Send,
  Stethoscope,
  TestTube,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { WonFlowPageHeader } from "@/components/workspace";

export type DiagnosticType = "LABORATORY" | "RADIOLOGY";
export type DiagnosticView = "all" | "collection" | "processing" | "release" | "released" | "critical";

export interface DiagnosticResult {
  id: string;
  status: string;
  critical: boolean;
  criticalNotes: string | null;
  reportText: string | null;
  releasedAt: string | null;
  version: number;
  delivery: { patient: boolean; clinician: boolean };
}

export interface DiagnosticAttachment {
  id: string;
  title: string;
  contentType: string;
  sizeBytes: string;
  objectStatus: string;
  uploadedByMembershipId: string | null;
  uploadedByPatient: boolean;
  createdAt: string;
}

export interface DiagnosticOrder {
  id: string;
  accessionNumber: string | null;
  status: string;
  priority: string;
  code: string;
  name: string;
  specimenOrBodySite: string | null;
  clinicalReason: string | null;
  createdAt: string;
  patient: { patientNumber: string; givenName: string; middleName: string | null; familyName: string };
  specimens: Array<{ id: string; specimenType: string; accessionNumber: string }>;
  results: DiagnosticResult[];
  attachments: DiagnosticAttachment[];
}

export const patientNameOf = (patient: DiagnosticOrder["patient"]) =>
  [patient.givenName, patient.middleName, patient.familyName].filter(Boolean).join(" ");

export async function readApiError(response: Response): Promise<string> {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  return body?.error ?? `The request failed (${response.status}).`;
}

const humanize = (value: string) => value.replaceAll("_", " ").toLowerCase();

/** Restricted to the palette globals.css remaps for dark mode. */
const toneClasses = {
  blue: "border-blue-100 bg-blue-50 text-blue-700",
  emerald: "border-blue-100 bg-emerald-50 text-emerald-700",
  amber: "border-blue-100 bg-amber-50 text-amber-700",
  red: "border-blue-100 bg-red-50 text-red-700",
  slate: "border-slate-200 bg-slate-50 text-slate-600",
} as const;

type Tone = keyof typeof toneClasses;

function orderTone(status: string): Tone {
  if (status === "COMPLETED") return "emerald";
  if (status === "IN_PROGRESS" || status === "ACCEPTED") return "blue";
  if (status === "CANCELLED" || status === "ENTERED_IN_ERROR") return "amber";
  return "slate";
}

export function Pill({ tone, icon: Icon, children }: { tone: Tone; icon?: LucideIcon; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${toneClasses[tone]}`}>
      {Icon ? <Icon aria-hidden className="size-3.5" /> : null}
      {children}
    </span>
  );
}

/** The delivery receipts each department needs to see at a glance. */
export function DeliveryBadges({ result }: { result: DiagnosticResult }) {
  if (!result.releasedAt) return <Pill tone="amber">Not released</Pill>;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <Pill icon={UserRound} tone={result.delivery.patient ? "emerald" : "slate"}>
        {result.delivery.patient ? "Sent to patient" : "Patient pending"}
      </Pill>
      <Pill icon={Stethoscope} tone={result.delivery.clinician ? "emerald" : "slate"}>
        {result.delivery.clinician ? "Sent to doctor" : "Doctor pending"}
      </Pill>
    </span>
  );
}

function formatBytes(sizeBytes: string): string {
  const bytes = Number(sizeBytes);
  if (!Number.isFinite(bytes) || bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Scan images, photos of a printed report, or PDFs attached to this order --
 * uploaded by the ordering doctor, lab/radiology staff, or the patient
 * (`uploadedByPatient`). Shared by the staff result-entry screen (which can
 * delete) and the doctor's own results view (which can only add and view).
 */
export function DiagnosticAttachmentsPanel({
  orderId,
  attachments,
  canDelete,
  onChange,
}: {
  orderId: string;
  attachments: DiagnosticAttachment[];
  canDelete: boolean;
  onChange: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [localError, setLocalError] = useState("");

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    setLocalError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(`/api/v1/diagnostics/orders/${encodeURIComponent(orderId)}/attachments`, { method: "POST", credentials: "same-origin", body: form });
      if (!response.ok) throw new Error(await readApiError(response));
      const body = await response.json() as { scanResult?: string };
      if (body.scanResult === "INFECTED") throw new Error("This file failed a security scan and was not attached.");
      onChange();
    } catch (cause) {
      setLocalError(cause instanceof Error ? cause.message : "The file could not be attached.");
    } finally {
      setUploading(false);
    }
  }, [orderId, onChange]);

  async function remove(documentId: string) {
    setBusyId(documentId);
    setLocalError("");
    try {
      const response = await fetch(`/api/v1/diagnostics/orders/${encodeURIComponent(orderId)}/attachments/${encodeURIComponent(documentId)}`, { method: "DELETE", credentials: "same-origin" });
      if (!response.ok) throw new Error(await readApiError(response));
      onChange();
    } catch (cause) {
      setLocalError(cause instanceof Error ? cause.message : "The attachment could not be removed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-900">Images and files</h2>
      <p className="mt-1 text-sm text-slate-500">Scan images, photos of a printed report, or PDFs — from the ordering doctor, this department, or the patient.</p>
      {attachments.length ? (
        <ul className="mt-3 space-y-2">
          {attachments.map((attachment) => (
            <li className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" key={attachment.id}>
              <a
                className="min-w-0 truncate font-bold text-blue-700 underline-offset-2 hover:underline"
                href={`/api/v1/diagnostics/orders/${encodeURIComponent(orderId)}/attachments/${encodeURIComponent(attachment.id)}/file`}
                rel="noreferrer"
                target="_blank"
              >
                {attachment.title}
              </a>
              <span className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                {formatBytes(attachment.sizeBytes)} · {attachment.uploadedByPatient ? "patient" : "care team"}
                {canDelete ? (
                  <button
                    aria-label={`Remove ${attachment.title}`}
                    className="rounded-lg p-1 text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                    disabled={busyId === attachment.id}
                    onClick={() => void remove(attachment.id)}
                    type="button"
                  >
                    <Trash2 aria-hidden className="size-3.5" />
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">No files attached yet.</p>
      )}
      <label className="mt-3 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-300 bg-blue-50 px-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100">
        <Upload aria-hidden className="size-4" />
        {uploading ? "Uploading…" : "Attach a photo or PDF"}
        <input
          accept="application/pdf,image/jpeg,image/png,image/webp"
          capture="environment"
          className="sr-only"
          disabled={uploading}
          onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file); }}
          type="file"
        />
      </label>
      {localError ? <p className="mt-2 text-xs font-bold text-red-600">{localError}</p> : null}
    </section>
  );
}

interface DepartmentConfig {
  basePath: string;
  department: string;
  icon: LucideIcon;
  /** Laboratory collects specimens; radiology works straight from the request. */
  usesSpecimens: boolean;
  outputNoun: string;
  views: Record<DiagnosticView, { title: string; description: string } | undefined>;
  tiles: ReadonlyArray<readonly [string, DiagnosticView]>;
}

export const DEPARTMENTS: Record<DiagnosticType, DepartmentConfig> = {
  LABORATORY: {
    basePath: "/operations/laboratory",
    department: "Laboratory",
    icon: FlaskConical,
    usesSpecimens: true,
    outputNoun: "result",
    views: {
      all: { title: "Laboratory Worklist", description: "Every order for the active hospital branch and date." },
      collection: { title: "Specimen Collection", description: "Orders still waiting for a specimen to be collected." },
      processing: { title: "Processing", description: "Specimens accepted and currently on the bench." },
      release: { title: "Pending Release", description: "Entered results awaiting verification and release." },
      released: { title: "Released Results", description: "Verified results and who they have been sent to." },
      critical: { title: "Critical Results", description: "Results flagged critical for urgent clinical attention." },
    },
    tiles: [
      ["Total orders", "all"], ["Awaiting specimen", "collection"], ["Processing", "processing"],
      ["Pending release", "release"], ["Released", "released"], ["Critical", "critical"],
    ],
  },
  RADIOLOGY: {
    basePath: "/operations/radiology",
    department: "Radiology",
    icon: ScanLine,
    usesSpecimens: false,
    outputNoun: "report",
    views: {
      all: { title: "Radiology Worklist", description: "Every imaging request for the active hospital branch and date." },
      collection: undefined,
      processing: { title: "Studies In Progress", description: "Imaging requests accepted and currently being performed." },
      release: { title: "Pending Release", description: "Drafted reports awaiting verification and release." },
      released: { title: "Released Reports", description: "Verified reports and who they have been sent to." },
      critical: { title: "Critical Findings", description: "Reports flagged critical for urgent clinical attention." },
    },
    tiles: [
      ["Total requests", "all"], ["Awaiting study", "collection"], ["In progress", "processing"],
      ["Pending release", "release"], ["Released", "released"], ["Critical", "critical"],
    ],
  },
};

function matchesView(order: DiagnosticOrder, view: DiagnosticView, config: DepartmentConfig): boolean {
  const preliminary = order.results.some((result) => result.status === "PRELIMINARY");
  const released = order.results.some((result) => result.releasedAt);
  const started = config.usesSpecimens ? order.specimens.length > 0 : order.status === "IN_PROGRESS";
  switch (view) {
    case "collection":
      return !started && !["COMPLETED", "CANCELLED"].includes(order.status);
    case "processing":
      return started && !released && ["ACCEPTED", "IN_PROGRESS"].includes(order.status);
    case "release": return preliminary;
    case "released": return released;
    case "critical": return order.results.some((result) => result.critical);
    default: return true;
  }
}

export function DiagnosticsWorkspace({ type, view = "all" }: { type: DiagnosticType; view?: DiagnosticView }) {
  const config = DEPARTMENTS[type];
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [orders, setOrders] = useState<DiagnosticOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/diagnostics/worklist?type=${type}&date=${encodeURIComponent(date)}`, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error(await readApiError(response));
      setOrders((await response.json() as { orders: DiagnosticOrder[] }).orders);
    } catch (cause) {
      setOrders([]);
      setError(cause instanceof Error ? cause.message : "The worklist could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [date, type]);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  const counts = useMemo(() => {
    const by = (target: DiagnosticView) => orders.filter((order) => matchesView(order, target, config)).length;
    return { all: orders.length, collection: by("collection"), processing: by("processing"), release: by("release"), released: by("released"), critical: by("critical") };
  }, [config, orders]);

  const visible = useMemo(() => orders.filter((order) => matchesView(order, view, config)), [config, orders, view]);
  const meta = config.views[view] ?? config.views.all!;

  async function post(order: DiagnosticOrder, path: string, body?: unknown, failure = "The action failed.") {
    setBusyId(order.id);
    setError("");
    try {
      const response = await fetch(path, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : failure);
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-5">
      <WonFlowPageHeader
        actions={
          <label className="block">
            <span className="text-xs font-bold text-slate-500">Worklist date</span>
            <input
              className="mt-1 block h-11 rounded-xl border border-indigo-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              onChange={(event) => setDate(event.target.value)}
              type="date"
              value={date}
            />
          </label>
        }
        description={meta.description}
        eyebrow="Diagnostic services"
        title={meta.title}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        {config.tiles.map(([label, target]) => {
          if (!config.views[target]) return null;
          return (
            <Link
              className={`rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                target === view ? "border-blue-100 bg-blue-50" : "border-slate-200 bg-white"
              }`}
              href={target === "all" ? config.basePath : `${config.basePath}/${target}`}
              key={label}
            >
              <div className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</div>
              <div className={`mt-2 text-3xl font-black ${target === "critical" && counts[target] > 0 ? "text-red-600" : "text-slate-900"}`}>
                {counts[target]}
              </div>
            </Link>
          );
        })}
      </div>

      {error ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          <AlertTriangle aria-hidden className="size-4 shrink-0" />
          {error}
          <button className="underline underline-offset-4" onClick={() => void load()} type="button">Try again</button>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-black text-slate-900">{meta.title}</h2>
          <p className="text-sm text-slate-500">Orders created by doctors appear here automatically.</p>
        </div>

        {loading ? (
          <div className="space-y-3 p-5" aria-busy="true">
            {[0, 1, 2].map((key) => <div className="h-20 animate-pulse rounded-2xl bg-slate-100" key={key} />)}
          </div>
        ) : null}

        {!loading && visible.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-600">
              <config.icon aria-hidden className="size-6" />
            </span>
            <p className="mt-3 text-lg font-black text-slate-900">Nothing in {meta.title.toLowerCase()}</p>
            <p className="mt-1 text-sm text-slate-500">There are no matching orders for this branch and date.</p>
          </div>
        ) : null}

        <div className="divide-y divide-slate-200">
          {visible.map((order) => {
            const preliminary = order.results.find((result) => result.status === "PRELIMINARY");
            const latest = order.results[0];
            const busy = busyId === order.id;
            const started = config.usesSpecimens ? order.specimens.length > 0 : order.status === "IN_PROGRESS";
            return (
              <article className="grid gap-4 p-5 transition hover:bg-slate-50 lg:grid-cols-[1.3fr_1fr_auto] lg:items-center" key={order.id}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-slate-900">{order.name}</h3>
                    <Pill tone={orderTone(order.status)}>{humanize(order.status)}</Pill>
                    {order.priority !== "routine" ? <Pill tone="red">{order.priority}</Pill> : null}
                    {order.results.some((result) => result.critical) ? <Pill icon={AlertTriangle} tone="red">Critical</Pill> : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{order.code} · {order.accessionNumber ?? "Accession pending"}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {config.usesSpecimens ? (
                      order.specimens.length
                        ? <Pill icon={TestTube} tone="emerald">{order.specimens[0].specimenType}</Pill>
                        : <Pill icon={TestTube} tone="amber">No specimen</Pill>
                    ) : (
                      <Pill icon={ScanLine} tone={started ? "emerald" : "amber"}>
                        {order.specimenOrBodySite ?? "Study"}
                      </Pill>
                    )}
                    {latest ? <DeliveryBadges result={latest} /> : null}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="font-bold text-slate-900">{patientNameOf(order.patient)}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {order.patient.patientNumber}{order.clinicalReason ? ` · ${order.clinicalReason}` : ""}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {config.usesSpecimens && order.specimens.length === 0 ? (
                    <button
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-50"
                      disabled={busy}
                      onClick={() => void post(order, `/api/v1/diagnostics/orders/${encodeURIComponent(order.id)}/specimens`, { specimenType: order.specimenOrBodySite?.trim() || "Blood" }, "The specimen could not be recorded.")}
                      type="button"
                    >
                      <TestTube aria-hidden className="size-4" />
                      {busy ? "Saving…" : "Collect specimen"}
                    </button>
                  ) : null}

                  {(config.usesSpecimens ? order.specimens.length > 0 && order.status === "ACCEPTED" : ["ORDERED", "ACCEPTED"].includes(order.status)) ? (
                    <button
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                      disabled={busy}
                      onClick={() => void post(order, `/api/v1/diagnostics/orders/${encodeURIComponent(order.id)}/start`, undefined, "The order could not be started.")}
                      type="button"
                    >
                      <Microscope aria-hidden className="size-4" />
                      {busy ? "Starting…" : config.usesSpecimens ? "Start processing" : "Start study"}
                    </button>
                  ) : null}

                  <Link
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${
                      preliminary ? "bg-blue-600 text-white hover:bg-blue-700" : "border border-slate-200 bg-white text-blue-700 hover:bg-blue-50"
                    }`}
                    href={`${config.basePath}/results/${order.id}`}
                  >
                    {preliminary ? <Send aria-hidden className="size-4" /> : <CheckCircle2 aria-hidden className="size-4" />}
                    {preliminary ? "Review & release" : order.results.length ? `View ${config.outputNoun}` : `Enter ${config.outputNoun}`}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
