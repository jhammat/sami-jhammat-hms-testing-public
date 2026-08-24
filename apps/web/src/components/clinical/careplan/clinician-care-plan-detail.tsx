"use client";

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Droplet,
  HeartPulse,
  Info,
  Layers,
  LineChart,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Thermometer,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CarePlanSummary, CarePlanTaskSummary } from "@wonflow/contracts";
import { ReferralManagerModal } from "@/components/allied/referral-manager-modal";

export function ClinicianCarePlanDetail({
  carePlanId,
  onBack,
}: {
  carePlanId: string;
  onBack: () => void;
}) {
  const [plan, setPlan] = useState<CarePlanSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"timeline" | "trends" | "photos" | "alerts" | "notes">("timeline");

  // Allied Referral Modal
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);

  // Alert dialogs
  const [selectedAlertForAction, setSelectedAlertForAction] = useState<{ id: string; type: "acknowledge" | "resolve" } | null>(null);
  const [alertNote, setAlertNote] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);


  // Progress Note form
  const [newProgressNote, setNewProgressNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Modal photo preview
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const loadPlan = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/clinical/careplans/${carePlanId}`, { credentials: "include" });
      if (!res.ok) {
        throw new Error("Failed to load care plan details.");
      }
      const data = (await res.json()) as CarePlanSummary;
      setPlan(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading plan");
    } finally {
      setLoading(false);
    }
  }, [carePlanId]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const res = await fetch(`/api/v1/clinical/careplans/${carePlanId}`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load plan.");
        const data = (await res.json()) as CarePlanSummary;
        if (mounted) {
          setPlan(data);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Error loading plan");
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [carePlanId]);

  const handleAcknowledgeOrResolve = async () => {
    if (!selectedAlertForAction) return;
    try {
      setActionSubmitting(true);
      const endpoint =
        selectedAlertForAction.type === "acknowledge"
          ? `/api/v1/clinical/careplans/alerts/${selectedAlertForAction.id}/acknowledge`
          : `/api/v1/clinical/careplans/alerts/${selectedAlertForAction.id}/resolve`;

      const body =
        selectedAlertForAction.type === "acknowledge"
          ? { notes: alertNote }
          : { resolutionNotes: alertNote || "Alert reviewed and resolved." };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to update alert.");
      setSelectedAlertForAction(null);
      setAlertNote("");
      await loadPlan();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error updating alert");
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleAddProgressNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProgressNote.trim()) return;
    try {
      setAddingNote(true);
      const res = await fetch(`/api/v1/clinical/careplans/${carePlanId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newProgressNote }),
      });
      if (!res.ok) throw new Error("Failed to add note.");
      setNewProgressNote("");
      await loadPlan();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error adding progress note");
    } finally {
      setAddingNote(false);
    }
  };

  const tasks = useMemo(() => plan?.tasks ?? [], [plan?.tasks]);

  // Group tasks by day
  const tasksByDay = useMemo(() => {
    const map: Record<number, CarePlanTaskSummary[]> = {};
    for (const t of tasks) {
      if (!map[t.dayNumber]) map[t.dayNumber] = [];
      map[t.dayNumber]!.push(t);
    }
    return map;
  }, [tasks]);

  // Extract trend data
  const vitalsTrend = useMemo(() => {
    return tasks
      .filter((t) => t.taskType === "VITALS_LOG" && t.status === "COMPLETED" && t.resultData)
      .map((t) => {
        const d = t.resultData as Record<string, unknown>;
        return {
          dayNumber: t.dayNumber,
          systolic: Number(d.systolic || 120),
          diastolic: Number(d.diastolic || 80),
          heartRate: Number(d.heartRate || 72),
          temperature: Number(d.temperature || 36.6),
          completedAt: t.completedAt,
        };
      });
  }, [tasks]);

  const drainTrend = useMemo(() => {
    return tasks
      .filter((t) => t.taskType === "DRAIN_LOG" && t.status === "COMPLETED" && t.resultData)
      .map((t) => {
        const d = t.resultData as Record<string, unknown>;
        return {
          dayNumber: t.dayNumber,
          volume: Number(d.volume || 45),
          character: String(d.character || "serosanguineous"),
          painScore: Number(d.painScore || 0),
          completedAt: t.completedAt,
        };
      });
  }, [tasks]);

  const woundPhotos = useMemo(() => {
    return tasks
      .filter((t) => t.taskType === "WOUND_PHOTO" && t.status === "COMPLETED" && t.resultData)
      .map((t) => {
        const d = t.resultData as Record<string, unknown>;
        return {
          dayNumber: t.dayNumber,
          completedAt: t.completedAt,
          redness: Boolean(d.redness),
          swelling: Boolean(d.swelling),
          warmth: Boolean(d.warmth),
          discharge: Boolean(d.discharge),
        };
      });
  }, [tasks]);


  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
        <span className="ml-2 text-xs font-medium text-slate-500">Loading clinical plan details...</span>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-xs text-red-700">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <h3 className="font-bold">Error loading care plan</h3>
        </div>
        <p className="mt-1">{error || "Care plan not found."}</p>
        <button
          onClick={onBack}
          className="mt-3 inline-flex items-center rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to Roster
        </button>
      </div>
    );
  }

  const openAlerts = plan.alerts?.filter((a) => a.status === "OPEN" || a.status === "ACKNOWLEDGED") || [];

  return (
    <div className="space-y-6">
      {/* Top Navigation & Header */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Care Plan Roster
          </button>

          <div className="flex items-center space-x-2">
            <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-black uppercase text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {plan.status}
            </span>
            <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Stage {plan.currentStage} of 3
            </span>
          </div>
        </div>

        <div className="mt-2 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">{plan.title}</h1>
            <p className="mt-1 flex items-center text-xs text-slate-500 dark:text-slate-400">
              <Calendar className="mr-1.5 h-3.5 w-3.5" /> Started: {new Date(plan.startDate).toLocaleDateString()} • Category: {plan.category.replace(/_/g, " ")}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsReferralModalOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              + Allied Health Referral
            </button>
            <button
              onClick={() => void loadPlan()}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              title="Refresh Plan"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <ReferralManagerModal
        isOpen={isReferralModalOpen}
        onClose={() => setIsReferralModalOpen(false)}
        patientId={plan.patientId}
        patientName={`Patient #${plan.patientId.slice(0, 8)}`}
        onReferralCreated={() => void loadPlan()}
      />



      {/* Clinical Alerts Banner if any */}
      {openAlerts.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-5 dark:border-rose-900/60 dark:bg-rose-950/30">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-600" />
              <div>
                <h4 className="text-sm font-black text-rose-900 dark:text-rose-200">
                  {openAlerts.length === 1 ? "Active Clinical Alert" : `${openAlerts.length} Active Clinical Alerts`}
                </h4>
                <div className="mt-2 space-y-2">
                  {openAlerts.map((alt) => (
                    <div key={alt.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3 shadow-xs dark:bg-slate-900">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase text-white ${alt.severity === "CRITICAL" ? "bg-rose-600" : "bg-amber-500"}`}>
                            {alt.severity}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{alt.title}</span>
                          <span className="text-[10px] text-slate-400">({new Date(alt.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{alt.message}</p>
                        {alt.resolutionNotes && (
                          <p className="mt-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                            Note: {alt.resolutionNotes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {alt.status === "OPEN" && (
                          <button
                            onClick={() => setSelectedAlertForAction({ id: alt.id, type: "acknowledge" })}
                            className="rounded-lg bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300"
                          >
                            Acknowledge
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedAlertForAction({ id: alt.id, type: "resolve" })}
                          className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          Resolve Alert
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("timeline")}
          className={`flex items-center rounded-xl px-4 py-2 text-xs font-black transition ${
            activeTab === "timeline"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          <Calendar className="mr-1.5 h-4 w-4" /> Timeline & Tasks ({plan.tasks?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab("trends")}
          className={`flex items-center rounded-xl px-4 py-2 text-xs font-black transition ${
            activeTab === "trends"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          <LineChart className="mr-1.5 h-4 w-4" /> Clinical Trends ({vitalsTrend.length + drainTrend.length})
        </button>

        <button
          onClick={() => setActiveTab("photos")}
          className={`flex items-center rounded-xl px-4 py-2 text-xs font-black transition ${
            activeTab === "photos"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          <Camera className="mr-1.5 h-4 w-4" /> Wound Photos ({woundPhotos.length})
        </button>

        <button
          onClick={() => setActiveTab("notes")}
          className={`flex items-center rounded-xl px-4 py-2 text-xs font-black transition ${
            activeTab === "notes"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          <MessageSquare className="mr-1.5 h-4 w-4" /> Progress Notes ({plan.progressNotes?.length || 0})
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {/* Timeline Tab */}
        {activeTab === "timeline" && (
          <div className="space-y-4">
            {Object.keys(tasksByDay).map((dayStr) => {
              const day = Number(dayStr);
              const dayTasks = tasksByDay[day] || [];
              const completedCount = dayTasks.filter((t) => t.status === "COMPLETED").length;

              return (
                <div
                  key={day}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex items-center space-x-2">
                      <span className="rounded-lg bg-emerald-600 px-2.5 py-0.5 text-xs font-black text-white">
                        Day {day}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {completedCount} of {dayTasks.length} Tasks Completed
                      </span>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 p-2 dark:divide-slate-800">
                    {dayTasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-3">
                        <div className="flex items-center space-x-3">
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                              task.status === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {task.status === "COMPLETED" ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                          </span>
                          <div>
                            <h5 className="text-xs font-bold text-slate-900 dark:text-white">{task.title}</h5>
                            <p className="text-[10px] text-slate-500">
                              Scheduled: {new Date(task.scheduledFor).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              {task.completedAt && ` • Done: ${new Date(task.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                            </p>
                          </div>
                        </div>

                        <div>
                          {task.resultData ? (
                            <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {JSON.stringify(task.resultData).slice(0, 45)}...
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-slate-400">{task.status}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Clinical Trends Tab */}
        {activeTab === "trends" && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Vitals Trend */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <HeartPulse className="h-5 w-5 text-rose-500" />
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">Blood Pressure & Heart Rate</h4>
                </div>
                <span className="text-[10px] font-bold text-slate-400">{vitalsTrend.length} Readings Recorded</span>
              </div>

              <div className="mt-4 space-y-3">
                {vitalsTrend.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400">No vitals observations logged yet.</p>
                ) : (
                  vitalsTrend.map((v, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">Day {v.dayNumber}</span>
                        <p className="text-[10px] text-slate-400">Temp: {v.temperature}°C</p>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-rose-600 dark:text-rose-400">
                          {v.systolic} / {v.diastolic} mmHg
                        </span>
                        <p className="text-[10px] text-slate-500">HR: {v.heartRate} bpm</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Drain Trend */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <Droplet className="h-5 w-5 text-blue-500" />
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">Surgical Drain Output</h4>
                </div>
                <span className="text-[10px] font-bold text-slate-400">{drainTrend.length} Logs Recorded</span>
              </div>

              <div className="mt-4 space-y-3">
                {drainTrend.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400">No drain logs recorded yet.</p>
                ) : (
                  drainTrend.map((d, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">Day {d.dayNumber}</span>
                        <p className="text-[10px] text-slate-400">Character: {d.character}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-blue-600 dark:text-blue-400">{d.volume} mL</span>
                        <p className="text-[10px] text-slate-500">Pain: {d.painScore} / 10</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Wound Photos Tab */}
        {activeTab === "photos" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h4 className="text-sm font-black text-slate-900 dark:text-white">Wound Healing Progression Gallery</h4>
            <p className="mt-1 text-xs text-slate-500">Side-by-side progression across patient recovery timeline.</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {woundPhotos.length === 0 ? (
                <div className="col-span-full py-12 text-center text-xs text-slate-400">
                  <Camera className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 font-medium">No wound photos uploaded yet.</p>
                </div>
              ) : (
                woundPhotos.map((p, i) => (
                  <div key={i} className="overflow-hidden rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">Day {p.dayNumber}</span>
                      <span className="text-[10px] text-slate-400">
                        {p.completedAt ? new Date(p.completedAt).toLocaleDateString() : ""}
                      </span>
                    </div>

                    <div className="mt-2 flex h-32 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400">
                      <Camera className="h-8 w-8" />
                    </div>

                    <div className="mt-2 space-y-1 text-[10px] text-slate-600 dark:text-slate-400">
                      <div>Redness: <span className="font-semibold">{p.redness ? "Yes" : "No"}</span></div>
                      <div>Swelling: <span className="font-semibold">{p.swelling ? "Yes" : "No"}</span></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Progress Notes Tab */}
        {activeTab === "notes" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <h4 className="text-sm font-black text-slate-900 dark:text-white">Add Clinician Progress Note</h4>
              <form onSubmit={(e) => void handleAddProgressNote(e)} className="mt-3 space-y-3">
                <textarea
                  value={newProgressNote}
                  onChange={(e) => setNewProgressNote(e.target.value)}
                  placeholder="Record recovery observation, therapy milestone, or plan adjustment notes..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={addingNote || !newProgressNote.trim()}
                    className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {addingNote ? <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
                    Add Progress Note
                  </button>
                </div>
              </form>
            </div>

            {/* Notes Feed */}
            <div className="space-y-3">
              {(!plan.progressNotes || plan.progressNotes.length === 0) ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400 dark:border-slate-800">
                  No clinician notes recorded yet.
                </div>
              ) : (
                plan.progressNotes.map((noteItem, idx) => (
                  <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">{noteItem.authorName}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(noteItem.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-700 dark:text-slate-300">{noteItem.note}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Alert Action Dialog */}
      {selectedAlertForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {selectedAlertForAction.type === "acknowledge" ? "Acknowledge Alert" : "Resolve Clinical Alert"}
              </h3>
              <button
                onClick={() => setSelectedAlertForAction(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="my-4 space-y-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Clinician Note / Action Plan:
              </label>
              <textarea
                value={alertNote}
                onChange={(e) => setAlertNote(e.target.value)}
                placeholder="e.g. Reviewed reading with patient, adjusted medication dosage."
                rows={3}
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="flex justify-end space-x-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedAlertForAction(null)}
                className="rounded-xl px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionSubmitting}
                onClick={() => void handleAcknowledgeOrResolve()}
                className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {actionSubmitting ? <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
