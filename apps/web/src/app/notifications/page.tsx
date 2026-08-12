"use client";

import {
  useState,
} from "react";
import {
  Bell,
  Inbox,
  Search,
} from "lucide-react";

import {
  WonFlowEmptyState,
} from "@/components/feedback";

const filters = [
  "All",
  "Unread",
  "Clinical",
  "Operational",
  "Administrative",
] as const;

export default function NotificationsPage() {
  const [activeFilter, setActiveFilter] =
    useState<(typeof filters)[number]>("All");
  const [query, setQuery] = useState("");

  return (
    <main
      className="space-y-6"
      id="main-content"
    >
      <header className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-violet-50 p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
              Shared workspace
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-slate-950">
              Notifications
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Clinical, operational and administrative alerts will appear
              here when connected services create them.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat
              label="All"
              value="0"
            />
            <Stat
              label="Unread"
              value="0"
            />
            <Stat
              label="Urgent"
              value="0"
            />
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                aria-pressed={activeFilter === filter}
                className={
                  activeFilter === filter
                    ? "min-h-10 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white"
                    : "min-h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                }
                key={filter}
                onClick={() => setActiveFilter(filter)}
                type="button"
              >
                {filter}
              </button>
            ))}
          </div>

          <label className="relative block w-full xl:max-w-sm">
            <span className="sr-only">
              Search notifications
            </span>

            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              size={17}
            />

            <input
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search notifications"
              type="search"
              value={query}
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <button
            className="min-h-10 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-400"
            disabled
            type="button"
          >
            Mark all as read
          </button>

          <button
            className="min-h-10 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-400"
            disabled
            type="button"
          >
            Clear all
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
        <WonFlowEmptyState
          action={
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
              <Bell aria-hidden="true" size={14} />
              Notifications enabled when services are connected
            </span>
          }
          description="New alerts and updates will appear here."
          title="No notifications yet"
        />

        <div className="sr-only">
          Active filter: {activeFilter}. Search query: {query || "none"}.
        </div>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-24 rounded-2xl border border-white bg-white/80 px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500">
        <Inbox aria-hidden="true" size={14} />
        <span className="text-xs font-semibold">
          {label}
        </span>
      </div>

      <div className="mt-1.5 text-2xl font-semibold text-slate-950">
        {value}
      </div>
    </div>
  );
}
