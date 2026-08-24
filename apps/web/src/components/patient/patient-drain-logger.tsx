"use client";

import {
  AlertCircle,
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronDown,
  Droplets,
  History,
  Plus,
  RefreshCw,
  Sparkles,
  TestTube2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  type DrainCharacter,
  type DrainColour,
  type PatientDrainSummary,
  DRAIN_COLOUR_SWATCHES,
} from "@wonflow/contracts";

export function PatientDrainLogger() {
  const [drains, setDrains] = useState<PatientDrainSummary[]>([]);
  const [selectedDrainId, setSelectedDrainId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [volumeMl, setVolumeMl] = useState<number>(50);
  const [colour, setColour] = useState<DrainColour>("PALE_YELLOW");
  const [character, setCharacter] = useState<DrainCharacter>("SEROUS");
  const [hasAmylase, setHasAmylase] = useState<boolean>(false);
  const [amylaseValue, setAmylaseValue] = useState<string>("");
  const [amylaseSource, setAmylaseSource] = useState<"PATIENT_REPORTED" | "LAB_CONFIRMED">("PATIENT_REPORTED");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>("");

  const loadDrains = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/v1/patient/drains", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load active drains.");
      const data = (await res.json()) as { drains: PatientDrainSummary[] };
      setDrains(data.drains || []);
      if (data.drains?.length && !selectedDrainId) {
        setSelectedDrainId(data.drains[0]!.id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading drains");
    } finally {
      setLoading(false);
    }
  }, [selectedDrainId]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const res = await fetch("/api/v1/patient/drains", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load drains.");
        const data = (await res.json()) as { drains: PatientDrainSummary[] };
        if (mounted) {
          setDrains(data.drains || []);
          if (data.drains?.length) {
            setSelectedDrainId(data.drains[0]!.id);
          }
          setLoading(false);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Error loading drains");
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const activeDrain = drains.find((d) => d.id === selectedDrainId);

  const handlePresetVolume = (delta: number) => {
    setVolumeMl((prev) => Math.max(0, prev + delta));
  };

  const handleSimulatePhoto = () => {
    setPhotoPreview("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><rect width='120' height='120' fill='%23fef08a'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='12' fill='%23713f12'>Drain Fluid</text></svg>");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDrainId) return;

    try {
      setSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      const payload = {
        volumeMl,
        colour,
        character,
        amylaseValue: hasAmylase && amylaseValue ? Number(amylaseValue) : undefined,
        amylaseUnit: hasAmylase && amylaseValue ? "U/L" : undefined,
        amylaseSource: hasAmylase && amylaseValue ? amylaseSource : undefined,
        notes: notes.trim() || undefined,
      };

      const res = await fetch(`/api/v1/patient/drains/${selectedDrainId}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(errData.message || "Failed to submit drain log.");
      }

      setSuccessMessage(`Drain output recorded successfully (${volumeMl} mL).`);
      setNotes("");
      setPhotoPreview(null);
      await loadDrains();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error logging output");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && drains.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-teal-600" />
      </div>
    );
  }

  if (drains.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <Droplets className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
        <h3 className="mt-3 text-lg font-black text-slate-900 dark:text-white">No Active Drains</h3>
        <p className="mt-1 text-xs text-slate-500">
          You currently do not have any active surgical drains registered in your care plan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center space-x-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md">
            <Droplets className="size-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Surgical Drain Output Logger</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Log daily volume, fluid color, and characteristics for your surgical care team.
            </p>
          </div>
        </div>

        {/* Drain Tabs (if multi-drain) */}
        {drains.length > 1 && (
          <div className="mt-4 flex space-x-2 overflow-x-auto border-t border-slate-100 pt-4 dark:border-slate-800">
            {drains.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  setSelectedDrainId(d.id);
                  setSuccessMessage(null);
                }}
                className={`rounded-2xl px-4 py-2 text-xs font-bold transition ${
                  selectedDrainId === d.id
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {d.label} ({d.site})
              </button>
            ))}
          </div>
        )}
      </div>

      {activeDrain && (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
          {/* Volume Keypad Section */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <span className="rounded-md bg-teal-100 px-2 py-0.5 text-[10px] font-black uppercase text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                  {activeDrain.site}
                </span>
                <h3 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                  Drain Output Volume (mL)
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Last 24h Total</span>
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  {activeDrain.last24hVolumeMl ?? 0} mL
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center justify-center space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  min="0"
                  max="3000"
                  step="5"
                  value={volumeMl}
                  onChange={(e) => setVolumeMl(Number(e.target.value))}
                  className="w-44 rounded-2xl border-2 border-teal-500 bg-teal-50/20 py-4 text-center text-4xl font-black text-slate-900 focus:outline-none dark:bg-slate-800 dark:text-white"
                />
                <span className="text-xl font-bold text-slate-400">mL</span>
              </div>

              {/* Quick Stepper Buttons */}
              <div className="flex flex-wrap justify-center gap-2">
                {[-50, -10, 10, 25, 50, 100].map((delta) => (
                  <button
                    key={delta}
                    type="button"
                    onClick={() => handlePresetVolume(delta)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {delta > 0 ? `+${delta}` : delta}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Visual Colour Swatches */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h4 className="text-sm font-black text-slate-900 dark:text-white">
              Fluid Colour Appearance
            </h4>
            <p className="text-xs text-slate-500">
              Select the swatch that best matches the fluid in your drainage collection bulb/bag.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-7">
              {Object.values(DRAIN_COLOUR_SWATCHES).map((swatch) => {
                const isSelected = colour === swatch.code;
                return (
                  <button
                    key={swatch.code}
                    type="button"
                    onClick={() => setColour(swatch.code)}
                    className={`flex flex-col items-center rounded-2xl border-2 p-3 text-center transition ${
                      isSelected
                        ? "border-teal-600 bg-teal-50/50 shadow-md dark:border-teal-400 dark:bg-teal-950/40"
                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/60"
                    }`}
                  >
                    <div
                      className="size-8 rounded-full border border-slate-300 shadow-inner"
                      style={{ backgroundColor: swatch.hex }}
                    />
                    <span className="mt-2 text-xs font-bold text-slate-900 dark:text-white">
                      {swatch.display}
                    </span>
                    <span className="mt-1 text-[10px] text-slate-400 leading-tight">
                      {swatch.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fluid Character & Amylase */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                Fluid Character
              </h4>
              <p className="text-xs text-slate-500">Consistency or medical description</p>

              <div className="mt-4 grid grid-cols-1 gap-2">
                {[
                  { code: "SEROUS", label: "Serous (Clear / watery)" },
                  { code: "SEROSANGUINOUS", label: "Serosanguinous (Thin, pink / red)" },
                  { code: "PURULENT", label: "Purulent (Cloudy, thick, yellow / white)" },
                  { code: "BILIOUS", label: "Bilious (Dark green / golden bile)" },
                  { code: "CHYLOUS", label: "Chylous (Milky lymphatic fluid)" },
                ].map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => setCharacter(item.code as DrainCharacter)}
                    className={`rounded-xl border p-3 text-left text-xs font-bold transition ${
                      character === item.code
                        ? "border-teal-600 bg-teal-50 text-teal-900 dark:border-teal-400 dark:bg-teal-950/40 dark:text-teal-200"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TestTube2 className="size-4 text-teal-600" />
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    Drain Amylase Test (Optional)
                  </h4>
                </div>
                <input
                  type="checkbox"
                  checked={hasAmylase}
                  onChange={(e) => setHasAmylase(e.target.checked)}
                  className="size-4 rounded accent-teal-600"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                If your doctor requested a drain fluid enzyme test.
              </p>

              {hasAmylase && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                      Amylase Value (U/L)
                    </label>
                    <input
                      type="number"
                      value={amylaseValue}
                      onChange={(e) => setAmylaseValue(e.target.value)}
                      placeholder="e.g. 150"
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-sm font-bold focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                      Result Source
                    </label>
                    <div className="mt-1 flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setAmylaseSource("PATIENT_REPORTED")}
                        className={`flex-1 rounded-xl py-2 text-xs font-bold ${
                          amylaseSource === "PATIENT_REPORTED"
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        Patient Reported
                      </button>
                      <button
                        type="button"
                        onClick={() => setAmylaseSource("LAB_CONFIRMED")}
                        className={`flex-1 rounded-xl py-2 text-xs font-bold ${
                          amylaseSource === "LAB_CONFIRMED"
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        Lab Confirmed
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Photo Upload Simulation */}
              <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                  Drain Photo (Optional)
                </label>
                <div className="mt-2 flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={handleSimulatePhoto}
                    className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Camera className="mr-1.5 h-4 w-4 text-teal-600" /> Attach Photo
                  </button>
                  {photoPreview && (
                    <span className="text-xs font-bold text-emerald-600">✓ Photo attached</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
              Additional Notes for Surgical Team
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Emptied at 8:00 PM, bulb re-compressed on suction."
              className="mt-2 w-full rounded-2xl border border-slate-200 p-3 text-xs focus:border-teal-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800/40"
            />
          </div>

          {/* Success Message */}
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

          {/* Submit Action */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-12 items-center rounded-2xl bg-teal-600 px-6 py-3 text-sm font-black text-white shadow-md transition hover:bg-teal-700 active:scale-98 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Save Drain Output
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
