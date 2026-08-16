"use client";

import { useState } from "react";

import { useWonFlowSession } from "@/app/_providers";
import { useInvoice } from "@/lib/api/billing";
import { useRefunds, useRequestRefund, useApproveRefund } from "@/lib/api/billing";
import type { RefundStatus } from "@/lib/api/billing";

function minorToPkr(minor: number): string {
  return (minor / 100).toLocaleString("en-PK", { style: "currency", currency: "PKR" });
}

const STATUS_TONE: Record<RefundStatus, string> = {
  REQUESTED: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  COMPLETED: "bg-blue-50 text-blue-700 border-blue-200",
  CANCELLED: "bg-slate-100 text-slate-500 border-slate-200",
};

function RequestRefundPanel() {
  const [invoiceId, setInvoiceId] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [amountPkr, setAmountPkr] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const invoice = useInvoice(invoiceId);
  const requestRefund = useRequestRefund();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const amountMinor = Math.round(Number(amountPkr) * 100);
    if (!invoiceId || !paymentId) { setError("Enter the invoice and payment to refund against."); return; }
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) { setError("Enter a valid refund amount."); return; }
    if (!reason.trim()) { setError("A reason is required to request a refund."); return; }
    try {
      await requestRefund.mutate({ invoiceId, paymentId, amountMinor, reason: reason.trim() });
      setPaymentId(""); setAmountPkr(""); setReason("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The refund could not be requested.");
    }
  }

  return (
    <form className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5" onSubmit={submit}>
      <h2 className="text-lg font-black">Request a refund</h2>
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div> : null}
      <label className="block text-xs font-bold">Invoice ID
        <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" onChange={(event) => setInvoiceId(event.target.value.trim())} value={invoiceId} />
      </label>
      {invoice.status === "success" && invoice.data?.invoice ? (
        <div className="rounded-xl bg-slate-50 p-3 text-xs">
          <p className="font-bold">{invoice.data.invoice.invoiceNumber} · {invoice.data.invoice.status} · paid {minorToPkr(invoice.data.invoice.paidMinor)}</p>
          {(invoice.data.invoice.payments ?? []).map((payment) => (
            <button className="mt-1 block w-full rounded-lg border border-slate-200 px-2 py-1 text-left hover:bg-white" key={payment.id} onClick={() => setPaymentId(payment.id)} type="button">
              Payment {payment.id.slice(0, 8)} · {payment.method} · {minorToPkr(payment.amountMinor)}
            </button>
          ))}
        </div>
      ) : null}
      <label className="block text-xs font-bold">Payment ID
        <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" onChange={(event) => setPaymentId(event.target.value.trim())} value={paymentId} />
      </label>
      <label className="block text-xs font-bold">Amount (PKR)
        <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" min="0" onChange={(event) => setAmountPkr(event.target.value)} step="0.01" type="number" value={amountPkr} />
      </label>
      <label className="block text-xs font-bold">Reason
        <textarea className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" onChange={(event) => setReason(event.target.value)} rows={2} value={reason} />
      </label>
      <button className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50" disabled={requestRefund.saveState === "saving"} type="submit">
        {requestRefund.saveState === "saving" ? "Requesting…" : "Request refund"}
      </button>
    </form>
  );
}

function ApproveRow({ refundId }: { refundId: string }) {
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const approve = useApproveRefund();
  const [error, setError] = useState("");

  if (!open) {
    return <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-black text-white" onClick={() => setOpen(true)} type="button">Approve</button>;
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2">
      {error ? <p className="text-xs font-bold text-red-700">{error}</p> : null}
      <input className="rounded-lg border border-slate-200 px-2 py-1 text-xs" onChange={(event) => setReason(event.target.value)} placeholder="Approval reason" value={reason} />
      <button
        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50"
        disabled={approve.saveState === "saving"}
        onClick={async () => {
          setError("");
          if (!reason.trim()) { setError("A reason is required to approve a refund."); return; }
          try { await approve.mutate({ refundId, reason: reason.trim() }); } catch (cause) { setError(cause instanceof Error ? cause.message : "The refund could not be approved."); }
        }}
        type="button"
      >
        Confirm approval
      </button>
    </div>
  );
}

export function BillingRefundWorklist({ initialReturnId }: { initialReturnId?: string } = {}) {
  const session = useWonFlowSession();
  const [status, setStatus] = useState<RefundStatus | "">("");
  const refunds = useRefunds({ status: status || undefined });

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="rounded-3xl bg-gradient-to-r from-rose-700 to-indigo-700 p-6 text-white">
        <h1 className="text-2xl font-black">Refunds</h1>
        <p className="mt-1 text-sm text-rose-100">Signed in as {session?.name ?? "—"} — approvals are always attributed to your session, never a typed name.</p>
      </header>

      <RequestRefundPanel />

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black">Refund requests</h2>
          <select className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm" onChange={(event) => setStatus(event.target.value as RefundStatus | "")} value={status}>
            <option value="">All statuses</option>
            <option value="REQUESTED">Requested</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
        {refunds.status === "loading" ? <p className="mt-4 text-sm text-slate-500">Loading…</p> : null}
        {refunds.status === "empty" ? <p className="mt-4 text-sm text-slate-500">No refund requests.</p> : null}
        {refunds.status === "error" ? <p className="mt-4 text-sm text-red-700">{refunds.error?.message}</p> : null}
        {refunds.data?.refunds.length ? (
          <div className="mt-4 space-y-2">
            {refunds.data.refunds.map((refund) => (
              <article className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${refund.id === initialReturnId ? "border-indigo-400 ring-2 ring-indigo-100" : "border-slate-100"}`} key={refund.id}>
                <div>
                  <p className="text-sm font-black">{minorToPkr(refund.amountMinor)}</p>
                  <p className="text-xs text-slate-500">{refund.reason}</p>
                  <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[11px] font-black ${STATUS_TONE[refund.status]}`}>{refund.status}</span>
                </div>
                {refund.status === "REQUESTED" ? <ApproveRow refundId={refund.id} /> : null}
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
