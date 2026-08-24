"use client";

import React, { useCallback, useEffect, useState } from "react";
import type {
  ClinicalReferral,
  CreateNutritionPlanItemInput,
  NutritionAssessmentRecord,
  NutritionItemType,
  NutritionPlanRecord,
} from "@wonflow/contracts";

const DIET_PHASES = [
  "Phase 1: Clear Liquids",
  "Phase 2: Full Liquids & High-Protein Shakes",
  "Phase 3: Soft / Pureed Pancreatic Diet",
  "Phase 4: Low-Fat Pancreatic Post-Resection Diet",
  "Phase 5: Regular Diet with Long-Term PERT",
];

const DEFAULT_MEAL_TEMPLATES: CreateNutritionPlanItemInput[] = [
  { itemType: "MEAL", name: "Oatmeal with skim milk & sliced banana", timeOfDay: "Breakfast", quantity: 1, unit: "bowl", withMeal: false },
  { itemType: "ENZYME", name: "Creon 25,000 IU (Pancreatin)", timeOfDay: "Breakfast", quantity: 2, unit: "capsules", withMeal: true, instruction: "Take with first bite of breakfast" },
  { itemType: "SNACK", name: "High-protein oral nutrition supplement", timeOfDay: "Mid-Morning", quantity: 200, unit: "mL", withMeal: false },
  { itemType: "ENZYME", name: "Creon 10,000 IU (Pancreatin)", timeOfDay: "Mid-Morning", quantity: 1, unit: "capsule", withMeal: true, instruction: "Take with first sip of snack" },
  { itemType: "MEAL", name: "Poached whitefish with mashed potatoes & steamed zucchini", timeOfDay: "Lunch", quantity: 1, unit: "plate", withMeal: false },
  { itemType: "ENZYME", name: "Creon 25,000 IU (Pancreatin)", timeOfDay: "Lunch", quantity: 2, unit: "capsules", withMeal: true, instruction: "Take with first bite of lunch" },
  { itemType: "MEAL", name: "Clear chicken broth with tender rice & stewed carrots", timeOfDay: "Dinner", quantity: 1, unit: "bowl", withMeal: false },
  { itemType: "ENZYME", name: "Creon 25,000 IU (Pancreatin)", timeOfDay: "Dinner", quantity: 2, unit: "capsules", withMeal: true, instruction: "Take with first bite of dinner" },
];

function GaugeBar({ value, max, color, label, unit }: { value: number; max: number; color: string; label: string; unit: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "16px 18px" }}>
      <div className="flex justify-between items-center mb-2">
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>
          {value} <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>{unit}</span>
        </span>
      </div>
      <div style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 999, transition: "all 0.5s ease" }} />
      </div>
      <div className="flex justify-between mt-1" style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
        <span>0</span>
        <span>Target: {max} {unit}</span>
      </div>
    </div>
  );
}

export function NutritionWorkspace() {
  const [referrals, setReferrals] = useState<ClinicalReferral[]>([]);
  const [selectedReferral, setSelectedReferral] = useState<ClinicalReferral | null>(null);
  const [activeTab, setActiveTab] = useState<"assessment" | "plan" | "history">("assessment");
  const [isLoading, setIsLoading] = useState(true);

  // Assessment Form State
  const [weightKg, setWeightKg] = useState<string>("68.5");
  const [heightCm, setHeightCm] = useState<string>("172");
  const [weightChangeKg, setWeightChangeKg] = useState<string>("-2.5");
  const [appetiteScore, setAppetiteScore] = useState<number>(6);
  const [giSymptoms, setGiSymptoms] = useState<string>("Mild bloating after meals");
  const [enzymeRequirement, setEnzymeRequirement] = useState<boolean>(true);
  const [assessmentNotes, setAssessmentNotes] = useState<string>("");
  const [assessments, setAssessments] = useState<NutritionAssessmentRecord[]>([]);

  // Nutrition Plan Form State
  const [planTitle, setPlanTitle] = useState<string>("Post-Operative Pancreatic Dietary Recovery Plan");
  const [dietPhase, setDietPhase] = useState<string>(DIET_PHASES[2]);
  const [caloricTarget, setCaloricTarget] = useState<number>(1800);
  const [proteinTarget, setProteinTarget] = useState<number>(85);
  const [fluidTarget, setFluidTarget] = useState<number>(2000);
  const [foodsToAvoid, setFoodsToAvoid] = useState<string>("High-fat fried foods, raw cruciferous vegetables, carbonated beverages");
  const [planItems, setPlanItems] = useState<CreateNutritionPlanItemInput[]>(DEFAULT_MEAL_TEMPLATES);
  const [syncToCarePlan, setSyncToCarePlan] = useState<boolean>(true);
  const [activePlan, setActivePlan] = useState<NutritionPlanRecord | null>(null);

  // Status & Feedback
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Derived BMI
  const numericWeight = parseFloat(weightKg);
  const numericHeight = parseFloat(heightCm);
  const bmi =
    !isNaN(numericWeight) && !isNaN(numericHeight) && numericHeight > 0
      ? (numericWeight / Math.pow(numericHeight / 100, 2)).toFixed(1)
      : null;

  const loadReferrals = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/allied/referrals?specialty=NUTRITION");
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
  }, [selectedReferral]);

  async function loadPatientNutrition(patientId: string) {
    try {
      const [resAss, resPlan] = await Promise.all([
        fetch(`/api/v1/allied/nutrition/assessments?patientId=${patientId}`),
        fetch(`/api/v1/allied/nutrition/plans?patientId=${patientId}`),
      ]);
      const dataAss = await resAss.json();
      const dataPlan = await resPlan.json();
      if (dataAss.assessments) setAssessments(dataAss.assessments);
      if (dataPlan.plan) setActivePlan(dataPlan.plan);
    } catch (e) {
      console.error("Failed to load patient nutrition records", e);
    }
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch("/api/v1/allied/referrals?specialty=NUTRITION");
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
        const [resAss, resPlan] = await Promise.all([
          fetch(`/api/v1/allied/nutrition/assessments?patientId=${patientId}`),
          fetch(`/api/v1/allied/nutrition/plans?patientId=${patientId}`),
        ]);
        const dataAss = await resAss.json();
        const dataPlan = await resPlan.json();
        if (active) {
          if (dataAss.assessments) setAssessments(dataAss.assessments);
          if (dataPlan.plan) setActivePlan(dataPlan.plan);
        }
      } catch (e) {
        console.error("Failed to load patient nutrition records", e);
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedReferral?.patientId]);

  async function handleReferralAction(referralId: string, action: "ACCEPT" | "COMPLETE" | "DECLINE") {
    let outcomeNotes = "";
    let reason = "";
    if (action === "COMPLETE") outcomeNotes = prompt("Enter completion summary & discharge nutritional status:") || "Nutritional goals achieved.";
    else if (action === "DECLINE") reason = prompt("Reason for declining referral:") || "Patient transferred or not indicated.";

    try {
      const res = await fetch(`/api/v1/allied/referrals/${referralId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, outcomeNotes, reason }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: "success", message: `Referral marked as ${action.toLowerCase()}ed.` });
        void loadReferrals();
      } else {
        throw new Error(data.error?.message || "Failed to update referral");
      }
    } catch (err: unknown) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Failed to update referral" });
    }
  }

  async function handleSaveAssessment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedReferral) return;

    try {
      const res = await fetch("/api/v1/allied/nutrition/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedReferral.patientId,
          referralId: selectedReferral.id,
          weightKg: numericWeight || undefined,
          heightCm: numericHeight || undefined,
          weightChangeKg: parseFloat(weightChangeKg) || undefined,
          appetiteScore,
          giSymptoms: giSymptoms.trim() || undefined,
          enzymeRequirement,
          notes: assessmentNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: "success", message: "Nutritional assessment saved successfully." });
        void loadPatientNutrition(selectedReferral.patientId);
      } else {
        throw new Error(data.error?.message || "Failed to save assessment");
      }
    } catch (err: unknown) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Failed to save assessment" });
    }
  }

  async function handleSavePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedReferral) return;

    try {
      const res = await fetch("/api/v1/allied/nutrition/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedReferral.patientId,
          referralId: selectedReferral.id,
          title: planTitle.trim(),
          dietPhase,
          caloricTarget,
          proteinTargetGrams: proteinTarget,
          fluidTargetMl: fluidTarget,
          foodsToAvoid: foodsToAvoid.trim() || undefined,
          syncToCarePlan,
          items: planItems,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: "success", message: "Dietary plan created and synced to patient Daily Action Centre!" });
        void loadPatientNutrition(selectedReferral.patientId);
      } else {
        throw new Error(data.error?.message || "Failed to create nutrition plan");
      }
    } catch (err: unknown) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Failed to create nutrition plan" });
    }
  }

  function handleAddPlanItem() {
    setPlanItems([
      ...planItems,
      { itemType: "MEAL", name: "New Meal / Snack", timeOfDay: "Afternoon", quantity: 1, unit: "portion", withMeal: false },
    ]);
  }

  function handleRemovePlanItem(index: number) {
    setPlanItems(planItems.filter((_, i) => i !== index));
  }

  function handleUpdatePlanItem(index: number, updates: Partial<CreateNutritionPlanItemInput>) {
    setPlanItems(planItems.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  }

  const patientName = selectedReferral?.patient
    ? `${selectedReferral.patient.givenName} ${selectedReferral.patient.familyName}`
    : selectedReferral ? `Patient #${selectedReferral.patientId.slice(0, 8)}` : "";

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #091319 0%, #0d1e1f 40%, #0a1f26 100%)" }} className="p-6 space-y-6">

      {/* ── HERO HEADER ── */}
      <div style={{
        background: "linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(6,182,212,0.1) 50%, rgba(245,158,11,0.08) 100%)",
        border: "1px solid rgba(16,185,129,0.25)",
        backdropFilter: "blur(20px)",
      }} className="rounded-3xl p-8 relative overflow-hidden">
        {/* Decorative glow orbs */}
        <div style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: "50%", background: "rgba(16,185,129,0.12)", filter: "blur(45px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -40, left: "25%", width: 160, height: 160, borderRadius: "50%", background: "rgba(6,182,212,0.1)", filter: "blur(40px)", pointerEvents: "none" }} />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div style={{ background: "linear-gradient(135deg, #10b981, #06b6d4)", borderRadius: 12, padding: "10px 14px", fontSize: 22 }}>🥗</div>
              <div>
                <div className="flex items-center gap-2">
                  <span style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#6ee7b7", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", padding: "3px 10px", borderRadius: 20 }} className="uppercase">
                    Allied Health · Clinical Nutrition
                  </span>
                  <span style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", fontSize: 10, padding: "3px 8px", borderRadius: 20 }}>PERT / Pancreatic Diet</span>
                </div>
                <h1 style={{ fontSize: 26, fontWeight: 800, background: "linear-gradient(135deg, #fff 0%, #a7f3d0 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginTop: 4 }}>
                  Clinical Nutrition & Dietetics Workspace
                </h1>
              </div>
            </div>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, maxWidth: 540 }}>
              Manage post-resection pancreatic diet progression, compute caloric & protein targets, titrate PERT (Creon) enzymes, and publish structured meal plans.
            </p>
          </div>

          {/* Live Stats */}
          <div className="flex gap-4">
            {[
              { label: "Active Referrals", value: referrals.length, color: "#10b981" },
              { label: "Plans Active", value: activePlan ? 1 : 0, color: "#06b6d4" },
              { label: "PERT Enforced", value: enzymeRequirement ? "YES" : "NO", color: "#f59e0b" },
            ].map((stat) => (
              <div key={stat.label} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "14px 18px", textAlign: "center", minWidth: 85 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2, whiteSpace: "nowrap" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TOAST FEEDBACK ── */}
      {feedback && (
        <div style={{
          background: feedback.type === "success" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
          border: `1px solid ${feedback.type === "success" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
          borderRadius: 14, padding: "14px 18px",
          color: feedback.type === "success" ? "#6ee7b7" : "#fca5a5",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          backdropFilter: "blur(12px)",
        }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 16 }}>{feedback.type === "success" ? "✓" : "⚠"}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} style={{ color: "rgba(255,255,255,0.4)", fontSize: 18, cursor: "pointer", background: "none", border: "none", lineHeight: 1 }}>✕</button>
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
            <div style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "16px 20px" }} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div style={{ background: "rgba(16,185,129,0.15)", borderRadius: 10, padding: "6px 8px", fontSize: 14 }}>📋</div>
                <div>
                  <h2 style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Dietetics Referrals</h2>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Clinical nutrition queue</p>
                </div>
                {referrals.length > 0 && (
                  <div style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.4)", color: "#6ee7b7", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
                    {referrals.length}
                  </div>
                )}
              </div>
              <button
                onClick={loadReferrals}
                style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#6ee7b7", borderRadius: 10, padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(16,185,129,0.2)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(16,185,129,0.1)")}
              >
                ↻ Refresh
              </button>
            </div>

            <div style={{ padding: "12px", maxHeight: 640, overflowY: "auto" }}>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, height: 90, animation: "pulse 1.5s ease-in-out infinite" }} />
                  ))}
                </div>
              ) : referrals.length === 0 ? (
                <div style={{ padding: "48px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🥗</div>
                  <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, fontWeight: 600 }}>No active referrals</div>
                  <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, marginTop: 4 }}>New nutrition referrals will appear here</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {referrals.map((ref) => {
                    const isSelected = selectedReferral?.id === ref.id;
                    const name = ref.patient ? `${ref.patient.givenName} ${ref.patient.familyName}` : `Patient #${ref.patientId.slice(0, 6)}`;
                    return (
                      <div
                        key={ref.id}
                        onClick={() => setSelectedReferral(ref)}
                        style={{
                          background: isSelected ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.03)",
                          border: `1px solid ${isSelected ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.07)"}`,
                          borderRadius: 16, padding: "14px 16px", cursor: "pointer",
                          transition: "all 0.2s",
                          boxShadow: isSelected ? "0 0 0 1px rgba(16,185,129,0.2), inset 0 1px 0 rgba(255,255,255,0.06)" : "none",
                        }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? "#a7f3d0" : "#fff" }}>{name}</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{ref.reason}</div>
                          </div>
                          <span style={{ background: "rgba(16,185,129,0.15)", color: "#6ee7b7", borderRadius: 8, padding: "3px 8px", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
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
                            Status: <strong style={{ color: ref.status === "IN_PROGRESS" ? "#34d399" : "#60a5fa" }}>{ref.status}</strong>
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

        {/* ── RIGHT: PATIENT NUTRITION STUDIO ── */}
        <div className="lg:col-span-8">
          {selectedReferral ? (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, backdropFilter: "blur(20px)", overflow: "hidden" }}>

              {/* Patient Banner */}
              <div style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.08))", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "20px 24px" }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div style={{ width: 52, height: 52, borderRadius: 16, background: "linear-gradient(135deg, #10b981, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                      {patientName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{patientName}</h2>
                        <span style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#6ee7b7", borderRadius: 8, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>
                          REF #{selectedReferral.id.slice(0, 6).toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
                        Referred by: {selectedReferral.referringDoctor?.staffProfile?.membership?.displayName || "Surgical Team"}
                      </div>
                    </div>
                  </div>

                  {/* Tabs Switcher */}
                  <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 4, display: "flex", gap: 2 }}>
                    {(["assessment", "plan", "history"] as const).map((tab) => {
                      const tabLabels = { assessment: "Assessment", plan: "Dietary Plan", history: `History (${assessments.length})` };
                      const tabIcons  = { assessment: "⚖️", plan: "🍱", history: "📜" };
                      return (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          style={{
                            background: activeTab === tab ? "rgba(16,185,129,0.2)" : "transparent",
                            border: `1px solid ${activeTab === tab ? "rgba(16,185,129,0.4)" : "transparent"}`,
                            color: activeTab === tab ? "#6ee7b7" : "rgba(255,255,255,0.4)",
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

                {/* ── TAB 1: ASSESSMENT ── */}
                {activeTab === "assessment" && (
                  <div className="space-y-6">
                    {/* Metric Quick Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "18px 16px", textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Computed BMI</div>
                        <div style={{ fontSize: 26, fontWeight: 800, color: "#10b981", marginTop: 4 }}>{bmi ?? "--"}</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                          {bmi ? (parseFloat(bmi) < 18.5 ? "Underweight" : parseFloat(bmi) < 25 ? "Normal Range" : "Elevated") : "Enter H/W"}
                        </div>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "18px 16px", textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Weight Delta</div>
                        <div style={{ fontSize: 26, fontWeight: 800, color: parseFloat(weightChangeKg) < 0 ? "#f59e0b" : "#10b981", marginTop: 4 }}>{weightChangeKg} kg</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>Post-operative trend</div>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "18px 16px", textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Appetite Score</div>
                        <div style={{ fontSize: 26, fontWeight: 800, color: appetiteScore >= 7 ? "#10b981" : appetiteScore >= 4 ? "#f59e0b" : "#ef4444", marginTop: 4 }}>{appetiteScore}/10</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>Oral intake readiness</div>
                      </div>
                    </div>

                    <form onSubmit={handleSaveAssessment} className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Current Weight (kg)</label>
                          <input type="number" step="0.1" value={weightKg} onChange={e => setWeightKg(e.target.value)}
                            style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 14px", color: "#fff", fontSize: 13 }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Height (cm)</label>
                          <input type="number" value={heightCm} onChange={e => setHeightCm(e.target.value)}
                            style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 14px", color: "#fff", fontSize: 13 }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Weight Change (kg)</label>
                          <input type="text" value={weightChangeKg} onChange={e => setWeightChangeKg(e.target.value)}
                            style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 14px", color: "#fff", fontSize: 13 }} />
                        </div>
                      </div>

                      {/* Appetite Slider */}
                      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 18 }}>
                        <div className="flex items-center justify-between mb-3">
                          <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>Appetite & Intake Level (0 - 10)</label>
                          <span style={{ fontSize: 18, fontWeight: 800, color: "#10b981" }}>{appetiteScore}<span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>/10</span></span>
                        </div>
                        <input type="range" min="0" max="10" value={appetiteScore} onChange={e => setAppetiteScore(parseInt(e.target.value, 10))}
                          style={{ width: "100%", accentColor: "#10b981" }} />
                        <div className="flex justify-between" style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 6 }}>
                          <span>0: Anorexic / Nil by Mouth</span><span>5: Moderate Intake</span><span>10: Full Normal Appetite</span>
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Gastrointestinal Symptoms</label>
                        <input type="text" value={giSymptoms} onChange={e => setGiSymptoms(e.target.value)}
                          placeholder="e.g. Steatorrhea, early satiety, postprandial nausea"
                          style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 14px", color: "#fff", fontSize: 13 }} />
                      </div>

                      {/* PERT Toggle */}
                      <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 16, padding: "14px 18px" }} className="flex items-center justify-between">
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#6ee7b7" }}>PERT Enzyme Replacement Required</div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Pancreatic exocrine insufficiency titration (e.g. Creon with all meals/snacks)</div>
                        </div>
                        <input type="checkbox" checked={enzymeRequirement} onChange={e => setEnzymeRequirement(e.target.checked)}
                          style={{ width: 20, height: 20, accentColor: "#10b981", cursor: "pointer" }} />
                      </div>

                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Clinical Dietetics Notes</label>
                        <textarea value={assessmentNotes} onChange={e => setAssessmentNotes(e.target.value)}
                          placeholder="Document dietary tolerance, enzyme compliance, bowel habit notes..."
                          rows={2}
                          style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 14px", color: "#fff", fontSize: 13 }} />
                      </div>

                      <div className="flex justify-end">
                        <button type="submit"
                          style={{ background: "linear-gradient(135deg, #10b981, #06b6d4)", borderRadius: 14, padding: "12px 28px", fontSize: 13, fontWeight: 700, color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 4px 24px rgba(16,185,129,0.3)" }}>
                          Save Nutritional Assessment
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* ── TAB 2: DIETARY PLAN ── */}
                {activeTab === "plan" && (
                  <div className="space-y-6">
                    {/* Target Gauges */}
                    <div className="grid grid-cols-3 gap-4">
                      <GaugeBar value={caloricTarget} max={2500} color="linear-gradient(90deg, #10b981, #06b6d4)" label="Caloric Target" unit="kcal" />
                      <GaugeBar value={proteinTarget} max={120} color="linear-gradient(90deg, #06b6d4, #8b5cf6)" label="Protein Target" unit="grams" />
                      <GaugeBar value={fluidTarget} max={3000} color="linear-gradient(90deg, #3b82f6, #06b6d4)" label="Fluid Target" unit="mL" />
                    </div>

                    <form onSubmit={handleSavePlan} className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Dietary Plan Title</label>
                          <input type="text" value={planTitle} onChange={e => setPlanTitle(e.target.value)}
                            style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 14px", color: "#fff", fontSize: 13 }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Recovery Phase</label>
                          <select value={dietPhase} onChange={e => setDietPhase(e.target.value)}
                            style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 14px", color: "#fff", fontSize: 13 }}>
                            {DIET_PHASES.map(phase => <option key={phase} value={phase}>{phase}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Nutrient Sliders */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", display: "block", marginBottom: 6 }}>Calories: {caloricTarget} kcal</label>
                          <input type="range" min="1000" max="3000" step="50" value={caloricTarget} onChange={e => setCaloricTarget(parseInt(e.target.value, 10))} style={{ width: "100%", accentColor: "#10b981" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", display: "block", marginBottom: 6 }}>Protein: {proteinTarget} g</label>
                          <input type="range" min="40" max="150" step="5" value={proteinTarget} onChange={e => setProteinTarget(parseInt(e.target.value, 10))} style={{ width: "100%", accentColor: "#06b6d4" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", display: "block", marginBottom: 6 }}>Fluids: {fluidTarget} mL</label>
                          <input type="range" min="1000" max="3500" step="100" value={fluidTarget} onChange={e => setFluidTarget(parseInt(e.target.value, 10))} style={{ width: "100%", accentColor: "#3b82f6" }} />
                        </div>
                      </div>

                      {/* Meals & PERT Items */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Structured Meal Schedule & PERT Enzyme Titration</label>
                          <button type="button" onClick={handleAddPlanItem}
                            style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#6ee7b7", borderRadius: 10, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                            + Add Item
                          </button>
                        </div>

                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                          {planItems.map((item, idx) => (
                            <div key={idx} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "10px 14px" }} className="flex items-center gap-3">
                              <span style={{ fontSize: 16 }}>{item.itemType === "ENZYME" ? "💊" : item.itemType === "SNACK" ? "🍎" : "🍲"}</span>
                              <select value={item.itemType} onChange={e => handleUpdatePlanItem(idx, { itemType: e.target.value as NutritionItemType })}
                                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 8px", color: "#fff", fontSize: 11 }}>
                                <option value="MEAL">Meal</option>
                                <option value="ENZYME">PERT Enzyme</option>
                                <option value="SNACK">Snack</option>
                                <option value="SUPPLEMENT">Supplement</option>
                              </select>
                              <input type="text" value={item.timeOfDay} onChange={e => handleUpdatePlanItem(idx, { timeOfDay: e.target.value })}
                                placeholder="Time" style={{ width: 90, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 8px", color: "#fff", fontSize: 11 }} />
                              <input type="text" value={item.name} onChange={e => handleUpdatePlanItem(idx, { name: e.target.value })}
                                placeholder="Description" style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 8px", color: "#fff", fontSize: 11 }} />
                              <button type="button" onClick={() => handleRemovePlanItem(idx)} style={{ color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>✕</button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* CarePlan Sync */}
                      <div style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", borderRadius: 16, padding: "14px 18px" }} className="flex items-center justify-between">
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#67e8f9" }}>Publish to Patient Daily Action Centre</div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Interactive meal checklists and enzyme dose timers appear in the patient portal</div>
                        </div>
                        <input type="checkbox" checked={syncToCarePlan} onChange={e => setSyncToCarePlan(e.target.checked)}
                          style={{ width: 20, height: 20, accentColor: "#06b6d4", cursor: "pointer" }} />
                      </div>

                      <div className="flex justify-end">
                        <button type="submit"
                          style={{ background: "linear-gradient(135deg, #10b981, #06b6d4)", borderRadius: 14, padding: "12px 28px", fontSize: 13, fontWeight: 700, color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 4px 24px rgba(16,185,129,0.3)" }}>
                          🚀 Publish & Sync Nutrition Plan
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* ── TAB 3: HISTORY ── */}
                {activeTab === "history" && (
                  <div className="space-y-4">
                    {assessments.length === 0 ? (
                      <div style={{ padding: "40px", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>No past assessments found</div>
                    ) : (
                      assessments.map(a => (
                        <div key={a.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "16px 18px" }} className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Weight: {a.weightKg ? `${a.weightKg} kg` : "N/A"}</span>
                              <span style={{ fontSize: 12, color: "#10b981", fontWeight: 700 }}>· Appetite: {a.appetiteScore}/10</span>
                              {a.enzymeRequirement && (
                                <span style={{ background: "rgba(245,158,11,0.15)", color: "#fcd34d", borderRadius: 6, padding: "2px 6px", fontSize: 10, fontWeight: 700 }}>PERT ACTIVE</span>
                              )}
                            </div>
                            {a.giSymptoms && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>GI: {a.giSymptoms}</div>}
                          </div>
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{new Date(a.assessedAt).toLocaleDateString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px dashed rgba(255,255,255,0.1)",
              borderRadius: 24, padding: "80px 40px", textAlign: "center",
              backdropFilter: "blur(10px)",
            }}>
              <div style={{ fontSize: 64, marginBottom: 20 }}>🥗</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>Select a Patient Referral</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", maxWidth: 340, margin: "0 auto" }}>
                Choose a clinical dietetics referral from the inbox to open their nutritional assessment and PERT titration studio.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
