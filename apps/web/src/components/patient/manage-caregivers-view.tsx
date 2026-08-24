"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Clock,
  Copy,
  Plus,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import type {
  CaregiverAccessSummary,
  CaregiverInvitationSummary,
  PatientCaregiversResponse,
} from "@wonflow/contracts";

export function ManageCaregiversView() {
  const [delegates, setDelegates] = useState<CaregiverAccessSummary[]>([]);
  const [invitations, setInvitations] = useState<CaregiverInvitationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("family");
  const [validDays, setValidDays] = useState(30);
  const [submitting, setSubmitting] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<{
    token: string;
    expiresAt: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchCaregivers = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/v1/patient/caregivers");
      if (!res.ok) {
        throw new Error("Failed to load caregiver delegations.");
      }
      const data = (await res.json()) as PatientCaregiversResponse;
      setDelegates(data.activeDelegates || []);
      setInvitations(data.pendingInvitations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const res = await fetch("/api/v1/patient/caregivers");
        if (!res.ok) throw new Error("Failed to load caregiver delegations.");
        const data = (await res.json()) as PatientCaregiversResponse;
        if (mounted) {
          setDelegates(data.activeDelegates || []);
          setInvitations(data.pendingInvitations || []);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch("/api/v1/patient/caregivers/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          relationship,
          validDays,
          permissions: ["observations.write", "careplan.complete"],
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to issue caregiver invitation.");
      }

      const result = await res.json();
      setGeneratedInvite({
        token: result.inviteToken,
        expiresAt: result.expiresAt,
      });
      setEmail("");
      void fetchCaregivers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite caregiver.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (accessId: string) => {
    if (!confirm("Are you sure you want to revoke access for this caregiver?")) return;

    try {
      const res = await fetch(`/api/v1/patient/caregivers/${accessId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed to revoke caregiver delegation.");
      }
      void fetchCaregivers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to revoke access");
    }
  };

  const copyToken = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Caregiver Delegations
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Grant family members or home nurses access to record your vitals and complete daily care plan activities.
          </p>
        </div>
        <button
          onClick={() => {
            setGeneratedInvite(null);
            setShowInviteModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          Invite Caregiver
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* Active Caregivers */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Active Delegates ({delegates.length})
        </h3>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading delegates...</div>
        ) : delegates.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center">
            <UserCheck className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">No active caregivers delegated</p>
            <p className="text-xs text-slate-400 mt-1">Invite a family member or nurse to assist with your home care plan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {delegates.map((d) => (
              <div
                key={d.id}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">
                        {d.caregiverEmail}
                      </h4>
                      <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 capitalize">
                        {d.relationship}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRevoke(d.id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                      title="Revoke access"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Permissions: {d.permissions.join(", ")}</span>
                    </div>
                    {d.expiresAt && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>Expires: {new Date(d.expiresAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Pending Invitations ({invitations.length})
          </h3>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{inv.email}</p>
                  <p className="text-xs text-slate-400 capitalize">
                    {inv.relationship} • Expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
                  Pending Acceptance
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Dialog */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                Invite a Caregiver
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Send an invitation to allow someone to assist with your care plan.
              </p>
            </div>

            {generatedInvite ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs space-y-2">
                  <p className="font-semibold text-sm">Invitation Generated Successfully!</p>
                  <p>In development mode, provide this token directly to your caregiver:</p>
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-emerald-300 dark:border-emerald-700">
                    <code className="text-xs font-mono break-all text-slate-800 dark:text-slate-200 select-all">
                      {generatedInvite.token}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToken(generatedInvite.token)}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-600 dark:text-slate-300 shrink-0"
                      title="Copy Token"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Expires: {new Date(generatedInvite.expiresAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setGeneratedInvite(null);
                  }}
                  className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-medium hover:opacity-90"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Caregiver Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nurse.jane@example.com"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Relationship
                  </label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="family">Family Member</option>
                    <option value="nurse">Home Care Nurse</option>
                    <option value="guardian">Guardian / Conservator</option>
                    <option value="other">Other Professional Caregiver</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Delegation Duration
                  </label>
                  <select
                    value={validDays}
                    onChange={(e) => setValidDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value={7}>7 Days (Short-term assistance)</option>
                    <option value={30}>30 Days (Standard recovery window)</option>
                    <option value={90}>90 Days (Extended rehab)</option>
                    <option value={365}>1 Year (Long-term care)</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                  >
                    {submitting ? "Inviting..." : "Send Invitation"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
