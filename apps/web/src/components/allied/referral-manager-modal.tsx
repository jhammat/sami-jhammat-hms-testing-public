"use client";

import React, { useEffect, useState } from "react";
import type { ReferralDiscipline, ReferralPriority } from "@wonflow/contracts";

interface AlliedStaffRow {
  id: string;
  staffType: string;
  title: string | null;
  displayName: string;
}

interface ReferralManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName?: string;
  onReferralCreated?: (referral: unknown) => void;
}

export function ReferralManagerModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  onReferralCreated,
}: ReferralManagerModalProps) {
  const [discipline, setDiscipline] = useState<ReferralDiscipline>("PHYSIOTHERAPY");
  const [priority, setPriority] = useState<ReferralPriority>("ROUTINE");
  const [reason, setReason] = useState("");
  const [goal, setGoal] = useState("");
  const [surgicalSummary, setSurgicalSummary] = useState("");
  const [precautions, setPrecautions] = useState("");
  const [validDays, setValidDays] = useState(30);
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
  const [allied, setAllied] = useState<AlliedStaffRow[]>([]);
  const [assignedToId, setAssignedToId] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/v1/allied/staff", { credentials: "same-origin", cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (!cancelled && response.ok) setAllied(payload?.staff ?? []);
      } catch {
        // Assignment stays optional — the referral can still go to the pool.
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen]);

  // Changing the discipline invalidates a person chosen from the other one.
  useEffect(() => { setAssignedToId(""); }, [discipline]);

  if (!isOpen) return null;

  const staffForDiscipline = allied.filter((staff) =>
    discipline === "PHYSIOTHERAPY" ? staff.staffType === "PHYSIOTHERAPIST" : staff.staffType === "NUTRITIONIST",
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please provide a reason for the referral.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/allied/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          specialty: discipline,
          discipline,
          assignedToId: assignedToId || undefined,
          priority,
          reason: reason.trim(),
          goal: goal.trim() || undefined,
          surgicalSummary: surgicalSummary.trim() || undefined,
          precautions: precautions.trim() || undefined,
          validDays,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to create clinical referral");
      }

      setSuccess(true);
      if (onReferralCreated) {
        onReferralCreated(data.referral);
      }
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setReason("");
        setGoal("");
        setSurgicalSummary("");
        setPrecautions("");
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Create Clinical Referral
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Refer {patientName || `Patient #${patientId.slice(0, 8)}`} to an allied health discipline
            </p>
          </div>
          <button
            onClick={onClose}
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
              Referral Created Successfully
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              The {discipline.toLowerCase()} team has received the referral with surgical context.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Discipline <span className="text-rose-500">*</span>
                </label>
                <select
                  value={discipline}
                  onChange={(e) => setDiscipline(e.target.value as ReferralDiscipline)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white"
                >
                  <option value="PHYSIOTHERAPY">Physiotherapy / Mobility</option>
                  <option value="NUTRITION">Clinical Nutrition / Dietetics</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Urgency / Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as ReferralPriority)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white"
                >
                  <option value="ROUTINE">Routine</option>
                  <option value="URGENT">Urgent (Within 24h)</option>
                  <option value="EMERGENCY">Emergency (Immediate)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Assign to {discipline === "PHYSIOTHERAPY" ? "physiotherapist" : "dietitian"}
              </label>
              <select
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white"
              >
                <option value="">
                  {staffForDiscipline.length
                    ? "Any available — leave for the department to pick up"
                    : "No one is set up in this department yet"}
                </option>
                {staffForDiscipline.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.displayName}
                    {staff.title ? ` — ${staff.title}` : ""}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Optional. Naming someone sends it straight to their worklist; leaving it open puts it in the
                department&apos;s queue.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Referral <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Post-Whipple respiratory physiotherapy and early ambulation protocol"
                rows={2}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Clinical Goal
                </label>
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g. Independent chair transfer by POD 3"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Validity (Days)
                </label>
                <input
                  type="number"
                  value={validDays}
                  onChange={(e) => setValidDays(parseInt(e.target.value, 10) || 30)}
                  min={1}
                  max={365}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Surgical & Clinical Summary
              </label>
              <textarea
                value={surgicalSummary}
                onChange={(e) => setSurgicalSummary(e.target.value)}
                placeholder="e.g. Total pancreatectomy with splenectomy on 2026-08-20. Jackson-Pratt drain in right upper quadrant."
                rows={2}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Precautions & Restrictions
              </label>
              <input
                type="text"
                value={precautions}
                onChange={(e) => setPrecautions(e.target.value)}
                placeholder="e.g. Avoid intra-abdominal strain; protect JP drain tubing"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 rounded-xl shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? "Creating..." : "Submit Referral"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
