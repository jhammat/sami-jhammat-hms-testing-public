"use client";

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Clock,
  Droplets,
  HeartPulse,
  Info,
  Pill,
  RefreshCw,
  SlidersHorizontal,
  Thermometer,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CombinedRecoveryTimelineItem } from "@wonflow/contracts";

interface ClinicianRecoveryTimelineProps {
  patientId: string;
  patientName?: string;
}

export function ClinicianRecoveryTimeline({
  patientId,
  patientName,
}: ClinicianRecoveryTimelineProps) {
  const [timeline, setTimeline] = useState<CombinedRecoveryTimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"ALL" | "SYMPTOM" | "VITAL" | "DRAIN">("ALL");
  const [error, setError] = useState<string | null>(null);

  const loadTimeline = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/patients/${patientId}/recovery-timeline`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load recovery timeline.");
      const data = (await res.json()) as { timeline: CombinedRecoveryTimelineItem[] };
      setTimeline(data.timeline || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading timeline");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const res = await fetch(`/api/v1/patients/${patientId}/recovery-timeline`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to load timeline.");
        const data = (await res.json()) as { timeline: CombinedRecoveryTimelineItem[] };
        if (mounted) {
          setTimeline(data.timeline || []);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Error loading timeline");
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [patientId]);

  const filteredItems = useMemo(() => {
    if (filterType === "ALL") return timeline;
    return timeline.filter((item) => item.itemType === filterType);
  }, [timeline, filterType]);

  const criticalCount = useMemo(() => {
    return timeline.filter((item) => item.severityLevel === "CRITICAL").length;
  }, [timeline]);

  const warningCount = useMemo(() => {
    return timeline.filter((item) => item.severityLevel === "WARNING").length;
  }, [timeline]);

  if (loading && timeline.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center">
        <div>
          <div className="flex items-center space-x-2">
            <span className="grid size-9 place-items-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400">
              <Clock className="size-5" />
            </span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              Combined Recovery Timeline
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {patientName ? `Patient: ${patientName} • ` : ""}
            Unified chronological telemetry across vitals, surgical drains, and symptom logs (e.g. fever alongside rising drain amylase).
          </p>
        </div>

        {/* Severity Badges & Refresh */}
        <div className="flex items-center space-x-3">
          {criticalCount > 0 && (
            <span className="inline-flex items-center rounded-xl bg-rose-100 px-3 py-1 text-xs font-black text-rose-800 dark:bg-rose-950 dark:text-rose-300">
              <AlertCircle className="mr-1.5 h-4 w-4" /> {criticalCount} Critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="inline-flex items-center rounded-xl bg-amber-100 px-3 py-1 text-xs font-black text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <AlertTriangle className="mr-1.5 h-4 w-4" /> {warningCount} Warnings
            </span>
          )}

          <button
            onClick={() => void loadTimeline()}
            className="rounded-2xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "ALL", label: `All Entries (${timeline.length})` },
          { id: "VITAL", label: `Vitals (${timeline.filter((i) => i.itemType === "VITAL").length})` },
          { id: "DRAIN", label: `Drains (${timeline.filter((i) => i.itemType === "DRAIN").length})` },
          { id: "SYMPTOM", label: `Symptoms (${timeline.filter((i) => i.itemType === "SYMPTOM").length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterType(tab.id as typeof filterType)}
            className={`rounded-2xl px-4 py-2 text-xs font-bold transition ${
              filterType === tab.id
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Timeline Stream */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {filteredItems.length === 0 ? (
          <p className="py-12 text-center text-xs text-slate-400">
            No recovery events recorded for this category yet.
          </p>
        ) : (
          <div className="relative pl-6 before:absolute before:bottom-0 before:left-2.5 before:top-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {filteredItems.map((item) => {
              const date = new Date(item.timestamp);
              const isCritical = item.severityLevel === "CRITICAL";
              const isWarning = item.severityLevel === "WARNING";

              return (
                <div key={item.id} className="relative mb-6 last:mb-0">
                  {/* Timeline bullet */}
                  <span
                    className={`absolute -left-6 top-1.5 grid size-5 place-items-center rounded-full border-2 border-white text-white shadow-xs dark:border-slate-900 ${
                      isCritical
                        ? "bg-rose-600"
                        : isWarning
                          ? "bg-amber-500"
                          : item.itemType === "VITAL"
                            ? "bg-blue-500"
                            : item.itemType === "DRAIN"
                              ? "bg-indigo-500"
                              : "bg-teal-500"
                    }`}
                  >
                    {item.itemType === "VITAL" ? (
                      <Activity className="size-2.5" />
                    ) : item.itemType === "DRAIN" ? (
                      <Droplets className="size-2.5" />
                    ) : (
                      <HeartPulse className="size-2.5" />
                    )}
                  </span>

                  {/* Card */}
                  <div
                    className={`rounded-2xl border p-4 transition ${
                      isCritical
                        ? "border-rose-300 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/30"
                        : isWarning
                          ? "border-amber-300 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/30"
                          : "border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase ${
                            item.itemType === "VITAL"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : item.itemType === "DRAIN"
                                ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                                : "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                          }`}
                        >
                          {item.itemType}
                        </span>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                          {item.title}
                        </h4>
                        {item.subtitle && (
                          <span className="text-xs text-slate-500">• {item.subtitle}</span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {item.valueDisplay && (
                          <span
                            className={`rounded-xl px-2.5 py-1 text-xs font-black ${
                              isCritical
                                ? "bg-rose-600 text-white"
                                : isWarning
                                  ? "bg-amber-600 text-white"
                                  : "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200"
                            }`}
                          >
                            {item.valueDisplay}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {date.toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Source tag & Photo */}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400">
                        Logged by: {item.source}
                      </span>

                      {item.photoData && (
                        <div className="flex items-center space-x-1 text-[10px] text-teal-600">
                          <span>Photo attached</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
