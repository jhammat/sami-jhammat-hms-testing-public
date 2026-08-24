"use client";

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  HeartPulse,
  History,
  Info,
  LineChart,
  Plus,
  RefreshCw,
  Sparkles,
  Thermometer,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type ClinicalObservationSummary,
  type VitalCodeDefinition,
  SUPPORTED_VITALS,
} from "@wonflow/contracts";

export function PatientVitalsLogger() {
  const [observations, setObservations] = useState<ClinicalObservationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [selectedVitalKey, setSelectedVitalKey] = useState<string>("blood_pressure_systolic");
  const [numericValue, setNumericValue] = useState<string>("120");
  const [secondaryValue, setSecondaryValue] = useState<string>("80"); // for diastolic if BP
  const [confirmedImplausible, setConfirmedImplausible] = useState<boolean>(false);

  const currentVital: VitalCodeDefinition = SUPPORTED_VITALS[selectedVitalKey] || SUPPORTED_VITALS.blood_pressure_systolic!;

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/v1/patient/observations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load observation history.");
      const data = (await res.json()) as { observations: ClinicalObservationSummary[] };
      setObservations(data.observations || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading records");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const res = await fetch("/api/v1/patient/observations", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load records.");
        const data = (await res.json()) as { observations: ClinicalObservationSummary[] };
        if (mounted) {
          setObservations(data.observations || []);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Error loading records");
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Find last reading for the selected vital
  const lastReading = useMemo(() => {
    return observations.find((o) => o.code === selectedVitalKey);
  }, [observations, selectedVitalKey]);

  // Plausibility check
  const valNum = Number(numericValue);
  const isOutsideSensible =
    !isNaN(valNum) &&
    (valNum < currentVital.sensibleMin || valNum > currentVital.sensibleMax);

  const handleVitalChange = (key: string) => {
    setSelectedVitalKey(key);
    setConfirmedImplausible(false);
    setSuccessMessage(null);
    const def = SUPPORTED_VITALS[key];
    if (def) {
      const mid = Math.round((def.sensibleMin + def.sensibleMax) / 2);
      setNumericValue(String(mid));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(valNum)) return;

    if (isOutsideSensible && !confirmedImplausible) {
      setConfirmedImplausible(true);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      // If BP, record both systolic and diastolic
      if (selectedVitalKey === "blood_pressure_systolic") {
        await fetch("/api/v1/patient/observations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: "blood_pressure_systolic",
            display: "Systolic Blood Pressure",
            valueNumber: valNum,
            unit: "mmHg",
          }),
        });

        const diasNum = Number(secondaryValue);
        if (!isNaN(diasNum)) {
          await fetch("/api/v1/patient/observations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: "blood_pressure_diastolic",
              display: "Diastolic Blood Pressure",
              valueNumber: diasNum,
              unit: "mmHg",
            }),
          });
        }
      } else {
        await fetch("/api/v1/patient/observations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: currentVital.code,
            display: currentVital.display,
            valueNumber: valNum,
            unit: currentVital.unit,
          }),
        });
      }

      setSuccessMessage(`${currentVital.display} recorded securely.`);
      setConfirmedImplausible(false);
      await loadHistory();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record observation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center space-x-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md">
            <HeartPulse className="size-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Record Vitals & Health Metrics</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Log daily physiological readings directly to your hospital clinical chart.
            </p>
          </div>
        </div>
      </div>

      {/* Vital Selector Chips */}
      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {Object.entries(SUPPORTED_VITALS).map(([key, def]) => {
          const isSelected = selectedVitalKey === key;
          return (
            <button
              key={key}
              onClick={() => handleVitalChange(key)}
              className={`flex-shrink-0 rounded-2xl px-4 py-2.5 text-xs font-bold transition shadow-xs ${
                isSelected
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {def.display}
            </button>
          );
        })}
      </div>

      {/* Main Entry Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-black uppercase text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                {currentVital.code.replace(/_/g, " ")}
              </span>
              <h3 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                {currentVital.display}
              </h3>
              <p className="text-xs text-slate-500">
                Expected standard range: {currentVital.sensibleMin} – {currentVital.sensibleMax} {currentVital.unit}
              </p>
            </div>

            {lastReading && (
              <div className="rounded-2xl bg-slate-50 p-3.5 text-right text-xs dark:bg-slate-800/60">
                <span className="text-[10px] font-bold text-slate-400">Previous Reading</span>
                <p className="font-black text-slate-900 dark:text-white">
                  {lastReading.valueNumber} {lastReading.unit}
                </p>
                <span className="text-[10px] text-slate-400">
                  {new Date(lastReading.observedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {/* Large Input Surface */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-800/40">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                {selectedVitalKey === "blood_pressure_systolic" ? "Systolic (mmHg)" : `Reading (${currentVital.unit})`}
              </label>
              <div className="mt-2 flex items-center space-x-3">
                <input
                  type="number"
                  step={currentVital.step}
                  value={numericValue}
                  onChange={(e) => {
                    setNumericValue(e.target.value);
                    setConfirmedImplausible(false);
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-3xl font-black text-slate-900 focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <span className="text-sm font-bold text-slate-400">{currentVital.unit}</span>
              </div>
            </div>

            {selectedVitalKey === "blood_pressure_systolic" && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-800/40">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                  Diastolic (mmHg)
                </label>
                <div className="mt-2 flex items-center space-x-3">
                  <input
                    type="number"
                    value={secondaryValue}
                    onChange={(e) => setSecondaryValue(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-3xl font-black text-slate-900 focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <span className="text-sm font-bold text-slate-400">mmHg</span>
                </div>
              </div>
            )}
          </div>

          {/* Plausibility Warning Notice */}
          {isOutsideSensible && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                <div>
                  <h4 className="font-bold">Please check your entry</h4>
                  <p className="mt-0.5">
                    {valNum} {currentVital.unit} is outside the usual expected range. Please double check the reading from your device before confirming.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Sparkles className="mr-1.5 inline h-4 w-4 text-emerald-600" />
              {successMessage}
            </div>
          )}

          {/* Submit Action */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className={`inline-flex min-h-12 items-center rounded-2xl px-6 py-3 text-sm font-black text-white shadow-md transition active:scale-98 disabled:opacity-50 ${
                isOutsideSensible && !confirmedImplausible
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {submitting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : isOutsideSensible && !confirmedImplausible ? (
                <>
                  <AlertTriangle className="mr-2 h-4 w-4" /> Check & Confirm Reading
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Save Vital Reading
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Observation History Feed */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <History className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            <h3 className="text-base font-black text-slate-900 dark:text-white">Recent Vital Logs</h3>
          </div>
          <span className="text-xs text-slate-400">{observations.length} Recorded</span>
        </div>

        <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {observations.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">No vitals logged yet.</p>
          ) : (
            observations.slice(0, 10).map((obs) => (
              <div key={obs.id} className="flex items-center justify-between py-3">
                <div className="flex items-center space-x-3">
                  <span className="grid size-8 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                    <Activity className="size-4" />
                  </span>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">{obs.display}</h5>
                    <span className="text-[10px] text-slate-400">
                      {new Date(obs.observedAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })} • Source: {obs.source}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {obs.valueNumber} <span className="text-xs font-medium text-slate-400">{obs.unit}</span>
                  </span>
                  <p className="text-[10px] uppercase font-bold text-emerald-600">
                    {obs.status}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
