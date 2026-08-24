"use client";

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Droplets,
  FileText,
  Plus,
  RefreshCw,
  Sparkles,
  TestTube2,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type DrainTrendSeries,
  type PatientDrainSummary,
  DRAIN_COLOUR_SWATCHES,
} from "@wonflow/contracts";

interface ClinicianDrainMonitorProps {
  patientId: string;
  patientName?: string;
}

export function ClinicianDrainMonitor({ patientId, patientName }: ClinicianDrainMonitorProps) {
  const [trends, setTrends] = useState<DrainTrendSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showInsertModal, setShowInsertModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState<string | null>(null);

  // Insert form
  const [label, setLabel] = useState("");
  const [site, setSite] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Remove form
  const [removeNotes, setRemoveNotes] = useState("");

  const loadTrends = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/patients/${patientId}/drains/trends`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load drain trend data.");
      const data = (await res.json()) as { trends: DrainTrendSeries[] };
      setTrends(data.trends || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading drain data");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const res = await fetch(`/api/v1/patients/${patientId}/drains/trends`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to load trends.");
        const data = (await res.json()) as { trends: DrainTrendSeries[] };
        if (mounted) {
          setTrends(data.trends || []);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Error loading trends");
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [patientId]);

  const handleInsert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !site.trim()) return;

    try {
      setSaving(true);
      const res = await fetch("/api/v1/clinical/drains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          label: label.trim(),
          site: site.trim(),
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to insert drain.");
      setShowInsertModal(false);
      setLabel("");
      setSite("");
      setNotes("");
      await loadTrends();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating drain");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (drainId: string) => {
    try {
      setSaving(true);
      const res = await fetch(`/api/v1/patients/${patientId}/drains/${drainId}/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: removeNotes.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to remove drain.");
      setShowRemoveModal(null);
      setRemoveNotes("");
      await loadTrends();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error removing drain");
    } finally {
      setSaving(false);
    }
  };

  // Group all unique dates across all drain trend series
  const allDates = useMemo(() => {
    const dates = new Set<string>();
    trends.forEach((t) => {
      t.dailyPoints.forEach((p) => dates.add(p.date));
    });
    return Array.from(dates).sort();
  }, [trends]);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center">
        <div>
          <div className="flex items-center space-x-2">
            <span className="grid size-9 place-items-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400">
              <Droplets className="size-5" />
            </span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              Surgical Drain Progression & Output
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {patientName ? `Patient: ${patientName} • ` : ""}
            Multi-drain stacked volume tracking, colour progression swatches, and ISGPS fistula rules.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => void loadTrends()}
            className="rounded-2xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowInsertModal(true)}
            className="inline-flex items-center rounded-2xl bg-teal-600 px-4 py-2.5 text-xs font-black text-white shadow-md transition hover:bg-teal-700 active:scale-98"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Insert Drain
          </button>
        </div>
      </div>

      {/* Critical Alert Ribbons */}
      {trends.some((t) => t.hasFistulaAlert) && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs font-bold text-rose-900 shadow-sm dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-600" />
            <div>
              <h4 className="text-sm font-black">ISGPS Postoperative Pancreatic Fistula (POPF) Alert</h4>
              <p className="mt-0.5 font-medium">
                Drain amylase output exceeds 300 U/L (&gt;3x serum upper limit of normal). Confirm fistula grade and initiate pancreatic leak management pathway.
              </p>
            </div>
          </div>
        </div>
      )}

      {trends.some((t) => t.hasBileLeakAlert) && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
            <div>
              <h4 className="text-sm font-black">Bilious / Green Output Flagged</h4>
              <p className="mt-0.5 font-medium">
                Biliary-stained drain effluent reported. Evaluate for bile leak, anastomotic dehiscence, or cystic duct leakage.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Drain Stacked Dashboard */}
      {trends.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Droplets className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
          <h4 className="mt-2 text-sm font-black text-slate-900 dark:text-white">No Drains Placed</h4>
          <p className="mt-1 text-xs text-slate-500">
            No surgical drains have been inserted for this patient.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Multi-Drain Daily Stacked Table & Progressions */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h4 className="text-sm font-black text-slate-900 dark:text-white">
              Daily Output & Colour Progression
            </h4>
            <p className="text-xs text-slate-500">
              Stacked volume progression per drain with chronological fluid appearance swatches.
            </p>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="pb-3 font-bold text-slate-400">Drain</th>
                    <th className="pb-3 font-bold text-slate-400">Site</th>
                    <th className="pb-3 font-bold text-slate-400">Status</th>
                    {allDates.map((date) => (
                      <th key={date} className="pb-3 text-center font-bold text-slate-400">
                        {date.slice(5)}
                      </th>
                    ))}
                    <th className="pb-3 text-right font-bold text-slate-400">Total Vol</th>
                    <th className="pb-3 text-right font-bold text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {trends.map((t) => (
                    <tr key={t.drain.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-4 font-bold text-slate-900 dark:text-white">
                        {t.drain.label}
                      </td>
                      <td className="py-4 text-slate-500">{t.drain.site}</td>
                      <td className="py-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                            t.drain.isActive
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {t.drain.isActive ? "In Situ" : "Removed"}
                        </span>
                      </td>

                      {/* Daily Points */}
                      {allDates.map((date) => {
                        const pt = t.dailyPoints.find((p) => p.date === date);
                        const swatch = pt ? DRAIN_COLOUR_SWATCHES[pt.latestColour] : null;

                        return (
                          <td key={date} className="py-4 text-center">
                            {pt ? (
                              <div className="inline-flex flex-col items-center">
                                <div className="flex items-center space-x-1">
                                  <span
                                    className="size-3 rounded-full border border-slate-300 shadow-xs"
                                    style={{ backgroundColor: swatch?.hex }}
                                    title={`Colour: ${swatch?.display}`}
                                  />
                                  <span className="font-black text-slate-900 dark:text-white">
                                    {pt.totalVolumeMl}
                                  </span>
                                  <span className="text-[9px] text-slate-400">mL</span>
                                </div>
                                {pt.maxAmylaseValue !== null && pt.maxAmylaseValue !== undefined && (
                                  <span
                                    className={`mt-0.5 rounded px-1 text-[9px] font-bold ${
                                      pt.maxAmylaseValue > 300
                                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                    }`}
                                  >
                                    Amy: {pt.maxAmylaseValue}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-700">—</span>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-4 text-right font-black text-slate-900 dark:text-white">
                        {t.totalCumulativeVolumeMl} mL
                      </td>

                      <td className="py-4 text-right">
                        {t.drain.isActive && (
                          <button
                            onClick={() => setShowRemoveModal(t.drain.id)}
                            className="rounded-xl border border-rose-200 px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400"
                          >
                            Remove Drain
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Insert Drain Modal */}
      {showInsertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Insert Surgical Drain
              </h3>
              <button onClick={() => setShowInsertModal(false)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={(e) => void handleInsert(e)} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Drain Label / Identifier
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Drain 1, Left Subhepatic"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Anatomical Site / Location
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Morrison's Pouch, Pancreaticojejunostomy bed"
                  value={site}
                  onChange={(e) => setSite(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Operative Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. 19Fr Blake drain placed across PJ anastomosis on active closed suction."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="mt-6 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowInsertModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-black text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {saving ? "Inserting..." : "Insert Drain"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Drain Modal */}
      {showRemoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Mark Drain as Removed
              </h3>
              <button onClick={() => setShowRemoveModal(null)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <p className="text-xs text-slate-500">
                Confirming removal of this surgical drain will close logging and record removal date in the patient chart.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Removal Notes / Reason
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Output <15 mL serous for 48h, amylase normal, drain removed intact with suture closure."
                  value={removeNotes}
                  onChange={(e) => setRemoveNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="mt-6 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRemoveModal(null)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleRemove(showRemoveModal)}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {saving ? "Removing..." : "Confirm Removal"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
