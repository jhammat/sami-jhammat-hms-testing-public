"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { AuthFrame } from "./auth-frame";

/**
 * A patient creating their own account.
 *
 * This screen used to validate the form and then say the service was not
 * connected. It is connected now, and the copy is explicit about what an
 * account does and does not give you, because the honest answer is narrower
 * than people expect: a new account starts a new record. It does not reach
 * into a chart the hospital already holds — nothing here can prove you are
 * the person named in it, so linking is done by reception, by a human.
 */

const inputClassName = [
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5",
  "text-sm text-slate-950 outline-none transition",
  "placeholder:text-slate-400 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
  "focus:border-blue-500 focus:ring-4 focus:ring-blue-100",
  "dark:border-slate-800 dark:bg-slate-950/60 dark:text-white",
  "dark:placeholder:text-slate-500 dark:focus:ring-blue-950/50",
].join(" ");

const labelClassName = "mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-200";

const iconClassName =
  "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500";

interface Availability {
  available: boolean;
  hospitalName?: string;
}

type Errors = Partial<
  Record<"givenName" | "familyName" | "email" | "phone" | "dateOfBirth" | "password" | "confirm", string>
>;

/** The rules the server enforces, stated where they can still be acted on. */
function passwordProblem(password: string): string | undefined {
  if (password.length < 12) return "Use at least 12 characters.";
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Include an uppercase letter, a lowercase letter and a number.";
  }
  return undefined;
}

function Field({
  id,
  label,
  hint,
  error,
  icon,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelClassName} htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <span className={iconClassName}>{icon}</span>
        {children}
      </div>
      {error ? (
        <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function PatientRegistrationScreen() {
  const [availability, setAvailability] = useState<Availability | null>(null);

  const [givenName, setGivenName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Whether this hostname belongs to a hospital is a server question. Asking
    // it up front means the form is never shown to someone it cannot serve.
    fetch("/api/v1/public-registration/account")
      .then((response) => (response.ok ? response.json() : { available: false }))
      .then((data: Availability) => {
        if (!cancelled) setAvailability(data);
      })
      .catch(() => {
        if (!cancelled) setAvailability({ available: false });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function validate(): boolean {
    const next: Errors = {};

    if (givenName.trim().length < 2) next.givenName = "Enter your first name.";
    if (familyName.trim().length < 2) next.familyName = "Enter your family name.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "Enter a valid email address.";
    if (phone.trim().length < 7) next.phone = "Enter a valid mobile number.";

    if (!dateOfBirth) {
      next.dateOfBirth = "Enter your date of birth.";
    } else if (new Date(`${dateOfBirth}T00:00:00.000Z`) > new Date()) {
      next.dateOfBirth = "That date is in the future.";
    }

    const problem = passwordProblem(password);
    if (problem) next.password = problem;
    if (confirm !== password) next.confirm = "The passwords do not match.";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFailure(undefined);

    if (!validate()) return;

    setBusy(true);

    try {
      const response = await fetch("/api/v1/public-registration/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          givenName: givenName.trim(),
          familyName: familyName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          dateOfBirth,
          password,
        }),
      });

      const text = await response.text().catch(() => "");

      type RegistrationReply = { error?: string; hospitalName?: string };
      let data: RegistrationReply | null = null;

      try {
        data = text.trim() ? (JSON.parse(text) as RegistrationReply) : null;
      } catch {
        data = null;
      }

      if (!response.ok || !data) {
        // A response that arrived is a server answer, not a broken connection.
        setFailure(
          data?.error ??
            `The server returned an unexpected response (${response.status}). Please tell the hospital.`,
        );
        setBusy(false);
        return;
      }

      setDone(data.hospitalName ?? "your hospital");
    } catch {
      setFailure("Could not reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Registration is not offered on this hostname                        */
  /* ------------------------------------------------------------------ */

  if (availability && !availability.available) {
    return (
      <AuthFrame
        productName="WonFlow"
        title="Registration is not open here"
        description="This address is not set up for patient sign-up."
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Open the link your hospital gave you, or ask their reception desk to
            create your account — they can do it while you are at the counter.
          </p>

          <Link
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-sm font-semibold text-white transition hover:brightness-110"
            href="/login"
          >
            Go to sign in
            <ArrowRight aria-hidden size={15} />
          </Link>
        </div>
      </AuthFrame>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Done                                                                */
  /* ------------------------------------------------------------------ */

  if (done) {
    return (
      <AuthFrame
        productName="WonFlow"
        title="Your account is ready"
        description={`You are registered with ${done}.`}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/8 p-3.5">
            <CheckCircle2
              aria-hidden
              className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
              size={17}
            />
            <p className="text-[12.5px] leading-relaxed text-slate-700 dark:text-slate-200">
              Sign in with <span className="font-semibold">{email.trim()}</span> to
              book appointments and follow your recovery.
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-slate-500/8 p-3.5">
            <Info aria-hidden className="mt-0.5 shrink-0 text-slate-400" size={16} />
            <p className="text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">
              If you have been treated here before, your existing records are not
              attached to this account yet. Reception will join them for you once
              they have checked your identity — bring your ID or hospital card.
            </p>
          </div>

          <Link
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-sm font-semibold text-white transition hover:brightness-110"
            href="/login"
          >
            Sign in
            <ArrowRight aria-hidden size={15} />
          </Link>
        </div>
      </AuthFrame>
    );
  }

  /* ------------------------------------------------------------------ */
  /* The form                                                            */
  /* ------------------------------------------------------------------ */

  return (
    <AuthFrame
      productName={availability?.hospitalName ?? "WonFlow"}
      title="Create your patient account"
      description={
        availability?.hospitalName
          ? `Register with ${availability.hospitalName} to book appointments and follow your care.`
          : "Register to book appointments and follow your care."
      }
    >
      <form className="space-y-4" noValidate onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            error={errors.givenName}
            icon={<UserRound aria-hidden size={15} />}
            id="given-name"
            label="First name"
          >
            <input
              autoComplete="given-name"
              className={inputClassName}
              id="given-name"
              onChange={(event) => setGivenName(event.target.value)}
              placeholder="Muhammad"
              value={givenName}
            />
          </Field>

          <Field
            error={errors.familyName}
            icon={<UserRound aria-hidden size={15} />}
            id="family-name"
            label="Family name"
          >
            <input
              autoComplete="family-name"
              className={inputClassName}
              id="family-name"
              onChange={(event) => setFamilyName(event.target.value)}
              placeholder="Yousaf"
              value={familyName}
            />
          </Field>
        </div>

        <Field
          error={errors.email}
          icon={<Mail aria-hidden size={15} />}
          id="email"
          label="Email address"
        >
          <input
            autoComplete="email"
            className={inputClassName}
            id="email"
            inputMode="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            type="email"
            value={email}
          />
        </Field>

        <Field
          error={errors.phone}
          hint="Used for appointment reminders and care-related contact."
          icon={<Phone aria-hidden size={15} />}
          id="phone"
          label="Mobile number"
        >
          <input
            autoComplete="tel"
            className={inputClassName}
            id="phone"
            inputMode="tel"
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+92 300 0000000"
            type="tel"
            value={phone}
          />
        </Field>

        <Field
          error={errors.dateOfBirth}
          hint="Helps the hospital find you in their records."
          icon={<CalendarDays aria-hidden size={15} />}
          id="date-of-birth"
          label="Date of birth"
        >
          <input
            autoComplete="bday"
            className={inputClassName}
            id="date-of-birth"
            max={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setDateOfBirth(event.target.value)}
            type="date"
            value={dateOfBirth}
          />
        </Field>

        <Field
          error={errors.password}
          hint="At least 12 characters, with uppercase, lowercase and a number."
          icon={<KeyRound aria-hidden size={15} />}
          id="password"
          label="Password"
        >
          <input
            autoComplete="new-password"
            className={`${inputClassName} pr-11`}
            id="password"
            onChange={(event) => setPassword(event.target.value)}
            type={showPassword ? "text" : "password"}
            value={password}
          />
          <button
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
            onClick={() => setShowPassword((previous) => !previous)}
            type="button"
          >
            {showPassword ? <EyeOff aria-hidden size={16} /> : <Eye aria-hidden size={16} />}
          </button>
        </Field>

        <Field
          error={errors.confirm}
          icon={<KeyRound aria-hidden size={15} />}
          id="confirm-password"
          label="Confirm password"
        >
          <input
            autoComplete="new-password"
            className={inputClassName}
            id="confirm-password"
            onChange={(event) => setConfirm(event.target.value)}
            type={showPassword ? "text" : "password"}
            value={confirm}
          />
        </Field>

        {/*
          * Said before signing up, not after. Someone expecting to see an
          * existing chart should know now that this will not show them one.
          */}
        <div className="flex items-start gap-3 rounded-xl bg-slate-500/8 p-3.5">
          <ShieldCheck aria-hidden className="mt-0.5 shrink-0 text-slate-400" size={16} />
          <p className="text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">
            This creates a new record. If you have been treated here before, ask
            reception to join it to your existing chart — they check your identity
            in person, which is the only safe way to do it.
          </p>
        </div>

        {failure ? (
          <p
            className="rounded-xl border border-rose-500/25 bg-rose-500/8 px-3.5 py-2.5 text-[12.5px] font-medium text-rose-700 dark:text-rose-300"
            role="alert"
          >
            {failure}
          </p>
        ) : null}

        <button
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
          disabled={busy || availability === null}
          type="submit"
        >
          {busy ? (
            <>
              <Loader2 aria-hidden className="animate-spin" size={15} />
              Creating your account…
            </>
          ) : (
            <>
              Create account
              <ArrowRight aria-hidden size={15} />
            </>
          )}
        </button>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Already registered?{" "}
          <Link className="font-semibold text-blue-600 hover:underline dark:text-blue-400" href="/login">
            Sign in
          </Link>
        </p>
      </form>
    </AuthFrame>
  );
}
