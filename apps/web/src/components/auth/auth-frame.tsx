import type { ReactNode } from "react";

import { WonFlowLogo } from "@/components/brand/wonflow-logo";

interface AuthFrameProps {
  productName: string;
  title: string;
  description: string;
  children: ReactNode;
  /**
   * Widen the card. A single credential form reads best in one narrow column;
   * a grid of portals to choose between does not, and squeezing it into 520px
   * turned nine readable cards into a scrolling list of slivers.
   */
  width?: "narrow" | "wide";
  /** Rendered above the heading — a back link on the multi-step sign-in. */
  eyebrow?: ReactNode;
}

export function AuthFrame({
  productName,
  title,
  description,
  children,
  width = "narrow",
  eyebrow,
}: AuthFrameProps) {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_18%_12%,rgba(37,99,235,0.14),transparent_29%),radial-gradient(circle_at_84%_18%,rgba(124,58,237,0.13),transparent_27%),linear-gradient(180deg,#fbfdff,#f4f7ff)] transition-colors duration-300 dark:bg-[radial-gradient(circle_at_18%_12%,rgba(37,99,235,0.18),transparent_35%),radial-gradient(circle_at_84%_18%,rgba(124,58,237,0.18),transparent_35%),linear-gradient(180deg,#0a0f1d,#030712)]">
      <div className="relative flex min-h-screen w-full items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.28] [background-image:linear-gradient(rgba(99,102,241,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.05)_1px,transparent_1px)] [background-size:36px_36px] dark:opacity-[0.10]"
        />

        <svg
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[120%] min-w-[920px] -translate-x-1/2 -translate-y-1/2 opacity-95 dark:opacity-60"
          preserveAspectRatio="none"
          viewBox="0 0 1600 520"
        >
          <defs>
            <linearGradient id="wonflow-ribbon-primary" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#0284c7" stopOpacity="0" />
              <stop offset="0.18" stopColor="#0ea5e9" stopOpacity="0.72" />
              <stop offset="0.48" stopColor="#1d4ed8" stopOpacity="0.92" />
              <stop offset="0.76" stopColor="#4f46e5" stopOpacity="0.72" />
              <stop offset="1" stopColor="#7c3aed" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="wonflow-ribbon-light" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#38bdf8" stopOpacity="0" />
              <stop offset="0.32" stopColor="#38bdf8" stopOpacity="0.42" />
              <stop offset="0.62" stopColor="#2563eb" stopOpacity="0.46" />
              <stop offset="1" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
            <filter id="wonflow-ribbon-glow" x="-10%" y="-40%" width="120%" height="180%">
              <feGaussianBlur stdDeviation="15" />
            </filter>
          </defs>
          <path d="M-40 205 C230 80 405 430 690 270 C905 150 1105 105 1640 280" fill="none" filter="url(#wonflow-ribbon-glow)" opacity="0.2" stroke="#2563eb" strokeWidth="92" />
          <path d="M-40 205 C230 80 405 430 690 270 C905 150 1105 105 1640 280" fill="none" stroke="url(#wonflow-ribbon-primary)" strokeLinecap="round" strokeWidth="58" />
          <path d="M-40 315 C245 440 430 85 705 255 C930 395 1145 405 1640 205" fill="none" stroke="url(#wonflow-ribbon-light)" strokeLinecap="round" strokeWidth="31" />
        </svg>

        <section className={`relative z-[1] w-full ${width === "wide" ? "max-w-[840px]" : "max-w-[520px]"} rounded-[30px] border border-white/90 bg-white/95 p-5 shadow-[0_38px_110px_rgba(30,64,175,0.24)] ring-1 ring-blue-100/80 backdrop-blur-xl transition dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-[0_38px_110px_rgba(0,0,0,0.75)] dark:ring-slate-800 sm:p-7 lg:p-8`}>
          <div
            aria-hidden="true"
            className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent dark:via-blue-600"
          />

          <div className="mb-6 flex flex-col items-center text-center">
            <div className="wf-auth-logo-float rounded-2xl px-3 py-1">
              <WonFlowLogo className="!h-[54px] !w-[182px]" />
            </div>
            <span className="mt-2 inline-flex rounded-full border border-blue-100 bg-blue-50/80 px-3 py-1.5 text-[10px] font-bold text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/60 dark:text-blue-300">
              {productName}
            </span>
          </div>

          <header className="mt-6">
            {eyebrow ? <div className="mb-3">{eyebrow}</div> : null}

            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-[28px] dark:text-white">
              {title}
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </header>

          <div className="mt-6">
            {children}
          </div>

          <p className="mt-7 border-t border-slate-100 pt-5 text-center text-[11px] leading-5 text-slate-400 dark:border-slate-800 dark:text-slate-500">
            Access is limited to authorized users and may be monitored for security and audit purposes.
          </p>
        </section>
      </div>
    </main>
  );
}
