"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Save,
  Send,
  Stethoscope,
  TestTube,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { WonFlowPageHeader } from "@/components/workspace";

import {
  DEPARTMENTS,
  DeliveryBadges,
  DiagnosticAttachmentsPanel,
  Pill,
  patientNameOf,
  readApiError,
} from "./diagnostics-workspace";
import type { DiagnosticOrder, DiagnosticResult, DiagnosticType } from "./diagnostics-workspace";

const formatDateTime = (value: string | null) =>
  value ? new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";

export function DiagnosticsResultWorkspace({ orderId, type }: { orderId: string; type: DiagnosticType }) {
  const config = DEPARTMENTS[type];
  const [order, setOrder] = useState<DiagnosticOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [reportText, setReportText] = useState("");
  const [critical, setCritical] = useState(false);
  const [criticalNotes, setCriticalNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/diagnostics/orders/${encodeURIComponent(orderId)}`, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error(await readApiError(response));
      const loaded = (await response.json() as { order: DiagnosticOrder }).order;
      setOrder(loaded);
      // Fall back to the most recent released report so a completed order still
      // shows what was actually sent out, rather than an empty box.
      const draft = loaded.results.find((result) => result.status === "PRELIMINARY");
      const shown = draft ?? loaded.results.find((result) => result.releasedAt);
      setReportText(shown?.reportText ?? "");
      setCritical(shown?.critical ?? false);
      setCriticalNotes(shown?.criticalNotes ?? "");
    } catch (cause) {
      setOrder(null);
      setError(cause instanceof Error ? cause.message : `The ${config.department.toLowerCase()} order could not be loaded.`);
    } finally {
      setLoading(false);
    }
  }, [config.department, orderId]);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  const draft: DiagnosticResult | undefined = order?.results.find((result) => result.status === "PRELIMINARY");
  const released = order?.results.filter((result) => result.releasedAt) ?? [];
  const readOnly = released.length > 0 && !draft;

  async function saveDraft() {
    if (!order) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/v1/diagnostics/orders/${encodeURIComponent(order.id)}/result`, {
        method: "PUT",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          resultId: draft?.id,
          version: draft?.version,
          reportText: reportText.trim(),
          critical,
          criticalNotes: criticalNotes.trim() || undefined,
        }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      setMessage("Result saved as preliminary. It is not visible to the patient until released.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The result could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function release() {
    if (!order || !draft) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/v1/diagnostics/orders/${encodeURIComponent(order.id)}/result/${encodeURIComponent(draft.id)}/release`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error(await readApiError(response));
      setMessage("Result released. It has been sent to the patient portal and the ordering doctor.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The result could not be released.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-5" aria-busy="true">
        <div className="h-32 animate-pulse rounded-3xl bg-slate-100" />
        <div className="h-72 animate-pulse rounded-3xl bg-slate-100" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-slate-200 bg-red-50 p-8 text-center">
        <h1 className="text-xl font-black text-slate-900">{config.department} order unavailable</h1>
        <p className="mt-2 text-sm text-slate-600">{error}</p>
        <Link className="mt-5 inline-block rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white" href={config.basePath}>
          Back to worklist
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <WonFlowPageHeader
        breadcrumbs={[{ label: `${config.department} worklist`, href: config.basePath }, { label: order.name }]}
        description={`${order.code} · ${order.accessionNumber ?? "Accession pending"} · ${patientNameOf(order.patient)} (${order.patient.patientNumber})`}
        eyebrow="Diagnostic services"
        title={order.name}
      />

      {message ? (
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-emerald-50 p-4 text-sm font-black text-emerald-700">
          <CheckCircle2 aria-hidden className="size-5 shrink-0" />
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          <AlertTriangle aria-hidden className="size-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-black text-slate-900">{readOnly ? `Released ${config.outputNoun}` : `${config.outputNoun === "report" ? "Report" : "Result"} entry`}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {readOnly
              ? "This report has been verified and released. It can no longer be edited."
              : "Saved results stay preliminary and private until a verifier releases them."}
          </p>

          {config.usesSpecimens && order.specimens.length === 0 ? (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">
              <TestTube aria-hidden className="size-4 shrink-0" />
              Collect a specimen from the worklist before entering a result.
            </div>
          ) : null}

          <label className="mt-4 block">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Report narrative</span>
            <textarea
              className="mt-1.5 min-h-44 w-full rounded-xl border border-slate-200 p-3 text-slate-900"
              disabled={readOnly}
              name="reportText"
              onChange={(event) => setReportText(event.target.value)}
              placeholder="Enter measured values, reference ranges and interpretation."
              value={reportText}
            />
          </label>

          <label className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <input
              checked={critical}
              className="mt-0.5 size-4"
              disabled={readOnly}
              name="critical"
              onChange={(event) => setCritical(event.target.checked)}
              type="checkbox"
            />
            <span>
              <span className="block text-sm font-black text-slate-900">Flag as a critical result</span>
              <span className="block text-xs text-slate-500">Raises a critical audit event and highlights the result for the care team.</span>
            </span>
          </label>

          {critical ? (
            <label className="mt-3 block">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">Critical notes (required)</span>
              <textarea
                className="mt-1.5 min-h-20 w-full rounded-xl border border-slate-200 p-3 text-slate-900"
                name="criticalNotes"
                onChange={(event) => setCriticalNotes(event.target.value)}
                placeholder="Describe the critical finding and who was contacted."
                value={criticalNotes}
              />
            </label>
          ) : null}

          <div className={`mt-5 flex-wrap gap-2 ${readOnly ? "hidden" : "flex"}`}>
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              disabled={busy || (config.usesSpecimens && order.specimens.length === 0) || !reportText.trim()}
              onClick={() => void saveDraft()}
              type="button"
            >
              <Save aria-hidden className="size-4" />
              {busy ? "Saving…" : `${draft ? "Update" : "Save"} preliminary ${config.outputNoun}`}
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-50"
              disabled={busy || !draft}
              onClick={() => void release()}
              type="button"
            >
              <Send aria-hidden className="size-4" />
              {busy ? "Releasing…" : "Verify & release"}
            </button>
          </div>
          {!draft && !released.length ? (
            <p className="mt-2 text-xs text-slate-500">Save a preliminary {config.outputNoun} before it can be released.</p>
          ) : null}
        </section>

        <div className="space-y-4">
          <DiagnosticAttachmentsPanel attachments={order.attachments} canDelete={true} onChange={() => void load()} orderId={order.id} />

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">{config.usesSpecimens ? "Specimens" : "Study"}</h2>
            {!config.usesSpecimens ? (
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <dt className="text-slate-500">Body site</dt>
                  <dd className="font-bold text-slate-900">{order.specimenOrBodySite ?? "Not specified"}</dd>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <dt className="text-slate-500">Modality code</dt>
                  <dd className="font-bold text-slate-900">{order.code}</dd>
                </div>
              </dl>
            ) : order.specimens.length ? (
              <ul className="mt-3 space-y-2">
                {order.specimens.map((specimen) => (
                  <li className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-emerald-50 px-3 py-2" key={specimen.id}>
                    <span className="font-bold text-slate-900">{specimen.specimenType}</span>
                    <span className="text-xs text-slate-500">{specimen.accessionNumber}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
                No specimen collected yet.
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">Delivery</h2>
            <p className="mt-1 text-sm text-slate-500">Who has received this result.</p>
            {order.results.length ? (
              <ul className="mt-3 space-y-3">
                {order.results.map((result) => (
                  <li className="rounded-2xl border border-slate-200 bg-slate-50 p-3" key={result.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Pill tone={result.releasedAt ? "emerald" : "amber"}>{result.status.toLowerCase()}</Pill>
                      <span className="text-xs text-slate-500">{formatDateTime(result.releasedAt)}</span>
                    </div>
                    <div className="mt-2">
                      <DeliveryBadges result={result} />
                    </div>
                    {result.releasedAt ? (
                      <ul className="mt-2 space-y-1 text-xs text-slate-500">
                        <li className="flex items-center gap-1.5">
                          <UserRound aria-hidden className="size-3.5" />
                          Visible in the patient portal
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Stethoscope aria-hidden className="size-3.5" />
                          Notified the ordering doctor
                        </li>
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
                No result entered yet.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
