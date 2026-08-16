"use client";

import { useEffect, useState } from "react";

import {
  useConfiguration,
  useCreateAdminService,
  useCreateBranch,
  useCreatePolicy,
  useInviteUser,
  useOnboardingState,
  useUpdateOrganization,
} from "@/lib/api/admin";
import type { OnboardingState, OnboardingStepState } from "@/lib/api/admin";

const STEPS = ["profile", "locations", "service-catalogue", "team", "policies", "review"] as const;
type StepCode = (typeof STEPS)[number];

const STEP_LABELS: Record<StepCode, string> = {
  profile: "Organization profile",
  locations: "Locations",
  "service-catalogue": "Service catalogue",
  team: "Team",
  policies: "Policies",
  review: "Review",
};

function saveState(input: OnboardingState) {
  return fetch("/api/v1/admin/onboarding", { method: "PATCH", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
}

/**
 * Every step's progress is written to the server the moment it changes —
 * there is nothing in this component's own state that survives a reload
 * except what was already persisted. Starting the wizard on one device
 * and continuing on another sees identical progress.
 */
export function TenantOnboardingWizard() {
  const onboarding = useOnboardingState();
  const configuration = useConfiguration();
  const [step, setStep] = useState<StepCode>("profile");
  const [steps, setSteps] = useState<Record<string, OnboardingStepState>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (!onboarding.data) return;
    const data = onboarding.data;
    queueMicrotask(() => {
      const loadedStep = STEPS.includes(data.onboarding.currentStep as StepCode) ? (data.onboarding.currentStep as StepCode) : "profile";
      setStep(loadedStep);
      setSteps(data.onboarding.steps);
    });
  }, [onboarding.data]);

  async function markStep(code: StepCode, status: OnboardingStepState["status"]) {
    const now = new Date().toISOString();
    const next = { ...steps, [code]: { status, ...(status === "completed" ? { completedAt: now } : {}), ...(status === "skipped" ? { skippedAt: now } : {}), ...(status === "in-progress" ? { startedAt: steps[code]?.startedAt ?? now } : {}) } };
    setSteps(next);
    const nextStepIndex = STEPS.indexOf(code) + 1;
    const nextStep = STEPS[nextStepIndex] ?? "review";
    setStep(nextStep);
    await saveState({ currentStep: nextStep, steps: next });
  }

  const [orgName, setOrgName] = useState("");
  const updateOrganization = useUpdateOrganization();
  async function submitProfile(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try { await updateOrganization.mutate({ displayName: orgName.trim() }); await markStep("profile", "completed"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save the organization profile."); }
  }

  const [branchForm, setBranchForm] = useState({ code: "", name: "" });
  const createBranch = useCreateBranch();
  async function submitBranch(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try { await createBranch.mutate({ code: branchForm.code.trim(), name: branchForm.name.trim(), isMainBranch: true }); await markStep("locations", "completed"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create the branch."); }
  }

  const [serviceForm, setServiceForm] = useState({ name: "", category: "CONSULTATION", durationMinutes: "20", priceMinorUnits: "0" });
  const createService = useCreateAdminService();
  async function submitService(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try { await createService.mutate({ name: serviceForm.name.trim(), category: serviceForm.category, durationMinutes: Number(serviceForm.durationMinutes), priceMinorUnits: Math.round(Number(serviceForm.priceMinorUnits) * 100) }); await markStep("service-catalogue", "completed"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create the service."); }
  }

  const [inviteForm, setInviteForm] = useState({ email: "", displayName: "" });
  const inviteUser = useInviteUser();
  async function submitInvite(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try { await inviteUser.mutate({ email: inviteForm.email.trim(), displayName: inviteForm.displayName.trim() }); await markStep("team", "completed"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not invite the team member."); }
  }

  const [policyForm, setPolicyForm] = useState({ title: "", category: "GENERAL", body: "" });
  const createPolicy = useCreatePolicy();
  async function submitPolicy(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try { await createPolicy.mutate({ title: policyForm.title.trim(), category: policyForm.category, body: policyForm.body.trim() }); await markStep("policies", "completed"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create the policy."); }
  }

  if (onboarding.status === "loading" || configuration.status === "loading") return <p className="p-6 text-sm text-slate-500">Loading onboarding progress…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="rounded-3xl bg-gradient-to-r from-indigo-700 to-blue-700 p-6 text-white">
        <h1 className="text-2xl font-black">Set up your organization</h1>
        <p className="mt-1 text-sm text-indigo-100">Your progress is saved after every step — pick up from any device.</p>
      </header>

      <nav className="flex flex-wrap gap-2">
        {STEPS.map((code) => {
          const status = steps[code]?.status ?? "not-started";
          return (
            <button className={`rounded-full px-4 py-1.5 text-sm font-bold ${step === code ? "bg-indigo-700 text-white" : status === "completed" ? "bg-emerald-100 text-emerald-800" : status === "skipped" ? "bg-slate-200 text-slate-500" : "bg-white text-slate-600 border border-slate-200"}`} key={code} onClick={() => setStep(code)} type="button">
              {STEP_LABELS[code]}{status === "completed" ? " ✓" : ""}
            </button>
          );
        })}
      </nav>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div> : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        {step === "profile" ? (
          <form className="space-y-3" onSubmit={submitProfile}>
            <h2 className="text-lg font-black">Organization profile</h2>
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2" defaultValue={configuration.data?.configuration.displayName} onChange={(e) => setOrgName(e.target.value)} placeholder="Organization name" required />
            <button className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-black text-white" type="submit">Save and continue</button>
          </form>
        ) : null}

        {step === "locations" ? (
          <form className="space-y-3" onSubmit={submitBranch}>
            <h2 className="text-lg font-black">Add your first location</h2>
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2" onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })} placeholder="Branch code" required value={branchForm.code} />
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2" onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} placeholder="Branch name" required value={branchForm.name} />
            <div className="flex gap-2">
              <button className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-black text-white" type="submit">Save and continue</button>
              <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold" onClick={() => void markStep("locations", "skipped")} type="button">Skip</button>
            </div>
          </form>
        ) : null}

        {step === "service-catalogue" ? (
          <form className="space-y-3" onSubmit={submitService}>
            <h2 className="text-lg font-black">Add a service</h2>
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2" onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} placeholder="Service name" required value={serviceForm.name} />
            <select className="w-full rounded-xl border border-slate-200 px-3 py-2" onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })} value={serviceForm.category}>
              {["CONSULTATION", "LABORATORY", "RADIOLOGY", "PHARMACY", "EMERGENCY", "OTHER"].map((code) => <option key={code} value={code}>{code.replaceAll("_", " ")}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input className="rounded-xl border border-slate-200 px-3 py-2" min="5" onChange={(e) => setServiceForm({ ...serviceForm, durationMinutes: e.target.value })} type="number" value={serviceForm.durationMinutes} />
              <input className="rounded-xl border border-slate-200 px-3 py-2" min="0" onChange={(e) => setServiceForm({ ...serviceForm, priceMinorUnits: e.target.value })} placeholder="Price (PKR)" step="0.01" type="number" value={serviceForm.priceMinorUnits} />
            </div>
            <div className="flex gap-2">
              <button className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-black text-white" type="submit">Save and continue</button>
              <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold" onClick={() => void markStep("service-catalogue", "skipped")} type="button">Skip</button>
            </div>
          </form>
        ) : null}

        {step === "team" ? (
          <form className="space-y-3" onSubmit={submitInvite}>
            <h2 className="text-lg font-black">Invite a team member</h2>
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2" onChange={(e) => setInviteForm({ ...inviteForm, displayName: e.target.value })} placeholder="Full name" required value={inviteForm.displayName} />
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2" onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="Email" required type="email" value={inviteForm.email} />
            <div className="flex gap-2">
              <button className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-black text-white" type="submit">Save and continue</button>
              <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold" onClick={() => void markStep("team", "skipped")} type="button">Skip</button>
            </div>
          </form>
        ) : null}

        {step === "policies" ? (
          <form className="space-y-3" onSubmit={submitPolicy}>
            <h2 className="text-lg font-black">Add a policy</h2>
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2" onChange={(e) => setPolicyForm({ ...policyForm, title: e.target.value })} placeholder="Policy title" required value={policyForm.title} />
            <textarea className="w-full rounded-xl border border-slate-200 px-3 py-2" onChange={(e) => setPolicyForm({ ...policyForm, body: e.target.value })} placeholder="Policy content" required rows={4} value={policyForm.body} />
            <div className="flex gap-2">
              <button className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-black text-white" type="submit">Save and continue</button>
              <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold" onClick={() => void markStep("policies", "skipped")} type="button">Skip</button>
            </div>
          </form>
        ) : null}

        {step === "review" ? (
          <div className="space-y-3">
            <h2 className="text-lg font-black">Review</h2>
            <ul className="space-y-1 text-sm">
              {STEPS.filter((code) => code !== "review").map((code) => (
                <li key={code}>{STEP_LABELS[code]}: <span className="font-bold">{steps[code]?.status ?? "not-started"}</span></li>
              ))}
            </ul>
            <button className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white" onClick={() => void markStep("review", "completed")} type="button">Finish setup</button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
