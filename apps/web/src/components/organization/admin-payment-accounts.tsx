"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Banknote, Check, Copy, Landmark, Plus, Save, Smartphone, Trash2 } from "lucide-react";

import { WonFlowAsyncDataBoundary, useWonFlowConfirm } from "@/components/feedback";
import { phaseOneApi } from "@/lib/api/phase-one-api";
import { useWonFlowAsyncData } from "@/lib/data";

type PaymentAccountMethod = "BANK_TRANSFER" | "JAZZCASH" | "EASYPAISA";

interface PaymentAccountRecord {
  id: string;
  method: PaymentAccountMethod;
  bankName: string | null;
  accountTitle: string;
  accountNumber: string;
  iban: string | null;
  isEnabled: boolean;
  displayOrder: number;
}

const METHOD_LABELS: Record<PaymentAccountMethod, string> = {
  BANK_TRANSFER: "Bank transfer",
  JAZZCASH: "JazzCash",
  EASYPAISA: "Easypaisa",
};

const METHOD_ICONS: Record<PaymentAccountMethod, typeof Landmark> = {
  BANK_TRANSFER: Landmark,
  JAZZCASH: Smartphone,
  EASYPAISA: Smartphone,
};

const fieldClass = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60";

function ErrorMessage({ message }: { message: string }) {
  return message ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700" role="alert">{message}</p> : null;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5">
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate text-xs font-bold text-slate-800">{value}</p>
      </div>
      <button
        className="shrink-0 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:border-blue-300 hover:text-blue-700"
        onClick={() => {
          void navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        title={`Copy ${label.toLowerCase()}`}
        type="button"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
    </div>
  );
}

function PaymentAccountCard({ account, onSaved }: { account: PaymentAccountRecord; onSaved(): void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    method: account.method, bankName: account.bankName ?? "", accountTitle: account.accountTitle,
    accountNumber: account.accountNumber, iban: account.iban ?? "", isEnabled: account.isEnabled,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const { confirm, dialog: confirmDialog } = useWonFlowConfirm();
  const Icon = METHOD_ICONS[account.method];

  async function save() {
    setSaving(true);
    setError("");
    try {
      await phaseOneApi(`/api/v1/admin/payment-accounts/${account.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          method: form.method, bankName: form.bankName || null, accountTitle: form.accountTitle,
          accountNumber: form.accountNumber, iban: form.iban || null, isEnabled: form.isEnabled,
        }),
      });
      setEditing(false);
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "This payment account could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled() {
    setSaving(true);
    try {
      await phaseOneApi(`/api/v1/admin/payment-accounts/${account.id}`, { method: "PATCH", body: JSON.stringify({ isEnabled: !account.isEnabled }) });
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "This payment account could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!await confirm({ title: "Delete payment account", message: "Patients will no longer see this account when paying for an online consultation.", confirmLabel: "Delete account" })) return;
    setDeleting(true);
    setError("");
    try {
      await phaseOneApi(`/api/v1/admin/payment-accounts/${account.id}`, { method: "DELETE" });
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "This payment account could not be deleted.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article className="rounded-2xl border border-slate-200 p-4">
      {confirmDialog}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon size={16} /></span>
          <div>
            <h3 className="font-bold text-slate-950">{account.accountTitle}</h3>
            <p className="text-xs text-slate-500">{METHOD_LABELS[account.method]}{account.bankName ? ` · ${account.bankName}` : ""}</p>
          </div>
        </div>
        <button
          className={`rounded-full px-2.5 py-1 text-[9px] font-bold transition ${account.isEnabled ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          disabled={saving}
          onClick={() => void toggleEnabled()}
          type="button"
        >
          {account.isEnabled ? "ENABLED" : "DISABLED"}
        </button>
      </div>

      {!editing ? (
        <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
          <CopyField label="Account number" value={account.accountNumber} />
          {account.iban ? <CopyField label="IBAN" value={account.iban} /> : null}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <select className={fieldClass} onChange={(event) => setForm({ ...form, method: event.target.value as PaymentAccountMethod })} value={form.method}>
              {(Object.keys(METHOD_LABELS) as PaymentAccountMethod[]).map((method) => <option key={method} value={method}>{METHOD_LABELS[method]}</option>)}
            </select>
            <input className={fieldClass} onChange={(event) => setForm({ ...form, bankName: event.target.value })} placeholder="Bank name (optional)" value={form.bankName} />
          </div>
          <input className={fieldClass} onChange={(event) => setForm({ ...form, accountTitle: event.target.value })} placeholder="Account title" value={form.accountTitle} />
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={fieldClass} onChange={(event) => setForm({ ...form, accountNumber: event.target.value })} placeholder="Account number" value={form.accountNumber} />
            <input className={fieldClass} onChange={(event) => setForm({ ...form, iban: event.target.value })} placeholder="IBAN (optional)" value={form.iban} />
          </div>
        </div>
      )}

      <ErrorMessage message={error} />

      <div className="mt-3 flex justify-end gap-2">
        {editing ? (
          <>
            <button className={buttonClass} disabled={saving || !form.accountTitle.trim() || !form.accountNumber.trim()} onClick={() => void save()} type="button">
              <Save size={15} />{saving ? "Saving" : "Save"}
            </button>
            <button className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700" disabled={saving} onClick={() => setEditing(false)} type="button">Cancel</button>
          </>
        ) : (
          <>
            <button className="min-h-10 rounded-xl border border-blue-200 px-4 text-xs font-bold text-blue-700 hover:bg-blue-50" onClick={() => setEditing(true)} type="button">Edit</button>
            <button className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-rose-200 px-3 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-60" disabled={deleting} onClick={() => void remove()} type="button">
              <Trash2 size={14} />{deleting ? "Deleting…" : "Delete"}
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function CreatePaymentAccount({ onCreated }: { onCreated(): void }) {
  const [form, setForm] = useState({ method: "BANK_TRANSFER" as PaymentAccountMethod, bankName: "", accountTitle: "", accountNumber: "", iban: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await phaseOneApi("/api/v1/admin/payment-accounts", {
        method: "POST",
        body: JSON.stringify({ method: form.method, bankName: form.bankName.trim() || undefined, accountTitle: form.accountTitle.trim(), accountNumber: form.accountNumber.trim(), iban: form.iban.trim() || undefined }),
      });
      setForm({ method: "BANK_TRANSFER", bankName: "", accountTitle: "", accountNumber: "", iban: "" });
      onCreated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "This payment account could not be created.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="wf-admin-panel rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-bold text-slate-950">Add a payment account</h2>
      <p className="mt-1 text-xs text-slate-500">Shown to patients paying for an online consultation that requires prepayment.</p>
      <form className="mt-4 space-y-3" onSubmit={create}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1"><span className="text-xs font-bold text-slate-700">Method</span>
            <select className={fieldClass} onChange={(event) => setForm({ ...form, method: event.target.value as PaymentAccountMethod })} value={form.method}>
              {(Object.keys(METHOD_LABELS) as PaymentAccountMethod[]).map((method) => <option key={method} value={method}>{METHOD_LABELS[method]}</option>)}
            </select>
          </label>
          <label className="space-y-1"><span className="text-xs font-bold text-slate-700">Bank name (optional)</span>
            <input className={fieldClass} onChange={(event) => setForm({ ...form, bankName: event.target.value })} value={form.bankName} />
          </label>
        </div>
        <label className="space-y-1"><span className="text-xs font-bold text-slate-700">Account title</span>
          <input className={fieldClass} required onChange={(event) => setForm({ ...form, accountTitle: event.target.value })} value={form.accountTitle} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1"><span className="text-xs font-bold text-slate-700">Account number</span>
            <input className={fieldClass} required onChange={(event) => setForm({ ...form, accountNumber: event.target.value })} value={form.accountNumber} />
          </label>
          <label className="space-y-1"><span className="text-xs font-bold text-slate-700">IBAN (optional)</span>
            <input className={fieldClass} onChange={(event) => setForm({ ...form, iban: event.target.value })} value={form.iban} />
          </label>
        </div>
        <ErrorMessage message={error} />
        <button className={`${buttonClass} w-full`} disabled={saving || !form.accountTitle.trim() || !form.accountNumber.trim()} type="submit">
          <Plus size={17} />{saving ? "Adding" : "Add account"}
        </button>
      </form>
    </section>
  );
}

export function AdminPaymentAccountsPage() {
  const resource = useWonFlowAsyncData<{ paymentAccounts: PaymentAccountRecord[] }>({
    key: "admin:payment-accounts",
    loader: async (signal) => phaseOneApi<{ paymentAccounts: PaymentAccountRecord[] }>("/api/v1/admin/payment-accounts", { signal }),
  });

  return (
    <div className="space-y-4" id="main-content">
      <section className="rounded-[26px] border border-blue-100 bg-gradient-to-br from-white via-blue-50/70 to-violet-50 p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white"><Banknote aria-hidden="true" size={22} /></span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">Services & governance</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">Payment accounts</h1>
            <p className="mt-1 text-sm text-slate-600">Bank, JazzCash and Easypaisa accounts patients are shown when an online consultation requires prepayment. Disabled accounts stay hidden from patients without losing their history.</p>
          </div>
        </div>
      </section>

      <WonFlowAsyncDataBoundary loadingTitle="Loading payment accounts" loadingDescription="Reading configured payment accounts." onRetry={resource.reload} state={resource}>
        {(data) => (
          <div className="space-y-4">
            {data.paymentAccounts.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">No payment accounts configured yet. Add one below so online bookings can show patients where to pay.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {data.paymentAccounts.map((account) => <PaymentAccountCard account={account} key={account.id} onSaved={resource.reload} />)}
              </div>
            )}
            <CreatePaymentAccount onCreated={resource.reload} />
          </div>
        )}
      </WonFlowAsyncDataBoundary>
    </div>
  );
}
