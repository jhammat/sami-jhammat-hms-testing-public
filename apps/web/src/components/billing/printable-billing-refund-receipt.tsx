"use client";

import { useEffect } from "react";

import { useRefunds } from "@/lib/api/billing";

function minorToPkr(minor: number): string {
  return (minor / 100).toLocaleString("en-PK", { style: "currency", currency: "PKR" });
}

/** Renders strictly from the server refund record — the amount, reason and approver shown here are never client-computed. */
export function PrintableBillingRefundReceipt({ refundId }: { refundId: string }) {
  const refunds = useRefunds();
  const refund = refunds.data?.refunds.find((candidate) => candidate.id === refundId);

  useEffect(() => {
    if (refund) queueMicrotask(() => window.print());
  }, [refund]);

  if (refunds.status === "loading") return <p className="p-6 text-sm text-slate-500">Loading receipt…</p>;
  if (!refund) return <p className="p-6 text-sm text-red-700">This refund could not be found.</p>;

  return (
    <div className="mx-auto max-w-md space-y-3 p-8 text-sm">
      <h1 className="text-xl font-black">Refund receipt</h1>
      <p>Refund ID: {refund.id}</p>
      <p>Amount: <strong>{minorToPkr(refund.amountMinor)}</strong></p>
      <p>Status: {refund.status}</p>
      <p>Reason: {refund.reason}</p>
      <p>Requested: {new Date(refund.requestedAt).toLocaleString("en-PK")}</p>
      {refund.approvedAt ? <p>Approved: {new Date(refund.approvedAt).toLocaleString("en-PK")}</p> : null}
    </div>
  );
}
