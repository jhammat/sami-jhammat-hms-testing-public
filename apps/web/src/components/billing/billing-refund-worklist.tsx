"use client";

import { useMemo, useState } from "react";

import { useWonFlowSession } from "@/app/_providers";
import { useInvoice, useInvoices } from "@/lib/api/billing";
import { useRefunds, useRequestRefund, useApproveRefund, useRejectRefund, useCompleteRefund } from "@/lib/api/billing";
import type { RefundRecord, RefundStatus } from "@/lib/api/billing";

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

/**
 * Refunds are raised against an invoice the cashier picks from a list.
 *
 * This panel used to open with two text boxes labelled "Invoice ID" and
 * "Payment ID", each expecting a raw uuid typed by hand. Nobody at a counter
 * has those, and there was nowhere on the screen to find them — the refund
 * desk was effectively unusable without a database client open beside it.
 */
function RequestRefundPanel() {
  const [invoiceId, setInvoiceId] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [amountPkr, setAmountPkr] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  // Only a paid or part-paid invoice can be refunded; a draft has taken no
  // money, so listing it would only offer a dead end.
  const paidInvoices = useInvoices({ status: "PAID" });
  const partialInvoices = useInvoices({ status: "PARTIALLY_PAID" });

  const invoice = useInvoice(invoiceId);
  const requestRefund = useRequestRefund();

  const refundable = useMemo(() => {
    const all = [
      ...(paidInvoices.data?.invoices ?? []),
      ...(partialInvoices.data?.invoices ?? []),
    ].filter((candidate) => candidate.paidMinor > 0);

    const term = query.trim().toLowerCase();
    if (!term) return all.slice(0, 25);

    return all
      .filter((candidate) => candidate.invoiceNumber.toLowerCase().includes(term))
      .slice(0, 25);
  }, [paidInvoices.data, partialInvoices.data, query]);

  const selected = refundable.find((candidate) => candidate.id === invoiceId);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const amountMinor = Math.round(Number(amountPkr) * 100);
    if (!invoiceId || !paymentId) { setError("Enter the invoice and payment to refund against."); return; }
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) { setError("Enter a valid refund amount."); return; }
    if (!reason.trim()) { setError("A reason is required to request a refund."); return; }
    try {
      await requestRefund.mutate({ invoiceId, paymentId, amountMinor, reason: reason.trim() });
      setPaymentId(""); setAmountPkr(""); setReason(""); setInvoiceId(""); setQuery("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The refund could not be requested.");
    }
  }

  return (
    <form className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5" onSubmit={submit}>
      <h2 className="text-lg font-black">Request a refund</h2>
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div> : null}
      <label className="block text-xs font-bold">Find the invoice
        <input
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by invoice number"
          value={query}
        />
      </label>

      {refundable.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500">
          {paidInvoices.status === "loading" || partialInvoices.status === "loading"
            ? "Loading invoices…"
            : query.trim()
              ? "No paid invoice matches that number."
              : "No paid or part-paid invoice is available to refund."}
        </p>
      ) : (
        <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
          {refundable.map((candidate) => {
            const isSelected = candidate.id === invoiceId;

            return (
              <button
                className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-xs transition ${
                  isSelected
                    ? "border-indigo-400 bg-indigo-50"
                    : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"
                }`}
                key={candidate.id}
                onClick={() => {
                  setInvoiceId(candidate.id);
                  setPaymentId("");
                  setAmountPkr("");
                }}
                type="button"
              >
                <span className="min-w-0">
                  <span className="block truncate font-black text-slate-900">
                    {candidate.invoiceNumber}
                  </span>
                  <span className="block text-[10px] font-medium text-slate-500">
                    {minorToPkr(candidate.paidMinor)} collected of{" "}
                    {minorToPkr(candidate.totalMinor)}
                    {candidate.paidMinor < candidate.totalMinor ? " · part paid" : ""}
                  </span>
                </span>

                {isSelected ? (
                  <span className="shrink-0 rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] font-black uppercase text-white">
                    Selected
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
      {invoice.status === "success" && invoice.data?.invoice ? (
        <div className="rounded-xl bg-slate-50 p-3 text-xs">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Payments on {selected?.invoiceNumber ?? invoice.data.invoice.invoiceNumber}
          </p>
          <p className="font-bold">{invoice.data.invoice.invoiceNumber} · {invoice.data.invoice.status} · paid {minorToPkr(invoice.data.invoice.paidMinor)}</p>
          {(invoice.data.invoice.payments ?? []).map((payment) => (
            <button
              className={`mt-1 block w-full rounded-lg border px-2 py-1 text-left transition ${
                paymentId === payment.id
                  ? "border-indigo-400 bg-indigo-50 font-black"
                  : "border-slate-200 hover:bg-white"
              }`}
              key={payment.id}
              onClick={() => {
                setPaymentId(payment.id);
                // The full payment is the common case; the cashier can reduce
                // it for a partial refund rather than compute it from nothing.
                setAmountPkr((payment.amountMinor / 100).toFixed(2));
              }}
              type="button"
            >
              {payment.method} · {minorToPkr(payment.amountMinor)}
              {payment.reference ? ` · ${payment.reference}` : ""}
            </button>
          ))}
        </div>
      ) : null}
      {invoiceId && !paymentId ? (
        <p className="text-[11px] font-medium text-amber-700">
          Choose which payment to refund from the list above.
        </p>
      ) : null}
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

function RefundActionControls({ refund }: { refund: RefundRecord }) {
  const [action, setAction] = useState<"approve" | "reject" | "complete" | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const approve = useApproveRefund();
  const reject = useRejectRefund();
  const complete = useCompleteRefund();

  if (!action) {
    if (refund.status === "REQUESTED") {
      return (
        <div className="flex items-center gap-2">
          <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-700" onClick={() => { setAction("approve"); setReason(""); setError(""); }} type="button">Approve</button>
          <button className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-black text-white hover:bg-rose-700" onClick={() => { setAction("reject"); setReason(""); setError(""); }} type="button">Reject</button>
        </div>
      );
    }
    if (refund.status === "APPROVED") {
      return (
        <button className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-black text-white hover:bg-blue-700" onClick={() => { setAction("complete"); setReason(""); setError(""); }} type="button">
          Disburse Cash / Payout
        </button>
      );
    }
    return null;
  }

  const isSaving = approve.saveState === "saving" || reject.saveState === "saving" || complete.saveState === "saving";

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs">
      {error ? <p className="font-bold text-red-700">{error}</p> : null}
      <input
        className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
        onChange={(event) => setReason(event.target.value)}
        placeholder={action === "approve" ? "Approval reason" : action === "reject" ? "Rejection reason (required)" : "Disbursement note (optional)"}
        value={reason}
      />
      <div className="flex items-center gap-2">
        <button
          className={`rounded-lg px-3 py-1.5 font-black text-white disabled:opacity-50 ${action === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : action === "reject" ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"}`}
          disabled={isSaving}
          onClick={async () => {
            setError("");
            try {
              if (action === "approve") {
                if (!reason.trim()) { setError("A reason is required to approve a refund."); return; }
                await approve.mutate({ refundId: refund.id, reason: reason.trim() });
              } else if (action === "reject") {
                if (!reason.trim()) { setError("A reason is required to reject a refund."); return; }
                await reject.mutate({ refundId: refund.id, reason: reason.trim() });
              } else if (action === "complete") {
                await complete.mutate({ refundId: refund.id, reason: reason.trim() || undefined });
              }
              setAction(null);
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "The refund action failed.");
            }
          }}
          type="button"
        >
          {isSaving ? "Saving…" : action === "approve" ? "Confirm approval" : action === "reject" ? "Confirm rejection" : "Confirm disbursement"}
        </button>
        <button className="rounded-lg border border-slate-300 px-2 py-1 text-slate-600 hover:bg-slate-200" onClick={() => { setAction(null); setError(""); }} type="button">
          Cancel
        </button>
      </div>
    </div>
  );
}

export function BillingRefundWorklist({ initialReturnId }: { initialReturnId?: string } = {}) {
  const session = useWonFlowSession();
  const [status, setStatus] = useState<RefundStatus | "">("");
  const refunds = useRefunds({ status: status || undefined });

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Blue through violet, the same ramp every other operations header uses.
          A crimson-to-indigo bar read as an error state on a screen that is
          ordinary counter work, and was the only header in the product that
          did not belong to the palette. */}
      <header className="rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 p-6 text-white">
        <h1 className="text-2xl font-black">Refunds</h1>
        <p className="mt-1 text-sm text-indigo-100">
          Signed in as {session?.name ?? "—"} — approvals are always attributed to your session,
          never a typed name.
        </p>
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
                <RefundActionControls refund={refund} />
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
