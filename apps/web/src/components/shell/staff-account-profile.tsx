import Link from "next/link";
import { Building2, KeyRound, Mail, MapPin, Phone, ShieldCheck, UserRound } from "lucide-react";
import { database } from "@wonflow/database";

import { readSession } from "@/lib/auth/session-server";

const formatDate = (value: Date | null | undefined) =>
  value ? new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short" }).format(value) : "Not recorded";

function Row({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
        <Icon aria-hidden size={15} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <div className="mt-0.5 break-words text-sm font-semibold text-slate-900 dark:text-white">{value}</div>
      </div>
    </div>
  );
}

/**
 * The signed-in staff member's own account, read-only.
 *
 * Reception had no profile screen at all - the avatar in the header linked to
 * "#" - so a receptionist could not check which branch or role their account
 * holds, or find where to change their password. Everything here is what the
 * hospital administrator assigned; the page says so rather than offering
 * edits the account holder is not allowed to make.
 */
export async function StaffAccountProfile({ portalName }: { portalName: string }) {
  const session = await readSession();
  const membership = session?.membershipId
    ? await database.tenantMembership.findFirst({
        where: { id: session.membershipId, identityId: session.identityId },
        select: {
          displayName: true,
          status: true,
          createdAt: true,
          organization: { select: { displayName: true } },
          primaryBranch: { select: { name: true } },
          staffProfile: { select: { title: true, employeeNumber: true } },
          identity: { select: { email: true, phone: true, lastAuthenticatedAt: true, passwordChangedAt: true } },
          roles: {
            select: { role: { select: { name: true } }, branch: { select: { name: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      })
    : null;

  if (!session || !membership) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        Your staff account could not be loaded. Sign out and back in, then try again.
      </div>
    );
  }

  const initials = membership.displayName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const assignments = membership.roles.map((assignment) => ({
    role: assignment.role.name,
    branch: assignment.branch?.name ?? "All branches",
  }));

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-blue-600 to-violet-600 text-xl font-black text-white shadow-md">
          {initials || <UserRound aria-hidden size={26} />}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">{portalName} · My profile</p>
          <h1 className="mt-1 truncate text-2xl font-black tracking-tight text-slate-950 dark:text-white">{membership.displayName}</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {membership.staffProfile?.title ?? assignments[0]?.role ?? "Hospital staff"}
            {membership.staffProfile?.employeeNumber ? ` · ${membership.staffProfile.employeeNumber}` : ""}
          </p>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-black text-slate-900 dark:text-white">Account</h2>
          <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            <Row icon={Mail} label="Login email" value={membership.identity.email} />
            <Row icon={Phone} label="Phone" value={membership.identity.phone ?? "Not provided"} />
            <Row icon={Building2} label="Hospital" value={membership.organization.displayName} />
            <Row
              icon={MapPin}
              label="Current branch"
              value={
                <>
                  {session.branchLabel ?? membership.primaryBranch?.name ?? "All branches"}
                  {membership.primaryBranch && session.branchLabel && membership.primaryBranch.name !== session.branchLabel ? (
                    <span className="block text-xs font-medium text-slate-500">Primary branch: {membership.primaryBranch.name}</span>
                  ) : null}
                </>
              }
            />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-black text-slate-900 dark:text-white">Roles &amp; branches</h2>
          {assignments.length ? (
            <ul className="mt-3 space-y-2">
              {assignments.map((assignment, index) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-800/40"
                  key={`${assignment.role}-${assignment.branch}-${index}`}
                >
                  <span className="font-bold text-slate-900 dark:text-white">{assignment.role}</span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{assignment.branch}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No roles are assigned to this account.</p>
          )}
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            Your name, roles and branches are managed by your hospital administrator. Contact them if anything here is wrong.
          </p>
        </section>
      </div>

      <section className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
            <ShieldCheck aria-hidden size={18} />
          </span>
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">Sign-in &amp; security</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Last sign-in {formatDate(membership.identity.lastAuthenticatedAt)} · Password changed{" "}
              {formatDate(membership.identity.passwordChangedAt)}
            </p>
          </div>
        </div>
        <Link
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
          href="/auth/change-password"
        >
          <KeyRound aria-hidden size={15} />
          Change password
        </Link>
      </section>
    </div>
  );
}
