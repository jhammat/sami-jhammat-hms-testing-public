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

const INDEPENDENCE_LABELS: Record<IndependenceLevel, { label: string; color: string; icon: string }> = {
  BED_BOUND:              { label: "Bed Bound",              color: "bg-rose-500/15 text-rose-400 border border-rose-500/20",     icon: "🛏" },
  CHAIR_TRANSFER:         { label: "Chair Transfer",         color: "bg-amber-500/15 text-amber-400 border border-amber-500/20",   icon: "🪑" },
  ASSISTED_AMBULATION:    { label: "Assisted Ambulation",    color: "bg-sky-500/15 text-sky-400 border border-sky-500/20",         icon: "🦮" },
  INDEPENDENT_AMBULATION: { label: "Independent Ambulation", color: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20", icon: "🚶" },
  STAIR_NAVIGATING:       { label: "Stair Navigating",       color: "bg-violet-500/15 text-violet-400 border border-violet-500/20", icon: "🏃" },
};

const EXERCISE_CATEGORY_COLORS: Record<ExerciseCategory, string> = {
  RESPIRATORY:  "bg-sky-500/20 text-sky-300 border border-sky-500/30",
  CIRCULATORY:  "bg-rose-500/20 text-rose-300 border border-rose-500/30",
  MOBILITY:     "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  STRENGTHENING:"bg-amber-500/20 text-amber-300 border border-amber-500/30",
  POSTURE:      "bg-violet-500/20 text-violet-300 border border-violet-500/30",
};

const DEFAULT_EXERCISES = [
  { name: "Incentive Spirometry",            category: "RESPIRATORY"  as ExerciseCategory, instruction: "Perform 10 sustained maximal inspirations every waking hour.", reps: 10, sets: 1 },
  { name: "Ankle Pumps & Quadriceps Sets",   category: "CIRCULATORY"  as ExerciseCategory, instruction: "Flex and extend ankles 20 times per hour to stimulate venous return.", reps: 20, sets: 3 },
  { name: "Assisted Corridor Ambulation",    category: "MOBILITY"     as ExerciseCategory, instruction: "Walk 50 meters with physical therapist or caregiver assistance.", reps: 1,  sets: 2 },
  { name: "Bed Mobility & Bridging",         category: "STRENGTHENING" as ExerciseCategory, instruction: "Gentle pelvic bridges and side rolling maintaining spine alignment.", reps: 8,  sets: 2 },
  { name: "Thoracic Deep Breathing",         category: "RESPIRATORY"  as ExerciseCategory, instruction: "Deep diaphragmatic breathing with 3-second breath hold.", reps: 10, sets: 2 },
];

function ScoreRing({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = (value / max) * 100;
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
          <circle
            cx="32" cy="32" r={r} fill="none"
            stroke={color} strokeWidth="5"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">{value}</span>
      </div>
      <span className="text-[10px] text-white/50 uppercase tracking-wide font-medium">{label}</span>
    </div>
  );
}

function PainBar({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[11px] text-white/60 font-medium">{label}</span>
        <span className="text-sm font-bold text-white">{value}<span className="text-white/40 text-[10px]">/10</span></span>
      </div>
      <div className="h-2 rounded-full bg-white/8 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value * 10}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function PhysiotherapyWorkspace() {
  const [referrals, setReferrals] = useState<ClinicalReferral[]>([]);
  const [selectedReferral, setSelectedReferral] = useState<ClinicalReferral | null>(null);
  const [activeTab, setActiveTab] = useState<"assessments" | "sessions" | "exercises">("assessments");
  const [isLoading, setIsLoading] = useState(true);

  const [mobilityScore, setMobilityScore] = useState(3);
  const [painScore, setPainScore] = useState(4);
  const [respiratoryFunction, setRespiratoryFunction] = useState("");
  const [independenceLevel, setIndependenceLevel] = useState<IndependenceLevel>("ASSISTED_AMBULATION");
  const [surgicalRestrictions, setSurgicalRestrictions] = useState("");
  const [baselineNotes] = useState("");
  const [goals, setGoals] = useState("");
  const [assessments, setAssessments] = useState<TherapyAssessmentRecord[]>([]);

  const [attendanceStatus, setAttendanceStatus] = useState<TherapyAttendanceStatus>("COMPLETED");
  const [painBefore, setPainBefore] = useState(4);
  const [painAfter, setPainAfter] = useState(2);
  const [spirometryMl, setSpirometryMl] = useState(1200);
  const [stepsAchieved, setStepsAchieved] = useState(150);
  const [progressNotes, setProgressNotes] = useState("");
  const [goalsMet, setGoalsMet] = useState("");
  const [sessions, setSessions] = useState<TherapySessionRecord[]>([]);

  const [selectedExercise, setSelectedExercise] = useState(DEFAULT_EXERCISES[0]);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadReferrals = useCallback(async () => {
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
    } catch (e) { console.error("Failed to load referrals", e); }
    finally { setIsLoading(false); }
  }, [selectedReferral]);

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
    } catch (e) { console.error("Failed to load patient physiotherapy data", e); }
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
    return () => { active = false; };
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
          if (selectedReferral.precautions) setSurgicalRestrictions(selectedReferral.precautions);
          if (selectedReferral.goal) setGoals(selectedReferral.goal);
        }
      } catch (e) { console.error("Failed to load patient physiotherapy data", e); }
    })();
    return () => { active = false; };
  }, [selectedReferral?.patientId, selectedReferral?.precautions, selectedReferral?.goal]);

  async function handleReferralAction(referralId: string, action: "ACCEPT" | "COMPLETE" | "DECLINE") {
    let outcomeNotes = "";
    let reason = "";
    if (action === "COMPLETE") outcomeNotes = prompt("Enter completion summary & discharge mobility status:") || "Mobility goals achieved.";
    else if (action === "DECLINE") reason = prompt("Reason for declining referral:") || "Patient transferred or not indicated.";
    try {
      const res = await fetch(`/api/v1/allied/referrals/${referralId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, outcomeNotes, reason }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback({ type: "success", message: `Referral successfully marked as ${action.toLowerCase()}ed.` });
        void loadReferrals();
      } else throw new Error(data.error?.message || "Failed to update referral");
    } catch (err: unknown) {
      setActionFeedback({ type: "error", message: err instanceof Error ? err.message : "Failed to update referral" });
    }
  }

  async function handleSaveAssessment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedReferral) return;
    try {
      const res = await fetch("/api/v1/allied/physiotherapy/assessments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedReferral.patientId, referralId: selectedReferral.id,
          mobilityScore, painScore,
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
      } else throw new Error(data.error?.message || "Failed to save assessment");
    } catch (err: unknown) {
      setActionFeedback({ type: "error", message: err instanceof Error ? err.message : "Failed to save assessment" });
    }
  }

  async function handleLogSession(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedReferral) return;
    try {
      const res = await fetch("/api/v1/allied/physiotherapy/sessions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedReferral.patientId, referralId: selectedReferral.id,
          attendanceStatus, painBefore, painAfter,
          spirometryAchievedMl: spirometryMl, stepsAchieved,
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
      } else throw new Error(data.error?.message || "Failed to log session");
    } catch (err: unknown) {
      setActionFeedback({ type: "error", message: err instanceof Error ? err.message : "Failed to log session" });
    }
  }

  async function handleAssignExercise() {
    if (!selectedReferral) return;
    setAssignSuccess(null);
    try {
      const res = await fetch("/api/v1/allied/physiotherapy/assign-exercise", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedReferral.patientId, referralId: selectedReferral.id,
          exerciseName: selectedExercise.name, category: selectedExercise.category,
          instructions: selectedExercise.instruction,
          repetitions: selectedExercise.reps, sets: selectedExercise.sets,
          scheduledFor: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (res.ok) setAssignSuccess(`"${selectedExercise.name}" pushed to patient Daily Action Centre!`);
      else throw new Error(data.error?.message || "Failed to assign exercise");
    } catch (err: unknown) {
      setActionFeedback({ type: "error", message: err instanceof Error ? err.message : "Failed to assign exercise" });
    }
  }

  const patientName = selectedReferral?.patient
    ? `${selectedReferral.patient.givenName} ${selectedReferral.patient.familyName}`
    : selectedReferral ? `Patient #${selectedReferral.patientId.slice(0, 8)}` : "";

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0a0f1e 0%, #0d1627 40%, #0f1a2e 100%)" }} className="p-6 space-y-6">

      {/* ── HERO HEADER ── */}
      <div style={{
        background: "linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(14,165,233,0.1) 50%, rgba(99,102,241,0.08) 100%)",
        border: "1px solid rgba(6,182,212,0.2)",
        backdropFilter: "blur(20px)",
      }} className="rounded-3xl p-8 relative overflow-hidden">
        {/* Decorative glow orbs */}
        <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(6,182,212,0.12)", filter: "blur(40px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -40, left: "30%", width: 150, height: 150, borderRadius: "50%", background: "rgba(99,102,241,0.1)", filter: "blur(40px)", pointerEvents: "none" }} />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)", borderRadius: 12, padding: "10px 14px", fontSize: 22 }}>🦿</div>
              <div>
                <div className="flex items-center gap-2">
                  <span style={{ background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.3)", color: "#67e8f9", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", padding: "3px 10px", borderRadius: 20 }} className="uppercase">
                    Allied Health · Physiotherapy
                  </span>
                  <span style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", fontSize: 10, padding: "3px 8px", borderRadius: 20 }}>Referral-Scoped Access</span>
                </div>
                <h1 style={{ fontSize: 26, fontWeight: 800, background: "linear-gradient(135deg, #fff 0%, #a5f3fc 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginTop: 4 }}>
                  Physiotherapy & Mobility Workspace
                </h1>
              </div>
            </div>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, maxWidth: 520 }}>
              Document post-operative mobility milestones, manage respiratory rehabilitation, and prescribe exercises directly into the patient Daily Action Centre.
            </p>
          </div>
          {/* Live Stats */}
          <div className="flex gap-4">
            {[
              { label: "Active Referrals", value: referrals.length, color: "#06b6d4" },
              { label: "Sessions Today", value: sessions.length, color: "#10b981" },
              { label: "Assessments", value: assessments.length, color: "#8b5cf6" },
            ].map((stat) => (
              <div key={stat.label} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "14px 18px", textAlign: "center", minWidth: 80 }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2, whiteSpace: "nowrap" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TOAST FEEDBACK ── */}
      {actionFeedback && (
        <div style={{
          background: actionFeedback.type === "success" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
          border: `1px solid ${actionFeedback.type === "success" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
          borderRadius: 14, padding: "14px 18px",
          color: actionFeedback.type === "success" ? "#6ee7b7" : "#fca5a5",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          backdropFilter: "blur(12px)",
        }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 16 }}>{actionFeedback.type === "success" ? "✓" : "⚠"}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{actionFeedback.message}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} style={{ color: "rgba(255,255,255,0.4)", fontSize: 18, cursor: "pointer", background: "none", border: "none", lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* ── MAIN GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── LEFT: REFERRAL INBOX ── */}
        <div className="lg:col-span-4">
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 24, overflow: "hidden",
            backdropFilter: "blur(20px)",
          }}>
            {/* Inbox Header */}
            <div style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "16px 20px" }} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div style={{ background: "rgba(6,182,212,0.15)", borderRadius: 10, padding: "6px 8px", fontSize: 14 }}>📋</div>
                <div>
                  <h2 style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Referral Inbox</h2>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Physiotherapy referrals</p>
                </div>
                {referrals.length > 0 && (
                  <div style={{ background: "rgba(6,182,212,0.2)", border: "1px solid rgba(6,182,212,0.4)", color: "#67e8f9", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
                    {referrals.length}
                  </div>
                )}
              </div>
              <button
                onClick={loadReferrals}
                style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)", color: "#67e8f9", borderRadius: 10, padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(6,182,212,0.2)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(6,182,212,0.1)")}
              >
                ↻ Refresh
              </button>
            </div>

            <div style={{ padding: "12px", maxHeight: 640, overflowY: "auto" }}>
              {isLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, height: 90, animation: "pulse 1.5s ease-in-out infinite" }} />
                  ))}
                </div>
              ) : referrals.length === 0 ? (
                <div style={{ padding: "48px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🏃</div>
                  <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, fontWeight: 600 }}>No active referrals</div>
                  <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, marginTop: 4 }}>New physiotherapy referrals will appear here</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {referrals.map((ref) => {
                    const isSelected = selectedReferral?.id === ref.id;
                    const name = ref.patient ? `${ref.patient.givenName} ${ref.patient.familyName}` : `Patient #${ref.patientId.slice(0, 6)}`;
                    const priorityColors: Record<string, string> = {
                      EMERGENCY: "rgba(239,68,68,0.2)",
                      URGENT: "rgba(245,158,11,0.2)",
                      ROUTINE: "rgba(255,255,255,0.06)",
                    };
                    const priorityTextColors: Record<string, string> = {
                      EMERGENCY: "#fca5a5",
                      URGENT: "#fcd34d",
                      ROUTINE: "rgba(255,255,255,0.4)",
                    };
                    return (
                      <div
                        key={ref.id}
                        onClick={() => setSelectedReferral(ref)}
                        style={{
                          background: isSelected ? "rgba(6,182,212,0.1)" : "rgba(255,255,255,0.03)",
                          border: `1px solid ${isSelected ? "rgba(6,182,212,0.4)" : "rgba(255,255,255,0.07)"}`,
                          borderRadius: 16, padding: "14px 16px", cursor: "pointer",
                          transition: "all 0.2s",
                          boxShadow: isSelected ? "0 0 0 1px rgba(6,182,212,0.2), inset 0 1px 0 rgba(255,255,255,0.06)" : "none",
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? "#a5f3fc" : "#fff" }}>{name}</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{ref.reason}</div>
                          </div>
                          <span style={{ background: priorityColors[ref.priority] ?? "rgba(255,255,255,0.06)", color: priorityTextColors[ref.priority] ?? "rgba(255,255,255,0.4)", borderRadius: 8, padding: "3px 8px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                            {ref.priority}
                          </span>
                        </div>

                        {ref.surgicalSummary && (
                          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "6px 10px", fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 10 }}>
                            <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>Surg: </span>{ref.surgicalSummary}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                            Status: <strong style={{ color: ref.status === "IN_PROGRESS" ? "#34d399" : ref.status === "ACCEPTED" ? "#60a5fa" : "rgba(255,255,255,0.5)" }}>{ref.status}</strong>
                          </span>
                          <div className="flex gap-1.5">
                            {ref.status === "PENDING" && (
                              <button
                                onClick={e => { e.stopPropagation(); handleReferralAction(ref.id, "ACCEPT"); }}
                                style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.4)", color: "#6ee7b7", borderRadius: 8, padding: "4px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                              >Accept</button>
                            )}
                            {(ref.status === "ACCEPTED" || ref.status === "IN_PROGRESS") && (
                              <button
                                onClick={e => { e.stopPropagation(); handleReferralAction(ref.id, "COMPLETE"); }}
                                style={{ background: "rgba(6,182,212,0.2)", border: "1px solid rgba(6,182,212,0.4)", color: "#67e8f9", borderRadius: 8, padding: "4px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                              >Complete</button>
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
        </div>

        {/* ── RIGHT: PATIENT STUDIO ── */}
        <div className="lg:col-span-8">
          {selectedReferral ? (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, backdropFilter: "blur(20px)", overflow: "hidden" }}>

              {/* Patient Banner */}
              <div style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.12), rgba(99,102,241,0.08))", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "20px 24px" }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div style={{ width: 52, height: 52, borderRadius: 16, background: "linear-gradient(135deg, #06b6d4, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                      {patientName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{patientName}</h2>
                        <span style={{ background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.3)", color: "#67e8f9", borderRadius: 8, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>
                          REF #{selectedReferral.id.slice(0, 6).toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
                        Referred by: {selectedReferral.referringDoctor?.staffProfile?.membership?.displayName || "Surgical Team"}
                      </div>
                    </div>
                  </div>

                  {/* Tab Switcher */}
                  <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 4, display: "flex", gap: 2 }}>
                    {(["assessments", "sessions", "exercises"] as const).map((tab) => {
                      const tabLabels = { assessments: "Assessment", sessions: `Sessions (${sessions.length})`, exercises: "Exercises" };
                      const tabIcons  = { assessments: "📊", sessions: "🏥", exercises: "💪" };
                      return (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          style={{
                            background: activeTab === tab ? "rgba(6,182,212,0.2)" : "transparent",
                            border: `1px solid ${activeTab === tab ? "rgba(6,182,212,0.4)" : "transparent"}`,
                            color: activeTab === tab ? "#67e8f9" : "rgba(255,255,255,0.4)",
                            borderRadius: 10, padding: "7px 14px", fontSize: 12, fontWeight: 600,
                            cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap",
                          }}
                        >
                          {tabIcons[tab]} {tabLabels[tab]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── TAB CONTENT ── */}
              <div style={{ padding: 24 }}>

                {/* ── TAB 1: MOBILITY ASSESSMENT ── */}
                {activeTab === "assessments" && (
                  <div className="space-y-6">
                    {/* Score Visual Cards */}
                    <div className="grid grid-cols-3 gap-4">
                      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "20px 16px", textAlign: "center" }}>
                        <ScoreRing value={mobilityScore} max={10} color="#06b6d4" label="Mobility" />
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "20px 16px", textAlign: "center" }}>
                        <ScoreRing value={painScore} max={10} color={painScore >= 7 ? "#ef4444" : "#f59e0b"} label="Pain" />
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "20px 16px", textAlign: "center" }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>{INDEPENDENCE_LABELS[independenceLevel].icon}</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Independence</div>
                        <div style={{ fontSize: 11, color: "#fff", fontWeight: 700, marginTop: 4 }}>{INDEPENDENCE_LABELS[independenceLevel].label}</div>
                      </div>
                    </div>

                    <form onSubmit={handleSaveAssessment} className="space-y-5">
                      {/* Sliders */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { label: "Mobility Score", value: mobilityScore, setter: setMobilityScore, color: "#06b6d4", lo: "Bedbound", hi: "Fully Ambulatory" },
                          { label: "Movement Pain Score", value: painScore, setter: setPainScore, color: painScore >= 7 ? "#ef4444" : "#f59e0b", lo: "No Pain", hi: "Severe" },
                        ].map(({ label, value, setter, color, lo, hi }) => (
                          <div key={label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 18 }}>
                            <div className="flex items-center justify-between mb-4">
                              <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{label}</label>
                              <span style={{ fontSize: 18, fontWeight: 800, color }}>{value}<span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>/10</span></span>
                            </div>
                            <input
                              type="range" min="0" max="10" value={value}
                              onChange={e => setter(parseInt(e.target.value, 10))}
                              style={{ width: "100%", accentColor: color }}
                            />
                            <div className="flex justify-between" style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 6 }}>
                              <span>0: {lo}</span><span>10: {hi}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>Independence Level</label>
                          <select
                            value={independenceLevel}
                            onChange={e => setIndependenceLevel(e.target.value as IndependenceLevel)}
                            style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 14px", color: "#fff", fontSize: 13 }}
                          >
                            <option value="BED_BOUND">🛏 Bed Bound</option>
                            <option value="CHAIR_TRANSFER">🪑 Chair Transfer</option>
                            <option value="ASSISTED_AMBULATION">🦮 Assisted Ambulation</option>
                            <option value="INDEPENDENT_AMBULATION">🚶 Independent Ambulation</option>
                            <option value="STAIR_NAVIGATING">🏃 Stair Navigating</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>Respiratory / Spirometry</label>
                          <input
                            type="text" value={respiratoryFunction} onChange={e => setRespiratoryFunction(e.target.value)}
                            placeholder="e.g. 1200 mL, clear bilateral breath sounds"
                            style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 14px", color: "#fff", fontSize: 13 }}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>Surgical Restrictions & Precautions</label>
                        <input
                          type="text" value={surgicalRestrictions} onChange={e => setSurgicalRestrictions(e.target.value)}
                          placeholder="e.g. Suture line protection; JP drain clamp check prior to ambulation"
                          style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 14px", color: "#fff", fontSize: 13 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>Rehabilitation Goals</label>
                        <input
                          type="text" value={goals} onChange={e => setGoals(e.target.value)}
                          placeholder="e.g. Corridor walk 100m without assist by POD 4"
                          style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 14px", color: "#fff", fontSize: 13 }}
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)", borderRadius: 14, padding: "12px 28px", fontSize: 13, fontWeight: 700, color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 4px 24px rgba(6,182,212,0.3)", transition: "all 0.2s" }}
                          onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-1px)")}
                          onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
                        >
                          Save Mobility Assessment
                        </button>
                      </div>
                    </form>

                    {/* Past Assessments */}
                    {assessments.length > 0 && (
                      <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 20 }}>
                        <h3 style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Assessment History</h3>
                        <div className="space-y-2">
                          {assessments.map(a => (
                            <div key={a.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px 16px" }} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span style={{ fontSize: 18 }}>{INDEPENDENCE_LABELS[a.independenceLevel]?.icon}</span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }} className={`px-2 py-0.5 rounded-lg ${INDEPENDENCE_LABELS[a.independenceLevel]?.color}`}>
                                      {INDEPENDENCE_LABELS[a.independenceLevel]?.label}
                                    </span>
                                    <span style={{ fontSize: 12, color: "#06b6d4", fontWeight: 700 }}>Mob: {a.mobilityScore}/10</span>
                                    <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700 }}>Pain: {a.painScore}/10</span>
                                  </div>
                                  {a.goals && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>{a.goals}</div>}
                                </div>
                              </div>
                              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{new Date(a.assessedAt).toLocaleDateString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── TAB 2: SESSIONS ── */}
                {activeTab === "sessions" && (
                  <div className="space-y-6">
                    <form onSubmit={handleLogSession} className="space-y-5">
                      {/* Metrics Row */}
                      <div className="grid grid-cols-3 gap-4">
                        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 16 }}>
                          <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>Attendance</label>
                          <select
                            value={attendanceStatus} onChange={e => setAttendanceStatus(e.target.value as TherapyAttendanceStatus)}
                            style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "8px 12px", color: "#fff", fontSize: 12 }}
                          >
                            <option value="COMPLETED">✅ Completed</option>
                            <option value="PATIENT_UNWELL">🤒 Patient Unwell</option>
                            <option value="REFUSED">🚫 Refused</option>
                            <option value="CANCELLED">❌ Cancelled</option>
                          </select>
                        </div>
                        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 16 }}>
                          <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>Steps Achieved</label>
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: 24, fontWeight: 800, color: "#10b981" }}>{stepsAchieved}</span>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>steps</span>
                          </div>
                          <input type="number" value={stepsAchieved} onChange={e => setStepsAchieved(parseInt(e.target.value, 10) || 0)}
                            style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 10px", color: "#fff", fontSize: 12, marginTop: 6 }} />
                        </div>
                        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 16 }}>
                          <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>Spirometry (mL)</label>
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: 24, fontWeight: 800, color: "#06b6d4" }}>{spirometryMl}</span>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>mL</span>
                          </div>
                          <input type="number" value={spirometryMl} onChange={e => setSpirometryMl(parseInt(e.target.value, 10) || 0)} step="100"
                            style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 10px", color: "#fff", fontSize: 12, marginTop: 6 }} />
                        </div>
                      </div>

                      {/* Pain Before/After */}
                      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 }} className="space-y-4">
                        <h4 style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Pain Progression</h4>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <PainBar value={painBefore} color="linear-gradient(90deg, #f59e0b, #ef4444)" label="Pain Before Session" />
                            <input type="range" min="0" max="10" value={painBefore} onChange={e => setPainBefore(parseInt(e.target.value, 10))}
                              style={{ width: "100%", marginTop: 8, accentColor: "#f59e0b" }} />
                          </div>
                          <div>
                            <PainBar value={painAfter} color="linear-gradient(90deg, #10b981, #06b6d4)" label="Pain After Session" />
                            <input type="range" min="0" max="10" value={painAfter} onChange={e => setPainAfter(parseInt(e.target.value, 10))}
                              style={{ width: "100%", marginTop: 8, accentColor: "#10b981" }} />
                          </div>
                        </div>
                        {painAfter < painBefore && (
                          <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "8px 14px", fontSize: 12, color: "#6ee7b7", fontWeight: 600, textAlign: "center" }}>
                            ↓ {painBefore - painAfter} point improvement after session
                          </div>
                        )}
                      </div>

                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>Progress Notes</label>
                        <textarea
                          value={progressNotes} onChange={e => setProgressNotes(e.target.value)}
                          placeholder="Describe patient posture, balance, cough efficacy, or gait assistance needed..."
                          rows={3}
                          style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "12px 14px", color: "#fff", fontSize: 13, resize: "vertical" }}
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          style={{ background: "linear-gradient(135deg, #10b981, #059669)", borderRadius: 14, padding: "12px 28px", fontSize: 13, fontWeight: 700, color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 4px 24px rgba(16,185,129,0.3)", transition: "all 0.2s" }}
                          onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-1px)")}
                          onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
                        >
                          🏥 Log Therapy Encounter
                        </button>
                      </div>
                    </form>

                    {/* Session History */}
                    {sessions.length > 0 && (
                      <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 20 }}>
                        <h3 style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Encounter History</h3>
                        <div className="space-y-2">
                          {sessions.map(s => (
                            <div key={s.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px 16px" }}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span style={{ fontSize: 16 }}>{s.attendanceStatus === "COMPLETED" ? "✅" : s.attendanceStatus === "REFUSED" ? "🚫" : "🤒"}</span>
                                  <div>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{s.attendanceStatus}</span>
                                    {s.stepsAchieved != null && <span style={{ fontSize: 12, color: "#10b981", marginLeft: 10 }}>· {s.stepsAchieved} steps</span>}
                                  </div>
                                </div>
                                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{new Date(s.sessionDate).toLocaleDateString()}</span>
                              </div>
                              {s.progressNotes && <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 6, paddingLeft: 32 }}>{s.progressNotes}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── TAB 3: EXERCISES ── */}
                {activeTab === "exercises" && (
                  <div className="space-y-5">
                    <div style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", borderRadius: 14, padding: "14px 18px" }}>
                      <div className="flex items-start gap-3">
                        <span style={{ fontSize: 20 }}>🎯</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#67e8f9" }}>CarePlan Action Centre Integration</div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>Selected exercises will appear directly in the patient Daily Action Centre as interactive tasks with step counters and instructional guidelines.</div>
                        </div>
                      </div>
                    </div>

                    {assignSuccess && (
                      <div style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 12, padding: "12px 16px", color: "#6ee7b7", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                        <span>🚀</span> {assignSuccess}
                      </div>
                    )}

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 12 }}>Standard Clinical Catalogue</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {DEFAULT_EXERCISES.map((ex, idx) => {
                          const isSelected = selectedExercise.name === ex.name;
                          return (
                            <div
                              key={idx} onClick={() => setSelectedExercise(ex)}
                              style={{
                                background: isSelected ? "rgba(6,182,212,0.12)" : "rgba(255,255,255,0.04)",
                                border: `1px solid ${isSelected ? "rgba(6,182,212,0.5)" : "rgba(255,255,255,0.07)"}`,
                                borderRadius: 16, padding: 16, cursor: "pointer", transition: "all 0.2s",
                                boxShadow: isSelected ? "0 0 20px rgba(6,182,212,0.15)" : "none",
                              }}
                              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.border = "1px solid rgba(255,255,255,0.15)"; }}
                              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.border = "1px solid rgba(255,255,255,0.07)"; }}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? "#a5f3fc" : "#fff" }}>{ex.name}</div>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 8 }} className={EXERCISE_CATEGORY_COLORS[ex.category] ?? "bg-white/10 text-white/50"}>
                                  {ex.category}
                                </span>
                              </div>
                              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>{ex.instruction}</p>
                              <div className="flex gap-4 mt-3">
                                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>🔁 {ex.reps} reps</span>
                                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>📋 {ex.sets} sets/day</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Prescription Panel */}
                    <div style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.1), rgba(99,102,241,0.08))", border: "1px solid rgba(6,182,212,0.25)", borderRadius: 20, padding: 20 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: "#a5f3fc", marginBottom: 16 }}>
                        💊 Prescription for: {selectedExercise.name}
                      </h4>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6, fontWeight: 600 }}>REPETITIONS</label>
                          <input
                            type="number" value={selectedExercise.reps}
                            onChange={e => setSelectedExercise({ ...selectedExercise, reps: parseInt(e.target.value, 10) || 1 })}
                            style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 14px", color: "#fff", fontSize: 16, fontWeight: 700, textAlign: "center" }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6, fontWeight: 600 }}>SETS / DAY</label>
                          <input
                            type="number" value={selectedExercise.sets}
                            onChange={e => setSelectedExercise({ ...selectedExercise, sets: parseInt(e.target.value, 10) || 1 })}
                            style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 14px", color: "#fff", fontSize: 16, fontWeight: 700, textAlign: "center" }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleAssignExercise}
                        style={{ width: "100%", background: "linear-gradient(135deg, #06b6d4, #8b5cf6)", borderRadius: 14, padding: "14px", fontSize: 14, fontWeight: 800, color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 8px 32px rgba(6,182,212,0.4)", transition: "all 0.2s", letterSpacing: "0.02em" }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(6,182,212,0.5)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(6,182,212,0.4)"; }}
                      >
                        🚀 Push to Patient Daily Action Centre
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Empty State */
            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px dashed rgba(255,255,255,0.1)",
              borderRadius: 24, padding: "80px 40px", textAlign: "center",
              backdropFilter: "blur(10px)"
            }}>
              <div style={{ fontSize: 64, marginBottom: 20 }}>🦿</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>Select a Patient Referral</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", maxWidth: 340, margin: "0 auto" }}>
                Choose a physiotherapy referral from the inbox to open the patient rehabilitation studio.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
