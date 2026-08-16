"use client";

import { useMemo, useState } from "react";

import { useWonFlowSession } from "@/app/_providers";
import { BILLING_PAYMENT_METHODS, usePatientLedger, useRecordPayment } from "@/lib/api/billing";
import type { BillingPaymentMethod } from "@/lib/api/billing";

function minorToPkr(minor: number): string {
  return (minor / 100).toLocaleString("en-PK", { style: "currency", currency: "PKR" });
}

interface LedgerRow {
  id: string;
  occurredAt: string;
  reference: string;
  description: string;
  debitMinor: number;
  creditMinor: number;
}

function buildRows(ledger: NonNullable<ReturnType<typeof usePatientLedger>["data"]>): LedgerRow[] {
  const rows: LedgerRow[] = [];
  for (const invoice of ledger.invoices) {
    if (invoice.totalMinor > 0) rows.push({ id: `${invoice.id}-charge`, occurredAt: invoice.createdAt, reference: invoice.invoiceNumber, description: `Invoice ${invoice.invoiceNumber}`, debitMinor: invoice.totalMinor, creditMinor: 0 });
    for (const payment of invoice.payments) {
      if (payment.status === "COMPLETED") rows.push({ id: payment.id, occurredAt: payment.completedAt ?? payment.createdAt, reference: invoice.invoiceNumber, description: `Payment (${payment.method})`, debitMinor: 0, creditMinor: payment.amountMinor });
    }
    for (const refund of invoice.refunds) {
      if (refund.status === "COMPLETED") rows.push({ id: refund.id, occurredAt: refund.approvedAt ?? refund.requestedAt, reference: invoice.invoiceNumber, description: `Refund — ${refund.reason}`, debitMinor: refund.amountMinor, creditMinor: 0 });
    }
  }
  return rows.sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
}

export function PatientBillingLedger({ patientId }: { patientId: string }) {
  const session = useWonFlowSession();
  const ledger = usePatientLedger(patientId);
  const [invoiceId, setInvoiceId] = useState("");
  const [amountPkr, setAmountPkr] = useState("");
  const [method, setMethod] = useState<BillingPaymentMethod>("cash");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const recordPayment = useRecordPayment();

  const rows = useMemo(() => (ledger.data ? buildRows(ledger.data) : []), [ledger.data]);
  const runningRows = useMemo(() => rows.reduce<{ balance: number; rows: (LedgerRow & { balanceMinor: number })[] }>(
    (acc, row) => {
      const balance = acc.balance + row.debitMinor - row.creditMinor;
      return { balance, rows: [...acc.rows, { ...row, balanceMinor: balance }] };
    },
    { balance: 0, rows: [] },
  ).rows, [rows]);

  const outstandingInvoices = (ledger.data?.invoices ?? []).filter((invoice) => invoice.status === "ISSUED" || invoice.status === "PARTIALLY_PAID");

  async function submitPayment(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const amountMinor = Math.round(Number(amountPkr) * 100);
    if (!invoiceId) { setError("Choose an invoice to pay."); return; }
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) { setError("Enter a valid amount."); return; }
    try {
      await recordPayment.mutate({ invoiceId, method, amountMinor, reference: reference.trim() || undefined, reason: "Recorded from patient ledger" });
      setAmountPkr(""); setReference("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The payment could not be recorded.");
    }
  }

  if (ledger.status === "loading") return <p className="p-6 text-sm text-slate-500">Loading ledger…</p>;
  if (ledger.status === "error") return <p className="p-6 text-sm text-red-700">{ledger.error?.message}</p>;
  const summary = ledger.data?.summary;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="rounded-3xl bg-gradient-to-r from-slate-800 to-slate-700 p-6 text-white">
        <h1 className="text-2xl font-black">Patient billing ledger</h1>
      </header>

      {summary ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Total billed", summary.totalBilledMinor],
            ["Total paid", summary.totalPaidMinor],
            ["Refunds", summary.totalRefundedMinor],
            ["Outstanding", summary.outstandingMinor],
          ].map(([label, minor]) => (
            <div className="rounded-2xl border border-slate-200 bg-white p-4" key={label as string}>
              <p className="text-xs font-black uppercase text-slate-500">{label}</p>
              <p className="mt-1 text-lg font-black">{minorToPkr(minor as number)}</p>
            </div>
          ))}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-black">Transactions</h2>
        {runningRows.length ? (
          <table className="mt-3 w-full text-sm">
            <thead><tr className="text-left text-xs font-black uppercase text-slate-500"><th>Date</th><th>Reference</th><th>Description</th><th className="text-right">Debit</th><th className="text-right">Credit</th><th className="text-right">Balance</th></tr></thead>
            <tbody>
              {runningRows.map((row) => (
                <tr className="border-t border-slate-100" key={row.id}>
                  <td className="py-2">{new Date(row.occurredAt).toLocaleDateString("en-PK")}</td>
                  <td>{row.reference}</td>
                  <td>{row.description}</td>
                  <td className="text-right">{row.debitMinor ? minorToPkr(row.debitMinor) : ""}</td>
                  <td className="text-right">{row.creditMinor ? minorToPkr(row.creditMinor) : ""}</td>
                  <td className="text-right font-bold">{minorToPkr(row.balanceMinor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="mt-3 text-sm text-slate-500">No billing activity yet.</p>}
      </section>

      <form className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5" onSubmit={submitPayment}>
        <h2 className="text-lg font-black">Receive a payment</h2>
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div> : null}
        <label className="block text-xs font-bold">Outstanding invoice
          <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" onChange={(event) => setInvoiceId(event.target.value)} value={invoiceId}>
            <option value="">Select an invoice</option>
            {outstandingInvoices.map((invoice) => (
              <option key={invoice.id} value={invoice.id}>{invoice.invoiceNumber} — balance {minorToPkr(invoice.totalMinor - invoice.paidMinor)}</option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-bold">Amount (PKR)
            <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" min="0" onChange={(event) => setAmountPkr(event.target.value)} step="0.01" type="number" value={amountPkr} />
          </label>
          <label className="text-xs font-bold">Method
            <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" onChange={(event) => setMethod(event.target.value as BillingPaymentMethod)} value={method}>
              {BILLING_PAYMENT_METHODS.map((value) => <option key={value} value={value}>{value.replaceAll("-", " ")}</option>)}
            </select>
          </label>
        </div>
        <label className="block text-xs font-bold">Reference (optional)
          <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" onChange={(event) => setReference(event.target.value)} value={reference} />
        </label>
        <p className="text-xs font-bold text-slate-500">Collected by: {session?.name ?? "—"}</p>
        <button className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50" disabled={recordPayment.saveState === "saving"} type="submit">
          {recordPayment.saveState === "saving" ? "Recording…" : "Record payment"}
        </button>
      </form>
    </div>
  );
}
