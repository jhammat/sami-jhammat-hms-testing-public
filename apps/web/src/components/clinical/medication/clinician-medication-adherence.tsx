"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Info,
  Pill,
  RefreshCw,
  Sparkles,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { MedicationAdherenceSummary } from "@wonflow/contracts";

interface ClinicianMedicationAdherenceProps {
  patientId: string;
  patientName?: string;
}

export function ClinicianMedicationAdherence({
  patientId,
  patientName,
}: ClinicianMedicationAdherenceProps) {
  const [adherenceData, setAdherenceData] = useState<MedicationAdherenceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAdherence = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/patients/${patientId}/medication-adherence`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load medication adherence data.");
      const data = (await res.json()) as { report: MedicationAdherenceSummary[] };
      setAdherenceData(data.report || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading adherence");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const res = await fetch(`/api/v1/patients/${patientId}/medication-adherence`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to load report.");
        const data = (await res.json()) as { report: MedicationAdherenceSummary[] };
        if (mounted) {
          setAdherenceData(data.report || []);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Error loading report");
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [patientId]);

  if (loading && adherenceData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center">
        <div>
          <div className="flex items-center space-x-2">
            <span className="grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Pill className="size-5" />
            </span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              Medication Adherence & Dose Log
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {patientName ? `Patient: ${patientName} • ` : ""}
            Real-time adherence telemetry, scheduled doses, and non-judgmental missed/skipped reasons.
          </p>
        </div>

        <button
          onClick={() => void loadAdherence()}
          className="self-start rounded-2xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 md:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {adherenceData.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Pill className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
          <h4 className="mt-2 text-sm font-black text-slate-900 dark:text-white">No Prescriptions Active</h4>
          <p className="mt-1 text-xs text-slate-500">
            No medication reminder schedules have been generated for this patient yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {adherenceData.map((item) => (
            <div
              key={item.medicationName}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-base font-black text-slate-900 dark:text-white">
                      {item.medicationName}
                    </h4>
                    <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                      {item.dose}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Frequency: {item.frequency.replace(/_/g, " ")} • Total Prescribed: {item.totalPrescribedDoses} doses
                  </p>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400">Adherence Rate</span>
                    <p
                      className={`text-xl font-black ${
                        item.adherenceRate >= 80
                          ? "text-emerald-600"
                          : item.adherenceRate >= 50
                            ? "text-amber-600"
                            : "text-rose-600"
                      }`}
                    >
                      {item.adherenceRate}%
                    </p>
                  </div>

                  <div className="flex space-x-2 text-xs">
                    <span className="rounded-xl bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      ✓ {item.takenDoses} Taken
                    </span>
                    <span className="rounded-xl bg-slate-100 px-2.5 py-1 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      ○ {item.skippedDoses} Skipped
                    </span>
                    {item.missedDoses > 0 && (
                      <span className="rounded-xl bg-rose-50 px-2.5 py-1 font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                        ✕ {item.missedDoses} Missed
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Dose Timeline Ribbon */}
              <div className="mt-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Recent Doses Timeline
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.recentDoses.slice(0, 14).map((d) => {
                    const timeStr = new Date(d.scheduledFor).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={d.id}
                        title={`Scheduled: ${timeStr} • Status: ${d.status}${d.skipReason ? ` (${d.skipReason})` : ""}`}
                        className={`group relative flex items-center space-x-1 rounded-xl px-2.5 py-1 text-[11px] font-bold transition shadow-2xs ${
                          d.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                            : d.status === "SKIPPED"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                              : d.status === "MISSED"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        <span>
                          {d.status === "COMPLETED"
                            ? "✓"
                            : d.status === "SKIPPED"
                              ? "○"
                              : d.status === "MISSED"
                                ? "✕"
                                : "•"}
                        </span>
                        <span>{timeStr.split(",")[1]?.trim() || timeStr}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
