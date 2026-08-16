"use client";

import { useCallback, useMemo, useState } from "react";

import { useWonFlowSession } from "@/app/_providers";
import { usePatients } from "@/lib/api/patients";
import type { PatientRecord } from "@/lib/api/patients";
import {
  BILLING_PAYMENT_METHODS,
  updateInvoice,
  useCreateInvoice,
  useRecordPayment,
} from "@/lib/api/billing";
import type { BillingPaymentMethod, InvoiceRecord } from "@/lib/api/billing";

interface DraftLine {
  key: string;
  description: string;
  quantity: string;
  unitPricePkr: string;
}

function emptyLine(): DraftLine {
  return { key: crypto.randomUUID(), description: "", quantity: "1", unitPricePkr: "" };
}

function pkrToMinor(input: string): number {
  const value = Number(input);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

function minorToPkr(minor: number): string {
  return (minor / 100).toLocaleString("en-PK", { style: "currency", currency: "PKR" });
}

function lineTotalMinor(line: DraftLine): number {
  const quantity = Number(line.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  return Math.round(pkrToMinor(line.unitPricePkr) * quantity);
}

/**
 * The invoice number and the payment's collector are both server-assigned —
 * the invoice number comes back on the create response (never fabricated
 * here), and the payment is always attributed to the signed-in session,
 * shown read-only rather than typed into a field.
 */
export function BillingCounterWorkflow({ initialPatientId }: { initialPatientId?: string }) {
  const session = useWonFlowSession();
  const [patientQuery, setPatientQuery] = useState("");
  const [patientId, setPatientId] = useState(initialPatientId ?? "");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [discountPkr, setDiscountPkr] = useState("0");
  const [method, setMethod] = useState<BillingPaymentMethod>("cash");
  const [reference, setReference] = useState("");
  const [collectNow, setCollectNow] = useState(true);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{ invoice: InvoiceRecord; paidMinor: number } | null>(null);

  const patients = usePatients({ query: patientQuery, pageSize: 8 });
  const createInvoice = useCreateInvoice();
  const recordPayment = useRecordPayment();
  const [issuing, setIssuing] = useState(false);

  const selectedPatient: PatientRecord | undefined = patients.data?.patients.find((patient) => patient.id === patientId);

  const subtotalMinor = useMemo(() => lines.reduce((sum, line) => sum + lineTotalMinor(line), 0), [lines]);
  const discountMinor = Math.min(Math.max(0, pkrToMinor(discountPkr)), subtotalMinor);
  const totalMinor = subtotalMinor - discountMinor;

  const updateLine = useCallback((key: string, patch: Partial<DraftLine>) => {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }, []);

  const busy = createInvoice.saveState === "saving" || issuing || recordPayment.saveState === "saving";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!patientId) { setError("Choose a patient first."); return; }
    const validLines = lines.filter((line) => line.description.trim() && lineTotalMinor(line) > 0);
    if (!validLines.length) { setError("Add at least one billable line item."); return; }

    try {
      const { invoice } = await createInvoice.mutate({
        patientId,
        discountMinor,
        lines: validLines.map((line) => ({ description: line.description.trim(), quantity: Number(line.quantity), unitPriceMinor: pkrToMinor(line.unitPricePkr) })),
      });

      setIssuing(true);
      const issued = await updateInvoice(invoice.id, { status: "ISSUED", reason: "Issued at billing counter" });
      setIssuing(false);

      let paidMinor = 0;
      if (collectNow && issued.invoice.totalMinor > 0) {
        await recordPayment.mutate({ invoiceId: invoice.id, method, amountMinor: issued.invoice.totalMinor, reference: reference.trim() || undefined, reason: "Collected at billing counter" });
        paidMinor = issued.invoice.totalMinor;
      }

      setReceipt({ invoice: issued.invoice, paidMinor });
      setLines([emptyLine()]);
      setDiscountPkr("0");
      setReference("");
    } catch (cause) {
      setIssuing(false);
      setError(cause instanceof Error ? cause.message : "The invoice could not be created.");
    }
  }

  function printReceipt() {
    if (!receipt) return;
    const popup = window.open("", "_blank", "width=420,height=640");
    if (!popup) return;
    const lineRows = receipt.invoice.lines.map((line) => `<tr><td>${line.description}</td><td style="text-align:right">${line.quantity}</td><td style="text-align:right">${minorToPkr(line.unitPriceMinor)}</td><td style="text-align:right">${minorToPkr(line.totalMinor)}</td></tr>`).join("");
    popup.document.write(`<html><head><title>${receipt.invoice.invoiceNumber}</title></head><body style="font-family:sans-serif;padding:16px">
      <h2>Invoice ${receipt.invoice.invoiceNumber}</h2>
      <p>Status: ${receipt.invoice.status}</p>
      <table width="100%" cellpadding="4"><thead><tr><th align="left">Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${lineRows}</tbody></table>
      <p>Subtotal: ${minorToPkr(receipt.invoice.subtotalMinor)}</p>
      <p>Discount: ${minorToPkr(receipt.invoice.discountMinor)}</p>
      <p><strong>Total: ${minorToPkr(receipt.invoice.totalMinor)}</strong></p>
      <p>Paid: ${minorToPkr(receipt.invoice.paidMinor)}</p>
      <p>Balance: ${minorToPkr(receipt.invoice.totalMinor - receipt.invoice.paidMinor)}</p>
      <p>Collected by: ${session?.name ?? "—"}</p>
    </body></html>`);
    popup.document.close();
    popup.print();
  }

  if (receipt) {
    return (
      <div className="mx-auto max-w-xl space-y-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="text-xl font-black text-slate-900">Invoice {receipt.invoice.invoiceNumber}</h2>
        <p className="text-sm text-slate-600">Status: {receipt.invoice.status} · Total {minorToPkr(receipt.invoice.totalMinor)} · Paid {minorToPkr(receipt.invoice.paidMinor)}</p>
        <p className="text-sm text-slate-600">Collected by: <span className="font-bold">{session?.name ?? "—"}</span></p>
        <div className="flex gap-3">
          <button className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-black text-white" onClick={printReceipt} type="button">Print receipt</button>
          <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold" onClick={() => setReceipt(null)} type="button">New invoice</button>
        </div>
      </div>
    );
  }

  return (
    <form className="mx-auto max-w-3xl space-y-5" onSubmit={submit}>
      <header className="rounded-3xl bg-gradient-to-r from-indigo-700 to-blue-700 p-6 text-white">
        <h1 className="text-2xl font-black">Billing counter</h1>
        <p className="mt-1 text-sm text-indigo-100">Create an invoice and collect payment. Invoice numbers are assigned by the server.</p>
      </header>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div> : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <label className="text-xs font-bold">Patient
          <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" onChange={(event) => setPatientQuery(event.target.value)} placeholder="Search by name or MR number" value={patientQuery} />
        </label>
        {patients.data?.patients.length ? (
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
            {patients.data.patients.map((patient) => (
              <li key={patient.id}>
                <button className={`w-full rounded-lg px-3 py-2 text-left text-sm ${patientId === patient.id ? "bg-indigo-100 font-bold" : "hover:bg-slate-50"}`} onClick={() => setPatientId(patient.id)} type="button">
                  {patient.givenName} {patient.familyName} · {patient.patientNumber}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {selectedPatient ? <p className="mt-2 text-sm font-bold text-emerald-700">Billing: {selectedPatient.givenName} {selectedPatient.familyName} ({selectedPatient.patientNumber})</p> : null}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-black">Line items</h2>
        <div className="mt-3 space-y-2">
          {lines.map((line) => (
            <div className="grid grid-cols-12 gap-2" key={line.key}>
              <input className="col-span-6 rounded-xl border border-slate-200 px-3 py-2 text-sm" onChange={(event) => updateLine(line.key, { description: event.target.value })} placeholder="Description" value={line.description} />
              <input className="col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-sm" min="0.01" onChange={(event) => updateLine(line.key, { quantity: event.target.value })} step="0.01" type="number" value={line.quantity} />
              <input className="col-span-3 rounded-xl border border-slate-200 px-3 py-2 text-sm" min="0" onChange={(event) => updateLine(line.key, { unitPricePkr: event.target.value })} placeholder="Unit price (PKR)" step="0.01" type="number" value={line.unitPricePkr} />
              <button className="col-span-1 rounded-xl border border-red-200 text-sm font-bold text-red-600" onClick={() => setLines((current) => current.filter((x) => x.key !== line.key))} type="button">✕</button>
            </div>
          ))}
        </div>
        <button className="mt-3 rounded-xl border border-indigo-200 px-3 py-1.5 text-sm font-bold text-indigo-700" onClick={() => setLines((current) => [...current, emptyLine()])} type="button">+ Add line</button>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 space-y-3">
        <label className="block text-xs font-bold">Discount (PKR)
          <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" min="0" onChange={(event) => setDiscountPkr(event.target.value)} step="0.01" type="number" value={discountPkr} />
        </label>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input checked={collectNow} onChange={(event) => setCollectNow(event.target.checked)} type="checkbox" />
          Collect payment now
        </label>
        {collectNow ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold">Method
              <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" onChange={(event) => setMethod(event.target.value as BillingPaymentMethod)} value={method}>
                {BILLING_PAYMENT_METHODS.map((value) => <option key={value} value={value}>{value.replaceAll("-", " ")}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold">Reference (optional)
              <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" onChange={(event) => setReference(event.target.value)} value={reference} />
            </label>
          </div>
        ) : null}
        <p className="text-sm font-bold text-slate-500">Collected by: {session?.name ?? "—"}</p>
        <dl className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-sm">
          <dt>Subtotal</dt><dd className="text-right">{minorToPkr(subtotalMinor)}</dd>
          <dt>Discount</dt><dd className="text-right">{minorToPkr(discountMinor)}</dd>
          <dt className="font-black">Total</dt><dd className="text-right font-black">{minorToPkr(totalMinor)}</dd>
        </dl>
      </section>

      <button className="w-full rounded-xl bg-indigo-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50" disabled={busy} type="submit">
        {busy ? "Processing…" : collectNow ? "Create invoice and collect payment" : "Create invoice"}
      </button>
    </form>
  );
}
