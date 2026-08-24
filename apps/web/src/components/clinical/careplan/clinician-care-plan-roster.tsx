"use client";

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Droplet,
  HeartPulse,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Stethoscope,
  User,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CarePlanRosterItem } from "@wonflow/contracts";

export function ClinicianCarePlanRoster({
  onSelectPlan,
}: {
  onSelectPlan?: (planId: string) => void;
}) {
  const [roster, setRoster] = useState<CarePlanRosterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAlert, setFilterAlert] = useState<"ALL" | "ALERTS_ONLY" | "CRITICAL">("ALL");

  const loadRoster = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/v1/clinical/careplans/roster", { credentials: "include" });
      if (!res.ok) {
        throw new Error("Failed to load care plan roster.");
      }
      const data = (await res.json()) as { roster: CarePlanRosterItem[] };
      setRoster(data.roster || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading roster");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const res = await fetch("/api/v1/clinical/careplans/roster", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load roster.");
        const data = (await res.json()) as { roster: CarePlanRosterItem[] };
        if (mounted) {
          setRoster(data.roster || []);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Error loading roster");
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return roster.filter((item) => {
      const matchesSearch =
        item.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.patientNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterAlert === "CRITICAL") {
        return item.highestAlertSeverity === "CRITICAL";
      }
      if (filterAlert === "ALERTS_ONLY") {
        return item.highestAlertSeverity === "CRITICAL" || item.highestAlertSeverity === "HIGH";
      }
      return true;
    });
  }, [roster, searchQuery, filterAlert]);

  const criticalCount = useMemo(
    () => roster.filter((r) => r.highestAlertSeverity === "CRITICAL").length,
    [roster],
  );
  const highCount = useMemo(
    () => roster.filter((r) => r.highestAlertSeverity === "HIGH").length,
    [roster],
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Metrics */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div className="flex items-center space-x-2">
            <span className="rounded-lg bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <HeartPulse className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Active Care Plans Roster</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Real-time outpatient recovery surveillance, daily patient task compliance, and clinical alert monitoring.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="flex items-center rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <User className="mr-1.5 h-3.5 w-3.5" /> Total Active: {roster.length}
            </span>
            {criticalCount > 0 && (
              <span className="flex animate-pulse items-center rounded-xl bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                <ShieldAlert className="mr-1.5 h-3.5 w-3.5 text-rose-600" /> {criticalCount} Critical
              </span>
            )}
            {highCount > 0 && (
              <span className="flex items-center rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                <AlertTriangle className="mr-1.5 h-3.5 w-3.5 text-amber-600" /> {highCount} High Alert
              </span>
            )}
          </div>

          <button
            onClick={() => void loadRoster()}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            title="Refresh Roster"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient name, MRN, or plan title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilterAlert("ALL")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              filterAlert === "ALL"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            All ({roster.length})
          </button>
          <button
            onClick={() => setFilterAlert("ALERTS_ONLY")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              filterAlert === "ALERTS_ONLY"
                ? "bg-amber-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            Alerts Only ({criticalCount + highCount})
          </button>
          <button
            onClick={() => setFilterAlert("CRITICAL")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              filterAlert === "CRITICAL"
                ? "bg-rose-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            Critical ({criticalCount})
          </button>
        </div>
      </div>

      {/* Roster Cards List */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
          <span className="ml-2 text-xs font-medium text-slate-500">Loading care plan roster...</span>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-xs text-red-700">
          <p className="font-bold">Error loading roster: {error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <CheckCircle2 className="mx-auto h-8 w-8 text-slate-400" />
          <h3 className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-300">No care plans found</h3>
          <p className="mt-1 text-xs text-slate-500">
            {searchQuery ? "No patients matching search criteria." : "No active outpatient care plans found."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <RosterCard key={item.id} item={item} onSelect={() => onSelectPlan?.(item.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function RosterCard({
  item,
  onSelect,
}: {
  item: CarePlanRosterItem;
  onSelect: () => void;
}) {
  const isCritical = item.highestAlertSeverity === "CRITICAL";
  const isHigh = item.highestAlertSeverity === "HIGH";

  return (
    <div
      onClick={onSelect}
      className={`group relative flex cursor-pointer flex-col justify-between rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-md ${
        isCritical
          ? "border-rose-300 bg-gradient-to-br from-rose-50/70 via-white to-white shadow-xs dark:border-rose-900/60 dark:from-rose-950/20 dark:to-slate-900"
          : isHigh
            ? "border-amber-300 bg-gradient-to-br from-amber-50/70 via-white to-white shadow-xs dark:border-amber-900/60 dark:from-amber-950/20 dark:to-slate-900"
            : "border-slate-200/90 bg-white shadow-2xs hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900"
      }`}
    >
      <div>
        {/* Header Badges */}
        <div className="flex items-center justify-between">
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {item.category.replace(/_/g, " ")}
          </span>

          {isCritical ? (
            <span className="inline-flex animate-pulse items-center rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-black text-white shadow-xs">
              <ShieldAlert className="mr-1 h-3 w-3" /> CRITICAL ALERT
            </span>
          ) : isHigh ? (
            <span className="inline-flex items-center rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-black text-white shadow-xs">
              <AlertTriangle className="mr-1 h-3 w-3" /> HIGH ALERT
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <CheckCircle2 className="mr-1 h-3 w-3" /> ON TRACK
            </span>
          )}
        </div>

        {/* Patient Name & Title */}
        <div className="mt-3">
          <h3 className="text-base font-black text-slate-900 group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-400">
            {item.patientName}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            MRN: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.patientNumber}</span> • {item.title}
          </p>
        </div>

        {/* Timeline & Adherence Status */}
        <div className="mt-3.5 space-y-2 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 font-semibold">
            <span className="flex items-center">
              <Calendar className="mr-1.5 h-3.5 w-3.5 text-slate-400" /> Day {item.currentDayNumber} of {item.totalDays}
            </span>
            <span className="text-[11px] font-bold text-slate-500">
              Stage {item.currentStage} of {item.totalStages}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Today&apos;s Task Adherence:</span>
            <span className="font-black text-slate-800 dark:text-slate-200">
              {item.todayCompletedTasks} / {item.todayTotalTasks} Tasks
            </span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className={`h-full rounded-full ${
                item.todayCompletedTasks === item.todayTotalTasks && item.todayTotalTasks > 0
                  ? "bg-emerald-500"
                  : "bg-teal-500"
              }`}
              style={{
                width: `${item.todayTotalTasks > 0 ? (item.todayCompletedTasks / item.todayTotalTasks) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Recent Observation Summaries */}
        <div className="mt-3 space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
          {item.lastVitalsSummary && (
            <div className="flex items-center truncate">
              <HeartPulse className="mr-1.5 h-3.5 w-3.5 flex-shrink-0 text-rose-500" />
              <span className="truncate">{item.lastVitalsSummary}</span>
            </div>
          )}
          {item.lastDrainSummary && (
            <div className="flex items-center truncate">
              <Droplet className="mr-1.5 h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
              <span className="truncate">Drain: {item.lastDrainSummary}</span>
            </div>
          )}
          {item.lastWoundSummary && (
            <div className="flex items-center truncate">
              <Activity className="mr-1.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
              <span className="truncate">Incision: {item.lastWoundSummary}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Details */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
        <span className="flex items-center text-[11px] text-slate-500">
          <Stethoscope className="mr-1 h-3.5 w-3.5 text-slate-400" />
          {item.managingDoctorName}
        </span>

        <span className="inline-flex items-center font-bold text-emerald-700 group-hover:translate-x-0.5 transition dark:text-emerald-400">
          View Detail <ArrowRight className="ml-1 h-3 w-3" />
        </span>
      </div>
    </div>
  );
}
