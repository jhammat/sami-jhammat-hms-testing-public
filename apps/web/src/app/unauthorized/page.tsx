"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Home,
  LockKeyhole,
} from "lucide-react";

import {
  WonFlowLogo,
} from "@/components/brand/wonflow-logo";

import { WonFlowConfirmHost, wonflowConfirm } from "@/components/feedback";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_20%_0%,rgba(37,99,235,0.10),transparent_32%),#f8faff] px-4 py-10">
      <WonFlowConfirmHost />
      <section className="w-full max-w-xl rounded-[26px] border border-blue-100 bg-white p-6 text-center shadow-[0_26px_80px_rgba(30,64,175,0.12)] sm:p-9">
        <div className="flex justify-center">
          <WonFlowLogo />
        </div>

        <div className="mx-auto mt-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-700 ring-1 ring-rose-100">
          <LockKeyhole
            aria-hidden="true"
            size={25}
            strokeWidth={1.9}
          />
        </div>

        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.025em] text-slate-950">
          Access restricted
        </h1>

        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
          Your account does not have permission to open this area.
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={() => window.history.back()}
            type="button"
          >
            <ArrowLeft aria-hidden="true" size={17} />
            Go back
          </button>

          <Link
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800"
            href="/"
          >
            <Home aria-hidden="true" size={17} />
            Return to home
          </Link>
        </div>

        <button
          className="mt-3 min-h-11 w-full rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700"
          onClick={() => {
            void wonflowConfirm({
              title: "Request access",
              message: "The access-request workflow is not connected yet. Ask a hospital administrator to grant this workspace.",
              confirmLabel: "Understood",
              cancelLabel: "Close",
              tone: "primary",
            });
          }}
          type="button"
        >
          Request access
        </button>
      </section>
    </main>
  );
}
