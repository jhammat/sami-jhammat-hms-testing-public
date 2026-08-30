"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toLocalDate } from "@/lib/time/local-date";

function minorToPkr(minor: number): string {
  return (minor / 100).toLocaleString("en-PK", { style: "currency", currency: "PKR" });
}

function isoDate(date: Date): string {
  return toLocalDate(date);
}

interface DashboardData {
  from: string;
  to: string;
  organization: { id: string; displayName: string };
  branches: { id: string; name: string; code: string }[];
  summary: {
    patientCount: number;
    practitionerCount: number;
    appointmentTotal: number;
    appointmentCompleted: number;
    appointmentCompletionRate: number;
    queueTotal: number;
    queueCompleted: number;
    queueCompletionRate: number;
    billedMinor: number;
    collectedMinor: number;
    outstandingMinor: number;
    collectionRate: number;
    invoiceCount: number;
  };
  branchTable: { branchId: string; branchName: string; branchCode: string; appointmentTotal: number; appointmentCompleted: number; invoiceCount: number; billedMinor: number; collectedMinor: number; outstandingMinor: number }[];
}

/**
 * `href` is optional, and deliberately so.
 *
 * Every tile used to be a link. Two of them pointed somewhere a management
 * user cannot go: `/operations/team` is not a route at all (it 404s), and the
 * reception desk needs `patients.manage`, which this role does not hold. A
 * tile that looks clickable and answers with a 404 or a forbidden page is
 * worse than a tile that is plainly just a number, so the ones without a
 * reachable destination no longer pretend to have one.
 */
function KpiTile({ label, value, href }: { label: string; value: string; href?: string }) {
  const body = (
    <>
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
    </>
  );

  if (!href) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">{body}</div>;
  }

  return (
    <Link className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" href={href}>
      {body}
    </Link>
  );
}

/**
 * Every figure here comes from GET /api/v1/management/dashboard, which
 * aggregates server-side (Prisma groupBy/aggregate) for the selected date
 * range — nothing is fetched as raw rows and summed in the browser. Each
 * tile links through to the real, filtered list of records behind it.
 */
export function ManagementPortalDashboard() {
  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const [from, setFrom] = useState(isoDate(monthAgo));
  const [to, setTo] = useState(isoDate(today));
  const [branchId, setBranchId] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    queueMicrotask(() => {
      void (async () => {
        setLoading(true);
        setError("");
        const params = new URLSearchParams({ from: `${from}T00:00:00.000Z`, to: `${to}T23:59:59.999Z` });
        if (branchId) params.set("branchId", branchId);
        const response = await fetch(`/api/v1/management/dashboard?${params}`, { credentials: "same-origin", cache: "no-store" });
        const body = await response.json() as { dashboard?: DashboardData; error?: string };
        if (!response.ok || !body.dashboard) { setError(body.error ?? "The dashboard could not be loaded."); setLoading(false); return; }
        setData(body.dashboard);
        setLoading(false);
      })();
    });
  }, [from, to, branchId]);

  const rangeParams = `dateFrom=${from}&dateTo=${to}`;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="rounded-3xl bg-gradient-to-r from-indigo-800 to-slate-800 p-6 text-white">
        <h1 className="text-2xl font-black">Management dashboard</h1>
        <p className="mt-1 text-sm text-indigo-100">{data?.organization.displayName ?? "Your organization"} — figures below are your own organization only.</p>
      </header>

      <section className="flex flex-wrap items-end gap-3 rounded-3xl border border-slate-200 bg-white p-4">
        <label className="text-xs font-bold">From
          <input className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm" onChange={(e) => setFrom(e.target.value)} type="date" value={from} />
        </label>
        <label className="text-xs font-bold">To
          <input className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm" onChange={(e) => setTo(e.target.value)} type="date" value={to} />
        </label>
        <label className="text-xs font-bold">Branch
          <select className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm" onChange={(e) => setBranchId(e.target.value)} value={branchId}>
            <option value="">All branches</option>
            {(data?.branches ?? []).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </label>
      </section>

      {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">Loading…</p> : null}

      {data ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <KpiTile href={`/operations/patients`} label="Patients" value={String(data.summary.patientCount)} />
            <KpiTile href={`/operations/appointments?${rangeParams}`} label="Appointments" value={`${data.summary.appointmentCompleted}/${data.summary.appointmentTotal} (${data.summary.appointmentCompletionRate}%)`} />
            <KpiTile label="Queue completion" value={`${data.summary.queueCompleted}/${data.summary.queueTotal} (${data.summary.queueCompletionRate}%)`} />
            <KpiTile href={`/operations/billing?${rangeParams}`} label="Billed" value={minorToPkr(data.summary.billedMinor)} />
            <KpiTile href={`/operations/billing?${rangeParams}`} label="Collected" value={minorToPkr(data.summary.collectedMinor)} />
            <KpiTile href={`/operations/billing?${rangeParams}`} label="Outstanding" value={minorToPkr(data.summary.outstandingMinor)} />
            <KpiTile href={`/operations/billing?${rangeParams}`} label="Collection rate" value={`${data.summary.collectionRate}%`} />
            <KpiTile label="Practitioners" value={String(data.summary.practitionerCount)} />
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-black">Branch performance</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs font-black uppercase text-slate-500"><th className="py-2">Branch</th><th>Appointments</th><th>Invoices</th><th className="text-right">Billed</th><th className="text-right">Collected</th><th className="text-right">Outstanding</th></tr></thead>
                <tbody>
                  {data.branchTable.map((branch) => (
                    <tr className="border-t border-slate-100" key={branch.branchId}>
                      <td className="py-2 font-bold"><Link className="underline underline-offset-2" href={`/operations/appointments?branchId=${branch.branchId}&${rangeParams}`}>{branch.branchName}</Link></td>
                      <td>{branch.appointmentCompleted}/{branch.appointmentTotal}</td>
                      <td><Link className="underline underline-offset-2" href={`/operations/billing?branchId=${branch.branchId}&${rangeParams}`}>{branch.invoiceCount}</Link></td>
                      <td className="text-right">{minorToPkr(branch.billedMinor)}</td>
                      <td className="text-right">{minorToPkr(branch.collectedMinor)}</td>
                      <td className="text-right font-bold">{minorToPkr(branch.outstandingMinor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
