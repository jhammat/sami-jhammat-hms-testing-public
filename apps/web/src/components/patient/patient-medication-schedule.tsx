"use client";

import {
  AlertCircle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  HeartPulse,
  Info,
  Pill,
  RefreshCw,
  Sparkles,
  Utensils,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { MedicationDoseItem, MedicationScheduleSummary } from "@wonflow/contracts";

import {
  BarChart,
  DonutChart,
  Meter,
  type BarDatum,
  type DonutSlice,
} from "@/components/charts";

export function PatientMedicationScheduleView() {
  const [schedule, setSchedule] = useState<MedicationScheduleSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [actingTaskId, setActingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Skip modal
  const [skipModalTaskId, setSkipModalTaskId] = useState<string | null>(null);
  const [skipReason, setSkipReason] = useState<string>("");

  const loadSchedule = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/v1/patient/medications/schedule", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load medication schedule.");
      const data = (await res.json()) as MedicationScheduleSummary;
      setSchedule(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading schedule");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const res = await fetch("/api/v1/patient/medications/schedule", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load schedule.");
        const data = (await res.json()) as MedicationScheduleSummary;
        if (mounted) {
          setSchedule(data);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Error loading schedule");
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleTake = async (taskId: string) => {
    try {
      setActingTaskId(taskId);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch(`/api/v1/patient/medications/doses/${taskId}/taken`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedAt: new Date().toISOString() }),
      });

      if (!res.ok) throw new Error("Failed to mark dose as taken.");
      setSuccessMessage("Dose recorded as taken.");
      await loadSchedule();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error recording dose");
    } finally {
      setActingTaskId(null);
    }
  };

  const handleSkip = async () => {
    if (!skipModalTaskId || !skipReason.trim()) return;

    try {
      setActingTaskId(skipModalTaskId);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch(`/api/v1/patient/medications/doses/${skipModalTaskId}/skip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: skipReason.trim() }),
      });

      if (!res.ok) throw new Error("Failed to record skip.");
      setSkipModalTaskId(null);
      setSkipReason("");
      setSuccessMessage("Dose recorded as skipped.");
      await loadSchedule();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error recording skip");
    } finally {
      setActingTaskId(null);
    }
  };

  const activeDoseToSkip = useMemo(() => {
    return schedule?.todayDoses.find((d) => d.id === skipModalTaskId);
  }, [schedule, skipModalTaskId]);

  if (loading && !schedule) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-teal-600" />
      </div>
    );
  }

  const doses = schedule?.todayDoses || [];
  const pendingDoses = doses.filter((d) => d.status === "PENDING");
  const completedDoses = doses.filter((d) => d.status === "COMPLETED");
  const skippedOrMissedDoses = doses.filter((d) => d.status === "SKIPPED" || d.status === "MISSED");

  // Dose state is a state, so it wears the status palette rather than
  // categorical hues — "missed" must never look like "just another series".
  const doseMix: DonutSlice[] = [
    {
      id: "COMPLETED",
      label: "Taken",
      value: completedDoses.length,
      color: "var(--viz-good)",
    },
    {
      id: "PENDING",
      label: "Still due",
      value: pendingDoses.length,
      color: "var(--viz-mute-mark)",
    },
    {
      id: "SKIPPED",
      label: "Skipped",
      value: doses.filter((dose) => dose.status === "SKIPPED").length,
      color: "var(--viz-warning)",
    },
    {
      id: "MISSED",
      label: "Missed",
      value: doses.filter((dose) => dose.status === "MISSED").length,
      color: "var(--viz-critical)",
    },
  ];

  const dosesByTimeOfDay: BarDatum[] = (() => {
    const buckets = new Map<string, number>();

    doses.forEach((dose) => {
      const hour = new Date(dose.scheduledFor).getHours();
      const bucket =
        hour < 11 ? "Morning" : hour < 15 ? "Midday" : hour < 19 ? "Evening" : "Night";
      buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
    });

    // Fixed clock order, not whatever order the doses happened to arrive in.
    return ["Morning", "Midday", "Evening", "Night"]
      .filter((bucket) => buckets.has(bucket))
      .map((bucket) => ({
        id: bucket,
        label: bucket,
        value: buckets.get(bucket) ?? 0,
      }));
  })();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md">
              <Pill className="size-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Daily Medication Reminders</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track your prescribed medications, timing, and meal relations with one-tap logging.
              </p>
            </div>
          </div>

          <button
            onClick={() => void loadSchedule()}
            className="rounded-2xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Adherence is one ratio against one limit, so it is a meter —
            not a two-slice pie. The donut beside it does a different job:
            it breaks the day into taken, still due, and missed. */}
        {doses.length > 0 && (
          <div className="mt-6 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
            <Meter
              label="Today's adherence"
              value={completedDoses.length}
              target={doses.length}
              unit="doses"
              caption={`${schedule?.adherencePercentage ?? 100}% of today's doses taken`}
            />
          </div>
        )}
      </div>

      {doses.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <DonutChart
            title="Today's doses"
            subtitle="Where you are up to"
            slices={doseMix}
            centerValue={`${completedDoses.length}/${doses.length}`}
            centerLabel="Taken"
            size={186}
            emptyMessage="No doses scheduled today"
          />

          <BarChart
            title="Doses by time of day"
            subtitle="When your medicines are due"
            data={dosesByTimeOfDay}
            valueFormatter={(value) => `${value}`}
            emptyMessage="No doses scheduled today"
            footnote="Spacing doses evenly matters most for enzyme replacement — each dose goes with food."
          />
        </div>
      ) : null}

      {/* Success Notification */}
      {successMessage && (
        <div className="rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <Sparkles className="mr-1.5 inline h-4 w-4 text-emerald-600" />
          {successMessage}
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div className="rounded-2xl bg-rose-50 p-4 text-xs font-bold text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle className="mr-1.5 inline h-4 w-4 text-rose-600" />
          {error}
        </div>
      )}

      {/* Section 1: Due Now / Pending Doses */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <Clock className="h-5 w-5 text-indigo-600" />
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Upcoming & Due Doses ({pendingDoses.length})
          </h3>
        </div>

        <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {pendingDoses.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">
              {doses.length === 0
                ? "No medicines are scheduled for you today. Doses appear here automatically once a doctor prescribes them — you do not need to add anything yourself."
                : "All caught up. No pending medication doses for today."}
            </p>
          ) : (
            pendingDoses.map((dose) => (
              <div key={dose.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
                <div className="flex items-start space-x-3">
                  <span className="mt-0.5 grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                    {dose.isWithMeals ? <Utensils className="size-4" /> : <Pill className="size-4" />}
                  </span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        {dose.medicationName}
                      </h4>
                      {dose.dose && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {dose.dose}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Scheduled: {new Date(dose.scheduledFor).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {dose.instructions ? ` • ${dose.instructions}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setSkipModalTaskId(dose.id)}
                    disabled={actingTaskId === dose.id}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 disabled:opacity-50"
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleTake(dose.id)}
                    disabled={actingTaskId === dose.id}
                    className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white shadow-xs hover:bg-indigo-700 active:scale-98 disabled:opacity-50"
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" /> Take Now
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Section 2: Taken Today */}
      {completedDoses.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 dark:border-slate-800">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Taken Today ({completedDoses.length})
            </h3>
          </div>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {completedDoses.map((dose) => (
              <div key={dose.id} className="flex items-center justify-between py-3">
                <div className="flex items-center space-x-3">
                  <span className="grid size-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                    <CheckCircle2 className="size-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {dose.medicationName} {dose.dose}
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      Logged at {dose.completedAt ? new Date(dose.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Today"}
                    </span>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Taken
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Skipped or Missed */}
      {skippedOrMissedDoses.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 dark:border-slate-800">
            <Info className="h-5 w-5 text-slate-500" />
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Skipped / Not Taken ({skippedOrMissedDoses.length})
            </h3>
          </div>

          <p className="mt-2 text-[11px] text-slate-400">
            A missed dose is a fact, not a failure. This history helps your clinician adjust your care plan safely.
          </p>

          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {skippedOrMissedDoses.map((dose) => (
              <div key={dose.id} className="flex items-center justify-between py-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {dose.medicationName} {dose.dose}
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    Scheduled for {new Date(dose.scheduledFor).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {dose.skipReason ? ` • Reason: ${dose.skipReason}` : ""}
                  </span>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {dose.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skip Modal */}
      {skipModalTaskId && activeDoseToSkip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Skip Dose: {activeDoseToSkip.medicationName}
              </h3>
              <button onClick={() => setSkipModalTaskId(null)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <p className="text-xs text-slate-500">
                Please select or write a reason so your medical team can monitor your recovery safely:
              </p>

              {/* Quick Reason Pills */}
              <div className="flex flex-wrap gap-2">
                {[
                  "Felt nauseous / upset stomach",
                  "Forgot / away from medication",
                  "Fasting for medical test",
                  "Doctor advised to pause",
                  "Side effects experienced",
                  "Other reason",
                ].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSkipReason(r)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                      skipReason === r
                        ? "border-indigo-600 bg-indigo-50 text-indigo-900 dark:border-indigo-400 dark:bg-indigo-950 dark:text-indigo-200"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Custom Notes
                </label>
                <textarea
                  rows={2}
                  value={skipReason}
                  onChange={(e) => setSkipReason(e.target.value)}
                  placeholder="e.g. Skipped noon dose due to delayed lunch."
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="mt-6 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSkipModalTaskId(null)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!skipReason.trim() || actingTaskId === skipModalTaskId}
                  onClick={() => void handleSkip()}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900"
                >
                  Confirm Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
