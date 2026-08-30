"use client";

import {
  Activity,
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock,
  Eye,
  HeartPulse,
  Info,
  RefreshCw,
  ShieldAlert,
  SmilePlus,
  Sparkles,
  Thermometer,
  UtensilsCrossed,
  Wind,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DonutChart, TrendLine, type DonutSlice } from "@/components/charts";
import type {
  SymptomDefinition,
  SymptomLogItem,
  SymptomSeverityLevel,
} from "@wonflow/contracts";
import { DEFAULT_HPB_SYMPTOMS } from "@wonflow/contracts";

const iconMap: Record<string, React.ElementType> = {
  Activity,
  SmilePlus,
  AlertOctagon,
  Thermometer,
  UtensilsCrossed,
  AlertTriangle,
  Eye,
  CircleDot,
  ShieldAlert,
  Wind,
};

export function PatientSymptomLogger() {
  const [selectedSymptom, setSelectedSymptom] = useState<SymptomDefinition>(
    DEFAULT_HPB_SYMPTOMS[0]!,
  );
  const [severityScore, setSeverityScore] = useState<number>(3);
  const [freeText, setFreeText] = useState<string>("");
  const [photoData, setPhotoData] = useState<string>("");
  const [recentLogs, setRecentLogs] = useState<SymptomLogItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/v1/patient/symptoms/logs", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch symptom logs.");
      const data = (await res.json()) as { logs: SymptomLogItem[] };
      setRecentLogs(data.logs || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const res = await fetch("/api/v1/patient/symptoms/logs", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load logs.");
        const data = (await res.json()) as { logs: SymptomLogItem[] };
        if (mounted) {
          setRecentLogs(data.logs || []);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Error loading logs");
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const severityLabel = useMemo<SymptomSeverityLevel>(() => {
    if (severityScore >= 9) return "VERY_SEVERE";
    if (severityScore >= 7) return "SEVERE";
    if (severityScore >= 4) return "MODERATE";
    return "MILD";
  }, [severityScore]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch("/api/v1/patient/symptoms/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptomCode: selectedSymptom.code,
          symptomName: selectedSymptom.name,
          severityScore,
          severityLabel,
          freeText: freeText.trim() || undefined,
          photoData: photoData || undefined,
        }),
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(errData.message || "Failed to record symptom.");
      }

      setSuccessMessage(`Logged ${selectedSymptom.name} (${severityLabel}) successfully.`);
      setFreeText("");
      setPhotoData("");
      await loadLogs();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error logging symptom");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhotoData(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const CurrentIcon = iconMap[selectedSymptom.icon] || Activity;

  /**
   * How the selected symptom has been trending, oldest first.
   *
   * Every symptom is scored 0-10, so one axis serves them all — but only
   * one symptom is plotted at a time. Overlaying six symptoms would need
   * six lines the patient has to colour-match, and the question they
   * actually have is "is THIS getting better".
   */
  const severityTrend = useMemo(() => {
    const points = recentLogs
      .filter((log) => log.symptomCode === selectedSymptom.code)
      .slice(0, 21)
      .reverse()
      .map((log) => ({
        label: new Date(log.recordedAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        }),
        value: log.severityScore,
      }));

    return [
      {
        id: selectedSymptom.code,
        label: selectedSymptom.name,
        color: "var(--viz-2)",
        points,
      },
    ];
  }, [recentLogs, selectedSymptom]);

  /** What the patient has been reporting, as a share of all entries. */
  const symptomMix = useMemo<DonutSlice[]>(() => {
    const counts = new Map<string, { label: string; value: number }>();

    recentLogs.forEach((log) => {
      const existing = counts.get(log.symptomCode);
      counts.set(log.symptomCode, {
        label: log.symptomName,
        value: (existing?.value ?? 0) + 1,
      });
    });

    return [...counts.entries()].map(([code, entry]) => ({
      id: code,
      label: entry.label,
      value: entry.value,
    }));
  }, [recentLogs]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md">
              <HeartPulse className="size-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Symptom Log</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Record how you feel anytime. Your clinical team reviews your entries on their monitoring timeline.
              </p>
            </div>
          </div>

          <button
            onClick={() => void loadLogs()}
            className="rounded-2xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <Sparkles className="mr-1.5 inline h-4 w-4 text-emerald-600" />
          {successMessage}
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-rose-50 p-4 text-xs font-bold text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle className="mr-1.5 inline h-4 w-4 text-rose-600" />
          {error}
        </div>
      )}

      {recentLogs.length > 0 ? (
        <div className="grid gap-5 lg:grid-cols-3">
          <TrendLine
            className="lg:col-span-2"
            title={`${selectedSymptom.name} over time`}
            subtitle="Only the symptom you have selected below"
            series={severityTrend}
            yMin={0}
            yMax={10}
            unit="/ 10"
            height={210}
            emptyMessage="You have not logged this symptom yet"
            emptyHint="Choose a different symptom, or log this one below."
            footnote="A line that falls week on week is what your team is hoping to see."
          />

          <DonutChart
            title="What you have reported"
            subtitle="Share of all your entries"
            slices={symptomMix}
            centerLabel="Entries"
            size={168}
            thickness={20}
            emptyMessage="Nothing logged yet"
          />
        </div>
      ) : null}

      {/* 4-Tap Symptom Logger Form */}
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Step 1: Select Symptom Card */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
            Step 1: Pick what you are experiencing
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
            {DEFAULT_HPB_SYMPTOMS.map((sym) => {
              const isSelected = selectedSymptom.code === sym.code;
              const IconComp = iconMap[sym.icon] || Activity;

              return (
                <button
                  key={sym.code}
                  type="button"
                  onClick={() => setSelectedSymptom(sym)}
                  className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition ${
                    isSelected
                      ? "border-teal-600 bg-teal-50/70 text-teal-950 shadow-xs dark:border-teal-400 dark:bg-teal-950/60 dark:text-teal-200"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  <IconComp
                    className={`size-5 ${isSelected ? "text-teal-600 dark:text-teal-400" : "text-slate-500"}`}
                  />
                  <span className="mt-1.5 text-xs font-black leading-tight">{sym.name}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">{selectedSymptom.description}</p>
        </div>

        {/* Step 2: Severity Slider / Scale */}
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Step 2: Severity Level
            </label>
            <span
              className={`rounded-full px-3 py-0.5 text-xs font-black ${
                severityScore >= 9
                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                  : severityScore >= 7
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    : severityScore >= 4
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              }`}
            >
              {severityLabel.replace(/_/g, " ")} ({severityScore}/10)
            </span>
          </div>

          <div className="mt-4">
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={severityScore}
              onChange={(e) => setSeverityScore(Number(e.target.value))}
              className="h-3 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-teal-600 dark:bg-slate-700"
            />
            <div className="mt-2 flex justify-between text-[10px] font-bold text-slate-400">
              <span>0 (None / Minimal)</span>
              <span>3 (Mild)</span>
              <span>6 (Moderate)</span>
              <span>8 (Severe)</span>
              <span>10 (Very Severe)</span>
            </div>
          </div>

          {/* Quick preset chips */}
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { label: "Mild (2)", score: 2 },
              { label: "Moderate (5)", score: 5 },
              { label: "Severe (7)", score: 7 },
              { label: "Very Severe (9)", score: 9 },
            ].map((p) => (
              <button
                key={p.score}
                type="button"
                onClick={() => setSeverityScore(p.score)}
                className={`rounded-xl border px-2.5 py-1 text-[11px] font-bold transition ${
                  severityScore === p.score
                    ? "border-teal-600 bg-teal-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Optional Notes & Photo */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
              Step 3: Optional Description
            </label>
            <textarea
              rows={3}
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="e.g. Started about 2 hours after lunch, felt crampy..."
              className="mt-2 w-full rounded-2xl border border-slate-200 p-3 text-xs focus:border-teal-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
              Optional Photo (e.g. incision, stool, rash)
            </label>
            <div className="mt-2 flex items-center space-x-3">
              <label className="flex cursor-pointer items-center space-x-2 rounded-2xl border border-dashed border-slate-300 p-3 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">
                <Camera className="h-4 w-4 text-teal-600" />
                <span>Upload / Take Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>

              {photoData && (
                <div className="relative size-12 overflow-hidden rounded-xl border border-slate-200">
                  <img
                    src={photoData}
                    alt="Symptom preview"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setPhotoData("")}
                    className="absolute inset-0 bg-black/40 text-[10px] font-black text-white hover:bg-black/60"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Step 4: Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center rounded-2xl bg-teal-600 px-6 py-3 text-xs font-black text-white shadow-md hover:bg-teal-700 active:scale-98 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Saving Log...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Save Symptom Entry
              </>
            )}
          </button>
        </div>
      </form>

      {/* Historical Symptom Logs */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <Clock className="h-5 w-5 text-teal-600" />
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Your Recorded Symptoms ({recentLogs.length})
          </h3>
        </div>

        <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {recentLogs.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">
              No symptoms recorded yet. Use the form above whenever you want to record how you are feeling.
            </p>
          ) : (
            recentLogs.map((log) => (
              <div key={log.id} className="flex items-start justify-between py-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {log.symptomName}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                        log.severityScore >= 9
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          : log.severityScore >= 7
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {log.severityLabel.replace(/_/g, " ")} ({log.severityScore}/10)
                    </span>
                  </div>

                  {log.freeText && (
                    <p className="text-xs text-slate-600 dark:text-slate-300">{log.freeText}</p>
                  )}

                  <span className="text-[10px] text-slate-400">
                    Logged: {new Date(log.recordedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </div>

                {log.photoData && (
                  <img
                    src={log.photoData}
                    alt="Attached symptom"
                    className="size-12 rounded-xl border border-slate-200 object-cover dark:border-slate-800"
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
