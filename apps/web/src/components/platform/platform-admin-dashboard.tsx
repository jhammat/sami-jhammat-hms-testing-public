"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowUpRight,
  Building2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Headphones,
  Layers3,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

import { WonFlowAsyncDataBoundary, WonFlowEmptyState } from "@/components/feedback";
import { phaseOneApi } from "@/lib/api/phase-one-api";
import { useWonFlowAsyncData } from "@/lib/data";

import { PlatformStatusBadge } from "./platform-administration-ui";

interface PlatformDashboardData {
  generatedAt: string;
  totals: {
    tenants: number;
    activeTenants: number;
    configuredSubscriptions: number;
    seats: number;
    users: number;
    branches: number;
    enabledEntitlements: number;
    activeSupportAccess: number;
    pendingSupportAccess: number;
  };
  recurringRevenue: Array<{ currencyCode: string; amountMinor: number }>;
  tenantStatusDistribution: Array<{ status: string; count: number }>;
  subscriptionStatusDistribution: Array<{ status: string; count: number }>;
  planDistribution: Array<{ plan: string; count: number }>;
  tenantGrowth: Array<{ label: string; created: number; total: number }>;
  activityTrend: Array<{ label: string; total: number; warnings: number }>;
  tenants: Array<{
    id: string;
    slug: string;
    name: string;
    status: string;
    branches: number;
    users: number;
    plan: string;
    billingStatus: string;
    seats: number;
    currencyCode: string;
    monthlyAmountMinor: number;
    enabledEntitlements: number;
    updatedAt: string;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    severity: string;
    description: string;
    organizationName: string | null;
    sourceApplication: string;
    createdAt: string;
  }>;
}

const tones = {
  blue: {
    orb: "from-blue-500/90 to-indigo-600/90",
    glow: "bg-blue-400/25",
  },
  violet: {
    orb: "from-violet-500/90 to-fuchsia-600/90",
    glow: "bg-violet-400/25",
  },
  cyan: {
    orb: "from-cyan-400/90 to-blue-600/90",
    glow: "bg-cyan-400/25",
  },
  emerald: {
    orb: "from-emerald-400/90 to-teal-600/90",
    glow: "bg-emerald-400/25",
  },
} as const;

function titleCase(value: string): string {
  return value.replaceAll(".", " ").replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function money(amountMinor: number, currencyCode: string): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

function Panel({ title, description, action, children, className = "" }: { title: string; description: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`wfg-panel overflow-hidden ${className}`}>
      <header className="wfg-divide flex items-start justify-between gap-4 border-b px-6 py-5 sm:px-7">
        <div><h2 className="text-[15px] font-semibold tracking-[-0.01em] text-slate-950">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div>
        {action}
      </header>
      <div className="p-6 sm:p-7">{children}</div>
    </section>
  );
}

function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link className="wfg-panel-link inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/60 bg-white/50 px-3 py-1.5 text-[11px] font-semibold text-blue-700 backdrop-blur transition hover:border-white hover:bg-white/80" href={href}>{children}</Link>;
}

function KpiCard({ label, value, detail, icon, tone }: { label: string; value: string | number; detail: string; icon: ReactNode; tone: keyof typeof tones }) {
  return (
    <article className="wfg-tile group relative overflow-hidden p-6">
      <span className={`pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full blur-2xl transition duration-500 group-hover:scale-125 ${tones[tone].glow}`} />
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-[0_10px_24px_-10px_rgba(15,23,42,0.7)] ring-1 ring-white/40 ${tones[tone].orb}`}>{icon}</span>
      </div>
      <p className="relative mt-4 text-[32px] font-semibold leading-none tracking-[-0.04em] text-slate-950">{value}</p>
      <p className="relative mt-3 text-xs leading-5 text-slate-500">{detail}</p>
    </article>
  );
}

function TenantGrowthChart({ data }: { data: PlatformDashboardData["tenantGrowth"] }) {
  const maximum = Math.max(1, ...data.map((item) => item.total));
  const points = data.map((item, index) => ({
    ...item,
    x: 34 + (index * 592) / Math.max(1, data.length - 1),
    y: 158 - (item.total / maximum) * 112,
  }));
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = points.length ? `M ${points[0]!.x} 174 L ${points.map((point) => `${point.x} ${point.y}`).join(" L ")} L ${points.at(-1)!.x} 174 Z` : "";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2 text-[11px] font-semibold text-blue-700"><span className="h-2 w-2 rounded-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.9)]" />Total tenants</div><span className="rounded-full border border-white/60 bg-white/50 px-3 py-1 text-[10px] font-semibold tracking-[0.12em] text-blue-700 backdrop-blur">6 MONTHS</span></div>
      <svg aria-label="Tenant growth over six months" className="h-[205px] w-full overflow-visible" role="img" viewBox="0 0 660 205">
        <defs>
          <linearGradient id="tenantGrowthFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#4b63ff" stopOpacity="0.34" /><stop offset="100%" stopColor="#9a5cff" stopOpacity="0" /></linearGradient>
          <linearGradient id="tenantGrowthLine" x1="0" x2="1"><stop stopColor="#3b82f6" /><stop offset="0.55" stopColor="#6366f1" /><stop offset="1" stopColor="#a855f7" /></linearGradient>
          <filter height="300%" id="tenantGrowthGlow" width="300%" x="-100%" y="-100%"><feGaussianBlur result="blur" stdDeviation="7" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {[46, 83, 120, 158].map((y) => <line className="wfg-chart-grid stroke-slate-400/25" key={y} strokeDasharray="2 9" strokeLinecap="round" x1="28" x2="636" y1={y} y2={y} />)}
        <path d={area} fill="url(#tenantGrowthFill)" />
        <polyline fill="none" filter="url(#tenantGrowthGlow)" points={line} stroke="url(#tenantGrowthLine)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" />
        {points.map((point) => <g key={point.label}><circle className="wfg-chart-node fill-white/90 stroke-indigo-500" cx={point.x} cy={point.y} r="5.5" strokeWidth="3" /><text className="wfg-chart-value fill-indigo-900" fontSize="11" fontWeight="600" textAnchor="middle" x={point.x} y={point.y - 14}>{point.total}</text><text className="wfg-chart-label fill-slate-500" fontSize="10.5" fontWeight="500" textAnchor="middle" x={point.x} y="197">{point.label}</text></g>)}
      </svg>
    </div>
  );
}

function ActivityChart({ data }: { data: PlatformDashboardData["activityTrend"] }) {
  const maximum = Math.max(1, ...data.map((item) => item.total));
  return (
    <div className="flex h-[205px] items-end justify-between gap-3 pt-5">
      {data.map((item) => {
        const height = item.total === 0 ? 7 : Math.max(18, (item.total / maximum) * 142);
        const warningHeight = item.total === 0 ? 0 : (item.warnings / Math.max(1, item.total)) * height;
        return <div className="group flex min-w-0 flex-1 flex-col items-center" key={item.label}><div className="mb-2 text-[10px] font-semibold text-slate-600">{item.total}</div><div className="wfg-bar-track relative flex h-36 w-full max-w-9 items-end overflow-hidden rounded-full border border-white/50 bg-white/30 backdrop-blur"><span className="w-full rounded-full bg-gradient-to-t from-indigo-600 via-blue-500 to-cyan-300 shadow-[0_0_18px_-2px_rgba(75,99,255,0.7)] transition-all duration-500" style={{ height }} /><span className="absolute bottom-0 left-0 w-full rounded-full bg-gradient-to-t from-amber-500 to-amber-300" style={{ height: warningHeight }} /></div><span className="mt-3 text-[10px] font-medium text-slate-500">{item.label}</span></div>;
      })}
    </div>
  );
}

function StatusDonut({ data, active, total }: { data: PlatformDashboardData["tenantStatusDistribution"]; active: number; total: number }) {
  const percentage = total === 0 ? 0 : Math.round((active / total) * 100);
  const circumference = 2 * Math.PI * 50;
  return (
    <div className="grid items-center gap-6 sm:grid-cols-[180px_1fr]">
      <div className="relative mx-auto h-44 w-44"><span className="absolute inset-6 rounded-full bg-gradient-to-br from-emerald-400/25 to-blue-500/25 blur-2xl" /><svg className="relative h-full w-full -rotate-90" viewBox="0 0 120 120"><circle className="wfg-chart-track stroke-slate-400/20" cx="60" cy="60" fill="none" r="50" strokeWidth="10" /><circle cx="60" cy="60" fill="none" r="50" stroke="url(#statusRing)" strokeDasharray={`${(percentage / 100) * circumference} ${circumference}`} strokeLinecap="round" strokeWidth="10" /><defs><linearGradient id="statusRing"><stop stopColor="#34d399" /><stop offset="1" stopColor="#4b63ff" /></linearGradient></defs></svg><div className="absolute inset-0 grid place-content-center text-center"><strong className="text-[32px] font-semibold tracking-[-0.04em] text-slate-950">{percentage}%</strong><span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">active</span></div></div>
      <div className="space-y-2">{data.map((item, index) => <div className="wfg-well flex items-center justify-between gap-3 px-3.5 py-2.5" key={item.status}><span className="flex items-center gap-2.5 text-xs font-medium text-slate-600"><span className={`h-2 w-2 rounded-full ${index === 0 ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.9)]" : index === 1 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]"}`} />{titleCase(item.status)}</span><strong className="text-sm font-semibold text-slate-950">{item.count}</strong></div>)}</div>
    </div>
  );
}

function PlanDistribution({ data }: { data: PlatformDashboardData["planDistribution"] }) {
  const maximum = Math.max(1, ...data.map((item) => item.count));
  if (data.length === 0) return <WonFlowEmptyState title="No plans configured" description="Subscription plan distribution will appear after tenant setup." />;
  return <div className="space-y-4">{data.map((item, index) => <div key={item.plan}><div className="mb-2 flex justify-between text-xs"><span className="font-medium text-slate-700">{titleCase(item.plan)}</span><strong className="font-semibold text-slate-950">{item.count}</strong></div><div className="wfg-bar-track h-2 overflow-hidden rounded-full border border-white/50 bg-white/35 backdrop-blur"><div className={`h-full rounded-full bg-gradient-to-r shadow-[0_0_12px_-2px_rgba(75,99,255,0.8)] ${index % 3 === 0 ? "from-blue-500 to-cyan-300" : index % 3 === 1 ? "from-violet-500 to-fuchsia-300" : "from-emerald-500 to-teal-300"}`} style={{ width: `${Math.max(6, (item.count / maximum) * 100)}%` }} /></div></div>)}</div>;
}

function PlatformDashboardContent({ dashboard, reload }: { dashboard: PlatformDashboardData; reload(): void }) {
  const primaryRevenue = dashboard.recurringRevenue[0] ?? { currencyCode: "PKR", amountMinor: 0 };
  const activeRate = dashboard.totals.tenants === 0 ? 0 : Math.round((dashboard.totals.activeTenants / dashboard.totals.tenants) * 100);
  const seatUtilization = dashboard.totals.seats === 0 ? 0 : Math.min(100, Math.round((dashboard.totals.users / dashboard.totals.seats) * 100));

  return (
    <div className="space-y-6" id="main-content">
      <section className="wfg-aurora px-7 py-8 text-white sm:px-9 sm:py-10">
        <span className="wfg-aurora-blob -right-24 -top-40 h-96 w-96 bg-cyan-300/25" /><span className="wfg-aurora-blob -bottom-44 left-[34%] h-80 w-80 bg-fuchsia-400/25" /><span className="wfg-aurora-blob -left-28 top-10 h-72 w-72 bg-blue-400/20" />
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        <div className="relative flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200 ring-1 ring-emerald-300/30 backdrop-blur"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,1)]" />Production data</span><span className="rounded-full bg-white/10 px-3.5 py-1.5 text-[10px] font-medium text-blue-100 ring-1 ring-white/15 backdrop-blur">{dashboard.totals.activeTenants} active {dashboard.totals.activeTenants === 1 ? "tenant" : "tenants"}</span></div><div className="flex gap-2"><button className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-xs font-medium !text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/20" onClick={reload} type="button"><RefreshCw aria-hidden size={15} />Refresh</button><Link className="wfg-cta inline-flex min-h-10 items-center gap-2 rounded-full px-5 text-xs font-semibold shadow-[0_14px_30px_-12px_rgba(255,255,255,0.9)] transition hover:-translate-y-0.5" href="/platform/organizations/new"><Plus aria-hidden size={16} />Add tenant</Link></div></div>
        <div className="relative mt-8 grid items-end gap-7 lg:grid-cols-[minmax(0,1fr)_400px]"><div><p className="text-[10px] font-semibold uppercase tracking-[0.3em] !text-blue-200/90">WonFlow control center</p><h1 className="mt-3 text-3xl font-semibold leading-[1.08] tracking-[-0.035em] !text-white sm:text-[42px]">Platform operations,<br className="hidden sm:block" /> clearly connected.</h1><p className="mt-3 max-w-xl text-sm leading-6 !text-blue-100/85">Customer tenants, subscriptions, access and audit activity calculated from the live database.</p></div><div className="grid grid-cols-3 overflow-hidden rounded-[var(--wfg-r-md)] border border-white/15 bg-white/10 backdrop-blur-xl"><div className="p-4"><p className="text-[8px] font-semibold uppercase tracking-[0.2em] !text-blue-200/80">Active rate</p><p className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] !text-white">{activeRate}%</p></div><div className="border-x border-white/15 p-4"><p className="text-[8px] font-semibold uppercase tracking-[0.2em] !text-blue-200/80">Seat usage</p><p className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] !text-white">{seatUtilization}%</p></div><div className="p-4"><p className="text-[8px] font-semibold uppercase tracking-[0.2em] !text-blue-200/80">Synced</p><p className="mt-1.5 text-sm font-semibold !text-white">{new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(dashboard.generatedAt))}</p></div></div></div>
      </section>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4"><KpiCard detail={`${dashboard.totals.branches} branches across the platform`} icon={<Building2 aria-hidden size={20} />} label="Total tenants" tone="blue" value={dashboard.totals.tenants} /><KpiCard detail={`${dashboard.totals.configuredSubscriptions} configured subscriptions`} icon={<Activity aria-hidden size={20} />} label="Active tenants" tone="emerald" value={dashboard.totals.activeTenants} /><KpiCard detail="Active and trial subscription value" icon={<CircleDollarSign aria-hidden size={20} />} label="Monthly recurring" tone="violet" value={money(primaryRevenue.amountMinor, primaryRevenue.currencyCode)} /><KpiCard detail={`${dashboard.totals.users} assigned users / ${seatUtilization}% utilized`} icon={<Users aria-hidden size={20} />} label="Licensed seats" tone="cyan" value={dashboard.totals.seats} /></div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]"><Panel action={<PanelLink href="/platform/organizations">View tenants</PanelLink>} description="Cumulative production tenant records over the last six months." title="Platform growth"><TenantGrowthChart data={dashboard.tenantGrowth} /></Panel><Panel description="Current organization state across all tenants." title="Tenant health"><StatusDonut active={dashboard.totals.activeTenants} data={dashboard.tenantStatusDistribution} total={dashboard.totals.tenants} /></Panel></div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]"><Panel description="Real audit events generated during the last seven days." title="Platform activity"><ActivityChart data={dashboard.activityTrend} /><div className="wfg-divide mt-4 flex gap-5 border-t pt-4 text-[10px] font-medium text-slate-500"><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.9)]" />All events</span><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />Warnings &amp; critical</span></div></Panel><Panel action={<PanelLink href="/platform/subscriptions">Manage</PanelLink>} description="Tenant count by configured billing plan." title="Subscription mix"><PlanDistribution data={dashboard.planDistribution} /><div className="mt-6 grid grid-cols-2 gap-3"><div className="wfg-well p-4"><CreditCard className="text-blue-600" size={17} /><p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{dashboard.totals.configuredSubscriptions}</p><p className="mt-0.5 text-[10px] font-medium text-slate-500">Configured</p></div><div className="wfg-well p-4"><Layers3 className="text-violet-600" size={17} /><p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{dashboard.totals.enabledEntitlements}</p><p className="mt-0.5 text-[10px] font-medium text-slate-500">Enabled modules</p></div></div></Panel></div>

      <Panel action={<PanelLink href="/platform/organizations">Open directory<ArrowUpRight size={13} /></PanelLink>} description="Live subscription, capacity and access information for recently updated organizations." title="Tenant portfolio">
        {dashboard.tenants.length === 0 ? <WonFlowEmptyState title="No tenant organizations" description="Create the first organization to begin tracking platform performance." /> : <div className="overflow-x-auto"><table className="w-full min-w-[820px] border-separate border-spacing-y-1.5 text-left"><thead><tr className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400"><th className="px-4 pb-3 font-semibold">Organization</th><th className="px-4 pb-3 font-semibold">Status</th><th className="px-4 pb-3 font-semibold">Plan</th><th className="px-4 pb-3 font-semibold">Capacity</th><th className="px-4 pb-3 font-semibold">Access</th><th className="px-4 pb-3 text-right font-semibold">Monthly</th></tr></thead><tbody>{dashboard.tenants.map((tenant) => <tr className="wfg-row" key={tenant.id}><td className="rounded-l-[var(--wfg-r-sm)] px-4 py-3.5"><Link className="group flex items-center gap-3" href="/platform/organizations"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-xs font-semibold text-white shadow-[0_10px_22px_-10px_rgba(75,99,255,0.95)] ring-1 ring-white/30">{tenant.name.slice(0, 2).toUpperCase()}</span><span><strong className="block text-sm font-semibold text-slate-950 group-hover:text-blue-700">{tenant.name}</strong><span className="text-[10px] text-slate-500">{tenant.slug}</span></span></Link></td><td className="px-4 py-3.5"><PlatformStatusBadge status={tenant.status} /></td><td className="px-4 py-3.5"><p className="text-xs font-medium text-slate-800">{titleCase(tenant.plan)}</p><p className="mt-1 text-[10px] text-slate-500">{titleCase(tenant.billingStatus)}</p></td><td className="px-4 py-3.5 text-xs text-slate-600"><strong className="font-semibold text-slate-950">{tenant.users}</strong> users / {tenant.seats} seats<p className="mt-1 text-[10px]">{tenant.branches} branches</p></td><td className="px-4 py-3.5"><span className="rounded-full border border-violet-200/60 bg-violet-500/10 px-2.5 py-1 text-[10px] font-medium text-violet-700">{tenant.enabledEntitlements} modules</span></td><td className="rounded-r-[var(--wfg-r-sm)] px-4 py-3.5 text-right text-sm font-semibold text-slate-950">{money(tenant.monthlyAmountMinor, tenant.currencyCode)}</td></tr>)}</tbody></table></div>}
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]"><Panel action={<PanelLink href="/platform/audit">Full audit trail</PanelLink>} description="The newest server-recorded platform and tenant events." title="Recent activity">{dashboard.recentActivity.length === 0 ? <WonFlowEmptyState title="No platform activity" description="Real configuration changes will appear here." /> : <ol className="space-y-1">{dashboard.recentActivity.map((event, index) => <li className="relative flex gap-4 pb-5 last:pb-0" key={event.id}>{index < dashboard.recentActivity.length - 1 ? <span className="absolute bottom-0 left-[18px] top-10 w-px bg-gradient-to-b from-slate-300/70 to-transparent" /> : null}<span className={`relative mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/60 backdrop-blur ${event.severity === "critical" ? "bg-rose-500/12 text-rose-700" : event.severity === "warning" ? "bg-amber-500/15 text-amber-700" : "bg-blue-500/12 text-blue-700"}`}><Zap size={15} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-950">{titleCase(event.action)}</p><time className="text-[10px] text-slate-400">{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.createdAt))}</time></div><p className="mt-1 text-xs leading-5 text-slate-500">{event.description}</p><p className="mt-1.5 text-[10px] font-medium text-blue-700">{event.organizationName ?? "Platform-wide"} / {event.sourceApplication}</p></div></li>)}</ol>}</Panel><div className="space-y-5"><Panel description="Time-limited access requiring attention." title="Support access"><div className="grid grid-cols-2 gap-3"><div className="wfg-well p-4"><Headphones className="text-emerald-600" size={19} /><p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{dashboard.totals.activeSupportAccess}</p><p className="mt-0.5 text-[10px] font-medium text-slate-500">Active sessions</p></div><div className="wfg-well p-4"><Clock3 className="text-amber-600" size={19} /><p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{dashboard.totals.pendingSupportAccess}</p><p className="mt-0.5 text-[10px] font-medium text-slate-500">Awaiting action</p></div></div><Link className="wfg-link-row mt-4 flex w-full items-center justify-center gap-2 border border-white/50 bg-white/30 px-4 py-3 text-xs font-semibold text-slate-700 hover:text-blue-700" href="/platform/support">Manage support access<ArrowUpRight size={14} /></Link></Panel><Panel description="Common super-administration workflows." title="Quick actions"><div className="grid gap-2"><Link className="wfg-link-row flex items-center justify-between border border-white/50 bg-white/30 p-3.5 text-xs font-semibold text-slate-700" href="/platform/entitlements"><span className="flex items-center gap-2.5"><ShieldCheck className="text-violet-600" size={16} />Entitlements</span><ArrowUpRight size={14} /></Link><Link className="wfg-link-row flex items-center justify-between border border-white/50 bg-white/30 p-3.5 text-xs font-semibold text-slate-700" href="/platform/settings"><span className="flex items-center gap-2.5"><Sparkles className="text-blue-600" size={16} />System settings</span><ArrowUpRight size={14} /></Link></div></Panel></div></div>
    </div>
  );
}

export function PlatformAdminDashboard() {
  const resource = useWonFlowAsyncData<{ dashboard: PlatformDashboardData }>({
    key: "platform:live-dashboard",
    loader: (signal) => phaseOneApi<{ dashboard: PlatformDashboardData }>("/api/v1/platform/dashboard", { signal }),
  });

  return <WonFlowAsyncDataBoundary loadingTitle="Loading platform intelligence" loadingDescription="Aggregating live tenants, subscriptions, access and audit events." onRetry={resource.reload} state={resource}>{({ dashboard }) => <PlatformDashboardContent dashboard={dashboard} reload={resource.reload} />}</WonFlowAsyncDataBoundary>;
}
