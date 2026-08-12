"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Building2,
  CalendarDays,
  Clock3,
  FileText,
  LayoutGrid,
  MapPin,
  RefreshCw,
  Search,
  Settings2,
  Stethoscope,
  TrendingUp,
  UserRoundCog,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

import { WonFlowAsyncDataBoundary, WonFlowEmptyState } from "@/components/feedback";
import {
  formatWonFlowDashboardMoney,
  formatWonFlowDashboardPercentage,
} from "@/lib/dashboard/formatters";
import { useWonFlowOrganizationDashboard } from "@/lib/dashboard/live-organization-hook";
import type {
  WonFlowLiveBranchDashboardSummary,
  WonFlowLiveOrganizationDashboardProjection,
} from "@/lib/dashboard/types";

type BranchSortMetric = "activity" | "practitioners" | "outstanding";

const QUICK_ACTIONS = [
  { href: "/admin/team", label: "Team & access", description: "Invite staff and control permissions", icon: UserRoundCog, tone: "from-indigo-600 to-violet-600" },
  { href: "/admin/locations", label: "Branches", description: "Manage locations and schedules", icon: MapPin, tone: "from-cyan-500 to-indigo-600" },
  { href: "/admin/services", label: "Services & fees", description: "Configure care services and pricing", icon: Stethoscope, tone: "from-violet-600 to-fuchsia-600" },
  { href: "/admin/policies", label: "Policies", description: "Review consent and hospital content", icon: FileText, tone: "from-sky-600 to-indigo-600" },
] as const;

function calculateCollectionRate(paidMinorUnits: number, billedMinorUnits: number): number {
  return billedMinorUnits === 0 ? 0 : Number(((paidMinorUnits / billedMinorUnits) * 100).toFixed(1));
}

function calculateActivity(branch: WonFlowLiveBranchDashboardSummary): number {
  return branch.todayAppointmentCount + branch.liveQueueCount + branch.practitionerCount;
}

function clampPercentage(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function initials(value: string): string {
  return value.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

/**
 * Matches the doctor portal's cyan → indigo → violet family so both portals
 * read as one product. `amber` is the only warm tone and is reserved for the
 * queue, the metric that is meant to pull the eye.
 */
type ToneName = "indigo" | "violet" | "cyan" | "sky" | "amber" | "fuchsia";

const TONES: Record<ToneName, { chip: string; accent: string; aura: string; icon: string }> = {
  indigo: { chip: "bg-indigo-50 text-indigo-700 ring-indigo-100", accent: "from-indigo-500 to-violet-500", aura: "from-indigo-500/25", icon: "from-indigo-600 to-violet-600" },
  violet: { chip: "bg-violet-50 text-violet-700 ring-violet-100", accent: "from-violet-500 to-fuchsia-500", aura: "from-violet-500/25", icon: "from-violet-600 to-fuchsia-600" },
  cyan: { chip: "bg-cyan-50 text-cyan-700 ring-cyan-100", accent: "from-cyan-400 to-indigo-500", aura: "from-cyan-400/25", icon: "from-cyan-500 to-indigo-600" },
  sky: { chip: "bg-sky-50 text-sky-700 ring-sky-100", accent: "from-sky-500 to-indigo-500", aura: "from-sky-500/25", icon: "from-sky-600 to-indigo-600" },
  amber: { chip: "bg-amber-50 text-amber-700 ring-amber-100", accent: "from-amber-500 to-orange-500", aura: "from-amber-500/25", icon: "from-amber-500 to-orange-600" },
  fuchsia: { chip: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100", accent: "from-fuchsia-500 to-violet-500", aura: "from-fuchsia-500/25", icon: "from-fuchsia-600 to-violet-600" },
};

function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  detail: string;
  icon: typeof Users;
  tone: ToneName;
}) {
  const palette = TONES[tone];
  // A wall of zeros is the honest state for a new hospital; dim it so it reads
  // as "nothing yet" rather than as a broken figure.
  const isZero = value === 0 || value === "0";

  return (
    <article className="wf-admin-kpi group relative isolate overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_25px_rgba(15,23,42,0.045)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.1)]">
      <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${palette.accent}`} />
      <span aria-hidden="true" className={`absolute -right-12 -top-14 h-32 w-32 rounded-full bg-gradient-to-br ${palette.aura} to-transparent blur-2xl transition-transform duration-500 group-hover:scale-125`} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className={`mt-2 text-3xl font-bold tracking-[-0.05em] tabular-nums ${isZero ? "text-slate-300" : "text-slate-950"}`}>{value}</p>
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ring-1 transition group-hover:scale-105 ${palette.chip}`}>
          <Icon aria-hidden="true" size={20} strokeWidth={1.9} />
        </span>
      </div>
      <p className="relative mt-2 truncate text-[11px] text-slate-500">{detail}</p>
    </article>
  );
}

function Panel({
  title,
  description,
  action,
  icon: Icon,
  tone = "indigo",
  children,
  className = "",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: typeof Users;
  tone?: ToneName;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`wf-admin-panel overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.05)] transition duration-300 hover:shadow-[0_18px_46px_rgba(15,23,42,0.08)] ${className}`}>
      <header className="flex items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-transparent px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          {Icon ? <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm ${TONES[tone].icon}`}><Icon aria-hidden="true" size={17} strokeWidth={2} /></span> : null}
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-950">{title}</h2>
            {description ? <p className="mt-0.5 truncate text-[11px] text-slate-500">{description}</p> : null}
          </div>
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function OperationalActivityChart({ branches }: { branches: WonFlowLiveBranchDashboardSummary[] }) {
  const values = branches.flatMap((branch) => [branch.todayAppointmentCount, branch.liveQueueCount, branch.practitionerCount]);
  const maxValue = Math.max(1, ...values);

  if (branches.length === 0) {
    return <WonFlowEmptyState title="No branch activity" description="Operational activity appears after branches begin serving patients." />;
  }
  // Every metric at zero would otherwise draw an axis with invisible bars.
  if (values.every((value) => value === 0)) {
    return <WonFlowEmptyState title="No activity recorded today" description="Appointments, queue entries and assigned practitioners will chart here as the day runs." />;
  }

  const gridLines = [1, 0.75, 0.5, 0.25, 0];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-4 text-[10px] font-semibold text-slate-500">
        <ChartLegend color="bg-sky-500" label="Appointments" />
        <ChartLegend color="bg-amber-500" label="Live queue" />
        <ChartLegend color="bg-violet-500" label="Practitioners" />
      </div>
      <div className="wf-content-scroll pb-1">
        <div className="relative min-w-[460px] pl-8">
          <div aria-hidden="true" className="absolute inset-y-0 left-0 right-0">
            {gridLines.map((fraction) => (
              <div className="absolute left-0 right-0 flex items-center gap-2" key={fraction} style={{ top: `${(1 - fraction) * 176}px` }}>
                <span className="w-6 shrink-0 text-right text-[9px] font-semibold tabular-nums text-slate-400">{Math.round(maxValue * fraction)}</span>
                <span className="h-px flex-1 bg-slate-100" />
              </div>
            ))}
          </div>
          <div className="relative flex min-h-56 items-end gap-4 border-b border-slate-200 px-2" role="img" aria-label="Appointments, live queue and practitioners by hospital branch">
            {branches.map((branch) => (
              <div className="flex min-w-24 flex-1 flex-col items-center" key={branch.branch.id}>
                <div className="flex h-44 w-full items-end justify-center gap-2">
                  {[
                    [branch.todayAppointmentCount, "bg-gradient-to-t from-sky-600 to-sky-400 shadow-[0_-2px_12px_rgba(2,132,199,0.35)]"],
                    [branch.liveQueueCount, "bg-gradient-to-t from-amber-500 to-amber-300 shadow-[0_-2px_12px_rgba(245,158,11,0.35)]"],
                    [branch.practitionerCount, "bg-gradient-to-t from-violet-600 to-violet-400 shadow-[0_-2px_12px_rgba(124,58,237,0.35)]"],
                  ].map(([value, color], index) => (
                    <div className="group/bar relative flex h-full flex-1 items-end" key={index}>
                      <div className={`w-full rounded-t-lg transition-all duration-700 ease-out ${Number(value) === 0 ? "bg-slate-100" : color}`} style={{ height: `${Math.max(Number(value) === 0 ? 2 : 8, (Number(value) / maxValue) * 100)}%` }} />
                      <span className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full rounded-md bg-slate-950 px-1.5 py-1 text-[9px] font-bold text-white opacity-0 shadow-lg transition group-hover/bar:opacity-100">{value}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 w-full truncate text-center text-[10px] font-semibold text-slate-600" title={branch.branch.name}>{branch.branch.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartLegend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm ${color}`} />{label}</span>;
}

function RevenueRing({ projection, collectionRate }: { projection: WonFlowLiveOrganizationDashboardProjection; collectionRate: number }) {
  const circumference = 2 * Math.PI * 46;
  const progress = circumference * (clampPercentage(collectionRate) / 100);

  return (
    <div className="grid gap-5 sm:grid-cols-[150px_1fr] sm:items-center xl:grid-cols-1">
      <div className="relative mx-auto h-36 w-36">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 112 112" role="img" aria-label={`${collectionRate}% billing collection rate`}>
          <circle className="stroke-slate-100" cx="56" cy="56" fill="none" r="46" strokeWidth="10" />
          <circle cx="56" cy="56" fill="none" r="46" stroke="url(#revenue-gradient)" strokeDasharray={`${progress} ${circumference - progress}`} strokeLinecap="round" strokeWidth="10" />
          <defs><linearGradient id="revenue-gradient"><stop stopColor="#4f46e5" /><stop offset="1" stopColor="#7c3aed" /></linearGradient></defs>
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div><p className="bg-gradient-to-r from-indigo-700 to-violet-700 bg-clip-text text-3xl font-bold tracking-tight text-transparent">{formatWonFlowDashboardPercentage(collectionRate)}</p><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">collected</p></div>
        </div>
      </div>
      <div className="space-y-2.5">
        <FinancialItem label="Billed" value={formatWonFlowDashboardMoney(projection.financial.totalBilledMinorUnits, projection.financial.currencyCode)} tone="text-slate-900" />
        <FinancialItem label="Collected" value={formatWonFlowDashboardMoney(projection.financial.totalPaidMinorUnits, projection.financial.currencyCode)} tone="text-emerald-700" />
        <FinancialItem label="Outstanding" value={formatWonFlowDashboardMoney(projection.financial.outstandingMinorUnits, projection.financial.currencyCode)} tone="text-rose-700" />
      </div>
    </div>
  );
}

function FinancialItem({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 transition hover:bg-slate-100"><span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span><strong className={`text-xs tabular-nums ${tone}`}>{value}</strong></div>;
}

function PractitionerDistribution({ branches }: { branches: WonFlowLiveBranchDashboardSummary[] }) {
  const maximum = Math.max(1, ...branches.map((branch) => branch.practitionerCount));

  if (branches.length === 0) {
    return <WonFlowEmptyState title="No branches configured" description="Add a branch before assigning clinical staff." />;
  }

  return (
    <div className="space-y-4">
      {branches.slice(0, 6).map((branch, index) => (
        <div key={branch.branch.id}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px]">
            <span className="flex min-w-0 items-center gap-2"><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[9px] font-bold text-white ${index % 2 === 0 ? "bg-gradient-to-br from-indigo-600 to-violet-500" : "bg-gradient-to-br from-cyan-500 to-indigo-500"}`}>{initials(branch.branch.name)}</span><span className="truncate font-semibold text-slate-700">{branch.branch.name}</span></span>
            <span className="font-bold tabular-nums text-slate-950">{branch.practitionerCount.toLocaleString()}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r ${index % 2 === 0 ? "from-indigo-600 to-violet-400" : "from-cyan-500 to-indigo-400"}`} style={{ width: `${branch.practitionerCount === 0 ? 0 : Math.max(4, (branch.practitionerCount / maximum) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function QuickActions() {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
      {QUICK_ACTIONS.map(({ href, label, description, icon: Icon, tone }) => (
        <Link className="wf-admin-quick-action group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/50 hover:shadow-md" href={href} key={href}>
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm transition group-hover:scale-110 ${tone}`}><Icon aria-hidden="true" size={18} /></span>
          <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-slate-950">{label}</span><span className="mt-0.5 block truncate text-[10px] text-slate-500">{description}</span></span>
          <ArrowRight aria-hidden="true" className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-600" size={16} />
        </Link>
      ))}
    </div>
  );
}

function AttentionList({ projection }: { projection: WonFlowLiveOrganizationDashboardProjection }) {
  const queue = [...projection.branchSummaries].sort((a, b) => b.liveQueueCount - a.liveQueueCount)[0];
  const appointments = [...projection.branchSummaries].sort((a, b) => b.todayAppointmentCount - a.todayAppointmentCount)[0];
  const outstanding = [...projection.branchSummaries].sort((a, b) => b.outstandingInvoiceMinorUnits - a.outstandingInvoiceMinorUnits)[0];
  const hasAttention = Boolean(
    (queue?.liveQueueCount ?? 0) > 0 ||
    (appointments?.todayAppointmentCount ?? 0) > 0 ||
    (outstanding?.outstandingInvoiceMinorUnits ?? 0) > 0,
  );

  if (!hasAttention) {
    return <WonFlowEmptyState title="Nothing needs attention" description="Live operational alerts will appear here as hospital activity is recorded." />;
  }

  const items = [
    { label: "Busiest queue", branch: queue, value: `${queue?.liveQueueCount ?? 0} waiting`, color: "bg-amber-500", wash: "bg-amber-50/60" },
    { label: "Most appointments", branch: appointments, value: `${appointments?.todayAppointmentCount ?? 0} today`, color: "bg-sky-500", wash: "bg-sky-50/60" },
    { label: "Highest receivable", branch: outstanding, value: outstanding ? formatWonFlowDashboardMoney(outstanding.outstandingInvoiceMinorUnits, projection.financial.currencyCode) : "—", color: "bg-violet-600", wash: "bg-violet-50/60" },
  ];
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:brightness-[0.98] ${item.wash}`} key={item.label}>
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white/70 ${item.color}`} />
          <div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</p><p className="mt-0.5 truncate text-xs font-bold text-slate-800">{item.branch?.branch.name ?? "No branch"}</p></div>
          <strong className="text-[11px] tabular-nums text-slate-700">{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function BranchTable({
  branches,
  currencyCode,
}: {
  branches: WonFlowLiveBranchDashboardSummary[];
  currencyCode: string;
}) {
  return (
    <div className="wf-content-scroll">
      <table className="w-full min-w-[760px] text-left">
        <thead><tr className="border-b border-slate-200 text-[9px] uppercase tracking-[0.12em] text-slate-400"><th className="pb-3 font-bold">Branch</th><th className="pb-3 text-right font-bold">Doctors</th><th className="pb-3 text-right font-bold">Appointments</th><th className="pb-3 text-right font-bold">Queue</th><th className="pb-3 text-right font-bold">Open invoices</th><th className="pb-3 text-right font-bold">Outstanding</th></tr></thead>
        <tbody>
          {branches.map((branch) => (
            <tr className="wf-admin-table-row border-b border-slate-100 transition last:border-0 hover:bg-indigo-50/50" key={branch.branch.id}>
              <td className="py-3"><div className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-[10px] font-bold text-white">{initials(branch.branch.name)}</span><span className="max-w-48 truncate text-xs font-bold text-slate-900">{branch.branch.name}</span></div></td>
              <MetricCell value={branch.practitionerCount} />
              <MetricCell value={branch.todayAppointmentCount} tone="text-sky-700" />
              <MetricCell value={branch.liveQueueCount} tone="text-amber-700" />
              <MetricCell value={branch.openInvoiceCount} tone="text-violet-700" />
              <td className="py-3 text-right text-[11px] font-bold text-rose-700">{formatWonFlowDashboardMoney(branch.outstandingInvoiceMinorUnits, currencyCode)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetricCell({ value, tone = "text-slate-700" }: { value: number; tone?: string }) {
  return <td className={`py-3 text-right text-xs font-semibold ${tone}`}>{value.toLocaleString()}</td>;
}

function OrganizationDashboardContent({
  projection,
  onRefresh,
  refreshing,
}: {
  projection: WonFlowLiveOrganizationDashboardProjection;
  onRefresh(): void;
  refreshing: boolean;
}) {
  const [searchText, setSearchText] = useState("");
  const [sortMetric, setSortMetric] = useState<BranchSortMetric>("activity");
  const normalizedSearch = searchText.trim().toLocaleLowerCase();
  const collectionRate = calculateCollectionRate(projection.financial.totalPaidMinorUnits, projection.financial.totalBilledMinorUnits);
  const today = new Intl.DateTimeFormat("en-PK", { weekday: "long", day: "numeric", month: "long", timeZone: projection.source.timezone }).format(new Date(projection.source.generatedAt));

  const filteredBranches = useMemo(() => {
    const matching = projection.branchSummaries.filter((summary) => normalizedSearch === "" || summary.branch.name.toLocaleLowerCase().includes(normalizedSearch));
    return [...matching].sort((left, right) => {
      if (sortMetric === "practitioners") return right.practitionerCount - left.practitionerCount;
      if (sortMetric === "outstanding") return right.outstandingInvoiceMinorUnits - left.outstandingInvoiceMinorUnits;
      return calculateActivity(right) - calculateActivity(left);
    });
  }, [normalizedSearch, projection.branchSummaries, sortMetric]);

  return (
    <div className="space-y-4" id="main-content">
      {/* Mirrors the doctor portal header (`DoctorPageHeader`) so both portals
          read as one product: light cyan → white → violet card, indigo rail. */}
      <header className="relative overflow-hidden rounded-[24px] border border-indigo-200/80 bg-gradient-to-br from-cyan-50 via-white to-violet-100 text-slate-950 shadow-[0_22px_55px_rgba(79,70,229,0.16)]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-cyan-400 via-indigo-500 to-violet-600" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full bg-cyan-300/35 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 right-8 h-72 w-72 rounded-full bg-violet-400/35 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute right-32 top-5 h-24 w-24 rounded-full border border-indigo-200/60 bg-white/20" />

        <div className="relative flex flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-[0.18em] text-indigo-600">Hospital Administration · Today</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-emerald-700"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />Live database</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20"><Building2 aria-hidden="true" size={18} /></span>
              <h1 className="min-w-0 truncate text-2xl font-black tracking-[-0.03em] text-slate-950 sm:text-3xl">{projection.organization.name}</h1>
            </div>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">A focused view of today’s patient flow, clinical capacity and financial position across the hospital network.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/80 bg-white/70 px-3 py-1.5 text-[10px] font-bold text-slate-700"><MapPin aria-hidden="true" className="text-indigo-600" size={13} />{projection.totals.activeBranches} active {projection.totals.activeBranches === 1 ? "branch" : "branches"}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/80 bg-white/70 px-3 py-1.5 text-[10px] font-bold text-slate-700"><CalendarDays aria-hidden="true" className="text-indigo-600" size={13} />{today}</span>
            </div>
            <dl className="mt-4 flex flex-wrap gap-2.5">
              {[
                { label: "Appointments today", value: projection.totals.todayAppointments.toLocaleString() },
                { label: "Waiting now", value: projection.totals.liveQueueEntries.toLocaleString() },
                { label: "Collected", value: formatWonFlowDashboardPercentage(collectionRate) },
              ].map((stat) => (
                <div className="rounded-2xl border border-indigo-100 bg-white/70 px-3.5 py-2 shadow-sm backdrop-blur-sm" key={stat.label}>
                  <dt className="text-[9px] font-black uppercase tracking-[0.14em] text-indigo-600">{stat.label}</dt>
                  <dd className="mt-0.5 text-lg font-black tabular-nums text-slate-950">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-indigo-200/80 bg-white/70 px-3 text-[11px] font-bold text-slate-700"><Clock3 aria-hidden="true" className="text-indigo-600" size={15} />Today’s overview</span>
            <button className="wf-admin-refresh inline-flex min-h-10 items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-4 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60" disabled={refreshing} onClick={onRefresh} type="button"><RefreshCw aria-hidden="true" className={refreshing ? "animate-spin" : ""} size={15} />{refreshing ? "Refreshing" : "Refresh data"}</button>
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <KpiCard label="Patients" value={projection.totals.patients.toLocaleString()} detail="Organization records" icon={Users} tone="indigo" />
        <KpiCard label="Practitioners" value={projection.totals.practitioners} detail="Clinical workforce" icon={Stethoscope} tone="violet" />
        <KpiCard label="Appointments" value={projection.totals.todayAppointments} detail="Scheduled today" icon={CalendarDays} tone="cyan" />
        <KpiCard label="Live queue" value={projection.totals.liveQueueEntries} detail="Awaiting or in service" icon={Activity} tone="amber" />
        <KpiCard label="Active branches" value={projection.totals.activeBranches} detail="Configured locations" icon={MapPin} tone="cyan" />
        <KpiCard label="Open invoices" value={projection.totals.openInvoices} detail="Issued or partly paid" icon={FileText} tone="fuchsia" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.65fr)]">
        <Panel icon={Activity} tone="indigo" title="Operational activity" description="Appointments, queues and clinical staff compared by branch" action={<span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-indigo-700">Today</span>}>
          <OperationalActivityChart branches={projection.branchSummaries} />
        </Panel>
        <Panel icon={TrendingUp} tone="violet" title="Revenue health" description="Organization billing performance">
          <RevenueRing collectionRate={collectionRate} projection={projection} />
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)_minmax(280px,0.65fr)]">
        <Panel icon={Users} tone="cyan" title="Clinical workforce" description="Active practitioners assigned by branch">
          <PractitionerDistribution branches={projection.branchSummaries} />
        </Panel>
        <Panel icon={Activity} tone="amber" title="Needs attention" description="Leading pressure indicators right now">
          <AttentionList projection={projection} />
        </Panel>
        <Panel icon={LayoutGrid} tone="fuchsia" title="Quick actions" description="Common owner controls">
          <QuickActions />
        </Panel>
      </div>

      <Panel
        icon={MapPin}
        tone="cyan"
        title="Branch performance"
        description={`${filteredBranches.length} of ${projection.branchSummaries.length} branches shown`}
        action={
          <div className="flex items-center gap-2">
            <label className="relative hidden sm:block"><span className="sr-only">Search branches</span><Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} /><input className="h-9 w-44 rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-[11px] outline-none focus:border-indigo-400" onChange={(event) => setSearchText(event.target.value)} placeholder="Search branch" type="search" value={searchText} /></label>
            <select aria-label="Sort branches" className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-semibold text-slate-600 outline-none" onChange={(event) => setSortMetric(event.target.value as BranchSortMetric)} value={sortMetric}><option value="activity">Activity</option><option value="practitioners">Doctors</option><option value="outstanding">Outstanding</option></select>
          </div>
        }
      >
        {filteredBranches.length === 0 ? <WonFlowEmptyState title="No branches found" description="Try another branch name." /> : <BranchTable branches={filteredBranches} currencyCode={projection.financial.currencyCode} />}
      </Panel>

      <footer className="flex flex-col gap-2 rounded-xl border border-slate-200/70 bg-slate-50/70 px-4 py-3 text-[10px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>Live tenant data · Updated {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: projection.source.timezone }).format(new Date(projection.source.generatedAt))}</span>
        <Link className="inline-flex items-center gap-1 font-bold text-indigo-700 hover:text-indigo-900" href="/admin/setup"><Settings2 aria-hidden="true" size={13} />Hospital setup<ArrowRight aria-hidden="true" size={12} /></Link>
      </footer>
    </div>
  );
}

export function OrganizationAdminDashboard() {
  const dashboard = useWonFlowOrganizationDashboard();
  return (
    <WonFlowAsyncDataBoundary
      emptyDescription="No organization records are available in the current hospital workspace."
      emptyTitle="No organization information"
      loadingDescription="WonFlow is assembling branch, practitioner, patient and financial information."
      loadingTitle="Preparing hospital dashboard"
      onRetry={dashboard.reload}
      state={dashboard}
    >
      {(projection) => <OrganizationDashboardContent onRefresh={dashboard.reload} projection={projection} refreshing={dashboard.isRefreshing} />}
    </WonFlowAsyncDataBoundary>
  );
}
