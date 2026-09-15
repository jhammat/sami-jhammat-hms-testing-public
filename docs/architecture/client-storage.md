# Client storage

All user data — patient, clinical, billing, scheduling, and every other
record the platform manages — lives in PostgreSQL and is reached through an
API route. Nothing about a patient, an encounter, an appointment, an
invoice, or any other business record may be persisted to the browser.

`localStorage`, `sessionStorage` and `document.cookie` (session/auth cookies
issued by the server are the one exception, since those are set by the
server, not read or written by application code) exist in this codebase for
**interface preference only** — things like whether a sidebar is collapsed
or which color theme is active. That data has no meaning outside the
browser it was set in, is safe to lose, and is never read back by the
server.

## Enforcement

This boundary is enforced three ways:

1. **ESLint** (`apps/web/eslint.config.mjs`) bans `localStorage`,
   `sessionStorage` and `document.cookie` as an error, everywhere under
   `apps/web/src`, except for exactly these files:
   - `apps/web/src/components/doctor/sidebar-collapsed-storage.ts`
   - `apps/web/src/components/shell/theme-toggle.tsx`
   - `apps/web/src/lib/doctor/display-preferences.ts` (Doctor Portal display
     density and similar presentation settings)

   Any other use fails `pnpm lint`.

2. **Build-time string check**
   (`tooling/scripts/check-demo-storage-strings.mjs`, run as part of
   `pnpm build`) fails if the string `wonflow-demo-` appears anywhere in
   tracked source. That prefix was used to key demo/mock data stored in the
   browser; its presence anywhere is itself evidence of client-persisted
   user data.

3. **Development-only runtime guard**
   (`apps/web/src/lib/dev/client-storage-guard.ts`, installed from the root
   layout) patches `Storage.prototype.setItem` in development builds only.
   Any write from outside the allow-list logs a console error naming the
   source file. This catches call sites the static checks above cannot see,
   such as code that builds a storage call dynamically. It never runs in
   production.

## Migration note for existing installations

Before this cleanup, several screens (patient registration, appointments,
the doctor and reception queues, doctor schedules and sittings, pharmacy
returns, diagnostics, clinical documentation and encounters, platform tenant
administration) stored working data under `localStorage`/`sessionStorage`
keys prefixed `wonflow-demo-`, instead of the real PostgreSQL-backed API.
All of that has been removed; every one of those screens now reads and
writes through its API route.

A browser that used an earlier build may still be holding some of those
`wonflow-demo-` keys. They are inert — nothing in the application reads them
anymore — but until they are cleared, a user could, in principle, be shown
stale demo data or offer stale demo data in the interface. As of this
change, the root layout runs a client-only cleanup script that deletes any
lingering `wonflow-demo-` key automatically on next load, guarded by a
`wonflow-data-cleanup-v1` marker so it only runs once per browser profile.
No manual action is required, but if a browser was open when this shipped,
a full reload picks it up. If anything still looks stale afterward, clearing
site data for the WonFlow origin (DevTools → Application → Storage → Clear
site data, or the browser's "Clear browsing data" for this site) removes it.

## Adding to the allow-list

Before adding a third file to the allow-list, confirm the data being stored
is genuinely interface preference — it would be safe to clear, is never
sent to or expected from the server, and carries no patient, clinical or
business meaning. If it is anything else, it belongs in PostgreSQL behind an
API route instead.
