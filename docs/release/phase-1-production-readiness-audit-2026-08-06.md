# WonFlow Phase 1 Production Readiness Audit

Date: 2026-08-06 (revised — diagnostics and hardening pass)
Environment: local Windows development environment, PostgreSQL `wonflow_phase1_dev`, Node v24.13.1, Next.js 16.2.11
Decision: **NO-GO for production hospital deployment.** Cleared for demonstration and private UAT under the conditions in "Permitted use" below.

## Diagnostics and hardening pass

Laboratory and Radiology are now live modules, and several security controls
that were previously listed as undemonstrated are implemented and tested.

### Diagnostics is no longer a demonstration module

Both departments run on the database through one shared workspace:

- Six laboratory sections (worklist, specimen collection, processing, pending release, released, critical) and five radiology sections, each in the sidebar and reachable from clickable KPI tiles.
- The full clinical path works end to end: collect specimen (laboratory) or start study (radiology) → enter a preliminary result → verify and release → the result reaches the patient portal and the ordering doctor.
- **Delivery receipts are real.** `releaseResult` writes `Notification` rows for the patient and the ordering clinician inside the release transaction, and the UI reads them back. "Sent to patient" and "Sent to doctor" reflect recorded facts, not assumptions.
- The doctor's results and radiology-results screens are live, and the ordering clinician can acknowledge a released result (`acknowledgedAt`, with an audit event).
- Radiology's "stored locally in this browser" banner is gone; **7,982 lines of orphaned mock diagnostics code were deleted.**

Runtime mock-data imports: **67 of 590 files, down from 72.** Still a release blocker, but the diagnostics path is clear.

### Least privilege

The development seed previously granted **every permission to every role**, which made role separation fictional and authorization regressions invisible. Each workspace now receives only the permissions it needs, and the suite asserts that one department cannot read another's worklist. All ten portals still function under the reduced grants.

### Security controls added

| Control | Implementation |
|---|---|
| Security headers | CSP (`frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, HSTS in production, `X-Powered-By` removed |
| Sign-in throttling | Per-address failure throttle on `/api/auth/login`, complementing the existing per-identity lockout |
| Cache posture | API responses carrying patient data are `no-store`; fingerprinted `/_next/static` assets stay cacheable |

Two deliberate limitations, both commented in code:

1. **CSP still needs `script-src 'unsafe-inline'`.** The App Router streams its RSC payload through inline script tags and the root layout bootstraps the colour theme inline. Removing it requires nonce plumbing through both.
2. **The throttle counts failures only, and its state is per process.** Counting every attempt would let one person's typos lock out a whole hospital site behind NAT. A horizontally scaled deployment must back this with `REDIS_URL` before relying on it.

Rendered pages carry Next's own `no-cache, must-revalidate` rather than `no-store`; Next owns that header on dynamic routes and overrides both `headers()` and middleware.

### Test coverage

**104 end-to-end tests passing** (from 24 at the start of this work) across desktop Chrome and Pixel 7, plus **14 unit tests** (from 4). New coverage includes both diagnostics departments end to end, cross-department authorization refusal, the security headers, the sign-in throttle, and — critically — that **a preliminary result never appears in the patient payload**.

The suite now seeds via a Playwright `globalSetup` and the seed tops up a pool of open orders, because releasing a result consumes one and a fixed set was exhausted partway through a two-project run.

## What changed in this pass

The headline finding is that **the application was completely non-interactive in local development** and nobody had noticed, because the automated suite only ever inspected server-rendered HTML.

### Critical defect found and fixed: React never hydrated

Every screen rendered its server HTML and then froze. Portals that fetch on the client (`/patient`, `/doctor`, the laboratory worklist) sat on "Loading…" forever; forms fell back to native GET submissions; no `onClick` anywhere in the product did anything.

Evidence gathered:

- 0 of 119 DOM elements carried a React fiber; only the root `__reactContainer$` existed, meaning `hydrateRoot` was called and then suspended forever.
- The RSC flight stream was truncated: rows `$7f`, `$82`, `$84`, `$86`, `$88` were referenced but never emitted.
- Submitting the login form navigated to `/login?` — a native form GET, proving no React submit handler was attached.
- Reproduced under both Turbopack and webpack, so it was not a bundler issue.
- The production build was unaffected and hydrated correctly (123/135 elements).

Root cause: **Next.js 16 blocks `/_next/*` development resources it considers cross-origin.** The browser reached the dev server on `127.0.0.1` while the server had been started as `localhost`, so dev resource delivery and the HMR socket were rejected and the client could never finish hydrating. Fixed with `allowedDevOrigins` in `apps/web/next.config.ts`.

This was a development-environment defect, not a defect in the shipped product. It is recorded here because it invalidated all prior local UI verification: any screenshot or manual check taken against the dev server before this fix showed a frozen application.

### Other fixes applied

| Area | Change |
|---|---|
| `apps/web/next.config.ts` | Pinned `turbopack.root` and `outputFileTracingRoot` to the monorepo. Next.js had been inferring `C:\Users\MR.Laptops` as the workspace root from an unrelated stray `package-lock.json`. |
| `apps/web/src/proxy.ts` | Renamed from `middleware.ts` to the Next.js 16 `proxy` convention, clearing the deprecation warning. Matcher narrowed to `/((?!_next/).*)` so framework internals are never routed through the auth redirect. |
| `registration-legacy-shell.tsx` | **Role navigation defect.** Sidebar groups were selected purely by URL prefix, so every `/operations/*` route rendered the Reception sidebar. Laboratory, Radiology, Pharmacy and Billing officers — 4 of 10 roles — were shown "Reception Desk / Today's Appointments / Patient Directory", none of which are their screens. Navigation is now keyed on the signed-in workspace, with dedicated groups per department. |
| `seed-development-logins.ts` | Added a publicly bookable consultation service and Monday–Saturday availability rules. Without them the booking catalogue was empty and no booking flow could be exercised at all. |
| `reception-desk-workspace.backup.tsx` | Deleted 138 KB of dead, unreferenced code from `src/`. |

## Verified gates

| Gate | Result | Evidence |
|---|---|---|
| Prisma schema validation | Pass | `pnpm db:validate` |
| TypeScript, all workspaces | Pass | `pnpm typecheck` |
| Production build | Pass | 213 routes generated |
| Lint | Pass with warnings | 0 errors, 54 warnings |
| Unit tests | Pass, still thin | 14 tests in 3 files: authentication and the sign-in throttle |
| End-to-end suite | Pass | **104/104**, desktop Chrome + Pixel 7 |
| Client hydration | Pass | New regression test asserts React fibers attach |
| Route sweep, all 10 roles | Pass | 64 in-scope routes, HTTP 200, zero console errors |
| Cross-role booking flow | Pass | Patient books in the UI, reception sees the appointment |
| Runtime mock-data audit | **Fail** | 67 of 590 runtime files still import `@wonflow/mock-data` |
| UI foundation audit | **Fail** | Tooling still references a removed file; cannot run |
| Runtime audit tooling | Fixed | Skipped tracked-but-deleted paths, which previously crashed it into a misleading exit code 0 |

The e2e suite went from 24 smoke cases to 48, including six previously-failing cases and new coverage for hydration, interactivity, hidden-scope routes, and the patient→reception booking flow.

Three routes correctly return 404 by design — `/operations/queue`, `/doctor/queue`, `/doctor/inpatients` — along with blood-bank, insurance, inpatient and surgery. These are Phase 2 scope, hidden by an intentional `HiddenPhaseTwoLayout`. The previous e2e spec listed several of them as expected-to-work, which is why it was red; the spec now asserts they stay hidden.

## Test-coverage gap this pass exposed

The prior suite asserted only that server HTML lacked error strings. That is why a total hydration failure — an application where literally nothing was clickable — passed 24/24. Two regression tests now assert the client actually takes over, and one asserts a real workflow completes. This class of blind spot should be assumed to exist elsewhere: **route smoke coverage is not workflow coverage.**

## UI assessment

I captured and reviewed all 64 in-scope Phase 1 screens across the 10 roles at 1440×900, before and after the hydration fix.

The visual design is genuinely strong and consistent: coherent gradient headers, a uniform card system, sensible empty states, a working dark-mode toggle, and a clean collapsible shell. The Reception Desk, Doctor Dashboard and Hospital Administration dashboards are the strongest screens. I did not find broken layouts, overflow, or contrast failures. **The remaining product gaps are data and wiring, not styling.**

Specific observations:

1. **Diagnostics is now live.** Both Laboratory and Radiology persist to the database, and the browser-local demonstration module has been deleted. This item is resolved.
2. **Screens are empty because the database is empty.** One patient, one practitioner, no appointments, no invoices. For a fresh production install this is correct behaviour, not a defect — but it means no screenshot currently demonstrates the product populated.
3. The Hospital Administration "Operational activity" chart renders a single full-height bar when the only non-zero series is a count of 1. It is not wrong, but it reads as broken and needs a y-axis or a minimum-scale rule.
4. Reception Desk omits the breadcrumb/title block that every other screen shows.

## Release blockers

These remain, and none were resolved in this pass:

1. **67 runtime files still import `@wonflow/mock-data`**, spanning appointments, billing, doctor, patient, pharmacy, platform, queue, policies, services and team. Diagnostics is now clear; billing, pharmacy and inpatient are the largest remaining areas.
2. **Automated coverage is still thin for a clinical system.** 14 unit tests. Cross-department authorization is now covered end to end, but there is no tenant-isolation or branch-isolation test, and no service-level unit coverage. Tenant isolation being untested remains the most serious gap.
3. MFA, session revocation, invitation/email delivery, storage scanning, monitoring, alerting, backup restore and an independent security review are still undemonstrated. Sign-in throttling and security headers are now implemented, but the throttle is single-process only.
4. Mobile apps typecheck but have no signed artifact, CI signing pipeline, device evidence, or secure download endpoint.
5. UI foundation audit tooling is stale and cannot run. (The separate production runtime audit script was repaired in this pass — it had been exiting 0 on a crash, reporting a clean result that was not real.)
6. No completed production sign-offs in the release checklist.

## Known environment issues

- `next start` warns that it does not work with `output: "standalone"`. Production must be launched via `node .next/standalone/server.js`. The deployment runbook should state this explicitly.
- A stray `C:\Users\MR.Laptops\package-lock.json` (no `package.json`, no `node_modules`) sits above the checkout. `turbopack.root` now neutralises it, but it should be deleted.
- Running the production build over plain HTTP causes the `Secure` session cookie to be withheld by Chromium. This is correct behaviour — `secure` is correctly gated on `NODE_ENV === "production"` — but it means the production build cannot be smoke-tested over `http://`. Use the dev server or terminate TLS.

## Permitted use

Do not deploy this commit as a production hospital system holding real patient data.

A demonstration or private UAT deployment may proceed only if it is explicitly labelled non-production, uses fictional data, contains no real patient information, is network-restricted, and has stakeholder acceptance of the limitations above — in particular that **Radiology is a browser-local demonstration module**.
