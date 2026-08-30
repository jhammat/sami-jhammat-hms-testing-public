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
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
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
  Stethoscope,
  Trash2,
  UserRound,
  Users,
  Utensils,
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
} from "./nutrition-clinical-data";

/* ================================================================== */
/* Constants                                                           */
/* ================================================================== */

const ACCENT = "#059669";
const ACCENT_BRIGHT = "#34d399";

const APPETITE_RAMP = ["#ef4444", "#fb923c", "#facc15", "#84cc16", "#10b981"];

type WorkspaceTab = "overview" | "caseload" | "assessment" | "plan" | "calculators" | "history";

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
  /* Calculator drafts — all unset                                   */
  /* -------------------------------------------------------------- */

  const [mealFatGrams, setMealFatGrams] = useState<number | null>(null);
  const [snackFatGrams, setSnackFatGrams] = useState<number | null>(null);
  const [capsuleStrength, setCapsuleStrength] = useState<number | null>(null);
  const [enteralRate, setEnteralRate] = useState<number | null>(null);
  const [enteralHours, setEnteralHours] = useState<number | null>(null);
  const [enteralFormulaId, setEnteralFormulaId] = useState<string | null>(null);

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

  const mealDose = calculatePertDose(mealFatGrams, capsuleStrength, "meal");
  const snackDose = calculatePertDose(snackFatGrams, capsuleStrength, "snack");
  const dailyCeiling = pertDailyCeiling(weightKg);

  const enteralFormula = ENTERAL_FORMULAS.find((formula) => formula.id === enteralFormulaId) ?? null;
  const enteral = calculateEnteral(
    enteralRate,
    enteralHours,
    enteralFormula?.kcalPerMl ?? null,
    enteralFormula?.proteinPerL ?? null,
    weightKg,
  );

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
      MEAL_TEMPLATES.filter((template) => {
        if (templateBand && template.band !== templateBand) return false;
        if (dietPhaseId && !template.phases.includes(dietPhaseId)) return false;
        return true;
      }),
    [dietPhaseId, templateBand],
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
              {
                href: "/doctor/careplans",
                label: "Surgical care plans",
                detail: "The managing surgeon's view of this recovery",
                icon: Stethoscope,
              },
              {
                href: "/operations/physiotherapy",
                label: "Physiotherapy workspace",
                detail: "The mobility side of the same recovery",
                icon: Activity,
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
                  min={20}
                  max={250}
                  accent={ACCENT}
                  onChange={setWeightKg}
                />
                <Stepper
                  label="Height"
                  unit="cm"
                  value={heightCm}
                  min={100}
                  max={230}
                  accent="#0891b2"
                  onChange={setHeightCm}
                />
                <Stepper
                  label="Change since surgery"
                  unit="kg (negative for loss)"
                  value={weightChangeKg}
                  min={-40}
                  max={40}
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

                <div className="flex flex-wrap gap-1.5">
                  {COMMON_AVOID_LISTS.map((list) => (
                    <GlassChip
                      key={list.id}
                      hue={list.band === "HPB" ? "#a78bfa" : "#94a3b8"}
                      onClick={() => setFoodsToAvoid(list.text)}
                    >
                      {list.label}
                    </GlassChip>
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
            <div className="flex flex-wrap gap-1.5">
              <GlassChip active={templateBand === null} onClick={() => setTemplateBand(null)}>
                Both services
              </GlassChip>
              {(["HPB", "GENERAL"] as ClinicalBand[]).map((band) => (
                <GlassChip
                  key={band}
                  active={templateBand === band}
                  hue={band === "HPB" ? "#a78bfa" : "#94a3b8"}
                  count={MEAL_TEMPLATES.filter((template) => template.band === band).length}
                  onClick={() => setTemplateBand(templateBand === band ? null : band)}
                >
                  {BAND_LABELS[band]}
                </GlassChip>
              ))}
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
                  <li key={template.id}>
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
                      className="wfg-tile h-full w-full p-3.5 text-left"
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
                  </li>
                ))}
              </ul>
            )}
          </div>
        </GlassModal>
      </div>
    );
  }

  /* -------------------------------------------------------------- */
  /* Tab: calculators                                                */
  /* -------------------------------------------------------------- */

  function renderCalculators() {
    return (
      <div className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-2">
          <GlassPanel
            title="Pancreatic enzyme replacement"
            subtitle="Lipase units for one intake, with the meal and snack floors applied"
            icon={<Pill size={16} />}
            accent="#a78bfa"
          >
            <div className="space-y-5">
              <SegmentedControl
                label="Capsule strength"
                columns={4}
                value={capsuleStrength === null ? null : String(capsuleStrength)}
                onChange={(next) => setCapsuleStrength(Number(next))}
                options={ENZYME_STRENGTHS.map((strength) => ({
                  value: String(strength),
                  label: `${(strength / 1000).toLocaleString()}k`,
                  detail: `${strength.toLocaleString()} IU`,
                  hue: "#a78bfa",
                }))}
              />

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

              {mealDose ? (
                <GlassWell className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Meal dose
                  </p>
                  <p className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white">
                    {mealDose.units.toLocaleString()} IU lipase
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    {mealDose.capsules} × {capsuleStrength?.toLocaleString()} IU capsule
                    {mealDose.capsules === 1 ? "" : "s"} with the first bite.
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{mealDose.note}</p>
                </GlassWell>
              ) : null}

              {snackDose ? (
                <GlassWell className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Snack dose
                  </p>
                  <p className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white">
                    {snackDose.units.toLocaleString()} IU lipase
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    {snackDose.capsules} × {capsuleStrength?.toLocaleString()} IU capsule
                    {snackDose.capsules === 1 ? "" : "s"} with the snack.
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

              {dailyCeiling ? (
                <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3">
                  <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-200">
                    Daily safety ceiling: {dailyCeiling.toLocaleString()} IU lipase
                  </p>
                  <p className="mt-1 text-[10px] leading-4 text-amber-800/85 dark:text-amber-200/85">
                    Based on the weight recorded on the assessment tab, at 10,000 units per kilogram
                    per day. Doses above this are associated with fibrosing colonopathy.
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Record a weight on the assessment tab to see the daily safety ceiling for this
                  patient.
                </p>
              )}
            </div>
          </GlassPanel>

          <GlassPanel
            title="Enteral tube feeding"
            subtitle="Rate and formula in, daily delivery out"
            icon={<Droplets size={16} />}
            accent="#38bdf8"
          >
            <div className="space-y-5">
              <GlassField label="Formula" htmlFor="enteral-formula">
                <GlassSelect
                  id="enteral-formula"
                  value={enteralFormulaId ?? ""}
                  onChange={(event) =>
                    setEnteralFormulaId(event.target.value === "" ? null : event.target.value)
                  }
                >
                  <option value="">Choose a formula</option>
                  {ENTERAL_FORMULAS.map((formula) => (
                    <option key={formula.id} value={formula.id}>
                      {formula.label}
                    </option>
                  ))}
                </GlassSelect>
              </GlassField>

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
                      That is {enteral.kcalPerKg} kcal/kg and {enteral.proteinPerKg} g protein/kg
                      against the weight recorded on the assessment tab.
                    </p>
                  ) : (
                    <p className="border-t border-slate-900/8 pt-2 text-[11px] text-slate-500 dark:border-white/8 dark:text-slate-400">
                      Record a weight on the assessment tab to see this per kilogram.
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
                  Where intake has been negligible for five days or more, start at no more than
                  10 kcal/kg/day, give thiamine before feeding, and check potassium, magnesium and
                  phosphate daily for three days.
                </p>
              </div>
            </div>
          </GlassPanel>
        </div>
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
        eyebrow="Allied health · Clinical nutrition and dietetics"
        title="Dietetics workspace"
        description="General dietetics and the HPB surgical service in one place — screen, set targets, dose enzymes and publish a plan, always against a patient you have chosen."
        chips={[
          { label: "referrals in your caseload", value: String(referrals.length), solid: true },
          { label: "waiting to be accepted", value: String(pendingCount) },
          { label: "meal templates", value: String(MEAL_TEMPLATES.length) },
          { label: "diet phases", value: String(DIET_PHASES.length) },
        ]}
        actions={
          <>
            <GlassButton
              variant="onAurora"
              icon={<RefreshCw size={13} className={isLoadingCaseload ? "animate-spin" : ""} />}
              onClick={refreshCaseload}
              disabled={isLoadingCaseload}
            >
              Refresh caseload
            </GlassButton>

            <Link
              href="/operations/nutrition/profile"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-[rgb(255_255_255_/_0.15)] px-4 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-[rgb(255_255_255_/_0.25)]"
            >
              <Compass size={14} /> Preferences
            </Link>
          </>
        }
        aside={
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
            {[
              { label: "HPB templates", value: MEAL_TEMPLATES.filter((t) => t.band === "HPB").length, icon: HeartPulse },
              { label: "General templates", value: MEAL_TEMPLATES.filter((t) => t.band === "GENERAL").length, icon: Apple },
              { label: "Counselling sets", value: COUNSELLING_SETS.length, icon: ClipboardList },
              { label: "Active plans", value: roster.length, icon: Users },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/15 bg-[rgb(255_255_255_/_0.10)] px-3.5 py-3 backdrop-blur"
              >
                <item.icon aria-hidden size={14} className="text-emerald-200" />
                <p className="mt-1.5 text-lg font-semibold tabular-nums text-white">{item.value}</p>
                <p className="text-[10px] text-indigo-100/75">{item.label}</p>
              </div>
            ))}
          </div>
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
