import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Inbox, MessageSquare, Stethoscope } from "lucide-react";

export const metadata: Metadata = {
  title: "Message triage | WonFlow",
  robots: { index: false, follow: false },
};

/**
 * Practice messaging is not in this release.
 *
 * This route previously rendered a fixed amber banner reading "An
 * authenticated clinician session is required. No team-member identity was
 * inferred." to every signed-in doctor. It was not an authentication
 * failure — the page simply had nothing behind it — but it read as a broken
 * session, and a clinician who sees that has no way to tell a missing
 * feature from a security problem.
 *
 * Saying so plainly, and pointing at the routes that DO carry clinical
 * correspondence today, is the honest version of the same screen.
 */
export default function Page() {
  return (
    <main id="main-content" className="space-y-5">
      <header className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-700">
          Clinical correspondence
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-slate-900">
          Message triage
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Direct patient messaging is not part of this release. Nothing is broken and your session
          is fine — there is simply no message store behind this route yet.
        </p>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-500/10 text-slate-400">
            <MessageSquare size={22} />
          </span>
          <p className="text-sm font-semibold text-slate-800">
            Where clinical correspondence lives today
          </p>
          <p className="max-w-lg text-xs leading-5 text-slate-500">
            Until messaging ships, everything a clinician needs to say about a patient goes into the
            record itself, where it is attributed and audited.
          </p>
        </div>

        <ul className="mx-auto mt-6 grid max-w-2xl gap-2 sm:grid-cols-2">
          {[
            {
              href: "/doctor/inbox",
              label: "Clinical inbox",
              detail: "Results, acknowledgements and items needing your attention",
              icon: Inbox,
            },
            {
              href: "/doctor/careplans",
              label: "Care plan progress notes",
              detail: "The thread the whole care team reads, including allied health",
              icon: Stethoscope,
            },
          ].map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-indigo-300 hover:bg-indigo-50/40"
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
