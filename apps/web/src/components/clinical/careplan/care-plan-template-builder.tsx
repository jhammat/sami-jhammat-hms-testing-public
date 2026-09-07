"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Copy, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import type { CarePlanTaskTemplate, CarePlanTaskType, CarePlanTemplateSummary } from "@wonflow/contracts";

/**
 * Where a doctor composes the recovery plan itself.
 *
 * Care plans were previously whatever the seeded starter template happened to
 * contain: `instantiateCarePlan` picked `templates[0]` for the category and
 * there was no screen anywhere to look at that list, let alone change it. A
 * surgeon could set the duration and nothing else, so every Whipple patient
 * got an identical plan somebody else had written.
 *
 * This is the missing half — build a plan out of tasks, save it, reuse it on
 * the next patient, duplicate it as the starting point for a variant, and
 * retire the ones that are no longer used.
 */

const TASK_TYPES: Array<{ value: CarePlanTaskType; label: string }> = [
  { value: "VITALS_LOG", label: "Vitals / observations" },
  { value: "DRAIN_LOG", label: "Drain output" },
  { value: "MEDICATION", label: "Medication" },
  { value: "WOUND_PHOTO", label: "Wound photograph" },
  { value: "EXERCISE", label: "Mobilisation / exercise" },
  { value: "DIET_LOG", label: "Diet log" },
  { value: "MEAL", label: "Meal" },
  { value: "SUPPLEMENT", label: "Supplement" },
  { value: "QUESTIONNAIRE", label: "Questionnaire" },
  { value: "EDUCATION", label: "Education" },
  { value: "APPOINTMENT", label: "Appointment / review" },
];

const CATEGORIES = [
  { value: "WHIPPLE_RECOVERY", label: "Whipple (Pancreaticoduodenectomy) Recovery" },
  { value: "HEPATECTOMY_RECOVERY", label: "Major Hepatectomy & Liver Resection" },
  { value: "BILIARY_RECOVERY", label: "Roux-en-Y Hepaticojejunostomy & Biliary Repair" },
  { value: "DISTAL_PANCREATECTOMY", label: "Distal Pancreatectomy & Splenectomy (RAMPS)" },
  { value: "GENERAL_HPB_SURG", label: "Complex Biliary & Gallbladder Radical Resection" },
  { value: "SURGERY_POSTOP", label: "General Post-Operative Recovery" },
];

/** A task row while it is being edited — day and time stay text so they can be cleared. */
interface DraftTask {
  key: string;
  taskType: CarePlanTaskType;
  title: string;
  dayOffset: string;
  scheduleTimeOfDay: string;
  instructions: string;
  stageNumber: number;
}

const newKey = () => `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const toDraft = (task: CarePlanTaskTemplate): DraftTask => ({
  key: newKey(),
  taskType: task.taskType,
  title: task.title,
  dayOffset: String(task.dayOffset ?? 1),
  scheduleTimeOfDay: task.scheduleTimeOfDay ?? "09:00",
  instructions: task.instructions ?? "",
  stageNumber: task.stageNumber ?? 1,
});

const emptyDraft = (): DraftTask => ({
  key: newKey(),
  taskType: "VITALS_LOG",
  title: "",
  dayOffset: "1",
  scheduleTimeOfDay: "09:00",
  instructions: "",
  stageNumber: 1,
});

export function CarePlanTemplateBuilder({ onClose }: { onClose: () => void }) {
  const [templates, setTemplates] = useState<CarePlanTemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]!.value);
  const [description, setDescription] = useState("");
  const [durationDays, setDurationDays] = useState("30");
  const [tasks, setTasks] = useState<DraftTask[]>([]);
  const [confirmingRetire, setConfirmingRetire] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/clinical/careplans/templates", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "The saved plans could not be loaded.");
      setTemplates(payload?.templates ?? []);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The saved plans could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function startNew() {
    setEditingId(null);
    setTitle("");
    setCategory(CATEGORIES[0]!.value);
    setDescription("");
    setDurationDays("30");
    setTasks([emptyDraft()]);
    setNotice("");
  }

  function startEdit(template: CarePlanTemplateSummary) {
    setEditingId(template.id);
    setTitle(template.title);
    setCategory(template.category);
    setDescription(template.description ?? "");
    setDurationDays(String(template.durationDays));
    setTasks((template.taskTemplates ?? []).map(toDraft));
    setNotice("");
  }

  /** Copies a plan as an unsaved draft, so a variant starts from a known-good one. */
  function startDuplicate(template: CarePlanTemplateSummary) {
    startEdit(template);
    setEditingId(null);
    setTitle(`${template.title} (copy)`);
    setNotice("Duplicated. Change what you need, then save it as a new plan.");
  }

  function updateTask(key: string, patch: Partial<DraftTask>) {
    setTasks((prev) => prev.map((task) => (task.key === key ? { ...task, ...patch } : task)));
  }

  function removeTask(key: string) {
    setTasks((prev) => prev.filter((task) => task.key !== key));
  }

  async function save() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) { setError("Give the plan a name before saving."); return; }

    const usable = tasks.filter((task) => task.title.trim());
    if (usable.length === 0) { setError("Add at least one task — a plan with no tasks does nothing."); return; }

    const days = Math.min(365, Math.max(1, Number.parseInt(durationDays, 10) || 30));

    const taskTemplates: CarePlanTaskTemplate[] = usable.map((task) => ({
      templateId: editingId ?? "",
      stageNumber: task.stageNumber || 1,
      dayOffset: Math.min(days, Math.max(1, Number.parseInt(task.dayOffset, 10) || 1)),
      taskType: task.taskType,
      title: task.title.trim(),
      instructions: task.instructions.trim() || undefined,
      scheduleTimeOfDay: task.scheduleTimeOfDay || "09:00",
    }));

    setSaving(true);
    setError("");
    try {
      const body = {
        category,
        title: trimmedTitle,
        description: description.trim() || undefined,
        durationDays: days,
        stages: [{ stageNumber: 1, name: "Recovery", startDay: 1, endDay: days }],
        taskTemplates,
        alertRules: [],
      };

      const response = await fetch(
        editingId ? `/api/v1/clinical/careplans/templates/${editingId}` : "/api/v1/clinical/careplans/templates",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(body),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "The plan could not be saved.");

      setNotice(editingId ? "Saved. New patients started on this plan get the updated tasks." : "Saved. It is now available when starting a care plan.");
      setEditingId(payload?.template?.id ?? null);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The plan could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function retire(id: string) {
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/clinical/careplans/templates/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "The plan could not be retired.");
      }
      setConfirmingRetire(null);
      if (editingId === id) startNew();
      setNotice("Retired. Patients already on this plan keep it; it is no longer offered for new ones.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The plan could not be retired.");
    } finally {
      setSaving(false);
    }
  }

  const isDrafting = tasks.length > 0 || editingId !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="my-6 w-full max-w-5xl rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Recovery plans</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Build the task list once, then start any patient on it.
            </p>
          </div>
          <button
            aria-label="Close"
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid gap-0 md:grid-cols-[280px_minmax(0,1fr)]">
          {/* Saved plans */}
          <aside className="border-b border-slate-100 p-4 md:border-b-0 md:border-r dark:border-slate-800">
            <button
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-700"
              onClick={startNew}
              type="button"
            >
              <Plus className="h-3.5 w-3.5" /> New plan
            </button>

            {loading ? (
              <p className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
              </p>
            ) : templates.length === 0 ? (
              <p className="text-xs text-slate-500">No saved plans yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {templates.map((template) => (
                  <li key={template.id}>
                    <div
                      className={`rounded-xl border p-2.5 ${
                        editingId === template.id
                          ? "border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/40"
                          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                      }`}
                    >
                      <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{template.title}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        {template.taskTemplates?.length ?? 0} tasks · {template.durationDays} days
                      </p>
                      <div className="mt-2 flex items-center gap-1">
                        <button
                          className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                          onClick={() => startEdit(template)}
                          type="button"
                        >
                          <Pencil className="mr-1 inline h-3 w-3" />Edit
                        </button>
                        <button
                          className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                          onClick={() => startDuplicate(template)}
                          type="button"
                        >
                          <Copy className="mr-1 inline h-3 w-3" />Copy
                        </button>
                        <button
                          className="rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300"
                          onClick={() => setConfirmingRetire(template.id)}
                          type="button"
                        >
                          <Trash2 className="mr-1 inline h-3 w-3" />Retire
                        </button>
                      </div>

                      {confirmingRetire === template.id ? (
                        <div className="mt-2 rounded-lg bg-rose-50 p-2 text-[10px] font-semibold text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                          Retire this plan? Patients already on it keep it.
                          <div className="mt-1.5 flex gap-1">
                            <button
                              className="rounded bg-rose-600 px-2 py-0.5 font-black text-white"
                              disabled={saving}
                              onClick={() => void retire(template.id)}
                              type="button"
                            >
                              Retire
                            </button>
                            <button
                              className="rounded bg-white px-2 py-0.5 font-black text-slate-700"
                              onClick={() => setConfirmingRetire(null)}
                              type="button"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          {/* Editor */}
          <section className="p-5">
            {!isDrafting ? (
              <p className="text-sm text-slate-500">
                Pick a plan on the left to edit it, or start a new one.
              </p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Plan name</span>
                    <input
                      className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="e.g. Whipple recovery — 30 day"
                      value={title}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Surgical pathway</span>
                    <select
                      className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      onChange={(event) => setCategory(event.target.value)}
                      value={category}
                    >
                      {CATEGORIES.map((entry) => (
                        <option key={entry.value} value={entry.value}>{entry.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Length (days)</span>
                    <input
                      className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      inputMode="numeric"
                      onBlur={() => setDurationDays(String(Math.min(365, Math.max(1, Number.parseInt(durationDays, 10) || 30))))}
                      onChange={(event) => setDurationDays(event.target.value.replace(/[^\d]/g, ""))}
                      value={durationDays}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Note (optional)</span>
                    <input
                      className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="When to use this plan"
                      value={description}
                    />
                  </label>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    Tasks ({tasks.length})
                  </h3>
                  <button
                    className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-[11px] font-black text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                    onClick={() => setTasks((prev) => [...prev, emptyDraft()])}
                    type="button"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add task
                  </button>
                </div>

                <div className="mt-2 space-y-2">
                  {tasks.map((task) => (
                    <div
                      className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800"
                      key={task.key}
                    >
                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_110px_90px_auto] sm:items-end">
                        <label className="block">
                          <span className="text-[10px] font-bold text-slate-500">Task</span>
                          <input
                            className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            onChange={(event) => updateTask(task.key, { title: event.target.value })}
                            placeholder="e.g. Morning vitals & hemodynamics"
                            value={task.title}
                          />
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-bold text-slate-500">Type</span>
                          <select
                            className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            onChange={(event) => updateTask(task.key, { taskType: event.target.value as CarePlanTaskType })}
                            value={task.taskType}
                          >
                            {TASK_TYPES.map((entry) => (
                              <option key={entry.value} value={entry.value}>{entry.label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-bold text-slate-500">Time</span>
                          <input
                            className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            onChange={(event) => updateTask(task.key, { scheduleTimeOfDay: event.target.value })}
                            type="time"
                            value={task.scheduleTimeOfDay}
                          />
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-bold text-slate-500">Day</span>
                          <input
                            className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-center text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            inputMode="numeric"
                            onChange={(event) => updateTask(task.key, { dayOffset: event.target.value.replace(/[^\d]/g, "") })}
                            value={task.dayOffset}
                          />
                        </label>
                        <button
                          aria-label="Remove task"
                          className="mb-0.5 rounded-lg bg-rose-50 p-2 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300"
                          onClick={() => removeTask(task.key)}
                          type="button"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <input
                        className="mt-2 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[11px] text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
                        onChange={(event) => updateTask(task.key, { instructions: event.target.value })}
                        placeholder="Instructions for the patient (optional)"
                        value={task.instructions}
                      />
                    </div>
                  ))}
                </div>

                {error ? (
                  <p className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                    <AlertTriangle className="h-3.5 w-3.5" />{error}
                  </p>
                ) : null}
                {notice ? (
                  <p className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <Check className="h-3.5 w-3.5" />{notice}
                  </p>
                ) : null}

                <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <button
                    className="rounded-xl px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    onClick={onClose}
                    type="button"
                  >
                    Close
                  </button>
                  <button
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50"
                    disabled={saving}
                    onClick={() => void save()}
                    type="button"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    {editingId ? "Save changes" : "Save plan"}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
