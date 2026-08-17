"use client";

import {
  Suspense,
  useState,
} from "react";
import type {
  FormEvent,
} from "react";
import {
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import {
  useSearchParams,
} from "next/navigation";

import {
  AuthFrame,
} from "@/components/auth";

const inputClassName = [
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5",
  "text-sm text-slate-950 outline-none transition",
  "placeholder:text-slate-400 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
  "focus:border-blue-500 focus:ring-4 focus:ring-blue-100",
].join(" ");

function LoginForm() {
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setStatus(undefined);

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
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const data = (await response.json()) as {
        error?: string;
        homePath?: string;
        passwordChangeRequired?: boolean;
      };

      if (!response.ok || !data.homePath) {
        setError(data.error ?? "Invalid email or password.");
        setBusy(false);
        return;
      }

      const requestedPath = searchParams.get("next");
      const destination = data.passwordChangeRequired
        ? "/auth/change-password"
        : requestedPath && requestedPath.startsWith("/") && requestedPath !== "/"
            ? requestedPath
            : data.homePath;

      window.location.replace(destination);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      description="Sign in to continue to WonFlow."
      productName="WonFlow Hospital Platform"
      title="Welcome back"
    >
      <div className="mb-4">
        <Link
          href="/showcase"
          className="group flex items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 p-3 text-xs transition hover:border-indigo-400 hover:shadow-md"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              ✨
            </span>
            <div>
              <div className="font-bold text-indigo-950">Visual Mind Map & System Showcase</div>
              <div className="text-[11px] text-indigo-700">Interactive 10-portal architecture & screen gallery</div>
            </div>
          </div>
          <span className="font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
            Explore →
          </span>
        </Link>
      </div>

      <form
        className="space-y-4"
        noValidate
        onSubmit={handleSubmit}
      >
        <div>
          <label
            className="text-sm font-semibold text-slate-700"
            htmlFor="login-email"
          >
            Email address
          </label>

          <div className="relative mt-1.5">
            <Mail
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
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
              className="text-sm font-semibold text-slate-700"
              htmlFor="login-password"
            >
              Password
            </label>

            <Link
              className="text-xs font-semibold text-blue-700 transition hover:text-blue-900"
              href="/auth/forgot-password"
            >
              Forgot password?
            </Link>
          </div>

          <div className="relative mt-1.5">
            <KeyRound
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
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
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              onClick={() => setShowPassword((current) => !current)}
              type="button"
            >
              {showPassword ? (
                <EyeOff aria-hidden="true" size={17} />
              ) : (
                <Eye aria-hidden="true" size={17} />
              )}
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
          <input
            checked={remember}
            className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
            onChange={(event) => setRemember(event.target.checked)}
            type="checkbox"
          />
          Keep me signed in on this device
        </label>

        {error ? (
          <p
            className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm font-medium text-rose-700"
            id="login-error"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {status ? (
          <p
            className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-3 text-sm font-medium text-blue-800"
            role="status"
          >
            {status}
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

        <p className="pt-1 text-center text-xs leading-5 text-slate-400">
          Use credentials issued by your organization.
        </p>
      </form>
    </AuthFrame>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50" />
      }
    >
      <LoginForm />
    </Suspense>
  );
}
