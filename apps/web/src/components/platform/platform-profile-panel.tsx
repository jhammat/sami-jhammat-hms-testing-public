"use client";

import {
  AlertCircle,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { WonFlowPageHeader } from "@/components/workspace";
import { WONFLOW_AVATAR_CHANGED_EVENT } from "@/components/shell/registration-legacy-shell";
import {
  PlatformLoadingState,
  PlatformPanel,
  PlatformPrimaryButton,
  PlatformSecondaryButton,
  PlatformStatusBadge,
  platformInputClassName,
} from "./platform-administration-ui";

interface PlatformProfile {
  identityId: string;
  email: string;
  phone: string | null;
  status: string;
  isPlatformAdministrator: boolean;
  platformPermissionCodes: string[];
  passwordChangedAt: string | null;
  lastAuthenticatedAt: string | null;
  createdAt: string;
  hasAvatar: boolean;
  avatarUrl: string | null;
}

export function PlatformProfilePanel() {
  const [profile, setProfile] = useState<PlatformProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Avatar state
  const [avatarTimestamp, setAvatarTimestamp] = useState<number>(0);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/platform/profile", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to load platform administrator profile.");
      }
      const data = (await response.json()) as { profile: PlatformProfile };
      setProfile(data.profile);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => fetchProfile());
  }, [fetchProfile]);

  const handleAvatarFileSelected = async (file: File) => {
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setAvatarMessage({ type: "error", text: "Please select a JPG, PNG or WebP image." });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAvatarMessage({ type: "error", text: "The photo must be 2 MB or smaller." });
      return;
    }

    setUploadingAvatar(true);
    setAvatarMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/v1/platform/profile/avatar", {
        method: "PUT",
        body: formData,
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to upload avatar photo.");
      }

      setAvatarTimestamp(Date.now());
      setAvatarMessage({ type: "success", text: "Profile image updated successfully." });
      window.dispatchEvent(new CustomEvent(WONFLOW_AVATAR_CHANGED_EVENT));
      await fetchProfile();
    } catch (err) {
      setAvatarMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to upload avatar.",
      });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    setAvatarMessage(null);

    try {
      const response = await fetch("/api/v1/platform/profile/avatar", {
        method: "DELETE",
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to remove avatar photo.");
      }

      setAvatarTimestamp(Date.now());
      setAvatarMessage({ type: "success", text: "Profile photo removed." });
      window.dispatchEvent(new CustomEvent(WONFLOW_AVATAR_CHANGED_EVENT));
      await fetchProfile();
    } catch (err) {
      setAvatarMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to remove avatar.",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (!currentPassword || !newPassword || !confirmation) {
      setPasswordMessage({ type: "error", text: "All password fields are required." });
      return;
    }

    if (newPassword !== confirmation) {
      setPasswordMessage({ type: "error", text: "The new passwords do not match." });
      return;
    }

    if (newPassword.length < 12) {
      setPasswordMessage({ type: "error", text: "New password must be at least 12 characters." });
      return;
    }

    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPasswordMessage({
        type: "error",
        text: "New password must contain uppercase, lowercase and numeric characters.",
      });
      return;
    }

    setSavingPassword(true);

    try {
      const response = await fetch("/api/v1/platform/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmation }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to update password.");
      }

      setPasswordMessage({
        type: "success",
        text: "Your password has been updated securely. Any other active sessions have been signed out.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      await fetchProfile();
    } catch (err) {
      setPasswordMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to change password.",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return <PlatformLoadingState label="Loading superadmin profile…" />;
  }

  if (error || !profile) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">
        <AlertCircle className="mx-auto mb-2 h-8 w-8 text-rose-600" />
        <h2 className="text-base font-semibold">Unable to load profile</h2>
        <p className="mt-1 text-sm text-rose-700">{error ?? "Profile data unavailable."}</p>
        <PlatformSecondaryButton className="mt-4" onClick={() => void fetchProfile()}>
          Retry
        </PlatformSecondaryButton>
      </div>
    );
  }

  // Live password validation checks
  const hasMinLength = newPassword.length >= 12;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && confirmation.length > 0 && newPassword === confirmation;

  return (
    <div className="space-y-6">
      <WonFlowPageHeader
        breadcrumbs={[
          {
            label: "Platform Administration",
            href: "/platform",
          },
          {
            label: "Profile",
          },
        ]}
        description="Manage your platform superadministrator identity, profile picture, and account credentials."
        eyebrow="WonFlow Super Administration"
        leading={<Shield className="text-blue-600" size={20} />}
        metadata={
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-100">
            Superadministrator
          </span>
        }
        title="Super Admin Profile"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Avatar & Account Identity (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          <PlatformPanel
            description="Manage your profile portrait visible across WonFlow"
            title="Profile Picture"
          >
            <div className="p-6">
              <div className="flex flex-col items-center text-center">
                {/* Avatar Display */}
                <div className="relative group">
                  <div className="relative flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-linear-to-br from-blue-600 via-indigo-600 to-violet-700 text-3xl font-extrabold text-white shadow-[0_12px_32px_rgba(79,70,229,0.25)] ring-1 ring-slate-200">
                    {profile.hasAvatar ? (
                      <Image
                        alt="Super Admin profile photo"
                        className="h-full w-full object-cover"
                        fill
                        sizes="128px"
                        src={`/api/v1/platform/profile/avatar?t=${avatarTimestamp}`}
                        unoptimized
                      />
                    ) : (
                      <span>SU</span>
                    )}
                  </div>

                  {uploadingAvatar ? (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-xs">
                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                  ) : null}
                </div>

                <div className="mt-4">
                  <div className="text-base font-semibold text-slate-950">Platform Superadministrator</div>
                  <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
                    <Mail size={13} />
                    <span>{profile.email}</span>
                  </div>
                </div>

                {/* Upload & Remove Controls */}
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleAvatarFileSelected(file);
                    }}
                    ref={fileInputRef}
                    type="file"
                  />

                  <PlatformPrimaryButton
                    disabled={uploadingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    <Upload size={16} />
                    <span>Upload new image</span>
                  </PlatformPrimaryButton>

                  {profile.hasAvatar ? (
                    <PlatformSecondaryButton
                      disabled={uploadingAvatar}
                      onClick={() => void handleRemoveAvatar()}
                      type="button"
                    >
                      <Trash2 className="text-rose-600" size={16} />
                      <span>Remove</span>
                    </PlatformSecondaryButton>
                  ) : null}
                </div>

                <p className="mt-3 text-[11px] text-slate-400">
                  Supports JPG, PNG or WebP up to 2 MB. Square images work best.
                </p>

                {avatarMessage ? (
                  <div
                    className={`mt-4 w-full rounded-xl p-3 text-xs font-medium ${
                      avatarMessage.type === "success"
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border border-rose-200 bg-rose-50 text-rose-800"
                    }`}
                  >
                    {avatarMessage.text}
                  </div>
                ) : null}
              </div>
            </div>
          </PlatformPanel>

          {/* Account Details Card */}
          <PlatformPanel description="Account properties and identity records" title="Identity Details">
            <div className="divide-y divide-slate-100 p-6 pt-2">
              <div className="flex items-center justify-between py-3">
                <span className="text-xs font-medium text-slate-500">Status</span>
                <PlatformStatusBadge status={profile.status} />
              </div>

              <div className="flex items-center justify-between py-3">
                <span className="text-xs font-medium text-slate-500">Role</span>
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                  Super Administrator
                </span>
              </div>

              <div className="flex items-center justify-between py-3">
                <span className="text-xs font-medium text-slate-500">Primary Email</span>
                <span className="text-xs font-semibold text-slate-800">{profile.email}</span>
              </div>

              <div className="flex items-center justify-between py-3">
                <span className="text-xs font-medium text-slate-500">Account Created</span>
                <span className="text-xs text-slate-600">
                  {new Date(profile.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>

              <div className="flex items-center justify-between py-3">
                <span className="text-xs font-medium text-slate-500">Last Password Change</span>
                <span className="text-xs text-slate-600">
                  {profile.passwordChangedAt
                    ? new Date(profile.passwordChangedAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Never updated"}
                </span>
              </div>
            </div>
          </PlatformPanel>
        </div>

        {/* Right Column: Password Control & Security Management (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          <PlatformPanel
            description="Control and update your platform superadmin credentials"
            title="Password Management"
          >
            <form className="p-6 space-y-5" onSubmit={handleChangePassword}>
              {passwordMessage ? (
                <div
                  className={`flex items-start gap-2.5 rounded-xl p-4 text-xs leading-5 font-medium ${
                    passwordMessage.type === "success"
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border border-rose-200 bg-rose-50 text-rose-900"
                  }`}
                >
                  {passwordMessage.type === "success" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  )}
                  <span>{passwordMessage.text}</span>
                </div>
              ) : null}

              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700" htmlFor="currentPassword">
                  Current Password
                </label>
                <div className="relative mt-1.5">
                  <input
                    autoComplete="current-password"
                    className={`${platformInputClassName} pr-10`}
                    id="currentPassword"
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                  />
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    tabIndex={-1}
                    type="button"
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700" htmlFor="newPassword">
                  New Password
                </label>
                <div className="relative mt-1.5">
                  <input
                    autoComplete="new-password"
                    className={`${platformInputClassName} pr-10`}
                    id="newPassword"
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 12 chars)"
                    required
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                  />
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    tabIndex={-1}
                    type="button"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Requirements Checklist */}
                <div className="mt-2.5 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                  <div className="text-[11px] font-semibold text-slate-600">Password Requirements</div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div
                      className={`flex items-center gap-1.5 ${
                        hasMinLength ? "text-emerald-700 font-medium" : "text-slate-400"
                      }`}
                    >
                      <div
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                          hasMinLength ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-400"
                        }`}
                      >
                        <Check size={10} />
                      </div>
                      <span>At least 12 characters</span>
                    </div>

                    <div
                      className={`flex items-center gap-1.5 ${
                        hasUppercase ? "text-emerald-700 font-medium" : "text-slate-400"
                      }`}
                    >
                      <div
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                          hasUppercase ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-400"
                        }`}
                      >
                        <Check size={10} />
                      </div>
                      <span>Uppercase letter (A-Z)</span>
                    </div>

                    <div
                      className={`flex items-center gap-1.5 ${
                        hasLowercase ? "text-emerald-700 font-medium" : "text-slate-400"
                      }`}
                    >
                      <div
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                          hasLowercase ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-400"
                        }`}
                      >
                        <Check size={10} />
                      </div>
                      <span>Lowercase letter (a-z)</span>
                    </div>

                    <div
                      className={`flex items-center gap-1.5 ${
                        hasNumber ? "text-emerald-700 font-medium" : "text-slate-400"
                      }`}
                    >
                      <div
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                          hasNumber ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-400"
                        }`}
                      >
                        <Check size={10} />
                      </div>
                      <span>Numeric character (0-9)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700" htmlFor="confirmPassword">
                  Confirm New Password
                </label>
                <div className="relative mt-1.5">
                  <input
                    autoComplete="new-password"
                    className={`${platformInputClassName} pr-10`}
                    id="confirmPassword"
                    onChange={(e) => setConfirmation(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    type={showConfirmation ? "text" : "password"}
                    value={confirmation}
                  />
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowConfirmation((prev) => !prev)}
                    tabIndex={-1}
                    type="button"
                  >
                    {showConfirmation ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {confirmation.length > 0 ? (
                  <div className="mt-1.5 flex items-center gap-1 text-[11px]">
                    {passwordsMatch ? (
                      <span className="font-semibold text-emerald-600 flex items-center gap-1">
                        <Check size={12} /> Passwords match
                      </span>
                    ) : (
                      <span className="font-semibold text-rose-600 flex items-center gap-1">
                        <AlertCircle size={12} /> Passwords do not match
                      </span>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="pt-2">
                <PlatformPrimaryButton
                  className="w-full sm:w-auto"
                  disabled={savingPassword || !hasMinLength || !hasUppercase || !hasLowercase || !hasNumber || !passwordsMatch}
                  type="submit"
                >
                  {savingPassword ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>Updating password…</span>
                    </>
                  ) : (
                    <>
                      <KeyRound size={16} />
                      <span>Update Password</span>
                    </>
                  )}
                </PlatformPrimaryButton>
              </div>
            </form>
          </PlatformPanel>

          {/* Platform Permissions & Security Info Card */}
          <PlatformPanel
            description="Active platform authorizations assigned to this superadministrator identity"
            title="Platform Authorizations & Security"
          >
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs text-blue-950">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                <div className="space-y-1 leading-5">
                  <span className="font-semibold text-blue-900">Highest Privilege Level:</span>
                  <p className="text-blue-800">
                    This account holds master administrative authority across tenant onboarding, billing configurations,
                    support access grants, security event auditing, and multi-tenant isolation.
                  </p>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-700">Assigned Platform Permission Codes</div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {profile.platformPermissionCodes.length > 0 ? (
                    profile.platformPermissionCodes.map((perm) => (
                      <span
                        className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-mono font-medium text-slate-800 ring-1 ring-slate-200/70"
                        key={perm}
                      >
                        {perm}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">All root platform permissions implicitly active.</span>
                  )}
                </div>
              </div>
            </div>
          </PlatformPanel>
        </div>
      </div>
    </div>
  );
}
