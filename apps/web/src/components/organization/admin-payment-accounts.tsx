"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Banknote, Check, Copy, Landmark, Plus, Save, Search, Smartphone, Trash2, X } from "lucide-react";

import { WonFlowAsyncDataBoundary, WonFlowEmptyState, WonFlowPagination, useWonFlowConfirm, useWonFlowPagination } from "@/components/feedback";
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

const fieldClass = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-900/40 dark:placeholder:text-slate-500";
const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-5 text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition hover:from-indigo-500 hover:to-violet-500 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60";

function ErrorMessage({ message }: { message: string }) {
  return message ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300" role="alert">{message}</p> : null;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 transition dark:border-slate-800 dark:bg-slate-900/70">
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
        <p className="truncate font-mono text-xs font-bold text-slate-800 dark:text-slate-200">{value}</p>
      </div>
      <button
        aria-label={`Copy ${label.toLowerCase()}`}
        className="shrink-0 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-indigo-500 dark:hover:text-indigo-300"
        onClick={() => {
          void navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        title={`Copy ${label.toLowerCase()}`}
        type="button"
      >
        {copied ? <Check className="text-emerald-600 dark:text-emerald-400" size={13} /> : <Copy size={13} />}
      </button>
    </div>
  );
}

function PaymentAccountCard({ account, onSaved }: { account: PaymentAccountRecord; onSaved(): void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    method: account.method,
    bankName: account.bankName ?? "",
    accountTitle: account.accountTitle,
    accountNumber: account.accountNumber,
    iban: account.iban ?? "",
    isEnabled: account.isEnabled,
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
          method: form.method,
          bankName: form.bankName || null,
          accountTitle: form.accountTitle,
          accountNumber: form.accountNumber,
          iban: form.iban || null,
          isEnabled: form.isEnabled,
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
      await phaseOneApi(`/api/v1/admin/payment-accounts/${account.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isEnabled: !account.isEnabled }),
      });
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
    <article className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4.5 transition duration-200 hover:border-indigo-200/80 hover:shadow-sm dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-slate-700">
      {confirmDialog}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/10 dark:bg-indigo-950/60 dark:text-indigo-400 dark:ring-indigo-500/20">
              <Icon size={18} />
            </span>
            <div>
              <h3 className="font-bold text-slate-950 dark:text-white">{account.accountTitle}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{METHOD_LABELS[account.method]}{account.bankName ? ` · ${account.bankName}` : ""}</p>
            </div>
          </div>
          <button
            className={`rounded-full border px-2.5 py-1 text-[9px] font-black tracking-wide transition ${
              account.isEnabled
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
            }`}
            disabled={saving}
            onClick={() => void toggleEnabled()}
            type="button"
          >
            {account.isEnabled ? "ENABLED" : "DISABLED"}
          </button>
        </div>

        {!editing ? (
          <div className="mt-3.5 grid gap-2 sm:grid-cols-2">
            <CopyField label="Account number" value={account.accountNumber} />
            {account.iban ? <CopyField label="IBAN" value={account.iban} /> : null}
          </div>
        ) : (
          <div className="mt-3.5 space-y-3 border-t border-slate-100 pt-3 dark:border-slate-700">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Method</span>
                <select className={fieldClass} onChange={(event) => setForm({ ...form, method: event.target.value as PaymentAccountMethod })} value={form.method}>
                  {(Object.keys(METHOD_LABELS) as PaymentAccountMethod[]).map((method) => <option key={method} value={method}>{METHOD_LABELS[method]}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Bank name (optional)</span>
                <input className={fieldClass} onChange={(event) => setForm({ ...form, bankName: event.target.value })} placeholder="e.g. Meezan Bank" value={form.bankName} />
              </label>
            </div>
            <label className="space-y-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Account title</span>
              <input className={fieldClass} onChange={(event) => setForm({ ...form, accountTitle: event.target.value })} placeholder="Account title" value={form.accountTitle} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Account number</span>
                <input className={fieldClass} onChange={(event) => setForm({ ...form, accountNumber: event.target.value })} placeholder="Account number" value={form.accountNumber} />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">IBAN (optional)</span>
                <input className={fieldClass} onChange={(event) => setForm({ ...form, iban: event.target.value })} placeholder="IBAN (optional)" value={form.iban} />
              </label>
            </div>
          </div>
        )}

        <ErrorMessage message={error} />
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        {editing ? (
          <>
            <button className={buttonClass} disabled={saving || !form.accountTitle.trim() || !form.accountNumber.trim()} onClick={() => void save()} type="button">
              <Save size={15} />{saving ? "Saving" : "Save changes"}
            </button>
            <button className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700" disabled={saving} onClick={() => setEditing(false)} type="button">
              Cancel
            </button>
          </>
        ) : (
          <>
            <button className="inline-flex min-h-9 items-center rounded-xl border border-indigo-200 bg-white px-3 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50 dark:border-indigo-500/30 dark:bg-slate-800 dark:text-indigo-300 dark:hover:bg-slate-700" onClick={() => setEditing(true)} type="button">
              Edit account
            </button>
            <button className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/30 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-slate-700" disabled={deleting} onClick={() => void remove()} type="button">
              <Trash2 size={14} />{deleting ? "Deleting…" : "Delete"}
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function AccountsCatalogue({ accounts, onSaved }: { accounts: PaymentAccountRecord[]; onSaved(): void }) {
  const [query, setQuery] = useState("");
  const [selectedMethodFilter, setSelectedMethodFilter] = useState("ALL");

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      if (selectedMethodFilter !== "ALL" && account.method !== selectedMethodFilter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase().trim();
      const titleMatch = account.accountTitle.toLowerCase().includes(q);
      const numberMatch = account.accountNumber.toLowerCase().includes(q);
      const bankMatch = (account.bankName ?? "").toLowerCase().includes(q);
      const ibanMatch = (account.iban ?? "").toLowerCase().includes(q);
      const methodMatch = METHOD_LABELS[account.method].toLowerCase().includes(q);
      return titleMatch || numberMatch || bankMatch || ibanMatch || methodMatch;
    });
  }, [accounts, query, selectedMethodFilter]);

  const accountPages = useWonFlowPagination(filteredAccounts, 6);

  const methodFilters = useMemo(() => {
    const counts = new Map<string, number>();
    for (const acc of accounts) counts.set(acc.method, (counts.get(acc.method) ?? 0) + 1);
    return [
      { code: "ALL", label: "All accounts", count: accounts.length },
      { code: "BANK_TRANSFER", label: "Bank transfer", count: counts.get("BANK_TRANSFER") ?? 0 },
      { code: "JAZZCASH", label: "JazzCash", count: counts.get("JAZZCASH") ?? 0 },
      { code: "EASYPAISA", label: "Easypaisa", count: counts.get("EASYPAISA") ?? 0 },
    ];
  }, [accounts]);

  return (
    <section className="wf-admin-panel rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-950 dark:text-white">Configured accounts</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Accounts available to patients paying for online consultations.</p>
        </div>
        <span className="self-start rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-950/60 dark:text-indigo-300 sm:self-auto">
          {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
        </span>
      </div>

      {/* Glassmorphic Search & Filter */}
      <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-r from-white/80 via-slate-50/70 to-indigo-50/40 p-3 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-gradient-to-r dark:from-slate-900/80 dark:via-slate-900/60 dark:to-indigo-950/40 dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
        <div className="relative flex items-center">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 text-slate-400 dark:text-slate-500" size={17} />
          <input
            aria-label="Search payment accounts"
            className="min-h-11 w-full rounded-xl border border-slate-200/80 bg-white/80 pl-10 pr-10 text-sm font-medium text-slate-900 placeholder:text-slate-400 backdrop-blur-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:bg-slate-800 dark:focus:ring-indigo-900/40"
            onChange={(event) => {
              setQuery(event.target.value);
              accountPages.setPage(1);
            }}
            placeholder="Search by title, account number, bank, or IBAN..."
            type="search"
            value={query}
          />
          {query ? (
            <button
              aria-label="Clear search"
              className="absolute right-3 grid h-6 w-6 place-items-center rounded-full text-slate-400 transition hover:bg-slate-200/60 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              onClick={() => {
                setQuery("");
                accountPages.setPage(1);
              }}
              type="button"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 overflow-x-auto pb-0.5">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Filter:</span>
          {methodFilters.map(({ code, label, count }) => {
            if (count === 0 && code !== "ALL") return null;
            const isSelected = selectedMethodFilter === code;
            return (
              <button
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition backdrop-blur-sm ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/25 dark:bg-indigo-500"
                    : "border border-slate-200/60 bg-white/60 text-slate-600 hover:bg-white hover:text-slate-900 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                }`}
                key={code}
                onClick={() => {
                  setSelectedMethodFilter(code);
                  accountPages.setPage(1);
                }}
                type="button"
              >
                <span>{label}</span>
                <span className={`rounded-full px-1.5 py-0.2 text-[9px] font-black ${isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {filteredAccounts.length === 0 ? (
        <div className="mt-4">
          <WonFlowEmptyState
            description={query.trim() || selectedMethodFilter !== "ALL" ? "Try adjusting your search terms or filter." : "Add your first bank, JazzCash or Easypaisa account using the form."}
            title={query.trim() || selectedMethodFilter !== "ALL" ? "No matching accounts" : "No payment accounts"}
          />
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-3.5">
            {accountPages.visible.map((account) => (
              <PaymentAccountCard account={account} key={account.id} onSaved={onSaved} />
            ))}
          </div>
          <WonFlowPagination
            firstShown={accountPages.firstShown}
            lastShown={accountPages.lastShown}
            noun="accounts"
            onPageChange={accountPages.setPage}
            page={accountPages.page}
            pageCount={accountPages.pageCount}
            total={accountPages.total}
          />
        </>
      )}
    </section>
  );
}

function CreatePaymentAccount({ onCreated }: { onCreated(): void }) {
  const [form, setForm] = useState({
    method: "BANK_TRANSFER" as PaymentAccountMethod,
    bankName: "",
    accountTitle: "",
    accountNumber: "",
    iban: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await phaseOneApi("/api/v1/admin/payment-accounts", {
        method: "POST",
        body: JSON.stringify({
          method: form.method,
          bankName: form.bankName.trim() || undefined,
          accountTitle: form.accountTitle.trim(),
          accountNumber: form.accountNumber.trim(),
          iban: form.iban.trim() || undefined,
        }),
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
    <section className="wf-admin-panel rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
      <h2 className="font-bold text-slate-950 dark:text-white">Add a payment account</h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Shown to patients paying for an online consultation that requires prepayment.</p>
      <form className="mt-4 space-y-3" onSubmit={create}>
        <div className="space-y-1">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Method</span>
          <select className={fieldClass} onChange={(event) => setForm({ ...form, method: event.target.value as PaymentAccountMethod })} value={form.method}>
            {(Object.keys(METHOD_LABELS) as PaymentAccountMethod[]).map((method) => <option key={method} value={method}>{METHOD_LABELS[method]}</option>)}
          </select>
        </div>
        {form.method === "BANK_TRANSFER" ? (
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Bank name</span>
            <input className={fieldClass} onChange={(event) => setForm({ ...form, bankName: event.target.value })} placeholder="e.g. Meezan Bank, HBL, UBL" required={form.method === "BANK_TRANSFER"} value={form.bankName} />
          </div>
        ) : null}
        <div className="space-y-1">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Account title</span>
          <input className={fieldClass} onChange={(event) => setForm({ ...form, accountTitle: event.target.value })} placeholder="e.g. City Hospital OPD" required value={form.accountTitle} />
        </div>
        <div className="space-y-1">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Account number / Mobile wallet #</span>
          <input className={fieldClass} onChange={(event) => setForm({ ...form, accountNumber: event.target.value })} placeholder="e.g. 03001234567 or 0102030405" required value={form.accountNumber} />
        </div>
        <div className="space-y-1">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">IBAN (optional)</span>
          <input className={fieldClass} onChange={(event) => setForm({ ...form, iban: event.target.value })} placeholder="PK00MEZN0000000000000000" value={form.iban} />
        </div>
        <ErrorMessage message={error} />
        <button className={`${buttonClass} w-full`} disabled={saving || !form.accountTitle.trim() || !form.accountNumber.trim()} type="submit">
          <Plus size={17} />{saving ? "Adding account…" : "Add payment account"}
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
      <section className="relative overflow-hidden rounded-[24px] border border-indigo-200/80 bg-gradient-to-br from-cyan-50 via-white to-violet-100 p-5 shadow-[0_12px_36px_rgba(79,70,229,0.08)] sm:p-6 dark:border-indigo-500/20 dark:bg-gradient-to-br dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 dark:shadow-[0_12px_36px_rgba(0,0,0,0.5)]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-cyan-400 via-indigo-500 to-violet-600" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full bg-cyan-300/30 blur-3xl dark:bg-cyan-500/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 right-8 h-72 w-72 rounded-full bg-violet-400/30 blur-3xl dark:bg-violet-500/10" />
        <div className="relative flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25 ring-2 ring-white/60 dark:ring-indigo-400/30">
            <Banknote aria-hidden="true" size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">Services & governance</p>
            <h1 className="mt-1 text-2xl font-black tracking-[-0.03em] text-slate-950 dark:text-white sm:text-3xl">Payment Accounts</h1>
            <p className="mt-1 max-w-3xl text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
              Bank, JazzCash and Easypaisa accounts patients are shown when an online consultation requires prepayment. Disabled accounts stay hidden from patients without losing their history.
            </p>
          </div>
        </div>
      </section>

      <WonFlowAsyncDataBoundary loadingDescription="Reading configured payment accounts." loadingTitle="Loading payment accounts" onRetry={resource.reload} state={resource}>
        {(data) => (
          <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
            <AccountsCatalogue accounts={data.paymentAccounts} onSaved={resource.reload} />
            <CreatePaymentAccount onCreated={resource.reload} />
          </div>
        )}
      </WonFlowAsyncDataBoundary>
    </div>
  );
}
