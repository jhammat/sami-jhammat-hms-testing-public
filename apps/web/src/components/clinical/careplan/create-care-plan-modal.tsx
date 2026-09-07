"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Calendar, Check, Clock, HeartPulse, Loader2, Search, User, X } from "lucide-react";

import {
  PhaseOneAccentButton,
  PhaseOneField,
  PhaseOneInput,
  PhaseOneNotice,
  PhaseOneQuietButton,
  PhaseOneSelect,
} from "@/components/phase-one-design";
import { todayLocalDate } from "@/lib/time/local-date";

interface PatientRow {
  id: string;
  patientNumber: string;
  givenName: string;
  middleName?: string | null;
  familyName: string;
  phone?: string | null;
  sex?: string | null;
  dateOfBirth?: string | null;
}

interface TemplateRow {
  id: string;
  title: string;
  category: string;
  durationDays: number;
  taskTemplates?: unknown[];
}

interface AlliedStaffRow {
  id: string;
  staffType: string;
  title: string | null;
  displayName: string;
}

const CATEGORIES = [
  { value: "WHIPPLE_RECOVERY", label: "Whipple (Pancreaticoduodenectomy) Recovery", defaultDays: 30 },
  { value: "HEPATECTOMY_RECOVERY", label: "Major Hepatectomy & Liver Resection", defaultDays: 28 },
  { value: "BILIARY_RECOVERY", label: "Roux-en-Y Hepaticojejunostomy & Biliary Repair", defaultDays: 21 },
  { value: "DISTAL_PANCREATECTOMY", label: "Distal Pancreatectomy & Splenectomy (RAMPS)", defaultDays: 21 },
  { value: "GENERAL_HPB_SURG", label: "Complex Biliary & Gallbladder Radical Resection", defaultDays: 14 },
  { value: "SURGERY_POSTOP", label: "General Post-Operative Recovery", defaultDays: 14 },
];

const DURATION_PRESETS = [14, 21, 28, 30, 45, 60, 90];

export function CreateCarePlanModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (carePlanId: string) => void;
}) {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientRow | null>(null);
  const [allied, setAllied] = useState<AlliedStaffRow[]>([]);
  /*
   * Which saved plan to start the patient on.
   *
   * `instantiateCarePlan` accepted a `templateId` all along, but nothing sent
   * one — so it silently fell back to the first template matching the
   * category and every patient on a pathway received an identical task list
   * nobody here had chosen. The doctor picks it now.
   */
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [query, setQuery] = useState("");
  const [loadingPatients, setLoadingPatients] = useState(false);

  const [patientId, setPatientId] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]!.value);
  /*
   * Held as text so the field can actually be emptied while typing.
   *
   * It was a number clamped on every keystroke — `Math.max(1, Number(value) || 1)`
   * — so clearing it to type a new figure turned "" into 0 into 1, and the 1
   * reappeared under the cursor. There was no way to select the field, delete,
   * and type "30": the clamp fought every keystroke. Clamping now happens when
   * the field is left and again on submit, which is where a range check
   * belongs.
   */
  const [durationDays, setDurationDays] = useState(String(CATEGORIES[0]!.defaultDays));
  const durationValue = Number.parseInt(durationDays, 10);
  const clampDuration = (value: number, fallback: number) =>
    Number.isFinite(value) ? Math.min(365, Math.max(1, Math.floor(value))) : fallback;
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(() => todayLocalDate());
  const [therapistId, setTherapistId] = useState("");
  const [nutritionistId, setNutritionistId] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadPatients = useCallback(async (search: string) => {
    setLoadingPatients(true);
    try {
      const response = await fetch(
        `/api/v1/patients?pageSize=25${search.trim() ? `&query=${encodeURIComponent(search.trim())}` : ""}`,
        { credentials: "same-origin", cache: "no-store" },
      );
      const payload = await response.json().catch(() => null);
      if (response.ok) {
        setPatients(payload?.patients ?? []);
      }
    } catch {
      // The picker degrades gracefully.
    } finally {
      setLoadingPatients(false);
    }
  }, []);

  /*
   * Clearing the draft when the dialog closes is the point of this effect —
   * a care plan half-written for one patient must not be waiting when the
   * dialog is reopened for another. `set-state-in-effect` cannot tell that
   * apart from a cascading render, and the alternative (keying the whole
   * dialog on its open state) would throw away the mount animation.
   */
  useEffect(() => {
    if (!isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- see note above
      setQuery("");
      setPatientId("");
      setSelectedPatient(null);
      setError("");
      setTitle("");
      setTherapistId("");
      setNutritionistId("");
      return;
    }
    const timer = window.setTimeout(() => void loadPatients(query), 250);
    return () => window.clearTimeout(timer);
  }, [isOpen, query, loadPatients]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    void (async () => {
      try {
        const [staffResponse, templateResponse] = await Promise.all([
          fetch("/api/v1/allied/staff", { credentials: "same-origin", cache: "no-store" }),
          fetch("/api/v1/clinical/careplans/templates", { credentials: "same-origin", cache: "no-store" }),
        ]);
        const payload = await staffResponse.json().catch(() => null);
        if (!cancelled && staffResponse.ok) setAllied(payload?.staff ?? []);
        const templatePayload = await templateResponse.json().catch(() => null);
        if (!cancelled && templateResponse.ok) setTemplates(templatePayload?.templates ?? []);
      } catch {
        // Assignment stays optional
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  function handleCategoryChange(newCategory: string) {
    setCategory(newCategory);
    const catObj = CATEGORIES.find((c) => c.value === newCategory);
    if (catObj) {
      setDurationDays(String(catObj.defaultDays));
    }
  }

  function handleSelectPatient(patient: PatientRow) {
    setSelectedPatient(patient);
    setPatientId(patient.id);
    setError("");
  }

  function handleClearPatient() {
    setSelectedPatient(null);
    setPatientId("");
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!patientId) {
      setError("Please search and select the patient this care plan is for.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/v1/clinical/careplans/instantiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          patientId,
          category,
          templateId: templateId || undefined,
          durationDays: clampDuration(durationValue, CATEGORIES.find((entry) => entry.value === category)?.defaultDays ?? 14),
          title:
            title.trim() ||
            `${CATEGORIES.find((entry) => entry.value === category)?.label ?? "Recovery"} — ${selectedPatient?.givenName ?? "Patient"}`,
          startDate: new Date(startDate).toISOString(),
          assignedTherapistId: therapistId || undefined,
          assignedNutritionistId: nutritionistId || undefined,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "The care plan could not be created.");
      }

      onCreated(payload.carePlan.id);
      setSelectedPatient(null);
      setPatientId("");
      setTitle("");
      setTherapistId("");
      setNutritionistId("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The care plan could not be created.");
    } finally {
      setSaving(false);
    }
  }

  const therapists = allied.filter((staff) => staff.staffType === "PHYSIOTHERAPIST");
  const dietitians = allied.filter((staff) => staff.staffType === "NUTRITIONIST");

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="wf-surface wf-panel my-8 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800">
        <header className="wf-panel-divider flex items-center justify-between border-b px-6 py-5">
          <div className="flex items-center space-x-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <HeartPulse className="h-5 w-5" />
            </span>
            <div>
              <h2 className="wf-ink text-lg font-bold">Start a Care Plan</h2>
              <p className="wf-ink-2 text-xs">
                Initiate post-operative outpatient surveillance, daily tasks, and clinical alerts.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="wf-ink-3 rounded-xl p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X aria-hidden size={18} />
          </button>
        </header>

        <form className="space-y-6 p-6 sm:p-7" onSubmit={submit}>
          {/* Patient Selection Field */}
          <PhaseOneField label="Patient" htmlFor="cp-patient-search" required>
            {selectedPatient ? (
              <div className="flex items-center justify-between rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/30">
                <div className="flex items-center space-x-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 font-black text-white shadow-sm">
                    {selectedPatient.givenName[0]}
                    {selectedPatient.familyName[0]}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {selectedPatient.givenName}{" "}
                        {selectedPatient.middleName ? `${selectedPatient.middleName} ` : ""}
                        {selectedPatient.familyName}
                      </span>
                      <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-mono font-bold text-indigo-700 shadow-2xs dark:bg-slate-900 dark:text-indigo-300">
                        {selectedPatient.patientNumber}
                      </span>
                    </div>
                    {selectedPatient.phone ? (
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Phone: {selectedPatient.phone}
                      </p>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClearPatient}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search
                    aria-hidden="true"
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />

                  <input
                    ref={searchInputRef}
                    id="cp-patient-search"
                    className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-900/40"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by patient name, MR number, or phone..."
                    type="search"
                    value={query}
                    autoComplete="off"
                  />

                  {loadingPatients ? (
                    <Loader2
                      aria-hidden="true"
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-indigo-600 dark:text-indigo-400"
                      size={16}
                    />
                  ) : query ? (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X size={16} />
                    </button>
                  ) : null}
                </div>

                {/* Patient Results Dropdown List */}
                <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {query.trim() ? "Matching patients" : "Recent patients"}
                  </div>

                  {patients.length > 0 ? (
                    <div className="space-y-0.5">
                      {patients.map((patient) => {
                        const fullName = `${patient.givenName} ${patient.middleName ? `${patient.middleName} ` : ""}${patient.familyName}`;
                        return (
                          <button
                            key={patient.id}
                            type="button"
                            onClick={() => handleSelectPatient(patient)}
                            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition hover:bg-indigo-50/80 dark:hover:bg-indigo-950/60"
                          >
                            <div className="flex items-center space-x-2.5">
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                <User size={13} />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-slate-100">
                                  {fullName}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  MR: {patient.patientNumber}
                                  {patient.phone ? ` · ${patient.phone}` : ""}
                                </p>
                              </div>
                            </div>
                            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                              Select
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                      {query.trim()
                        ? `No patients found matching "${query}".`
                        : "No patients available."}
                    </div>
                  )}
                </div>
              </div>
            )}
          </PhaseOneField>

          {/* Recovery Pathway & Days Duration Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            <PhaseOneField label="Surgical Pathway" htmlFor="cp-category" required>
              <PhaseOneSelect
                id="cp-category"
                value={category}
                onChange={(event) => handleCategoryChange(event.target.value)}
              >
                {CATEGORIES.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </PhaseOneSelect>
            </PhaseOneField>

            <PhaseOneField
              label="Start Date"
              htmlFor="cp-start"
              hint="Usually the date of surgery"
            >
              <PhaseOneInput
                id="cp-start"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </PhaseOneField>
          </div>

          {/* Plan Duration in Days (Presets + Custom Input) */}
          <div className="space-y-2 rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
              <label htmlFor="cp-duration-input" className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-indigo-600" />
                Recovery Plan Duration
              </label>
              <div className="flex items-center space-x-1.5">
                <input
                  id="cp-duration-input"
                  type="number"
                  min={1}
                  max={365}
                  value={durationDays}
                  onChange={(e) => {
                    // Digits only, and an empty box stays empty while typing.
                    const next = e.target.value.replace(/[^\d]/g, "");
                    setDurationDays(next);
                  }}
                  onBlur={() => {
                    const fallback = CATEGORIES.find((entry) => entry.value === category)?.defaultDays ?? 14;
                    setDurationDays(String(clampDuration(durationValue, fallback)));
                  }}
                  className="w-16 rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-center text-xs font-bold text-indigo-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-300"
                />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">days</span>
              </div>
            </div>

            {/* Quick Duration Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {DURATION_PRESETS.map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setDurationDays(String(days))}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    durationValue === days
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-white text-slate-700 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {days} Days
                </button>
              ))}
            </div>
          </div>

          <PhaseOneField
            label="Recovery plan"
            htmlFor="cp-template"
            hint={
              templates.length
                ? "Choose a saved plan, or leave on the pathway default. Build and edit these under “Recovery plans”."
                : "No saved plans yet — build one under “Recovery plans” on the roster."
            }
          >
            <PhaseOneSelect
              id="cp-template"
              onChange={(event) => setTemplateId(event.target.value)}
              value={templateId}
            >
              <option value="">Default for this pathway</option>
              {templates
                .filter((template) => !category || template.category === category)
                .map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title} — {template.taskTemplates?.length ?? 0} tasks · {template.durationDays} days
                  </option>
                ))}
            </PhaseOneSelect>
          </PhaseOneField>

          <PhaseOneField
            label="Plan Title"
            htmlFor="cp-title"
            hint="Leave blank to use default name"
          >
            <PhaseOneInput
              id="cp-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={
                selectedPatient
                  ? `${CATEGORIES.find((entry) => entry.value === category)?.label ?? "Recovery"} — ${selectedPatient.givenName} ${selectedPatient.familyName}`
                  : "e.g. Whipple recovery — post-operative day 1 onward"
              }
            />
          </PhaseOneField>

          {/* Allied Staff Assignment */}
          <div className="grid gap-4 sm:grid-cols-2">
            <PhaseOneField
              label="Physiotherapist"
              htmlFor="cp-therapist"
              hint="Optional — can refer later"
            >
              <PhaseOneSelect
                id="cp-therapist"
                value={therapistId}
                onChange={(event) => setTherapistId(event.target.value)}
              >
                <option value="">Not assigned</option>
                {therapists.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.displayName}
                    {staff.title ? ` — ${staff.title}` : ""}
                  </option>
                ))}
              </PhaseOneSelect>
            </PhaseOneField>

            <PhaseOneField
              label="Dietitian"
              htmlFor="cp-dietitian"
              hint="Optional — can refer later"
            >
              <PhaseOneSelect
                id="cp-dietitian"
                value={nutritionistId}
                onChange={(event) => setNutritionistId(event.target.value)}
              >
                <option value="">Not assigned</option>
                {dietitians.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.displayName}
                    {staff.title ? ` — ${staff.title}` : ""}
                  </option>
                ))}
              </PhaseOneSelect>
            </PhaseOneField>
          </div>

          {error ? <PhaseOneNotice tone="error" title={error} /> : null}

          <div className="wf-panel-divider flex items-center justify-end gap-3 border-t pt-5">
            <PhaseOneQuietButton type="button" onClick={onClose}>
              Cancel
            </PhaseOneQuietButton>

            <PhaseOneAccentButton accent="indigo" type="submit" disabled={saving}>
              {saving ? "Creating…" : "Start care plan"}
            </PhaseOneAccentButton>
          </div>
        </form>
      </div>
    </div>
  );
}
