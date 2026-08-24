"use client";

import React, { useCallback, useEffect, useState } from "react";
import type {
  ClinicalReferral,
  ExerciseCategory,
  IndependenceLevel,
  TherapyAssessmentRecord,
  TherapyAttendanceStatus,
  TherapySessionRecord,
} from "@wonflow/contracts";

const INDEPENDENCE_LABELS: Record<IndependenceLevel, { label: string; color: string }> = {
  BED_BOUND: { label: "Bed Bound", color: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300" },
  CHAIR_TRANSFER: { label: "Chair Transfer", color: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" },
  ASSISTED_AMBULATION: { label: "Assisted Ambulation", color: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300" },
  INDEPENDENT_AMBULATION: { label: "Independent Ambulation", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" },
  STAIR_NAVIGATING: { label: "Stair Navigating", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300" },
};

const DEFAULT_EXERCISES = [
  { name: "Incentive Spirometry", category: "RESPIRATORY" as ExerciseCategory, instruction: "Perform 10 sustained maximal inspirations every waking hour.", reps: 10, sets: 1 },
  { name: "Ankle Pumps & Quadriceps Sets", category: "CIRCULATORY" as ExerciseCategory, instruction: "Flex and extend ankles 20 times per hour to stimulate venous return.", reps: 20, sets: 3 },
  { name: "Assisted Corridor Ambulation", category: "MOBILITY" as ExerciseCategory, instruction: "Walk 50 meters with physical therapist or caregiver assistance.", reps: 1, sets: 2 },
  { name: "Bed Mobility & Bridging", category: "STRENGTHENING" as ExerciseCategory, instruction: "Gentle pelvic bridges and side rolling maintaining spine alignment.", reps: 8, sets: 2 },
  { name: "Thoracic Deep Breathing", category: "RESPIRATORY" as ExerciseCategory, instruction: "Deep diaphragmatic breathing with 3-second breath hold.", reps: 10, sets: 2 },
];

export function PhysiotherapyWorkspace() {
  const [referrals, setReferrals] = useState<ClinicalReferral[]>([]);
  const [selectedReferral, setSelectedReferral] = useState<ClinicalReferral | null>(null);
  const [activeTab, setActiveTab] = useState<"assessments" | "sessions" | "exercises">("assessments");
  const [isLoading, setIsLoading] = useState(true);

  // Assessment Form State
  const [mobilityScore, setMobilityScore] = useState(3);
  const [painScore, setPainScore] = useState(4);
  const [respiratoryFunction, setRespiratoryFunction] = useState("");
  const [independenceLevel, setIndependenceLevel] = useState<IndependenceLevel>("ASSISTED_AMBULATION");
  const [surgicalRestrictions, setSurgicalRestrictions] = useState("");
  const [baselineNotes] = useState("");
  const [goals, setGoals] = useState("");
  const [assessments, setAssessments] = useState<TherapyAssessmentRecord[]>([]);

  // Session Form State
  const [attendanceStatus, setAttendanceStatus] = useState<TherapyAttendanceStatus>("COMPLETED");
  const [painBefore, setPainBefore] = useState(4);
  const [painAfter, setPainAfter] = useState(2);
  const [spirometryMl, setSpirometryMl] = useState(1200);
  const [stepsAchieved, setStepsAchieved] = useState(150);
  const [progressNotes, setProgressNotes] = useState("");
  const [goalsMet, setGoalsMet] = useState("");
  const [sessions, setSessions] = useState<TherapySessionRecord[]>([]);

  // Exercise Assignment State
  const [selectedExercise, setSelectedExercise] = useState(DEFAULT_EXERCISES[0]);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);

  // Status/Feedback
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function loadReferrals() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/allied/referrals?specialty=PHYSIOTHERAPY");
      const data = await res.json();
      if (res.ok && data.referrals) {
        setReferrals(data.referrals);
        if (data.referrals.length > 0 && !selectedReferral) {
          setSelectedReferral(data.referrals[0]);
        }
      }
    } catch (e) {
      console.error("Failed to load referrals", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadPatientDetails(patientId: string) {
    try {
      const [resAss, resSess] = await Promise.all([
        fetch(`/api/v1/allied/physiotherapy/assessments?patientId=${patientId}`),
        fetch(`/api/v1/allied/physiotherapy/sessions?patientId=${patientId}`),
      ]);
      const dataAss = await resAss.json();
      const dataSess = await resSess.json();
      if (dataAss.assessments) setAssessments(dataAss.assessments);
      if (dataSess.sessions) setSessions(dataSess.sessions);
    } catch (e) {
      console.error("Failed to load patient physiotherapy data", e);
    }
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch("/api/v1/allied/referrals?specialty=PHYSIOTHERAPY");
        const data = await res.json();
        if (active && res.ok && data.referrals) {
          setReferrals(data.referrals);
          setSelectedReferral((prev) => prev ?? data.referrals[0] ?? null);
          setIsLoading(false);
        }
      } catch (e) {
        console.error("Failed to load referrals", e);
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedReferral?.patientId) return;
    const patientId = selectedReferral.patientId;
    let active = true;
    void (async () => {
      try {
        const [resAss, resSess] = await Promise.all([
          fetch(`/api/v1/allied/physiotherapy/assessments?patientId=${patientId}`),
          fetch(`/api/v1/allied/physiotherapy/sessions?patientId=${patientId}`),
        ]);
        const dataAss = await resAss.json();
        const dataSess = await resSess.json();
        if (active) {
          if (dataAss.assessments) setAssessments(dataAss.assessments);
          if (dataSess.sessions) setSessions(dataSess.sessions);
          if (selectedReferral.precautions) {
            setSurgicalRestrictions(selectedReferral.precautions);
          }
          if (selectedReferral.goal) {
            setGoals(selectedReferral.goal);
          }
        }
      } catch (e) {
        console.error("Failed to load patient physiotherapy data", e);
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedReferral?.patientId, selectedReferral?.precautions, selectedReferral?.goal]);


  async function handleReferralAction(referralId: string, action: "ACCEPT" | "COMPLETE" | "DECLINE") {
    let outcomeNotes = "";
    let reason = "";

    if (action === "COMPLETE") {
      outcomeNotes = prompt("Enter completion summary & discharge mobility status:") || "Mobility goals achieved.";
    } else if (action === "DECLINE") {
      reason = prompt("Reason for declining referral:") || "Patient transferred or not indicated.";
    }

    try {
      const res = await fetch(`/api/v1/allied/referrals/${referralId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, outcomeNotes, reason }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback({
          type: "success",
          message: `Referral successfully marked as ${action.toLowerCase()}ed.`,
        });
        void loadReferrals();
      } else {
        throw new Error(data.error?.message || "Failed to update referral");
      }
    } catch (err: unknown) {
      setActionFeedback({ type: "error", message: err instanceof Error ? err.message : "Failed to update referral" });
    }
  }

  async function handleSaveAssessment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedReferral) return;

    try {
      const res = await fetch("/api/v1/allied/physiotherapy/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedReferral.patientId,
          referralId: selectedReferral.id,
          mobilityScore,
          painScore,
          respiratoryFunction: respiratoryFunction.trim() || undefined,
          independenceLevel,
          surgicalRestrictions: surgicalRestrictions.trim() || undefined,
          baselineNotes: baselineNotes.trim() || undefined,
          goals: goals.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback({ type: "success", message: "Mobility assessment saved successfully." });
        void loadPatientDetails(selectedReferral.patientId);
      } else {
        throw new Error(data.error?.message || "Failed to save assessment");
      }
    } catch (err: unknown) {
      setActionFeedback({ type: "error", message: err instanceof Error ? err.message : "Failed to save assessment" });
    }
  }

  async function handleLogSession(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedReferral) return;

    try {
      const res = await fetch("/api/v1/allied/physiotherapy/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedReferral.patientId,
          referralId: selectedReferral.id,
          attendanceStatus,
          painBefore,
          painAfter,
          spirometryAchievedMl: spirometryMl,
          stepsAchieved,
          progressNotes: progressNotes.trim() || undefined,
          goalsMet: goalsMet.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback({ type: "success", message: "Therapy session recorded successfully." });
        void loadPatientDetails(selectedReferral.patientId);
        setProgressNotes("");
        setGoalsMet("");
      } else {
        throw new Error(data.error?.message || "Failed to log session");
      }
    } catch (err: unknown) {
      setActionFeedback({ type: "error", message: err instanceof Error ? err.message : "Failed to log session" });
    }
  }

  async function handleAssignExercise() {
    if (!selectedReferral) return;
    setAssignSuccess(null);

    try {
      const res = await fetch("/api/v1/allied/physiotherapy/assign-exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedReferral.patientId,
          referralId: selectedReferral.id,
          exerciseName: selectedExercise.name,
          category: selectedExercise.category,
          instructions: selectedExercise.instruction,
          repetitions: selectedExercise.reps,
          sets: selectedExercise.sets,
          scheduledFor: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAssignSuccess(`"${selectedExercise.name}" pushed to patient Daily Action Centre!`);
      } else {
        throw new Error(data.error?.message || "Failed to assign exercise");
      }
    } catch (err: unknown) {
      setActionFeedback({ type: "error", message: err instanceof Error ? err.message : "Failed to assign exercise" });
    }
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-teal-900 via-sky-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-full">
              Allied Health Discipline
            </span>
            <span className="text-xs text-slate-400">Referral-Scoped Access</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Physiotherapy & Mobility Workspace</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Document post-operative mobility milestones, manage respiratory rehabilitation, and prescribe exercises directly into the patient Daily Action Centre.
          </p>
        </div>
      </div>

      {actionFeedback && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between border ${
            actionFeedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
          }`}
        >
          <span>{actionFeedback.message}</span>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Grid: Referrals List on Left, Active Patient Studio on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Referral Inbox */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                Referral Inbox
                <span className="px-2 py-0.5 text-xs bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 rounded-full font-medium">
                  {referrals.length}
                </span>
              </h2>
              <button
                onClick={loadReferrals}
                className="text-xs text-sky-600 hover:text-sky-500 font-medium"
              >
                Refresh
              </button>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading referrals...</div>
            ) : referrals.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No active physiotherapy referrals found.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {referrals.map((ref) => {
                  const isSelected = selectedReferral?.id === ref.id;
                  const patientName = ref.patient
                    ? `${ref.patient.givenName} ${ref.patient.familyName}`
                    : `Patient #${ref.patientId.slice(0, 6)}`;

                  return (
                    <div
                      key={ref.id}
                      onClick={() => setSelectedReferral(ref)}
                      className={`p-3.5 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? "bg-sky-50/80 dark:bg-sky-950/40 border-sky-300 dark:border-sky-700 shadow-sm"
                          : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-semibold text-slate-900 dark:text-white">
                            {patientName}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {ref.reason}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase ${
                            ref.priority === "EMERGENCY"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                              : ref.priority === "URGENT"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {ref.priority}
                        </span>
                      </div>

                      {ref.surgicalSummary && (
                        <div className="mt-2 text-[11px] bg-white/60 dark:bg-slate-900/60 p-2 rounded-lg text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                          <span className="font-semibold text-slate-700 dark:text-slate-200">Surg:</span> {ref.surgicalSummary}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                        <span className="text-slate-400">Status: <strong className="text-slate-700 dark:text-slate-200">{ref.status}</strong></span>

                        <div className="flex items-center gap-1.5">
                          {ref.status === "PENDING" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReferralAction(ref.id, "ACCEPT");
                              }}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-semibold shadow-xs"
                            >
                              Accept
                            </button>
                          )}
                          {(ref.status === "ACCEPTED" || ref.status === "IN_PROGRESS") && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReferralAction(ref.id, "COMPLETE");
                              }}
                              className="px-2 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[10px] font-semibold shadow-xs"
                            >
                              Complete
                            </button>
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

        {/* Selected Patient Studio */}
        <div className="lg:col-span-8 space-y-4">
          {selectedReferral ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              {/* Patient Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {selectedReferral.patient
                        ? `${selectedReferral.patient.givenName} ${selectedReferral.patient.familyName}`
                        : `Patient #${selectedReferral.patientId.slice(0, 8)}`}
                    </h2>
                    <span className="px-2.5 py-0.5 text-xs bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-semibold rounded-full">
                      Referral #{selectedReferral.id.slice(0, 6)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Referred by: {selectedReferral.referringDoctor?.staffProfile?.membership?.displayName || "Surgical Team"}
                  </p>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => setActiveTab("assessments")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                      activeTab === "assessments"
                        ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    Mobility Assessment
                  </button>
                  <button
                    onClick={() => setActiveTab("sessions")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                      activeTab === "sessions"
                        ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    1-on-1 Sessions ({sessions.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("exercises")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                      activeTab === "exercises"
                        ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    Prescribe Exercises
                  </button>
                </div>
              </div>

              {/* Tab 1: Mobility Assessment */}
              {activeTab === "assessments" && (
                <div className="mt-5 space-y-6">
                  <form onSubmit={handleSaveAssessment} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Mobility Score Slider */}
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Mobility Score (0 - 10)
                          </label>
                          <span className="text-sm font-bold text-sky-600 dark:text-sky-400">{mobilityScore} / 10</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={mobilityScore}
                          onChange={(e) => setMobilityScore(parseInt(e.target.value, 10))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-600"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                          <span>0: Bedbound</span>
                          <span>5: Assisted</span>
                          <span>10: Fully Ambulatory</span>
                        </div>
                      </div>

                      {/* Pain Score Slider */}
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Movement Pain Score (0 - 10)
                          </label>
                          <span className={`text-sm font-bold ${painScore >= 7 ? "text-rose-500" : "text-amber-500"}`}>
                            {painScore} / 10
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={painScore}
                          onChange={(e) => setPainScore(parseInt(e.target.value, 10))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                          <span>0: No Pain</span>
                          <span>5: Moderate</span>
                          <span>10: Severe</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Independence Level
                        </label>
                        <select
                          value={independenceLevel}
                          onChange={(e) => setIndependenceLevel(e.target.value as IndependenceLevel)}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                        >
                          <option value="BED_BOUND">Bed Bound</option>
                          <option value="CHAIR_TRANSFER">Chair Transfer</option>
                          <option value="ASSISTED_AMBULATION">Assisted Ambulation</option>
                          <option value="INDEPENDENT_AMBULATION">Independent Ambulation</option>
                          <option value="STAIR_NAVIGATING">Stair Navigating</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Respiratory / Spirometry Function
                        </label>
                        <input
                          type="text"
                          value={respiratoryFunction}
                          onChange={(e) => setRespiratoryFunction(e.target.value)}
                          placeholder="e.g. 1200 mL achieved, clear bilateral breath sounds"
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Surgical Restrictions & Precautions
                      </label>
                      <input
                        type="text"
                        value={surgicalRestrictions}
                        onChange={(e) => setSurgicalRestrictions(e.target.value)}
                        placeholder="e.g. Suture line protection; JP drain clamp check prior to ambulation"
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Rehabilitation Goals
                      </label>
                      <input
                        type="text"
                        value={goals}
                        onChange={(e) => setGoals(e.target.value)}
                        placeholder="e.g. Corridor walk 100m without assist by POD 4"
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        className="px-5 py-2.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-sm transition"
                      >
                        Save Mobility Assessment
                      </button>
                    </div>
                  </form>

                  {/* Past Assessments Timeline */}
                  {assessments.length > 0 && (
                    <div className="pt-5 border-t border-slate-100 dark:border-slate-800">
                      <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                        Assessment History
                      </h3>
                      <div className="space-y-2">
                        {assessments.map((a) => (
                          <div
                            key={a.id}
                            className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                          >
                            <div className="space-y-0.5">
                              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${INDEPENDENCE_LABELS[a.independenceLevel]?.color}`}>
                                  {INDEPENDENCE_LABELS[a.independenceLevel]?.label}
                                </span>
                                <span>Mobility: {a.mobilityScore}/10</span>
                                <span className="text-slate-400">·</span>
                                <span>Pain: {a.painScore}/10</span>
                              </div>
                              {a.goals && <div className="text-slate-500 dark:text-slate-400 text-[11px]">Goal: {a.goals}</div>}
                            </div>
                            <span className="text-[11px] text-slate-400">
                              {new Date(a.assessedAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: 1-on-1 Sessions */}
              {activeTab === "sessions" && (
                <div className="mt-5 space-y-6">
                  <form onSubmit={handleLogSession} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Attendance Status
                        </label>
                        <select
                          value={attendanceStatus}
                          onChange={(e) => setAttendanceStatus(e.target.value as TherapyAttendanceStatus)}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                        >
                          <option value="COMPLETED">Completed</option>
                          <option value="PATIENT_UNWELL">Patient Unwell</option>
                          <option value="REFUSED">Refused</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Steps Achieved
                        </label>
                        <input
                          type="number"
                          value={stepsAchieved}
                          onChange={(e) => setStepsAchieved(parseInt(e.target.value, 10) || 0)}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Spirometry (mL)
                        </label>
                        <input
                          type="number"
                          value={spirometryMl}
                          onChange={(e) => setSpirometryMl(parseInt(e.target.value, 10) || 0)}
                          step="100"
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Pain Score Before (0-10): {painBefore}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={painBefore}
                          onChange={(e) => setPainBefore(parseInt(e.target.value, 10))}
                          className="w-full accent-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Pain Score After (0-10): {painAfter}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={painAfter}
                          onChange={(e) => setPainAfter(parseInt(e.target.value, 10))}
                          className="w-full accent-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Progress Notes
                      </label>
                      <textarea
                        value={progressNotes}
                        onChange={(e) => setProgressNotes(e.target.value)}
                        placeholder="Describe patient posture, balance, cough efficacy, or gait assistance needed..."
                        rows={2}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        className="px-5 py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-xl shadow-sm transition"
                      >
                        Log Therapy Encounter
                      </button>
                    </div>
                  </form>

                  {/* Past Sessions List */}
                  {sessions.length > 0 && (
                    <div className="pt-5 border-t border-slate-100 dark:border-slate-800">
                      <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                        Encounter History
                      </h3>
                      <div className="space-y-2">
                        {sessions.map((s) => (
                          <div
                            key={s.id}
                            className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-xs"
                          >
                            <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-white">
                              <span>Status: {s.attendanceStatus} · Steps: {s.stepsAchieved ?? 0}</span>
                              <span className="text-[11px] text-slate-400">{new Date(s.sessionDate).toLocaleDateString()}</span>
                            </div>
                            {s.progressNotes && <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-1">{s.progressNotes}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Prescribe Exercises */}
              {activeTab === "exercises" && (
                <div className="mt-5 space-y-5">
                  <div className="bg-sky-50 dark:bg-sky-950/40 p-4 rounded-xl border border-sky-200 dark:border-sky-800 text-xs text-sky-900 dark:text-sky-200">
                    <strong>CarePlan Action Centre Integration:</strong> Selected exercises will appear directly in the patient Daily Action Centre as interactive tasks with step counters and instructional guidelines.
                  </div>

                  {assignSuccess && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-semibold">
                      {assignSuccess}
                    </div>
                  )}

                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Select From Standard Clinical Catalogue:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {DEFAULT_EXERCISES.map((ex, idx) => {
                        const isSelected = selectedExercise.name === ex.name;
                        return (
                          <div
                            key={idx}
                            onClick={() => setSelectedExercise(ex)}
                            className={`p-3 rounded-xl border cursor-pointer transition ${
                              isSelected
                                ? "bg-teal-50 dark:bg-teal-950/50 border-teal-500 shadow-xs"
                                : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-white">
                              <span>{ex.name}</span>
                              <span className="px-2 py-0.5 text-[10px] bg-slate-200 dark:bg-slate-700 rounded-md">
                                {ex.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                              {ex.instruction}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                      Prescription Parameters for: {selectedExercise.name}
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-500 mb-1">Repetitions</label>
                        <input
                          type="number"
                          value={selectedExercise.reps}
                          onChange={(e) =>
                            setSelectedExercise({ ...selectedExercise, reps: parseInt(e.target.value, 10) || 1 })
                          }
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 mb-1">Sets / Day</label>
                        <input
                          type="number"
                          value={selectedExercise.sets}
                          onChange={(e) =>
                            setSelectedExercise({ ...selectedExercise, sets: parseInt(e.target.value, 10) || 1 })
                          }
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleAssignExercise}
                      className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                    >
                      Push to Patient Daily Action Centre
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
              Select a patient referral from the inbox to open their rehabilitation studio.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
