"use client";

import {
  AlertCircle,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  HelpCircle,
  Languages,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  Video,
  X,
} from "lucide-react";

import { useCallback, useEffect, useState } from "react";
import type {
  EducationAssignmentItem,
  EducationComprehensionQuestion,
  EducationContentItem,
  PatientEducationLibrary,
} from "@wonflow/contracts";

export function PatientEducationLibraryView() {
  const [library, setLibrary] = useState<PatientEducationLibrary | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<string>("en");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Active Viewing Modal
  const [selectedAssignment, setSelectedAssignment] = useState<EducationAssignmentItem | null>(null);
  const [selectedContent, setSelectedContent] = useState<EducationContentItem | null>(null);

  // Interactive Video Player Simulator State
  const [isPlaying, setIsPlaying] = useState(false);
  const [watchedSeconds, setWatchedSeconds] = useState(0);

  // Quiz State
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [quizError, setQuizError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  const loadLibrary = useCallback(async (lang: string) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/v1/patient/education?language=${lang}`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to load education library.");
      }

      const data = (await res.json()) as PatientEducationLibrary;
      setLibrary(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading education library.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      if (mounted) {
        await loadLibrary(language);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [language, loadLibrary]);

  // Video timer simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setWatchedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  const handleOpenModule = (assignment?: EducationAssignmentItem, content?: EducationContentItem) => {
    const targetContent = assignment ? assignment.content : content;
    if (!targetContent) return;

    setSelectedAssignment(assignment || null);
    setSelectedContent(targetContent);
    setIsPlaying(false);
    setWatchedSeconds(assignment?.completion?.watchedSeconds || 0);
    setSelectedAnswers({});
    setQuizError(null);
  };

  const handleCloseModule = () => {
    setIsPlaying(false);
    setSelectedAssignment(null);
    setSelectedContent(null);
  };

  const handleCompleteModule = async () => {
    if (!selectedAssignment) return;

    const content = selectedAssignment.content;

    // Check quiz if required
    if (content.hasComprehensionCheck && content.comprehensionQuestions) {
      const questions = content.comprehensionQuestions as EducationComprehensionQuestion[];
      for (const q of questions) {
        if (selectedAnswers[q.id] === undefined) {
          setQuizError("Please answer all comprehension check questions before submitting.");
          return;
        }
      }
    }

    try {
      setCompleting(true);
      setQuizError(null);

      const res = await fetch("/api/v1/patient/education/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          assignmentId: selectedAssignment.id,
          watchedSeconds: Math.max(watchedSeconds, 60), // ensure logged progress
          selectedAnswers,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message || "Failed to log completion.");
      }

      setSuccessMessage(`Module "${content.title}" completed!`);
      handleCloseModule();
      await loadLibrary(language);
    } catch (err: unknown) {
      setQuizError(err instanceof Error ? err.message : "Error completing module.");
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl bg-linear-to-r from-teal-900 via-slate-900 to-indigo-950 p-6 text-white shadow-xl sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-teal-400" />
            <h2 className="text-xl font-black tracking-tight">Recovery & Surgical Education</h2>
          </div>
          <p className="mt-1 text-xs text-teal-200/80">
            Learn about your pre-operative preparation, surgical drain care, wound recovery, and nutrition guidance.
          </p>
        </div>

        {/* Language Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-2xl border border-white/20 bg-white/10 p-1">
            <button
              onClick={() => setLanguage("en")}
              className={`flex items-center gap-1 rounded-xl px-3 py-1 text-xs font-bold transition-colors ${
                language === "en" ? "bg-teal-500 text-slate-950" : "text-white hover:bg-white/10"
              }`}
            >
              <Languages className="h-3 w-3" />
              English
            </button>
            <button
              onClick={() => setLanguage("ur")}
              className={`flex items-center gap-1 rounded-xl px-3 py-1 text-xs font-bold transition-colors ${
                language === "ur" ? "bg-teal-500 text-slate-950" : "text-white hover:bg-white/10"
              }`}
            >
              <Languages className="h-3 w-3" />
              اردو (Urdu)
            </button>
          </div>

          <button
            onClick={() => void loadLibrary(language)}
            disabled={loading}
            className="rounded-xl border border-white/20 bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-xs font-bold text-teal-700 dark:border-teal-900/50 dark:bg-teal-950/50 dark:text-teal-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Section 1: Assigned Learning Modules (Primary Focus) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Assigned by Your Care Team ({library?.assigned.length || 0})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">Essential for your care pathway</span>
        </div>

        {library && library.assigned.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-center text-slate-400 dark:border-slate-800">
            <BookOpen className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="text-xs font-bold">No active assignments pending</p>
            <p className="mt-1 text-[11px]">
              You are all caught up! Explore the full education library below.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {library?.assigned.map((a) => (
              <div
                key={a.id}
                onClick={() => handleOpenModule(a)}
                className={`group flex cursor-pointer flex-col justify-between rounded-3xl border p-5 transition-all hover:shadow-lg ${
                  a.isCompleted
                    ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                    : a.isOverdue || a.isPreOp
                    ? "border-amber-300 bg-amber-50/40 shadow-xs dark:border-amber-900/50 dark:bg-amber-950/20"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-black uppercase text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                      {a.content.category}
                    </span>

                    {a.isCompleted ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" /> Completed
                      </span>
                    ) : a.isOverdue ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                        <Clock className="h-3 w-3" /> Overdue
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        <Clock className="h-3 w-3" /> Assigned
                      </span>
                    )}
                  </div>

                  <h4 className="mt-3 text-sm font-black text-slate-900 transition-colors group-hover:text-teal-600 dark:text-white dark:group-hover:text-teal-400">
                    {a.content.title}
                  </h4>

                  {a.content.description && (
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">{a.content.description}</p>
                  )}

                  <div className="mt-4 flex items-center gap-3 text-[11px] font-medium text-slate-500">
                    <span className="flex items-center gap-1">
                      {a.content.contentType === "VIDEO" ? (
                        <Video className="h-3.5 w-3.5 text-indigo-500" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 text-teal-500" />
                      )}
                      {a.content.contentType}
                    </span>
                    {a.content.durationSeconds && (
                      <span>{Math.round(a.content.durationSeconds / 60)} mins</span>
                    )}
                    {a.content.hasComprehensionCheck && (
                      <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                        <HelpCircle className="h-3 w-3" /> Quiz
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3 text-[11px] font-bold text-teal-600 group-hover:underline dark:border-slate-800 dark:text-teal-400">
                  {a.isCompleted ? "Review Completed Module →" : "Watch & Complete Module →"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Full Practice Education Library */}
      <div className="space-y-3 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Education Library ({library?.available.length || 0})
            </h3>
          </div>

          <div className="flex flex-wrap gap-1.5 text-xs">
            {["ALL", "Pre-Operative Preparation", "Post-Op Wound & Drain Care", "Nutrition & Diet", "Medication Guidance"].map(
              (cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition-colors ${
                    activeCategory === cat
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {cat}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {library?.available
            .filter((c) => activeCategory === "ALL" || c.category === activeCategory)
            .map((item) => (
              <div
                key={item.id}
                onClick={() => handleOpenModule(undefined, item)}
                className="group flex cursor-pointer flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {item.category}
                  </span>

                  <h4 className="mt-2 text-sm font-black text-slate-900 transition-colors group-hover:text-teal-600 dark:text-white dark:group-hover:text-teal-400">
                    {item.title}
                  </h4>

                  {item.description && (
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">{item.description}</p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500 dark:border-slate-800">
                  <span className="flex items-center gap-1">
                    {item.contentType === "VIDEO" ? <Video className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                    {item.contentType}
                  </span>
                  <span className="font-bold text-teal-600 group-hover:underline dark:text-teal-400">
                    View Guide →
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Interactive Module Viewer Modal */}
      {(selectedAssignment || selectedContent) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                  {selectedContent?.category}
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {selectedContent?.title}
                </h3>
              </div>
              <button onClick={handleCloseModule}>
                <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="mt-4 space-y-5">
              {/* If Video Module: Interactive Player Simulator */}
              {selectedContent?.contentType === "VIDEO" ? (
                <div className="overflow-hidden rounded-2xl bg-slate-950 text-white shadow-md">
                  <div className="relative flex aspect-video items-center justify-center bg-linear-to-br from-slate-900 via-teal-950 to-slate-950 p-6 text-center">
                    <div>
                      <Video className="mx-auto mb-2 h-12 w-12 text-teal-400" />
                      <p className="text-sm font-black">{selectedContent.title}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {selectedContent.language === "ur" ? "اردو آڈیو اور ہدایات" : "English Narration & Visual Guidance"}
                      </p>

                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="mt-4 inline-flex items-center gap-2 rounded-full bg-teal-500 px-5 py-2 text-xs font-black text-slate-950 shadow-lg hover:bg-teal-400"
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        {isPlaying ? "Pause Playback" : "Play Video Module"}
                      </button>
                    </div>
                  </div>

                  {/* Player Controls Bar */}
                  <div className="flex items-center justify-between border-t border-white/10 bg-slate-900 px-4 py-2 text-xs">
                    <span className="font-mono text-teal-400">
                      {Math.floor(watchedSeconds / 60)}:
                      {String(watchedSeconds % 60).padStart(2, "0")} /{" "}
                      {Math.floor((selectedContent.durationSeconds || 300) / 60)}:00
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {isPlaying ? "Tracking watched progress..." : "Paused"}
                    </span>
                  </div>
                </div>
              ) : (
                /* Document / Article Content */
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800/40">
                  <h4 className="text-xs font-black uppercase text-slate-400">Key Recovery Instructions</h4>
                  <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {selectedContent?.description ||
                      "Follow all clinical guidance carefully. Do not hesitate to contact your surgical team if you experience sudden pain, drain output changes, or fever."}
                  </p>
                </div>
              )}

              {/* Comprehension Quiz (if safety critical) */}
              {selectedContent?.hasComprehensionCheck &&
                selectedContent.comprehensionQuestions &&
                (selectedContent.comprehensionQuestions as EducationComprehensionQuestion[]).length > 0 && (
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/30">
                    <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
                      <Award className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <h4 className="text-xs font-black">Comprehension & Safety Check</h4>
                    </div>

                    <div className="mt-3 space-y-4">
                      {(selectedContent.comprehensionQuestions as EducationComprehensionQuestion[]).map(
                        (q, qIdx) => (
                          <div key={q.id} className="space-y-2">
                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                              {qIdx + 1}. {q.question}
                            </p>
                            <div className="space-y-1.5">
                              {q.options.map((opt, optIdx) => (
                                <label
                                  key={optIdx}
                                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 text-xs transition-colors ${
                                    selectedAnswers[q.id] === optIdx
                                      ? "border-teal-500 bg-white font-bold text-teal-900 shadow-xs dark:bg-slate-900 dark:text-teal-200"
                                      : "border-slate-200 bg-white/60 hover:bg-white dark:border-slate-700 dark:bg-slate-900/60"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`quiz-${q.id}`}
                                    checked={selectedAnswers[q.id] === optIdx}
                                    onChange={() =>
                                      setSelectedAnswers((prev) => ({
                                        ...prev,
                                        [q.id]: optIdx,
                                      }))
                                    }
                                    className="text-teal-600 focus:ring-teal-500"
                                  />
                                  <span>{opt}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

              {quizError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{quizError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                <button
                  onClick={handleCloseModule}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Close
                </button>

                {selectedAssignment && !selectedAssignment.isCompleted && (
                  <button
                    onClick={() => void handleCompleteModule()}
                    disabled={completing}
                    className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-5 py-2 text-xs font-black text-white shadow-md hover:bg-teal-700"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {completing ? "Submitting..." : "Complete & Submit Quiz"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
