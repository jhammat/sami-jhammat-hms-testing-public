"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";
import type {
  FormEvent,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Phone,
  ShieldAlert,
} from "lucide-react";

import { AuthFrame } from "./auth-frame";

export type AuthScreenKind =
  | "sign-in"
  | "register"
  | "verify"
  | "forgot"
  | "reset"
  | "locked"
  | "expired";

interface AuthScreenCopy {
  action: string;
  description: string;
  title: string;
}

const copy: Record<AuthScreenKind, AuthScreenCopy> = {
  "sign-in": {
    action: "Open secure sign in",
    description:
      "Continue to the canonical WonFlow sign-in page.",
    title: "Welcome back",
  },
  register: {
    action: "Create account",
    description:
      "Create a secure patient account before confirming care.",
    title: "Create your account",
  },
  verify: {
    action: "Verify email",
    description:
      "Enter the verification code sent to your email address.",
    title: "Verify your email",
  },
  forgot: {
    action: "Send reset instructions",
    description:
      "Enter your email address to request password recovery.",
    title: "Forgot your password?",
  },
  reset: {
    action: "Reset password",
    description:
      "Choose a strong password you have not used for this account before.",
    title: "Choose a new password",
  },
  locked: {
    action: "Return to sign in",
    description:
      "Your account is temporarily unavailable. Contact an administrator if the issue continues.",
    title: "Account locked",
  },
  expired: {
    action: "Sign in again",
    description:
      "Your session ended to protect your account. Sign in again to continue.",
    title: "Your session expired",
  },
};

const inputClassName = [
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5",
  "text-sm text-slate-950 outline-none transition",
  "placeholder:text-slate-400",
  "focus:border-blue-500 focus:ring-4 focus:ring-blue-100",
  "dark:border-slate-800 dark:bg-slate-950/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-blue-950/50",
].join(" ");

interface FieldProps {
  children: ReactNode;
  error?: string;
  hint?: string;
  id: string;
  label: string;
}

function Field({
  children,
  error,
  hint,
  id,
  label,
}: FieldProps) {
  const describedBy = error
    ? `${id}-error`
    : hint
      ? `${id}-hint`
      : undefined;

  return (
    <div>
      <label
        className="text-sm font-semibold text-slate-700 dark:text-slate-300"
        htmlFor={id}
      >
        {label}
      </label>

      <div className="mt-1.5">
        {children}
      </div>

      {error ? (
        <p
          className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
          id={`${id}-error`}
        >
          {error}
        </p>
      ) : hint ? (
        <p
          className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400"
          id={`${id}-hint`}
        >
          {hint}
        </p>
      ) : null}

      <span className="sr-only">
        {describedBy}
      </span>
    </div>
  );
}

interface IconInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon: ReactNode;
}

function IconInput({
  icon,
  className = "",
  ...props
}: IconInputProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
        {icon}
      </span>

      <input
        {...props}
        className={`${inputClassName} pl-10 ${className}`}
      />
    </div>
  );
}

export function AuthScreen({
  kind,
  productName,
}: Readonly<{
  kind: AuthScreenKind;
  productName: string;
}>) {
  const content = copy[kind];

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string>();
  const [busy, setBusy] = useState(false);

  const requirements = useMemo(
    () => ({
      confirmPassword:
        kind === "register" ||
        kind === "reset",
      email:
        kind === "register" ||
        kind === "forgot",
      password:
        kind === "register" ||
        kind === "reset",
      phone: kind === "register",
      verificationCode: kind === "verify",
    }),
    [kind],
  );

  function validate(): boolean {
    const nextErrors: Record<string, string> = {};

    if (
      requirements.email &&
      !/^\S+@\S+\.\S+$/.test(email)
    ) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (
      requirements.phone &&
      phone.replace(/\D/g, "").length < 10
    ) {
      nextErrors.phone = "Enter a valid mobile number.";
    }

    if (
      requirements.verificationCode &&
      code.trim().length < 4
    ) {
      nextErrors.code = "Enter the verification code.";
    }

    if (
      requirements.password &&
      password.length < 12
    ) {
      nextErrors.password = "Use at least 12 characters.";
    } else if (requirements.password && (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password))) {
      nextErrors.password = "Include uppercase, lowercase and a number.";
    }

    if (
      requirements.confirmPassword &&
      confirmation !== password
    ) {
      nextErrors.confirmation = "The passwords do not match.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(undefined);

    if (!validate()) {
      return;
    }

    setBusy(true);
    await Promise.resolve();
    setBusy(false);

    const messages: Partial<Record<AuthScreenKind, string>> = {
      forgot:
        "Password recovery service is not connected yet.",
      register:
        "Patient account registration service is not connected yet.",
      reset:
        "Password reset service is not connected yet.",
      verify:
        "Email verification service is not connected yet.",
    };

    setStatus(
      messages[kind] ??
      "Use the secure WonFlow sign-in page.",
    );
  }

  if (
    kind === "locked" ||
    kind === "expired" ||
    kind === "sign-in"
  ) {
    const Icon =
      kind === "locked"
        ? ShieldAlert
        : kind === "expired"
          ? KeyRound
          : CheckCircle2;

    return (
      <AuthFrame
        description={content.description}
        productName={productName}
        title={content.title}
      >
        <div className="rounded-2xl border border-blue-100 bg-blue-50/55 p-5 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm ring-1 ring-blue-100">
            <Icon
              aria-hidden="true"
              size={23}
              strokeWidth={1.9}
            />
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-600">
            WonFlow will return you to the secure sign-in page.
          </p>

          <Link
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
            href="/login"
          >
            {content.action}
          </Link>
        </div>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      description={content.description}
      productName={productName}
      title={content.title}
    >
      <form
        className="space-y-4"
        noValidate
        onSubmit={handleSubmit}
      >
        {errors.form ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700" role="alert">{errors.form}</p> : null}
        {requirements.email ? (
          <Field
            error={errors.email}
            id="auth-email"
            label="Email address"
          >
            <IconInput
              aria-describedby={errors.email ? "auth-email-error" : undefined}
              aria-invalid={Boolean(errors.email)}
              autoComplete="email"
              icon={<Mail aria-hidden="true" size={17} />}
              id="auth-email"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </Field>
        ) : null}

        {requirements.phone ? (
          <Field
            error={errors.phone}
            hint="Used for account and care-related communication."
            id="auth-phone"
            label="Mobile number"
          >
            <IconInput
              aria-describedby={
                errors.phone
                  ? "auth-phone-error"
                  : "auth-phone-hint"
              }
              aria-invalid={Boolean(errors.phone)}
              autoComplete="tel"
              icon={<Phone aria-hidden="true" size={17} />}
              id="auth-phone"
              onChange={(event) => setPhone(event.target.value)}
              type="tel"
              value={phone}
            />
          </Field>
        ) : null}

        {requirements.verificationCode ? (
          <Field
            error={errors.code}
            id="auth-code"
            label="Verification code"
          >
            <IconInput
              aria-describedby={errors.code ? "auth-code-error" : undefined}
              aria-invalid={Boolean(errors.code)}
              autoComplete="one-time-code"
              icon={<KeyRound aria-hidden="true" size={17} />}
              id="auth-code"
              inputMode="numeric"
              onChange={(event) => setCode(event.target.value)}
              value={code}
            />
          </Field>
        ) : null}

        {requirements.password ? (
          <Field
            error={errors.password}
            hint="Use 12 or more characters with uppercase, lowercase and a number."
            id="auth-password"
            label="Password"
          >
            <div className="relative">
              <IconInput
                aria-describedby={
                  errors.password
                    ? "auth-password-error"
                    : "auth-password-hint"
                }
                aria-invalid={Boolean(errors.password)}
                autoComplete="new-password"
                className="pr-12"
                icon={<KeyRound aria-hidden="true" size={17} />}
                id="auth-password"
                onChange={(event) => setPassword(event.target.value)}
                type={showPasswords ? "text" : "password"}
                value={password}
              />

              <button
                aria-label={showPasswords ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                onClick={() => setShowPasswords((current) => !current)}
                type="button"
              >
                {showPasswords ? (
                  <EyeOff aria-hidden="true" size={17} />
                ) : (
                  <Eye aria-hidden="true" size={17} />
                )}
              </button>
            </div>
          </Field>
        ) : null}

        {requirements.confirmPassword ? (
          <Field
            error={errors.confirmation}
            id="auth-password-confirmation"
            label="Confirm password"
          >
            <IconInput
              aria-describedby={
                errors.confirmation
                  ? "auth-password-confirmation-error"
                  : undefined
              }
              aria-invalid={Boolean(errors.confirmation)}
              autoComplete="new-password"
              icon={<KeyRound aria-hidden="true" size={17} />}
              id="auth-password-confirmation"
              onChange={(event) => setConfirmation(event.target.value)}
              type={showPasswords ? "text" : "password"}
              value={confirmation}
            />
          </Field>
        ) : null}

        {status ? (
          <div
            className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-3 text-sm font-medium text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300"
            role="status"
          >
            {status}
          </div>
        ) : null}

        <button
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
          disabled={busy}
          type="submit"
        >
          {busy ? "Working…" : content.action}
        </button>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs font-medium">
          <Link
            className="text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            href="/login"
          >
            Back to sign in
          </Link>

          {kind === "forgot" ? (
            <span className="text-slate-400 dark:text-slate-500">
              Recovery links expire for security.
            </span>
          ) : null}
        </div>
      </form>
    </AuthFrame>
  );
}
