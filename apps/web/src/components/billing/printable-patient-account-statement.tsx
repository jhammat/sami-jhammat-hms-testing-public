"use client";

import { useEffect } from "react";

import { usePatientLedger } from "@/lib/api/billing";

function minorToPkr(minor: number): string {
  return (minor / 100).toLocaleString("en-PK", { style: "currency", currency: "PKR" });
}

/** Renders strictly from the server ledger — nothing here is computed from a locally cached copy of billing history. */
export function PrintablePatientAccountStatement({ patientId }: { patientId: string }) {
  const ledger = usePatientLedger(patientId);

  useEffect(() => {
    if (ledger.status === "success") queueMicrotask(() => window.print());
  }, [ledger.status]);

  if (ledger.status === "loading") return <p className="p-6 text-sm text-slate-500">Loading statement…</p>;
  if (ledger.status === "error" || !ledger.data) return <p className="p-6 text-sm text-red-700">This statement could not be loaded.</p>;

  const { summary, invoices } = ledger.data;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-8 text-sm">
      <h1 className="text-xl font-black">Account statement</h1>
      <dl className="grid grid-cols-2 gap-2">
        <dt>Total billed</dt><dd>{minorToPkr(summary.totalBilledMinor)}</dd>
        <dt>Total paid</dt><dd>{minorToPkr(summary.totalPaidMinor)}</dd>
        <dt>Total refunded</dt><dd>{minorToPkr(summary.totalRefundedMinor)}</dd>
        <dt className="font-black">Outstanding</dt><dd className="font-black">{minorToPkr(summary.outstandingMinor)}</dd>
      </dl>
      <table className="w-full">
        <thead><tr className="text-left"><th>Invoice</th><th>Status</th><th className="text-right">Total</th><th className="text-right">Paid</th></tr></thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td>{invoice.invoiceNumber}</td>
              <td>{invoice.status}</td>
              <td className="text-right">{minorToPkr(invoice.totalMinor)}</td>
              <td className="text-right">{minorToPkr(invoice.paidMinor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
