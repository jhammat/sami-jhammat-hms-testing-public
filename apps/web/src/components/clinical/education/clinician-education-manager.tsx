"use client";

import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  GraduationCap,
  HelpCircle,
  Languages,
  Plus,
  RefreshCw,
  Video,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ClinicianEducationComplianceSummary,
  CreateEducationContentInput,
  EducationContentItem,
} from "@wonflow/contracts";


interface ClinicianEducationManagerProps {
  initialPatientId?: string;
  initialPatientName?: string;
}

export function ClinicianEducationManager({
  initialPatientId,
  initialPatientName,
}: ClinicianEducationManagerProps) {
  const [compliance, setCompliance] = useState<ClinicianEducationComplianceSummary | null>(null);
  const [contentList, setContentList] = useState<EducationContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"assignments" | "library">("assignments");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [languageFilter, setLanguageFilter] = useState<string>("ALL");

  // New Content Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Pre-Operative Preparation");
  const [newContentType, setNewContentType] = useState<"ARTICLE" | "VIDEO" | "DOCUMENT">("VIDEO");
  const [newUrl, setNewUrl] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDuration, setNewDuration] = useState("300");
  const [newLanguage, setNewLanguage] = useState("en");
  const [hasQuiz, setHasQuiz] = useState(false);
  const [quizQuestion, setQuizQuestion] = useState("");
  const [quizOpt1, setQuizOpt1] = useState("");
  const [quizOpt2, setQuizOpt2] = useState("");
  const [quizCorrectIdx, setQuizCorrectIdx] = useState(0);
  const [creating, setCreating] = useState(false);

  // Assign Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignPatientId, setAssignPatientId] = useState(initialPatientId || "");
  const [assignContentId, setAssignContentId] = useState("");
  const [assignDueDate, setAssignDueDate] = useState("");
  const [assigning, setAssigning] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [compRes, contentRes] = await Promise.all([
        fetch("/api/v1/clinical/education/compliance", { credentials: "include" }),
        fetch("/api/v1/clinical/education/content?includeInactive=true", { credentials: "include" }),
      ]);

      if (!compRes.ok || !contentRes.ok) {
        throw new Error("Failed to load education data.");
      }

      const compData = (await compRes.json()) as ClinicianEducationComplianceSummary;
      const cData = (await contentRes.json()) as EducationContentItem[];

      setCompliance(compData);
      setContentList(cData);
      if (cData.length > 0 && !assignContentId) {
        setAssignContentId(cData[0].id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading education library.");
    } finally {
      setLoading(false);
    }
  }, [assignContentId]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      if (mounted) {
        await loadData();
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadData]);

  const filteredAssignments = useMemo(() => {
    if (!compliance) return [];
    let items = compliance.allAssignments;
    if (categoryFilter !== "ALL") {
      items = items.filter((a) => a.content.category === categoryFilter);
    }
    if (languageFilter !== "ALL") {
      items = items.filter((a) => a.content.language === languageFilter);
    }
    return items;
  }, [compliance, categoryFilter, languageFilter]);

  const handleCreateContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setCreating(true);
      setError(null);

      const payload: CreateEducationContentInput = {
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        category: newCategory.trim(),
        contentType: newContentType,
        url: newUrl.trim() || undefined,
        durationSeconds: newDuration ? Number(newDuration) : undefined,
        language: newLanguage,
        hasComprehensionCheck: hasQuiz,
        comprehensionQuestions:
          hasQuiz && quizQuestion.trim()
            ? [
                {
                  id: "q1",
                  question: quizQuestion.trim(),
                  options: [quizOpt1 || "Yes", quizOpt2 || "No"],
                  correctIndex: quizCorrectIdx,
                },
              ]
            : undefined,
      };

      const res = await fetch("/api/v1/clinical/education/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message || "Failed to create education module.");
      }

      setSuccessMessage("Educational module created successfully.");
      setShowCreateModal(false);
      setNewTitle("");
      setNewDescription("");
      setNewUrl("");
      setQuizQuestion("");
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating module.");
    } finally {
      setCreating(false);
    }
  };

  const handleAssignContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignPatientId.trim() || !assignContentId) return;

    try {
      setAssigning(true);
      setError(null);

      const res = await fetch("/api/v1/clinical/education/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          patientId: assignPatientId.trim(),
          contentId: assignContentId,
          dueDate: assignDueDate ? new Date(assignDueDate).toISOString() : undefined,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message || "Failed to assign education.");
      }

      setSuccessMessage("Education assigned to patient successfully.");
      setShowAssignModal(false);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error assigning education.");
    } finally {
      setAssigning(false);
    }
  };

  const handleToggleRetire = async (contentId: string, currentActive: boolean) => {
    try {
      setError(null);
      const res = await fetch(`/api/v1/clinical/education/content/${contentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !currentActive }),
      });

      if (!res.ok) throw new Error("Failed to update module status.");
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error updating status.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl bg-linear-to-r from-teal-900 via-slate-900 to-indigo-950 p-6 text-white shadow-xl sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-teal-400" />
            <h2 className="text-xl font-black tracking-tight">Clinical Education & Patient Preparation</h2>
          </div>
          <p className="mt-1 text-xs text-teal-200/80">
            Practice education library, ERAS pre-op preparation tracking, drain care compliance, and patient comprehension checks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => void loadData()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold hover:bg-white/20"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-teal-500 px-3 py-1.5 text-xs font-black text-slate-950 shadow-md hover:bg-teal-400"
          >
            <Plus className="h-4 w-4" />
            New Practice Module
          </button>
          <button
            onClick={() => setShowAssignModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-md hover:bg-indigo-500"
          >
            <BookOpen className="h-4 w-4" />
            Assign to Patient
          </button>
        </div>
      </div>

      {/* Alert Messages */}
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

      {/* KPI Cards */}
      {compliance && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[10px] font-black uppercase text-slate-400">Total Assignments</p>
            <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
              {compliance.totalAssigned}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[10px] font-black uppercase text-slate-400">Compliance Rate</p>
            <p className="mt-1 text-2xl font-black text-teal-600 dark:text-teal-400">
              {compliance.complianceRatePercentage}%
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[10px] font-black uppercase text-slate-400">Pending / Unwatched</p>
            <p className="mt-1 text-2xl font-black text-amber-600 dark:text-amber-400">
              {compliance.outstandingCount}
            </p>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-xs dark:border-rose-900/40 dark:bg-rose-950/20">
            <p className="text-[10px] font-black uppercase text-rose-500">Overdue Pre-Op Warnings</p>
            <p className="mt-1 text-2xl font-black text-rose-600 dark:text-rose-400">
              {compliance.overduePreOpCount}
            </p>
          </div>
        </div>
      )}

      {/* Urgent Pre-Op Attention Banner */}
      {compliance && compliance.urgentPendingAssignments.length > 0 && (
        <div className="rounded-3xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/30">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h4 className="text-sm font-black text-amber-900 dark:text-amber-200">
              Action Required: {compliance.urgentPendingAssignments.length} Incomplete Critical / Pre-Operative Education Modules
            </h4>
          </div>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
            The following patients have not completed critical pre-operative preparation or safety material while surgery or critical recovery is impending:
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {compliance.urgentPendingAssignments.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-amber-200 bg-white p-3 shadow-xs dark:border-amber-900/40 dark:bg-slate-900"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {item.patientName || `Patient #${item.patientNumber || item.patientId.slice(0, 8)}`}
                  </p>
                  <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                    {item.content.title}
                  </p>
                  {item.dueDate && (
                    <p className="text-[10px] text-slate-400">
                      Due: {new Date(item.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-black uppercase text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  Unwatched
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-black dark:border-slate-800">
        <button
          onClick={() => setActiveTab("assignments")}
          className={`border-b-2 px-4 py-2.5 transition-colors ${
            activeTab === "assignments"
              ? "border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Patient Assignments & Compliance ({compliance?.allAssignments.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("library")}
          className={`border-b-2 px-4 py-2.5 transition-colors ${
            activeTab === "library"
              ? "border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Practice Content Library ({contentList.length})
        </button>
      </div>

      {/* Tab 1: Assignments Table */}
      {activeTab === "assignments" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white p-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="ALL">All Categories</option>
                <option value="Pre-Operative Preparation">Pre-Operative Preparation</option>
                <option value="Post-Op Wound & Drain Care">Post-Op Wound & Drain Care</option>
                <option value="Nutrition & Diet">Nutrition & Diet</option>
                <option value="Medication Guidance">Medication Guidance</option>
              </select>

              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white p-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="ALL">All Languages</option>
                <option value="en">English</option>
                <option value="ur">اردو (Urdu)</option>
              </select>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 dark:border-slate-800">
                    <th className="py-2.5">Patient</th>
                    <th className="py-2.5">Educational Module</th>
                    <th className="py-2.5">Category</th>
                    <th className="py-2.5">Language</th>
                    <th className="py-2.5">Due Date</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5">Watched Time</th>
                    <th className="py-2.5">Comprehension</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No education assignments found for the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredAssignments.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 font-bold text-slate-900 dark:text-white">
                          {a.patientName || `Patient #${a.patientNumber || a.patientId.slice(0, 8)}`}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1.5">
                            {a.content.contentType === "VIDEO" ? (
                              <Video className="h-3.5 w-3.5 text-indigo-500" />
                            ) : (
                              <FileText className="h-3.5 w-3.5 text-teal-500" />
                            )}
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {a.content.title}
                            </span>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {a.content.category}
                          </span>
                        </td>
                        <td className="py-3 uppercase text-slate-500">{a.content.language}</td>
                        <td className="py-3 text-slate-500">
                          {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : "No deadline"}
                        </td>
                        <td className="py-3">
                          {a.isCompleted ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              <CheckCircle2 className="h-3 w-3" /> Completed
                            </span>
                          ) : a.isOverdue ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-black text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                              <Clock className="h-3 w-3" /> Overdue
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              <Clock className="h-3 w-3" /> Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-slate-500">
                          {a.completion?.watchedSeconds
                            ? `${Math.round(a.completion.watchedSeconds / 60)} mins`
                            : "—"}
                        </td>
                        <td className="py-3">
                          {a.content.hasComprehensionCheck ? (
                            a.completion?.comprehensionPassed ? (
                              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                100% Passed
                              </span>
                            ) : a.isCompleted ? (
                              <span className="text-[11px] font-bold text-amber-600">Reviewing</span>
                            ) : (
                              <span className="text-[11px] text-slate-400">Quiz Required</span>
                            )
                          ) : (
                            <span className="text-[11px] text-slate-400">N/A</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Practice Content Library */}
      {activeTab === "library" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contentList.map((item) => (
            <div
              key={item.id}
              className={`flex flex-col justify-between rounded-3xl border p-5 transition-shadow hover:shadow-md ${
                item.isActive
                  ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                  : "border-slate-200/50 bg-slate-50/50 opacity-60 dark:border-slate-800/50 dark:bg-slate-950"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-black uppercase text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                    {item.category}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                    <Languages className="h-3 w-3" />
                    <span className="uppercase">{item.language}</span>
                  </div>
                </div>

                <h4 className="mt-2 text-sm font-black text-slate-900 dark:text-white">
                  {item.title}
                </h4>

                {item.description && (
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">{item.description}</p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    {item.contentType === "VIDEO" ? <Video className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                    {item.contentType}
                  </span>
                  {item.durationSeconds && (
                    <span>• {Math.round(item.durationSeconds / 60)} mins</span>
                  )}
                  {item.hasComprehensionCheck && (
                    <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                      <HelpCircle className="h-3 w-3" /> Quiz Included
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                <button
                  onClick={() => {
                    setAssignContentId(item.id);
                    setShowAssignModal(true);
                  }}
                  className="text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400"
                >
                  Assign to Patient
                </button>

                <button
                  onClick={() => void handleToggleRetire(item.id, item.isActive)}
                  className={`rounded-lg px-2 py-1 text-[10px] font-bold ${
                    item.isActive
                      ? "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                      : "bg-teal-100 text-teal-700 hover:bg-teal-200 dark:bg-teal-950 dark:text-teal-300"
                  }`}
                >
                  {item.isActive ? "Retire Module" : "Reactivate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Practice Module */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Create Educational Module
              </h3>
              <button onClick={() => setShowCreateModal(false)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={(e) => void handleCreateContent(e)} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Module Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Pre-Operative Fasting and ERAS Protocol"
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Category *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="Pre-Operative Preparation">Pre-Operative Preparation</option>
                    <option value="Post-Op Wound & Drain Care">Post-Op Wound & Drain Care</option>
                    <option value="Nutrition & Diet">Nutrition & Diet</option>
                    <option value="Medication Guidance">Medication Guidance</option>
                    <option value="General Recovery">General Recovery</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Content Type
                  </label>
                  <select
                    value={newContentType}
                    onChange={(e) => setNewContentType(e.target.value as "ARTICLE" | "VIDEO" | "DOCUMENT")}
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="VIDEO">Video Module</option>
                    <option value="ARTICLE">Article / Clinical Guide</option>
                    <option value="DOCUMENT">Document / PDF</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Language
                  </label>
                  <select
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="en">English (EN)</option>
                    <option value="ur">اردو (Urdu - UR)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Duration (Seconds)
                  </label>
                  <input
                    type="number"
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value)}
                    placeholder="300"
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Video URL or Resource Link
                </label>
                <input
                  type="text"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://hospital-stream.example.com/eras-guide.mp4"
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Summary / Clinical Instructions
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Key instructions, fasting timeline, and drain management steps..."
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              {/* Comprehension Quiz Check */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={hasQuiz}
                    onChange={(e) => setHasQuiz(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  Require Comprehension Check (Safety Critical)
                </label>

                {hasQuiz && (
                  <div className="mt-3 space-y-2">
                    <input
                      type="text"
                      value={quizQuestion}
                      onChange={(e) => setQuizQuestion(e.target.value)}
                      placeholder="e.g. When must you stop drinking clear fluids before surgery?"
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={quizOpt1}
                        onChange={(e) => setQuizOpt1(e.target.value)}
                        placeholder="Option 1: Exactly 2 hours before"
                        className="rounded-xl border border-slate-300 p-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                      />
                      <input
                        type="text"
                        value={quizOpt2}
                        onChange={(e) => setQuizOpt2(e.target.value)}
                        placeholder="Option 2: 12 hours before"
                        className="rounded-xl border border-slate-300 p-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      <span>Correct Answer:</span>
                      <label className="flex items-center gap-1">
                        <input
                          type="radio"
                          name="quizCorrect"
                          checked={quizCorrectIdx === 0}
                          onChange={() => setQuizCorrectIdx(0)}
                        />
                        Option 1
                      </label>
                      <label className="flex items-center gap-1">
                        <input
                          type="radio"
                          name="quizCorrect"
                          checked={quizCorrectIdx === 1}
                          onChange={() => setQuizCorrectIdx(1)}
                        />
                        Option 2
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-black text-white hover:bg-teal-700"
                >
                  {creating ? "Creating..." : "Save Module"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign to Patient */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Assign Education Module
              </h3>
              <button onClick={() => setShowAssignModal(false)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={(e) => void handleAssignContent(e)} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Patient ID *
                </label>
                <input
                  type="text"
                  required
                  value={assignPatientId}
                  onChange={(e) => setAssignPatientId(e.target.value)}
                  placeholder="Enter patient UUID..."
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                />
                {initialPatientName && (
                  <p className="mt-1 text-[11px] text-teal-600 font-bold">
                    Target: {initialPatientName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Educational Content *
                </label>
                <select
                  value={assignContentId}
                  onChange={(e) => setAssignContentId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                >
                  {contentList
                    .filter((c) => c.isActive)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.language.toUpperCase()} • {c.category})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Completion Due Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={assignDueDate}
                  onChange={(e) => setAssignDueDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white hover:bg-indigo-700"
                >
                  {assigning ? "Assigning..." : "Assign Module"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
