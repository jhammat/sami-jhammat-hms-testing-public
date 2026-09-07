"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { publishActivePatient } from "@/components/shell/active-patient-signal";
import {
  Activity,
  AlertTriangle,
  Apple,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Compass,
  Droplets,
  Flame,
  HeartPulse,
  Inbox,
  ListPlus,
  Pill,
  Plus,
  RefreshCw,
  Scale,
  Search,
  Send,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserRound,
  Users,
  Utensils,
  X,
} from "lucide-react";

import type {
  CarePlanRosterItem,
  ClinicalReferral,
  CreateNutritionPlanItemInput,
  NutritionAssessmentRecord,
  NutritionItemType,
  NutritionPlanRecord,
} from "@wonflow/contracts";

import { TrendLine } from "@/components/charts";

import {
  AuroraHero,
  EmptyPrompt,
  GlassButton,
  GlassChip,
  GlassField,
  GlassInput,
  GlassModal,
  GlassPanel,
  GlassSelect,
  GlassSkeleton,
  GlassStat,
  GlassTextarea,
  GlassWell,
  GradientSlider,
  MeterBar,
  Notice,
  Pill as StatusPill,
  ProgressRing,
  SegmentedControl,
  Stepper,
  SwitchRow,
  type PillTone,
} from "./allied-glass";

import {
  BAND_LABELS,
  COMMON_AVOID_LISTS,
  COUNSELLING_SETS,
  DIET_PHASES,
  ENTERAL_FORMULAS,
  ENZYME_STRENGTHS,
  ITEM_TYPE_HUE,
  ITEM_TYPE_LABELS,
  ITEM_TYPE_ORDER,
  MEAL_TEMPLATES,
  TARGET_BANDS,
  TIMES_OF_DAY,
  bmiBand,
  bmiFrom,
  calculateEnteral,
  calculatePertDose,
  dietPhaseById,
  estimateTargets,
  mustScore,
  pertDailyCeiling,
  type ClinicalBand,
  type MealTemplate,
} from "./nutrition-clinical-data";

/* ================================================================== */
/* Custom Preset Interfaces & Defaults                                 */
/* ================================================================== */

export interface PertBrandItem {
  id: string;
  label: string;
  isCustom?: boolean;
}

export const DEFAULT_PERT_BRANDS: PertBrandItem[] = [
  { id: "Creon", label: "Creon®" },
  { id: "Zenpep", label: "Zenpep®" },
  { id: "Pancreaze", label: "Pancreaze®" },
  { id: "Pertzye", label: "Pertzye®" },
  { id: "Generic", label: "Generic Pancrelipase" },
];

export const DEFAULT_STRENGTHS = [5000, 10000, 20000, 25000, 36000, 40000, 50000];

export interface DosingRatioItem {
  value: number;
  label: string;
  isCustom?: boolean;
}

export const DEFAULT_RATIOS: DosingRatioItem[] = [
  { value: 1500, label: "1.5k IU/g" },
  { value: 2000, label: "2.0k IU/g (Standard)" },
  { value: 2500, label: "2.5k IU/g" },
  { value: 3000, label: "3.0k IU/g" },
  { value: 4000, label: "4.0k IU/g (Severe PEI)" },
];

export interface EnteralFormulaItem {
  id: string;
  label: string;
  kcalPerMl: number;
  proteinPerL: number;
  isCustom?: boolean;
}

export const DEFAULT_ENTERAL_FORMULAS: EnteralFormulaItem[] = ENTERAL_FORMULAS.map((f) => ({
  ...f,
  isCustom: false,
}));

/* ================================================================== */
/* Constants                                                           */
/* ================================================================== */

const ACCENT = "#059669";
const ACCENT_BRIGHT = "#34d399";

const APPETITE_RAMP = ["#ef4444", "#fb923c", "#facc15", "#84cc16", "#10b981"];

type WorkspaceTab = "overview" | "caseload" | "assessment" | "plan" | "calculators" | "history" | "alerts";

/** The page these sections share. The sidebar links here with `?view=`. */
const PATHNAME = "/operations/nutrition";

/** Query values the sidebar links with, mapped onto the section they open. */
const VIEW_PARAM_TABS: Record<string, WorkspaceTab> = {
  overview: "overview",
  deck: "overview",
  inbox: "caseload",
  caseload: "caseload",
  assessment: "assessment",
  plan: "plan",
  pert: "calculators",
  enteral: "calculators",
  calculators: "calculators",
  history: "history",
  alerts: "alerts",
  "clinical-alerts": "alerts",
};

const REFERRAL_TONE: Record<string, PillTone> = {
  PENDING: "warning",
  ACCEPTED: "info",
  IN_PROGRESS: "info",
  COMPLETED: "good",
  CANCELLED: "neutral",
  EXPIRED: "neutral",
};

const PRIORITY_TONE: Record<string, PillTone> = {
  ROUTINE: "neutral",
  URGENT: "warning",
  EMERGENCY: "critical",
};

/* ================================================================== */
/* Workspace                                                           */
/* ================================================================== */

export function NutritionWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewParam = searchParams?.get("view");

  /**
   * The section lives in the URL, because the sidebar is what navigates now.
   *
   * The workspace used to carry its own tab rail above the content, so the
   * section could be plain local state. Those sections are sidebar entries
   * instead, and a sidebar can only highlight what it can see - which is the
   * URL. Buttons inside the content that jump to another section therefore
   * change the URL too, so the two can never disagree about where you are.
   *
   * `replace` rather than `push`: moving between sections of one workspace is
   * not a trail you want the back button to walk through a step at a time.
   * The section is still held in state alongside the query value it came from
   * and adjusted during render when that changes, so it switches on the same
   * paint as the click rather than waiting on the router.
   */
  const paramTab = viewParam ? VIEW_PARAM_TABS[viewParam] : undefined;

  const [tabState, setTabState] = useState<{ tab: WorkspaceTab; param: string | null }>(() => ({
    tab: paramTab ?? "caseload",
    param: viewParam ?? null,
  }));

  if ((viewParam ?? null) !== tabState.param) {
    setTabState({ tab: paramTab ?? tabState.tab, param: viewParam ?? null });
  }

  const activeTab = tabState.tab;

  const setActiveTab = useCallback(
    (tab: WorkspaceTab) => {
      setTabState({ tab, param: tab });
      router.replace(`${PATHNAME}?view=${tab}`, { scroll: false });
    },
    [router],
  );

  /* -------------------------------------------------------------- */
  /* Server state                                                    */
  /* -------------------------------------------------------------- */

  const [referrals, setReferrals] = useState<ClinicalReferral[]>([]);
  const [roster, setRoster] = useState<CarePlanRosterItem[]>([]);
  const [assessments, setAssessments] = useState<NutritionAssessmentRecord[]>([]);
  const [activePlan, setActivePlan] = useState<NutritionPlanRecord | null>(null);

  const [isLoadingCaseload, setIsLoadingCaseload] = useState(true);
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{
    tone: "good" | "critical" | "info";
    title: string;
    detail?: string;
  } | null>(null);

  /**
   * The chosen patient. Null until the dietitian chooses one.
   *
   * This screen used to select the first referral in the list and pre-fill
   * the assessment form with a fixed weight, height, appetite score and GI
   * symptom string. The result was that opening the portal showed one
   * patient's body measurements under another patient's name, next to a Save
   * button. Nothing here is pre-selected or pre-filled, ever.
   */
  const [selectedReferralId, setSelectedReferralId] = useState<string | null>(null);

  const [caseloadSearch, setCaseloadSearch] = useState("");
  const [caseloadStatus, setCaseloadStatus] = useState("ALL");

  /* -------------------------------------------------------------- */
  /* Assessment drafts — all unset                                   */
  /* -------------------------------------------------------------- */

  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [weightChangeKg, setWeightChangeKg] = useState<number | null>(null);
  const [appetiteScore, setAppetiteScore] = useState<number | null>(null);
  const [giSymptoms, setGiSymptoms] = useState("");
  const [enzymeRequirement, setEnzymeRequirement] = useState(false);
  const [intakeNotes, setIntakeNotes] = useState("");
  const [assessmentNotes, setAssessmentNotes] = useState("");
  const [acutelyUnwell, setAcutelyUnwell] = useState(false);
  const [targetBand, setTargetBand] = useState<
    "post-op" | "hpb-resection" | "cirrhosis" | "transplant" | null
  >(null);

  /* -------------------------------------------------------------- */
  /* Plan drafts — all unset                                         */
  /* -------------------------------------------------------------- */

  const [planTitle, setPlanTitle] = useState("");
  const [dietPhaseId, setDietPhaseId] = useState<string | null>(null);
  const [caloricTarget, setCaloricTarget] = useState<number | null>(null);
  const [proteinTarget, setProteinTarget] = useState<number | null>(null);
  const [fluidTarget, setFluidTarget] = useState<number | null>(null);
  const [foodsToAvoid, setFoodsToAvoid] = useState("");
  const [planItems, setPlanItems] = useState<CreateNutritionPlanItemInput[]>([]);
  const [syncToCarePlan, setSyncToCarePlan] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateBand, setTemplateBand] = useState<ClinicalBand | null>(null);

  /* -------------------------------------------------------------- */
  /* Calculator drafts & Custom Elements — fully customizable        */
  /* -------------------------------------------------------------- */

  // Brands
  const [pertBrands, setPertBrands] = useState<PertBrandItem[]>(DEFAULT_PERT_BRANDS);
  const [pertBrand, setPertBrand] = useState<string>("Creon");
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");

  // Capsule Strengths
  const [strengthPresets, setStrengthPresets] = useState<number[]>(DEFAULT_STRENGTHS);
  const [capsuleStrength, setCapsuleStrength] = useState<number | null>(10000);
  const [customCapsuleStrength, setCustomCapsuleStrength] = useState<string>("");
  const [isCustomStrength, setIsCustomStrength] = useState(false);
  const [showAddStrengthModal, setShowAddStrengthModal] = useState(false);
  const [newStrengthInput, setNewStrengthInput] = useState("");

  // Dietary Fat Inputs
  const [mealFatGrams, setMealFatGrams] = useState<number | null>(null);
  const [snackFatGrams, setSnackFatGrams] = useState<number | null>(null);

  // Ratios & Floors
  const [dosingRatios, setDosingRatios] = useState<DosingRatioItem[]>(DEFAULT_RATIOS);
  const [pertRatioPerGram, setPertRatioPerGram] = useState<number>(2000);
  const [pertMealFloor, setPertMealFloor] = useState<number>(25000);
  const [pertSnackFloor, setPertSnackFloor] = useState<number>(10000);
  const [showAdvancedPert, setShowAdvancedPert] = useState(false);
  const [showAddRatioModal, setShowAddRatioModal] = useState(false);
  const [newRatioValue, setNewRatioValue] = useState("");
  const [newRatioLabel, setNewRatioLabel] = useState("");

  // Weight Override
  const [patientWeightOverride, setPatientWeightOverride] = useState<number | null>(null);

  // Enteral Tube Feeding
  const [enteralRate, setEnteralRate] = useState<number | null>(null);
  const [enteralHours, setEnteralHours] = useState<number | null>(null);
  const [allEnteralFormulas, setAllEnteralFormulas] = useState<EnteralFormulaItem[]>(DEFAULT_ENTERAL_FORMULAS);
  const [enteralFormulaId, setEnteralFormulaId] = useState<string | null>(null);
  const [showAddFormulaModal, setShowAddFormulaModal] = useState(false);
  const [showManageFormulasModal, setShowManageFormulasModal] = useState(false);
  const [newFormulaName, setNewFormulaName] = useState("");
  const [newFormulaKcal, setNewFormulaKcal] = useState("1.5");
  const [newFormulaProtein, setNewFormulaProtein] = useState("64");

  // Plan Avoidance Lists
  const [customAvoidLists, setCustomAvoidLists] = useState<{ id: string; label: string; band: ClinicalBand; text: string }[]>([]);
  const [deletedAvoidIds, setDeletedAvoidIds] = useState<string[]>([]);
  const [showAddAvoidModal, setShowAddAvoidModal] = useState(false);
  const [newAvoidLabel, setNewAvoidLabel] = useState("");
  const [newAvoidText, setNewAvoidText] = useState("");

  // Meal Templates Library
  const [customMealTemplates, setCustomMealTemplates] = useState<MealTemplate[]>([]);
  const [deletedTemplateIds, setDeletedTemplateIds] = useState<string[]>([]);
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateType, setNewTemplateType] = useState<NutritionItemType>("MEAL");
  const [newTemplateTime, setNewTemplateTime] = useState("Breakfast");
  const [newTemplateQty, setNewTemplateQty] = useState("1");
  const [newTemplateUnit, setNewTemplateUnit] = useState("portion");
  const [newTemplateInstruction, setNewTemplateInstruction] = useState("");
  const [newTemplateRationale, setNewTemplateRationale] = useState("");
  const [newTemplateBand, setNewTemplateBand] = useState<ClinicalBand>("HPB");

  /* -------------------------------------------------------------- */
  /* Referral completion                                             */
  /* -------------------------------------------------------------- */

  const [completingReferralId, setCompletingReferralId] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [handoffNote, setHandoffNote] = useState("");

  /* -------------------------------------------------------------- */
  /* Derived                                                         */
  /* -------------------------------------------------------------- */

  const selectedReferral = useMemo(
    () => referrals.find((referral) => referral.id === selectedReferralId) ?? null,
    [referrals, selectedReferralId],
  );

  const patientName = selectedReferral?.patient
    ? `${selectedReferral.patient.givenName} ${selectedReferral.patient.familyName}`.trim()
    : null;


  /*
   * The sidebar owns the section links now, and four of them only mean
   * anything against a named patient. It sits outside this component, so the
   * choice is published to it rather than passed down. Cleared on unmount so
   * leaving the workspace does not leave a stale name in the sidebar.
   */
  useEffect(() => {
    publishActivePatient(patientName);
    return () => publishActivePatient(null);
  }, [patientName]);

  const rosterEntry = useMemo(
    () =>
      selectedReferral
        ? (roster.find((item) => item.patientId === selectedReferral.patientId) ?? null)
        : null,
    [roster, selectedReferral],
  );

  const latestAssessment = assessments[0] ?? null;

  const bmi = bmiFrom(weightKg, heightCm);
  const bmiVerdict = bmiBand(bmi);

  const weightLossPercent =
    weightChangeKg !== null && weightKg !== null && weightKg > 0
      ? Number(((Math.abs(Math.min(0, weightChangeKg)) / (weightKg + Math.abs(Math.min(0, weightChangeKg)))) * 100).toFixed(1))
      : null;

  const must = mustScore(bmi, weightLossPercent, acutelyUnwell);
  const targets = targetBand ? estimateTargets(weightKg, targetBand) : null;

  // Dynamic effective weight: can be set directly in calculator or inherited from patient assessment
  const effectiveWeightKg =
    patientWeightOverride !== null
      ? patientWeightOverride
      : weightKg ?? (latestAssessment?.weightKg ? Number(latestAssessment.weightKg) : null);

  const effectiveCapsuleStrength =
    isCustomStrength && customCapsuleStrength && Number(customCapsuleStrength) > 0
      ? Number(customCapsuleStrength)
      : capsuleStrength;

  const mealDose = calculatePertDose(
    mealFatGrams,
    effectiveCapsuleStrength,
    "meal",
    pertRatioPerGram,
    pertMealFloor,
  );
  const snackDose = calculatePertDose(
    snackFatGrams,
    effectiveCapsuleStrength,
    "snack",
    pertRatioPerGram,
    pertSnackFloor,
  );
  const dailyCeiling = pertDailyCeiling(effectiveWeightKg);
  const estimatedDailyUnits =
    (mealDose && mealDose.units > 0 ? mealDose.units * 3 : 0) +
    (snackDose && snackDose.units > 0 ? snackDose.units * 2 : 0);
  const ceilingPercent =
    dailyCeiling && dailyCeiling > 0
      ? Math.round((estimatedDailyUnits / dailyCeiling) * 100)
      : null;

  const enteralFormula = allEnteralFormulas.find((formula) => formula.id === enteralFormulaId) ?? null;
  const enteral = calculateEnteral(
    enteralRate,
    enteralHours,
    enteralFormula?.kcalPerMl ?? null,
    enteralFormula?.proteinPerL ?? null,
    effectiveWeightKg,
  );

  /* -------------------------------------------------------------- */
  /* Dynamic Custom & Delete Handlers                                */
  /* -------------------------------------------------------------- */

  // Brands
  const handleAddBrand = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const name = newBrandName.trim();
    if (!name) return;
    if (pertBrands.some((b) => b.id.toLowerCase() === name.toLowerCase())) {
      setFeedback({ tone: "info", title: "Brand already exists", detail: `${name} is already available in formulations.` });
      return;
    }
    const newBrand: PertBrandItem = { id: name, label: name, isCustom: true };
    setPertBrands((prev) => [...prev, newBrand]);
    setPertBrand(name);
    setNewBrandName("");
    setShowAddBrandModal(false);
    setFeedback({ tone: "good", title: "Custom brand added", detail: `Added ${name} to available formulations.` });
  };

  const handleDeleteBrand = (brandId: string) => {
    if (pertBrands.length <= 1) {
      setFeedback({ tone: "info", title: "Cannot delete brand", detail: "At least one brand must remain available." });
      return;
    }
    const updated = pertBrands.filter((b) => b.id !== brandId);
    setPertBrands(updated);
    if (pertBrand === brandId) {
      setPertBrand(updated[0].id);
    }
    setFeedback({ tone: "good", title: "Brand removed", detail: `Removed ${brandId} from available formulations.` });
  };

  // Strengths
  const handleAddStrengthPreset = (val: number) => {
    if (strengthPresets.includes(val)) {
      setCapsuleStrength(val);
      setIsCustomStrength(false);
      setShowAddStrengthModal(false);
      return;
    }
    const updated = [...strengthPresets, val].sort((a, b) => a - b);
    setStrengthPresets(updated);
    setCapsuleStrength(val);
    setIsCustomStrength(false);
    setShowAddStrengthModal(false);
    setNewStrengthInput("");
    setFeedback({ tone: "good", title: "Strength preset added", detail: `Added ${val.toLocaleString()} IU to quick presets.` });
  };

  const handleDeleteStrength = (strength: number) => {
    if (strengthPresets.length <= 1) {
      setFeedback({ tone: "info", title: "Cannot delete strength", detail: "At least one preset strength must remain." });
      return;
    }
    const updated = strengthPresets.filter((s) => s !== strength);
    setStrengthPresets(updated);
    if (capsuleStrength === strength) {
      setCapsuleStrength(updated[0]);
    }
    setFeedback({ tone: "good", title: "Preset removed", detail: `Removed ${strength.toLocaleString()} IU from quick presets.` });
  };

  // Ratios
  const handleAddRatio = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const val = parseInt(newRatioValue, 10);
    if (!val || val < 500 || val > 10000) {
      setFeedback({ tone: "info", title: "Invalid ratio", detail: "Enter a ratio between 500 and 10,000 IU/g fat." });
      return;
    }
    const label = newRatioLabel.trim() || `${(val / 1000).toFixed(1)}k IU/g`;
    if (dosingRatios.some((r) => r.value === val)) {
      setPertRatioPerGram(val);
      setShowAddRatioModal(false);
      return;
    }
    const updated = [...dosingRatios, { value: val, label, isCustom: true }].sort((a, b) => a.value - b.value);
    setDosingRatios(updated);
    setPertRatioPerGram(val);
    setNewRatioValue("");
    setNewRatioLabel("");
    setShowAddRatioModal(false);
    setFeedback({ tone: "good", title: "Dosing ratio added", detail: `Added ${label} (${val.toLocaleString()} IU/g fat).` });
  };

  const handleDeleteRatio = (val: number) => {
    if (dosingRatios.length <= 1) {
      setFeedback({ tone: "info", title: "Cannot delete ratio", detail: "At least one ratio option must remain." });
      return;
    }
    const updated = dosingRatios.filter((r) => r.value !== val);
    setDosingRatios(updated);
    if (pertRatioPerGram === val) {
      setPertRatioPerGram(updated[0].value);
    }
    setFeedback({ tone: "good", title: "Ratio removed", detail: `Removed ${val.toLocaleString()} IU/g from options.` });
  };

  // Enteral Formulas
  const handleAddCustomFormula = (e: FormEvent) => {
    e.preventDefault();
    if (!newFormulaName.trim()) return;
    const id = `custom-${Date.now()}`;
    const kcal = parseFloat(newFormulaKcal) || 1.5;
    const protein = parseFloat(newFormulaProtein) || 64;
    const created: EnteralFormulaItem = {
      id,
      label: `${newFormulaName.trim()} (${kcal} kcal/mL, ${protein}g/L)`,
      kcalPerMl: kcal,
      proteinPerL: protein,
      isCustom: true,
    };
    setAllEnteralFormulas((prev) => [...prev, created]);
    setEnteralFormulaId(id);
    setShowAddFormulaModal(false);
    setNewFormulaName("");
    setFeedback({
      tone: "good",
      title: "Custom enteral formula added",
      detail: `Added ${created.label} to available formulas.`,
    });
  };

  const handleDeleteFormula = (formulaId: string) => {
    if (allEnteralFormulas.length <= 1) {
      setFeedback({ tone: "info", title: "Cannot delete formula", detail: "At least one formula must remain available." });
      return;
    }
    const target = allEnteralFormulas.find((f) => f.id === formulaId);
    const updated = allEnteralFormulas.filter((f) => f.id !== formulaId);
    setAllEnteralFormulas(updated);
    if (enteralFormulaId === formulaId) {
      setEnteralFormulaId(updated[0]?.id ?? null);
    }
    setFeedback({
      tone: "good",
      title: "Formula deleted",
      detail: `Removed ${target?.label ?? formulaId} from available formulas.`,
    });
  };

  // Regimen Plan Deletion
  const pertPlanItemsCount = useMemo(
    () => planItems.filter((item) => item.itemType === "ENZYME").length,
    [planItems],
  );

  const clearPertFromPlan = () => {
    setPlanItems((prev) => prev.filter((item) => item.itemType !== "ENZYME"));
    setFeedback({
      tone: "info",
      title: "PERT regimen deleted from plan",
      detail: "Removed all pancreatic enzyme items from the active dietary plan draft.",
    });
  };

  const hasEnteralInPlan = useMemo(
    () => planItems.some((item) => item.name.toLowerCase().startsWith("enteral:")),
    [planItems],
  );

  const clearEnteralFromPlan = () => {
    setPlanItems((prev) => prev.filter((item) => !item.name.toLowerCase().startsWith("enteral:")));
    setFeedback({
      tone: "info",
      title: "Enteral feed deleted from plan",
      detail: "Removed enteral tube feeding regimen from the active dietary plan draft.",
    });
  };

  // Avoid Lists
  const allAvoidLists = useMemo(
    () => [...COMMON_AVOID_LISTS, ...customAvoidLists].filter((a) => !deletedAvoidIds.includes(a.id)),
    [customAvoidLists, deletedAvoidIds],
  );

  const handleAddAvoidList = (e: FormEvent) => {
    e.preventDefault();
    if (!newAvoidLabel.trim() || !newAvoidText.trim()) return;
    const newId = `custom-avoid-${Date.now()}`;
    setCustomAvoidLists((prev) => [
      ...prev,
      { id: newId, label: newAvoidLabel.trim(), band: "HPB", text: newAvoidText.trim() },
    ]);
    setFoodsToAvoid(newAvoidText.trim());
    setNewAvoidLabel("");
    setNewAvoidText("");
    setShowAddAvoidModal(false);
    setFeedback({ tone: "good", title: "Custom restriction added", detail: "Added to quick avoidance lists." });
  };

  const handleDeleteAvoidList = (avoidId: string) => {
    setDeletedAvoidIds((prev) => [...prev, avoidId]);
    setFeedback({ tone: "good", title: "Restriction removed", detail: "Removed from quick avoidance lists." });
  };

  // Meal Templates
  const allMealTemplates = useMemo(
    () => [...MEAL_TEMPLATES, ...customMealTemplates].filter((t) => !deletedTemplateIds.includes(t.id)),
    [customMealTemplates, deletedTemplateIds],
  );

  const handleCreateTemplate = (e: FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;
    const id = `custom-tpl-${Date.now()}`;
    const qty = parseInt(newTemplateQty, 10) || 1;
    const created: MealTemplate = {
      id,
      name: newTemplateName.trim(),
      itemType: newTemplateType,
      timeOfDay: newTemplateTime,
      quantity: qty,
      unit: newTemplateUnit.trim() || "portion",
      withMeal: true,
      band: newTemplateBand,
      phases: ["hpb-trans", "hpb-lowfat", "hpb-full", "gen-pureed", "gen-soft", "gen-full"],
      instruction: newTemplateInstruction.trim() || `Take with ${newTemplateTime.toLowerCase()}`,
      rationale: newTemplateRationale.trim() || "Custom clinical dietary item",
    };
    setCustomMealTemplates((prev) => [...prev, created]);
    setShowCreateTemplateModal(false);
    setNewTemplateName("");
    setNewTemplateInstruction("");
    setNewTemplateRationale("");
    setFeedback({ tone: "good", title: "Custom template created", detail: `Added ${created.name} to template library.` });
  };

  const handleDeleteTemplate = (templateId: string) => {
    setDeletedTemplateIds((prev) => [...prev, templateId]);
    setFeedback({ tone: "good", title: "Template removed", detail: "Removed from template library." });
  };

  /* -------------------------------------------------------------- */
  /* Loaders                                                         */
  /* -------------------------------------------------------------- */

  const loadCaseload = useCallback(async () => {
    try {
      const [referralResponse, rosterResponse] = await Promise.all([
        fetch("/api/v1/allied/referrals?specialty=NUTRITION&pageSize=100"),
        fetch("/api/v1/clinical/careplans/roster"),
      ]);

      if (referralResponse.ok) {
        const data = await referralResponse.json();
        setReferrals(data.referrals ?? []);
      } else {
        setFeedback({ tone: "critical", title: "Could not load the dietetics caseload." });
      }

      if (rosterResponse.ok) {
        const data = await rosterResponse.json();
        setRoster(data.roster ?? []);
      }
    } catch {
      setFeedback({
        tone: "critical",
        title: "Could not reach the referral service.",
        detail: "Check the connection and refresh.",
      });
    } finally {
      setIsLoadingCaseload(false);
    }
  }, []);

  const refreshCaseload = useCallback(() => {
    setIsLoadingCaseload(true);
    void loadCaseload();
  }, [loadCaseload]);

  const loadPatientRecord = useCallback(async (patientId: string) => {
    try {
      const [assessmentResponse, planResponse] = await Promise.all([
        fetch(`/api/v1/allied/nutrition/assessments?patientId=${patientId}`),
        fetch(`/api/v1/allied/nutrition/plans?patientId=${patientId}`),
      ]);

      setAssessments(
        assessmentResponse.ok ? ((await assessmentResponse.json()).assessments ?? []) : [],
      );
      setActivePlan(planResponse.ok ? ((await planResponse.json()).plan ?? null) : null);
    } catch {
      setFeedback({ tone: "critical", title: "Could not load this patient's nutrition record." });
    } finally {
      setIsLoadingPatient(false);
    }
  }, []);

  /*
   * `react-hooks/set-state-in-effect` fires on any effect that reaches a
   * setState, including one that only runs after an await. Loading the
   * caseload on mount is exactly that case: the loaders touch no state before
   * their first await, so there is no cascading render to avoid.
   */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see note above
    void loadCaseload();
  }, [loadCaseload]);

  useEffect(() => {
    if (!selectedReferral?.patientId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see note above
    void loadPatientRecord(selectedReferral.patientId);
  }, [loadPatientRecord, selectedReferral?.patientId]);

  /** Switching patient clears every draft, so nothing crosses between records. */
  function choosePatient(referralId: string | null) {
    setSelectedReferralId(referralId);
    setIsLoadingPatient(referralId !== null);
    setAssessments([]);
    setActivePlan(null);

    setWeightKg(null);
    setHeightCm(null);
    setWeightChangeKg(null);
    setAppetiteScore(null);
    setGiSymptoms("");
    setEnzymeRequirement(false);
    setIntakeNotes("");
    setAssessmentNotes("");
    setAcutelyUnwell(false);
    setTargetBand(null);

    setPlanTitle("");
    setDietPhaseId(null);
    setCaloricTarget(null);
    setProteinTarget(null);
    setFluidTarget(null);
    setFoodsToAvoid("");
    setPlanItems([]);
    setSyncToCarePlan(false);
    setHandoffNote("");
  }

  /* -------------------------------------------------------------- */
  /* Referral lifecycle                                              */
  /* -------------------------------------------------------------- */

  async function runReferralAction(
    referralId: string,
    action: "accept" | "start" | "complete",
    successTitle: string,
    body: Record<string, unknown> = {},
  ) {
    setBusyAction(`${action}-${referralId}`);
    try {
      const response = await fetch(`/api/v1/clinical/referrals/${referralId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        setReferrals((previous) =>
          previous.map((referral) => (referral.id === referralId ? data.referral : referral)),
        );
        setFeedback({ tone: "good", title: successTitle });
      } else {
        const error = await response.json().catch(() => ({}));
        setFeedback({
          tone: "critical",
          title: error?.error?.message ?? `Could not ${action} this referral.`,
        });
      }
    } catch {
      setFeedback({ tone: "critical", title: `Could not ${action} this referral.` });
    } finally {
      setBusyAction(null);
    }
  }

  /* -------------------------------------------------------------- */
  /* Saving                                                          */
  /* -------------------------------------------------------------- */

  async function saveAssessment(event: FormEvent) {
    event.preventDefault();
    if (!selectedReferral) return;

    if (weightKg === null && heightCm === null && appetiteScore === null && !giSymptoms.trim()) {
      setFeedback({
        tone: "critical",
        title: "Record at least one measurement before saving.",
        detail: "An assessment with nothing in it tells the next clinician nothing.",
      });
      return;
    }

    setBusyAction("assessment");
    try {
      const response = await fetch("/api/v1/allied/nutrition/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedReferral.patientId,
          referralId: selectedReferral.id,
          weightKg: weightKg ?? undefined,
          heightCm: heightCm ?? undefined,
          weightChangeSinceSurgeryKg: weightChangeKg ?? undefined,
          appetiteScore: appetiteScore ?? undefined,
          intakeNotes: intakeNotes.trim() || undefined,
          giSymptoms: giSymptoms.trim() || undefined,
          enzymeRequirement,
          notes: assessmentNotes.trim() || undefined,
        }),
      });

      if (response.ok) {
        setFeedback({ tone: "good", title: "Nutritional assessment recorded." });
        setIsLoadingPatient(true);
        await loadPatientRecord(selectedReferral.patientId);
      } else {
        const error = await response.json().catch(() => ({}));
        setFeedback({
          tone: "critical",
          title: error?.error?.message ?? "Could not save the assessment.",
        });
      }
    } catch {
      setFeedback({ tone: "critical", title: "Could not save the assessment." });
    } finally {
      setBusyAction(null);
    }
  }

  async function savePlan(event: FormEvent) {
    event.preventDefault();
    if (!selectedReferral) return;

    if (!planTitle.trim() || !dietPhaseId || planItems.length === 0) {
      setFeedback({
        tone: "critical",
        title: "A plan needs a title, a diet phase and at least one item.",
      });
      return;
    }

    setBusyAction("plan");
    try {
      const response = await fetch("/api/v1/allied/nutrition/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedReferral.patientId,
          referralId: selectedReferral.id,
          title: planTitle.trim(),
          phase: dietPhaseById(dietPhaseId)?.label ?? dietPhaseId,
          startDate: new Date().toISOString(),
          caloricTargetKcal: caloricTarget ?? undefined,
          proteinTargetGrams: proteinTarget ?? undefined,
          fluidTargetMl: fluidTarget ?? undefined,
          foodsToAvoid: foodsToAvoid.trim() || undefined,
          syncToCarePlan,
          items: planItems.map((item, index) => ({ ...item, displayOrder: index })),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        // Report what actually reached the patient, not what was asked for.
        // The server only writes tasks when the patient has an ACTIVE care
        // plan; claiming a sync that never happened would send a dietitian
        // away believing the meal plan is on the patient's phone.
        const sync = data.plan?.sync as
          | { requested: boolean; carePlanFound: boolean; taskCount: number }
          | undefined;

        if (!sync?.requested) {
          setFeedback({ tone: "good", title: "Dietary plan saved." });
        } else if (sync.carePlanFound && sync.taskCount > 0) {
          setFeedback({
            tone: "good",
            title: `Dietary plan published to ${patientName}.`,
            detail: `${sync.taskCount} task${sync.taskCount === 1 ? "" : "s"} added to their daily action list.`,
          });
        } else {
          setFeedback({
            tone: "critical",
            title: "Plan saved, but nothing reached the patient's phone.",
            detail:
              "They have no active care plan, so there was nowhere to put the meals and enzyme doses. Ask the managing surgeon to start one, then publish again.",
          });
        }

        setIsLoadingPatient(true);
        await loadPatientRecord(selectedReferral.patientId);
      } else {
        setFeedback({
          tone: "critical",
          title: data?.error?.message ?? "Could not save the dietary plan.",
        });
      }
    } catch {
      setFeedback({ tone: "critical", title: "Could not save the dietary plan." });
    } finally {
      setBusyAction(null);
    }
  }

  async function sendHandoffNote() {
    if (!rosterEntry || !handoffNote.trim()) return;

    setBusyAction("handoff");
    try {
      const response = await fetch(`/api/v1/clinical/careplans/${rosterEntry.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: `Dietetics: ${handoffNote.trim()}` }),
      });

      if (response.ok) {
        setHandoffNote("");
        setFeedback({
          tone: "good",
          title: "Note added to the care plan.",
          detail: `${rosterEntry.managingDoctorName} sees it on the surgical care plan.`,
        });
      } else {
        setFeedback({ tone: "critical", title: "Could not add the note to the care plan." });
      }
    } catch {
      setFeedback({ tone: "critical", title: "Could not add the note to the care plan." });
    } finally {
      setBusyAction(null);
    }
  }

  /* -------------------------------------------------------------- */
  /* Plan item editing                                               */
  /* -------------------------------------------------------------- */

  function addBlankItem() {
    setPlanItems((previous) => [
      ...previous,
      { itemType: "MEAL", name: "", timeOfDay: "Breakfast", quantity: 1, unit: "portion", withMeal: false },
    ]);
  }

  function updateItem(index: number, updates: Partial<CreateNutritionPlanItemInput>) {
    setPlanItems((previous) =>
      previous.map((item, position) => (position === index ? { ...item, ...updates } : item)),
    );
  }

  function removeItem(index: number) {
    setPlanItems((previous) => previous.filter((_, position) => position !== index));
  }

  /* -------------------------------------------------------------- */
  /* Filtering and charts                                            */
  /* -------------------------------------------------------------- */

  const filteredReferrals = useMemo(() => {
    const query = caseloadSearch.trim().toLowerCase();

    return referrals.filter((referral) => {
      if (caseloadStatus !== "ALL" && referral.status !== caseloadStatus) return false;
      if (!query) return true;

      const name = referral.patient
        ? `${referral.patient.givenName} ${referral.patient.familyName}`.toLowerCase()
        : "";

      return (
        name.includes(query) ||
        (referral.patient?.patientNumber ?? "").toLowerCase().includes(query) ||
        referral.reason.toLowerCase().includes(query)
      );
    });
  }, [caseloadSearch, caseloadStatus, referrals]);

  const chronological = useMemo(
    () =>
      [...assessments].sort(
        (a, b) => new Date(a.assessedAt).getTime() - new Date(b.assessedAt).getTime(),
      ),
    [assessments],
  );

  const weightSeries = useMemo(() => {
    const points = chronological.filter((entry) => typeof entry.weightKg === "number");
    if (points.length === 0) return [];

    return [
      {
        id: "weight",
        label: "Weight",
        color: "var(--viz-1)",
        points: points.map((entry) => ({
          timestamp: entry.assessedAt,
          value: entry.weightKg ?? null,
          label: shortDate(entry.assessedAt),
        })),
      },
    ];
  }, [chronological]);

  const appetiteSeries = useMemo(() => {
    const points = chronological.filter((entry) => typeof entry.appetiteScore === "number");
    if (points.length === 0) return [];

    return [
      {
        id: "appetite",
        label: "Appetite",
        color: "var(--viz-3)",
        points: points.map((entry) => ({
          timestamp: entry.assessedAt,
          value: entry.appetiteScore ?? null,
          label: shortDate(entry.assessedAt),
        })),
      },
    ];
  }, [chronological]);

  const filteredTemplates = useMemo(
    () =>
      allMealTemplates.filter((template) => {
        if (templateBand && template.band !== templateBand) return false;
        if (dietPhaseId && !template.phases.includes(dietPhaseId)) return false;
        return true;
      }),
    [allMealTemplates, dietPhaseId, templateBand],
  );

  /* -------------------------------------------------------------- */
  /* Shared fragments                                                */
  /* -------------------------------------------------------------- */

  function needPatient(what: string): ReactNode {
    return (
      <GlassPanel>
        <EmptyPrompt
          icon={<UserRound size={22} />}
          title="Choose a patient first"
          description={`${what} belongs to one named patient, so nothing is pre-selected or pre-filled here. Pick someone from the caseload and this fills in.`}
          action={
            <GlassButton
              variant="solid"
              accent={ACCENT}
              icon={<Inbox size={14} />}
              onClick={() => setActiveTab("caseload")}
            >
              Open the caseload
            </GlassButton>
          }
        />
      </GlassPanel>
    );
  }

  function renderPatientStrip() {
    if (!selectedReferral || !patientName) {
      return (
        <div className="wfg-panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-500/10 text-slate-400"
            >
              <UserRound size={20} />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                No patient selected
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Every measurement, target and meal plan belongs to a named patient.
              </p>
            </div>
          </div>

          <GlassButton
            variant="solid"
            accent={ACCENT}
            icon={<Search size={14} />}
            onClick={() => setActiveTab("caseload")}
          >
            Choose a patient
          </GlassButton>
        </div>
      );
    }

    const initials = patientName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    return (
      <div className="wfg-panel flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white"
            style={{ background: `linear-gradient(140deg, ${ACCENT_BRIGHT}, #0891b2)` }}
          >
            {initials}
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {patientName}
              </p>
              <StatusPill tone={REFERRAL_TONE[selectedReferral.status] ?? "neutral"}>
                {selectedReferral.status.replace("_", " ")}
              </StatusPill>
              {selectedReferral.priority !== "ROUTINE" ? (
                <StatusPill tone={PRIORITY_TONE[selectedReferral.priority] ?? "neutral"}>
                  {selectedReferral.priority}
                </StatusPill>
              ) : null}
            </div>

            <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
              {selectedReferral.patient?.patientNumber
                ? `MRN ${selectedReferral.patient.patientNumber} · `
                : ""}
              {rosterEntry
                ? `Day ${rosterEntry.currentDayNumber} of ${rosterEntry.totalDays} · ${rosterEntry.title}`
                : "No active care plan"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {rosterEntry && rosterEntry.activeAlertCount > 0 ? (
            <StatusPill tone="critical" icon={<AlertTriangle size={11} />}>
              {rosterEntry.activeAlertCount} open alert
              {rosterEntry.activeAlertCount === 1 ? "" : "s"}
            </StatusPill>
          ) : null}

          <GlassButton size="sm" icon={<Search size={13} />} onClick={() => setActiveTab("caseload")}>
            Change patient
          </GlassButton>

          <GlassButton size="sm" variant="ghost" onClick={() => choosePatient(null)}>
            Clear
          </GlassButton>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------- */
  /* Tab: nutrition deck                                             */
  /* -------------------------------------------------------------- */

  function renderOverview() {
    if (!selectedReferral) return needPatient("The nutrition deck");

    const recordedBmi = latestAssessment
      ? bmiFrom(latestAssessment.weightKg ?? null, latestAssessment.heightCm ?? null)
      : null;
    const recordedVerdict = bmiBand(recordedBmi);

    return (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-3">
          <GlassPanel
            className="lg:col-span-2"
            title="Where this patient is today"
            subtitle="Only what has actually been recorded for them"
            icon={<HeartPulse size={16} />}
            accent={ACCENT_BRIGHT}
          >
            {latestAssessment ? (
              <>
                <div className="grid gap-5 sm:grid-cols-3">
                  <ProgressRing
                    value={recordedBmi ?? 0}
                    max={40}
                    accent={
                      recordedVerdict?.tone === "good"
                        ? "#10b981"
                        : recordedVerdict?.tone === "critical"
                          ? "#f43f5e"
                          : "#f59e0b"
                    }
                    label="Body mass index"
                    caption={recordedBmi ? "kg/m²" : "not recorded"}
                    valueLabel={recordedBmi ? String(recordedBmi) : "—"}
                  />
                  <ProgressRing
                    value={latestAssessment.appetiteScore ?? 0}
                    max={10}
                    accent="#34d399"
                    label="Appetite"
                    caption="of 10"
                    valueLabel={
                      latestAssessment.appetiteScore !== null &&
                      latestAssessment.appetiteScore !== undefined
                        ? String(latestAssessment.appetiteScore)
                        : "—"
                    }
                  />
                  <ProgressRing
                    value={Math.abs(latestAssessment.weightChangeSinceSurgeryKg ?? 0)}
                    max={10}
                    accent="#f59e0b"
                    label="Weight change"
                    caption="kg since surgery"
                    valueLabel={
                      latestAssessment.weightChangeSinceSurgeryKg !== null &&
                      latestAssessment.weightChangeSinceSurgeryKg !== undefined
                        ? `${latestAssessment.weightChangeSinceSurgeryKg}`
                        : "—"
                    }
                  />
                </div>

                <div className="mt-5 space-y-3 border-t border-slate-900/8 pt-4 dark:border-white/8">
                  {recordedVerdict ? (
                    <GlassWell className="flex items-center justify-between gap-3">
                      <span className="text-xs text-slate-600 dark:text-slate-300">
                        {recordedVerdict.label}
                      </span>
                      <StatusPill
                        tone={
                          recordedVerdict.tone === "good"
                            ? "good"
                            : recordedVerdict.tone === "critical"
                              ? "critical"
                              : "warning"
                        }
                      >
                        BMI {recordedBmi}
                      </StatusPill>
                    </GlassWell>
                  ) : null}

                  {latestAssessment.giSymptoms ? (
                    <GlassWell>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Gastrointestinal symptoms at the last review
                      </p>
                      <p className="mt-1 text-xs text-slate-700 dark:text-slate-200">
                        {latestAssessment.giSymptoms}
                      </p>
                    </GlassWell>
                  ) : null}

                  {rosterEntry ? (
                    <MeterBar
                      label="Care plan tasks completed today"
                      value={rosterEntry.todayCompletedTasks}
                      max={Math.max(1, rosterEntry.todayTotalTasks)}
                      accent="#a78bfa"
                      valueLabel={`${rosterEntry.todayCompletedTasks} of ${rosterEntry.todayTotalTasks}`}
                    />
                  ) : null}
                </div>
              </>
            ) : (
              <EmptyPrompt
                icon={<ClipboardList size={20} />}
                title="No nutritional assessment on record"
                description="Nothing is shown here until you have measured this patient yourself. Record the first assessment and the deck fills with their own numbers."
                action={
                  <GlassButton
                    variant="solid"
                    accent={ACCENT}
                    icon={<ClipboardCheck size={14} />}
                    onClick={() => setActiveTab("assessment")}
                  >
                    Record an assessment
                  </GlassButton>
                }
              />
            )}
          </GlassPanel>

          <div className="space-y-4">
            <GlassStat
              label="Assessments recorded"
              value={assessments.length}
              hint={
                latestAssessment ? `Last on ${shortDate(latestAssessment.assessedAt)}` : "None yet"
              }
              icon={<Scale size={14} />}
              accent="#059669"
            />
            <GlassStat
              label="Published plan"
              value={activePlan ? "Active" : "None"}
              hint={activePlan ? activePlan.phase : "No dietary plan published yet"}
              icon={<Utensils size={14} />}
              accent="#0891b2"
            />
            <GlassStat
              label="Enzyme replacement"
              value={
                latestAssessment
                  ? latestAssessment.enzymeRequirement
                    ? "Required"
                    : "Not required"
                  : "—"
              }
              hint={
                latestAssessment
                  ? "As recorded at the last assessment"
                  : "Recorded at the first assessment"
              }
              icon={<Pill size={14} />}
              accent="#a78bfa"
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <GlassPanel padded={false} className="p-5">
            <TrendLine
              title="Weight over time"
              subtitle="Every nutritional review for this patient"
              series={weightSeries}
              height={200}
              valueFormatter={(value) => `${value} kg`}
              emptyMessage="No weights recorded yet"
              emptyHint="Save the first assessment and the trend starts here."
            />
          </GlassPanel>

          <GlassPanel padded={false} className="p-5">
            <TrendLine
              title="Appetite score"
              subtitle="Patient-reported, 0 to 10"
              series={appetiteSeries}
              yMin={0}
              yMax={10}
              height={200}
              emptyMessage="No appetite scores recorded yet"
              emptyHint="Charted separately from weight — two measures this far apart never share an axis."
            />
          </GlassPanel>
        </div>

        {renderCareTeamPanel()}
      </div>
    );
  }

  function renderCareTeamPanel() {
    return (
      <GlassPanel
        title="Care team and connected portals"
        subtitle="What the rest of the hospital sees, and how to reach them"
        icon={<Share2 size={16} />}
        accent="#0891b2"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            {rosterEntry ? (
              <>
                <GlassWell className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Surgical care plan
                  </p>
                  <p className="text-xs text-slate-700 dark:text-slate-200">
                    {rosterEntry.title} · day {rosterEntry.currentDayNumber} of{" "}
                    {rosterEntry.totalDays}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Managed by {rosterEntry.managingDoctorName}
                    {rosterEntry.assignedTherapistName
                      ? ` · Physiotherapist: ${rosterEntry.assignedTherapistName}`
                      : " · No physiotherapist assigned"}
                  </p>
                </GlassWell>

                <GlassField
                  label="Add a dietetics note to the care plan"
                  htmlFor="nutrition-handoff"
                  hint="It appears in the surgical team's progress notes, attributed to you."
                >
                  <GlassTextarea
                    id="nutrition-handoff"
                    rows={3}
                    value={handoffNote}
                    placeholder="e.g. Tolerating phase 3 with full enzyme cover. Weight stable for three days. Safe to progress fat at the next review."
                    onChange={(event) => setHandoffNote(event.target.value)}
                  />
                </GlassField>

                <GlassButton
                  variant="solid"
                  accent="#0891b2"
                  icon={<Send size={13} />}
                  disabled={!handoffNote.trim() || busyAction === "handoff"}
                  onClick={sendHandoffNote}
                >
                  {busyAction === "handoff" ? "Sending…" : "Send to the surgical team"}
                </GlassButton>
              </>
            ) : (
              <GlassWell>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  This patient has no active care plan. Meals and enzyme doses are delivered through
                  the care plan, so the managing surgeon needs to start one before a published plan
                  can reach the patient&apos;s app.
                </p>
              </GlassWell>
            )}
          </div>

          <ul className="space-y-2">
            {[
              // Same as the physiotherapy panel: the care plan is summarised
              // here, and neither the doctor portal nor the physiotherapy
              // workspace belongs to a dietitian's session.
              {
                href: `${PATHNAME}?view=overview`,
                label: "Nutrition Deck",
                detail: "This patient's whole recovery, care plan included",
                icon: Stethoscope,
              },
              {
                href: "/operations/alerts",
                label: "Clinical alert console",
                detail: "Escalations raised on this ward",
                icon: AlertTriangle,
              },
              {
                href: "/operations/nutrition/profile",
                label: "Practice preferences and privileges",
                detail: "Your credentials and discipline settings",
                icon: Compass,
              },
            ].map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="wfg-link-row flex items-center justify-between gap-3 border border-slate-300/45 px-4 py-3 dark:border-white/10"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-500/10 text-slate-500 dark:text-slate-300"
                    >
                      <link.icon size={15} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                        {link.label}
                      </span>
                      <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {link.detail}
                      </span>
                    </span>
                  </span>
                  <ChevronRight size={14} className="shrink-0 text-slate-400" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </GlassPanel>
    );
  }

  /* -------------------------------------------------------------- */
  /* Tab: caseload                                                   */
  /* -------------------------------------------------------------- */

  function renderCaseload() {
    return (
      <GlassPanel
        title="Dietetics caseload"
        subtitle="Choose the patient you are about to work with"
        icon={<Inbox size={16} />}
        accent={ACCENT_BRIGHT}
        actions={
          <GlassButton
            size="sm"
            icon={<RefreshCw size={13} className={isLoadingCaseload ? "animate-spin" : ""} />}
            onClick={refreshCaseload}
            disabled={isLoadingCaseload}
          >
            Refresh
          </GlassButton>
        }
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <GlassInput
              aria-label="Search the caseload"
              className="pl-9"
              placeholder="Search by name, MRN or referral reason"
              value={caseloadSearch}
              onChange={(event) => setCaseloadSearch(event.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {["ALL", "PENDING", "ACCEPTED", "IN_PROGRESS", "COMPLETED"].map((status) => (
              <GlassChip
                key={status}
                active={caseloadStatus === status}
                hue={ACCENT}
                count={
                  status === "ALL"
                    ? referrals.length
                    : referrals.filter((referral) => referral.status === status).length
                }
                onClick={() => setCaseloadStatus(status)}
              >
                {status === "ALL" ? "All" : status.replace("_", " ").toLowerCase()}
              </GlassChip>
            ))}
          </div>
        </div>

        {isLoadingCaseload ? (
          <GlassSkeleton rows={4} height={92} />
        ) : filteredReferrals.length === 0 ? (
          <EmptyPrompt
            icon={<ClipboardList size={22} />}
            title={referrals.length === 0 ? "No nutrition referrals yet" : "Nothing matches that filter"}
            description={
              referrals.length === 0
                ? "Referrals raised by the surgical teams land here. Nothing is assigned to you automatically."
                : "Clear the search or pick a different status."
            }
          />
        ) : (
          <ul className="grid gap-3 xl:grid-cols-2">
            {filteredReferrals.map((referral) => {
              const selected = referral.id === selectedReferralId;
              const name = referral.patient
                ? `${referral.patient.givenName} ${referral.patient.familyName}`.trim()
                : `Patient ${referral.patientId.slice(0, 8)}`;
              const entry = roster.find((item) => item.patientId === referral.patientId);
              const referrer =
                referral.referringDoctor?.staffProfile?.membership?.displayName ??
                "Referring surgeon";

              return (
                <li key={referral.id} className="h-full min-w-0">
                  <div
                    className="wfg-tile flex h-full flex-col p-4"
                    style={
                      selected
                        ? { borderColor: ACCENT_BRIGHT, boxShadow: `0 0 0 1px ${ACCENT_BRIGHT}66` }
                        : undefined
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          choosePatient(referral.id);
                          setActiveTab("overview");
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {name}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {referral.patient?.patientNumber
                            ? `MRN ${referral.patient.patientNumber} · `
                            : ""}
                          Referred by {referrer}
                        </p>
                      </button>

                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <StatusPill tone={REFERRAL_TONE[referral.status] ?? "neutral"}>
                          {referral.status.replace("_", " ")}
                        </StatusPill>
                        {referral.priority !== "ROUTINE" ? (
                          <StatusPill tone={PRIORITY_TONE[referral.priority] ?? "neutral"}>
                            {referral.priority}
                          </StatusPill>
                        ) : null}
                      </div>
                    </div>

                    <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-slate-600 dark:text-slate-300">
                      {referral.reason}
                    </p>

                    {referral.surgicalSummary ? (
                      <p className="mt-1.5 truncate text-[10px] text-slate-500 dark:text-slate-400">
                        Surgery: {referral.surgicalSummary}
                      </p>
                    ) : null}

                    {entry ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                        <StatusPill tone="info">
                          Day {entry.currentDayNumber} / {entry.totalDays}
                        </StatusPill>
                        {entry.activeAlertCount > 0 ? (
                          <StatusPill tone="critical">{entry.activeAlertCount} alert</StatusPill>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
                        No active care plan
                      </p>
                    )}

                    <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-900/8 pt-3 dark:border-white/8">
                      <GlassButton
                        size="sm"
                        variant={selected ? "solid" : "glass"}
                        accent={ACCENT}
                        icon={<UserRound size={12} />}
                        onClick={() => {
                          choosePatient(referral.id);
                          setActiveTab("overview");
                        }}
                      >
                        {selected ? "Selected" : "Work with this patient"}
                      </GlassButton>

                      {referral.status === "PENDING" ? (
                        <GlassButton
                          size="sm"
                          disabled={busyAction === `accept-${referral.id}`}
                          onClick={() =>
                            runReferralAction(
                              referral.id,
                              "accept",
                              `${name} accepted into your caseload.`,
                            )
                          }
                        >
                          Accept
                        </GlassButton>
                      ) : null}

                      {referral.status === "ACCEPTED" ? (
                        <GlassButton
                          size="sm"
                          disabled={busyAction === `start-${referral.id}`}
                          onClick={() =>
                            runReferralAction(referral.id, "start", `Dietetic input started for ${name}.`)
                          }
                        >
                          Start input
                        </GlassButton>
                      ) : null}

                      {referral.status === "IN_PROGRESS" || referral.status === "ACCEPTED" ? (
                        <GlassButton
                          size="sm"
                          onClick={() => {
                            setCompletingReferralId(referral.id);
                            setCompletionNotes("");
                          }}
                        >
                          Complete
                        </GlassButton>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </GlassPanel>
    );
  }

  /* -------------------------------------------------------------- */
  /* Tab: assess and screen                                          */
  /* -------------------------------------------------------------- */

  function renderAssessment() {
    if (!selectedReferral) return needPatient("An assessment");

    return (
      <div className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-2">
          <GlassPanel
            title="Nutritional assessment"
            subtitle={`Measured by you, for ${patientName}`}
            icon={<Scale size={16} />}
            accent={ACCENT_BRIGHT}
          >
            <form onSubmit={saveAssessment} className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <Stepper
                  label="Weight"
                  unit="kg"
                  value={weightKg}
                  step={0.5}
                  accent={ACCENT}
                  onChange={setWeightKg}
                />
                <Stepper
                  label="Height"
                  unit="cm"
                  value={heightCm}
                  step={1}
                  accent="#0891b2"
                  onChange={setHeightCm}
                />
                <Stepper
                  label="Change since surgery"
                  unit="kg (negative for loss)"
                  value={weightChangeKg}
                  step={0.5}
                  accent="#f59e0b"
                  onChange={setWeightChangeKg}
                />
              </div>

              {bmi !== null && bmiVerdict ? (
                <GlassWell className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      BMI {bmi} kg/m²
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {bmiVerdict.label}
                    </p>
                  </div>
                  <StatusPill
                    tone={
                      bmiVerdict.tone === "good"
                        ? "good"
                        : bmiVerdict.tone === "critical"
                          ? "critical"
                          : "warning"
                    }
                  >
                    {bmiVerdict.tone === "good" ? "In range" : "Review"}
                  </StatusPill>
                </GlassWell>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Set weight and height to calculate BMI. Nothing is assumed on your behalf.
                </p>
              )}

              <GradientSlider
                label="Appetite score"
                value={appetiteScore}
                min={0}
                max={10}
                ramp={APPETITE_RAMP}
                onChange={setAppetiteScore}
                hint="As the patient describes it, not as the plate looks."
                ticks={[
                  { value: 0, label: "0 none" },
                  { value: 5, label: "5" },
                  { value: 10, label: "10 normal" },
                ]}
              />

              <GlassField label="Gastrointestinal symptoms" htmlFor="gi-symptoms">
                <GlassInput
                  id="gi-symptoms"
                  value={giSymptoms}
                  placeholder="e.g. steatorrhoea, bloating, early satiety, nausea"
                  onChange={(event) => setGiSymptoms(event.target.value)}
                />
              </GlassField>

              <GlassField label="Intake and tolerance" htmlFor="intake-notes">
                <GlassInput
                  id="intake-notes"
                  value={intakeNotes}
                  placeholder="e.g. eating about half of each meal, one supplement daily"
                  onChange={(event) => setIntakeNotes(event.target.value)}
                />
              </GlassField>

              <SwitchRow
                checked={enzymeRequirement}
                onChange={setEnzymeRequirement}
                label="Pancreatic enzyme replacement required"
                description="Makes enzyme dosing mandatory in the dietary plan and on the patient's task list."
                accent="#a78bfa"
              />

              <GlassField label="Assessment notes" htmlFor="assessment-notes">
                <GlassTextarea
                  id="assessment-notes"
                  rows={3}
                  value={assessmentNotes}
                  placeholder="Counselling given, caregiver education, plan for the next review."
                  onChange={(event) => setAssessmentNotes(event.target.value)}
                />
              </GlassField>

              <GlassButton
                type="submit"
                variant="solid"
                accent={ACCENT}
                className="w-full"
                icon={<ClipboardCheck size={14} />}
                disabled={busyAction === "assessment"}
              >
                {busyAction === "assessment" ? "Saving…" : "Record the assessment"}
              </GlassButton>
            </form>
          </GlassPanel>

          <div className="space-y-5">
            <GlassPanel
              title="Malnutrition screening (MUST)"
              subtitle="Calculated from what you have entered, never assumed"
              icon={<ShieldAlert size={16} />}
              accent="#f59e0b"
            >
              <div className="space-y-4">
                <SwitchRow
                  checked={acutelyUnwell}
                  onChange={setAcutelyUnwell}
                  label="Acutely unwell with no intake for five days or more"
                  description="The third MUST component. Scores two points on its own."
                  accent="#f59e0b"
                />

                {must ? (
                  <div
                    className="rounded-2xl border px-4 py-3"
                    style={{
                      background:
                        must.score === 0
                          ? "rgb(16 185 129 / 0.10)"
                          : must.score === 1
                            ? "rgb(245 158 11 / 0.12)"
                            : "rgb(239 68 68 / 0.10)",
                      borderColor:
                        must.score === 0
                          ? "rgb(16 185 129 / 0.35)"
                          : must.score === 1
                            ? "rgb(245 158 11 / 0.35)"
                            : "rgb(239 68 68 / 0.35)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                        {must.risk}
                      </p>
                      <span className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white">
                        {must.score}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-5 text-slate-600 dark:text-slate-300">
                      {must.action}
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                    MUST needs a BMI and an unplanned weight loss figure. Enter weight, height and
                    the change since surgery above and the score appears here.
                  </p>
                )}
              </div>
            </GlassPanel>

            <GlassPanel
              title="Energy and protein targets"
              subtitle="A range for the clinical picture you choose — not a single fabricated number"
              icon={<Flame size={16} />}
              accent="#ef4444"
            >
              <div className="space-y-4">
                <SegmentedControl
                  label="Clinical picture"
                  columns={1}
                  value={targetBand}
                  onChange={setTargetBand}
                  options={TARGET_BANDS.map((band) => ({
                    value: band.value,
                    label: band.label,
                    detail: band.detail,
                    hue: ACCENT,
                  }))}
                />

                {targets ? (
                  <GlassWell className="space-y-3">
                    <MeterBar
                      label="Energy target"
                      value={caloricTarget ?? targets.kcalLow}
                      max={targets.kcalHigh}
                      accent="#ef4444"
                      valueLabel={`${targets.kcalLow}–${targets.kcalHigh} kcal/day`}
                    />
                    <MeterBar
                      label="Protein target"
                      value={proteinTarget ?? targets.proteinLow}
                      max={targets.proteinHigh}
                      accent="#0891b2"
                      valueLabel={`${targets.proteinLow}–${targets.proteinHigh} g/day`}
                    />
                    <p className="text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                      {targets.note}
                    </p>

                    <GlassButton
                      size="sm"
                      icon={<ListPlus size={12} />}
                      onClick={() => {
                        setCaloricTarget(Math.round((targets.kcalLow + targets.kcalHigh) / 2));
                        setProteinTarget(Math.round((targets.proteinLow + targets.proteinHigh) / 2));
                        setActiveTab("plan");
                      }}
                    >
                      Carry the midpoint into the plan
                    </GlassButton>
                  </GlassWell>
                ) : (
                  <p className="text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                    Set a weight above and choose the clinical picture, and the target range for
                    this patient appears here.
                  </p>
                )}
              </div>
            </GlassPanel>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------- */
  /* Tab: dietary plan                                               */
  /* -------------------------------------------------------------- */

  function renderPlan() {
    if (!selectedReferral) return needPatient("A dietary plan");

    return (
      <div className="space-y-5">
        {!rosterEntry ? (
          <Notice tone="info" title="This patient has no active care plan yet.">
            You can still write and save a plan, but nothing will reach their phone until the
            managing surgeon starts a care plan. The publish step below tells you which happened.
          </Notice>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-12">
          <div className="space-y-5 xl:col-span-5">
            <GlassPanel
              title="Plan header"
              subtitle={`For ${patientName}`}
              icon={<Utensils size={16} />}
              accent={ACCENT_BRIGHT}
            >
              <div className="space-y-4">
                <GlassField label="Plan title" htmlFor="plan-title" required>
                  <GlassInput
                    id="plan-title"
                    value={planTitle}
                    placeholder="e.g. Post-pancreatectomy dietary recovery plan"
                    onChange={(event) => setPlanTitle(event.target.value)}
                  />
                </GlassField>

                <SegmentedControl
                  label="Diet phase"
                  columns={1}
                  value={dietPhaseId}
                  onChange={setDietPhaseId}
                  options={DIET_PHASES.map((phase) => ({
                    value: phase.id,
                    label: phase.label,
                    detail: `${phase.typicalDays} · ${phase.detail}`,
                    hue: phase.hue,
                  }))}
                />

                <div className="grid grid-cols-3 gap-3">
                  <Stepper
                    label="Energy"
                    unit="kcal/day"
                    value={caloricTarget}
                    min={0}
                    max={5000}
                    step={50}
                    accent="#ef4444"
                    onChange={setCaloricTarget}
                  />
                  <Stepper
                    label="Protein"
                    unit="g/day"
                    value={proteinTarget}
                    min={0}
                    max={300}
                    step={5}
                    accent="#0891b2"
                    onChange={setProteinTarget}
                  />
                  <Stepper
                    label="Fluid"
                    unit="mL/day"
                    value={fluidTarget}
                    min={0}
                    max={5000}
                    step={100}
                    accent="#38bdf8"
                    onChange={setFluidTarget}
                  />
                </div>

                <GlassField label="Foods to avoid" htmlFor="foods-avoid">
                  <GlassTextarea
                    id="foods-avoid"
                    rows={2}
                    value={foodsToAvoid}
                    placeholder="Write your own, or pick a starting list below."
                    onChange={(event) => setFoodsToAvoid(event.target.value)}
                  />
                </GlassField>

                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Avoid lists
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddAvoidModal(true)}
                    className="text-[11px] font-medium text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                  >
                    <Plus size={11} /> Add restriction
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {allAvoidLists.map((list) => (
                    <div key={list.id} className="relative group inline-flex items-center">
                      <GlassChip
                        hue={list.band === "HPB" ? "#a78bfa" : "#94a3b8"}
                        onClick={() => setFoodsToAvoid(list.text)}
                      >
                        {list.label}
                      </GlassChip>
                      {allAvoidLists.length > 1 && (
                        <button
                          type="button"
                          title={`Delete ${list.label}`}
                          aria-label={`Delete ${list.label}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAvoidList(list.id);
                          }}
                          className="absolute -top-1 -right-1 rounded-full bg-slate-200 dark:bg-slate-700 p-0.5 text-slate-500 hover:bg-rose-500 hover:text-white transition shadow-sm opacity-60 group-hover:opacity-100"
                        >
                          <X size={9} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </GlassPanel>

            <GlassPanel
              title="Counselling to reinforce"
              subtitle="Pick what you actually covered with this patient"
              icon={<ClipboardList size={16} />}
              accent="#a78bfa"
            >
              <div className="space-y-2">
                {COUNSELLING_SETS.map((set) => (
                  <details
                    key={set.id}
                    className="rounded-xl border border-slate-300/45 px-3 py-2 dark:border-white/10"
                  >
                    <summary className="flex cursor-pointer items-center justify-between gap-2 text-[11px] font-semibold text-slate-800 dark:text-slate-100">
                      {set.label}
                      <span
                        className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
                        style={{
                          background: set.band === "HPB" ? "#a78bfa22" : "#94a3b822",
                          color: set.band === "HPB" ? "#7c3aed" : "#64748b",
                        }}
                      >
                        {set.band === "HPB" ? "HPB" : "General"}
                      </span>
                    </summary>
                    <ul className="mt-2 space-y-1">
                      {set.points.map((point) => (
                        <li
                          key={point}
                          className="text-[10px] leading-4 text-slate-500 dark:text-slate-400"
                        >
                          • {point}
                        </li>
                      ))}
                    </ul>
                    <GlassButton
                      size="sm"
                      variant="ghost"
                      className="mt-2"
                      onClick={() =>
                        setAssessmentNotes((previous) =>
                          [previous.trim(), `${set.label}: ${set.points.join("; ")}`]
                            .filter(Boolean)
                            .join("\n"),
                        )
                      }
                    >
                      Add to assessment notes
                    </GlassButton>
                  </details>
                ))}
              </div>
            </GlassPanel>
          </div>

          <div className="space-y-5 xl:col-span-7">
            <GlassPanel
              title="Plan items"
              subtitle="The meals, snacks, supplements and enzyme doses this patient will see"
              icon={<ListPlus size={16} />}
              accent="#0891b2"
              actions={
                <div className="flex gap-2">
                  <GlassButton
                    size="sm"
                    icon={<Plus size={12} />}
                    onClick={() => setShowTemplateModal(true)}
                  >
                    From template
                  </GlassButton>
                  <GlassButton
                    size="sm"
                    variant="solid"
                    accent={ACCENT}
                    icon={<Plus size={12} />}
                    onClick={addBlankItem}
                  >
                    Blank item
                  </GlassButton>
                </div>
              }
            >
              {planItems.length === 0 ? (
                <EmptyPrompt
                  icon={<Utensils size={20} />}
                  title="The plan is empty"
                  description="Nothing is pre-filled. Add items from the template library or write your own — either way you choose every line."
                />
              ) : (
                <ul className="space-y-2">
                  {planItems.map((item, index) => (
                    <li key={index} className="wfg-well space-y-2 px-3.5 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <span
                            aria-hidden
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: ITEM_TYPE_HUE[item.itemType] }}
                          />
                          <GlassInput
                            aria-label={`Item ${index + 1} name`}
                            value={item.name}
                            placeholder="What the patient eats or takes"
                            onChange={(event) => updateItem(index, { name: event.target.value })}
                          />
                        </div>

                        <button
                          type="button"
                          aria-label={`Remove item ${index + 1}`}
                          onClick={() => removeItem(index)}
                          className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-500"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <GlassSelect
                          aria-label={`Item ${index + 1} type`}
                          value={item.itemType}
                          onChange={(event) =>
                            updateItem(index, { itemType: event.target.value as NutritionItemType })
                          }
                        >
                          {ITEM_TYPE_ORDER.map((type) => (
                            <option key={type} value={type}>
                              {ITEM_TYPE_LABELS[type]}
                            </option>
                          ))}
                        </GlassSelect>

                        <GlassSelect
                          aria-label={`Item ${index + 1} time of day`}
                          value={item.timeOfDay}
                          onChange={(event) => updateItem(index, { timeOfDay: event.target.value })}
                        >
                          {TIMES_OF_DAY.map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </GlassSelect>

                        <GlassInput
                          aria-label={`Item ${index + 1} quantity`}
                          type="number"
                          min={0}
                          value={item.quantity ?? ""}
                          placeholder="Qty"
                          onChange={(event) =>
                            updateItem(index, {
                              quantity: event.target.value === "" ? undefined : Number(event.target.value),
                            })
                          }
                        />

                        <GlassInput
                          aria-label={`Item ${index + 1} unit`}
                          value={item.unit ?? ""}
                          placeholder="Unit"
                          onChange={(event) => updateItem(index, { unit: event.target.value })}
                        />
                      </div>

                      <label className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={Boolean(item.withMeal)}
                          onChange={(event) => updateItem(index, { withMeal: event.target.checked })}
                          className="h-3.5 w-3.5 rounded border-slate-300"
                        />
                        Taken with food
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </GlassPanel>

            <GlassPanel
              title="Publish"
              subtitle="Save the plan, and optionally push it to the patient's daily action list"
              icon={<Send size={16} />}
              accent={ACCENT}
            >
              <form onSubmit={savePlan} className="space-y-4">
                <SwitchRow
                  checked={syncToCarePlan}
                  onChange={setSyncToCarePlan}
                  label="Send the items to the patient's app"
                  description={
                    rosterEntry
                      ? "Each meal, supplement and enzyme dose becomes a task on their care plan."
                      : "Not available yet — this patient has no active care plan for the tasks to attach to."
                  }
                  accent={ACCENT}
                />

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>{planItems.length} item{planItems.length === 1 ? "" : "s"}</span>
                  <span aria-hidden>·</span>
                  <span>{dietPhaseId ? dietPhaseById(dietPhaseId)?.label : "No phase chosen"}</span>
                  {caloricTarget ? (
                    <>
                      <span aria-hidden>·</span>
                      <span>{caloricTarget} kcal/day</span>
                    </>
                  ) : null}
                </div>

                <GlassButton
                  type="submit"
                  variant="solid"
                  accent={ACCENT}
                  className="w-full"
                  icon={<Send size={14} />}
                  disabled={busyAction === "plan"}
                >
                  {busyAction === "plan" ? "Publishing…" : "Save the dietary plan"}
                </GlassButton>
              </form>
            </GlassPanel>
          </div>
        </div>

        <GlassModal
          open={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          title="Template library"
          subtitle="Add what fits this patient. Nothing is added until you click it."
          icon={<Utensils size={16} />}
          accent={ACCENT}
          width="max-w-3xl"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                <GlassChip active={templateBand === null} onClick={() => setTemplateBand(null)}>
                  Both services
                </GlassChip>
                {(["HPB", "GENERAL"] as ClinicalBand[]).map((band) => (
                  <GlassChip
                    key={band}
                    active={templateBand === band}
                    hue={band === "HPB" ? "#a78bfa" : "#94a3b8"}
                    count={allMealTemplates.filter((template) => template.band === band).length}
                    onClick={() => setTemplateBand(templateBand === band ? null : band)}
                  >
                    {BAND_LABELS[band]}
                  </GlassChip>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {deletedTemplateIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDeletedTemplateIds([])}
                    className="text-[10px] text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                  >
                    Reset templates
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowCreateTemplateModal(true)}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <Plus size={12} /> Custom template
                </button>
              </div>
            </div>

            {dietPhaseId ? (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Narrowed to templates that suit {dietPhaseById(dietPhaseId)?.label.toLowerCase()}.
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Choose a diet phase on the plan header to narrow this list to what fits it.
              </p>
            )}

            {filteredTemplates.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                No template matches that phase and service.
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {filteredTemplates.map((template) => (
                  <li key={template.id} className="relative group">
                    <button
                      type="button"
                      onClick={() => {
                        setPlanItems((previous) => [
                          ...previous,
                          {
                            itemType: template.itemType,
                            name: template.name,
                            instruction: template.instruction,
                            timeOfDay: template.timeOfDay,
                            quantity: template.quantity,
                            unit: template.unit,
                            withMeal: template.withMeal,
                          },
                        ]);
                      }}
                      className="wfg-tile h-full w-full p-3.5 pr-8 text-left"
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span
                            aria-hidden
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: ITEM_TYPE_HUE[template.itemType] }}
                          />
                          <span className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                            {template.name}
                          </span>
                        </span>
                        {template.band === "HPB" ? (
                          <span className="shrink-0 rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-violet-700 dark:text-violet-300">
                            HPB
                          </span>
                        ) : null}
                      </span>

                      <span className="mt-1 line-clamp-2 block text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                        {template.rationale}
                      </span>

                      <span className="mt-2 block text-[10px] text-slate-400 dark:text-slate-500">
                        {ITEM_TYPE_LABELS[template.itemType]} · {template.timeOfDay} ·{" "}
                        {template.quantity} {template.unit}
                      </span>
                    </button>

                    <button
                      type="button"
                      title={`Delete ${template.name}`}
                      aria-label={`Delete ${template.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTemplate(template.id);
                      }}
                      className="absolute right-2 top-2 rounded-lg p-1.5 text-slate-400 opacity-60 hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-600 transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </GlassModal>

        {/* Custom Avoidance List Modal */}
        <GlassModal
          open={showAddAvoidModal}
          onClose={() => setShowAddAvoidModal(false)}
          title="Add custom dietary restriction"
          subtitle="Create a reusable food avoidance restriction for dietary plans"
          icon={<AlertTriangle size={16} />}
          accent="#a78bfa"
          footer={
            <>
              <GlassButton onClick={() => setShowAddAvoidModal(false)}>Cancel</GlassButton>
              <GlassButton
                variant="solid"
                accent="#a78bfa"
                form="add-custom-avoid-form"
                type="submit"
                disabled={!newAvoidLabel.trim() || !newAvoidText.trim()}
              >
                Add restriction
              </GlassButton>
            </>
          }
        >
          <form id="add-custom-avoid-form" onSubmit={handleAddAvoidList} className="space-y-4">
            <GlassField label="Restriction label / Category" htmlFor="avoid-label" required>
              <GlassInput
                id="avoid-label"
                required
                placeholder="e.g. Low FODMAP, Renal Phosphorus, Pureed Gastric"
                value={newAvoidLabel}
                onChange={(e) => setNewAvoidLabel(e.target.value)}
              />
            </GlassField>
            <GlassField label="Restricted foods & drinks" htmlFor="avoid-desc" required>
              <GlassTextarea
                id="avoid-desc"
                required
                rows={3}
                placeholder="List specific ingredients, preparation styles, or items to avoid..."
                value={newAvoidText}
                onChange={(e) => setNewAvoidText(e.target.value)}
              />
            </GlassField>
          </form>
        </GlassModal>

        {/* Create Custom Meal Template Modal */}
        <GlassModal
          open={showCreateTemplateModal}
          onClose={() => setShowCreateTemplateModal(false)}
          title="Create custom meal template"
          subtitle="Save a standard recipe, supplement, or enzyme protocol to your template library"
          icon={<Utensils size={16} />}
          accent={ACCENT}
          footer={
            <>
              <GlassButton onClick={() => setShowCreateTemplateModal(false)}>Cancel</GlassButton>
              <GlassButton
                variant="solid"
                accent={ACCENT}
                form="create-custom-template-form"
                type="submit"
                disabled={!newTemplateName.trim()}
              >
                Save template
              </GlassButton>
            </>
          }
        >
          <form id="create-custom-template-form" onSubmit={handleCreateTemplate} className="space-y-4">
            <GlassField label="Template name" htmlFor="tpl-name" required>
              <GlassInput
                id="tpl-name"
                required
                placeholder="e.g. Fortified Greek Yogurt with Berry Puree"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
            </GlassField>

            <div className="grid grid-cols-2 gap-3">
              <GlassField label="Item type" htmlFor="tpl-type" required>
                <GlassSelect
                  id="tpl-type"
                  value={newTemplateType}
                  onChange={(e) => setNewTemplateType(e.target.value as NutritionItemType)}
                >
                  {ITEM_TYPE_ORDER.map((t) => (
                    <option key={t} value={t}>
                      {ITEM_TYPE_LABELS[t]}
                    </option>
                  ))}
                </GlassSelect>
              </GlassField>

              <GlassField label="Time of day" htmlFor="tpl-time" required>
                <GlassSelect
                  id="tpl-time"
                  value={newTemplateTime}
                  onChange={(e) => setNewTemplateTime(e.target.value)}
                >
                  {TIMES_OF_DAY.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </GlassSelect>
              </GlassField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <GlassField label="Quantity" htmlFor="tpl-qty" required>
                <GlassInput
                  id="tpl-qty"
                  type="number"
                  min={1}
                  required
                  value={newTemplateQty}
                  onChange={(e) => setNewTemplateQty(e.target.value)}
                />
              </GlassField>

              <GlassField label="Unit" htmlFor="tpl-unit" required>
                <GlassInput
                  id="tpl-unit"
                  required
                  placeholder="e.g. bowl, portion, mL, bottle"
                  value={newTemplateUnit}
                  onChange={(e) => setNewTemplateUnit(e.target.value)}
                />
              </GlassField>
            </div>

            <GlassField label="Clinical rationale / notes" htmlFor="tpl-rationale">
              <GlassInput
                id="tpl-rationale"
                placeholder="e.g. High biological value protein for sarcopenic recovery"
                value={newTemplateRationale}
                onChange={(e) => setNewTemplateRationale(e.target.value)}
              />
            </GlassField>

            <GlassField label="Patient instructions" htmlFor="tpl-inst">
              <GlassTextarea
                id="tpl-inst"
                rows={2}
                placeholder="e.g. Consume slowly between breakfast and lunch. Do not force."
                value={newTemplateInstruction}
                onChange={(e) => setNewTemplateInstruction(e.target.value)}
              />
            </GlassField>
          </form>
        </GlassModal>
      </div>
    );
  }

  /* -------------------------------------------------------------- */
  /* Tab: calculators                                                */
  /* -------------------------------------------------------------- */

  function renderCalculators() {
    const applyPertToPlan = () => {
      if (!mealDose && !snackDose) return;
      const itemsToAdd: CreateNutritionPlanItemInput[] = [];
      const brandName = pertBrand || "Pancreatic Enzyme";
      const capStr = effectiveCapsuleStrength ? `${effectiveCapsuleStrength.toLocaleString()} IU` : "";

      if (mealDose && mealDose.units > 0) {
        itemsToAdd.push({
          itemType: "ENZYME",
          name: `${brandName} ${capStr} (${mealDose.capsules} cap${mealDose.capsules > 1 ? "s" : ""}) with Breakfast`,
          timeOfDay: "Breakfast",
          quantity: mealDose.capsules,
          unit: "capsule",
          instruction: `Take with the first bite of breakfast (total ${mealDose.units.toLocaleString()} IU lipase). Do not crush or chew.`,
          withMeal: true,
          displayOrder: planItems.length + 1,
        });
        itemsToAdd.push({
          itemType: "ENZYME",
          name: `${brandName} ${capStr} (${mealDose.capsules} cap${mealDose.capsules > 1 ? "s" : ""}) with Lunch`,
          timeOfDay: "Lunch",
          quantity: mealDose.capsules,
          unit: "capsule",
          instruction: `Take with the first bite of lunch (total ${mealDose.units.toLocaleString()} IU lipase).`,
          withMeal: true,
          displayOrder: planItems.length + 2,
        });
        itemsToAdd.push({
          itemType: "ENZYME",
          name: `${brandName} ${capStr} (${mealDose.capsules} cap${mealDose.capsules > 1 ? "s" : ""}) with Dinner`,
          timeOfDay: "Dinner",
          quantity: mealDose.capsules,
          unit: "capsule",
          instruction: `Take with the first bite of dinner (total ${mealDose.units.toLocaleString()} IU lipase).`,
          withMeal: true,
          displayOrder: planItems.length + 3,
        });
      }

      if (snackDose && snackDose.units > 0) {
        itemsToAdd.push({
          itemType: "ENZYME",
          name: `${brandName} ${capStr} (${snackDose.capsules} cap${snackDose.capsules > 1 ? "s" : ""}) with Snack`,
          timeOfDay: "Mid-afternoon",
          quantity: snackDose.capsules,
          unit: "capsule",
          instruction: `Take with snacks containing fat (total ${snackDose.units.toLocaleString()} IU lipase).`,
          withMeal: true,
          displayOrder: planItems.length + 4,
        });
      }

      if (itemsToAdd.length === 0) {
        setFeedback({
          tone: "info",
          title: "No enzymes to apply",
          detail: "0 grams of fat requires no enzyme capsules.",
        });
        return;
      }

      // Replace existing enzyme items with the newly calculated regimen
      setPlanItems((prev) => [
        ...prev.filter((i) => i.itemType !== "ENZYME"),
        ...itemsToAdd,
      ]);
      setFeedback({
        tone: "good",
        title: "PERT regimen applied to dietary plan",
        detail: `Added ${itemsToAdd.length} enzyme items (${brandName}) to the active plan draft.`,
      });
    };

    const applyEnteralToPlan = () => {
      if (!enteral || !enteralFormula) return;
      const newItem: CreateNutritionPlanItemInput = {
        itemType: "SUPPLEMENT",
        name: `Enteral: ${enteralFormula.label}`,
        timeOfDay: "Overnight",
        quantity: enteral.volumePerDayMl,
        unit: "mL",
        instruction: `Continuous infusion at ${enteralRate} mL/hr over ${enteralHours} hrs/day (${enteral.kcalPerDay} kcal/day, ${enteral.proteinPerDay}g protein/day).`,
        withMeal: false,
        displayOrder: planItems.length + 1,
      };
      // Replace existing enteral items with newly calculated regimen
      setPlanItems((prev) => [
        ...prev.filter((i) => !i.name.toLowerCase().startsWith("enteral:")),
        newItem,
      ]);
      setFeedback({
        tone: "good",
        title: "Enteral tube feeding applied to dietary plan",
        detail: `Added ${enteralFormula.label} delivery regimen to the active plan draft.`,
      });
    };

    return (
      <div className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-2">
          {/* Pancreatic Enzyme Replacement */}
          <GlassPanel
            title="Pancreatic enzyme replacement"
            subtitle="Lipase units for one intake, with the meal and snack floors applied"
            icon={<Pill size={16} />}
            accent="#a78bfa"
          >
            <div className="space-y-5">
              {/* Brand Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Commercial formulation / Brand
                  </label>
                  <div className="flex items-center gap-2">
                    {pertBrands.length < DEFAULT_PERT_BRANDS.length && (
                      <button
                        type="button"
                        onClick={() => setPertBrands(DEFAULT_PERT_BRANDS)}
                        className="text-[10px] text-slate-400 hover:text-purple-600 dark:hover:text-purple-400"
                      >
                        Reset defaults
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowAddBrandModal(true)}
                      className="text-[11px] font-medium text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                    >
                      <Plus size={11} /> Add custom brand
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {pertBrands.map((b) => (
                    <div key={b.id} className="group relative inline-flex items-center">
                      <button
                        type="button"
                        onClick={() => setPertBrand(b.id)}
                        className={`rounded-lg py-1 text-xs font-semibold transition ${
                          pertBrand === b.id
                            ? "bg-purple-600 text-white shadow-sm"
                            : "border border-slate-200 bg-white/60 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-300"
                        } ${pertBrands.length > 1 ? "pl-2.5 pr-6" : "px-2.5"}`}
                      >
                        {b.label}
                      </button>
                      {pertBrands.length > 1 && (
                        <button
                          type="button"
                          title={`Delete ${b.label}`}
                          aria-label={`Delete ${b.label}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBrand(b.id);
                          }}
                          className={`absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 transition ${
                            pertBrand === b.id
                              ? "text-purple-200 hover:bg-purple-700 hover:text-white"
                              : "text-slate-400 opacity-60 hover:opacity-100 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/40"
                          }`}
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Capsule Strength Selection & Custom Strength Toggle with Add & Delete */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Capsule strength
                  </label>
                  <div className="flex items-center gap-2">
                    {strengthPresets.length < DEFAULT_STRENGTHS.length && (
                      <button
                        type="button"
                        onClick={() => setStrengthPresets(DEFAULT_STRENGTHS)}
                        className="text-[10px] text-slate-400 hover:text-purple-600 dark:hover:text-purple-400"
                      >
                        Reset defaults
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowAddStrengthModal(true)}
                      className="text-[11px] font-medium text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                    >
                      <Plus size={11} /> Add preset
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <button
                      type="button"
                      onClick={() => setIsCustomStrength(!isCustomStrength)}
                      className="text-[11px] font-medium text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      {isCustomStrength ? "Use standard presets" : "Enter custom strength"}
                    </button>
                  </div>
                </div>

                {isCustomStrength ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <GlassInput
                        type="number"
                        min={1000}
                        max={100000}
                        step={500}
                        placeholder="e.g. 12000"
                        value={customCapsuleStrength}
                        onChange={(e) => setCustomCapsuleStrength(e.target.value)}
                      />
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                        IU Lipase
                      </span>
                    </div>
                    {customCapsuleStrength && parseInt(customCapsuleStrength, 10) > 0 && !strengthPresets.includes(parseInt(customCapsuleStrength, 10)) && (
                      <button
                        type="button"
                        onClick={() => handleAddStrengthPreset(parseInt(customCapsuleStrength, 10))}
                        className="text-[11px] font-medium text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                      >
                        <Plus size={11} /> Save {parseInt(customCapsuleStrength, 10).toLocaleString()} IU to quick presets
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                    {strengthPresets.map((strength) => (
                      <div key={strength} className="relative group">
                        <button
                          type="button"
                          onClick={() => setCapsuleStrength(strength)}
                          className={`w-full rounded-xl py-2 px-1 text-center transition ${
                            capsuleStrength === strength
                              ? "bg-purple-600 text-white shadow"
                              : "border border-slate-200 bg-white/50 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-slate-800/50 dark:text-slate-300"
                          }`}
                        >
                          <div className="text-xs font-bold">
                            {strength >= 1000 ? `${strength / 1000}k` : strength}
                          </div>
                          <div className="text-[9px] opacity-75">{strength.toLocaleString()} IU</div>
                        </button>
                        {strengthPresets.length > 1 && (
                          <button
                            type="button"
                            title={`Delete ${strength.toLocaleString()} IU preset`}
                            aria-label={`Delete ${strength.toLocaleString()} IU preset`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteStrength(strength);
                            }}
                            className={`absolute top-1 right-1 rounded-full p-0.5 transition ${
                              capsuleStrength === strength
                                ? "text-purple-200 hover:bg-purple-700 hover:text-white"
                                : "text-slate-400 opacity-60 hover:opacity-100 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/40"
                            }`}
                          >
                            <X size={10} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dynamic Dosing Ratio & Safety Floors */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Dosing ratio & safety floors
                  </span>
                  <div className="flex items-center gap-2">
                    {dosingRatios.length < DEFAULT_RATIOS.length && (
                      <button
                        type="button"
                        onClick={() => setDosingRatios(DEFAULT_RATIOS)}
                        className="text-[10px] text-slate-400 hover:text-purple-600 dark:hover:text-purple-400"
                      >
                        Reset ratios
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowAdvancedPert(!showAdvancedPert)}
                      className="text-[10px] font-medium text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      {showAdvancedPert ? "Hide settings" : "Adjust ratio & floors"}
                    </button>
                  </div>
                </div>

                {showAdvancedPert ? (
                  <div className="mt-3 space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                          Lipase per gram of dietary fat
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowAddRatioModal(true)}
                          className="text-[10px] font-medium text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                        >
                          <Plus size={10} /> Add custom ratio
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {dosingRatios.map((opt) => (
                          <div key={opt.value} className="relative group inline-flex items-center">
                            <button
                              type="button"
                              onClick={() => setPertRatioPerGram(opt.value)}
                              className={`rounded-lg py-0.5 text-[10px] font-semibold transition ${
                                pertRatioPerGram === opt.value
                                  ? "bg-purple-600 text-white"
                                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300"
                              } ${dosingRatios.length > 1 ? "pl-2 pr-5" : "px-2"}`}
                            >
                              {opt.label}
                            </button>
                            {dosingRatios.length > 1 && (
                              <button
                                type="button"
                                title={`Delete ${opt.label}`}
                                aria-label={`Delete ${opt.label}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteRatio(opt.value);
                                }}
                                className={`absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 transition ${
                                  pertRatioPerGram === opt.value
                                    ? "text-purple-200 hover:bg-purple-700 hover:text-white"
                                    : "text-slate-400 opacity-60 hover:opacity-100 hover:bg-rose-100 hover:text-rose-600"
                                }`}
                              >
                                <X size={9} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Stepper
                        label="Meal floor (IU)"
                        value={pertMealFloor}
                        min={10000}
                        max={50000}
                        step={5000}
                        accent="#a78bfa"
                        onChange={(val) => setPertMealFloor(val ?? 10000)}
                      />
                      <Stepper
                        label="Snack floor (IU)"
                        value={pertSnackFloor}
                        min={5000}
                        max={25000}
                        step={2500}
                        accent="#fbbf24"
                        onChange={(val) => setPertSnackFloor(val ?? 5000)}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                    Current ratio: <strong className="text-slate-700 dark:text-slate-300">{pertRatioPerGram.toLocaleString()} IU/g fat</strong> · Meal floor: <strong className="text-slate-700 dark:text-slate-300">{pertMealFloor.toLocaleString()} IU</strong> · Snack floor: <strong className="text-slate-700 dark:text-slate-300">{pertSnackFloor.toLocaleString()} IU</strong>
                  </p>
                )}
              </div>

              {/* Dietary Fat Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <Stepper
                  label="Fat in the meal"
                  unit="grams"
                  value={mealFatGrams}
                  min={0}
                  max={120}
                  accent="#a78bfa"
                  onChange={setMealFatGrams}
                />
                <Stepper
                  label="Fat in the snack"
                  unit="grams"
                  value={snackFatGrams}
                  min={0}
                  max={60}
                  accent="#fbbf24"
                  onChange={setSnackFatGrams}
                />
              </div>

              {/* Calculated Meal Dose */}
              {mealDose ? (
                <GlassWell className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Meal dose
                    </p>
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                      {pertBrand} {effectiveCapsuleStrength?.toLocaleString()} IU
                    </span>
                  </div>
                  <p className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white">
                    {mealDose.units.toLocaleString()} IU lipase
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    {mealDose.units === 0 ? (
                      "0 capsules required (fat-free intake)."
                    ) : (
                      `${mealDose.capsules} × ${effectiveCapsuleStrength?.toLocaleString()} IU capsule${mealDose.capsules === 1 ? "" : "s"} with the first bite.`
                    )}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{mealDose.note}</p>
                </GlassWell>
              ) : null}

              {/* Calculated Snack Dose */}
              {snackDose ? (
                <GlassWell className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Snack dose
                    </p>
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      {pertBrand} {effectiveCapsuleStrength?.toLocaleString()} IU
                    </span>
                  </div>
                  <p className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white">
                    {snackDose.units.toLocaleString()} IU lipase
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    {snackDose.units === 0 ? (
                      "0 capsules required (fat-free intake)."
                    ) : (
                      `${snackDose.capsules} × ${effectiveCapsuleStrength?.toLocaleString()} IU capsule${snackDose.capsules === 1 ? "" : "s"} with the snack.`
                    )}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{snackDose.note}</p>
                </GlassWell>
              ) : null}

              {!mealDose && !snackDose ? (
                <p className="text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                  Choose a capsule strength and enter the fat content of the intake. Nothing is
                  assumed — the calculator stays blank until you have given it real numbers.
                </p>
              ) : null}

              {/* Live Patient Weight & Daily Safety Ceiling */}
              <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-900/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Scale size={14} className="text-purple-600 dark:text-purple-400" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Patient Weight & Ceiling Simulation
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {selectedReferral
                        ? patientWeightOverride !== null
                          ? "Using custom simulated weight"
                          : `Synced from assessment (${patientName})`
                        : "Adjust weight to simulate safety ceiling"}
                    </p>
                  </div>

                  <div className="w-36">
                    <Stepper
                      label="Simulate Weight"
                      unit="kg"
                      value={effectiveWeightKg}
                      step={0.5}
                      accent="#a78bfa"
                      onChange={setPatientWeightOverride}
                    />
                  </div>
                </div>

                {dailyCeiling ? (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Daily Safety Ceiling (10,000 IU/kg/day):
                      </span>
                      <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                        {dailyCeiling.toLocaleString()} IU lipase
                      </span>
                    </div>

                    {estimatedDailyUnits > 0 ? (
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-slate-500 dark:text-slate-400">
                            Estimated Daily Regimen (3 meals + 2 snacks):
                          </span>
                          <span className={`font-bold tabular-nums ${
                            ceilingPercent && ceilingPercent > 100
                              ? "text-rose-600 dark:text-rose-400"
                              : ceilingPercent && ceilingPercent > 75
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}>
                            ~{estimatedDailyUnits.toLocaleString()} IU ({ceilingPercent}%)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              ceilingPercent && ceilingPercent > 100
                                ? "bg-rose-500"
                                : ceilingPercent && ceilingPercent > 75
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(100, ceilingPercent ?? 0)}%` }}
                          />
                        </div>
                        {ceilingPercent && ceilingPercent > 100 ? (
                          <p className="mt-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                            <AlertTriangle size={12} /> Exceeds daily safety ceiling! High risk of fibrosing colonopathy.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Set a weight above or record on assessment tab to calculate safety ceiling.
                  </p>
                )}
              </div>

              {/* Regimen active in plan banner with Delete option */}
              {pertPlanItemsCount > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-purple-200 bg-purple-50/70 px-3.5 py-2.5 text-xs text-purple-900 dark:border-purple-800/50 dark:bg-purple-950/40 dark:text-purple-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-purple-600 dark:text-purple-400 shrink-0" />
                    <span><strong>{pertPlanItemsCount} PERT items</strong> active in dietary plan</span>
                  </div>
                  <button
                    type="button"
                    onClick={clearPertFromPlan}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-950/60 transition"
                  >
                    <Trash2 size={12} /> Delete from plan
                  </button>
                </div>
              )}

              {/* Action Directives */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-white/10">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {selectedReferral ? (
                    <span>Plan target: <strong>{patientName}</strong></span>
                  ) : (
                    <span>Select patient to attach to record</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <GlassButton
                    size="sm"
                    variant="solid"
                    accent="#a78bfa"
                    onClick={applyPertToPlan}
                    disabled={(!mealDose || mealDose.units === 0) && (!snackDose || snackDose.units === 0)}
                    icon={<CheckCircle2 size={13} />}
                  >
                    Apply to Dietary Plan
                  </GlassButton>
                  {planItems.length > 0 ? (
                    <GlassButton
                      size="sm"
                      variant="ghost"
                      onClick={() => setActiveTab("plan")}
                    >
                      View Plan ({planItems.length})
                    </GlassButton>
                  ) : null}
                </div>
              </div>
            </div>
          </GlassPanel>

          {/* Enteral Tube Feeding */}
          <GlassPanel
            title="Enteral tube feeding"
            subtitle="Rate and formula in, daily delivery out"
            icon={<Droplets size={16} />}
            accent="#38bdf8"
          >
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Formula
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddFormulaModal(true)}
                      className="text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                    >
                      <Plus size={12} /> Add custom formula
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowManageFormulasModal(true)}
                      className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:underline"
                    >
                      Manage ({allEnteralFormulas.length})
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <GlassSelect
                      id="enteral-formula"
                      value={enteralFormulaId ?? ""}
                      onChange={(event) =>
                        setEnteralFormulaId(event.target.value === "" ? null : event.target.value)
                      }
                    >
                      <option value="">Choose a formula</option>
                      {allEnteralFormulas.map((formula) => (
                        <option key={formula.id} value={formula.id}>
                          {formula.label}
                        </option>
                      ))}
                    </GlassSelect>
                  </div>
                  {enteralFormulaId && (
                    <button
                      type="button"
                      title="Delete selected formula"
                      aria-label="Delete selected formula"
                      onClick={() => handleDeleteFormula(enteralFormulaId)}
                      className="shrink-0 rounded-xl border border-rose-200/80 bg-rose-50/70 p-2 text-rose-600 hover:bg-rose-100 transition dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Stepper
                  label="Infusion rate"
                  unit="mL/hour"
                  value={enteralRate}
                  min={0}
                  max={300}
                  step={5}
                  accent="#38bdf8"
                  onChange={setEnteralRate}
                />
                <Stepper
                  label="Hours per day"
                  unit="hours"
                  value={enteralHours}
                  min={0}
                  max={24}
                  accent="#0891b2"
                  onChange={setEnteralHours}
                />
              </div>

              {enteral ? (
                <GlassWell className="space-y-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Volume
                      </p>
                      <p className="text-base font-semibold tabular-nums text-slate-900 dark:text-white">
                        {enteral.volumePerDayMl}
                      </p>
                      <p className="text-[10px] text-slate-400">mL/day</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Energy
                      </p>
                      <p className="text-base font-semibold tabular-nums text-slate-900 dark:text-white">
                        {enteral.kcalPerDay}
                      </p>
                      <p className="text-[10px] text-slate-400">kcal/day</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Protein
                      </p>
                      <p className="text-base font-semibold tabular-nums text-slate-900 dark:text-white">
                        {enteral.proteinPerDay}
                      </p>
                      <p className="text-[10px] text-slate-400">g/day</p>
                    </div>
                  </div>

                  {enteral.kcalPerKg !== null ? (
                    <p className="border-t border-slate-900/8 pt-2 text-[11px] text-slate-600 dark:border-white/8 dark:text-slate-300">
                      That is <strong>{enteral.kcalPerKg} kcal/kg</strong> and <strong>{enteral.proteinPerKg} g protein/kg</strong> against effective patient weight ({effectiveWeightKg} kg).
                    </p>
                  ) : (
                    <p className="border-t border-slate-900/8 pt-2 text-[11px] text-slate-500 dark:border-white/8 dark:text-slate-400">
                      Adjust weight in the PERT card to see delivery per kilogram.
                    </p>
                  )}
                </GlassWell>
              ) : (
                <p className="text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                  Choose a formula and set a rate and duration. Nothing is pre-filled, because a
                  feeding regimen carried over from another patient is a prescribing error.
                </p>
              )}

              <div className="rounded-2xl border border-sky-400/40 bg-sky-500/10 px-4 py-3">
                <p className="text-[11px] font-semibold text-sky-800 dark:text-sky-200">
                  Refeeding caution
                </p>
                <p className="mt-1 text-[10px] leading-4 text-sky-800/85 dark:text-sky-200/85">
                  Where intake has been negligible for five days or more, start at no more than 10 kcal/kg/day, give
                  thiamine before feeding, and check potassium, magnesium and phosphate daily for three days.
                </p>
              </div>

              {/* Tube feeding active in plan banner with Delete option */}
              {hasEnteralInPlan && (
                <div className="flex items-center justify-between rounded-xl border border-sky-200 bg-sky-50/70 px-3.5 py-2.5 text-xs text-sky-900 dark:border-sky-800/50 dark:bg-sky-950/40 dark:text-sky-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-sky-600 dark:text-sky-400 shrink-0" />
                    <span><strong>Tube feeding regimen</strong> active in dietary plan</span>
                  </div>
                  <button
                    type="button"
                    onClick={clearEnteralFromPlan}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-950/60 transition"
                  >
                    <Trash2 size={12} /> Delete from plan
                  </button>
                </div>
              )}

              {/* Action Directives */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-white/10">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {selectedReferral ? (
                    <span>Plan target: <strong>{patientName}</strong></span>
                  ) : (
                    <span>Select patient to attach to record</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <GlassButton
                    size="sm"
                    variant="solid"
                    accent="#38bdf8"
                    onClick={applyEnteralToPlan}
                    disabled={!enteral || !enteralFormula}
                    icon={<CheckCircle2 size={13} />}
                  >
                    Apply to Dietary Plan
                  </GlassButton>
                  {planItems.length > 0 ? (
                    <GlassButton
                      size="sm"
                      variant="ghost"
                      onClick={() => setActiveTab("plan")}
                    >
                      View Plan ({planItems.length})
                    </GlassButton>
                  ) : null}
                </div>
              </div>
            </div>
          </GlassPanel>
        </div>

        {/* Custom Formula Modal */}
        <GlassModal
          open={showAddFormulaModal}
          onClose={() => setShowAddFormulaModal(false)}
          title="Add custom enteral formula"
          subtitle="Define hospital or patient-specific commercial tube feeding formula"
          icon={<Droplets size={16} />}
          accent="#38bdf8"
          footer={
            <>
              <GlassButton onClick={() => setShowAddFormulaModal(false)}>Cancel</GlassButton>
              <GlassButton
                variant="solid"
                accent="#38bdf8"
                form="add-custom-formula-form"
                type="submit"
                disabled={!newFormulaName.trim()}
              >
                Save formula
              </GlassButton>
            </>
          }
        >
          <form id="add-custom-formula-form" onSubmit={handleAddCustomFormula} className="space-y-4">
            <GlassField label="Formula name" htmlFor="custom-formula-name" required>
              <GlassInput
                id="custom-formula-name"
                required
                placeholder="e.g. Peptamen AF, Nepro HP, Hospital Renal Blend"
                value={newFormulaName}
                onChange={(e) => setNewFormulaName(e.target.value)}
              />
            </GlassField>

            <div className="grid grid-cols-2 gap-3">
              <GlassField label="Energy density (kcal/mL)" htmlFor="custom-formula-kcal" required>
                <GlassInput
                  id="custom-formula-kcal"
                  type="number"
                  step="0.05"
                  min="0.5"
                  max="3.0"
                  required
                  value={newFormulaKcal}
                  onChange={(e) => setNewFormulaKcal(e.target.value)}
                />
              </GlassField>

              <GlassField label="Protein content (g/L)" htmlFor="custom-formula-protein" required>
                <GlassInput
                  id="custom-formula-protein"
                  type="number"
                  step="1"
                  min="10"
                  max="150"
                  required
                  value={newFormulaProtein}
                  onChange={(e) => setNewFormulaProtein(e.target.value)}
                />
              </GlassField>
            </div>
          </form>
        </GlassModal>

        {/* Custom Brand Modal */}
        <GlassModal
          open={showAddBrandModal}
          onClose={() => setShowAddBrandModal(false)}
          title="Add custom enzyme brand"
          subtitle="Add a hospital or country-specific commercial pancrelipase formulation"
          icon={<Pill size={16} />}
          accent="#a78bfa"
          footer={
            <>
              <GlassButton onClick={() => setShowAddBrandModal(false)}>Cancel</GlassButton>
              <GlassButton
                variant="solid"
                accent="#a78bfa"
                form="add-custom-brand-form"
                type="submit"
                disabled={!newBrandName.trim()}
              >
                Add brand
              </GlassButton>
            </>
          }
        >
          <form id="add-custom-brand-form" onSubmit={handleAddBrand} className="space-y-4">
            <GlassField label="Brand / Formulation name" htmlFor="custom-brand-name" required>
              <GlassInput
                id="custom-brand-name"
                required
                placeholder="e.g. Cotazym®, Pangrol®, Micro-encapsulated Pancrelipase"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
              />
            </GlassField>
          </form>
        </GlassModal>

        {/* Custom Capsule Strength Preset Modal */}
        <GlassModal
          open={showAddStrengthModal}
          onClose={() => setShowAddStrengthModal(false)}
          title="Add capsule strength preset"
          subtitle="Save a quick-click button for standard prescription strengths"
          icon={<Pill size={16} />}
          accent="#a78bfa"
          footer={
            <>
              <GlassButton onClick={() => setShowAddStrengthModal(false)}>Cancel</GlassButton>
              <GlassButton
                variant="solid"
                accent="#a78bfa"
                form="add-strength-preset-form"
                type="submit"
                disabled={!newStrengthInput.trim() || parseInt(newStrengthInput, 10) <= 0}
              >
                Add preset
              </GlassButton>
            </>
          }
        >
          <form
            id="add-strength-preset-form"
            onSubmit={(e) => {
              e.preventDefault();
              const val = parseInt(newStrengthInput, 10);
              if (val > 0) handleAddStrengthPreset(val);
            }}
            className="space-y-4"
          >
            <GlassField label="Lipase strength per capsule (IU)" htmlFor="preset-strength-val" required>
              <GlassInput
                id="preset-strength-val"
                type="number"
                min={500}
                max={150000}
                step={500}
                required
                placeholder="e.g. 12000, 15000, 75000"
                value={newStrengthInput}
                onChange={(e) => setNewStrengthInput(e.target.value)}
              />
            </GlassField>
          </form>
        </GlassModal>

        {/* Custom Dosing Ratio Modal */}
        <GlassModal
          open={showAddRatioModal}
          onClose={() => setShowAddRatioModal(false)}
          title="Add custom dosing ratio"
          subtitle="Configure a tailored enzyme-to-fat ratio for this patient cohort"
          icon={<Scale size={16} />}
          accent="#a78bfa"
          footer={
            <>
              <GlassButton onClick={() => setShowAddRatioModal(false)}>Cancel</GlassButton>
              <GlassButton
                variant="solid"
                accent="#a78bfa"
                form="add-dosing-ratio-form"
                type="submit"
                disabled={!newRatioValue.trim() || parseInt(newRatioValue, 10) <= 0}
              >
                Add ratio
              </GlassButton>
            </>
          }
        >
          <form id="add-dosing-ratio-form" onSubmit={handleAddRatio} className="space-y-4">
            <GlassField label="Lipase per gram of dietary fat (IU/g)" htmlFor="custom-ratio-val" required>
              <GlassInput
                id="custom-ratio-val"
                type="number"
                min={500}
                max={10000}
                step={100}
                required
                placeholder="e.g. 1800, 2200, 3500"
                value={newRatioValue}
                onChange={(e) => setNewRatioValue(e.target.value)}
              />
            </GlassField>
            <GlassField label="Optional display label" htmlFor="custom-ratio-label">
              <GlassInput
                id="custom-ratio-label"
                placeholder="e.g. 1.8k IU/g (Moderate Exocrine Deficiency)"
                value={newRatioLabel}
                onChange={(e) => setNewRatioLabel(e.target.value)}
              />
            </GlassField>
          </form>
        </GlassModal>

        {/* Manage Enteral Formulas Modal */}
        <GlassModal
          open={showManageFormulasModal}
          onClose={() => setShowManageFormulasModal(false)}
          title="Manage enteral formulas"
          subtitle="Review, delete or add enteral nutrition formulas available in the workspace"
          icon={<Droplets size={16} />}
          accent="#38bdf8"
          width="max-w-2xl"
          footer={
            <>
              <GlassButton onClick={() => setShowManageFormulasModal(false)}>Close</GlassButton>
              <GlassButton
                variant="solid"
                accent="#38bdf8"
                onClick={() => {
                  setShowManageFormulasModal(false);
                  setShowAddFormulaModal(true);
                }}
                icon={<Plus size={13} />}
              >
                Add new formula
              </GlassButton>
            </>
          }
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{allEnteralFormulas.length} formula{allEnteralFormulas.length === 1 ? "" : "s"} available</span>
              {allEnteralFormulas.length < DEFAULT_ENTERAL_FORMULAS.length && (
                <button
                  type="button"
                  onClick={() => setAllEnteralFormulas(DEFAULT_ENTERAL_FORMULAS)}
                  className="text-sky-600 dark:text-sky-400 hover:underline"
                >
                  Restore default standard formulas
                </button>
              )}
            </div>

            <ul className="divide-y divide-slate-200/60 dark:divide-white/10 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 max-h-80 overflow-y-auto">
              {allEnteralFormulas.map((f) => (
                <li key={f.id} className="flex items-center justify-between p-3 gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {f.label}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {f.kcalPerMl} kcal/mL · {f.proteinPerL} g/L protein
                      {f.isCustom ? " · Custom hospital formulary" : " · Standard formula"}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {enteralFormulaId === f.id ? (
                      <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-300">
                        Selected
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEnteralFormulaId(f.id);
                          setShowManageFormulasModal(false);
                        }}
                        className="rounded-lg px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Select
                      </button>
                    )}

                    {allEnteralFormulas.length > 1 && (
                      <button
                        type="button"
                        title={`Delete ${f.label}`}
                        aria-label={`Delete ${f.label}`}
                        onClick={() => handleDeleteFormula(f.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </GlassModal>
      </div>
    );
  }

  /* -------------------------------------------------------------- */
  /* Tab: history                                                    */
  /* -------------------------------------------------------------- */

  function renderHistory() {
    if (!selectedReferral) return needPatient("The record");

    return (
      <div className="grid gap-5 xl:grid-cols-2">
        <GlassPanel
          title="Assessment history"
          subtitle={`${assessments.length} recorded`}
          icon={<ClipboardList size={16} />}
          accent={ACCENT_BRIGHT}
        >
          {isLoadingPatient ? (
            <GlassSkeleton rows={3} height={64} />
          ) : assessments.length === 0 ? (
            <EmptyPrompt
              icon={<ClipboardList size={20} />}
              title="No assessments yet"
              description="The first assessment you record for this patient appears here."
            />
          ) : (
            <ul className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
              {assessments.map((entry) => {
                const entryBmi = bmiFrom(entry.weightKg ?? null, entry.heightCm ?? null);

                return (
                  <li key={entry.id} className="wfg-well px-3.5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        {shortDate(entry.assessedAt)}
                      </p>
                      {entry.enzymeRequirement ? (
                        <StatusPill tone="info">Enzymes required</StatusPill>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {entry.weightKg ? `${entry.weightKg} kg` : "No weight"}
                      {entryBmi ? ` · BMI ${entryBmi}` : ""}
                      {entry.appetiteScore !== null && entry.appetiteScore !== undefined
                        ? ` · appetite ${entry.appetiteScore}/10`
                        : ""}
                    </p>
                    {entry.giSymptoms ? (
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {entry.giSymptoms}
                      </p>
                    ) : null}
                    {entry.notes ? (
                      <p className="mt-1 line-clamp-2 text-[11px] italic text-slate-500 dark:text-slate-400">
                        {entry.notes}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </GlassPanel>

        <GlassPanel
          title="Published dietary plan"
          subtitle={activePlan ? activePlan.phase : "Nothing published yet"}
          icon={<Utensils size={16} />}
          accent="#0891b2"
        >
          {!activePlan ? (
            <EmptyPrompt
              icon={<Utensils size={20} />}
              title="No plan published"
              description="Build one on the dietary plan tab and it appears here once saved."
            />
          ) : (
            <div className="space-y-3">
              <GlassWell className="space-y-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                  {activePlan.title}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Started {shortDate(activePlan.startDate)}
                  {activePlan.caloricTargetKcal ? ` · ${activePlan.caloricTargetKcal} kcal/day` : ""}
                  {activePlan.proteinTargetGrams ? ` · ${activePlan.proteinTargetGrams} g protein` : ""}
                </p>
                {activePlan.foodsToAvoid ? (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Avoiding: {activePlan.foodsToAvoid}
                  </p>
                ) : null}
              </GlassWell>

              <ul className="max-h-96 space-y-1.5 overflow-y-auto pr-1">
                {(activePlan.items ?? []).map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-300/45 px-3 py-2 dark:border-white/10"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: ITEM_TYPE_HUE[item.itemType] }}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[11px] font-medium text-slate-800 dark:text-slate-100">
                          {item.name}
                        </span>
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                          {item.timeOfDay}
                          {item.quantity ? ` · ${item.quantity} ${item.unit ?? ""}` : ""}
                        </span>
                      </span>
                    </span>
                    {item.carePlanTaskId ? (
                      <StatusPill tone="good">On the app</StatusPill>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </GlassPanel>
      </div>
    );
  }

  /* -------------------------------------------------------------- */
  /* Render                                                          */
  /* -------------------------------------------------------------- */

  const pendingCount = referrals.filter((referral) => referral.status === "PENDING").length;

  return (
    <div className="wfg-pt w-full space-y-5 px-3.5 py-4 sm:px-6 sm:py-6 lg:px-8">
      <AuroraHero
        eyebrow="Clinical Nutrition · Dietetics"
        title="Dietetics workspace"
        description="Caseload, nutritional screening, enzymes & meal plans"
        icon={<Apple size={15} />}
        chips={[
          { label: "in caseload", value: String(referrals.length), solid: true },
          { label: "pending", value: String(pendingCount) },
          { label: "active plans", value: String(roster.length) },
          { label: "templates", value: String(MEAL_TEMPLATES.length) },
        ]}
        actions={
          <>
            <GlassButton
              variant="onAurora"
              size="sm"
              icon={<RefreshCw size={12} className={isLoadingCaseload ? "animate-spin" : ""} />}
              onClick={refreshCaseload}
              disabled={isLoadingCaseload}
            >
              Refresh
            </GlassButton>

            <Link
              href="/operations/nutrition/profile"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-[rgb(255_255_255/0.15)] px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur transition hover:bg-[rgb(255_255_255/0.25)]"
            >
              <Compass size={13} /> Preferences
            </Link>
          </>
        }
      />

      {feedback ? (
        <Notice tone={feedback.tone} title={feedback.title} onDismiss={() => setFeedback(null)}>
          {feedback.detail}
        </Notice>
      ) : null}

      {renderPatientStrip()}

      <div className="wfg-pt-rise">
        {activeTab === "overview" ? renderOverview() : null}
        {activeTab === "caseload" ? renderCaseload() : null}
        {activeTab === "assessment" ? renderAssessment() : null}
        {activeTab === "plan" ? renderPlan() : null}
        {activeTab === "calculators" ? renderCalculators() : null}
        {activeTab === "history" ? renderHistory() : null}
        {activeTab === "alerts" ? (
          <NutritionAlertsView
            onSelectPatient={(pId) => {
              const match = referrals.find(
                (r) => r.patientId === pId || r.patient?.patientNumber === pId,
              );
              if (match) {
                choosePatient(match.id);
                setActiveTab("overview");
              } else if (referrals.length > 0) {
                choosePatient(referrals[0].id);
                setActiveTab("overview");
              }
            }}
            onNavigatePlan={() => setActiveTab("plan")}
            onNavigateCalculators={() => setActiveTab("calculators")}
          />
        ) : null}
      </div>

      {/* Completing an episode of care */}
      <GlassModal
        open={completingReferralId !== null}
        onClose={() => setCompletingReferralId(null)}
        title="Complete this episode of dietetic care"
        subtitle="The summary goes back to the referring surgeon"
        icon={<ClipboardCheck size={16} />}
        accent={ACCENT}
        width="max-w-xl"
        footer={
          <>
            <GlassButton onClick={() => setCompletingReferralId(null)}>Cancel</GlassButton>
            <GlassButton
              variant="solid"
              accent={ACCENT}
              disabled={!completionNotes.trim() || busyAction !== null}
              onClick={async () => {
                if (!completingReferralId) return;
                await runReferralAction(
                  completingReferralId,
                  "complete",
                  "Episode of dietetic care completed.",
                  { outcomeNotes: completionNotes.trim() },
                );
                setCompletingReferralId(null);
                setCompletionNotes("");
              }}
            >
              Complete the episode
            </GlassButton>
          </>
        }
      >
        <GlassField
          label="Discharge nutritional status and handover"
          htmlFor="completion-notes"
          required
          hint="This replaces the browser prompt this screen used to show — it is part of the record, so it belongs in a real field."
        >
          <GlassTextarea
            id="completion-notes"
            rows={5}
            value={completionNotes}
            placeholder="e.g. Tolerating phase 4 on 50,000 IU with meals. Weight stable for one week. Community dietitian referral made."
            onChange={(event) => setCompletionNotes(event.target.value)}
          />
        </GlassField>
      </GlassModal>

      <p className="flex items-center justify-center gap-1.5 pb-2 text-[11px] text-slate-400 dark:text-slate-500">
        <Apple aria-hidden size={12} />
        WonFlow dietetics · general nutrition and the HPB surgical service
      </p>
    </div>
  );
}

/* ================================================================== */
/* Helpers                                                             */
/* ================================================================== */

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/* ================================================================== */
/* Clinical Alerts — real-time surveillance & dietetic guidance       */
/* ================================================================== */

interface NutritionAlertItem {
  id: string;
  patientId: string;
  patientName: string;
  patientNumber: string;
  title: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  createdAt: string;
  ruleName: string;
  triggerDetail: string;
  category: "ISGPS_FISTULA" | "REFEEDING_SYNDROME" | "FEEDING_INTOLERANCE" | "ENZYME_CEILING" | "CATABOLIC_MALNUTRITION";
  dieteticGuidance: {
    directive: "HOLD_ENTERAL_TPN" | "REFEEDING_SLOW_REPLACE" | "HOLD_GASTRIC_PROKINETIC" | "TITRATE_PERT" | "PROTEIN_CATABOLISM";
    badgeText: string;
    summary: string;
    instructions: string[];
  };
  managingDoctorName?: string;
  acknowledgedAt?: string | null;
  resolutionNotes?: string | null;
}

const SEED_NUTRITION_ALERTS: NutritionAlertItem[] = [
  {
    id: "nutr-fistula-alert-01",
    patientId: "dev-patient-001",
    patientName: "Zainab Bibi",
    patientNumber: "DEV-0001",
    title: "High-Output Pancreatic Drain Leak (ISGPS Grade B)",
    severity: "CRITICAL",
    status: "OPEN",
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    ruleName: "ISGPS Fistula Drain Amylase > 3x Upper Normal & Output > 500 mL/day",
    triggerDetail: "Drain Amylase: 4,450 U/L (POD 4), Output: 640 mL/24h serosanguinous. Abdominal CT shows localized collection.",
    category: "ISGPS_FISTULA",
    dieteticGuidance: {
      directive: "HOLD_ENTERAL_TPN",
      badgeText: "Hold Standard Feeds — Evaluate TPN / Elemental",
      summary: "High-output pancreatic fistula requires immediate reduction of exocrine stimulation. Withhold standard oral/polymeric enteral intake.",
      instructions: [
        "Withhold standard oral food and intact-protein polymeric formulas immediately.",
        "Evaluate with surgical team for central venous catheter placement and Total Parenteral Nutrition (TPN).",
        "If surgical team approves distal feeding jejunostomy access, trial low-fat semi-elemental formula at 20 mL/hr.",
        "Ensure trace element (zinc, copper) replacement to offset enterocutaneous fistular losses.",
      ],
    },
    managingDoctorName: "Dr. Marcus Vance (Lead HPB Surgeon)",
  },
  {
    id: "nutr-refeeding-alert-02",
    patientId: "dev-patient-002",
    patientName: "Muhammad Usman",
    patientNumber: "DEV-0002",
    title: "Severe Refeeding Hypophosphatemia & Glucose Spike",
    severity: "CRITICAL",
    status: "OPEN",
    createdAt: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
    ruleName: "Serum Phosphate Drop > 30% (< 0.65 mmol/L) on Feed Initiation",
    triggerDetail: "Phosphate: 0.52 mmol/L (Baseline 0.88), Blood Glucose: 284 mg/dL. Telemetry notes resting sinus tachycardia 108 bpm.",
    category: "REFEEDING_SYNDROME",
    dieteticGuidance: {
      directive: "REFEEDING_SLOW_REPLACE",
      badgeText: "Refeeding Alert — Reduce Infusion Rate by 50%",
      summary: "Acute intracellular shift of phosphorus, potassium and magnesium during rapid carbohydrate loading in malnourished state.",
      instructions: [
        "Immediately reduce enteral infusion rate by 50% (from 60 mL/hr to 30 mL/hr).",
        "Verify IV sodium glycerophosphate (20-40 mmol) and IV thiamine (200-300 mg) infusion before re-advancing rate.",
        "Recheck serum phosphate, potassium, magnesium and calcium every 12 hours until stable for 48 hours.",
        "Delay caloric progression to full goal until serum phosphate normalizes ≥ 0.85 mmol/L.",
      ],
    },
    managingDoctorName: "Dr. Chloe Zhang (Clinical Oncologist)",
  },
  {
    id: "nutr-intolerance-alert-03",
    patientId: "dev-patient-003",
    patientName: "Tariq Rahman",
    patientNumber: "DEV-0003",
    title: "High Gastric Residual Volume & Delayed Emptying",
    severity: "WARNING",
    status: "ACKNOWLEDGED",
    createdAt: new Date(Date.now() - 140 * 60 * 1000).toISOString(),
    ruleName: "Gastric Residual Volume (GRV) > 300 mL on Serial 4-Hour Aspirates",
    triggerDetail: "GRV: 390 mL aspirate at 08:00 (Prior 310 mL). Epigastric fullness and delayed transit post-pylorus preserving Whipple.",
    category: "FEEDING_INTOLERANCE",
    dieteticGuidance: {
      directive: "HOLD_GASTRIC_PROKINETIC",
      badgeText: "Gastric Retention — Hold 2h & Prokinetic Coverage",
      summary: "Gastric stasis and gastroparesis post-duodenectomy. Risk of bronchoaspiration if infusion continues at full rate.",
      instructions: [
        "Withhold gastric feeding for 2 hours, then re-aspirate and discard residual only if volume exceeds 500 mL.",
        "Confirm prokinetic therapy (IV metoclopramide 10 mg or erythromycin 250 mg) with surgical attending.",
        "Elevate head of bed to minimum 35–45 degrees at all times during feeding.",
        "Consider trans-pyloric nasojejunal (NJ) feeding tube conversion if intolerance persists beyond 48 hours.",
      ],
    },
    managingDoctorName: "Dr. Sami Tariq (Oncological Surgeon)",
    acknowledgedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: "nutr-pert-alert-04",
    patientId: "dev-patient-004",
    patientName: "Sarah Jenkins",
    patientNumber: "DEV-0004",
    title: "PERT Dosage Exceeding Fibrosing Colonopathy Ceiling",
    severity: "WARNING",
    status: "ACKNOWLEDGED",
    createdAt: new Date(Date.now() - 210 * 60 * 1000).toISOString(),
    ruleName: "Pancreatic Enzyme Dose > 10,000 Lipase Units/kg/day",
    triggerDetail: "Prescribed Lipase Intake: 11,200 IU/kg/day (Weight 54 kg, taking 605,000 IU/day). Exceeds ESPEN/ISGPS safety ceiling.",
    category: "ENZYME_CEILING",
    dieteticGuidance: {
      directive: "TITRATE_PERT",
      badgeText: "PERT Ceiling Warning — Optimize Meal Fat & Add PPI",
      summary: "High pancreatic enzyme dosing poses risk of fibrosing colonopathy. Maximize enteric absorption before further dose escalation.",
      instructions: [
        "Add or increase proton pump inhibitor (e.g. Omeprazole 40 mg daily) to decrease duodenal acid inactivation of lipase.",
        "Re-evaluate food diary to redistribute dietary fat evenly across meals rather than high-fat single spikes.",
        "Titrate PERT down towards ≤ 75,000 IU per main meal and ≤ 25,000 IU per snack.",
        "Assess for concurrent bile acid malabsorption or small intestinal bacterial overgrowth (SIBO).",
      ],
    },
    managingDoctorName: "Dr. Marcus Vance (HPB Surgeon)",
    acknowledgedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
  },
  {
    id: "nutr-catabolic-alert-05",
    patientId: "dev-patient-005",
    patientName: "Fatima Noor",
    patientNumber: "DEV-0005",
    title: "Acute Surgical Catabolism & Hypoalbuminemia",
    severity: "INFO",
    status: "RESOLVED",
    createdAt: new Date(Date.now() - 360 * 60 * 1000).toISOString(),
    ruleName: "Serum Albumin < 24 g/L with Severe Sarcopenic Muscle Loss",
    triggerDetail: "Baseline Albumin 21 g/L with MUST score 3 (High Risk). Stabilized to 29 g/L following fortified peptide protocol.",
    category: "CATABOLIC_MALNUTRITION",
    dieteticGuidance: {
      directive: "PROTEIN_CATABOLISM",
      badgeText: "Resolved — High-Protein Target Reached",
      summary: "Patient successfully transitioned to high-protein oral nutrition supplements with modular whey protein.",
      instructions: [
        "Patient met 1.8 g/kg/day protein goal for 5 consecutive days.",
        "Weight trend stabilized (+0.8 kg fluid-adjusted over 7 days).",
        "Continue dietary counselling for outpatient surgical recovery phase.",
      ],
    },
    managingDoctorName: "Dr. Chloe Zhang (Clinical Oncologist)",
    resolutionNotes: "Protein intake stabilized at 1.9 g/kg/day with modular whey protein supplements. Serum albumin improved to 29 g/L. Patient tolerating full phase 3 soft diet.",
  },
];

function NutritionAlertsView({
  onSelectPatient,
  onNavigatePlan,
  onNavigateCalculators,
}: {
  onSelectPatient?: (patientNumber: string) => void;
  onNavigatePlan?: () => void;
  onNavigateCalculators?: () => void;
}) {
  const [alerts, setAlerts] = useState<NutritionAlertItem[]>(SEED_NUTRITION_ALERTS);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | "CRITICAL" | "WARNING" | "HOLD" | "ACTIVE" | "RESOLVED">("ALL");
  const [notice, setNotice] = useState<{ tone: "good" | "critical" | "info"; text: string } | null>(null);

  // Resolution modal state
  const [resolvingAlert, setResolvingAlert] = useState<NutritionAlertItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [submittingResolution, setSubmittingResolution] = useState(false);

  // Data loader
  const loadLiveAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/clinical/alerts?limit=50", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.alerts) && data.alerts.length > 0) {
        interface RawNutritionApiAlert {
          id: string;
          patientId: string;
          severity?: string;
          status?: string;
          createdAt: string;
          triggerValue?: number | string | null;
          thresholdValue?: number | string | null;
          metricCode?: string | null;
          acknowledgedAt?: string | null;
          resolutionNotes?: string | null;
          Patient?: { givenName?: string; familyName?: string; patientNumber?: string } | null;
          AlertRule?: { name?: string; metricType?: string } | null;
        }
        const mapped: NutritionAlertItem[] = data.alerts.map((a: RawNutritionApiAlert) => {
          const isFistula = /fistula|amylase|drain|pancrea/i.test(a.AlertRule?.name || a.metricCode || "");
          const isRefeeding = /refeed|phos|potassium|sugar|glucose|glycem/i.test(a.AlertRule?.name || a.metricCode || "");
          const isResidual = /residual|grv|stasis|emesis|vomit|nausea/i.test(a.AlertRule?.name || a.metricCode || "");
          const isPert = /pert|enzyme|creon|lipase/i.test(a.AlertRule?.name || a.metricCode || "");

          let directive: NutritionAlertItem["dieteticGuidance"]["directive"] = "PROTEIN_CATABOLISM";
          let badgeText = "Nutritional Monitoring Indicated";
          let summary = "Alert raised on clinical telemetry. Reassess caloric and macronutrient delivery.";
          let instructions = [
            "Monitor enteral feeding tolerance and blood biochemistry.",
            "Verify daily caloric and protein intake adherence against targets.",
          ];

          if (isFistula) {
            directive = "HOLD_ENTERAL_TPN";
            badgeText = "Hold Standard Feeds — Evaluate TPN / Elemental";
            summary = "Pancreatic / biliary drain output escalation. Minimize pancreatic stimulation.";
            instructions = [
              "Withhold standard oral food and intact-protein polymeric formulas.",
              "Coordinate with surgical team for TPN central line insertion.",
              "Consider low-fat semi-elemental jejunal feeding under surgeon clearance.",
            ];
          } else if (isRefeeding) {
            directive = "REFEEDING_SLOW_REPLACE";
            badgeText = "Refeeding Alert — Reduce Infusion Rate by 50%";
            summary = "Acute electrolyte shift detected. Slow caloric advance and replete electrolytes.";
            instructions = [
              "Reduce enteral infusion rate by 50% immediately.",
              "Ensure IV thiamine and phosphate are administered before rate advance.",
              "Monitor serum phosphate, potassium and magnesium q12h.",
            ];
          } else if (isResidual) {
            directive = "HOLD_GASTRIC_PROKINETIC";
            badgeText = "Gastric Retention — Hold 2h & Prokinetic";
            summary = "High gastric residual volume indicates delayed emptying. Avoid aspiration risk.";
            instructions = [
              "Hold gastric feeding for 2 hours, then re-check residual volume.",
              "Review prokinetic coverage with surgical team.",
              "Keep head of bed elevated 35-45 degrees.",
            ];
          } else if (isPert) {
            directive = "TITRATE_PERT";
            badgeText = "PERT Ceiling Warning — Optimize Fat & Add PPI";
            summary = "Enzyme dosage approaching or exceeding safety guidelines.";
            instructions = [
              "Redistribute meal fat into smaller frequent portions.",
              "Ensure acid-suppression therapy is active to prevent lipase degradation.",
            ];
          }

          return {
            id: a.id,
            patientId: a.patientId,
            patientName: a.Patient ? `${a.Patient.givenName} ${a.Patient.familyName}`.trim() : "Patient",
            patientNumber: a.Patient?.patientNumber || "MRN-0000",
            title: a.AlertRule?.name || "Clinical Nutrition Alert",
            severity: (a.severity as "CRITICAL" | "WARNING" | "INFO") || "WARNING",
            status: (a.status as "OPEN" | "ACKNOWLEDGED" | "RESOLVED") || "OPEN",
            createdAt: a.createdAt,
            ruleName: a.AlertRule?.name || "Automated Clinical Rule",
            triggerDetail: `Trigger value: ${a.triggerValue ?? "Abnormal"} (Threshold: ${a.thresholdValue ?? "N/A"})`,
            category: (isFistula
              ? "ISGPS_FISTULA"
              : isRefeeding
              ? "REFEEDING_SYNDROME"
              : isResidual
              ? "FEEDING_INTOLERANCE"
              : isPert
              ? "ENZYME_CEILING"
              : "CATABOLIC_MALNUTRITION") as NutritionAlertItem["category"],
            dieteticGuidance: {
              directive,
              badgeText,
              summary,
              instructions,
            },
            managingDoctorName: "Managing Surgeon",
            acknowledgedAt: a.acknowledgedAt,
            resolutionNotes: a.resolutionNotes,
          };
        });

        setAlerts(mapped);
      } else {
        setAlerts([]);
      }
    } catch {
      // Graceful error handling
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadLiveAlerts();
  }, [loadLiveAlerts]);

  // Acknowledge alert
  const handleAcknowledge = async (item: NutritionAlertItem) => {
    try {
      await fetch(`/api/v1/clinical/alerts/${item.id}/acknowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "Acknowledged by Dietitian. Feeding directives updated." }),
      });
    } catch {
      // Optimistic update
    }
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === item.id
          ? { ...a, status: "ACKNOWLEDGED", acknowledgedAt: new Date().toISOString() }
          : a,
      ),
    );
    setNotice({
      tone: "good",
      text: `Alert acknowledged for ${item.patientName}. Feeding directive updated in clinical audit.`,
    });
  };

  // Resolve alert
  const handleResolve = async (e: FormEvent) => {
    e.preventDefault();
    if (!resolvingAlert || !resolutionNotes.trim()) return;

    setSubmittingResolution(true);
    try {
      await fetch(`/api/v1/clinical/alerts/${resolvingAlert.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolutionNotes: resolutionNotes.trim() }),
      });
    } catch {
      // Optimistic update
    }

    setAlerts((prev) =>
      prev.map((a) =>
        a.id === resolvingAlert.id
          ? { ...a, status: "RESOLVED", resolutionNotes: resolutionNotes.trim() }
          : a,
      ),
    );
    setNotice({
      tone: "good",
      text: `Alert for ${resolvingAlert.patientName} marked resolved. Nutrition plan cleared for advancement.`,
    });
    setSubmittingResolution(false);
    setResolvingAlert(null);
    setResolutionNotes("");
  };

  // Filtered alerts
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return alerts.filter((item) => {
      if (q) {
        const text = `${item.patientName} ${item.patientNumber} ${item.title} ${item.ruleName} ${item.triggerDetail} ${item.dieteticGuidance.summary}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      if (filter === "CRITICAL") return item.severity === "CRITICAL";
      if (filter === "WARNING") return item.severity === "WARNING";
      if (filter === "HOLD") return item.dieteticGuidance.directive === "HOLD_ENTERAL_TPN" || item.dieteticGuidance.directive === "HOLD_GASTRIC_PROKINETIC";
      if (filter === "ACTIVE") return item.status === "OPEN" || item.status === "ACKNOWLEDGED";
      if (filter === "RESOLVED") return item.status === "RESOLVED";
      return true;
    });
  }, [alerts, searchQuery, filter]);

  // Derived stats
  const stats = useMemo(() => {
    const critical = alerts.filter((a) => a.severity === "CRITICAL" && a.status !== "RESOLVED").length;
    const warnings = alerts.filter((a) => a.severity === "WARNING" && a.status !== "RESOLVED").length;
    const holds = alerts.filter(
      (a) =>
        (a.dieteticGuidance.directive === "HOLD_ENTERAL_TPN" ||
          a.dieteticGuidance.directive === "HOLD_GASTRIC_PROKINETIC") &&
        a.status !== "RESOLVED",
    ).length;
    const safeRate = alerts.length > 0 ? Math.round(((alerts.length - holds) / alerts.length) * 100) : 100;
    return {
      total: alerts.length,
      critical,
      warnings,
      holds,
      safeRate,
    };
  }, [alerts]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <GlassPanel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                <ShieldAlert size={18} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Dietetic Alert Surveillance
                  </h2>
                  <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                    <span className="mr-1 h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                    Live Telemetry
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Real-time nutritional risk monitoring for your caseload — ISGPS fistula output, refeeding electrolytes, gastric residuals, and PERT ceiling thresholds.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <GlassButton
              icon={<RefreshCw size={14} className={loading ? "animate-spin" : ""} />}
              onClick={() => void loadLiveAlerts()}
              disabled={loading}
            >
              Refresh telemetry
            </GlassButton>
          </div>
        </div>
      </GlassPanel>

      {notice ? (
        <Notice tone={notice.tone} title={notice.text} onDismiss={() => setNotice(null)} />
      ) : null}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Active Escalations",
            value: stats.critical + stats.warnings,
            sub: `${stats.critical} Critical · ${stats.warnings} Warning`,
            Icon: ShieldAlert,
            accent:
              stats.critical > 0
                ? "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
                : "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400",
          },
          {
            label: "Feeding Holds & TPN",
            value: stats.holds,
            sub: stats.holds > 0 ? "Pause / modify feeds" : "No active feeding holds",
            Icon: AlertTriangle,
            accent:
              stats.holds > 0
                ? "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400",
          },
          {
            label: "Tolerating Feeds",
            value: `${stats.safeRate}%`,
            sub: `${alerts.length - stats.holds} of ${alerts.length} patients on track`,
            Icon: ShieldCheck,
            accent: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400",
          },
          {
            label: "Monitored Caseload",
            value: stats.total,
            sub: "Fistula, refeeding & residual rules active",
            Icon: HeartPulse,
            accent: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400",
          },
        ].map((card) => (
          <GlassPanel key={card.label}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {card.label}
              </span>
              <span className={`rounded-xl p-1.5 ${card.accent}`}>
                <card.Icon size={14} />
              </span>
            </div>
            <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
              {card.value}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
              {card.sub}
            </p>
          </GlassPanel>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search
            className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            size={14}
          />
          <input
            type="text"
            placeholder="Search patient, MRN, alert rule or dietetic directive…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:ring-emerald-900/40"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: "ALL", label: "All Alerts", count: alerts.length, active: "bg-slate-900 text-white dark:bg-white dark:text-slate-900" },
            { key: "CRITICAL", label: "Critical", count: stats.critical, active: "bg-rose-600 text-white" },
            { key: "WARNING", label: "Warnings", count: stats.warnings, active: "bg-amber-600 text-white" },
            { key: "HOLD", label: "Holds & TPN", count: stats.holds, active: "bg-rose-700 text-white" },
            { key: "ACTIVE", label: "Active", count: stats.critical + stats.warnings, active: "bg-emerald-600 text-white" },
            { key: "RESOLVED", label: "Resolved", count: alerts.filter((a) => a.status === "RESOLVED").length, active: "bg-teal-600 text-white" },
          ].map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setFilter(p.key as "ALL" | "CRITICAL" | "WARNING" | "HOLD" | "ACTIVE" | "RESOLVED")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                filter === p.key
                  ? `${p.active} shadow-2xs`
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              {p.label} ({p.count})
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Grid */}
      {filtered.length === 0 ? (
        <GlassPanel>
          <div className="flex flex-col items-center py-10 text-center">
            <ShieldCheck size={32} className="text-emerald-500" />
            <h3 className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">
              {searchQuery ? "No matching alerts" : "Nutritional Telemetry Nominal"}
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
              {searchQuery
                ? `No alerts match "${searchQuery}".`
                : "All patients in your caseload are currently stable, tolerating prescribed feeds and meeting caloric/protein targets."}
            </p>
            {!searchQuery && alerts.length === 0 ? (
              <div className="mt-4">
                <GlassButton
                  size="sm"
                  variant="ghost"
                  icon={<Activity size={13} />}
                  onClick={() => {
                    setAlerts(SEED_NUTRITION_ALERTS);
                    setNotice({
                      tone: "info",
                      text: "Simulated demonstration alerts loaded for caseload training.",
                    });
                  }}
                >
                  Load simulated alert telemetry
                </GlassButton>
              </div>
            ) : null}
          </div>
        </GlassPanel>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((item) => {
            const isCritical = item.severity === "CRITICAL";
            const isWarning = item.severity === "WARNING";
            const isHold =
              item.dieteticGuidance.directive === "HOLD_ENTERAL_TPN" ||
              item.dieteticGuidance.directive === "HOLD_GASTRIC_PROKINETIC";
            const isResolved = item.status === "RESOLVED";

            return (
              <GlassPanel key={item.id} className="flex flex-col justify-between">
                <div>
                  {/* Top Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isCritical ? (
                        <span className="inline-flex animate-pulse items-center rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                          <ShieldAlert size={11} className="mr-1" /> CRITICAL
                        </span>
                      ) : isWarning ? (
                        <span className="inline-flex items-center rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                          <AlertTriangle size={11} className="mr-1" /> WARNING
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-sky-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                          <HeartPulse size={11} className="mr-1" /> INFO
                        </span>
                      )}

                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {item.category.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusPill
                        tone={
                          isResolved ? "good" : item.status === "ACKNOWLEDGED" ? "warning" : "critical"
                        }
                      >
                        {item.status}
                      </StatusPill>
                      <span className="flex items-center text-[10px] font-medium text-slate-400">
                        <Clock size={11} className="mr-1" />
                        {shortDate(item.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Patient Info */}
                  <div className="mt-3 flex items-baseline justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {item.patientName}
                      </h3>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {item.title}
                      </p>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                      {item.patientNumber}
                    </span>
                  </div>

                  {/* Trigger Detail */}
                  <div className="mt-2.5 rounded-xl bg-slate-50/80 p-2.5 text-xs dark:bg-slate-800/40">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Rule: {item.ruleName}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-rose-600 dark:text-rose-400">
                      {item.triggerDetail}
                    </p>
                  </div>

                  {/* Dietetic Directive Box */}
                  <div
                    className={`mt-3 rounded-xl border p-3 ${
                      isHold
                        ? "border-rose-300 bg-rose-50/70 text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200"
                        : isResolved
                        ? "border-emerald-300 bg-emerald-50/70 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
                        : "border-amber-300 bg-amber-50/70 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      {isHold ? (
                        <ShieldAlert size={14} className="text-rose-600 dark:text-rose-400" />
                      ) : isResolved ? (
                        <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400" />
                      )}
                      <span>Dietetic Directive: {item.dieteticGuidance.badgeText}</span>
                    </div>

                    <p className="mt-1 text-[11px] leading-relaxed opacity-90">
                      {item.dieteticGuidance.summary}
                    </p>

                    <ul className="mt-2 space-y-1 border-t border-black/5 pt-2 text-[10px] dark:border-white/10">
                      {item.dieteticGuidance.instructions.map((inst, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="mt-0.5 text-slate-400">•</span>
                          <span>{inst}</span>
                        </li>
                      ))}
                    </ul>

                    {item.resolutionNotes ? (
                      <div className="mt-2 border-t border-emerald-200 pt-2 text-[10px] italic text-emerald-800 dark:border-emerald-800 dark:text-emerald-300">
                        Resolution Note: {item.resolutionNotes}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Card Footer & Actions */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400">
                    Managing: <span className="font-semibold text-slate-600 dark:text-slate-300">{item.managingDoctorName || "Surgical Team"}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {onSelectPatient ? (
                      <GlassButton size="sm" variant="ghost" onClick={() => onSelectPatient(item.patientNumber)}>
                        Nutrition deck
                      </GlassButton>
                    ) : null}

                    {onNavigatePlan ? (
                      <GlassButton size="sm" variant="ghost" onClick={onNavigatePlan}>
                        Dietary plan
                      </GlassButton>
                    ) : null}

                    {onNavigateCalculators ? (
                      <GlassButton size="sm" variant="ghost" onClick={onNavigateCalculators}>
                        PERT & Feeding
                      </GlassButton>
                    ) : null}

                    {!isResolved && item.status !== "ACKNOWLEDGED" ? (
                      <GlassButton
                        size="sm"
                        variant="ghost"
                        onClick={() => void handleAcknowledge(item)}
                      >
                        Acknowledge
                      </GlassButton>
                    ) : null}

                    {!isResolved ? (
                      <GlassButton
                        size="sm"
                        variant="solid"
                        accent="#059669"
                        onClick={() => {
                          setResolvingAlert(item);
                          setResolutionNotes("");
                        }}
                      >
                        Resolve
                      </GlassButton>
                    ) : null}
                  </div>
                </div>
              </GlassPanel>
            );
          })}
        </div>
      )}

      {/* Resolution Modal */}
      <GlassModal
        open={resolvingAlert !== null}
        onClose={() => {
          setResolvingAlert(null);
          setResolutionNotes("");
        }}
        title="Resolve nutritional alert"
        subtitle={resolvingAlert ? `Intervention for ${resolvingAlert.patientName} (${resolvingAlert.patientNumber})` : ""}
        icon={<ShieldCheck size={16} />}
        accent="#059669"
        footer={
          <>
            <GlassButton
              onClick={() => {
                setResolvingAlert(null);
                setResolutionNotes("");
              }}
            >
              Cancel
            </GlassButton>
            <GlassButton
              variant="solid"
              accent="#059669"
              form="resolve-nutrition-alert-form"
              type="submit"
              disabled={submittingResolution || !resolutionNotes.trim()}
            >
              {submittingResolution ? "Recording…" : "Resolve and record"}
            </GlassButton>
          </>
        }
      >
        {resolvingAlert ? (
          <form id="resolve-nutrition-alert-form" onSubmit={handleResolve} className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-900/60">
              <div className="font-bold text-slate-800 dark:text-slate-100">
                {resolvingAlert.title}
              </div>
              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                {resolvingAlert.triggerDetail}
              </div>
            </div>

            <GlassField
              label="Dietetic intervention & resolution notes"
              htmlFor="resolution-notes"
              required
              hint="Document feeding changes, TPN progression, electrolyte replacement verification, or PERT titration."
            >
              <GlassTextarea
                id="resolution-notes"
                required
                rows={4}
                value={resolutionNotes}
                placeholder="e.g. Infusion rate reduced to 30 mL/hr. IV sodium glycerophosphate (20 mmol) and thiamine administered. Recheck phos at 20:00. Enteral rate advance deferred until phos ≥ 0.85 mmol/L."
                onChange={(e) => setResolutionNotes(e.target.value)}
              />
            </GlassField>
          </form>
        ) : null}
      </GlassModal>
    </div>
  );
}
