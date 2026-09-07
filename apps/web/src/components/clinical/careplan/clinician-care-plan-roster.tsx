"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Droplet,
  HeartPulse,
  ListChecks,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Stethoscope,
  User,
  Utensils,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CarePlanRosterItem } from "@wonflow/contracts";

import { CreateCarePlanModal } from "./create-care-plan-modal";
import { CarePlanTemplateBuilder } from "./care-plan-template-builder";

export function ClinicianCarePlanRoster({
  onSelectPlan,
}: {
  onSelectPlan?: (planId: string) => void;
}) {
  const [roster, setRoster] = useState<CarePlanRosterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPathway, setSelectedPathway] = useState<
    "ALL" | "PANCREATIC" | "HEPATIC" | "BILIARY" | "ALERTS_ONLY" | "DRAINS_ACTIVE"
  >("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

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
      setError(err instanceof Error ? err.message : "Error loading care plan roster");
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
    const q = searchQuery.toLowerCase().trim();
    const queryWords = q.split(/\s+/).filter(Boolean);

    return roster.filter((item) => {
      const matchText = `${item.patientName} ${item.patientNumber} ${item.title} ${item.category} ${item.managingDoctorName ?? ""}`.toLowerCase();
      const matchesSearch =
        queryWords.length === 0 || queryWords.every((word) => matchText.includes(word));

      if (!matchesSearch) return false;

      if (selectedPathway === "PANCREATIC") {
        return (
          item.category.includes("WHIPPLE") ||
          item.category.includes("PANCREA") ||
          item.title.toLowerCase().includes("whipple") ||
          item.title.toLowerCase().includes("pancrea")
        );
      }

      if (selectedPathway === "HEPATIC") {
        return (
          item.category.includes("HEPAT") ||
          item.category.includes("LIVER") ||
          item.title.toLowerCase().includes("hepat") ||
          item.title.toLowerCase().includes("liver")
        );
      }

      if (selectedPathway === "BILIARY") {
        return (
          item.category.includes("BILIARY") ||
          item.category.includes("CHOLE") ||
          item.title.toLowerCase().includes("biliary") ||
          item.title.toLowerCase().includes("hepatico")
        );
      }

      if (selectedPathway === "ALERTS_ONLY") {
        return item.highestAlertSeverity === "CRITICAL" || item.highestAlertSeverity === "HIGH";
      }

      if (selectedPathway === "DRAINS_ACTIVE") {
        return Boolean(item.lastDrainSummary);
      }

      return true;
    });
  }, [roster, searchQuery, selectedPathway]);

  const stats = useMemo(() => {
    const totalActive = roster.length;
    const criticalCount = roster.filter((r) => r.highestAlertSeverity === "CRITICAL").length;
    const highCount = roster.filter((r) => r.highestAlertSeverity === "HIGH").length;

    const pancreaticCount = roster.filter(
      (r) =>
        r.category.includes("WHIPPLE") ||
        r.category.includes("PANCREA") ||
        r.title.toLowerCase().includes("whipple") ||
        r.title.toLowerCase().includes("pancrea"),
    ).length;

    const hepaticCount = roster.filter(
      (r) =>
        r.category.includes("HEPAT") ||
        r.category.includes("LIVER") ||
        r.title.toLowerCase().includes("hepat") ||
        r.title.toLowerCase().includes("liver"),
    ).length;

    const biliaryCount = roster.filter(
      (r) =>
        r.category.includes("BILIARY") ||
        r.category.includes("CHOLE") ||
        r.title.toLowerCase().includes("biliary"),
    ).length;

    const drainsActiveCount = roster.filter((r) => Boolean(r.lastDrainSummary)).length;

    const totalTasksToday = roster.reduce((acc, curr) => acc + (curr.todayTotalTasks || 0), 0);
    const completedTasksToday = roster.reduce((acc, curr) => acc + (curr.todayCompletedTasks || 0), 0);
    const adherenceRate = totalTasksToday > 0 ? Math.round((completedTasksToday / totalTasksToday) * 100) : 100;

    return {
      totalActive,
      criticalCount,
      highCount,
      pancreaticCount,
      hepaticCount,
      biliaryCount,
      drainsActiveCount,
      adherenceRate,
      completedTasksToday,
      totalTasksToday,
    };
  }, [roster]);

  return (
    <div className="space-y-6">
      {/* Clean, Modern, Elegant Header */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <HeartPulse className="h-5 w-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Surgical Care Plans
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Post-operative outpatient recovery surveillance, surgical drain tracking, and clinical alert monitoring.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsBuilderOpen(true)}
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <ListChecks className="h-4 w-4" />
            Recovery plans
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-500 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Start a care plan
          </button>

          <button
            onClick={() => void loadRoster()}
            disabled={loading}
            type="button"
            className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-2xs transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            title="Refresh Roster"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Clean Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Active Plans
            </span>
            <span className="rounded-xl bg-indigo-50 p-1.5 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <User className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {stats.totalActive}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {stats.pancreaticCount} Pancreatic · {stats.hepaticCount} Hepatic · {stats.biliaryCount} Biliary
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Drains Under Tracking
            </span>
            <span className="rounded-xl bg-sky-50 p-1.5 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
              <Droplet className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {stats.drainsActiveCount} <span className="text-xs font-semibold text-slate-400">Active</span>
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Intra-abdominal drain surveillance
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Clinical Alerts
            </span>
            <span
              className={`rounded-xl p-1.5 ${
                stats.criticalCount > 0
                  ? "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
                  : "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
              }`}
            >
              <ShieldAlert className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.criticalCount + stats.highCount}
            </span>
            {stats.criticalCount > 0 && (
              <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                {stats.criticalCount} Critical
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {stats.criticalCount + stats.highCount === 0 ? "All patients stable" : "Requires clinical review"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Task Adherence
            </span>
            <span className="rounded-xl bg-emerald-50 p-1.5 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.adherenceRate}%
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {stats.completedTasksToday} of {stats.totalTasksToday} daily tasks logged
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient name, MRN, or procedure..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:ring-indigo-900/40"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedPathway("ALL")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              selectedPathway === "ALL"
                ? "bg-slate-900 text-white shadow-2xs dark:bg-white dark:text-slate-900"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            All ({roster.length})
          </button>

          <button
            onClick={() => setSelectedPathway("PANCREATIC")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              selectedPathway === "PANCREATIC"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            Pancreatic ({stats.pancreaticCount})
          </button>

          <button
            onClick={() => setSelectedPathway("HEPATIC")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              selectedPathway === "HEPATIC"
                ? "bg-sky-600 text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            Hepatic ({stats.hepaticCount})
          </button>

          <button
            onClick={() => setSelectedPathway("BILIARY")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              selectedPathway === "BILIARY"
                ? "bg-amber-600 text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            Biliary ({stats.biliaryCount})
          </button>

          <button
            onClick={() => setSelectedPathway("ALERTS_ONLY")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              selectedPathway === "ALERTS_ONLY"
                ? "bg-rose-600 text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            Alerts ({stats.criticalCount + stats.highCount})
          </button>

          <button
            onClick={() => setSelectedPathway("DRAINS_ACTIVE")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              selectedPathway === "DRAINS_ACTIVE"
                ? "bg-cyan-700 text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            Drains ({stats.drainsActiveCount})
          </button>
        </div>
      </div>

      {/* Roster Cards Grid */}
      {loading ? (
        <div className="flex h-56 flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
          <RefreshCw className="h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400" />
          <span className="mt-2.5 text-xs font-medium text-slate-500">Loading care plans...</span>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <p className="font-bold">Error loading roster: {error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400">
            <HeartPulse className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
            {searchQuery ? "No matching care plans found" : "No active care plans"}
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            {searchQuery
              ? `No patients match "${searchQuery}". Try a different keyword.`
              : "Start a recovery plan for your surgical patients to track daily tasks, drain outputs, and clinical recovery milestones."}
          </p>

          <div className="mt-5 flex justify-center">
            <button
              onClick={() => setIsCreateOpen(true)}
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700 active:scale-95"
            >
              <Plus className="h-4 w-4" /> Start a care plan
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((item) => (
            <CleanRosterCard key={item.id} item={item} onSelect={() => onSelectPlan?.(item.id)} />
          ))}
        </div>
      )}

      {/* Start Care Plan Modal */}
      {isBuilderOpen ? (
        <CarePlanTemplateBuilder onClose={() => { setIsBuilderOpen(false); void loadRoster(); }} />
      ) : null}

      <CreateCarePlanModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(planId) => {
          setIsCreateOpen(false);
          void loadRoster();
          onSelectPlan?.(planId);
        }}
      />
    </div>
  );
}

function CleanRosterCard({
  item,
  onSelect,
}: {
  item: CarePlanRosterItem;
  onSelect: () => void;
}) {
  const isCritical = item.highestAlertSeverity === "CRITICAL";
  const isHigh = item.highestAlertSeverity === "HIGH";

  const categoryLabel = item.category
    .replace(/_RECOVERY|_POSTOP|_SURG/g, "")
    .replace(/_/g, " ");

  return (
    <div
      onClick={onSelect}
      className={`group relative flex cursor-pointer flex-col justify-between rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-md ${
        isCritical
          ? "border-rose-300 bg-gradient-to-br from-rose-50/70 via-white to-white shadow-2xs dark:border-rose-900/60 dark:from-rose-950/20 dark:to-slate-900"
          : isHigh
            ? "border-amber-300 bg-gradient-to-br from-amber-50/70 via-white to-white shadow-2xs dark:border-amber-900/60 dark:from-amber-950/20 dark:to-slate-900"
            : "border-slate-200/90 bg-white shadow-2xs hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900"
      }`}
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {categoryLabel}
          </span>

          {isCritical ? (
            <span className="inline-flex animate-pulse items-center rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-2xs">
              <ShieldAlert className="mr-1 h-3 w-3" /> Critical Alert
            </span>
          ) : isHigh ? (
            <span className="inline-flex items-center rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-2xs">
              <AlertTriangle className="mr-1 h-3 w-3" /> High Alert
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <CheckCircle2 className="mr-1 h-3 w-3" /> On Track
            </span>
          )}
        </div>

        {/* Patient Name & Title */}
        <div className="mt-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition dark:text-white dark:group-hover:text-indigo-400">
              {item.patientName}
            </h3>
            <span className="text-[11px] font-mono font-semibold text-slate-400">
              {item.patientNumber}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
            {item.title}
          </p>
        </div>

        {/* Timeline & Task Adherence */}
        <div className="mt-3.5 space-y-2 rounded-xl bg-slate-50/90 p-3 text-xs dark:bg-slate-800/60">
          <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-200">
            <span className="flex items-center text-indigo-700 dark:text-indigo-300">
              <Calendar className="mr-1.5 h-3.5 w-3.5" /> Day {item.currentDayNumber} of {item.totalDays}
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              Stage {item.currentStage} of {item.totalStages}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Today&apos;s Tasks:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {item.todayCompletedTasks} / {item.todayTotalTasks} completed
            </span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                item.todayCompletedTasks === item.todayTotalTasks && item.todayTotalTasks > 0
                  ? "bg-emerald-500"
                  : "bg-indigo-600"
              }`}
              style={{
                width: `${item.todayTotalTasks > 0 ? (item.todayCompletedTasks / item.todayTotalTasks) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Clinical Observations Chips */}
        <div className="mt-3 space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
          {item.lastDrainSummary && (
            <div className="flex items-center truncate">
              <Droplet className="mr-1.5 h-3.5 w-3.5 shrink-0 text-cyan-600" />
              <span className="truncate">Drain: {item.lastDrainSummary}</span>
            </div>
          )}
          {item.lastVitalsSummary && (
            <div className="flex items-center truncate">
              <HeartPulse className="mr-1.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
              <span className="truncate">{item.lastVitalsSummary}</span>
            </div>
          )}
          {item.lastWoundSummary && (
            <div className="flex items-center truncate">
              <Activity className="mr-1.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span className="truncate">Incision: {item.lastWoundSummary}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Doctor & Link */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
        <span className="flex items-center text-[11px] text-slate-400">
          <Stethoscope className="mr-1 h-3.5 w-3.5 text-slate-400" />
          {item.managingDoctorName || "Managing Surgeon"}
        </span>

        <span className="inline-flex items-center font-bold text-indigo-600 transition group-hover:translate-x-0.5 dark:text-indigo-400">
          View Detail <ArrowRight className="ml-1 h-3 w-3" />
        </span>
      </div>
    </div>
  );
}
