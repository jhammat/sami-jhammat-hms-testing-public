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
  const [assessmentNotes] = useState<string>("");
  const [, setAssessments] = useState<NutritionAssessmentRecord[]>([]);

  // Nutrition Plan Form State
  const [planTitle, setPlanTitle] = useState<string>("Post-Operative Pancreatic Dietary Recovery Plan");
  const [dietPhase, setDietPhase] = useState<string>(DIET_PHASES[2]);
  const [caloricTarget, setCaloricTarget] = useState<number>(1800);
  const [proteinTarget, setProteinTarget] = useState<number>(85);
  const [fluidTarget, setFluidTarget] = useState<number>(2000);
  const [foodsToAvoid] = useState<string>("High-fat fried foods, raw cruciferous vegetables, carbonated beverages");
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

  async function loadReferrals() {
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
  }

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

    if (action === "COMPLETE") {
      outcomeNotes = prompt("Enter completion summary & nutritional target status:") || "Nutritional stability achieved.";
    } else if (action === "DECLINE") {
      reason = prompt("Reason for declining referral:") || "Patient not indicated.";
    }

    try {
      const res = await fetch(`/api/v1/allied/referrals/${referralId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, outcomeNotes, reason }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({
          type: "success",
          message: `Referral successfully marked as ${action.toLowerCase()}ed.`,
        });
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
          weightKg: parseFloat(weightKg) || undefined,
          heightCm: parseFloat(heightCm) || undefined,
          weightChangeSinceSurgeryKg: parseFloat(weightChangeKg) || undefined,
          appetiteScore,
          giSymptoms: giSymptoms.trim() || undefined,
          enzymeRequirement,
          notes: assessmentNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: "success", message: "Nutritional assessment documented successfully." });
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
          startDate: new Date().toISOString(),
          caloricTargetKcal: caloricTarget,
          proteinTargetGrams: proteinTarget,
          fluidTargetMl: fluidTarget,
          phase: dietPhase,
          foodsToAvoid: foodsToAvoid.trim() || undefined,
          items: planItems,
          syncToCarePlan,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({
          type: "success",
          message: syncToCarePlan
            ? "Nutrition plan created and synchronized to Patient Daily Action Centre!"
            : "Nutrition plan saved successfully.",
        });
        void loadPatientNutrition(selectedReferral.patientId);
        setActiveTab("history");
      } else {
        throw new Error(data.error?.message || "Failed to create nutrition plan");
      }
    } catch (err: unknown) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Failed to create nutrition plan" });
    }
  }


  function handleAddItem() {
    setPlanItems([
      ...planItems,
      {
        itemType: "MEAL",
        name: "New Meal / Snack",
        timeOfDay: "Mid-Afternoon",
        quantity: 1,
        unit: "serving",
        withMeal: false,
      },
    ]);
  }

  function handleRemoveItem(index: number) {
    setPlanItems(planItems.filter((_, idx) => idx !== index));
  }

  function handleUpdateItem(index: number, updates: Partial<CreateNutritionPlanItemInput>) {
    setPlanItems(
      planItems.map((item, idx) => {
        if (idx !== index) return item;
        const updated = { ...item, ...updates };

        // PERT CLINICAL ENFORCEMENT: Creon must always be withMeal = true
        if (
          updated.itemType === "ENZYME" ||
          /creon|pancreatin|enzyme|pert/i.test(updated.name)
        ) {
          updated.withMeal = true;
        }
        return updated;
      }),
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
              Clinical Dietetics & Nutrition
            </span>
            <span className="text-xs text-slate-400">Referral-Scoped Access</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Pancreatic Nutrition & Dietetics Workspace</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Design staged recovery diets, manage Pancreatic Enzyme Replacement Therapy (PERT / Creon) timing, and synchronize nutrition tasks to the patient Daily Action Centre.
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between border ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Referral Inbox */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                Nutrition Referrals
                <span className="px-2 py-0.5 text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-full font-medium">
                  {referrals.length}
                </span>
              </h2>
              <button
                onClick={loadReferrals}
                className="text-xs text-emerald-600 hover:text-emerald-500 font-medium"
              >
                Refresh
              </button>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading referrals...</div>
            ) : referrals.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No active nutrition referrals found.
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
                          ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 shadow-sm"
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
                              className="px-2 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-[10px] font-semibold shadow-xs"
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
              {/* Header & Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {selectedReferral.patient
                        ? `${selectedReferral.patient.givenName} ${selectedReferral.patient.familyName}`
                        : `Patient #${selectedReferral.patientId.slice(0, 8)}`}
                    </h2>
                    <span className="px-2.5 py-0.5 text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold rounded-full">
                      Referral #{selectedReferral.id.slice(0, 6)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Referred by: {selectedReferral.referringDoctor?.staffProfile?.membership?.displayName || "Surgical Team"}
                  </p>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => setActiveTab("assessment")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                      activeTab === "assessment"
                        ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    Nutritional Assessment
                  </button>
                  <button
                    onClick={() => setActiveTab("plan")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                      activeTab === "plan"
                        ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    Diet Plan & PERT
                  </button>
                  <button
                    onClick={() => setActiveTab("history")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                      activeTab === "history"
                        ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    Active Plan View
                  </button>
                </div>
              </div>

              {/* Tab 1: Nutritional Assessment */}
              {activeTab === "assessment" && (
                <form onSubmit={handleSaveAssessment} className="mt-5 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Weight (kg)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Height (cm)
                      </label>
                      <input
                        type="number"
                        value={heightCm}
                        onChange={(e) => setHeightCm(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-center">
                      <span className="text-[11px] font-medium text-slate-500">Calculated BMI</span>
                      <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                        {bmi ? `${bmi} kg/m²` : "—"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Weight Change Since Surgery (kg)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={weightChangeKg}
                        onChange={(e) => setWeightChangeKg(e.target.value)}
                        placeholder="e.g. -2.5"
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Appetite Score (1 - 10)
                        </label>
                        <span className="text-xs font-bold text-emerald-600">{appetiteScore}/10</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={appetiteScore}
                        onChange={(e) => setAppetiteScore(parseInt(e.target.value, 10))}
                        className="w-full accent-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      GI Symptoms (Steatorrhoea, Diarrhea, Nausea, Bloating)
                    </label>
                    <input
                      type="text"
                      value={giSymptoms}
                      onChange={(e) => setGiSymptoms(e.target.value)}
                      placeholder="e.g. Pale oily stool noted on POD 3; early satiety"
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>

                  <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        Pancreatic Enzyme Replacement Therapy (PERT) Required
                      </span>
                      <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                        Indicated for pancreatic head resection, total pancreatectomy, or steatorrhoea.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={enzymeRequirement}
                      onChange={(e) => setEnzymeRequirement(e.target.checked)}
                      className="w-5 h-5 accent-amber-600 rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm transition"
                    >
                      Save Nutritional Assessment
                    </button>
                  </div>
                </form>
              )}

              {/* Tab 2: Diet Plan & PERT Builder */}
              {activeTab === "plan" && (
                <form onSubmit={handleSavePlan} className="mt-5 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Dietary Recovery Phase
                      </label>
                      <select
                        value={dietPhase}
                        onChange={(e) => setDietPhase(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                      >
                        {DIET_PHASES.map((p, idx) => (
                          <option key={idx} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Plan Title
                      </label>
                      <input
                        type="text"
                        value={planTitle}
                        onChange={(e) => setPlanTitle(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-500 mb-1">Caloric Target (kcal)</label>
                      <input
                        type="number"
                        value={caloricTarget}
                        onChange={(e) => setCaloricTarget(parseInt(e.target.value, 10) || 0)}
                        step="50"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Protein Target (g)</label>
                      <input
                        type="number"
                        value={proteinTarget}
                        onChange={(e) => setProteinTarget(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Fluid Target (mL)</label>
                      <input
                        type="number"
                        value={fluidTarget}
                        onChange={(e) => setFluidTarget(parseInt(e.target.value, 10) || 0)}
                        step="100"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Pancreatic Safety Callout */}
                  <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                    <span className="text-base">⚠️</span>
                    <div>
                      <strong>Clinical Dosing Rule (PERT / Creon):</strong> Pancreatic enzymes are locked to <em>Take With Meal</em>. They must be ingested with the first bite of each meal or snack to prevent acid inactivation and optimize lipid absorption.
                    </div>
                  </div>

                  {/* Meal & Enzyme Schedule Items */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                        Structured Meals & Enzyme Schedule
                      </h3>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-600 hover:text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg border border-emerald-200 dark:border-emerald-800"
                      >
                        + Add Meal / Enzyme
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                      {planItems.map((item, idx) => {
                        const isEnzyme = item.itemType === "ENZYME" || /creon/i.test(item.name);
                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
                              isEnzyme
                                ? "bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                                : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2 w-full">
                              <select
                                value={item.itemType}
                                onChange={(e) => handleUpdateItem(idx, { itemType: e.target.value as NutritionItemType })}
                                className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                              >
                                <option value="MEAL">Meal</option>
                                <option value="SNACK">Snack</option>
                                <option value="SUPPLEMENT">Supplement</option>
                                <option value="ENZYME">PERT / Enzyme</option>
                              </select>

                              <input
                                type="text"
                                value={item.timeOfDay}
                                onChange={(e) => handleUpdateItem(idx, { timeOfDay: e.target.value })}
                                placeholder="Time / Meal Slot"
                                className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                              />

                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => handleUpdateItem(idx, { name: e.target.value })}
                                placeholder="Item / Food Name"
                                className="sm:col-span-2 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
                              />
                            </div>

                            <div className="flex items-center gap-3 self-end sm:self-center">
                              <label className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                                <input
                                  type="checkbox"
                                  checked={item.withMeal}
                                  disabled={isEnzyme}
                                  onChange={(e) => handleUpdateItem(idx, { withMeal: e.target.checked })}
                                  className="accent-amber-600"
                                />
                                With Meal
                              </label>

                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="text-rose-500 hover:text-rose-600 p-1"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                        Synchronize Plan into Patient Daily Action Centre
                      </span>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                        Creates daily meal, snack, and Creon schedule tasks directly in the patient portal.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={syncToCarePlan}
                      onChange={(e) => setSyncToCarePlan(e.target.checked)}
                      className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm transition"
                    >
                      Publish & Synchronize Nutrition Plan
                    </button>
                  </div>
                </form>
              )}

              {/* Tab 3: Active Plan View */}
              {activeTab === "history" && (
                <div className="mt-5 space-y-4">
                  {activePlan ? (
                    <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{activePlan.title}</h3>
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{activePlan.phase}</span>
                        </div>
                        <span className="px-2.5 py-1 text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold rounded-full">
                          Active Plan
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                          <span className="text-slate-400 block text-[10px]">Calories</span>
                          <span className="font-bold text-sm text-slate-900 dark:text-white">{activePlan.caloricTargetKcal ?? "—"} kcal</span>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                          <span className="text-slate-400 block text-[10px]">Protein</span>
                          <span className="font-bold text-sm text-slate-900 dark:text-white">{activePlan.proteinTargetGrams ?? "—"} g</span>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                          <span className="text-slate-400 block text-[10px]">Fluids</span>
                          <span className="font-bold text-sm text-slate-900 dark:text-white">{activePlan.fluidTargetMl ?? "—"} mL</span>
                        </div>
                      </div>

                      {activePlan.items && (
                        <div className="space-y-2 pt-2">
                          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">Prescribed Daily Schedule</h4>
                          <div className="space-y-1.5">
                            {activePlan.items.map((item, i) => (
                              <div
                                key={i}
                                className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs flex justify-between items-center"
                              >
                                <div>
                                  <span className="font-semibold text-slate-900 dark:text-white">[{item.timeOfDay}]</span> {item.name}
                                </div>
                                {item.withMeal && (
                                  <span className="px-2 py-0.5 text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded font-semibold">
                                    With Meal
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No active nutrition plan currently found for this patient. Author one using the &quot;Diet Plan &amp; PERT&quot; tab.
                    </div>
                  )}

                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
              Select a patient referral from the inbox to open their clinical nutrition studio.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
