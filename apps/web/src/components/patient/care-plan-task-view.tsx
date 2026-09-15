"use client";

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Droplet,
  FileCheck2,
  HeartPulse,
  Info,
  Layers,
  MessageSquare,
  Pill,
  RefreshCw,
  Sparkles,
  Stethoscope,
  Thermometer,
  Upload,
  UserCheck,
  Video,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DonutChart, RadialMeter, type DonutSlice } from "@/components/charts";

export interface CarePlanTaskItem {
  id: string;
  tenantId: string;
  carePlanId: string;
  taskType:
    | "MEDICATION"
    | "VITALS_LOG"
    | "DRAIN_LOG"
    | "WOUND_PHOTO"
    | "DIET_LOG"
    | "EXERCISE"
    | "QUESTIONNAIRE"
    | "APPOINTMENT"
    | "EDUCATION";
  stageNumber: number;
  dayNumber: number;
  scheduledFor: string;
  dueBy?: string | null;
  title: string;
  instructions?: string | null;
  status: "PENDING" | "COMPLETED" | "SKIPPED" | "MISSED";
  completedAt?: string | null;
  resultData?: Record<string, unknown> | null;
  skipReason?: string | null;
}

export interface CarePlanDetails {
  id: string;
  category: string;
  title: string;
  status: string;
  startDate: string;
  endDate?: string | null;
  currentStage: number;
  managingDoctorName: string;
  stages?: Array<{ stageNumber: number; title: string; daysFromStart: [number, number]; description?: string }>;
  tasks: CarePlanTaskItem[];
  alerts: Array<{ id: string; severity: string; status: string; title: string; message: string; createdAt: string }>;
}

export function CarePlanTaskView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    carePlan: CarePlanDetails | null;
    patient: { id: string; name: string };
    isCaregiver: boolean;
    relationship?: string;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<"today" | "upcoming" | "history">("today");
  const [selectedTask, setSelectedTask] = useState<CarePlanTaskItem | null>(null);
  const [completing, setCompleting] = useState(false);
  const [successCelebration, setSuccessCelebration] = useState<string | null>(null);
  const [clinicalAlertNotice, setClinicalAlertNotice] = useState<string | null>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const autoCloseTimer = useRef<number | null>(null);

  // Form states for active modal
  const [systolic, setSystolic] = useState("120");
  const [diastolic, setDiastolic] = useState("80");
  const [heartRate, setHeartRate] = useState("72");
  const [temperature, setTemperature] = useState("36.6");
  const [oxygenSat, setOxygenSat] = useState("98");

  const [drainVolume, setDrainVolume] = useState("45");
  const [drainColor, setDrainColor] = useState("serosanguineous");
  const [drainClarity, setDrainClarity] = useState("clear");
  const [drainPain, setDrainPain] = useState("2");

  const [woundPhotoData, setWoundPhotoData] = useState<string | null>(null);
  const [woundRedness, setWoundRedness] = useState(false);
  const [woundSwelling, setWoundSwelling] = useState(false);
  const [woundWarmth, setWoundWarmth] = useState(false);
  const [woundDischarge, setWoundDischarge] = useState(false);

  const [exerciseDuration, setExerciseDuration] = useState("15");
  const [exerciseRpe, setExerciseRpe] = useState("3");

  const [dietDescription, setDietDescription] = useState("Normal light lunch");
  const [dietFluidMl, setDietFluidMl] = useState("500");
  const [dietTolerance, setDietTolerance] = useState("good");

  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<Record<string, number>>({ q1: 0, q2: 0 });

  /**
   * `background` refreshes the plan without the full-page loading state.
   *
   * Completing a task used to reload with the spinner, which unmounted the
   * whole screen - task dialog, success message and all - so the patient saw
   * the dialog freeze for a moment and then the page "refresh" under them.
   */
  const loadCarePlan = useCallback(async ({ background = false }: { background?: boolean } = {}) => {
    try {
      if (!background) setLoading(true);
      setError(null);
      const res = await fetch("/api/v1/patient/careplan", { credentials: "include" });
      if (!res.ok) {
        throw new Error("Failed to load care plan.");
      }
      const json = await res.json();
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading care plan");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const res = await fetch("/api/v1/patient/careplan", { credentials: "include" });
        if (!res.ok) {
          throw new Error("Failed to load care plan.");
        }
        const json = await res.json();
        if (mounted) {
          setData(json);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Error loading care plan");
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);


  const tasks = useMemo(() => data?.carePlan?.tasks ?? [], [data?.carePlan?.tasks]);

  const categorizedTasks = useMemo(() => {
    const today = new Date();
    const todayYmd = today.toISOString().split("T")[0];

    const todayList: CarePlanTaskItem[] = [];
    const upcomingList: CarePlanTaskItem[] = [];
    const historyList: CarePlanTaskItem[] = [];

    for (const t of tasks) {
      if (t.status === "COMPLETED" || t.status === "SKIPPED") {
        historyList.push(t);
        continue;
      }
      const taskYmd = t.scheduledFor.split("T")[0];
      if (taskYmd === todayYmd || new Date(t.scheduledFor) <= today) {
        todayList.push(t);
      } else {
        upcomingList.push(t);
      }
    }

    return { todayList, upcomingList, historyList };
  }, [tasks]);

  /**
   * Tasks the patient finished TODAY.
   *
   * This cannot come from `todayList`: the loop above sends anything
   * COMPLETED or SKIPPED to `historyList` before it ever reaches the
   * today/upcoming split, so filtering `todayList` for COMPLETED matches
   * nothing and the counter sat at 0 all day no matter how much the
   * patient did. It has to be read back out of the history list, dated.
   */
  const todayCompleted = useMemo(() => {
    const todayYmd = new Date().toISOString().split("T")[0];

    return categorizedTasks.historyList.filter(
      (task) => task.status === "COMPLETED" && task.scheduledFor.split("T")[0] === todayYmd,
    );
  }, [categorizedTasks.historyList]);

  const todayCompletedCount = todayCompleted.length;
  const totalTodayTasks = categorizedTasks.todayList.length + todayCompletedCount;

  /** Today's outstanding work, split by state. Status palette, not series. */
  const todayStatusMix = useMemo<DonutSlice[]>(
    () => [
      {
        id: "COMPLETED",
        label: "Done",
        value: todayCompletedCount,
        color: "var(--viz-good)",
      },
      {
        id: "PENDING",
        label: "Still to do",
        value: categorizedTasks.todayList.filter((task) => task.status === "PENDING").length,
        color: "var(--viz-mute-mark)",
      },
      {
        id: "MISSED",
        label: "Overdue",
        value: categorizedTasks.todayList.filter((task) => task.status === "MISSED").length,
        color: "var(--viz-critical)",
      },
    ],
    [categorizedTasks.todayList, todayCompletedCount],
  );

  /** What kind of work today is: vitals, drains, exercise, meals. */
  const todayTypeMix = useMemo<DonutSlice[]>(() => {
    const counts = new Map<string, number>();

    [...categorizedTasks.todayList, ...todayCompleted].forEach((task) => {
      counts.set(task.taskType, (counts.get(task.taskType) ?? 0) + 1);
    });

    return [...counts.entries()].map(([taskType, value]) => ({
      id: taskType,
      label: taskType
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/^./, (character) => character.toUpperCase()),
      value,
    }));
  }, [categorizedTasks.todayList, todayCompleted]);

  const clearAutoClose = () => {
    if (autoCloseTimer.current !== null) {
      window.clearTimeout(autoCloseTimer.current);
      autoCloseTimer.current = null;
    }
  };

  useEffect(() => clearAutoClose, []);

  const closeTask = () => {
    clearAutoClose();
    setSelectedTask(null);
    setSuccessCelebration(null);
    setClinicalAlertNotice(null);
    setCompleteError(null);
  };

  const handleOpenTask = (task: CarePlanTaskItem) => {
    clearAutoClose();
    setSelectedTask(task);
    setClinicalAlertNotice(null);
    setSuccessCelebration(null);
    setCompleteError(null);

    // Reset default form values
    if (task.taskType === "WOUND_PHOTO") {
      setWoundPhotoData(null);
      setWoundRedness(false);
      setWoundSwelling(false);
      setWoundWarmth(false);
      setWoundDischarge(false);
    }
  };

  const handleCompleteTask = async () => {
    if (!selectedTask) return;
    const task = selectedTask;
    let flaggedForReview = false;
    try {
      setCompleting(true);
      setClinicalAlertNotice(null);
      setCompleteError(null);

      let payloadObservation: { code: string; display: string; valueNumber?: number; unit?: string } | undefined;
      const resultData: Record<string, unknown> = {};

      if (selectedTask.taskType === "VITALS_LOG") {
        const sysVal = Number(systolic);
        payloadObservation = {
          code: "blood_pressure_systolic",
          display: "Systolic Blood Pressure",
          valueNumber: sysVal,
          unit: "mmHg",
        };
        resultData.diastolic = Number(diastolic);
        resultData.heartRate = Number(heartRate);
        resultData.temperature = Number(temperature);
        resultData.oxygenSat = Number(oxygenSat);

        if (sysVal > 180) {
          flaggedForReview = true;
          setClinicalAlertNotice(
            "Your blood pressure reading has been securely flagged for clinical review. Your care team has been notified.",
          );
        }
      } else if (selectedTask.taskType === "DRAIN_LOG") {
        const volVal = Number(drainVolume);
        payloadObservation = {
          code: "drain_output",
          display: "Surgical Drain Output",
          valueNumber: volVal,
          unit: "mL",
        };
        resultData.character = drainColor;
        resultData.clarity = drainClarity;
        resultData.painScore = Number(drainPain);
      } else if (selectedTask.taskType === "WOUND_PHOTO") {
        resultData.photoAttached = Boolean(woundPhotoData);
        resultData.redness = woundRedness;
        resultData.swelling = woundSwelling;
        resultData.warmth = woundWarmth;
        resultData.discharge = woundDischarge;
      } else if (selectedTask.taskType === "EXERCISE") {
        resultData.durationMinutes = Number(exerciseDuration);
        resultData.perceivedExertion = Number(exerciseRpe);
      } else if (selectedTask.taskType === "DIET_LOG") {
        resultData.meal = dietDescription;
        resultData.fluidMl = Number(dietFluidMl);
        resultData.tolerance = dietTolerance;
      } else if (selectedTask.taskType === "QUESTIONNAIRE") {
        resultData.answers = questionnaireAnswers;
      }

      const res = await fetch(`/api/v1/clinical/careplans/tasks/${selectedTask.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          observation: payloadObservation,
          resultData,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null) as { error?: string | { message?: string } } | null;
        const message = typeof body?.error === "string" ? body.error : body?.error?.message;
        throw new Error(message || "Your task could not be submitted. Please try again.");
      }

      // Show the finished state in place - the dialog stays put, the button
      // turns into a confirmation - and refresh the list quietly behind it.
      setSelectedTask({ ...task, status: "COMPLETED" });
      setSuccessCelebration(`Great job! "${task.title}" has been completed.`);
      void loadCarePlan({ background: true });

      // Close on its own unless a reading was flagged: that notice must be read.
      if (!flaggedForReview) {
        clearAutoClose();
        autoCloseTimer.current = window.setTimeout(() => {
          autoCloseTimer.current = null;
          setSelectedTask((current) => (current?.id === task.id ? null : current));
          setSuccessCelebration(null);
        }, 1800);
      }
    } catch (err: unknown) {
      setClinicalAlertNotice(null);
      setCompleteError(err instanceof Error ? err.message : "Your task could not be submitted. Please try again.");
    } finally {
      setCompleting(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setWoundPhotoData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
        <span className="ml-3 font-medium text-slate-600">Loading your recovery plan...</span>
      </div>
    );
  }

  if (error && !data?.carePlan) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        <div className="flex items-center space-x-3">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <h3 className="font-semibold text-red-800">Unable to load recovery plan</h3>
        </div>
        <p className="mt-2 text-sm">{error}</p>
        <button
          onClick={() => void loadCarePlan()}
          className="mt-4 inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Try Again
        </button>
      </div>
    );
  }

  const carePlan = data?.carePlan;

  if (!carePlan) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <HeartPulse className="mx-auto h-12 w-12 text-emerald-500" />
        <h2 className="mt-4 text-xl font-bold text-slate-900">No Active Recovery Plan</h2>
        <p className="mt-2 text-slate-600">
          You do not currently have an active post-discharge care plan assigned. When your doctor prescribes a protocol, your daily tasks and schedule will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner & Caregiver notice */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 p-6 text-white shadow-lg">
        {data?.isCaregiver && (
          <div className="mb-4 inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-md">
            <UserCheck className="mr-1.5 h-3.5 w-3.5 text-amber-300" />
            Logging as Caregiver for {data.patient.name} ({data.relationship})
          </div>
        )}

        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center space-x-2">
              <span className="rounded-md bg-emerald-500/30 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-100">
                {carePlan.category.replace(/_/g, " ")}
              </span>
              <span className="text-xs text-emerald-200">Stage {carePlan.currentStage} of 3</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
              {carePlan.title}
            </h1>
            <p className="mt-1 flex items-center text-sm text-emerald-100/90">
              <Stethoscope className="mr-1.5 h-4 w-4 text-emerald-300" />
              Managing Clinician: <span className="ml-1 font-semibold">{carePlan.managingDoctorName}</span>
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="rounded-xl bg-white/10 p-3 text-center backdrop-blur-md">
              <div className="text-2xl font-extrabold text-white">
                {todayCompletedCount} / {totalTodayTasks}
              </div>
              <div className="text-xs text-emerald-200">Today&apos;s Completed</div>
            </div>
          </div>
        </div>
      </div>

      {/* The day at a glance. One ring for "how far through am I", one
          donut for "what is the day actually made of". */}
      {totalTodayTasks > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(11,18,32,0.04)]">
            <RadialMeter
              value={todayCompletedCount}
              target={totalTodayTasks}
              label="Today's progress"
              caption={`${todayCompletedCount} of ${totalTodayTasks} done`}
              size={132}
              thickness={11}
            />
          </div>

          <DonutChart
            title="Today's tasks"
            subtitle="Where you are up to"
            slices={todayStatusMix}
            centerValue={`${todayCompletedCount}/${totalTodayTasks}`}
            centerLabel="Done"
            size={168}
            thickness={20}
            emptyMessage="Nothing scheduled today"
          />

          <DonutChart
            title="What today asks of you"
            subtitle="Tasks by type"
            slices={todayTypeMix}
            centerLabel="Tasks"
            size={168}
            thickness={20}
            emptyMessage="Nothing scheduled today"
            footnote="Each type comes from a different member of your care team."
          />
        </div>
      ) : null}

      {/* Active Clinical Alerts if any */}
      {carePlan.alerts.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" />
            <div>
              <h4 className="font-semibold text-amber-900">Clinical Notification</h4>
              <p className="mt-0.5 text-sm text-amber-800">
                {carePlan.alerts[0]?.message} — Your care team has been notified.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("today")}
          className={`flex items-center rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "today"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Clock className="mr-2 h-4 w-4" />
          Today&apos;s Tasks ({categorizedTasks.todayList.length})
        </button>
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`flex items-center rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "upcoming"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Calendar className="mr-2 h-4 w-4" />
          Upcoming Schedule ({categorizedTasks.upcomingList.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "history"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <FileCheck2 className="mr-2 h-4 w-4" />
          Completed History ({categorizedTasks.historyList.length})
        </button>
      </div>

      {/* Task List Rendering */}
      <div className="space-y-3">
        {activeTab === "today" && (
          <>
            {categorizedTasks.todayList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                <p className="mt-2 font-medium">All tasks for today are complete!</p>
              </div>
            ) : (
              categorizedTasks.todayList.map((task) => (
                <TaskCard key={task.id} task={task} onSelect={() => handleOpenTask(task)} />
              ))
            )}
          </>
        )}

        {activeTab === "upcoming" && (
          <>
            {categorizedTasks.upcomingList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                No upcoming scheduled tasks.
              </div>
            ) : (
              categorizedTasks.upcomingList.map((task) => (
                <TaskCard key={task.id} task={task} onSelect={() => handleOpenTask(task)} isFuture />
              ))
            )}
          </>
        )}

        {activeTab === "history" && (
          <>
            {categorizedTasks.historyList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                No completed tasks recorded yet.
              </div>
            ) : (
              categorizedTasks.historyList.map((task) => (
                <TaskCard key={task.id} task={task} onSelect={() => handleOpenTask(task)} isCompleted />
              ))
            )}
          </>
        )}
      </div>

      {/* Task Execution Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <span className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                  <TaskIcon type={selectedTask.taskType} />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900">{selectedTask.title}</h3>
                  <p className="text-xs text-slate-500">
                    Day {selectedTask.dayNumber} • Scheduled for {new Date(selectedTask.scheduledFor).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
              <button
                onClick={closeTask}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {selectedTask.instructions && (
              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                <Info className="mr-1.5 inline h-3.5 w-3.5 text-slate-500" />
                {selectedTask.instructions}
              </div>
            )}

            {/* Success Celebration state */}
            {successCelebration && (
              <div className="my-4 rounded-xl bg-emerald-50 p-4 text-center text-emerald-800">
                <Sparkles className="mx-auto h-8 w-8 text-emerald-600" />
                <p className="mt-1 font-bold">{successCelebration}</p>
              </div>
            )}

            {completeError && (
              <div className="my-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700" role="alert">
                <AlertCircle className="mr-1.5 inline h-4 w-4 text-red-600" />
                {completeError}
              </div>
            )}

            {/* Clinical Alert reassurance notice */}
            {clinicalAlertNotice && (
              <div className="my-4 rounded-xl bg-amber-50 p-4 text-xs text-amber-900">
                <AlertTriangle className="mr-1.5 inline h-4 w-4 text-amber-600" />
                {clinicalAlertNotice}
              </div>
            )}

            {/* Specialized Form Content */}
            <div className="my-5 space-y-4">
              {selectedTask.taskType === "VITALS_LOG" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Systolic BP (mmHg)
                      </label>
                      <input
                        type="number"
                        value={systolic}
                        onChange={(e) => setSystolic(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                        placeholder="120"
                      />
                      <span className="text-[10px] text-slate-500">Normal: 90 - 130</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Diastolic BP (mmHg)
                      </label>
                      <input
                        type="number"
                        value={diastolic}
                        onChange={(e) => setDiastolic(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                        placeholder="80"
                      />
                      <span className="text-[10px] text-slate-500">Normal: 60 - 85</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Heart Rate (bpm)</label>
                      <input
                        type="number"
                        value={heartRate}
                        onChange={(e) => setHeartRate(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                        placeholder="72"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Temp (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={temperature}
                        onChange={(e) => setTemperature(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                        placeholder="36.6"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">SpO2 (%)</label>
                      <input
                        type="number"
                        value={oxygenSat}
                        onChange={(e) => setOxygenSat(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                        placeholder="98"
                      />
                    </div>
                  </div>
                </div>
              )}

              {selectedTask.taskType === "DRAIN_LOG" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Drain Output Volume (mL)</label>
                    <input
                      type="number"
                      value={drainVolume}
                      onChange={(e) => setDrainVolume(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                      placeholder="45"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Fluid Character</label>
                    <select
                      value={drainColor}
                      onChange={(e) => setDrainColor(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="serous">Serous (Clear / Pale Yellow)</option>
                      <option value="serosanguineous">Serosanguineous (Pink / Watery Red)</option>
                      <option value="sanguineous">Sanguineous (Bright Red / Bloody)</option>
                      <option value="purulent">Purulent (Thick / Cloudy / Foul)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Drain Site Pain Level (0 - 10): <span className="font-bold text-emerald-700">{drainPain}</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={drainPain}
                      onChange={(e) => setDrainPain(e.target.value)}
                      className="mt-2 w-full accent-emerald-600"
                    />
                  </div>
                </div>
              )}

              {selectedTask.taskType === "WOUND_PHOTO" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Upload Incision Photo</label>
                    <div className="mt-2 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-4 text-center hover:border-emerald-500">
                      {woundPhotoData ? (
                        <div className="space-y-2">
                          <img
                            src={woundPhotoData}
                            alt="Wound preview"
                            className="max-h-40 rounded-lg object-cover shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setWoundPhotoData(null)}
                            className="text-xs font-medium text-red-600 hover:underline"
                          >
                            Remove / Retake
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <Camera className="mx-auto h-8 w-8 text-slate-400" />
                          <span className="mt-1 block text-xs font-medium text-slate-600">
                            Click or tap to take/upload photo
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-3">
                    <span className="text-xs font-semibold text-slate-700">Incision Symptom Checklist</span>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-700">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={woundRedness}
                          onChange={(e) => setWoundRedness(e.target.checked)}
                          className="rounded text-emerald-600"
                        />
                        <span>Significant redness</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={woundSwelling}
                          onChange={(e) => setWoundSwelling(e.target.checked)}
                          className="rounded text-emerald-600"
                        />
                        <span>Notable swelling</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={woundWarmth}
                          onChange={(e) => setWoundWarmth(e.target.checked)}
                          className="rounded text-emerald-600"
                        />
                        <span>Warmth to touch</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={woundDischarge}
                          onChange={(e) => setWoundDischarge(e.target.checked)}
                          className="rounded text-emerald-600"
                        />
                        <span>Unusual drainage</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {selectedTask.taskType === "EXERCISE" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Duration (minutes)</label>
                    <input
                      type="number"
                      value={exerciseDuration}
                      onChange={(e) => setExerciseDuration(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Perceived Exertion (1 = very light, 10 = max effort): {exerciseRpe}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={exerciseRpe}
                      onChange={(e) => setExerciseRpe(e.target.value)}
                      className="mt-2 w-full accent-emerald-600"
                    />
                  </div>
                </div>
              )}

              {selectedTask.taskType === "DIET_LOG" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Meal Description</label>
                    <input
                      type="text"
                      value={dietDescription}
                      onChange={(e) => setDietDescription(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Fluid Intake (mL)</label>
                    <input
                      type="number"
                      value={dietFluidMl}
                      onChange={(e) => setDietFluidMl(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {selectedTask.taskType === "EDUCATION" && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-900">
                  <p className="font-semibold">Patient Educational Material</p>
                  <p className="mt-1">
                    Please review the prescribed clinical instructions above carefully. Confirm when read.
                  </p>
                </div>
              )}

              {selectedTask.taskType === "APPOINTMENT" && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-800">
                  <p className="font-bold">Scheduled Clinical Visit</p>
                  <p className="mt-1">Review time and location with your clinic coordinator.</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex justify-end space-x-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={closeTask}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>

              {selectedTask.status !== "COMPLETED" && (
                <button
                  type="button"
                  disabled={completing}
                  onClick={() => void handleCompleteTask()}
                  className="inline-flex items-center rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  {completing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Complete Task
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCard({
  task,
  onSelect,
  isFuture,
  isCompleted,
}: {
  task: CarePlanTaskItem;
  onSelect: () => void;
  isFuture?: boolean;
  isCompleted?: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      className={`group flex cursor-pointer items-center justify-between rounded-xl border p-4 transition ${
        isCompleted
          ? "border-emerald-200 bg-emerald-50/40 opacity-85 hover:bg-emerald-50"
          : isFuture
            ? "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
            : "border-emerald-200 bg-white shadow-sm hover:border-emerald-400 hover:shadow-md"
      }`}
    >
      <div className="flex items-center space-x-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            isCompleted
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-700"
          }`}
        >
          <TaskIcon type={task.taskType} />
        </div>

        <div>
          <div className="flex items-center space-x-2">
            <h4
              className={`font-semibold ${
                isCompleted ? "text-slate-700 line-through" : "text-slate-900"
              }`}
            >
              {task.title}
            </h4>
            {isCompleted && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                Done
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Day {task.dayNumber} •{" "}
            {new Date(task.scheduledFor).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>

      <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-emerald-600" />
    </div>
  );
}

function TaskIcon({ type }: { type: CarePlanTaskItem["taskType"] }) {
  switch (type) {
    case "VITALS_LOG":
      return <HeartPulse className="h-5 w-5 text-rose-500" />;
    case "DRAIN_LOG":
      return <Droplet className="h-5 w-5 text-blue-500" />;
    case "WOUND_PHOTO":
      return <Camera className="h-5 w-5 text-amber-500" />;
    case "MEDICATION":
      return <Pill className="h-5 w-5 text-indigo-500" />;
    case "EXERCISE":
      return <Activity className="h-5 w-5 text-emerald-500" />;
    case "DIET_LOG":
      return <Droplet className="h-5 w-5 text-teal-500" />;
    case "QUESTIONNAIRE":
      return <MessageSquare className="h-5 w-5 text-purple-500" />;
    case "APPOINTMENT":
      return <Calendar className="h-5 w-5 text-cyan-500" />;
    case "EDUCATION":
      return <Layers className="h-5 w-5 text-slate-500" />;
    default:
      return <Activity className="h-5 w-5 text-emerald-500" />;
  }
}
