"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { ReferralPriority } from "@wonflow/contracts";

/**
 * Who a patient can be handed on to.
 *
 * This dialog offered the two allied disciplines and nothing else, so a
 * surgeon who wanted a colleague in another department to see the patient had
 * no screen to do it from. `DOCTOR` is that referral: it names a specific
 * doctor, is grouped by the department they belong to, and is stored with the
 * `OTHER` discipline so it stays outside the physiotherapy and dietetics
 * worklists.
 */
type ReferralTarget = "PHYSIOTHERAPY" | "NUTRITION" | "DOCTOR";

interface CareTeamMember {
  id: string;
  staffType: string;
  title: string | null;
  displayName: string;
  branchName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  specialty?: string | null;
}

interface DepartmentRow {
  id: string;
  name: string;
  code: string;
  doctorCount: number;
}

interface PrefilledClinician {
  id: string;
  displayName: string;
  title: string | null;
}

interface ReferralManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName?: string;
  onReferralCreated?: (referral: unknown) => void;
  /** Shown above the form when the dialog follows another action, e.g. starting a care plan. */
  introMessage?: string;
  /** Label for the dismiss button — "Skip for now" when the referral is optional follow-on work. */
  closeLabel?: string;
  /**
   * Clinicians already chosen upstream — the physiotherapist and dietitian
   * named on a care plan.
   *
   * Naming them on the plan and then picking them again here is the same
   * decision made twice, and the second one is the one that can be got wrong:
   * the dialog opened on PHYSIOTHERAPY with nobody assigned, so the obvious
   * path was to raise one referral, unassigned, and never notice the dietitian
   * was never referred at all. When they are known, the dialog asks for the
   * reason and sends the referrals to exactly those people.
   */
  prefill?: {
    physiotherapist?: PrefilledClinician | null;
    nutritionist?: PrefilledClinician | null;
  };
  /** Set when the referral is raised from a care plan, so ending the plan closes it. */
  carePlanId?: string;
}

const TARGET_LABELS: Record<ReferralTarget, string> = {
  PHYSIOTHERAPY: "Physiotherapy / Mobility",
  NUTRITION: "Clinical Nutrition / Dietetics",
  DOCTOR: "Doctor / another department",
};

const TARGET_ROLE: Record<ReferralTarget, string> = {
  PHYSIOTHERAPY: "physiotherapist",
  NUTRITION: "dietitian",
  DOCTOR: "doctor",
};

const inputClass =
  "w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white";

/** Name first, then the detail that tells two colleagues apart. */
function describeMember(member: CareTeamMember): string {
  const qualifiers = [
    member.specialty ?? member.title,
    member.departmentName,
    member.branchName,
  ].filter((value): value is string => Boolean(value?.trim()));

  const unique = [...new Set(qualifiers)];
  return unique.length > 0 ? `${member.displayName} — ${unique.join(" · ")}` : member.displayName;
}

export function ReferralManagerModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  onReferralCreated,
  introMessage,
  closeLabel = "Cancel",
  prefill,
  carePlanId,
}: ReferralManagerModalProps) {
  /**
   * The clinicians carried in from the care plan, in the order they are sent.
   *
   * An empty list means the ordinary dialog: pick a discipline, pick a person.
   */
  const prefilledPhysiotherapist = prefill?.physiotherapist ?? null;
  const prefilledNutritionist = prefill?.nutritionist ?? null;

  const prefilled = useMemo(
    () =>
      [
        prefilledPhysiotherapist
          ? { discipline: "PHYSIOTHERAPY" as const, clinician: prefilledPhysiotherapist }
          : null,
        prefilledNutritionist
          ? { discipline: "NUTRITION" as const, clinician: prefilledNutritionist }
          : null,
      ].filter((entry): entry is { discipline: "PHYSIOTHERAPY" | "NUTRITION"; clinician: PrefilledClinician } =>
        entry !== null,
      ),
    [prefilledPhysiotherapist, prefilledNutritionist],
  );

  const isHandoff = prefilled.length > 0;

  const [target, setTarget] = useState<ReferralTarget>(
    prefilled[0]?.discipline ?? "PHYSIOTHERAPY",
  );
  const [priority, setPriority] = useState<ReferralPriority>("ROUTINE");
  const [reason, setReason] = useState("");
  const [goal, setGoal] = useState("");
  const [surgicalSummary, setSurgicalSummary] = useState("");
  const [precautions, setPrecautions] = useState("");
  const [validDays, setValidDays] = useState(30);
  /** Only meaningful in the care plan hand-off, where the optional fields fold away. */
  const [showClinicalDetail, setShowClinicalDetail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /*
   * Who the referral goes to.
   *
   * `createReferral` has always accepted and validated an `assignedToId`, but
   * this dialog never offered one and never sent it, so every referral landed
   * unassigned in a departmental pool. A surgeon who wants a named
   * physiotherapist on a post-Whipple patient had no way to say so from here.
   */
  const [allied, setAllied] = useState<CareTeamMember[]>([]);
  const [doctors, setDoctors] = useState<CareTeamMember[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  /*
   * Held as "has it loaded" rather than "is it loading" so the flag is only
   * flipped from inside the fetch. Setting it as the effect starts would be a
   * synchronous cascading render.
   */
  const [teamLoaded, setTeamLoaded] = useState(false);
  const loadingTeam = !teamLoaded;

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/v1/clinical/care-team", {
          credentials: "same-origin",
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);
        if (!cancelled && response.ok) {
          setAllied(payload?.allied ?? []);
          setDoctors(payload?.doctors ?? []);
          setDepartments(payload?.departments ?? []);
        }
      } catch {
        // Allied referrals can still go to the pool; the doctor list simply stays empty.
      } finally {
        if (!cancelled) setTeamLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  /**
   * Changing where the referral is going invalidates a person chosen for
   * somewhere else, so the assignee and department clear with it.
   *
   * Done here rather than in an effect on `target`: the only thing that
   * changes the target is this handler, and resetting in an effect renders
   * once with a physiotherapist still selected under "Doctor" before
   * correcting itself.
   */
  const changeTarget = (next: ReferralTarget) => {
    setTarget(next);
    setAssignedToId("");
    setDepartmentId("");
  };

  const candidates = useMemo(() => {
    if (target === "DOCTOR") {
      return departmentId ? doctors.filter((doctor) => doctor.departmentId === departmentId) : doctors;
    }
    const wanted = target === "PHYSIOTHERAPY" ? "PHYSIOTHERAPIST" : "NUTRITIONIST";
    return allied.filter((staff) => staff.staffType === wanted);
  }, [target, departmentId, doctors, allied]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please provide a reason for the referral.");
      return;
    }
    if (!isHandoff && target === "DOCTOR" && !assignedToId) {
      setError("Choose the doctor this patient is being referred to.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    /*
     * One request per clinician the plan named, or one for the manual choice.
     *
     * A referral carries a single discipline and a single assignee, so a plan
     * with both a physiotherapist and a dietitian is two referrals — raised
     * from the one reason the surgeon typed, rather than making them open this
     * dialog a second time and remember what they wrote the first time.
     */
    const requests = isHandoff
      ? prefilled.map((entry) => ({
          specialty: entry.discipline,
          assignedToId: entry.clinician.id,
          departmentId: undefined as string | undefined,
        }))
      : [
          {
            specialty: target,
            assignedToId: assignedToId || undefined,
            departmentId: target === "DOCTOR" ? departmentId || undefined : undefined,
          },
        ];

    try {
      const created: unknown[] = [];

      for (const request of requests) {
        const res = await fetch("/api/v1/allied/referrals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            patientId,
            ...request,
            priority,
            reason: reason.trim(),
            goal: goal.trim() || undefined,
            surgicalSummary: surgicalSummary.trim() || undefined,
            precautions: precautions.trim() || undefined,
            validDays,
            carePlanId: carePlanId || undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          /*
           * Name the discipline that failed.
           *
           * With two referrals in flight, "Failed to create clinical referral"
           * leaves the surgeon unable to tell which one landed — and the first
           * one already has. Saying so is the difference between retrying the
           * right one and raising a duplicate.
           */
          const label = TARGET_LABELS[request.specialty as ReferralTarget] ?? request.specialty;
          const soFar = created.length > 0 ? ` The ${TARGET_LABELS[requests[0]!.specialty as ReferralTarget]} referral was created.` : "";
          throw new Error(`${data.error?.message || "Failed to create clinical referral"} (${label}).${soFar}`);
        }
        created.push(data.referral);
      }

      setSuccess(true);
      if (onReferralCreated) {
        for (const referral of created) onReferralCreated(referral);
      }
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setReason("");
        setGoal("");
        setSurgicalSummary("");
        setPrecautions("");
        setAssignedToId("");
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const roleLabel = TARGET_ROLE[target];
  const emptyCandidateMessage =
    target === "DOCTOR"
      ? departmentId
        ? "No doctor is assigned to this department yet"
        : "No doctors have been set up for this hospital yet"
      : `No ${roleLabel} has a login for this hospital yet`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Create Clinical Referral
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Refer {patientName || `Patient #${patientId.slice(0, 8)}`} to allied health or a colleague
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            type="button"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="text-base font-semibold text-slate-900 dark:text-white">
              {prefilled.length > 1 ? "Referrals Created Successfully" : "Referral Created Successfully"}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isHandoff
                ? `${prefilled.map((entry) => entry.clinician.displayName).join(" and ")} ${
                    prefilled.length > 1 ? "have" : "has"
                  } the patient on their worklist, with the surgical context.`
                : `${TARGET_LABELS[target]} has received the referral with its surgical context.`}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {introMessage ? (
              <div className="p-3 text-xs bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-indigo-800 dark:text-indigo-200 rounded-xl">
                {introMessage}
              </div>
            ) : null}

            {error && (
              <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl">
                {error}
              </div>
            )}

            {/* Who this is going to, when the care plan already decided. */}
            {isHandoff ? (
              <div>
                <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Referring to
                </span>
                <div className="space-y-1.5">
                  {prefilled.map((entry) => (
                    <div
                      key={entry.clinician.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50/70 px-3 py-2 dark:border-sky-900/50 dark:bg-sky-950/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {entry.clinician.displayName}
                        </p>
                        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {entry.clinician.title ?? TARGET_ROLE[entry.discipline]}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        {entry.discipline === "PHYSIOTHERAPY" ? "Physio" : "Nutrition"}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Taken from the care plan.{" "}
                  {prefilled.length === 2
                    ? "Two referrals are raised from the one reason below."
                    : "Change the assignment on the plan itself if this is wrong."}
                </p>
              </div>
            ) : null}

            <div className={`grid gap-4 ${isHandoff ? "grid-cols-1" : "grid-cols-2"}`}>
              {!isHandoff ? (
                <div>
                  <label htmlFor="ref-target" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Refer to <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="ref-target"
                    value={target}
                    onChange={(e) => changeTarget(e.target.value as ReferralTarget)}
                    className={inputClass}
                  >
                    {(Object.keys(TARGET_LABELS) as ReferralTarget[]).map((value) => (
                      <option key={value} value={value}>
                        {TARGET_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label htmlFor="ref-priority" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Urgency / Priority
                </label>
                <select
                  id="ref-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as ReferralPriority)}
                  className={inputClass}
                >
                  <option value="ROUTINE">Routine</option>
                  <option value="URGENT">Urgent (Within 24h)</option>
                  <option value="EMERGENCY">Emergency (Immediate)</option>
                </select>
              </div>
            </div>

            {!isHandoff && target === "DOCTOR" ? (
              <div>
                <label htmlFor="ref-department" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Department
                </label>
                <select
                  id="ref-department"
                  value={departmentId}
                  onChange={(e) => {
                    setDepartmentId(e.target.value);
                    setAssignedToId("");
                  }}
                  className={inputClass}
                >
                  <option value="">All departments ({doctors.length} doctors)</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name} ({department.doctorCount})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Narrows the list below. Leave on &ldquo;All departments&rdquo; to see every doctor in the hospital.
                </p>
              </div>
            ) : null}

            {!isHandoff ? (
            <div>
              <label htmlFor="ref-assignee" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Assign to {roleLabel}
                {target === "DOCTOR" ? <span className="text-rose-500"> *</span> : null}
              </label>
              <select
                id="ref-assignee"
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                disabled={loadingTeam || candidates.length === 0}
                required={target === "DOCTOR"}
                className={inputClass}
              >
                <option value="">
                  {loadingTeam
                    ? "Loading the hospital's clinicians..."
                    : candidates.length === 0
                      ? emptyCandidateMessage
                      : target === "DOCTOR"
                        ? "Select a doctor"
                        : "Any available — leave for the department to pick up"}
                </option>
                {candidates.map((member) => (
                  <option key={member.id} value={member.id}>
                    {describeMember(member)}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                {target === "DOCTOR"
                  ? "A doctor-to-doctor referral always names the receiving clinician."
                  : "Optional. Naming someone sends it straight to their worklist; leaving it open puts it in the department's queue."}
              </p>
            </div>
            ) : null}

            <div>
              <label htmlFor="ref-reason" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Referral <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="ref-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Post-Whipple respiratory physiotherapy and early ambulation protocol"
                rows={2}
                className={inputClass}
                required
              />
            </div>

            {/*
              * Goal, validity, summary and precautions.
              *
              * When the care plan already named the clinicians, the only thing
              * this dialog genuinely needs is the reason, so the rest folds away
              * behind a disclosure rather than standing between the surgeon and
              * the button. Opened by hand it behaves exactly as before, and
              * outside the hand-off it is always open.
              */}
            {isHandoff ? (
              <button
                type="button"
                onClick={() => setShowClinicalDetail((open) => !open)}
                className="text-xs font-semibold text-sky-700 hover:text-sky-600 dark:text-sky-400"
              >
                {showClinicalDetail ? "− Hide" : "+ Add"} goal, validity, surgical summary and precautions
              </button>
            ) : null}

            {!isHandoff || showClinicalDetail ? (
            <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="ref-goal" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Clinical Goal
                </label>
                <input
                  id="ref-goal"
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g. Independent chair transfer by POD 3"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="ref-valid" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Validity (Days)
                </label>
                <input
                  id="ref-valid"
                  type="number"
                  value={validDays}
                  onChange={(e) => setValidDays(parseInt(e.target.value, 10) || 30)}
                  min={1}
                  max={365}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="ref-summary" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Surgical &amp; Clinical Summary
              </label>
              <textarea
                id="ref-summary"
                value={surgicalSummary}
                onChange={(e) => setSurgicalSummary(e.target.value)}
                placeholder="e.g. Total pancreatectomy with splenectomy on 2026-08-20. Jackson-Pratt drain in right upper quadrant."
                rows={2}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="ref-precautions" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Precautions &amp; Restrictions
              </label>
              <input
                id="ref-precautions"
                type="text"
                value={precautions}
                onChange={(e) => setPrecautions(e.target.value)}
                placeholder="e.g. Avoid intra-abdominal strain; protect JP drain tubing"
                className={inputClass}
              />
            </div>
            </>
            ) : null}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                {closeLabel}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 rounded-xl shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting
                  ? "Creating..."
                  : prefilled.length > 1
                  ? "Submit Both Referrals"
                  : "Submit Referral"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
