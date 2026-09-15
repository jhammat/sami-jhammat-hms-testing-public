"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2 } from "lucide-react";

import type { WonFlowRole } from "@/lib/auth/accounts";
import {
  CARE_TEAM_INBOX_CHANGED_EVENT,
  careTeamPathForRole,
  careTeamPatientHref,
} from "@/lib/clinical/care-team-paths";

interface InboxItem {
  id: string;
  templateCode: string;
  unread: boolean;
  createdAt: string;
  patientId: string | null;
  payload: Record<string, unknown>;
}

const POLL_MS = 60_000;

const text = (value: unknown) => (typeof value === "string" ? value : "");

function describe(item: InboxItem): { headline: string; detail: string } {
  const actor = text(item.payload.actorName) || "A colleague";
  const title = text(item.payload.title);
  const patient = [text(item.payload.patientName), text(item.payload.patientNumber)].filter(Boolean).join(" · ");
  if (item.templateCode === "care-team-acknowledged") {
    const note = text(item.payload.note);
    return {
      headline: `${actor} acknowledged your entry`,
      detail: `${title}${patient ? ` — ${patient}` : ""}${note ? ` · “${note}”` : ""}`,
    };
  }
  if (item.templateCode === "care-team-update") {
    return { headline: `${actor}: ${title}`, detail: patient };
  }
  return { headline: title || item.templateCode.replace(/-/g, " "), detail: patient };
}

const since = (iso: string) => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Intl.DateTimeFormat("en-PK", { dateStyle: "medium" }).format(new Date(iso));
};

/**
 * The care team's notification bell.
 *
 * Staff notifications were being written — and until now read by nobody. This
 * shows the unread count on every screen of the three clinical portals, lists
 * what changed, and takes the reader straight to the patient's shared record.
 *
 * Renders nothing until the first response arrives, so the server render and
 * the first client render agree (no hydration mismatch) and roles without a
 * care-team page never see an empty bell.
 */
export function CareTeamInboxBell({ role }: { role: WonFlowRole }) {
  const router = useRouter();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [unread, setUnread] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/notifications/inbox?limit=12", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) return;
      const payload = (await response.json()) as { items?: InboxItem[]; unreadCount?: number };
      setItems(payload.items ?? []);
      setUnread(payload.unreadCount ?? 0);
    } catch {
      // Leave the last known state; the next poll retries.
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
    const timer = window.setInterval(() => void load(), POLL_MS);
    const refresh = () => void load();
    window.addEventListener(CARE_TEAM_INBOX_CHANGED_EVENT, refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(CARE_TEAM_INBOX_CHANGED_EVENT, refresh);
    };
  }, [load]);

  if (unread === null || !careTeamPathForRole(role)) return null;

  async function markRead(body: object) {
    await fetch("/api/v1/notifications/inbox/read", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
    window.dispatchEvent(new Event(CARE_TEAM_INBOX_CHANGED_EVENT));
  }

  async function openItem(item: InboxItem) {
    setOpen(false);
    if (item.unread) void markRead({ ids: [item.id] });
    const href = item.patientId ? careTeamPatientHref(role, item.patientId) : careTeamPathForRole(role);
    if (href) router.push(href);
  }

  async function markAll() {
    setBusy(true);
    await markRead({ all: true });
    await load();
    setBusy(false);
  }

  return (
    <div className="relative">
      <button
        aria-label={unread > 0 ? `${unread} unread care team updates` : "Care team updates"}
        className="wfg-control relative flex h-10 w-10 shrink-0 items-center justify-center text-slate-600 hover:text-indigo-600"
        onClick={() => {
          setOpen((current) => !current);
          if (!open) void load();
        }}
        title="Care team updates"
        type="button"
      >
        <Bell size={18} />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-rose-600 px-1 text-center text-[9px] font-black leading-4 text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1.5 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between px-2.5 py-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Care team updates</span>
              <button
                className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 disabled:opacity-50 dark:text-indigo-400"
                disabled={busy || unread === 0}
                onClick={() => void markAll()}
                type="button"
              >
                {busy ? <Loader2 className="size-3 animate-spin" /> : <CheckCheck className="size-3" />} Mark all read
              </button>
            </div>

            <div className="max-h-96 space-y-1 overflow-y-auto">
              {items.length === 0 ? (
                <p className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">No updates yet.</p>
              ) : (
                items.map((item) => {
                  const { headline, detail } = describe(item);
                  return (
                    <button
                      className={`block w-full rounded-xl px-2.5 py-2 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800 ${
                        item.unread ? "bg-indigo-50/70 dark:bg-indigo-950/40" : ""
                      }`}
                      key={item.id}
                      onClick={() => void openItem(item)}
                      type="button"
                    >
                      <span className="flex items-start gap-2">
                        <span
                          aria-hidden
                          className={`mt-1.5 size-1.5 shrink-0 rounded-full ${item.unread ? "bg-indigo-600" : "bg-transparent"}`}
                        />
                        <span className="min-w-0">
                          <span className="block text-xs font-bold text-slate-900 dark:text-white">{headline}</span>
                          {detail ? <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">{detail}</span> : null}
                          <span className="block text-[10px] text-slate-400">{since(item.createdAt)}</span>
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <button
              className="mt-1 block w-full rounded-xl px-2.5 py-2 text-center text-[11px] font-bold text-indigo-600 hover:bg-slate-50 dark:text-indigo-400 dark:hover:bg-slate-800"
              onClick={() => {
                setOpen(false);
                const base = careTeamPathForRole(role);
                if (base) router.push(base);
              }}
              type="button"
            >
              Open care team record
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
