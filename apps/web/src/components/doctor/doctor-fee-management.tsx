"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Banknote, Building2, CalendarDays, CheckCircle2, Clock, LockKeyhole, Plus, Save, ShieldCheck, Stethoscope, Trash2, XCircle } from "lucide-react";

import { WonFlowAsyncDataBoundary, WonFlowEmptyState, useWonFlowConfirm } from "@/components/feedback";
import { phaseOneApi } from "@/lib/api/phase-one-api";
import { useWonFlowAsyncData } from "@/lib/data";
import { useDoctorPortalContext } from "./doctor-portal-shell";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

function formatMinuteOfDay(value: number): string {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function PracticeSchedulePanel() {
  const { roster } = useDoctorPortalContext();
  const orderedRoster = [...roster].sort(
    (left, right) => left.weekday - right.weekday || left.startsMinute - right.startsMinute,
  );

  return (
    <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 px-5 py-4 dark:border-slate-800 dark:from-slate-900 dark:via-indigo-950/30 dark:to-slate-900">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20">
            <CalendarDays size={18} />
          </span>
          <div>
            <h2 className="font-bold text-slate-950 dark:text-white">Consultation schedule</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Your weekly hours, set by hospital administration and bookable by reception and patients.
            </p>
          </div>
        </div>
      </div>
      {orderedRoster.length === 0 ? (
        <div className="m-5 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 p-7 text-center dark:border-indigo-900/40 dark:bg-indigo-950/20">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No consultation hours configured</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Ask hospital administration to add your weekly availability.</p>
        </div>
      ) : (
        <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
          {orderedRoster.map((item) => (
            <article className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/60" key={item.id}>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{DAY_NAMES[item.weekday]}</h3>
              <p className="mt-3 text-sm font-bold text-indigo-700 dark:text-indigo-400">
                {formatMinuteOfDay(item.startsMinute)}–{formatMinuteOfDay(item.endsMinute)}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {item.branch.name} · {item.capacity} slot{item.capacity === 1 ? "" : "s"}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

interface DoctorFeeRequestRecord {
  id: string;
  requestType: "CREATE_SERVICE" | "UPDATE_FEE";
  proposedName: string | null;
  proposedDescription: string | null;
  proposedDurationMinutes: number | null;
  proposedPriceMinorUnits: number;
  proposedCurrencyCode: string;
  status: "PENDING" | "APPROVED" | "DECLINED";
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  service: { id: string; name: string; code: string } | null;
  proposedBranch: { id: string; name: string } | null;
  reviewedBy: { id: string; displayName: string } | null;
}

interface DoctorServiceOverview {
  authority: "DOCTOR" | "HOSPITAL" | "APPROVAL_REQUIRED";
  organization: { id: string; name: string };
  doctor: { id: string; displayName: string; specialty: string | null };
  branches: Array<{ id: string; name: string; code: string; currencyCode: string }>;
  services: Array<{
    id: string;
    code: string;
    name: string;
    description: string | null;
    durationMinutes: number;
    priceMinorUnits: number | null;
    currencyCode: string;
    publiclyBookable: boolean;
    consultationModes: ("IN_PERSON" | "ONLINE")[];
    isActive: boolean;
    branch: { id: string; name: string } | null;
  }>;
}

const fieldClass = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-blue-400";
const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500";

function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300" role="alert">
      {message}
    </p>
  ) : null;
}

/** A service may be offered in person, online, or both — never neither. */
function ConsultationModeCheckboxes({ value, onChange }: { value: ("IN_PERSON" | "ONLINE")[]; onChange(next: ("IN_PERSON" | "ONLINE")[]): void }) {
  function toggle(mode: "IN_PERSON" | "ONLINE") {
    const isOn = value.includes(mode);
    if (isOn && value.length === 1) return;
    onChange(isOn ? value.filter((entry) => entry !== mode) : [...value, mode]);
  }
  return (
    <div className="flex flex-wrap gap-3">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
        <input checked={value.includes("IN_PERSON")} onChange={() => toggle("IN_PERSON")} type="checkbox" />
        In person
      </label>
      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
        <input checked={value.includes("ONLINE")} onChange={() => toggle("ONLINE")} type="checkbox" />
        Online video consultation
      </label>
    </div>
  );
}

function DoctorFeeRequestsPanel({ reloadKey }: { reloadKey: number }) {
  const [requests, setRequests] = useState<DoctorFeeRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    phaseOneApi<{ feeRequests: DoctorFeeRequestRecord[] }>("/api/v1/doctor/fee-requests")
      .then((res) => {
        if (active) setRequests(res.feeRequests || []);
      })
      .catch((e) => console.error(e))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs text-slate-500">Loading your fee proposals…</p>
      </section>
    );
  }

  if (requests.length === 0) return null;

  return (
    <section className="wf-admin-panel rounded-[22px] border border-indigo-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
          <Clock size={18} />
        </span>
        <div>
          <h2 className="font-bold text-slate-950 dark:text-white">My Fee Proposals & History</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track status of consultation fee requests submitted to hospital administration.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {requests.map((req) => {
          const isPending = req.status === "PENDING";
          const isApproved = req.status === "APPROVED";
          const isDeclined = req.status === "DECLINED";

          return (
            <article
              className={`rounded-2xl border p-4 transition ${
                isPending
                  ? "border-amber-200 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20"
                  : isApproved
                  ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                  : "border-rose-200 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-950/20"
              }`}
              key={req.id}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="rounded bg-white/80 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {req.requestType === "CREATE_SERVICE" ? "New Service Proposal" : "Fee Change"}
                  </span>
                  <h3 className="mt-1.5 text-sm font-bold text-slate-950 dark:text-white">
                    {req.proposedName || req.service?.name || "Consultation"}
                  </h3>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    isPending
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
                      : isApproved
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                      : "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200"
                  }`}
                >
                  {isPending && <Clock size={11} />}
                  {isApproved && <CheckCircle2 size={11} />}
                  {isDeclined && <XCircle size={11} />}
                  {isPending ? "Pending Admin Approval" : isApproved ? "Approved" : "Declined"}
                </span>
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Proposed Fee:</span>
                <strong className="text-base font-black text-slate-900 dark:text-white">
                  {new Intl.NumberFormat("en-PK", { style: "currency", currency: req.proposedCurrencyCode, maximumFractionDigits: 0 }).format(req.proposedPriceMinorUnits / 100)}
                </strong>
              </div>

              {isDeclined && req.rejectionReason && (
                <div className="mt-2.5 rounded-xl border border-rose-200 bg-white/90 p-2.5 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-slate-900 dark:text-rose-300">
                  <strong>Reason from Admin:</strong> {req.rejectionReason}
                </div>
              )}

              <p className="mt-2 text-[10px] text-slate-400">
                Submitted {new Date(req.createdAt).toLocaleDateString()}
                {req.reviewedAt && ` · Reviewed ${new Date(req.reviewedAt).toLocaleDateString()}`}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ServiceEditor({ authority, service, onSaved }: { authority: DoctorServiceOverview["authority"]; service: DoctorServiceOverview["services"][number]; onSaved(): void }) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(service.priceMinorUnits === null ? "" : String(service.priceMinorUnits / 100));
  const [duration, setDuration] = useState(String(service.durationMinutes));
  const [publiclyBookable, setPubliclyBookable] = useState(service.publiclyBookable);
  const [consultationModes, setConsultationModes] = useState(service.consultationModes);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const { confirm, dialog: confirmDialog } = useWonFlowConfirm();

  const isApprovalMode = authority === "APPROVAL_REQUIRED";

  async function save() {
    setSaving(true);
    setError("");
    setInfoMessage("");
    try {
      const res = await phaseOneApi<{ pendingApproval?: boolean }>(`/api/v1/doctor/services/${service.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          priceMinorUnits: Math.round(Number(price) * 100),
          durationMinutes: Number(duration),
          publiclyBookable,
          consultationModes,
        }),
      });
      if (res?.pendingApproval) {
        setInfoMessage("Fee proposal submitted to hospital administration for approval.");
      }
      setEditing(false);
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The consultation service could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!await confirm({ title: "Delete service", message: `${service.name} is removed from Reception and all booking portals.`, confirmLabel: "Delete service" })) return;
    setDeleting(true);
    setError("");
    try {
      await phaseOneApi(`/api/v1/doctor/services/${service.id}`, { method: "DELETE" });
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The service could not be deleted.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {confirmDialog}
      {editing ? (
        <div className="mb-3 space-y-1">
          <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">Consultation delivery</span>
          <ConsultationModeCheckboxes onChange={setConsultationModes} value={consultationModes} />
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-950 dark:text-white">{service.name}</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{service.code} · {service.branch?.name ?? "All branches"}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${service.isActive ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
          {service.isActive ? "ACTIVE" : "INACTIVE"}
        </span>
      </div>

      {infoMessage && (
        <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
          {infoMessage}
        </p>
      )}

      {editing ? (
        <div className="mt-4 space-y-3">
          {isApprovalMode && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
              Note: Updating the fee will submit an approval request to hospital administration.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Fee ({service.currencyCode})</span>
              <input className={fieldClass} min="0" onChange={(event) => setPrice(event.target.value)} required step="0.01" type="number" value={price} />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Minutes</span>
              <input className={fieldClass} min="5" onChange={(event) => setDuration(event.target.value)} required type="number" value={duration} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <input checked={publiclyBookable} onChange={(event) => setPubliclyBookable(event.target.checked)} type="checkbox" />
            Available for patient booking
          </label>
          <ErrorMessage message={error} />
          <div className="flex gap-2">
            <button className={buttonClass} disabled={saving || price === ""} onClick={save} type="button">
              <Save aria-hidden="true" size={16} />
              {saving ? "Saving…" : isApprovalMode ? "Submit Fee Change Proposal" : "Save changes"}
            </button>
            <button className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" disabled={saving} onClick={() => setEditing(false)} type="button">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Consultation fee</p>
            <p className="mt-1 text-xl font-bold text-blue-700 dark:text-blue-400">
              {service.priceMinorUnits === null ? "Not set" : new Intl.NumberFormat("en-PK", { style: "currency", currency: service.currencyCode, maximumFractionDigits: 0 }).format(service.priceMinorUnits / 100)}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {service.durationMinutes} minutes · {service.publiclyBookable ? "Public booking enabled" : "Internal booking only"}
            </p>
          </div>
          <button className="min-h-10 rounded-xl border border-blue-200 px-4 text-xs font-bold text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/50" onClick={() => setEditing(true)} type="button">
            Edit service & fee
          </button>
        </div>
      )}

      {!editing ? (
        <div className="mt-3 flex justify-end">
          <button className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-rose-200 px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/40" disabled={deleting} onClick={() => void remove()} type="button">
            <Trash2 size={14} />
            {deleting ? "Deleting..." : "Delete service"}
          </button>
        </div>
      ) : null}
    </article>
  );
}

function CreateDoctorService({ overview, onCreated }: { overview: DoctorServiceOverview; onCreated(): void }) {
  const [form, setForm] = useState({ code: "INITIAL", name: "Initial consultation", branchId: overview.branches[0]?.id ?? "", duration: "15", price: "", publiclyBookable: false, consultationModes: ["IN_PERSON"] as ("IN_PERSON" | "ONLINE")[] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isApprovalMode = overview.authority === "APPROVAL_REQUIRED";

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      const res = await phaseOneApi<{ pendingApproval?: boolean }>("/api/v1/doctor/services", {
        method: "POST",
        body: JSON.stringify({
          code: form.code,
          name: form.name,
          branchId: form.branchId || undefined,
          durationMinutes: Number(form.duration),
          priceMinorUnits: Math.round(Number(form.price) * 100),
          publiclyBookable: form.publiclyBookable,
          consultationModes: form.consultationModes,
        }),
      });

      if (res?.pendingApproval) {
        setSuccessMessage("Your fee proposal has been submitted to hospital administration for approval!");
      }
      setForm({ code: "FOLLOWUP", name: "Follow-up consultation", branchId: overview.branches[0]?.id ?? "", duration: "15", price: "", publiclyBookable: false, consultationModes: ["IN_PERSON"] });
      onCreated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The consultation service could not be created.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="wf-admin-panel rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="font-bold text-slate-950 dark:text-white">
        {isApprovalMode ? "Propose consultation service" : "Add consultation service"}
      </h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {isApprovalMode
          ? "Propose a consultation service and fee for administrator review."
          : "Create an in-person or secure online video consultation."}
      </p>

      {successMessage && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
          {successMessage}
        </div>
      )}

      <form className="mt-4 space-y-3" onSubmit={create}>
        <label className="space-y-1">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Short code</span>
          <input className={fieldClass} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} required value={form.code} />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Service name</span>
          <input className={fieldClass} onChange={(event) => setForm({ ...form, name: event.target.value })} required value={form.name} />
        </label>
        <div className="space-y-1">
          <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">Consultation delivery</span>
          <ConsultationModeCheckboxes onChange={(modes) => setForm({ ...form, consultationModes: modes })} value={form.consultationModes} />
        </div>
        <label className="space-y-1">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Branch</span>
          <select className={fieldClass} onChange={(event) => setForm({ ...form, branchId: event.target.value })} value={form.branchId}>
            <option value="">All branches</option>
            {overview.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Minutes</span>
            <input className={fieldClass} min="5" onChange={(event) => setForm({ ...form, duration: event.target.value })} required type="number" value={form.duration} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Fee (PKR)</span>
            <input className={fieldClass} min="0" onChange={(event) => setForm({ ...form, price: event.target.value })} required step="0.01" type="number" value={form.price} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <input checked={form.publiclyBookable} onChange={(event) => setForm({ ...form, publiclyBookable: event.target.checked })} type="checkbox" />
          Available for patient booking
        </label>
        <ErrorMessage message={error} />
        <button className={`${buttonClass} w-full`} disabled={saving} type="submit">
          <Plus aria-hidden="true" size={17} />
          {saving ? "Submitting…" : isApprovalMode ? "Submit Proposal for Approval" : "Add consultation service"}
        </button>
      </form>
    </section>
  );
}

export function DoctorFeeManagementPage() {
  const [reloadCounter, setReloadCounter] = useState(0);
  const resource = useWonFlowAsyncData<{ services: DoctorServiceOverview }>({
    key: "doctor:services-and-fees",
    loader: (signal) => phaseOneApi<{ services: DoctorServiceOverview }>("/api/v1/doctor/services", { signal }),
  });

  const handleSavedOrCreated = () => {
    resource.reload();
    setReloadCounter((prev) => prev + 1);
  };

  return (
    <div className="space-y-4" id="main-content">
      <section className="rounded-[26px] bg-gradient-to-br from-slate-950 via-blue-950 to-violet-900 p-5 text-white shadow-xl">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20">
            <Banknote aria-hidden="true" size={23} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">Doctor workspace</p>
            <h1 className="mt-1 text-2xl font-bold">Practice Configuration</h1>
            <p className="mt-1 text-sm text-blue-100/80">Configure your consultation services, fees, booking access and weekly schedule.</p>
          </div>
        </div>
      </section>

      <PracticeSchedulePanel />

      <WonFlowAsyncDataBoundary loadingDescription="Reading your live doctor profile and fee access." loadingTitle="Loading consultation services" onRetry={resource.reload} state={resource}>
        {({ services: overview }) => {
          const isDoctorManaged = overview.authority === "DOCTOR";
          const isApprovalRequired = overview.authority === "APPROVAL_REQUIRED";
          const canManageOrPropose = isDoctorManaged || isApprovalRequired;

          return (
            <>
              {/* Access Mode Banner */}
              <section
                className={`rounded-2xl border p-4 ${
                  isDoctorManaged
                    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30"
                    : isApprovalRequired
                    ? "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30"
                    : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  {isDoctorManaged ? (
                    <Stethoscope className="mt-0.5 text-emerald-700 dark:text-emerald-400" size={20} />
                  ) : isApprovalRequired ? (
                    <ShieldCheck className="mt-0.5 text-amber-700 dark:text-amber-400" size={20} />
                  ) : (
                    <LockKeyhole className="mt-0.5 text-slate-600 dark:text-slate-400" size={20} />
                  )}
                  <div>
                    <h2 className="font-bold text-slate-950 dark:text-white">
                      {isDoctorManaged
                        ? "Doctor-managed access is active"
                        : isApprovalRequired
                        ? "Approval-required fee access is active"
                        : "Hospital-managed access is active"}
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                      {isDoctorManaged
                        ? "You may create consultation services and update your own fees directly."
                        : isApprovalRequired
                        ? "You can propose consultation services and fee amounts. Hospital administrators will review and approve or decline them."
                        : `${overview.organization.name} controls consultation services and fees. You can review them here but cannot change them.`}
                    </p>
                  </div>
                </div>
              </section>

              {/* Proposals Panel for Doctor */}
              <DoctorFeeRequestsPanel reloadKey={reloadCounter} />

              <div className={`grid gap-4 ${canManageOrPropose ? "xl:grid-cols-[1.2fr_0.8fr]" : ""}`}>
                {/* Active Services List */}
                <section className="wf-admin-panel rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center gap-3">
                    <Building2 className="text-blue-600 dark:text-blue-400" size={20} />
                    <div>
                      <h2 className="font-bold text-slate-950 dark:text-white">My consultation services</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {overview.doctor.displayName}
                        {overview.doctor.specialty ? ` · ${overview.doctor.specialty}` : ""}
                      </p>
                    </div>
                  </div>

                  {overview.services.length === 0 ? (
                    <div className="mt-4">
                      <WonFlowEmptyState
                        description={
                          canManageOrPropose
                            ? "Add or propose your first consultation service and fee."
                            : "Ask the hospital administrator to configure your consultation service."
                        }
                        title="No consultation services"
                      />
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                      {overview.services.map((service) =>
                        canManageOrPropose ? (
                          <ServiceEditor authority={overview.authority} key={service.id} onSaved={handleSavedOrCreated} service={service} />
                        ) : (
                          <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 dark:bg-slate-800/40" key={service.id}>
                            <h3 className="font-bold text-slate-950 dark:text-white">{service.name}</h3>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {service.branch?.name ?? "All branches"} · {service.durationMinutes} minutes
                            </p>
                            <p className="mt-3 text-lg font-bold text-blue-700 dark:text-blue-400">
                              {service.priceMinorUnits === null
                                ? "Not priced"
                                : new Intl.NumberFormat("en-PK", { style: "currency", currency: service.currencyCode, maximumFractionDigits: 0 }).format(service.priceMinorUnits / 100)}
                            </p>
                          </article>
                        ),
                      )}
                    </div>
                  )}
                </section>

                {/* Form to create/propose service */}
                {canManageOrPropose ? (
                  <CreateDoctorService onCreated={handleSavedOrCreated} overview={overview} />
                ) : null}
              </div>
            </>
          );
        }}
      </WonFlowAsyncDataBoundary>
    </div>
  );
}
