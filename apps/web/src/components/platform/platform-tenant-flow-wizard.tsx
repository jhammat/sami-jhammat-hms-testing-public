"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Building2, Check, ShieldCheck, CreditCard, Key, Settings, Save } from "lucide-react";

import { WonFlowPageHeader } from "@/components/workspace";
import { PLATFORM_MODULE_CATALOG, usePlatformAdministration } from "./platform-administration-context";
import type { CreatePlatformTenantInput, ActivatePlatformTenantInput } from "./platform-administration-context";

import {
  PlatformLoadingState,
  PlatformPanel,
  PlatformPrimaryButton,
  platformInputClassName,
} from "./platform-administration-ui";

interface FlowStep {
  id: number;
  title: string;
  icon: React.ReactNode;
  completed: boolean;
  current: boolean;
}

const STEPS = [
  { id: 1, title: "Register Tenant", icon: <Building2 size={18} /> },
  { id: 2, title: "Select Entitlements", icon: <ShieldCheck size={18} /> },
  { id: 3, title: "Configure Subscription", icon: <CreditCard size={18} /> },
  { id: 4, title: "Set Credentials", icon: <Key size={18} /> },
  { id: 5, title: "Complete", icon: <Check size={18} /> },
];

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Meets validateNewPassword's rules (12+ chars, upper, lower, digit) by construction */
function generateTemporaryPassword(): string {
  return `Won${new Date().getFullYear()}!${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

function Field({ label, required = false, hint, error, children }: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">
        {label}
        {required ? <span className="ml-1 text-red-700">*</span> : null}
      </span>
      <span className="mt-1.5 block">{children}</span>
      {error ? (
        <span className="mt-1.5 block text-xs font-medium text-red-700">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs leading-5 text-slate-500">{hint}</span>
      ) : null}
    </label>
  );
}

export function PlatformTenantFlowWizard() {
  const { createTenant, activateTenant, reload, ready, workspace } = usePlatformAdministration();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ ownerEmail: string; temporaryPassword: string } | null>(null);
  
  // Step 1: Registration form
  const [registrationForm, setRegistrationForm] = useState<CreatePlatformTenantInput>({
    organizationName: "",
    slug: "",
    domain: "",
    legalName: "",
    primaryContactName: "",
    primaryContactEmail: "",
    primaryContactPhone: "",
  });
  const [registrationErrors, setRegistrationErrors] = useState<Record<string, string>>({});
  
  // Step 2: Entitlements
  const [selectedEntitlements, setSelectedEntitlements] = useState<Record<string, boolean>>({});
  
  // Step 3: Subscription
  const [subscriptionForm, setSubscriptionForm] = useState({
    planCode: "starter" as "starter" | "professional" | "enterprise",
    billingStatus: "TRIAL" as "TRIAL" | "ACTIVE",
    seatCount: 5,
    monthlyAmountMinor: 0,
    currencyCode: "PKR",
    trialEndsAt: "",
    renewsAt: "",
  });
  const [seatCountInput, setSeatCountInput] = useState("5");
  const [monthlyAmountInput, setMonthlyAmountInput] = useState("0");
  
  // Step 4: Credentials
  const [credentialsForm, setCredentialsForm] = useState({
    ownerName: "",
    ownerEmail: "",
    temporaryPassword: generateTemporaryPassword(),
    primaryBranchName: "",
  });
  const [credentialsErrors, setCredentialsErrors] = useState<Record<string, string>>({});
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!ready) {
    return <PlatformLoadingState label="Preparing tenant flow…" />;
  }

  const flowSteps: FlowStep[] = STEPS.map((step) => ({
    ...step,
    completed: step.id < currentStep || (step.id === 5 && credentials !== null),
    current: step.id === currentStep,
  }));

  function updateRegistrationField(field: keyof CreatePlatformTenantInput, value: string) {
    setRegistrationForm((current) => ({
      ...current,
      [field]: field === "slug" ? normalizeSlug(value) : value,
    }));
    setRegistrationErrors((current) => ({ ...current, [field]: "" }));
  }

  function validateRegistration(): boolean {
    const nextErrors: Record<string, string> = {};
    
    if (registrationForm.organizationName.trim().length < 2) {
      nextErrors.organizationName = "Enter the organization name.";
    }
    
    if (registrationForm.slug.trim().length < 2) {
      nextErrors.slug = "Enter a unique tenant slug.";
    } else if (workspace?.tenants.some(
      (tenant) => tenant.slug.toLocaleLowerCase() === registrationForm.slug.trim().toLocaleLowerCase()
    )) {
      nextErrors.slug = "This tenant slug is already in use.";
    }
    
    if (registrationForm.primaryContactEmail.trim() !== "" && !/^\S+@\S+\.\S+$/.test(registrationForm.primaryContactEmail)) {
      nextErrors.primaryContactEmail = "Enter a valid email address or leave it empty.";
    }
    
    setRegistrationErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleRegistrationSubmit() {
    if (!validateRegistration()) return;
    
    setSubmitting(true);
    setError("");
    
    try {
      const newTenantId = await createTenant(registrationForm);
      setTenantId(newTenantId);
      setCurrentStep(2);
    } catch (err) {
      const message = err instanceof Error ? err.message : "The tenant could not be created.";
      setRegistrationErrors({
        [/slug/i.test(message) ? "slug" : /domain/i.test(message) ? "domain" : "organizationName"]: message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  function validateCredentials(): boolean {
    const nextErrors: Record<string, string> = {};
    
    if (credentialsForm.ownerName.trim().length < 2) {
      nextErrors.ownerName = "Enter the owner name.";
    }
    
    if (!/^\S+@\S+\.\S+$/.test(credentialsForm.ownerEmail)) {
      nextErrors.ownerEmail = "Enter a valid email address.";
    }
    
    if (credentialsForm.temporaryPassword.length < 12) {
      nextErrors.temporaryPassword = "Password must be at least 12 characters.";
    }
    
    if (credentialsForm.primaryBranchName.trim().length < 2) {
      nextErrors.primaryBranchName = "Enter the branch name.";
    }
    
    setCredentialsErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleActivationSubmit() {
    if (!tenantId || !validateCredentials()) return;
    
    setSubmitting(true);
    setError("");
    
    try {
      // Convert selected entitlements to array format for backend
      const entitlementsArray = Object.entries(selectedEntitlements)
        .filter(([, enabled]) => enabled)
        .map(([moduleCode, enabled]) => ({ moduleCode, enabled }));
      
      console.log('Sending entitlements to backend:', entitlementsArray);
      
      // Activate tenant with subscription, credentials, and entitlements in a single atomic call
      const activationInput: ActivatePlatformTenantInput = {
        ownerName: credentialsForm.ownerName,
        ownerEmail: credentialsForm.ownerEmail,
        temporaryPassword: credentialsForm.temporaryPassword,
        primaryBranchName: credentialsForm.primaryBranchName,
        planCode: subscriptionForm.planCode,
        billingStatus: subscriptionForm.billingStatus,
        seatCount: subscriptionForm.seatCount,
        monthlyAmountMinor: subscriptionForm.monthlyAmountMinor,
        currencyCode: subscriptionForm.currencyCode,
        trialEndsAt: subscriptionForm.trialEndsAt || undefined,
        renewsAt: subscriptionForm.renewsAt || undefined,
        entitlements: entitlementsArray,
      };
      
      console.log('Full activation input:', activationInput);
      
      const result = await activateTenant(tenantId, activationInput);
      
      console.log('Activation result:', result);
      
      // Reload workspace data to ensure entitlements are reflected
      await reload();
      
      console.log('Workspace reloaded');
      
      setCredentials(result);
      setCurrentStep(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : "This organization could not be activated.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <WonFlowPageHeader
        breadcrumbs={[
          { label: "Platform Administration", href: "/platform" },
          { label: "Tenants", href: "/platform/organizations" },
          { label: "Guided Setup" },
        ]}
        description="Follow the steps to register a tenant, configure entitlements, set up subscription, and provide credentials."
        eyebrow="Tenant Provisioning"
        leading={<Building2 aria-hidden="true" size={20} />}
        title="Add Tenant - Guided Flow"
      />

      {/* Progress Steps */}
      <div className="flex items-center justify-between overflow-x-auto pb-2">
        {flowSteps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                  step.completed
                    ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                    : step.current
                      ? "border-indigo-500 bg-indigo-50 text-indigo-600"
                      : "border-slate-200 bg-white text-slate-400"
                }`}
              >
                {step.completed ? <Check size={18} /> : step.icon}
              </div>
              <span
                className={`mt-2 text-xs font-semibold ${
                  step.current ? "text-indigo-600" : step.completed ? "text-emerald-600" : "text-slate-500"
                }`}
              >
                {step.title}
              </span>
            </div>
            {index < flowSteps.length - 1 && (
              <ArrowRight className="mx-2 text-slate-300" size={16} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      {/* Step 1: Registration */}
      {currentStep === 1 && (
        <form onSubmit={(e) => { e.preventDefault(); handleRegistrationSubmit(); }} className="space-y-6">
          <PlatformPanel title="Organization Identity">
            <div className="grid gap-5 md:grid-cols-2">
              <Field
                error={registrationErrors.organizationName}
                label="Organization name"
                required
              >
                <input
                  autoFocus
                  className={platformInputClassName}
                  onChange={(e) => updateRegistrationField("organizationName", e.target.value)}
                  placeholder="Enter organization name"
                  value={registrationForm.organizationName}
                />
              </Field>
              <Field
                error={registrationErrors.slug}
                hint="Used as the internal tenant identifier and URL-safe key."
                label="Tenant slug"
                required
              >
                <input
                  className={platformInputClassName}
                  onChange={(e) => updateRegistrationField("slug", e.target.value)}
                  placeholder="organization-slug"
                  value={registrationForm.slug}
                />
              </Field>
              <Field label="Legal name">
                <input
                  className={platformInputClassName}
                  onChange={(e) => updateRegistrationField("legalName", e.target.value)}
                  placeholder="Leave empty until confirmed"
                  value={registrationForm.legalName}
                />
              </Field>
              <Field hint="Optional organization domain. Do not include a protocol." label="Domain">
                <input
                  className={platformInputClassName}
                  onChange={(e) => updateRegistrationField("domain", e.target.value)}
                  placeholder="organization.example"
                  value={registrationForm.domain}
                />
              </Field>
            </div>
          </PlatformPanel>

          <PlatformPanel title="Primary Contact">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Contact name">
                <input
                  className={platformInputClassName}
                  onChange={(e) => updateRegistrationField("primaryContactName", e.target.value)}
                  placeholder="Enter contact name"
                  value={registrationForm.primaryContactName}
                />
              </Field>
              <Field
                error={registrationErrors.primaryContactEmail}
                label="Contact email"
              >
                <input
                  autoComplete="email"
                  className={platformInputClassName}
                  onChange={(e) => updateRegistrationField("primaryContactEmail", e.target.value)}
                  placeholder="Enter contact email"
                  type="email"
                  value={registrationForm.primaryContactEmail}
                />
              </Field>
              <Field label="Contact phone">
                <input
                  autoComplete="tel"
                  className={platformInputClassName}
                  onChange={(e) => updateRegistrationField("primaryContactPhone", e.target.value)}
                  placeholder="Enter contact phone"
                  type="tel"
                  value={registrationForm.primaryContactPhone}
                />
              </Field>
            </div>
          </PlatformPanel>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              href="/platform/organizations"
            >
              Cancel
            </Link>
            <PlatformPrimaryButton disabled={submitting} type="submit">
              <Save aria-hidden="true" size={17} />
              {submitting ? "Creating tenant…" : "Continue to Entitlements"}
            </PlatformPrimaryButton>
          </div>
        </form>
      )}

      {/* Step 2: Entitlements */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <PlatformPanel title="Select Entitlements">
            <p className="text-sm text-slate-600 mb-4">
              Choose the modules this tenant should have access to. You can change these later.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PLATFORM_MODULE_CATALOG.map((module) => (
                <label
                  key={module.code}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                    selectedEntitlements[module.code]
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <input
                    checked={selectedEntitlements[module.code] || false}
                    onChange={(e) =>
                      setSelectedEntitlements((prev) => ({
                        ...prev,
                        [module.code]: e.target.checked,
                      }))
                    }
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{module.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{module.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </PlatformPanel>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={() => setCurrentStep(1)}
              type="button"
            >
              Back
            </button>
            <PlatformPrimaryButton onClick={() => setCurrentStep(3)}>
              Continue to Subscription
              <ArrowRight aria-hidden="true" size={17} />
            </PlatformPrimaryButton>
          </div>
        </div>
      )}

      {/* Step 3: Subscription */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <PlatformPanel title="Configure Subscription">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Plan">
                <select
                  className={platformInputClassName}
                  onChange={(e) =>
                    setSubscriptionForm((prev) => ({
                      ...prev,
                      planCode: e.target.value as "starter" | "professional" | "enterprise",
                    }))
                  }
                  value={subscriptionForm.planCode}
                >
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </Field>
              <Field label="Billing status">
                <select
                  className={platformInputClassName}
                  onChange={(e) =>
                    setSubscriptionForm((prev) => ({
                      ...prev,
                      billingStatus: e.target.value as "TRIAL" | "ACTIVE",
                    }))
                  }
                  value={subscriptionForm.billingStatus}
                >
                  <option value="TRIAL">Trial</option>
                  <option value="ACTIVE">Active</option>
                </select>
              </Field>
              <Field label="Currency">
                <input
                  className={platformInputClassName}
                  maxLength={3}
                  onChange={(e) =>
                    setSubscriptionForm((prev) => ({
                      ...prev,
                      currencyCode: e.target.value.toUpperCase(),
                    }))
                  }
                  value={subscriptionForm.currencyCode}
                />
              </Field>
              <Field hint="Number of licensed user seats for this tenant" label="Seats">
                <input
                  className={platformInputClassName}
                  min="1"
                  onChange={(e) => {
                    setSeatCountInput(e.target.value);
                    setSubscriptionForm((prev) => ({ ...prev, seatCount: Number(e.target.value) || 0 }));
                  }}
                  placeholder="5"
                  type="number"
                  value={seatCountInput}
                />
              </Field>
              <Field label="Monthly amount">
                <input
                  className={platformInputClassName}
                  min="0"
                  onChange={(e) => {
                    setMonthlyAmountInput(e.target.value);
                    setSubscriptionForm((prev) => ({
                      ...prev,
                      monthlyAmountMinor: Number(e.target.value) || 0,
                    }));
                  }}
                  step="0.01"
                  type="number"
                  value={monthlyAmountInput}
                />
              </Field>
              <Field hint="Optional trial end date (YYYY-MM-DD)" label="Trial end date">
                <input
                  className={platformInputClassName}
                  onChange={(e) =>
                    setSubscriptionForm((prev) => ({
                      ...prev,
                      trialEndsAt: e.target.value,
                    }))
                  }
                  placeholder="Leave empty for no trial"
                  type="date"
                  value={subscriptionForm.trialEndsAt}
                />
              </Field>
              <Field hint="Optional renewal date (YYYY-MM-DD)" label="Renewal date">
                <input
                  className={platformInputClassName}
                  onChange={(e) =>
                    setSubscriptionForm((prev) => ({
                      ...prev,
                      renewsAt: e.target.value,
                    }))
                  }
                  placeholder="Leave empty for auto-renewal"
                  type="date"
                  value={subscriptionForm.renewsAt}
                />
              </Field>
            </div>
          </PlatformPanel>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={() => setCurrentStep(2)}
              type="button"
            >
              Back
            </button>
            <PlatformPrimaryButton onClick={() => setCurrentStep(4)}>
              Continue to Credentials
              <ArrowRight aria-hidden="true" size={17} />
            </PlatformPrimaryButton>
          </div>
        </div>
      )}

      {/* Step 4: Credentials */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <PlatformPanel title="Owner Credentials">
            <p className="text-sm text-slate-600 mb-4">
              These credentials will be used to create the first administrator account for this tenant.
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field error={credentialsErrors.ownerName} label="Owner name" required>
                <input
                  autoFocus
                  className={platformInputClassName}
                  onChange={(e) =>
                    setCredentialsForm((prev) => ({ ...prev, ownerName: e.target.value }))
                  }
                  placeholder="Enter owner name"
                  value={credentialsForm.ownerName}
                />
              </Field>
              <Field error={credentialsErrors.ownerEmail} label="Owner email" required>
                <input
                  autoComplete="email"
                  className={platformInputClassName}
                  onChange={(e) =>
                    setCredentialsForm((prev) => ({ ...prev, ownerEmail: e.target.value }))
                  }
                  placeholder="Enter owner email"
                  type="email"
                  value={credentialsForm.ownerEmail}
                />
              </Field>
              <Field
                error={credentialsErrors.temporaryPassword}
                hint="Generate a secure password or customize it."
                label="Temporary password"
                required
              >
                <div className="mt-1 flex gap-2">
                  <input
                    className={`${platformInputClassName} mt-0 font-mono`}
                    onChange={(e) =>
                      setCredentialsForm((prev) => ({
                        ...prev,
                        temporaryPassword: e.target.value,
                      }))
                    }
                    type="text"
                    value={credentialsForm.temporaryPassword}
                  />
                  <button
                    className="h-10 shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    onClick={() =>
                      setCredentialsForm((prev) => ({
                        ...prev,
                        temporaryPassword: generateTemporaryPassword(),
                      }))
                    }
                    type="button"
                  >
                    Regenerate
                  </button>
                </div>
              </Field>
              <Field
                error={credentialsErrors.primaryBranchName}
                label="Main branch name"
                required
              >
                <input
                  className={platformInputClassName}
                  onChange={(e) =>
                    setCredentialsForm((prev) => ({
                      ...prev,
                      primaryBranchName: e.target.value,
                    }))
                  }
                  placeholder="Main Branch"
                  value={credentialsForm.primaryBranchName}
                />
              </Field>
            </div>
          </PlatformPanel>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={() => setCurrentStep(3)}
              type="button"
            >
              Back
            </button>
            <PlatformPrimaryButton disabled={submitting} onClick={handleActivationSubmit}>
              <Save aria-hidden="true" size={17} />
              {submitting ? "Activating…" : "Activate Organization"}
            </PlatformPrimaryButton>
          </div>
        </div>
      )}

      {/* Step 5: Complete */}
      {currentStep === 5 && credentials && tenantId && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Check size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-emerald-900">Tenant Activated Successfully</h3>
                <p className="text-sm text-emerald-700">
                  {registrationForm.organizationName} is now active and ready for use.
                </p>
              </div>
            </div>
          </div>

          <PlatformPanel title="Owner Credentials">
            <p className="text-sm text-slate-600 mb-4">
              Share these sign-in details with the hospital owner. Nothing is emailed automatically.
            </p>
            <div className="space-y-3 rounded-xl bg-slate-50 p-4 font-mono text-sm">
              <div>
                <span className="text-slate-600">Email:</span>
                <span className="ml-2 font-semibold text-slate-900">{credentials.ownerEmail}</span>
              </div>
              <div>
                <span className="text-slate-600">Temporary password:</span>
                <span className="ml-2 font-semibold text-slate-900">{credentials.temporaryPassword}</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              The owner must set their own password on first sign-in. These credentials will not be shown again.
            </p>
          </PlatformPanel>

          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
              href={`/platform/organizations/${tenantId}?tab=settings`}
            >
              <span className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Settings size={18} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-950">Edit Settings</span>
                  <span className="block text-xs text-slate-500">Configure tenant settings</span>
                </span>
              </span>
              <ArrowRight className="text-slate-300" size={18} />
            </Link>
            <Link
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
              href={`/platform/organizations/${tenantId}`}
            >
              <span className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Building2 size={18} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-950">View Tenant</span>
                  <span className="block text-xs text-slate-500">Go to tenant details</span>
                </span>
              </span>
              <ArrowRight className="text-slate-300" size={18} />
            </Link>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              href="/platform/organizations"
            >
              Back to Tenants
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
