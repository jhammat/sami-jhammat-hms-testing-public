"use client";

import { useState } from "react";

import {
  useAssignMembershipRoles,
  useInviteUser,
  useRoles,
  useUpdateUserStatus,
  useUsers,
} from "@/lib/api/admin";
import type { AdminUserRecord } from "@/lib/api/admin";

function RoleAssigner({ user }: { user: AdminUserRecord }) {
  const roles = useRoles();
  const assign = useAssignMembershipRoles();
  const [selected, setSelected] = useState<string[]>(user.roles.map((r) => r.role.id));
  const [error, setError] = useState("");

  function toggle(roleId: string) {
    setSelected((current) => (current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId]));
  }

  return (
    <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-xs font-black uppercase text-slate-500">Roles</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {(roles.data?.roles ?? []).map((role) => (
          <label className="flex items-center gap-1 text-xs font-bold" key={role.id}>
            <input checked={selected.includes(role.id)} onChange={() => toggle(role.id)} type="checkbox" />
            {role.name}
          </label>
        ))}
      </div>
      {error ? <p className="mt-1 text-xs font-bold text-red-700">{error}</p> : null}
      <button
        className="mt-2 rounded-lg bg-indigo-700 px-3 py-1 text-xs font-black text-white disabled:opacity-50"
        disabled={assign.saveState === "saving"}
        onClick={async () => { setError(""); try { await assign.mutate({ membershipId: user.id, roleIds: selected }); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update roles."); } }}
        type="button"
      >
        {assign.saveState === "saving" ? "Saving…" : "Apply — takes effect on their next request"}
      </button>
    </div>
  );
}

function InviteForm() {
  const [form, setForm] = useState({ email: "", displayName: "" });
  const [result, setResult] = useState<{ username: string; temporaryPassword: string } | null>(null);
  const [error, setError] = useState("");
  const invite = useInviteUser();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setResult(null);
    try {
      const body = await invite.mutate({ email: form.email.trim(), displayName: form.displayName.trim() });
      setResult({ username: body.credentials.username, temporaryPassword: body.credentials.temporaryPassword });
      setForm({ email: "", displayName: "" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not invite this person.");
    }
  }

  return (
    <form className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5" onSubmit={submit}>
      <h2 className="text-lg font-black">Invite a team member</h2>
      {error ? <p className="text-xs font-bold text-red-700">{error}</p> : null}
      {result ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm"><p className="font-bold">Invited.</p><p>Username: {result.username}</p><p>Temporary password: {result.temporaryPassword}</p></div> : null}
      <div className="grid grid-cols-2 gap-2">
        <input className="rounded-xl border border-slate-200 px-3 py-2" onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="Full name" required value={form.displayName} />
        <input className="rounded-xl border border-slate-200 px-3 py-2" onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" required type="email" value={form.email} />
      </div>
      <button className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50" disabled={invite.saveState === "saving"} type="submit">
        {invite.saveState === "saving" ? "Inviting…" : "Send invitation"}
      </button>
    </form>
  );
}

export function PracticeTeamManagement() {
  const users = useUsers();
  const [expanded, setExpanded] = useState<string | null>(null);
  const updateStatus = useUpdateUserStatus();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <InviteForm />
      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-black">Team directory</h2>
        {users.status === "loading" ? <p className="mt-3 text-sm text-slate-500">Loading…</p> : null}
        <div className="mt-3 space-y-2">
          {(users.data?.users ?? []).map((user) => (
            <article className="rounded-xl border border-slate-100 p-3" key={user.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold">{user.displayName}</p>
                  <p className="text-xs text-slate-500">{user.identity.email} · {user.status} · {user.roles.map((r) => r.role.name).join(", ") || "No roles"}</p>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-lg border border-indigo-200 px-3 py-1 text-xs font-bold text-indigo-700" onClick={() => setExpanded((current) => (current === user.id ? null : user.id))} type="button">
                    {expanded === user.id ? "Close" : "Manage roles"}
                  </button>
                  {user.status === "ACTIVE" ? (
                    <button className="rounded-lg border border-red-200 px-3 py-1 text-xs font-bold text-red-700" onClick={() => void updateStatus.mutate({ membershipId: user.id, status: "SUSPENDED" })} type="button">Suspend</button>
                  ) : (
                    <button className="rounded-lg border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700" onClick={() => void updateStatus.mutate({ membershipId: user.id, status: "ACTIVE" })} type="button">Reactivate</button>
                  )}
                </div>
              </div>
              {expanded === user.id ? <RoleAssigner user={user} /> : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
