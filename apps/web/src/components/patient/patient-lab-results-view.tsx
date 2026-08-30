"use client";

import {
  AlertCircle,
  CheckCircle2,
  FilePlus,
  FlaskConical,
  Info,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { StructuredLabResultItem } from "@wonflow/contracts";

import { DonutChart, TrendLine, type DonutSlice } from "@/components/charts";
import { STANDARD_LAB_TESTS } from "@wonflow/contracts";

export function PatientLabResultsView() {
  const [results, setResults] = useState<StructuredLabResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Self-entry modal
  const [showModal, setShowModal] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string>("BILIRUBIN_TOTAL");
  const [valueInput, setValueInput] = useState<string>("");
  const [facilityInput, setFacilityInput] = useState<string>("");
  const [collectedAtInput, setCollectedAtInput] = useState<string>(
    new Date().toISOString().slice(0, 16),
  );
  const [notesInput, setNotesInput] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  /**
   * A trend per analyte, each with its own reference range shaded behind
   * it.
   *
   * Deliberately one chart per analyte rather than all of them on one
   * plot: bilirubin, albumin and amylase span wildly different magnitudes,
   * and forcing them onto a shared axis would flatten every line but the
   * largest. Only analytes with at least two results get a chart — a
   * single point is a number, not a trend.
   */
  const analyteTrends = useMemo(() => {
    const byCode = new Map<string, StructuredLabResultItem[]>();

    results.forEach((result) => {
      const bucket = byCode.get(result.code) ?? [];
      bucket.push(result);
      byCode.set(result.code, bucket);
    });

    return [...byCode.entries()]
      .map(([code, items]) => {
        const ordered = [...items].sort(
          (a, b) => new Date(a.collectedAt).getTime() - new Date(b.collectedAt).getTime(),
        );

        const newest = ordered.at(-1)!;

        return {
          code,
          displayName: newest.displayName,
          unit: newest.unit,
          referenceLow: newest.referenceLow,
          referenceHigh: newest.referenceHigh,
          count: ordered.length,
          series: [
            {
              id: code,
              label: newest.displayName,
              color: "var(--viz-1)",
              band: { low: newest.referenceLow, high: newest.referenceHigh },
              points: ordered.map((item) => ({
                label: new Date(item.collectedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                }),
                value: item.value,
              })),
            },
          ],
        };
      })
      .filter((analyte) => analyte.count >= 2)
      .slice(0, 4);
  }, [results]);

  /** Normal versus flagged, across every result on file. */
  const flagMix = useMemo<DonutSlice[]>(() => {
    const counts = new Map<string, number>();

    results.forEach((result) => {
      counts.set(result.abnormalFlag, (counts.get(result.abnormalFlag) ?? 0) + 1);
    });

    const tone: Record<string, string> = {
      NORMAL: "var(--viz-good)",
      LOW: "var(--viz-warning)",
      HIGH: "var(--viz-warning)",
      CRITICAL_LOW: "var(--viz-critical)",
      CRITICAL_HIGH: "var(--viz-critical)",
    };

    return [...counts.entries()].map(([flag, value]) => ({
      id: flag,
      label: flag
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/^./, (character) => character.toUpperCase()),
      value,
      color: tone[flag] ?? "var(--viz-mute-mark)",
    }));
  }, [results]);

  const loadResults = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/v1/patient/labs/results", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load lab results.");
      const data = (await res.json()) as { results: StructuredLabResultItem[] };
      setResults(data.results || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading labs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const res = await fetch("/api/v1/patient/labs/results", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load lab results.");
        const data = (await res.json()) as { results: StructuredLabResultItem[] };
        if (mounted) {
          setResults(data.results || []);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Error loading labs");
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedDef = STANDARD_LAB_TESTS[selectedCode];

  const handleSelfEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(valueInput);
    if (isNaN(val)) {
      setError("Please enter a valid numeric value.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch("/api/v1/patient/labs/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: selectedCode,
          displayName: selectedDef?.name || selectedCode,
          category: selectedDef?.category || "General",
          value: val,
          unit: selectedDef?.unit || "",
          referenceLow: selectedDef?.defaultRefLow,
          referenceHigh: selectedDef?.defaultRefHigh,
          collectedAt: new Date(collectedAtInput).toISOString(),
          sourceFacility: facilityInput.trim() || undefined,
          notes: notesInput.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(errData.message || "Failed to record lab result.");
      }

      setShowModal(false);
      setValueInput("");
      setNotesInput("");
      setFacilityInput("");
      setSuccessMessage(
        `Recorded ${selectedDef?.name || selectedCode}: ${val} ${selectedDef?.unit || ""}. Your surgical team will review it.`,
      );
      await loadResults();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving lab result");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && results.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center">
        <div>
          <div className="flex items-center space-x-2">
            <span className="grid size-9 place-items-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400">
              <FlaskConical className="size-5" />
            </span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              My Lab Results & Blood Tests
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Track your liver function, blood counts, and inflammatory markers over time.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center rounded-2xl bg-teal-600 px-4 py-2.5 text-xs font-black text-white shadow-xs hover:bg-teal-700 active:scale-98"
        >
          <FilePlus className="mr-1.5 h-4 w-4" /> Enter Lab Report Values
        </button>
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

      {results.length > 0 ? (
        <div className="grid gap-5 lg:grid-cols-3">
          <DonutChart
            title="Results in and out of range"
            subtitle="Across every result on file"
            slices={flagMix}
            centerValue={String(results.length)}
            centerLabel="Results"
            size={168}
            thickness={20}
            emptyMessage="No results yet"
          />

          {analyteTrends.length > 0 ? (
            <div className="grid gap-5 lg:col-span-2 sm:grid-cols-2">
              {analyteTrends.map((analyte) => (
                <TrendLine
                  key={analyte.code}
                  title={analyte.displayName}
                  subtitle={`Normal ${analyte.referenceLow}–${analyte.referenceHigh} ${analyte.unit}`}
                  series={analyte.series}
                  unit={analyte.unit}
                  height={172}
                  emptyMessage="Not enough results yet"
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center lg:col-span-2">
              <p className="max-w-[36ch] text-xs leading-5 text-slate-500">
                Trend charts appear once you have two or more results for the same
                test. One result is a number, not a trend.
              </p>
            </div>
          )}
        </div>
      ) : null}

      {/* Lab Results Feed */}
      <div className="space-y-3">
        {results.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center text-slate-400 dark:border-slate-800">
            <FlaskConical className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-bold">No lab results on file</p>
            <p className="mt-1 text-xs">
              If you have received lab results from a diagnostic centre, tap &ldquo;Enter Lab Report Values&rdquo; above.
            </p>
          </div>
        ) : (
          results.map((r) => {
            const isAbnormal = r.abnormalFlag !== "NORMAL";
            return (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      {r.displayName}
                    </h4>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                        isAbnormal
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      }`}
                    >
                      {isAbnormal ? r.abnormalFlag.replace(/_/g, " ") : "Within Normal Range"}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center space-x-3 text-xs text-slate-400">
                    <span>
                      {new Date(r.collectedAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span>•</span>
                    <span>Ref: {r.referenceLow} - {r.referenceHigh} {r.unit}</span>
                    {r.sourceFacility && (
                      <>
                        <span>•</span>
                        <span>{r.sourceFacility}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-base font-black text-slate-900 dark:text-white">
                    {r.value} <span className="text-xs font-normal text-slate-400">{r.unit}</span>
                  </span>
                  <div>
                    {r.isConfirmedByClinician ? (
                      <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Doctor Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        <Info className="mr-1 h-3 w-3" /> Patient Reported (Pending review)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Self-Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Enter Result from Lab Report
              </h3>
              <button onClick={() => setShowModal(false)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-[11px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              <Info className="mr-1 inline h-3.5 w-3.5" />
              Values you enter are marked as <strong>patient-reported</strong> until your doctor or nurse reviews and confirms them.
            </div>

            <form onSubmit={(e) => void handleSelfEntry(e)} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Test Name
                </label>
                <select
                  value={selectedCode}
                  onChange={(e) => setSelectedCode(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                >
                  {Object.values(STANDARD_LAB_TESTS).map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.name} ({t.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Your Value on Report ({selectedDef?.unit})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={valueInput}
                  onChange={(e) => setValueInput(e.target.value)}
                  placeholder="e.g. 1.4"
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Lab / Diagnostic Center Name
                </label>
                <input
                  type="text"
                  value={facilityInput}
                  onChange={(e) => setFacilityInput(e.target.value)}
                  placeholder="e.g. Chughtai, Aga Khan, Excel"
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Date on Report
                </label>
                <input
                  type="datetime-local"
                  value={collectedAtInput}
                  onChange={(e) => setCollectedAtInput(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="mt-6 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-black text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save to My Records"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
