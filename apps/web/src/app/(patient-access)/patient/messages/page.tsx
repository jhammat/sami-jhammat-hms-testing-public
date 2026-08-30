import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, FileText, MessageSquare, Phone } from "lucide-react";

export const metadata: Metadata = {
  title: "Messages | WonFlow",
  robots: { index: false, follow: false },
};

/**
 * Patient messaging is not in this release.
 *
 * This route previously told every signed-in patient "Sign in with a linked
 * patient account to use practice messaging. No patient identity was
 * inferred." — which is alarming, wrong, and unactionable when the patient
 * IS signed in with a linked account. The feature simply does not exist yet.
 */
export default function Page() {
  return (
    <main id="main-content" className="space-y-5">
      <header className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-violet-50 p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700">
          Your care team
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-slate-900">Messages</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Messaging your care team from the app is not available yet. Your account is signed in
          correctly — this part of the portal has not been built.
        </p>
      </header>

      <section className="rounded-3xl border border-rose-200 bg-rose-50 p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-rose-900">
          <Phone size={15} /> If something is wrong, telephone the ward
        </p>
        <p className="mt-1 text-xs leading-5 text-rose-900/85">
          Do not wait for a reply here. Use the hospital number on your discharge letter, and call
          emergency services for severe pain, heavy bleeding, fever with shaking chills, or
          breathing difficulty.
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-500/10 text-slate-400">
            <MessageSquare size={22} />
          </span>
          <p className="text-sm font-semibold text-slate-800">What you can do here today</p>
        </div>

        <ul className="mx-auto mt-6 grid max-w-2xl gap-2 sm:grid-cols-2">
          {[
            {
              href: "/patient",
              label: "Your daily tasks",
              detail: "Everything your care team has asked you to do today",
              icon: CalendarDays,
            },
            {
              href: "/patient/documents",
              label: "Your documents",
              detail: "Letters, results and forms shared with you",
              icon: FileText,
            },
          ].map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-blue-300 hover:bg-blue-50/40"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-500/10 text-slate-500">
                    <link.icon size={15} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-slate-800">
                      {link.label}
                    </span>
                    <span className="block truncate text-[11px] text-slate-500">{link.detail}</span>
                  </span>
                </span>
                <ArrowRight size={14} className="shrink-0 text-slate-400" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
