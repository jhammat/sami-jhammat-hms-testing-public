"use client";

import { Suspense, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  ChevronRight,
  Eye,
  EyeOff,
  FlaskConical,
  HeartPulse,
  KeyRound,
  Landmark,
  Loader2,
  Mail,
  Pill,
  ScanLine,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Users,
  Utensils,
  Activity,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

import { AuthFrame } from "@/components/auth";
import { PORTAL_DIRECTORY, type PortalAudience } from "@/lib/auth/portal-directory";
import type { WonFlowRole } from "@/lib/auth/accounts";

/**
 * One sign-in screen for the whole platform, in up to three steps.
 *
 *   1. Who are you — hospital staff, or a patient.
 *   2. Your credentials.
 *   3. Which portal, but only when the account actually holds more than one.
 *
 * Step three is the reason this exists. A person can hold several portals on
 * one set of credentials — a consultant who also administers the hospital and
 * covers the billing counter is one account and three portals. The server has
 * always modelled that, and the login route has always answered "which one?"
 * for those accounts. Nothing ever asked the question: the response carried no
 * error message, so the screen fell through to "Invalid email or password" and
 * anyone with two roles was locked out of their own hospital.
 *
 * Step one is a filter and a signpost, not a gate. It decides which portals to
 * show first and what the form says; the server decides what anyone may enter.
 * If a patient signs in on the staff side they are not refused — they are
 * shown the portal they do have.
 */

const ROLE_ICONS: Record<WonFlowRole, LucideIcon> = {
  doctor: Stethoscope,
  reception: Users,
  physiotherapist: Activity,
  nutritionist: Utensils,
  laboratory: FlaskConical,
  radiology: ScanLine,
  pharmacy: Pill,
  billing: Landmark,
  admin: Building2,
  management: BarChart3,
  platform: ShieldCheck,
  patient: HeartPulse,
};

interface LoginContext {
  membershipId: string | null;
  tenantId: string | null;
  organizationId: string | null;
  branchId: string | null;
  workspace: string | null;
  role: WonFlowRole;
  organizationLabel: string;
  branchLabel: string | null;
  homePath: string;
  patientId?: string | null;
  relationship?: string | null;
  patientName?: string | null;
}

const inputClassName = [
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5",
  "text-sm text-slate-950 outline-none transition",
  "placeholder:text-slate-400 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
  "focus:border-blue-500 focus:ring-4 focus:ring-blue-100",
  "dark:border-slate-800 dark:bg-slate-950/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-blue-950/50",
].join(" ");

const AUDIENCES: {
  id: PortalAudience;
  title: string;
  blurb: string;
  detail: string;
  icon: LucideIcon;
  accent: string;
}[] = [
  {
    id: "hospital",
    title: "Hospital staff",
    blurb: "Clinical and operational portals",
    detail:
      "Doctors, reception, laboratory, radiology, pharmacy, billing, physiotherapy, dietetics, management and administration.",
    icon: Building2,
    accent: "#2563eb",
  },
  {
    id: "patient",
    title: "Patient",
    blurb: "Your own care record",
    detail:
      "Your appointments, daily recovery tasks, medicines, results and documents — and the same for anyone you care for.",
    icon: HeartPulse,
    accent: "#0d9488",
  },
];

function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      onClick={onClick}
      type="button"
    >
      <ArrowLeft aria-hidden size={13} />
      {label}
    </button>
  );
}

function LoginFlow() {
  const searchParams = useSearchParams();

  const [step, setStep] = useState<"audience" | "credentials" | "portal">("audience");
  const [audience, setAudience] = useState<PortalAudience>("hospital");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const [contexts, setContexts] = useState<LoginContext[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [choosing, setChoosing] = useState<string | null>(null);

  const requestedPath = searchParams.get("next");

  function go(homePath: string, passwordChangeRequired?: boolean) {
    const destination = passwordChangeRequired
      ? "/auth/change-password"
      : requestedPath && requestedPath.startsWith("/") && requestedPath !== "/"
        ? requestedPath
        : homePath;

    window.location.replace(destination);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }

    if (password.length === 0) {
      setError("Enter your password.");
      return;
    }

    setBusy(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = (await response.json()) as {
        error?: string;
        homePath?: string;
        passwordChangeRequired?: boolean;
        requiresContextSelection?: boolean;
        displayName?: string;
        contexts?: LoginContext[];
      };

      if (data.requiresContextSelection && data.contexts?.length) {
        // The password is accepted and held server-side for two minutes; it is
        // dropped from this component the moment it is no longer needed.
        setPassword("");
        setContexts(data.contexts);
        setDisplayName(data.displayName ?? "");
        setStep("portal");
        setBusy(false);
        return;
      }

      if (!response.ok || !data.homePath) {
        setError(data.error ?? "Invalid email or password.");
        setBusy(false);
        return;
      }

      go(data.homePath, data.passwordChangeRequired);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setBusy(false);
    }
  }

  async function chooseContext(context: LoginContext) {
    setError(undefined);
    setChoosing(keyOf(context));

    try {
      const response = await fetch("/api/auth/select-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: context.role,
          membershipId: context.membershipId,
          tenantId: context.tenantId,
          patientId: context.patientId ?? null,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        homePath?: string;
        passwordChangeRequired?: boolean;
      };

      if (!response.ok || !data.homePath) {
        setError(data.error ?? "That portal could not be opened.");
        setChoosing(null);
        return;
      }

      go(data.homePath, data.passwordChangeRequired);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setChoosing(null);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Step 1 — audience                                                 */
  /* ---------------------------------------------------------------- */

  if (step === "audience") {
    return (
      <AuthFrame
        productName="WonFlow Hospital Platform"
        title="Where are you signing in?"
        description="Pick the side you belong to. You can change this on the next screen."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {AUDIENCES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setAudience(option.id);
                setError(undefined);
                setStep("credentials");
              }}
              className="group flex h-full flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-transparent hover:shadow-[0_18px_40px_rgba(30,64,175,0.16)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 dark:border-slate-800 dark:bg-slate-950/50 dark:hover:shadow-[0_18px_40px_rgba(0,0,0,0.6)]"
              style={{ borderTopColor: option.accent, borderTopWidth: 3 }}
            >
              <span
                aria-hidden
                className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-sm"
                style={{ background: `linear-gradient(140deg, ${option.accent}, ${option.accent}bb)` }}
              >
                <option.icon size={20} />
              </span>

              <span className="mt-1 text-base font-semibold text-slate-950 dark:text-white">
                {option.title}
              </span>

              <span className="text-xs font-semibold" style={{ color: option.accent }}>
                {option.blurb}
              </span>

              <span className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {option.detail}
              </span>

              <span className="mt-auto flex items-center gap-1 pt-3 text-xs font-semibold text-slate-700 transition group-hover:gap-2 dark:text-slate-200">
                Continue
                <ArrowRight aria-hidden size={13} />
              </span>
            </button>
          ))}
        </div>

        <p className="mt-5 text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
          New patient?{" "}
          <Link
            className="font-semibold text-blue-700 transition hover:text-blue-900 dark:text-blue-400"
            href="/patient/register"
          >
            Create a patient account
          </Link>
        </p>
      </AuthFrame>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Step 3 — which portal                                             */
  /* ---------------------------------------------------------------- */

  if (step === "portal") {
    const preferred = contexts.filter(
      (context) => PORTAL_DIRECTORY[context.role]?.audience === audience,
    );
    const others = contexts.filter(
      (context) => PORTAL_DIRECTORY[context.role]?.audience !== audience,
    );

    return (
      <AuthFrame
        width="wide"
        productName="WonFlow Hospital Platform"
        title={displayName ? `Welcome back, ${displayName}` : "Choose a portal"}
        description="Your account holds more than one portal. Pick the one you need — you can sign out and switch at any time."
        eyebrow={
          <BackLink
            label="Use a different account"
            onClick={() => {
              setStep("credentials");
              setContexts([]);
              setError(undefined);
            }}
          />
        }
      >
        {error ? (
          <p
            className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <PortalGroup
          contexts={preferred}
          choosing={choosing}
          onChoose={chooseContext}
          emptyNote={
            audience === "patient"
              ? "This account has no patient portal on it."
              : "This account has no hospital portal on it."
          }
        />

        {others.length > 0 ? (
          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {audience === "hospital" ? "Also on this account" : "Staff access on this account"}
            </p>
            <PortalGroup contexts={others} choosing={choosing} onChoose={chooseContext} />
          </div>
        ) : null}
      </AuthFrame>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Step 2 — credentials                                              */
  /* ---------------------------------------------------------------- */

  const audienceOption = AUDIENCES.find((option) => option.id === audience)!;

  return (
    <AuthFrame
      productName="WonFlow Hospital Platform"
      title={audience === "patient" ? "Sign in to your care record" : "Sign in to the hospital"}
      description={
        audience === "patient"
          ? "Use the email address your hospital holds for you."
          : "Use the credentials issued by your organization."
      }
      eyebrow={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <BackLink label="Change" onClick={() => setStep("audience")} />

          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
            style={{ background: audienceOption.accent }}
          >
            <audienceOption.icon aria-hidden size={12} />
            {audienceOption.title}
          </span>
        </div>
      }
    >
      <form className="space-y-4" noValidate onSubmit={handleSubmit}>
        <div>
          <label
            className="text-sm font-semibold text-slate-700 dark:text-slate-300"
            htmlFor="login-email"
          >
            Email address
          </label>

          <div className="relative mt-1.5">
            <Mail
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              size={17}
            />

            <input
              aria-describedby={error ? "login-error" : undefined}
              autoComplete="email"
              autoFocus
              className={`${inputClassName} pl-10`}
              id="login-email"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <label
              className="text-sm font-semibold text-slate-700 dark:text-slate-300"
              htmlFor="login-password"
            >
              Password
            </label>

            <Link
              className="text-xs font-semibold text-blue-700 transition hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
              href="/auth/forgot-password"
            >
              Forgot password?
            </Link>
          </div>

          <div className="relative mt-1.5">
            <KeyRound
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              size={17}
            />

            <input
              aria-describedby={error ? "login-error" : undefined}
              autoComplete="current-password"
              className={`${inputClassName} px-10`}
              id="login-password"
              onChange={(event) => setPassword(event.target.value)}
              type={showPassword ? "text" : "password"}
              value={password}
            />

            <button
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              onClick={() => setShowPassword((current) => !current)}
              type="button"
            >
              {showPassword ? <EyeOff aria-hidden="true" size={17} /> : <Eye aria-hidden="true" size={17} />}
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400">
          <input
            checked={remember}
            className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
            onChange={(event) => setRemember(event.target.checked)}
            type="checkbox"
          />
          Keep me signed in on this device
        </label>

        {error ? (
          <p
            className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
            id="login-error"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <button
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 via-blue-600 to-violet-600 px-4 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(37,99,235,0.24)] transition hover:shadow-[0_16px_36px_rgba(37,99,235,0.30)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
          disabled={busy}
          type="submit"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>

        {audience === "patient" ? (
          <p className="pt-1 text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
            No account yet?{" "}
            <Link
              className="font-semibold text-blue-700 transition hover:text-blue-900 dark:text-blue-400"
              href="/patient/register"
            >
              Register as a patient
            </Link>
          </p>
        ) : (
          <p className="pt-1 text-center text-xs leading-5 text-slate-400 dark:text-slate-500">
            One set of credentials covers every portal your role holds.
          </p>
        )}
      </form>
    </AuthFrame>
  );
}

/** A grid of portal tiles, grouped by the organisation they belong to. */
function PortalGroup({
  contexts,
  choosing,
  onChoose,
  emptyNote,
}: {
  contexts: LoginContext[];
  choosing: string | null;
  onChoose: (context: LoginContext) => void;
  emptyNote?: string;
}) {
  const byOrganization = useMemo(() => {
    const groups = new Map<string, LoginContext[]>();

    for (const context of contexts) {
      const key = context.organizationLabel;
      groups.set(key, [...(groups.get(key) ?? []), context]);
    }

    return [...groups.entries()];
  }, [contexts]);

  if (contexts.length === 0) {
    return emptyNote ? (
      <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        {emptyNote}
      </p>
    ) : null;
  }

  return (
    <div className="space-y-5">
      {byOrganization.map(([organization, group]) => (
        <div key={organization}>
          {byOrganization.length > 1 ? (
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Building2 aria-hidden size={12} />
              {organization}
            </p>
          ) : null}

          {/*
            When every portal in a group sits at the same branch, repeating
            that branch on each tile says nothing — three tiles all reading
            "Sami Jhammat Hospital — Main Campus" is noise where the thing
            that differs between them belongs. The branch is only worth the
            line when it actually varies, or when the seat is a caregiver one
            whose label names the person being cared for.
          */}
          <div className="grid gap-2.5 sm:grid-cols-2">
            {group.map((context) => {
              const portal = PORTAL_DIRECTORY[context.role];
              const branchesDiffer =
                new Set(group.map((entry) => entry.branchLabel ?? "")).size > 1;
              const subtitle = context.patientName
                ? context.branchLabel
                : branchesDiffer
                  ? (context.branchLabel ?? portal?.description)
                  : (portal?.description ?? context.branchLabel);
              const Icon = ROLE_ICONS[context.role] ?? UserRound;
              const key = keyOf(context);
              const isChoosing = choosing === key;

              return (
                <button
                  key={key}
                  type="button"
                  disabled={choosing !== null}
                  onClick={() => onChoose(context)}
                  className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(30,64,175,0.14)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 dark:border-slate-800 dark:bg-slate-950/50 dark:hover:shadow-[0_16px_34px_rgba(0,0,0,0.6)]"
                >
                  <span
                    aria-hidden
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{
                      background: `linear-gradient(140deg, ${portal?.accent ?? "#2563eb"}, ${portal?.accent ?? "#2563eb"}bb)`,
                    }}
                  >
                    {isChoosing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon size={18} />}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-950 dark:text-white">
                      {portal?.label ?? context.role}
                    </span>
                    <span className="block truncate text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                      {subtitle ?? context.organizationLabel}
                    </span>
                  </span>

                  <ChevronRight
                    aria-hidden
                    className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500 dark:text-slate-600"
                    size={16}
                  />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Stable identity for a context, since one account can hold several. */
function keyOf(context: LoginContext): string {
  return [context.role, context.membershipId ?? "-", context.tenantId ?? "-", context.patientId ?? "-"].join(
    ":",
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-slate-950" />}>
      <LoginFlow />
    </Suspense>
  );
}
