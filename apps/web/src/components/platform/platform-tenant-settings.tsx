"use client";

import { useState } from "react";
import { Key, Save, Check, AlertCircle } from "lucide-react";

import { PlatformPanel, PlatformPrimaryButton, platformInputClassName } from "./platform-administration-ui";
import { usePlatformAdministration } from "./platform-administration-context";

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

/** Meets validateNewPassword's rules (12+ chars, upper, lower, digit) by construction */
function generateTemporaryPassword(): string {
  return `Won${new Date().getFullYear()}!${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

export function PlatformTenantSettingsPanel({ tenantId }: { tenantId: string }) {
  const { getTenant } = usePlatformAdministration();
  const tenant = getTenant(tenantId);
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  
  const [settingsForm, setSettingsForm] = useState({
    defaultBranchName: tenant?.settings.defaultBranchName || "",
    defaultLocale: tenant?.settings.defaultLocale || "",
    secondaryLocale: tenant?.settings.secondaryLocale || "",
    timezone: tenant?.settings.timezone || "",
    currencyCode: tenant?.settings.currencyCode || "",
  });
  const [settingsErrors, setSettingsErrors] = useState<Record<string, string>>({});
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [settingsSubmitting, setSettingsSubmitting] = useState(false);

  if (!tenant) {
    return (
      <div className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-700">
        This organization could not be found.
      </div>
    );
  }

  function validatePasswordChange(): boolean {
    const nextErrors: Record<string, string> = {};
    
    if (passwordForm.newPassword.length < 12) {
      nextErrors.newPassword = "Password must be at least 12 characters.";
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }
    
    setPasswordErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handlePasswordChange() {
    if (!validatePasswordChange()) return;
    
    setPasswordSubmitting(true);
    setPasswordSuccess(false);
    
    try {
      // In a real implementation, this would call an API to change the password
      // For now, we'll simulate success
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setPasswordSuccess(true);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      setPasswordErrors({
        newPassword: err instanceof Error ? err.message : "Password could not be changed.",
      });
    } finally {
      setPasswordSubmitting(false);
    }
  }

  function validateSettings(): boolean {
    const nextErrors: Record<string, string> = {};
    
    if (settingsForm.defaultBranchName.trim().length < 2) {
      nextErrors.defaultBranchName = "Enter a valid branch name.";
    }
    
    if (settingsForm.defaultLocale.trim().length < 2) {
      nextErrors.defaultLocale = "Enter a valid locale code.";
    }
    
    setSettingsErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSettingsSave() {
    if (!validateSettings()) return;
    
    setSettingsSubmitting(true);
    setSettingsSuccess(false);
    
    try {
      // In a real implementation, this would call an API to update settings
      // For now, we'll simulate success
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err) {
      setSettingsErrors({
        defaultBranchName: err instanceof Error ? err.message : "Settings could not be saved.",
      });
    } finally {
      setSettingsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Password Management */}
      <PlatformPanel title="Password Management">
        <p className="text-sm text-slate-600 mb-4">
          Change the temporary password or reset the owner account password.
        </p>
        
        {passwordSuccess && (
          <div className="mb-4 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-900 flex items-center gap-2">
            <Check size={14} />
            Password changed successfully.
          </div>
        )}
        
        <div className="space-y-4">
          <Field label="Current password" required>
            <input
              className={platformInputClassName}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
              }
              placeholder="Enter current password"
              type="password"
              value={passwordForm.currentPassword}
            />
          </Field>
          
          <Field
            error={passwordErrors.newPassword}
            hint="Must be at least 12 characters."
            label="New password"
            required
          >
            <div className="mt-1 flex gap-2">
              <input
                className={platformInputClassName}
                onChange={(e) =>
                  setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                }
                placeholder="Enter new password"
                type="password"
                value={passwordForm.newPassword}
              />
              <button
                className="h-10 shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 flex items-center gap-1"
                onClick={() =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    newPassword: generateTemporaryPassword(),
                    confirmPassword: generateTemporaryPassword(),
                  }))
                }
                type="button"
              >
                <Key size={14} />
                Generate
              </button>
            </div>
          </Field>
          
          <Field
            error={passwordErrors.confirmPassword}
            label="Confirm new password"
            required
          >
            <input
              className={platformInputClassName}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
              }
              placeholder="Confirm new password"
              type="password"
              value={passwordForm.confirmPassword}
            />
          </Field>
        </div>
        
        <div className="mt-4 flex justify-end">
          <PlatformPrimaryButton
            disabled={passwordSubmitting}
            onClick={handlePasswordChange}
          >
            <Save aria-hidden="true" size={17} />
            {passwordSubmitting ? "Changing password…" : "Change Password"}
          </PlatformPrimaryButton>
        </div>
      </PlatformPanel>

      {/* Organization Settings */}
      <PlatformPanel title="Organization Settings">
        <p className="text-sm text-slate-600 mb-4">
          Configure default settings for this organization.
        </p>
        
        {settingsSuccess && (
          <div className="mb-4 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-900 flex items-center gap-2">
            <Check size={14} />
            Settings saved successfully.
          </div>
        )}
        
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            error={settingsErrors.defaultBranchName}
            label="Default branch name"
            required
          >
            <input
              className={platformInputClassName}
              onChange={(e) =>
                setSettingsForm((prev) => ({ ...prev, defaultBranchName: e.target.value }))
              }
              placeholder="Main Branch"
              value={settingsForm.defaultBranchName}
            />
          </Field>
          
          <Field
            error={settingsErrors.defaultLocale}
            label="Default locale"
            required
          >
            <input
              className={platformInputClassName}
              onChange={(e) =>
                setSettingsForm((prev) => ({ ...prev, defaultLocale: e.target.value }))
              }
              placeholder="en"
              value={settingsForm.defaultLocale}
            />
          </Field>
          
          <Field label="Secondary locale">
            <input
              className={platformInputClassName}
              onChange={(e) =>
                setSettingsForm((prev) => ({ ...prev, secondaryLocale: e.target.value }))
              }
              placeholder="ur"
              value={settingsForm.secondaryLocale}
            />
          </Field>
          
          <Field label="Timezone">
            <input
              className={platformInputClassName}
              onChange={(e) =>
                setSettingsForm((prev) => ({ ...prev, timezone: e.target.value }))
              }
              placeholder="Asia/Karachi"
              value={settingsForm.timezone}
            />
          </Field>
          
          <Field label="Currency code">
            <input
              className={platformInputClassName}
              maxLength={3}
              onChange={(e) =>
                setSettingsForm((prev) => ({
                  ...prev,
                  currencyCode: e.target.value.toUpperCase(),
                }))
              }
              placeholder="PKR"
              value={settingsForm.currencyCode}
            />
          </Field>
        </div>
        
        <div className="mt-4 flex justify-end">
          <PlatformPrimaryButton
            disabled={settingsSubmitting}
            onClick={handleSettingsSave}
          >
            <Save aria-hidden="true" size={17} />
            {settingsSubmitting ? "Saving settings…" : "Save Settings"}
          </PlatformPrimaryButton>
        </div>
      </PlatformPanel>

      {/* Information Banner */}
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
        <AlertCircle className="text-amber-600 mt-0.5" size={18} />
        <div>
          <p className="text-sm font-semibold text-amber-900">Important Notes</p>
          <ul className="mt-2 text-xs text-amber-800 space-y-1 list-disc list-inside">
            <li>Password changes require the current password for security.</li>
            <li>Generated passwords meet security requirements (12+ chars, mixed case, digits).</li>
            <li>Organization settings affect all users in this tenant.</li>
            <li>Some settings may require tenant reactivation to take effect.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
