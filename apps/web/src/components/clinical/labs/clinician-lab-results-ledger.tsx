"use client";

import {
  AlertCircle,
  FlaskConical,
  Plus,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  MultiLabTrendGroup,
  StructuredLabResultItem,
} from "@wonflow/contracts";
import { STANDARD_LAB_TESTS } from "@wonflow/contracts";

interface ClinicianLabResultsLedgerProps {
  patientId: string;
  patientName?: string;
}

export function ClinicianLabResultsLedger({
  patientId,
  patientName,
}: ClinicianLabResultsLedgerProps) {
  const [results, setResults] = useState<StructuredLabResultItem[]>([]);
  const [trendGroups, setTrendGroups] = useState<MultiLabTrendGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<string>("Liver Function");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New Lab Entry Modal State
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string>("BILIRUBIN_TOTAL");
  const [valueInput, setValueInput] = useState<string>("");
  const [refLowInput, setRefLowInput] = useState<string>(
    String(STANDARD_LAB_TESTS.BILIRUBIN_TOTAL?.defaultRefLow ?? 0.2),
  );
  const [refHighInput, setRefHighInput] = useState<string>(
    String(STANDARD_LAB_TESTS.BILIRUBIN_TOTAL?.defaultRefHigh ?? 1.2),
  );
  const [facilityInput, setFacilityInput] = useState<string>("In-House Laboratory");
  const [collectedAtInput, setCollectedAtInput] = useState<string>(
    new Date().toISOString().slice(0, 16),
  );
  const [notesInput, setNotesInput] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [resList, resTrends] = await Promise.all([
        fetch(`/api/v1/patients/${patientId}/labs/results`, { credentials: "include" }),
        fetch(`/api/v1/patients/${patientId}/labs/trends`, { credentials: "include" }),
      ]);

      if (!resList.ok || !resTrends.ok) {
        throw new Error("Failed to load laboratory records.");
      }

      const listData = (await resList.json()) as { results: StructuredLabResultItem[] };
      const trendsData = (await resTrends.json()) as { groups: MultiLabTrendGroup[] };

      setResults(listData.results || []);
      setTrendGroups(trendsData.groups || []);
      if (trendsData.groups?.length > 0 && !trendsData.groups.some((g) => g.groupName === activeGroup)) {
        setActiveGroup(trendsData.groups[0]!.groupName);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading labs");
    } finally {
      setLoading(false);
    }
  }, [patientId, activeGroup]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const [resList, resTrends] = await Promise.all([
          fetch(`/api/v1/patients/${patientId}/labs/results`, { credentials: "include" }),
          fetch(`/api/v1/patients/${patientId}/labs/trends`, { credentials: "include" }),
        ]);
        if (!resList.ok || !resTrends.ok) throw new Error("Failed to load labs.");
        const listData = (await resList.json()) as { results: StructuredLabResultItem[] };
        const trendsData = (await resTrends.json()) as { groups: MultiLabTrendGroup[] };
        if (mounted) {
          setResults(listData.results || []);
          setTrendGroups(trendsData.groups || []);
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
  }, [patientId]);

  const selectedDef = STANDARD_LAB_TESTS[selectedCode];

  const handleCodeChange = (code: string) => {
    setSelectedCode(code);
    const def = STANDARD_LAB_TESTS[code];
    if (def) {
      setRefLowInput(String(def.defaultRefLow));
      setRefHighInput(String(def.defaultRefHigh));
    }
  };

  const handleConfirmResult = async (resultId: string) => {
    try {
      setError(null);
      setSuccessMessage(null);
      const res = await fetch(`/api/v1/clinical/labs/results/${resultId}/confirm`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to confirm result.");
      setSuccessMessage("Lab result confirmed by clinician.");
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error confirming result");
    }
  };

  const handleCreateResult = async (e: React.FormEvent) => {
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

      const res = await fetch("/api/v1/clinical/labs/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          code: selectedCode,
          displayName: selectedDef?.name || selectedCode,
          category: selectedDef?.category || "General",
          value: val,
          unit: selectedDef?.unit || "",
          referenceLow: refLowInput ? Number(refLowInput) : selectedDef?.defaultRefLow,
          referenceHigh: refHighInput ? Number(refHighInput) : selectedDef?.defaultRefHigh,
          collectedAt: new Date(collectedAtInput).toISOString(),
          sourceFacility: facilityInput.trim() || undefined,
          notes: notesInput.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(errData.message || "Failed to record lab result.");
      }

      setShowEntryModal(false);
      setValueInput("");
      setNotesInput("");
      setSuccessMessage(`Recorded ${selectedDef?.name || selectedCode}: ${val} ${selectedDef?.unit || ""}`);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving result");
    } finally {
      setSubmitting(false);
    }
  };

  const currentGroupData = useMemo(() => {
    return trendGroups.find((g) => g.groupName === activeGroup);
  }, [trendGroups, activeGroup]);

  if (loading && results.length === 0) {
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
              <FlaskConical className="size-5" />
            </span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              Results Ledger & Lab Trends
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {patientName ? `Patient: ${patientName} • ` : ""}
            Structured diagnostic values, reference ranges, clinician confirmation workflows, and multi-marker telemetry.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => void loadData()}
            className="rounded-2xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowEntryModal(true)}
            className="inline-flex items-center rounded-2xl bg-teal-600 px-4 py-2.5 text-xs font-black text-white shadow-xs hover:bg-teal-700 active:scale-98"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Enter Lab Values
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

      {/* Organ Group Tabs */}
      <div className="flex flex-wrap gap-2">
        {trendGroups.map((g) => (
          <button
            key={g.groupName}
            type="button"
            onClick={() => setActiveGroup(g.groupName)}
            className={`rounded-2xl px-4 py-2 text-xs font-bold transition ${
              activeGroup === g.groupName
                ? "bg-teal-600 text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            }`}
          >
            {g.groupName} ({g.series.length})
          </button>
        ))}
      </div>

      {/* Multi-Marker Trend Graphs */}
      {currentGroupData && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {currentGroupData.series.map((series) => (
            <div
              key={series.code}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    {series.displayName}
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Normal Reference: {series.referenceLow} - {series.referenceHigh} {series.unit}
                  </span>
                </div>

                {series.points.length > 0 && (
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Latest</span>
                    <p className="text-base font-black text-slate-900 dark:text-white">
                      {series.points[series.points.length - 1]!.value} {series.unit}
                    </p>
                  </div>
                )}
              </div>

              {/* Trend Points Feed */}
              <div className="mt-4 space-y-2">
                {series.points.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">No data points</p>
                ) : (
                  series.points.map((p, idx) => {
                    const isAbnormal = p.abnormalFlag !== "NORMAL";
                    const isCritical =
                      p.abnormalFlag === "CRITICAL_HIGH" || p.abnormalFlag === "CRITICAL_LOW";

                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between rounded-xl border p-2.5 text-xs transition ${
                          isCritical
                            ? "border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40"
                            : isAbnormal
                              ? "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40"
                              : "border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold text-slate-500">
                            {new Date(p.date).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span className="font-black text-slate-900 dark:text-white">
                            {p.value} {series.unit}
                          </span>
                          {p.sourceFacility && (
                            <span className="hidden text-[10px] text-slate-400 sm:inline">
                              ({p.sourceFacility})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase ${
                              isCritical
                                ? "bg-rose-600 text-white"
                                : isAbnormal
                                  ? "bg-amber-600 text-white"
                                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            }`}
                          >
                            {p.abnormalFlag.replace(/_/g, " ")}
                          </span>

                          {!p.isConfirmed && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              Patient-Reported
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Structured Lab Results Table */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Diagnostic Results Ledger ({results.length})
          </h3>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 dark:border-slate-800">
                <th className="py-2.5">Date</th>
                <th className="py-2.5">Test Name</th>
                <th className="py-2.5">Value</th>
                <th className="py-2.5">Reference Range</th>
                <th className="py-2.5">Flag</th>
                <th className="py-2.5">Facility / Source</th>
                <th className="py-2.5">Status</th>
                <th className="py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {results.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No diagnostic laboratory results recorded yet.
                  </td>
                </tr>
              ) : (
                results.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 font-bold text-slate-600 dark:text-slate-300">
                      {new Date(r.collectedAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 font-black text-slate-900 dark:text-white">
                      {r.displayName}
                    </td>
                    <td className="py-3 font-black text-slate-900 dark:text-white">
                      {r.value} {r.unit}
                    </td>
                    <td className="py-3 text-slate-500">
                      {r.referenceLow} - {r.referenceHigh} {r.unit}
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                          r.abnormalFlag === "CRITICAL_HIGH" || r.abnormalFlag === "CRITICAL_LOW"
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            : r.abnormalFlag === "HIGH" || r.abnormalFlag === "LOW"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        }`}
                      >
                        {r.abnormalFlag.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500">{r.sourceFacility || "Internal Lab"}</td>
                    <td className="py-3">
                      {r.isConfirmedByClinician ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          Confirmed
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                          Unconfirmed (Patient)
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {!r.isConfirmedByClinician && (
                        <button
                          type="button"
                          onClick={() => void handleConfirmResult(r.id)}
                          className="rounded-xl bg-teal-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-teal-700"
                        >
                          Confirm
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Entry Modal */}
      {showEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Enter Diagnostic Lab Value
              </h3>
              <button onClick={() => setShowEntryModal(false)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={(e) => void handleCreateResult(e)} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Laboratory Test
                </label>
                <select
                  value={selectedCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                >
                  {Object.values(STANDARD_LAB_TESTS).map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.name} ({t.unit}) — {t.category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Result Value ({selectedDef?.unit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={valueInput}
                    onChange={(e) => setValueInput(e.target.value)}
                    placeholder="e.g. 1.8"
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Collection Date/Time
                  </label>
                  <input
                    type="datetime-local"
                    value={collectedAtInput}
                    onChange={(e) => setCollectedAtInput(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Reference Low
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={refLowInput}
                    onChange={(e) => setRefLowInput(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Reference High
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={refHighInput}
                    onChange={(e) => setRefHighInput(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Source Laboratory / Facility
                </label>
                <input
                  type="text"
                  value={facilityInput}
                  onChange={(e) => setFacilityInput(e.target.value)}
                  placeholder="e.g. Shaukat Khanum, Aga Khan, Chughtai"
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Clinical Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="e.g. Post-ERCP day 2 repeat LFTs"
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="mt-6 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEntryModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-black text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Lab Result"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
