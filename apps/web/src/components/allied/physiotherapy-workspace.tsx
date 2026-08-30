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
  ArrowRight,
  BookOpen,
  CalendarClock,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Compass,
  Dumbbell,
  Footprints,
  Gauge,
  HeartPulse,
  Inbox,
  ListPlus,
  Plus,
  RefreshCw,
  Route,
  Search,
  Send,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Timer,
  Trash2,
  UserRound,
  Users,
  Wind,
} from "lucide-react";

import type {
  CarePlanRosterItem,
  ClinicalReferral,
  ExerciseCategory,
  IndependenceLevel,
  TherapyAssessmentRecord,
  TherapyAttendanceStatus,
  TherapySessionRecord,
} from "@wonflow/contracts";

import { DonutChart, TrendLine, type DonutSlice } from "@/components/charts";

import {
  AuroraHero,
  BodyMap,
  Dial,
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
  MilestoneRail,
  Notice,
  Pill,
  ProgressRing,
  SegmentedControl,
  Stepper,
  SwitchRow,
  type PillTone,
} from "./allied-glass";

import {
  BAND_LABELS,
  BERG_ITEMS,
  BODY_REGION_LABELS,
  BORG_RPE,
  CATEGORY_BLURB,
  CATEGORY_HUE,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  EXERCISE_TEMPLATES,
  INDEPENDENCE_LADDER,
  MRC_DYSPNOEA,
  PRECAUTION_SETS,
  RECOVERY_PATHWAYS,
  ROM_JOINTS,
  WEIGHT_BEARING_OPTIONS,
  bergRisk,
  precautionByValue,
  templateById,
  tugRisk,
  weightBearingByValue,
  type BodyRegion,
  type ClinicalBand,
  type ExerciseTemplate,
} from "./physio-clinical-data";

/* ================================================================== */
/* Constants                                                           */
/* ================================================================== */

const ACCENT = "#0891b2";
const ACCENT_BRIGHT = "#22d3ee";

const PAIN_RAMP = ["#10b981", "#84cc16", "#facc15", "#fb923c", "#ef4444"];
const MOBILITY_RAMP = ["#ef4444", "#fb923c", "#facc15", "#84cc16", "#10b981"];

type WorkspaceTab =
  | "overview"
  | "caseload"
  | "studio"
  | "assessment"
  | "pathways"
  | "orders";

const ATTENDANCE_OPTIONS: {
  value: TherapyAttendanceStatus;
  label: string;
  hue: string;
}[] = [
  { value: "COMPLETED", label: "Completed", hue: "#10b981" },
  { value: "PATIENT_UNWELL", label: "Patient unwell", hue: "#f59e0b" },
  { value: "REFUSED", label: "Refused", hue: "#f97316" },
  { value: "CANCELLED", label: "Cancelled", hue: "#ef4444" },
];

const ATTENDANCE_LABELS: Record<TherapyAttendanceStatus, string> = {
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  PATIENT_UNWELL: "Patient unwell",
  REFUSED: "Refused",
};

/** The page these sections share. The sidebar links here with `?view=`. */
const PATHNAME = "/operations/physiotherapy";

/** Query values the sidebar links with, mapped onto the section they open. */
const VIEW_PARAM_TABS: Record<string, WorkspaceTab> = {
  overview: "overview",
  deck: "overview",
  inbox: "caseload",
  caseload: "caseload",
  exercises: "studio",
  studio: "studio",
  goniometry: "assessment",
  assessment: "assessment",
  eras: "pathways",
  pathways: "pathways",
  orders: "orders",
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
/* Types local to the workspace                                        */
/* ================================================================== */

interface LibraryExercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  instruction: string;
  description?: string | null;
  defaultRepetitions?: number | null;
  defaultSets?: number | null;
  defaultDurationSeconds?: number | null;
  precautions?: string | null;
}

interface AssignedTask {
  id: string;
  title: string;
  instructions: string;
  status: string;
  scheduledFor: string;
  resultData?: {
    category?: string;
    repetitions?: number | null;
    sets?: number | null;
  } | null;
}

/** What the therapist is about to prescribe. Nothing is set until they set it. */
interface DoseDraft {
  repetitions: number | null;
  sets: number | null;
  holdSeconds: number | null;
  effort: number | null;
  days: number;
  startOffsetDays: number;
}

const EMPTY_DOSE: DoseDraft = {
  repetitions: null,
  sets: null,
  holdSeconds: null,
  effort: null,
  days: 1,
  startOffsetDays: 0,
};

/* ================================================================== */
/* Workspace                                                           */
/* ================================================================== */

export function PhysiotherapyWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewParam = searchParams?.get("view");

  /* -------------------------------------------------------------- */
  /* Navigation                                                      */
  /* -------------------------------------------------------------- */

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
  const [library, setLibrary] = useState<LibraryExercise[]>([]);
  const [assessments, setAssessments] = useState<TherapyAssessmentRecord[]>([]);
  const [sessions, setSessions] = useState<TherapySessionRecord[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>([]);

  const [isLoadingCaseload, setIsLoadingCaseload] = useState(true);
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{
    tone: "good" | "critical" | "info";
    title: string;
    detail?: string;
  } | null>(null);

  /**
   * The chosen patient. Deliberately null on first render: this workspace
   * never picks a patient on the therapist's behalf, because a prescription
   * written against a silently pre-selected patient is a clinical incident
   * waiting to happen.
   */
  const [selectedReferralId, setSelectedReferralId] = useState<string | null>(null);

  /* -------------------------------------------------------------- */
  /* Caseload filters                                                */
  /* -------------------------------------------------------------- */

  const [caseloadSearch, setCaseloadSearch] = useState("");
  const [caseloadStatus, setCaseloadStatus] = useState<string>("ALL");

  /* -------------------------------------------------------------- */
  /* Studio state                                                    */
  /* -------------------------------------------------------------- */

  const [librarySearch, setLibrarySearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ExerciseCategory | null>(null);
  const [bandFilter, setBandFilter] = useState<ClinicalBand | null>(null);
  const [regionFilter, setRegionFilter] = useState<BodyRegion | null>(null);
  const [showTemplates, setShowTemplates] = useState(true);

  const [pickedTemplateId, setPickedTemplateId] = useState<string | null>(null);
  const [pickedLibraryId, setPickedLibraryId] = useState<string | null>(null);
  const [dose, setDose] = useState<DoseDraft>(EMPTY_DOSE);

  const [showAuthorModal, setShowAuthorModal] = useState(false);
  const [authorDraft, setAuthorDraft] = useState({
    name: "",
    category: null as ExerciseCategory | null,
    instruction: "",
    precautions: "",
    repetitions: null as number | null,
    sets: null as number | null,
    holdSeconds: null as number | null,
  });

  /* -------------------------------------------------------------- */
  /* Assessment state — every field starts unset                     */
  /* -------------------------------------------------------------- */

  const [mobilityScore, setMobilityScore] = useState<number | null>(null);
  const [painScore, setPainScore] = useState<number | null>(null);
  const [independence, setIndependence] = useState<IndependenceLevel | null>(null);
  const [respiratoryFunction, setRespiratoryFunction] = useState("");
  const [surgicalRestrictions, setSurgicalRestrictions] = useState("");
  const [goals, setGoals] = useState("");

  const [attendance, setAttendance] = useState<TherapyAttendanceStatus | null>(null);
  const [painBefore, setPainBefore] = useState<number | null>(null);
  const [painAfter, setPainAfter] = useState<number | null>(null);
  const [spirometryMl, setSpirometryMl] = useState<number | null>(null);
  const [stepsAchieved, setStepsAchieved] = useState<number | null>(null);
  const [progressNotes, setProgressNotes] = useState("");

  const [bergScores, setBergScores] = useState<Record<string, number>>({});
  const [tugSeconds, setTugSeconds] = useState<number | null>(null);
  const [walkDistance, setWalkDistance] = useState<number | null>(null);
  const [mrcGrade, setMrcGrade] = useState<number | null>(null);
  const [borgScore, setBorgScore] = useState<number | null>(null);
  const [romValues, setRomValues] = useState<Record<string, number>>({});

  /* -------------------------------------------------------------- */
  /* Pathways and orders                                             */
  /* -------------------------------------------------------------- */

  const [pathwayBand, setPathwayBand] = useState<ClinicalBand | null>(null);
  const [openPathwayId, setOpenPathwayId] = useState<string | null>(null);
  const [pathwayMilestoneIndex, setPathwayMilestoneIndex] = useState<number | null>(null);

  const [weightBearing, setWeightBearing] = useState<string | null>(null);
  const [precautionValues, setPrecautionValues] = useState<string[]>([]);
  const [orderNotes, setOrderNotes] = useState("");
  const [dischargeCleared, setDischargeCleared] = useState(false);

  const [showNutritionModal, setShowNutritionModal] = useState(false);
  const [nutritionDraft, setNutritionDraft] = useState({
    reason: "",
    goal: "",
    priority: "ROUTINE",
  });

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

  const bergTotal = useMemo(
    () => Object.values(bergScores).reduce((sum, score) => sum + score, 0),
    [bergScores],
  );
  const bergComplete = Object.keys(bergScores).length === BERG_ITEMS.length;

  /* -------------------------------------------------------------- */
  /* Loaders                                                         */
  /* -------------------------------------------------------------- */

  /**
   * `isLoadingCaseload` starts true and is only ever raised again by an
   * explicit refresh, so the first load can run from an effect without
   * touching state before its first await.
   */
  const loadCaseload = useCallback(async () => {
    try {
      const [referralResponse, rosterResponse] = await Promise.all([
        fetch("/api/v1/allied/referrals?specialty=PHYSIOTHERAPY&pageSize=100"),
        fetch("/api/v1/clinical/careplans/roster"),
      ]);

      if (referralResponse.ok) {
        const data = await referralResponse.json();
        setReferrals(data.referrals ?? []);
      } else {
        setFeedback({ tone: "critical", title: "Could not load the physiotherapy caseload." });
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

  const loadLibrary = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/allied/physiotherapy/exercises");
      if (!response.ok) return;
      const data = await response.json();
      setLibrary(data.exercises ?? []);
    } catch {
      // The template gallery still works without the tenant library.
    }
  }, []);

  const refreshCaseload = useCallback(() => {
    setIsLoadingCaseload(true);
    void loadCaseload();
  }, [loadCaseload]);

  const loadPatientRecord = useCallback(async (patientId: string) => {
    try {
      const [assessmentResponse, sessionResponse, taskResponse] = await Promise.all([
        fetch(`/api/v1/allied/physiotherapy/assessments?patientId=${patientId}`),
        fetch(`/api/v1/allied/physiotherapy/sessions?patientId=${patientId}`),
        fetch(`/api/v1/allied/physiotherapy/assign-exercise?patientId=${patientId}`),
      ]);

      setAssessments(assessmentResponse.ok ? ((await assessmentResponse.json()).assessments ?? []) : []);
      setSessions(sessionResponse.ok ? ((await sessionResponse.json()).sessions ?? []) : []);
      setAssignedTasks(taskResponse.ok ? ((await taskResponse.json()).tasks ?? []) : []);
    } catch {
      setFeedback({ tone: "critical", title: "Could not load this patient's therapy record." });
    } finally {
      setIsLoadingPatient(false);
    }
  }, []);

  /*
   * `react-hooks/set-state-in-effect` fires on any effect that reaches a
   * setState, including one that only runs after an await. Fetching the
   * caseload on mount is exactly that case: nothing is set before the first
   * await, so there is no cascading render to avoid. The loaders above are
   * written so their only synchronous work is the fetch itself.
   */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see note above
    void loadCaseload();
    void loadLibrary();
  }, [loadCaseload, loadLibrary]);

  useEffect(() => {
    // Clearing on deselect is handled by `choosePatient`, which is the only
    // way a patient is chosen or cleared.
    if (!selectedReferral?.patientId) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- see note above
    void loadPatientRecord(selectedReferral.patientId);
  }, [loadPatientRecord, selectedReferral?.patientId]);

  /**
   * Switching patient clears every draft. Carrying a half-written assessment
   * or a set dose across a patient change is exactly the error this workspace
   * is built to prevent.
   */
  function choosePatient(referralId: string | null) {
    setSelectedReferralId(referralId);
    setIsLoadingPatient(referralId !== null);
    setAssessments([]);
    setSessions([]);
    setAssignedTasks([]);
    setMobilityScore(null);
    setPainScore(null);
    setIndependence(null);
    setRespiratoryFunction("");
    setSurgicalRestrictions("");
    setGoals("");
    setAttendance(null);
    setPainBefore(null);
    setPainAfter(null);
    setSpirometryMl(null);
    setStepsAchieved(null);
    setProgressNotes("");
    setBergScores({});
    setTugSeconds(null);
    setWalkDistance(null);
    setMrcGrade(null);
    setBorgScore(null);
    setRomValues({});
    setWeightBearing(null);
    setPrecautionValues([]);
    setOrderNotes("");
    setDischargeCleared(false);
    setHandoffNote("");
    setDose(EMPTY_DOSE);
    setPickedTemplateId(null);
    setPickedLibraryId(null);
  }

  /* -------------------------------------------------------------- */
  /* Referral lifecycle                                              */
  /* -------------------------------------------------------------- */

  async function runReferralAction(
    referralId: string,
    action: "accept" | "start" | "complete",
    successTitle: string,
  ) {
    setBusyAction(`${action}-${referralId}`);
    try {
      const response = await fetch(`/api/v1/clinical/referrals/${referralId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
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
  /* Prescribing                                                     */
  /* -------------------------------------------------------------- */

  const pickedExercise = useMemo((): {
    name: string;
    category: ExerciseCategory;
    instruction: string;
    precautions?: string | null;
    source: "template" | "library";
    band?: ClinicalBand;
    suggested: { repetitions: number; sets: number; holdSeconds: number } | null;
  } | null => {
    if (pickedTemplateId) {
      const template = templateById(pickedTemplateId);
      if (!template) return null;
      return {
        name: template.name,
        category: template.category,
        instruction: template.instruction,
        precautions: template.precautions,
        source: "template",
        band: template.band,
        suggested: {
          repetitions: template.suggestedRepetitions,
          sets: template.suggestedSets,
          holdSeconds: template.suggestedHoldSeconds,
        },
      };
    }

    if (pickedLibraryId) {
      const exercise = library.find((item) => item.id === pickedLibraryId);
      if (!exercise) return null;
      return {
        name: exercise.name,
        category: exercise.category,
        instruction: exercise.instruction,
        precautions: exercise.precautions,
        source: "library",
        suggested:
          exercise.defaultRepetitions || exercise.defaultSets
            ? {
                repetitions: exercise.defaultRepetitions ?? 0,
                sets: exercise.defaultSets ?? 0,
                holdSeconds: exercise.defaultDurationSeconds ?? 0,
              }
            : null,
      };
    }

    return null;
  }, [library, pickedLibraryId, pickedTemplateId]);

  const doseReady =
    pickedExercise !== null &&
    dose.repetitions !== null &&
    dose.sets !== null &&
    selectedReferral !== null;

  async function prescribe() {
    if (!selectedReferral || !pickedExercise || dose.repetitions === null || dose.sets === null) {
      return;
    }

    setBusyAction("prescribe");

    const instructionParts = [pickedExercise.instruction];
    if (dose.holdSeconds) instructionParts.push(`Hold each repetition for ${dose.holdSeconds} seconds.`);
    if (dose.effort) instructionParts.push(`Work at a perceived exertion of about ${dose.effort} on the Borg scale.`);
    if (pickedExercise.precautions) instructionParts.push(`Precautions: ${pickedExercise.precautions}`);

    const start = new Date();
    start.setHours(9, 0, 0, 0);
    start.setDate(start.getDate() + dose.startOffsetDays);

    try {
      const results = await Promise.all(
        Array.from({ length: Math.max(1, dose.days) }).map((_, dayIndex) => {
          const scheduledFor = new Date(start);
          scheduledFor.setDate(scheduledFor.getDate() + dayIndex);

          return fetch("/api/v1/allied/physiotherapy/assign-exercise", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              patientId: selectedReferral.patientId,
              referralId: selectedReferral.id,
              exerciseName: pickedExercise.name,
              category: pickedExercise.category,
              instructions: instructionParts.join(" "),
              repetitions: dose.repetitions,
              sets: dose.sets,
              scheduledFor: scheduledFor.toISOString(),
            }),
          });
        }),
      );

      const failed = results.find((response) => !response.ok);

      if (failed) {
        const error = await failed.json().catch(() => ({}));
        setFeedback({
          tone: "critical",
          title: error?.error?.message ?? "Could not push this exercise to the patient.",
          detail:
            "An exercise lands on the patient's care plan, so the managing surgeon has to have started one first.",
        });
      } else {
        setFeedback({
          tone: "good",
          title: `${pickedExercise.name} prescribed to ${patientName}.`,
          detail: `${dose.repetitions} repetitions × ${dose.sets} sets, ${dose.days} ${
            dose.days === 1 ? "day" : "days"
          }. It is on the patient's app now.`,
        });
        await loadPatientRecord(selectedReferral.patientId);
      }
    } catch {
      setFeedback({ tone: "critical", title: "Could not push this exercise to the patient." });
    } finally {
      setBusyAction(null);
    }
  }

  async function removeTask(taskId: string) {
    setBusyAction(`task-${taskId}`);
    try {
      const response = await fetch(
        `/api/v1/allied/physiotherapy/assign-exercise?taskId=${taskId}`,
        { method: "DELETE" },
      );

      if (response.ok) {
        setAssignedTasks((previous) => previous.filter((task) => task.id !== taskId));
        setFeedback({ tone: "good", title: "Exercise withdrawn from the patient's programme." });
      } else {
        setFeedback({ tone: "critical", title: "Could not withdraw that exercise." });
      }
    } catch {
      setFeedback({ tone: "critical", title: "Could not withdraw that exercise." });
    } finally {
      setBusyAction(null);
    }
  }

  async function saveAuthoredExercise(event: FormEvent) {
    event.preventDefault();

    if (!authorDraft.name.trim() || !authorDraft.category || !authorDraft.instruction.trim()) {
      setFeedback({
        tone: "critical",
        title: "Name, category and instructions are all needed before an exercise can be saved.",
      });
      return;
    }

    setBusyAction("author");
    try {
      const response = await fetch("/api/v1/allied/physiotherapy/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: authorDraft.name.trim(),
          category: authorDraft.category,
          instruction: authorDraft.instruction.trim(),
          precautions: authorDraft.precautions.trim() || undefined,
          defaultRepetitions: authorDraft.repetitions ?? undefined,
          defaultSets: authorDraft.sets ?? undefined,
          defaultDurationSeconds: authorDraft.holdSeconds ?? undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const created: LibraryExercise = {
          id: data.exercise.id,
          name: data.exercise.name,
          category: data.exercise.category,
          instruction: data.exercise.instruction,
          precautions: data.exercise.precautions,
          defaultRepetitions: data.exercise.defaultRepetitions,
          defaultSets: data.exercise.defaultSets,
          defaultDurationSeconds: data.exercise.defaultDurationSeconds,
        };

        setLibrary((previous) => [created, ...previous]);
        setShowAuthorModal(false);
        setAuthorDraft({
          name: "",
          category: null,
          instruction: "",
          precautions: "",
          repetitions: null,
          sets: null,
          holdSeconds: null,
        });
        setFeedback({
          tone: "good",
          title: `“${created.name}” saved to your hospital's exercise library.`,
          detail: "Select it in the studio when you are ready to prescribe it.",
        });
      } else {
        const error = await response.json().catch(() => ({}));
        setFeedback({
          tone: "critical",
          title: error?.error?.message ?? "Could not save the exercise.",
        });
      }
    } catch {
      setFeedback({ tone: "critical", title: "Could not save the exercise." });
    } finally {
      setBusyAction(null);
    }
  }

  async function deleteLibraryExercise(id: string) {
    setBusyAction(`library-${id}`);
    try {
      const response = await fetch(`/api/v1/allied/physiotherapy/exercises?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setLibrary((previous) => previous.filter((item) => item.id !== id));
        if (pickedLibraryId === id) setPickedLibraryId(null);
        setFeedback({ tone: "good", title: "Exercise retired from the library." });
      }
    } finally {
      setBusyAction(null);
    }
  }

  /* -------------------------------------------------------------- */
  /* Assessment and session                                          */
  /* -------------------------------------------------------------- */

  async function saveAssessment(event: FormEvent) {
    event.preventDefault();
    if (!selectedReferral) return;

    if (mobilityScore === null || painScore === null || !independence) {
      setFeedback({
        tone: "critical",
        title: "Set mobility, pain and independence before saving the evaluation.",
      });
      return;
    }

    setBusyAction("assessment");
    try {
      const response = await fetch("/api/v1/allied/physiotherapy/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedReferral.patientId,
          referralId: selectedReferral.id,
          mobilityScore,
          painScore,
          independenceLevel: independence,
          respiratoryFunction: respiratoryFunction.trim() || undefined,
          surgicalRestrictions: surgicalRestrictions.trim() || undefined,
          goals: goals.trim() || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAssessments((previous) => [data.assessment, ...previous]);
        setFeedback({ tone: "good", title: "Evaluation recorded." });
      } else {
        const error = await response.json().catch(() => ({}));
        setFeedback({
          tone: "critical",
          title: error?.error?.message ?? "Could not save the evaluation.",
        });
      }
    } catch {
      setFeedback({ tone: "critical", title: "Could not save the evaluation." });
    } finally {
      setBusyAction(null);
    }
  }

  async function saveSession(event: FormEvent) {
    event.preventDefault();
    if (!selectedReferral) return;

    if (!attendance) {
      setFeedback({ tone: "critical", title: "Record whether the session went ahead." });
      return;
    }

    setBusyAction("session");
    try {
      const response = await fetch("/api/v1/allied/physiotherapy/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedReferral.patientId,
          referralId: selectedReferral.id,
          attendanceStatus: attendance,
          painBefore: painBefore ?? undefined,
          painAfter: painAfter ?? undefined,
          spirometryAchievedMl: spirometryMl ?? undefined,
          stepsAchieved: stepsAchieved ?? undefined,
          progressNotes: progressNotes.trim() || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSessions((previous) => [data.session, ...previous]);
        setFeedback({ tone: "good", title: "Bedside session recorded." });
      } else {
        const error = await response.json().catch(() => ({}));
        setFeedback({
          tone: "critical",
          title: error?.error?.message ?? "Could not record the session.",
        });
      }
    } catch {
      setFeedback({ tone: "critical", title: "Could not record the session." });
    } finally {
      setBusyAction(null);
    }
  }

  /* -------------------------------------------------------------- */
  /* Cross-portal actions                                            */
  /* -------------------------------------------------------------- */

  async function publishOrders() {
    if (!selectedReferral) return;

    if (!weightBearing && precautionValues.length === 0 && !orderNotes.trim() && !dischargeCleared) {
      setFeedback({
        tone: "critical",
        title: "There is nothing to publish yet — set a weight-bearing status or a precaution first.",
      });
      return;
    }

    setBusyAction("orders");
    try {
      const response = await fetch("/api/v1/allied/physiotherapy/precautions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedReferral.patientId,
          referralId: selectedReferral.id,
          weightBearing: weightBearing ?? undefined,
          precautions: precautionValues,
          notes: orderNotes.trim() || undefined,
          dischargeMobilityCleared: dischargeCleared,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setReferrals((previous) =>
          previous.map((referral) =>
            referral.id === selectedReferral.id
              ? { ...referral, precautions: data.precautions ?? referral.precautions }
              : referral,
          ),
        );
        setFeedback({
          tone: "good",
          title: "Precaution orders published to the surgical team.",
          detail: data.carePlanNoteAdded
            ? "They are on the referral and in the patient's care plan progress notes."
            : "They are on the referral. This patient has no active care plan, so no progress note was written.",
        });
      } else {
        const error = await response.json().catch(() => ({}));
        setFeedback({
          tone: "critical",
          title: error?.error?.message ?? "Could not publish the orders.",
        });
      }
    } catch {
      setFeedback({ tone: "critical", title: "Could not publish the orders." });
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
        body: JSON.stringify({ note: `Physiotherapy: ${handoffNote.trim()}` }),
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

  /**
   * Asks dietetics to look at this patient.
   *
   * This writes a care plan progress note rather than raising a
   * `ClinicalReferral`, because a referral row requires a referring DOCTOR:
   * `ClinicalReferral.referringDoctorId` is a non-nullable foreign key to
   * `DoctorProfile`, and a physiotherapist has a StaffProfile instead. A
   * progress note reaches the same two people — the managing surgeon, who can
   * then raise the formal referral, and any dietitian already on the plan —
   * without pretending a therapist is a doctor in the record.
   */
  async function askDietetics(event: FormEvent) {
    event.preventDefault();
    if (!selectedReferral || !rosterEntry || !nutritionDraft.reason.trim()) return;

    setBusyAction("nutrition");

    const independence = latestAssessment
      ? (INDEPENDENCE_LADDER.find((step) => step.value === latestAssessment.independenceLevel)
          ?.label ?? "not recorded")
      : "not yet assessed";

    const note = [
      `Physiotherapy asks for a dietetics review (${nutritionDraft.priority.toLowerCase()}).`,
      nutritionDraft.reason.trim(),
      nutritionDraft.goal.trim() ? `Goal: ${nutritionDraft.goal.trim()}` : "",
      `Current functional independence: ${independence}.`,
      "A formal nutrition referral needs to be raised by the managing doctor.",
    ]
      .filter(Boolean)
      .join(" ");

    try {
      const response = await fetch(`/api/v1/clinical/careplans/${rosterEntry.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });

      if (response.ok) {
        setShowNutritionModal(false);
        setNutritionDraft({ reason: "", goal: "", priority: "ROUTINE" });
        setFeedback({
          tone: "good",
          title: "Dietetics review requested on the care plan.",
          detail: `${rosterEntry.managingDoctorName} and any dietitian on this plan see it now.`,
        });
      } else {
        const error = await response.json().catch(() => ({}));
        setFeedback({
          tone: "critical",
          title: error?.error?.message ?? "Could not add the request to the care plan.",
        });
      }
    } catch {
      setFeedback({ tone: "critical", title: "Could not add the request to the care plan." });
    } finally {
      setBusyAction(null);
    }
  }

  /* -------------------------------------------------------------- */
  /* Filtering                                                       */
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

  const filteredTemplates = useMemo(() => {
    const query = librarySearch.trim().toLowerCase();

    return EXERCISE_TEMPLATES.filter((template) => {
      if (categoryFilter && template.category !== categoryFilter) return false;
      if (bandFilter && template.band !== bandFilter) return false;
      if (regionFilter && template.region !== regionFilter) return false;
      if (!query) return true;

      return (
        template.name.toLowerCase().includes(query) ||
        template.instruction.toLowerCase().includes(query) ||
        template.tags.some((tag) => tag.includes(query))
      );
    });
  }, [bandFilter, categoryFilter, librarySearch, regionFilter]);

  const filteredLibrary = useMemo(() => {
    const query = librarySearch.trim().toLowerCase();

    return library.filter((exercise) => {
      if (categoryFilter && exercise.category !== categoryFilter) return false;
      if (regionFilter) return false; // Authored exercises carry no region tag.
      if (!query) return true;

      return (
        exercise.name.toLowerCase().includes(query) ||
        exercise.instruction.toLowerCase().includes(query)
      );
    });
  }, [categoryFilter, library, librarySearch, regionFilter]);

  const regionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const template of EXERCISE_TEMPLATES) {
      counts[template.region] = (counts[template.region] ?? 0) + 1;
    }
    return counts;
  }, []);

  const visiblePathways = useMemo(
    () => RECOVERY_PATHWAYS.filter((pathway) => !pathwayBand || pathway.band === pathwayBand),
    [pathwayBand],
  );

  /* -------------------------------------------------------------- */
  /* Chart data                                                      */
  /* -------------------------------------------------------------- */

  const trendSeries = useMemo(() => {
    const chronological = [...assessments].sort(
      (a, b) => new Date(a.assessedAt).getTime() - new Date(b.assessedAt).getTime(),
    );

    if (chronological.length === 0) return [];

    return [
      {
        id: "mobility",
        label: "Mobility",
        color: "var(--viz-3)",
        points: chronological.map((assessment) => ({
          timestamp: assessment.assessedAt,
          value: assessment.mobilityScore ?? null,
          label: shortDate(assessment.assessedAt),
        })),
      },
      {
        id: "pain",
        label: "Pain",
        color: "var(--viz-2)",
        points: chronological.map((assessment) => ({
          timestamp: assessment.assessedAt,
          value: assessment.painScore ?? null,
          label: shortDate(assessment.assessedAt),
        })),
      },
    ];
  }, [assessments]);

  const attendanceSlices = useMemo((): DonutSlice[] => {
    const tally: Record<string, number> = {};
    for (const session of sessions) {
      tally[session.attendanceStatus] = (tally[session.attendanceStatus] ?? 0) + 1;
    }

    const hues: Record<string, string> = {
      COMPLETED: "var(--viz-good)",
      PATIENT_UNWELL: "var(--viz-warning)",
      REFUSED: "var(--viz-serious)",
      CANCELLED: "var(--viz-critical)",
    };

    return Object.entries(tally).map(([status, count]) => ({
      id: status,
      label: ATTENDANCE_LABELS[status as TherapyAttendanceStatus] ?? status,
      value: count,
      color: hues[status] ?? "var(--viz-mute-mark)",
    }));
  }, [sessions]);

  const distanceSeries = useMemo(() => {
    const chronological = [...sessions]
      .filter((session) => typeof session.stepsAchieved === "number")
      .sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime());

    if (chronological.length === 0) return [];

    return [
      {
        id: "steps",
        label: "Steps achieved",
        color: "var(--viz-1)",
        points: chronological.map((session) => ({
          timestamp: session.sessionDate,
          value: session.stepsAchieved ?? null,
          label: shortDate(session.sessionDate),
        })),
      },
    ];
  }, [sessions]);

  /* -------------------------------------------------------------- */
  /* Shared fragments                                                */
  /* -------------------------------------------------------------- */

  function needPatient(what: string): ReactNode {
    return (
      <GlassPanel>
        <EmptyPrompt
          icon={<UserRound size={22} />}
          title="Choose a patient first"
          description={`${what} is written against one named patient, so nothing is pre-selected here. Pick someone from the caseload and this fills in.`}
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
                Every prescription, order and measurement belongs to a named patient.
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
            style={{ background: `linear-gradient(140deg, ${ACCENT_BRIGHT}, #6366f1)` }}
          >
            {initials}
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {patientName}
              </p>
              <Pill tone={REFERRAL_TONE[selectedReferral.status] ?? "neutral"}>
                {selectedReferral.status.replace("_", " ")}
              </Pill>
              {selectedReferral.priority !== "ROUTINE" ? (
                <Pill tone={PRIORITY_TONE[selectedReferral.priority] ?? "neutral"}>
                  {selectedReferral.priority}
                </Pill>
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
            <Pill tone="critical" icon={<AlertTriangle size={11} />}>
              {rosterEntry.activeAlertCount} open alert
              {rosterEntry.activeAlertCount === 1 ? "" : "s"}
            </Pill>
          ) : null}

          <GlassButton
            size="sm"
            icon={<Apple size={13} />}
            disabled={!rosterEntry}
            title={
              rosterEntry
                ? undefined
                : "This patient has no active care plan to write the request onto."
            }
            onClick={() => setShowNutritionModal(true)}
          >
            Ask dietetics
          </GlassButton>

          <GlassButton size="sm" icon={<Search size={13} />} onClick={() => setActiveTab("caseload")}>
            Change patient
          </GlassButton>

          <GlassButton
            size="sm"
            variant="ghost"
            onClick={() => choosePatient(null)}
            aria-label="Clear the selected patient"
          >
            Clear
          </GlassButton>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------- */
  /* Tab: recovery deck                                              */
  /* -------------------------------------------------------------- */

  function renderOverview() {
    if (!selectedReferral) return needPatient("The recovery deck");

    const completedSessions = sessions.filter(
      (session) => session.attendanceStatus === "COMPLETED",
    ).length;

    const lastSession = sessions[0] ?? null;
    const bestSpirometry = sessions.reduce(
      (best, session) => Math.max(best, session.spirometryAchievedMl ?? 0),
      0,
    );
    const bestSteps = sessions.reduce(
      (best, session) => Math.max(best, session.stepsAchieved ?? 0),
      0,
    );

    const independenceIndex = latestAssessment
      ? INDEPENDENCE_LADDER.findIndex((step) => step.value === latestAssessment.independenceLevel)
      : -1;

    return (
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-3">
          <GlassPanel
            className="lg:col-span-2"
            title="Where this patient is today"
            subtitle="The three numbers that decide what happens at the next session"
            icon={<HeartPulse size={16} />}
            accent={ACCENT_BRIGHT}
          >
            {latestAssessment ? (
              <div className="grid gap-5 sm:grid-cols-3">
                <ProgressRing
                  value={latestAssessment.mobilityScore ?? 0}
                  max={10}
                  accent="#10b981"
                  label="Mobility"
                  caption="of 10"
                />
                <ProgressRing
                  value={latestAssessment.painScore ?? 0}
                  max={10}
                  accent="#f43f5e"
                  label="Pain"
                  caption="of 10"
                />
                <ProgressRing
                  value={independenceIndex + 1}
                  max={INDEPENDENCE_LADDER.length}
                  accent={INDEPENDENCE_LADDER[Math.max(0, independenceIndex)]?.hue ?? ACCENT}
                  label="Independence"
                  caption={`step ${independenceIndex + 1} of ${INDEPENDENCE_LADDER.length}`}
                  valueLabel={`${independenceIndex + 1}`}
                />
              </div>
            ) : (
              <EmptyPrompt
                icon={<ClipboardList size={20} />}
                title="No evaluation on record"
                description="Record the first evaluation and this deck fills with the patient's own numbers."
                action={
                  <GlassButton
                    variant="solid"
                    accent={ACCENT}
                    icon={<ClipboardCheck size={14} />}
                    onClick={() => setActiveTab("assessment")}
                  >
                    Record an evaluation
                  </GlassButton>
                }
              />
            )}

            {latestAssessment ? (
              <div className="mt-5 space-y-3 border-t border-slate-900/8 pt-4 dark:border-white/8">
                <MeterBar
                  label="Best spirometry volume"
                  value={bestSpirometry}
                  max={2500}
                  accent="#38bdf8"
                  valueLabel={bestSpirometry ? `${bestSpirometry} mL` : "Not recorded"}
                />
                <MeterBar
                  label="Furthest ambulation"
                  value={bestSteps}
                  max={500}
                  accent="#34d399"
                  valueLabel={bestSteps ? `${bestSteps} steps` : "Not recorded"}
                />
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
            ) : null}
          </GlassPanel>

          <div className="space-y-4">
            <GlassStat
              label="Prescribed exercises"
              value={assignedTasks.length}
              hint="Live on the patient's phone"
              icon={<Dumbbell size={14} />}
              accent="#0891b2"
            />
            <GlassStat
              label="Sessions completed"
              value={completedSessions}
              hint={`${sessions.length} logged in total`}
              icon={<Activity size={14} />}
              accent="#7c3aed"
            />
            <GlassStat
              label="Last contact"
              value={lastSession ? shortDate(lastSession.sessionDate) : "—"}
              hint={
                lastSession
                  ? ATTENDANCE_LABELS[lastSession.attendanceStatus]
                  : "No session logged yet"
              }
              icon={<CalendarClock size={14} />}
              accent="#f59e0b"
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <GlassPanel padded={false} className="p-5">
            <TrendLine
              title="Mobility and pain over the stay"
              subtitle="Every evaluation you have recorded for this patient"
              series={trendSeries}
              yMin={0}
              yMax={10}
              height={200}
              emptyMessage="No evaluations yet"
              emptyHint="Two or more evaluations draw the trend."
            />
          </GlassPanel>

          <GlassPanel padded={false} className="p-5">
            {distanceSeries.length > 0 ? (
              <TrendLine
                title="Ambulation progress"
                subtitle="Steps achieved at each logged session"
                series={distanceSeries}
                height={200}
                emptyMessage="No ambulation recorded"
              />
            ) : (
              <DonutChart
                title="Session attendance"
                subtitle="How the logged sessions went"
                slices={attendanceSlices}
                centerValue={`${sessions.length}`}
                centerLabel="sessions"
                emptyMessage="No sessions logged yet"
                emptyHint="Log a bedside session and this fills in."
              />
            )}
          </GlassPanel>
        </div>

        {renderCareTeamPanel()}
      </div>
    );
  }

  /**
   * The cross-portal panel. Everything the physiotherapist needs to know
   * about what the rest of the hospital is doing with this patient, and the
   * three ways they can push information back out.
   */
  function renderCareTeamPanel() {
    return (
      <GlassPanel
        title="Care team and connected portals"
        subtitle="What the rest of the hospital sees, and how to reach them"
        icon={<Share2 size={16} />}
        accent="#7c3aed"
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
                    {rosterEntry.assignedNutritionistName
                      ? ` · Dietitian: ${rosterEntry.assignedNutritionistName}`
                      : " · No dietitian assigned"}
                  </p>

                  <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {rosterEntry.lastVitalsSummary ? (
                      <span>Vitals: {rosterEntry.lastVitalsSummary}</span>
                    ) : null}
                    {rosterEntry.lastDrainSummary ? (
                      <span>Drains: {rosterEntry.lastDrainSummary}</span>
                    ) : null}
                    {rosterEntry.lastWoundSummary ? (
                      <span>Wound: {rosterEntry.lastWoundSummary}</span>
                    ) : null}
                  </div>
                </GlassWell>

                <div className="space-y-2">
                  <GlassField
                    label="Add a physiotherapy note to the care plan"
                    htmlFor="handoff-note"
                    hint="It appears in the surgical team's progress notes, attributed to you."
                  >
                    <GlassTextarea
                      id="handoff-note"
                      rows={3}
                      value={handoffNote}
                      placeholder="e.g. Walked 120 m unaided today, spirometry 1400 mL, ready for stair assessment tomorrow."
                      onChange={(event) => setHandoffNote(event.target.value)}
                    />
                  </GlassField>

                  <GlassButton
                    variant="solid"
                    accent="#7c3aed"
                    icon={<Send size={13} />}
                    disabled={!handoffNote.trim() || busyAction === "handoff"}
                    onClick={sendHandoffNote}
                  >
                    {busyAction === "handoff" ? "Sending…" : "Send to the surgical team"}
                  </GlassButton>
                </div>
              </>
            ) : (
              <GlassWell>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  This patient has no active care plan. Exercises are delivered through the care
                  plan, so the managing surgeon needs to start one before anything reaches the
                  patient&apos;s app.
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
                href: "/operations/nutrition",
                label: "Dietetics workspace",
                detail: "Nutrition assessments, PERT titration and meal plans",
                icon: Apple,
              },
              {
                href: "/operations/alerts",
                label: "Clinical alert console",
                detail: "Escalations raised on this ward",
                icon: AlertTriangle,
              },
              {
                href: "/operations/physiotherapy/profile",
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
      <div className="space-y-5">
        <GlassPanel
          title="Physiotherapy caseload"
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
              title={referrals.length === 0 ? "No physiotherapy referrals yet" : "Nothing matches that filter"}
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
                      className="wfg-tile flex h-full flex-col p-4 transition"
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
                          <Pill tone={REFERRAL_TONE[referral.status] ?? "neutral"}>
                            {referral.status.replace("_", " ")}
                          </Pill>
                          {referral.priority !== "ROUTINE" ? (
                            <Pill tone={PRIORITY_TONE[referral.priority] ?? "neutral"}>
                              {referral.priority}
                            </Pill>
                          ) : null}
                        </div>
                      </div>

                      <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-slate-600 dark:text-slate-300">
                        {referral.reason}
                      </p>

                      {entry ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                          <Pill tone="info">
                            Day {entry.currentDayNumber} / {entry.totalDays}
                          </Pill>
                          {entry.activeAlertCount > 0 ? (
                            <Pill tone="critical">{entry.activeAlertCount} alert</Pill>
                          ) : null}
                          <span className="min-w-0 truncate">{entry.title}</span>
                        </div>
                      ) : (
                        <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
                          No active care plan
                        </p>
                      )}

                      {referral.precautions ? (
                        <p className="mt-2 rounded-lg border border-amber-400/35 bg-amber-500/10 px-2.5 py-1.5 text-[10px] leading-4 text-amber-800 dark:text-amber-200">
                          <ShieldAlert aria-hidden size={11} className="mr-1 inline" />
                          {referral.precautions}
                        </p>
                      ) : null}

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
                              runReferralAction(referral.id, "start", `Treatment started for ${name}.`)
                            }
                          >
                            Start treatment
                          </GlassButton>
                        ) : null}

                        {referral.status === "IN_PROGRESS" ? (
                          <GlassButton
                            size="sm"
                            disabled={busyAction === `complete-${referral.id}`}
                            onClick={() =>
                              runReferralAction(
                                referral.id,
                                "complete",
                                `Episode of care completed for ${name}.`,
                              )
                            }
                          >
                            Complete episode
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
      </div>
    );
  }

  /* -------------------------------------------------------------- */
  /* Tab: exercise studio                                            */
  /* -------------------------------------------------------------- */

  function renderStudio() {
    if (!selectedReferral) return needPatient("A prescription");

    return (
      <div className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-12">
          {/* Filters + catalogue */}
          <div className="space-y-4 xl:col-span-7">
            <GlassPanel
              title="Exercise catalogue"
              subtitle="Curated protocols and your hospital's own library. Nothing is selected until you select it."
              icon={<Dumbbell size={16} />}
              accent={ACCENT_BRIGHT}
              actions={
                <GlassButton
                  size="sm"
                  variant="solid"
                  accent={ACCENT}
                  icon={<ListPlus size={13} />}
                  onClick={() => setShowAuthorModal(true)}
                >
                  Author exercise
                </GlassButton>
              }
            >
              <div className="space-y-3">
                <div className="relative">
                  <Search
                    aria-hidden
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <GlassInput
                    aria-label="Search exercises"
                    className="pl-9"
                    placeholder="Search by name, cue or tag — spirometry, drains, sarcopenia…"
                    value={librarySearch}
                    onChange={(event) => setLibrarySearch(event.target.value)}
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <GlassChip
                    active={categoryFilter === null}
                    onClick={() => setCategoryFilter(null)}
                  >
                    All categories
                  </GlassChip>
                  {CATEGORY_ORDER.map((category) => (
                    <GlassChip
                      key={category}
                      active={categoryFilter === category}
                      hue={CATEGORY_HUE[category]}
                      count={
                        EXERCISE_TEMPLATES.filter((template) => template.category === category)
                          .length + library.filter((item) => item.category === category).length
                      }
                      onClick={() =>
                        setCategoryFilter(categoryFilter === category ? null : category)
                      }
                    >
                      {CATEGORY_LABELS[category]}
                    </GlassChip>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <GlassChip active={bandFilter === null} onClick={() => setBandFilter(null)}>
                    Both services
                  </GlassChip>
                  {(["GENERAL", "HPB"] as ClinicalBand[]).map((band) => (
                    <GlassChip
                      key={band}
                      active={bandFilter === band}
                      hue={band === "HPB" ? "#7c3aed" : "#0891b2"}
                      count={EXERCISE_TEMPLATES.filter((template) => template.band === band).length}
                      onClick={() => setBandFilter(bandFilter === band ? null : band)}
                    >
                      {BAND_LABELS[band]}
                    </GlassChip>
                  ))}
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {showTemplates ? (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Protocol templates ({filteredTemplates.length})
                      </p>
                      <GlassButton
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowTemplates(false)}
                      >
                        Hide templates
                      </GlassButton>
                    </div>

                    {filteredTemplates.length === 0 ? (
                      <p className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                        No template matches those filters.
                      </p>
                    ) : (
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {filteredTemplates.map((template) => (
                          <li key={template.id}>
                            {renderExerciseCard(template)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <GlassButton size="sm" variant="ghost" onClick={() => setShowTemplates(true)}>
                    Show protocol templates
                  </GlassButton>
                )}

                <div className="flex items-center justify-between border-t border-slate-900/8 pt-3 dark:border-white/8">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Your hospital&apos;s library ({filteredLibrary.length})
                  </p>
                </div>

                {filteredLibrary.length === 0 ? (
                  <p className="py-3 text-center text-xs text-slate-500 dark:text-slate-400">
                    {library.length === 0
                      ? "Nothing authored yet. Anything you author is saved for the whole department."
                      : "No authored exercise matches those filters."}
                  </p>
                ) : (
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {filteredLibrary.map((exercise) => (
                      <li key={exercise.id}>
                        <div
                          className="wfg-tile h-full p-3.5"
                          style={
                            pickedLibraryId === exercise.id
                              ? {
                                  borderColor: CATEGORY_HUE[exercise.category],
                                  boxShadow: `0 0 0 1px ${CATEGORY_HUE[exercise.category]}66`,
                                }
                              : undefined
                          }
                        >
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              className="min-w-0 flex-1 text-left"
                              onClick={() => {
                                setPickedLibraryId(exercise.id);
                                setPickedTemplateId(null);
                              }}
                            >
                              <span className="flex items-center gap-1.5">
                                <span
                                  aria-hidden
                                  className="h-2 w-2 shrink-0 rounded-full"
                                  style={{ background: CATEGORY_HUE[exercise.category] }}
                                />
                                <span className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                                  {exercise.name}
                                </span>
                              </span>
                              <span className="mt-1 line-clamp-2 block text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                                {exercise.instruction}
                              </span>
                            </button>

                            <button
                              type="button"
                              aria-label={`Retire ${exercise.name}`}
                              disabled={busyAction === `library-${exercise.id}`}
                              onClick={() => deleteLibraryExercise(exercise.id)}
                              className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-500"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </GlassPanel>

            <GlassPanel
              title="Filter by body region"
              subtitle="Point at the area you are treating"
              icon={<Compass size={16} />}
              accent="#7c3aed"
              actions={
                regionFilter ? (
                  <GlassButton size="sm" variant="ghost" onClick={() => setRegionFilter(null)}>
                    Clear region
                  </GlassButton>
                ) : null
              }
            >
              <BodyMap
                selected={regionFilter}
                counts={regionCounts}
                onToggle={(region) =>
                  setRegionFilter(regionFilter === region ? null : (region as BodyRegion))
                }
              />
            </GlassPanel>
          </div>

          {/* Dose console */}
          <div className="space-y-4 xl:col-span-5">
            <GlassPanel
              title="Dose console"
              subtitle={`Set the dose for ${patientName}`}
              icon={<Gauge size={16} />}
              accent="#f59e0b"
            >
              {!pickedExercise ? (
                <EmptyPrompt
                  icon={<Dumbbell size={20} />}
                  title="Pick an exercise"
                  description="Choose one from the catalogue and the dose controls appear here. Nothing is pre-dosed — every number is yours to set."
                />
              ) : (
                <div className="space-y-5">
                  <GlassWell className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        aria-hidden
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: CATEGORY_HUE[pickedExercise.category] }}
                      />
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {pickedExercise.name}
                      </p>
                      <Pill tone="neutral">{CATEGORY_LABELS[pickedExercise.category]}</Pill>
                      {pickedExercise.band === "HPB" ? <Pill tone="info">HPB</Pill> : null}
                    </div>

                    <p className="text-[11px] leading-5 text-slate-600 dark:text-slate-300">
                      {pickedExercise.instruction}
                    </p>

                    {pickedExercise.precautions ? (
                      <p className="rounded-lg border border-amber-400/35 bg-amber-500/10 px-2.5 py-1.5 text-[10px] leading-4 text-amber-800 dark:text-amber-200">
                        <ShieldAlert aria-hidden size={11} className="mr-1 inline" />
                        {pickedExercise.precautions}
                      </p>
                    ) : null}

                    {pickedExercise.suggested ? (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          Protocol suggests {pickedExercise.suggested.repetitions} ×{" "}
                          {pickedExercise.suggested.sets}
                          {pickedExercise.suggested.holdSeconds
                            ? `, ${pickedExercise.suggested.holdSeconds}s hold`
                            : ""}
                        </span>
                        <GlassButton
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setDose((previous) => ({
                              ...previous,
                              repetitions: pickedExercise.suggested!.repetitions,
                              sets: pickedExercise.suggested!.sets,
                              holdSeconds: pickedExercise.suggested!.holdSeconds || null,
                            }))
                          }
                        >
                          Use the suggestion
                        </GlassButton>
                      </div>
                    ) : null}
                  </GlassWell>

                  <div className="flex flex-wrap items-start justify-center gap-6">
                    <Dial
                      value={dose.repetitions}
                      onChange={(next) => setDose((previous) => ({ ...previous, repetitions: next }))}
                      min={1}
                      max={50}
                      label="Repetitions"
                      unit="reps"
                      accent={ACCENT_BRIGHT}
                      size={124}
                    />
                    <Dial
                      value={dose.holdSeconds}
                      onChange={(next) => setDose((previous) => ({ ...previous, holdSeconds: next }))}
                      min={0}
                      max={60}
                      label="Hold"
                      unit="seconds"
                      accent="#a78bfa"
                      size={124}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Stepper
                      label="Sets per day"
                      value={dose.sets}
                      min={1}
                      max={12}
                      onChange={(next) => setDose((previous) => ({ ...previous, sets: next }))}
                    />
                    <Stepper
                      label="Days to schedule"
                      value={dose.days}
                      min={1}
                      max={14}
                      accent="#7c3aed"
                      onChange={(next) => setDose((previous) => ({ ...previous, days: next }))}
                    />
                  </div>

                  <GradientSlider
                    label="Target perceived exertion (Borg 6–20)"
                    value={dose.effort}
                    min={6}
                    max={20}
                    ramp={["#10b981", "#84cc16", "#facc15", "#fb923c", "#ef4444"]}
                    hint="Keep HPB patients with varices, low platelets or a raised INR at 11–13."
                    onChange={(next) => setDose((previous) => ({ ...previous, effort: next }))}
                    ticks={[
                      { value: 6, label: "6 none" },
                      { value: 13, label: "13 somewhat hard" },
                      { value: 20, label: "20 maximal" },
                    ]}
                  />

                  <SegmentedControl
                    label="Start from"
                    columns={3}
                    value={String(dose.startOffsetDays)}
                    onChange={(next) =>
                      setDose((previous) => ({ ...previous, startOffsetDays: Number(next) }))
                    }
                    options={[
                      { value: "0", label: "Today" },
                      { value: "1", label: "Tomorrow" },
                      { value: "2", label: "In two days" },
                    ]}
                  />

                  {/* What the patient will actually see. */}
                  <div className="rounded-2xl border border-slate-900/10 bg-slate-950/85 p-4 text-slate-100 dark:border-white/10">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
                      Patient app preview
                    </p>
                    <p className="mt-1.5 text-sm font-semibold">
                      Physiotherapy: {pickedExercise.name}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-300">
                      {pickedExercise.instruction}
                      {dose.holdSeconds ? ` Hold each repetition for ${dose.holdSeconds} seconds.` : ""}
                      {dose.effort ? ` Work at about ${dose.effort} on the Borg scale.` : ""}
                    </p>
                    <p className="mt-2 text-[11px] font-semibold text-cyan-200">
                      {dose.repetitions ?? "—"} repetitions × {dose.sets ?? "—"} sets ·{" "}
                      {dose.days} {dose.days === 1 ? "day" : "days"}
                    </p>
                  </div>

                  <GlassButton
                    variant="solid"
                    accent={ACCENT}
                    className="w-full"
                    icon={<Send size={14} />}
                    disabled={!doseReady || busyAction === "prescribe"}
                    onClick={prescribe}
                  >
                    {busyAction === "prescribe"
                      ? "Prescribing…"
                      : `Prescribe to ${patientName ?? "the patient"}`}
                  </GlassButton>

                  {!doseReady ? (
                    <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">
                      Set repetitions and sets to enable prescribing.
                    </p>
                  ) : null}
                </div>
              )}
            </GlassPanel>

            <GlassPanel
              title={`Active programme${patientName ? ` — ${patientName}` : ""}`}
              subtitle="Live on the patient's phone right now"
              icon={<Activity size={16} />}
              accent="#10b981"
            >
              {isLoadingPatient ? (
                <GlassSkeleton rows={3} height={54} />
              ) : assignedTasks.length === 0 ? (
                <EmptyPrompt
                  icon={<Timer size={20} />}
                  title="Nothing prescribed yet"
                  description="Exercises you prescribe appear here and in the patient's daily action list."
                />
              ) : (
                <ul className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
                  {assignedTasks.map((task) => {
                    const category = (task.resultData?.category ?? "MOBILITY") as ExerciseCategory;

                    return (
                      <li
                        key={task.id}
                        className="wfg-well flex items-start justify-between gap-3 px-3.5 py-3"
                      >
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white">
                            <span
                              aria-hidden
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ background: CATEGORY_HUE[category] ?? ACCENT }}
                            />
                            <span className="truncate">{task.title.replace("Physiotherapy: ", "")}</span>
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                            {task.resultData?.repetitions ?? "—"} reps ×{" "}
                            {task.resultData?.sets ?? "—"} sets · {shortDate(task.scheduledFor)} ·{" "}
                            {task.status.toLowerCase()}
                          </p>
                        </div>

                        <button
                          type="button"
                          aria-label={`Withdraw ${task.title}`}
                          disabled={busyAction === `task-${task.id}`}
                          onClick={() => removeTask(task.id)}
                          className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-500"
                        >
                          <Trash2 size={13} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </GlassPanel>
          </div>
        </div>
      </div>
    );
  }

  function renderExerciseCard(template: ExerciseTemplate) {
    const picked = pickedTemplateId === template.id;
    const hue = CATEGORY_HUE[template.category];

    return (
      <button
        type="button"
        onClick={() => {
          setPickedTemplateId(template.id);
          setPickedLibraryId(null);
        }}
        aria-pressed={picked}
        className="wfg-tile h-full w-full p-3.5 text-left"
        style={picked ? { borderColor: hue, boxShadow: `0 0 0 1px ${hue}66` } : undefined}
      >
        <span className="flex items-start justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: hue }} />
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

        <span className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
          <span>{BODY_REGION_LABELS[template.region]}</span>
          <span aria-hidden>·</span>
          <span>
            {template.suggestedRepetitions} × {template.suggestedSets}
          </span>
        </span>
      </button>
    );
  }

  /* -------------------------------------------------------------- */
  /* Tab: assess and measure                                         */
  /* -------------------------------------------------------------- */

  function renderAssessment() {
    if (!selectedReferral) return needPatient("An evaluation");

    const berg = bergRisk(bergTotal);
    const tug = tugRisk(tugSeconds ?? 0);

    return (
      <div className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-2">
          {/* Evaluation */}
          <GlassPanel
            title="Clinical evaluation"
            subtitle={`Recorded against ${patientName}`}
            icon={<ClipboardCheck size={16} />}
            accent={ACCENT_BRIGHT}
          >
            <form onSubmit={saveAssessment} className="space-y-5">
              <GradientSlider
                label="Mobility score"
                value={mobilityScore}
                min={0}
                max={10}
                ramp={MOBILITY_RAMP}
                onChange={setMobilityScore}
                hint="0 is fully dependent, 10 is independent and safe on all surfaces."
                ticks={[
                  { value: 0, label: "0 dependent" },
                  { value: 5, label: "5" },
                  { value: 10, label: "10 independent" },
                ]}
              />

              <GradientSlider
                label="Pain at rest"
                value={painScore}
                min={0}
                max={10}
                ramp={PAIN_RAMP}
                onChange={setPainScore}
                hint="Ask before the session so analgesia can be timed against it."
                ticks={[
                  { value: 0, label: "0 none" },
                  { value: 5, label: "5" },
                  { value: 10, label: "10 worst" },
                ]}
              />

              <SegmentedControl
                label="Functional independence"
                columns={1}
                value={independence}
                onChange={setIndependence}
                options={INDEPENDENCE_LADDER.map((step) => ({
                  value: step.value,
                  label: step.label,
                  detail: step.detail,
                  hue: step.hue,
                }))}
              />

              <GlassField label="Respiratory function" htmlFor="respiratory">
                <GlassInput
                  id="respiratory"
                  value={respiratoryFunction}
                  placeholder="e.g. Right basal crackles, spirometry 900 mL, weak splinted cough"
                  onChange={(event) => setRespiratoryFunction(event.target.value)}
                />
              </GlassField>

              <GlassField
                label="Surgical restrictions"
                htmlFor="restrictions"
                hint="What the operating surgeon has limited for this patient."
              >
                <GlassInput
                  id="restrictions"
                  value={surgicalRestrictions}
                  placeholder="e.g. Rooftop incision, no lifting over 5 kg for six weeks"
                  onChange={(event) => setSurgicalRestrictions(event.target.value)}
                />
              </GlassField>

              <GlassField label="Goals for this episode" htmlFor="goals">
                <GlassTextarea
                  id="goals"
                  rows={3}
                  value={goals}
                  placeholder="e.g. Independent stair climbing and 200 m unaided walking before discharge"
                  onChange={(event) => setGoals(event.target.value)}
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
                {busyAction === "assessment" ? "Saving…" : "Record the evaluation"}
              </GlassButton>
            </form>
          </GlassPanel>

          {/* Session log */}
          <GlassPanel
            title="Bedside session log"
            subtitle="What happened at the session you just finished"
            icon={<Activity size={16} />}
            accent="#10b981"
          >
            <form onSubmit={saveSession} className="space-y-5">
              <SegmentedControl
                label="How the session went"
                columns={2}
                value={attendance}
                onChange={setAttendance}
                options={ATTENDANCE_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                  hue: option.hue,
                }))}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <GradientSlider
                  label="Pain before"
                  value={painBefore}
                  min={0}
                  max={10}
                  ramp={PAIN_RAMP}
                  onChange={setPainBefore}
                />
                <GradientSlider
                  label="Pain after"
                  value={painAfter}
                  min={0}
                  max={10}
                  ramp={PAIN_RAMP}
                  onChange={setPainAfter}
                />
              </div>

              {painBefore !== null && painAfter !== null ? (
                <GlassWell className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    Change across the session
                  </span>
                  <span
                    className="text-sm font-semibold tabular-nums"
                    style={{ color: painAfter <= painBefore ? "#10b981" : "#ef4444" }}
                  >
                    {painAfter - painBefore > 0 ? "+" : ""}
                    {painAfter - painBefore} points
                  </span>
                </GlassWell>
              ) : null}

              <div className="flex flex-wrap items-start justify-center gap-6">
                <Dial
                  value={spirometryMl}
                  onChange={setSpirometryMl}
                  min={0}
                  max={3000}
                  step={50}
                  label="Spirometry achieved"
                  unit="mL"
                  accent="#38bdf8"
                  size={126}
                />
                <Dial
                  value={stepsAchieved}
                  onChange={setStepsAchieved}
                  min={0}
                  max={1000}
                  step={10}
                  label="Steps achieved"
                  unit="steps"
                  accent="#34d399"
                  size={126}
                />
              </div>

              <GlassField label="Progress notes" htmlFor="progress-notes">
                <GlassTextarea
                  id="progress-notes"
                  rows={3}
                  value={progressNotes}
                  placeholder="e.g. Walked to the nurses' station and back with one rest. Drains secured throughout."
                  onChange={(event) => setProgressNotes(event.target.value)}
                />
              </GlassField>

              <GlassButton
                type="submit"
                variant="solid"
                accent="#059669"
                className="w-full"
                icon={<Activity size={14} />}
                disabled={busyAction === "session"}
              >
                {busyAction === "session" ? "Recording…" : "Record the session"}
              </GlassButton>
            </form>
          </GlassPanel>
        </div>

        {/* Outcome measures */}
        <div className="grid gap-5 xl:grid-cols-2">
          <GlassPanel
            title="Berg Balance Scale"
            subtitle="All fourteen items, each scored 0 to 4"
            icon={<Gauge size={16} />}
            accent="#a78bfa"
            actions={
              Object.keys(bergScores).length > 0 ? (
                <GlassButton size="sm" variant="ghost" onClick={() => setBergScores({})}>
                  Reset
                </GlassButton>
              ) : null
            }
          >
            <div className="space-y-2">
              {BERG_ITEMS.map((item, index) => (
                <div key={item.id} className="flex items-center gap-3">
                  <span className="w-5 shrink-0 text-right text-[10px] tabular-nums text-slate-400">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11px] text-slate-600 dark:text-slate-300">
                    {item.label}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    {[0, 1, 2, 3, 4].map((score) => {
                      const active = bergScores[item.id] === score;
                      return (
                        <button
                          key={score}
                          type="button"
                          aria-label={`${item.label}: ${score}`}
                          aria-pressed={active}
                          onClick={() =>
                            setBergScores((previous) => ({ ...previous, [item.id]: score }))
                          }
                          className={`h-6 w-6 rounded-lg border text-[10px] font-semibold transition ${
                            active
                              ? "border-transparent text-white"
                              : "border-slate-300/60 bg-[rgb(148_163_184_/_0.14)] text-slate-500 hover:border-violet-400/70 hover:text-violet-600 dark:border-white/12 dark:text-slate-400"
                          }`}
                          style={active ? { background: "#7c3aed" } : undefined}
                        >
                          {score}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-violet-400/35 bg-violet-500/10 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-violet-900 dark:text-violet-200">
                  {bergComplete
                    ? berg.label
                    : `${Object.keys(bergScores).length} of ${BERG_ITEMS.length} items scored`}
                </p>
                <p className="mt-0.5 text-[10px] text-violet-800/80 dark:text-violet-300/80">
                  The interpretation below is only valid once all fourteen items are scored.
                </p>
              </div>
              <span className="shrink-0 text-lg font-semibold tabular-nums text-violet-900 dark:text-violet-200">
                {bergTotal} / 56
              </span>
            </div>
          </GlassPanel>

          <div className="space-y-5">
            <GlassPanel
              title="Timed and functional tests"
              subtitle="Timed Up and Go, walk distance, breathlessness and effort"
              icon={<Timer size={16} />}
              accent="#f59e0b"
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Stepper
                    label="Timed Up and Go"
                    unit="seconds"
                    value={tugSeconds}
                    min={0}
                    max={120}
                    accent="#f59e0b"
                    onChange={setTugSeconds}
                  />
                  <Stepper
                    label="Six-minute walk"
                    unit="metres"
                    value={walkDistance}
                    min={0}
                    max={800}
                    step={5}
                    accent="#34d399"
                    onChange={setWalkDistance}
                  />
                </div>

                {tugSeconds !== null && tugSeconds > 0 ? (
                  <div
                    className="rounded-xl border px-3 py-2 text-[11px] font-medium"
                    style={{
                      background:
                        tug.tone === "good"
                          ? "rgb(16 185 129 / 0.10)"
                          : tug.tone === "warning"
                            ? "rgb(245 158 11 / 0.12)"
                            : "rgb(239 68 68 / 0.10)",
                      borderColor:
                        tug.tone === "good"
                          ? "rgb(16 185 129 / 0.35)"
                          : tug.tone === "warning"
                            ? "rgb(245 158 11 / 0.35)"
                            : "rgb(239 68 68 / 0.35)",
                    }}
                  >
                    {tug.label}
                  </div>
                ) : null}

                <GlassField label="MRC dyspnoea grade" htmlFor="mrc">
                  <GlassSelect
                    id="mrc"
                    value={mrcGrade ?? ""}
                    onChange={(event) =>
                      setMrcGrade(event.target.value === "" ? null : Number(event.target.value))
                    }
                  >
                    <option value="">Not assessed</option>
                    {MRC_DYSPNOEA.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </GlassSelect>
                </GlassField>

                <GlassField label="Borg rating of perceived exertion" htmlFor="borg">
                  <GlassSelect
                    id="borg"
                    value={borgScore ?? ""}
                    onChange={(event) =>
                      setBorgScore(event.target.value === "" ? null : Number(event.target.value))
                    }
                  >
                    <option value="">Not assessed</option>
                    {BORG_RPE.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </GlassSelect>
                </GlassField>

                <p className="text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                  These measures are calculators for your clinical reasoning at the bedside. Carry
                  the ones that matter into the progress notes on the session log, which is what the
                  surgical team reads.
                </p>
              </div>
            </GlassPanel>

            <GlassPanel
              title="Range of motion"
              subtitle="Measured against the reference maximum for each joint"
              icon={<Compass size={16} />}
              accent="#0891b2"
            >
              <div className="space-y-3">
                {ROM_JOINTS.map((joint) => {
                  const measured = romValues[joint.id];

                  return (
                    <div key={joint.id} className="flex items-center gap-3">
                      <span className="w-36 shrink-0 truncate text-[11px] text-slate-600 dark:text-slate-300">
                        {joint.label}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="h-2 overflow-hidden rounded-full bg-slate-900/8 dark:bg-white/8">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              background: `linear-gradient(90deg, ${ACCENT_BRIGHT}, ${ACCENT})`,
                              width: `${
                                joint.normal > 0
                                  ? Math.min(100, ((measured ?? 0) / joint.normal) * 100)
                                  : measured
                                    ? 100
                                    : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>

                      <input
                        type="number"
                        aria-label={`${joint.label} in degrees`}
                        min={0}
                        max={200}
                        value={measured ?? ""}
                        placeholder="—"
                        onChange={(event) => {
                          const raw = event.target.value;
                          setRomValues((previous) => {
                            if (raw === "") {
                              const next = { ...previous };
                              delete next[joint.id];
                              return next;
                            }
                            return { ...previous, [joint.id]: Number(raw) };
                          });
                        }}
                        className="w-16 shrink-0 rounded-lg border border-slate-300/60 bg-white/60 px-2 py-1 text-center text-[11px] tabular-nums text-slate-900 outline-none focus:border-cyan-400 dark:border-white/12 dark:bg-white/5 dark:text-slate-100"
                      />

                      <span className="w-10 shrink-0 text-[10px] text-slate-400">
                        / {joint.normal}°
                      </span>
                    </div>
                  );
                })}
              </div>
            </GlassPanel>
          </div>
        </div>

        {/* History */}
        <div className="grid gap-5 xl:grid-cols-2">
          <GlassPanel
            title="Evaluation history"
            subtitle={`${assessments.length} recorded`}
            icon={<ClipboardList size={16} />}
            accent="#0891b2"
          >
            {assessments.length === 0 ? (
              <EmptyPrompt
                icon={<ClipboardList size={20} />}
                title="No evaluations yet"
                description="The first evaluation you record for this patient appears here."
              />
            ) : (
              <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {assessments.map((assessment) => (
                  <li key={assessment.id} className="wfg-well px-3.5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        {shortDate(assessment.assessedAt)}
                      </p>
                      <Pill tone="info">
                        {INDEPENDENCE_LADDER.find((step) => step.value === assessment.independenceLevel)
                          ?.label ?? assessment.independenceLevel}
                      </Pill>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      Mobility {assessment.mobilityScore}/10 · Pain {assessment.painScore}/10
                      {assessment.respiratoryFunction ? ` · ${assessment.respiratoryFunction}` : ""}
                    </p>
                    {assessment.goals ? (
                      <p className="mt-1 text-[11px] italic text-slate-500 dark:text-slate-400">
                        Goal: {assessment.goals}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </GlassPanel>

          <GlassPanel
            title="Session history"
            subtitle={`${sessions.length} logged`}
            icon={<CalendarClock size={16} />}
            accent="#10b981"
          >
            {sessions.length === 0 ? (
              <EmptyPrompt
                icon={<CalendarClock size={20} />}
                title="No sessions logged"
                description="Each bedside session you record shows here with its outcome."
              />
            ) : (
              <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {sessions.map((session) => (
                  <li key={session.id} className="wfg-well px-3.5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        {shortDate(session.sessionDate)}
                      </p>
                      <Pill
                        tone={
                          session.attendanceStatus === "COMPLETED"
                            ? "good"
                            : session.attendanceStatus === "CANCELLED"
                              ? "critical"
                              : "warning"
                        }
                      >
                        {ATTENDANCE_LABELS[session.attendanceStatus]}
                      </Pill>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {session.stepsAchieved ? `${session.stepsAchieved} steps` : "No distance"} ·{" "}
                      {session.spirometryAchievedMl
                        ? `${session.spirometryAchievedMl} mL`
                        : "No spirometry"}
                      {session.painBefore !== null && session.painAfter !== null
                        ? ` · pain ${session.painBefore} → ${session.painAfter}`
                        : ""}
                    </p>
                    {session.progressNotes ? (
                      <p className="mt-1 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">
                        {session.progressNotes}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </GlassPanel>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------- */
  /* Tab: recovery pathways                                          */
  /* -------------------------------------------------------------- */

  function renderPathways() {
    const openPathway = RECOVERY_PATHWAYS.find((pathway) => pathway.id === openPathwayId) ?? null;

    return (
      <div className="space-y-5">
        <GlassPanel
          title="Recovery pathways"
          subtitle="HPB surgical tracks alongside the general physiotherapy protocols. Open one to prescribe its milestone exercises."
          icon={<Route size={16} />}
          accent="#7c3aed"
        >
          <div className="flex flex-wrap gap-1.5">
            <GlassChip active={pathwayBand === null} onClick={() => setPathwayBand(null)}>
              All pathways
            </GlassChip>
            {(["HPB", "GENERAL"] as ClinicalBand[]).map((band) => (
              <GlassChip
                key={band}
                active={pathwayBand === band}
                hue={band === "HPB" ? "#7c3aed" : "#0891b2"}
                count={RECOVERY_PATHWAYS.filter((pathway) => pathway.band === band).length}
                onClick={() => setPathwayBand(pathwayBand === band ? null : band)}
              >
                {BAND_LABELS[band]}
              </GlassChip>
            ))}
          </div>

          <ul className="mt-4 grid gap-3 lg:grid-cols-2">
            {visiblePathways.map((pathway) => (
              <li key={pathway.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpenPathwayId(pathway.id);
                    setPathwayMilestoneIndex(null);
                  }}
                  className="wfg-tile h-full w-full p-4 text-left"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span
                        className="block text-[10px] font-bold uppercase tracking-wide"
                        style={{ color: pathway.band === "HPB" ? "#7c3aed" : ACCENT }}
                      >
                        {pathway.service}
                      </span>
                      <span className="mt-0.5 block truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {pathway.title}
                      </span>
                    </span>
                    <ChevronRight size={15} className="mt-1 shrink-0 text-slate-400" />
                  </span>

                  <span className="mt-2 line-clamp-2 block text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                    {pathway.summary}
                  </span>

                  <span className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                      {pathway.milestones.length} milestones
                    </span>
                    {pathway.incision ? (
                      <span className="truncate rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                        {pathway.incision}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </GlassPanel>

        <GlassModal
          open={openPathway !== null}
          onClose={() => setOpenPathwayId(null)}
          title={openPathway?.title ?? ""}
          subtitle={openPathway?.summary}
          icon={<Footprints size={16} />}
          accent={openPathway?.band === "HPB" ? "#7c3aed" : ACCENT}
          width="max-w-3xl"
        >
          {openPathway ? (
            <div className="space-y-5">
              {openPathway.incision ? (
                <GlassWell>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Approach
                  </p>
                  <p className="mt-1 text-xs text-slate-700 dark:text-slate-200">
                    {openPathway.incision}
                  </p>
                </GlassWell>
              ) : null}

              <div className="rounded-2xl border border-rose-400/35 bg-rose-500/8 px-4 py-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-800 dark:text-rose-200">
                  <AlertTriangle size={12} /> Stop and escalate
                </p>
                <ul className="mt-1.5 space-y-1">
                  {openPathway.redFlags.map((flag) => (
                    <li key={flag} className="text-[11px] leading-5 text-rose-800/90 dark:text-rose-200/90">
                      • {flag}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold text-slate-800 dark:text-slate-100">
                  Milestones
                </p>
                <MilestoneRail
                  items={openPathway.milestones.map((milestone, index) => ({
                    id: `${openPathway.id}-${index}`,
                    day: milestone.day,
                    target: milestone.target,
                  }))}
                  activeIndex={pathwayMilestoneIndex}
                  onSelect={setPathwayMilestoneIndex}
                  accent={openPathway.band === "HPB" ? "#7c3aed" : ACCENT}
                />
              </div>

              {pathwayMilestoneIndex !== null ? (
                <GlassWell className="space-y-3">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    Exercises for {openPathway.milestones[pathwayMilestoneIndex]?.day}
                  </p>

                  <ul className="space-y-2">
                    {(openPathway.milestones[pathwayMilestoneIndex]?.templateIds ?? []).map((id) => {
                      const template = templateById(id);
                      if (!template) return null;

                      return (
                        <li
                          key={id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-300/45 px-3 py-2 dark:border-white/10"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              aria-hidden
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ background: CATEGORY_HUE[template.category] }}
                            />
                            <span className="truncate text-[11px] font-medium text-slate-700 dark:text-slate-200">
                              {template.name}
                            </span>
                          </span>

                          <GlassButton
                            size="sm"
                            variant="solid"
                            accent={ACCENT}
                            icon={<ArrowRight size={12} />}
                            disabled={!selectedReferral}
                            onClick={() => {
                              setPickedTemplateId(id);
                              setPickedLibraryId(null);
                              setDose({
                                ...EMPTY_DOSE,
                                repetitions: template.suggestedRepetitions,
                                sets: template.suggestedSets,
                                holdSeconds: template.suggestedHoldSeconds || null,
                              });
                              setOpenPathwayId(null);
                              setActiveTab("studio");
                            }}
                          >
                            Take to the dose console
                          </GlassButton>
                        </li>
                      );
                    })}
                  </ul>

                  {!selectedReferral ? (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Choose a patient from the caseload before prescribing from a pathway.
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      The dose console opens with the protocol dose filled in. Review it against{" "}
                      {patientName} before prescribing — the suggestion is a starting point, not a
                      decision.
                    </p>
                  )}
                </GlassWell>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Select a milestone to see the exercises it would prescribe.
                </p>
              )}
            </div>
          ) : null}
        </GlassModal>
      </div>
    );
  }

  /* -------------------------------------------------------------- */
  /* Tab: precaution orders                                          */
  /* -------------------------------------------------------------- */

  function renderOrders() {
    if (!selectedReferral) return needPatient("A precaution order");

    const selectedWeightBearing = weightBearing ? weightBearingByValue(weightBearing) : null;

    return (
      <div className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-2">
          <GlassPanel
            title="Weight-bearing status"
            subtitle="What load this patient may put through the limb"
            icon={<Footprints size={16} />}
            accent="#f59e0b"
          >
            <SegmentedControl
              label="Order"
              columns={1}
              value={weightBearing}
              onChange={setWeightBearing}
              options={WEIGHT_BEARING_OPTIONS.map((option) => ({
                value: option.value,
                label: `${option.label} (${option.code})`,
                detail: option.detail,
                hue:
                  option.loadPercent === 0
                    ? "#ef4444"
                    : option.loadPercent < 60
                      ? "#f59e0b"
                      : "#10b981",
              }))}
            />

            {selectedWeightBearing ? (
              <div className="mt-4">
                <MeterBar
                  label="Permitted load through the limb"
                  value={selectedWeightBearing.loadPercent}
                  max={100}
                  accent="#f59e0b"
                  valueLabel={`${selectedWeightBearing.loadPercent}% of body weight`}
                />
              </div>
            ) : null}
          </GlassPanel>

          <GlassPanel
            title="Active precautions"
            subtitle="Select every set that applies. They travel with the referral."
            icon={<ShieldAlert size={16} />}
            accent="#ef4444"
          >
            <div className="space-y-2">
              {PRECAUTION_SETS.map((set) => {
                const active = precautionValues.includes(set.value);

                return (
                  <div key={set.value}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setPrecautionValues((previous) =>
                          previous.includes(set.value)
                            ? previous.filter((value) => value !== set.value)
                            : [...previous, set.value],
                        )
                      }
                      className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition ${
                        active
                          ? "border-rose-400/60 bg-rose-500/10"
                          : "border-slate-300/45 hover:border-slate-400/60 dark:border-white/10"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          aria-hidden
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[9px] font-bold ${
                            active
                              ? "border-rose-500 bg-rose-500 text-white"
                              : "border-slate-400/60"
                          }`}
                        >
                          {active ? "✓" : ""}
                        </span>
                        <span className="truncate text-[11px] font-semibold text-slate-800 dark:text-slate-100">
                          {set.label}
                        </span>
                      </span>

                      <span
                        className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
                        style={{
                          background: set.band === "HPB" ? "#7c3aed22" : "#0891b222",
                          color: set.band === "HPB" ? "#7c3aed" : ACCENT,
                        }}
                      >
                        {set.band === "HPB" ? "HPB" : "General"}
                      </span>
                    </button>

                    {active ? (
                      <ul className="mt-1 space-y-0.5 pl-9">
                        {set.rules.map((rule) => (
                          <li
                            key={rule}
                            className="text-[10px] leading-4 text-slate-500 dark:text-slate-400"
                          >
                            • {rule}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </GlassPanel>
        </div>

        <GlassPanel
          title="Publish to the surgical team"
          subtitle="Orders land on the referral and, when there is one, on the care plan the ward reads"
          icon={<ShieldCheck size={16} />}
          accent="#059669"
        >
          <div className="space-y-4">
            <GlassField label="Additional instructions" htmlFor="order-notes">
              <GlassTextarea
                id="order-notes"
                rows={3}
                value={orderNotes}
                placeholder="e.g. Two-person assist for all standing work until the epidural is removed."
                onChange={(event) => setOrderNotes(event.target.value)}
              />
            </GlassField>

            <SwitchRow
              checked={dischargeCleared}
              onChange={setDischargeCleared}
              label="Physiotherapy discharge mobility clearance"
              description="Certifies this patient has met the functional ambulation and stair criteria for discharge."
            />

            {(weightBearing || precautionValues.length > 0 || orderNotes.trim() || dischargeCleared) ? (
              <GlassWell>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  What will be published
                </p>
                <p className="mt-1.5 text-[11px] leading-5 text-slate-700 dark:text-slate-200">
                  {buildOrderSummary(weightBearing, precautionValues, orderNotes, dischargeCleared)}
                </p>
              </GlassWell>
            ) : null}

            <GlassButton
              variant="solid"
              accent="#059669"
              icon={<Send size={14} />}
              disabled={busyAction === "orders"}
              onClick={publishOrders}
            >
              {busyAction === "orders" ? "Publishing…" : "Publish precaution orders"}
            </GlassButton>
          </div>
        </GlassPanel>

        {renderCareTeamPanel()}
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
        eyebrow="Allied health · Physiotherapy and rehabilitation"
        title="Physiotherapy workspace"
        description="General physiotherapy and the HPB surgical service in one place — assess, prescribe, order and hand off, always against a patient you have chosen."
        chips={[
          { label: "referrals in your caseload", value: String(referrals.length), solid: true },
          { label: "waiting to be accepted", value: String(pendingCount) },
          {
            label: "exercises available",
            value: String(EXERCISE_TEMPLATES.length + library.length),
          },
          { label: "recovery pathways", value: String(RECOVERY_PATHWAYS.length) },
        ]}
        actions={
          <>
            <GlassButton
              variant="onAurora"
              icon={<ListPlus size={14} />}
              onClick={() => setShowAuthorModal(true)}
            >
              Author an exercise
            </GlassButton>

            <GlassButton
              variant="onAurora"
              icon={<RefreshCw size={13} className={isLoadingCaseload ? "animate-spin" : ""} />}
              onClick={refreshCaseload}
              disabled={isLoadingCaseload}
            >
              Refresh caseload
            </GlassButton>

            <Link
              href="/operations/physiotherapy/profile"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-[rgb(255_255_255_/_0.15)] px-4 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-[rgb(255_255_255_/_0.25)]"
            >
              <Compass size={14} /> Preferences
            </Link>
          </>
        }
        aside={
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
            {[
              { label: "HPB templates", value: EXERCISE_TEMPLATES.filter((t) => t.band === "HPB").length, icon: HeartPulse },
              { label: "General templates", value: EXERCISE_TEMPLATES.filter((t) => t.band === "GENERAL").length, icon: Dumbbell },
              { label: "Your library", value: library.length, icon: BookOpen },
              { label: "Active plans", value: roster.length, icon: Users },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/15 bg-[rgb(255_255_255_/_0.10)] px-3.5 py-3 backdrop-blur"
              >
                <item.icon aria-hidden size={14} className="text-cyan-200" />
                <p className="mt-1.5 text-lg font-semibold tabular-nums text-white">{item.value}</p>
                <p className="text-[10px] text-indigo-100/75">{item.label}</p>
              </div>
            ))}
          </div>
        }
      />

      {feedback ? (
        <Notice
          tone={feedback.tone}
          title={feedback.title}
          onDismiss={() => setFeedback(null)}
        >
          {feedback.detail}
        </Notice>
      ) : null}

      {renderPatientStrip()}

      <div className="wfg-pt-rise">
        {activeTab === "overview" ? renderOverview() : null}
        {activeTab === "caseload" ? renderCaseload() : null}
        {activeTab === "studio" ? renderStudio() : null}
        {activeTab === "assessment" ? renderAssessment() : null}
        {activeTab === "pathways" ? renderPathways() : null}
        {activeTab === "orders" ? renderOrders() : null}
      </div>

      {/* Author an exercise */}
      <GlassModal
        open={showAuthorModal}
        onClose={() => setShowAuthorModal(false)}
        title="Author an exercise"
        subtitle="Saved to your hospital's library for the whole physiotherapy department"
        icon={<Plus size={16} />}
        accent={ACCENT}
        footer={
          <>
            <GlassButton onClick={() => setShowAuthorModal(false)}>Cancel</GlassButton>
            <GlassButton
              variant="solid"
              accent={ACCENT}
              form="author-exercise-form"
              type="submit"
              disabled={busyAction === "author"}
            >
              {busyAction === "author" ? "Saving…" : "Save to the library"}
            </GlassButton>
          </>
        }
      >
        <form id="author-exercise-form" onSubmit={saveAuthoredExercise} className="space-y-4">
          <GlassField label="Exercise name" htmlFor="author-name" required>
            <GlassInput
              id="author-name"
              required
              value={authorDraft.name}
              placeholder="e.g. Scapular retraction with a yellow resistance band"
              onChange={(event) =>
                setAuthorDraft((previous) => ({ ...previous, name: event.target.value }))
              }
            />
          </GlassField>

          <SegmentedControl
            label="Category"
            columns={2}
            value={authorDraft.category}
            onChange={(next) =>
              setAuthorDraft((previous) => ({ ...previous, category: next as ExerciseCategory }))
            }
            options={CATEGORY_ORDER.map((category) => ({
              value: category,
              label: CATEGORY_LABELS[category],
              detail: CATEGORY_BLURB[category],
              hue: CATEGORY_HUE[category],
            }))}
          />

          <GlassField
            label="Instructions and cueing"
            htmlFor="author-instruction"
            required
            hint="This is the text the patient reads on their phone."
          >
            <GlassTextarea
              id="author-instruction"
              rows={4}
              required
              value={authorDraft.instruction}
              placeholder="Describe the position, the movement, the pace and the breathing cue."
              onChange={(event) =>
                setAuthorDraft((previous) => ({ ...previous, instruction: event.target.value }))
              }
            />
          </GlassField>

          <GlassField label="Precautions and contraindications" htmlFor="author-precautions">
            <GlassInput
              id="author-precautions"
              value={authorDraft.precautions}
              placeholder="e.g. Splint the incision, stop for shoulder-tip pain, no breath-holding"
              onChange={(event) =>
                setAuthorDraft((previous) => ({ ...previous, precautions: event.target.value }))
              }
            />
          </GlassField>

          <div className="grid grid-cols-3 gap-3">
            <Stepper
              label="Default reps"
              value={authorDraft.repetitions}
              min={1}
              max={100}
              onChange={(next) =>
                setAuthorDraft((previous) => ({ ...previous, repetitions: next }))
              }
            />
            <Stepper
              label="Default sets"
              value={authorDraft.sets}
              min={1}
              max={12}
              onChange={(next) => setAuthorDraft((previous) => ({ ...previous, sets: next }))}
            />
            <Stepper
              label="Hold"
              unit="seconds"
              value={authorDraft.holdSeconds}
              min={0}
              max={300}
              onChange={(next) =>
                setAuthorDraft((previous) => ({ ...previous, holdSeconds: next }))
              }
            />
          </div>

          <p className="text-[11px] leading-4 text-slate-500 dark:text-slate-400">
            Defaults are a starting point the dose console offers you — they are never applied to a
            patient without you setting the dose.
          </p>
        </form>
      </GlassModal>

      {/* Refer to nutrition */}
      <GlassModal
        open={showNutritionModal}
        onClose={() => setShowNutritionModal(false)}
        title="Ask dietetics to review"
        subtitle={
          patientName
            ? `Posted to the care plan for the surgical team and the dietitian`
            : "Choose a patient first"
        }
        icon={<Apple size={16} />}
        accent="#10b981"
        width="max-w-xl"
        footer={
          <>
            <GlassButton onClick={() => setShowNutritionModal(false)}>Cancel</GlassButton>
            <GlassButton
              variant="solid"
              accent="#059669"
              form="nutrition-referral-form"
              type="submit"
              disabled={
                busyAction === "nutrition" || !nutritionDraft.reason.trim() || !rosterEntry
              }
            >
              {busyAction === "nutrition" ? "Sending…" : "Send the request"}
            </GlassButton>
          </>
        }
      >
        <form id="nutrition-referral-form" onSubmit={askDietetics} className="space-y-4">
          <p className="text-[11px] leading-5 text-slate-500 dark:text-slate-400">
            Physiotherapy and nutrition run together after HPB surgery: strength work does not hold
            without the protein and enzyme replacement behind it. This request goes onto the care
            plan, where the managing surgeon and any assigned dietitian read it. The formal
            nutrition referral is raised by the doctor, who is the only role the referral record
            can attribute one to.
          </p>

          <GlassField label="Why dietetics should look" htmlFor="nutrition-reason" required>
            <GlassTextarea
              id="nutrition-reason"
              rows={3}
              required
              value={nutritionDraft.reason}
              placeholder="e.g. Sarcopenic, unable to progress resistance work, weight down 6 kg since admission."
              onChange={(event) =>
                setNutritionDraft((previous) => ({ ...previous, reason: event.target.value }))
              }
            />
          </GlassField>

          <GlassField label="Goal" htmlFor="nutrition-goal">
            <GlassInput
              id="nutrition-goal"
              value={nutritionDraft.goal}
              placeholder="e.g. Protein intake sufficient to support daily strengthening"
              onChange={(event) =>
                setNutritionDraft((previous) => ({ ...previous, goal: event.target.value }))
              }
            />
          </GlassField>

          <SegmentedControl
            label="Priority"
            columns={3}
            value={nutritionDraft.priority}
            onChange={(next) => setNutritionDraft((previous) => ({ ...previous, priority: next }))}
            options={[
              { value: "ROUTINE", label: "Routine", hue: "#0891b2" },
              { value: "URGENT", label: "Urgent", hue: "#f59e0b" },
              { value: "EMERGENCY", label: "Emergency", hue: "#ef4444" },
            ]}
          />
        </form>
      </GlassModal>

      <p className="flex items-center justify-center gap-1.5 pb-2 text-[11px] text-slate-400 dark:text-slate-500">
        <Wind aria-hidden size={12} />
        WonFlow physiotherapy · general rehabilitation and the HPB surgical service
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

function buildOrderSummary(
  weightBearing: string | null,
  precautions: string[],
  notes: string,
  cleared: boolean,
): string {
  const parts: string[] = [];

  const wb = weightBearing ? weightBearingByValue(weightBearing) : null;
  if (wb) parts.push(`${wb.label} (${wb.code}).`);

  if (precautions.length > 0) {
    const labels = precautions
      .map((value) => precautionByValue(value)?.label)
      .filter((label): label is string => Boolean(label));
    parts.push(`Precautions in force: ${labels.join("; ")}.`);
  }

  if (notes.trim()) parts.push(notes.trim());

  if (cleared) {
    parts.push("Physiotherapy discharge mobility clearance certified.");
  }

  return parts.join(" ");
}
