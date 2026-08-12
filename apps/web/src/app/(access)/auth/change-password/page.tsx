"use client";

import { Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import { useWonFlowSession } from "@/app/_providers";
import { AuthFrame } from "@/components/auth";

const inputClassName = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-10 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export default function ChangeTemporaryPasswordPage() {
  const router = useRouter();
  const session = useWonFlowSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    if (newPassword !== confirmation) {
      setError("The new passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmation }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string; homePath?: string };
      if (!response.ok || !body.homePath) throw new Error(body.error ?? "The password could not be changed.");
      router.replace(body.homePath);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The password could not be changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      description="Replace the temporary password issued by your platform administrator before opening the workspace."
      productName="WonFlow Hospital Platform"
      title="Secure your account"
    >
      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
        <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-blue-700" size={20} />
        <div>
          <p className="text-sm font-semibold text-slate-900">First sign-in protection</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">{session?.email ?? "This account"} cannot access hospital data until a private password is set.</p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={submit}>
        {[
          ["current-password", "Temporary password", currentPassword, setCurrentPassword, "current-password"],
          ["new-password", "New password", newPassword, setNewPassword, "new-password"],
          ["confirm-password", "Confirm new password", confirmation, setConfirmation, "new-password"],
        ].map(([id, label, value, setter, autoComplete]) => (
          <label className="block" key={id as string}>
            <span className="text-sm font-semibold text-slate-700">{label as string}</span>
            <span className="relative mt-1.5 block">
              <KeyRound aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                autoComplete={autoComplete as string}
                className={inputClassName}
                id={id as string}
                onChange={(event) => (setter as (value: string) => void)(event.target.value)}
                required
                type={showPasswords ? "text" : "password"}
                value={value as string}
              />
            </span>
          </label>
        ))}

        <button className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600" onClick={() => setShowPasswords((current) => !current)} type="button">
          {showPasswords ? <EyeOff aria-hidden="true" size={16} /> : <Eye aria-hidden="true" size={16} />}
          {showPasswords ? "Hide passwords" : "Show passwords"}
        </button>

        <p className="text-xs leading-5 text-slate-500">Use at least 12 characters with uppercase, lowercase and a number.</p>
        {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm font-medium text-rose-700" role="alert">{error}</p> : null}

        <button className="min-h-11 w-full rounded-xl bg-gradient-to-r from-blue-700 to-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={busy} type="submit">
          {busy ? "Securing account…" : "Set password and continue"}
        </button>
      </form>
    </AuthFrame>
  );
}
