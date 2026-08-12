# WonFlow Shared Experience UI Contract

## Scope

This contract covers the shared Phase 1 access experience delivered in
Batch 01. It does not redesign the existing hospital, doctor, patient,
platform, management, or operations workspaces.

## Canonical access routes

- `/login` — canonical secure sign-in route.
- `/auth/login` — redirects to `/login`.
- `/auth/forgot-password` — password-recovery request.
- `/auth/reset-password` — new-password form.
- `/auth/select-context` — organization and branch selection.
- `/auth/invitation` — invitation acceptance.
- `/auth/verify-email` — email verification.
- `/auth/account-locked` — locked-account state.
- `/auth/session-expired` — expired-session state.
- `/patient/register` — patient account registration.
- `/unauthorized` — access-denied state.
- `/notifications` — notification center inside the normal application shell.

## Authentication shell boundary

Access and public routes render without the normal portal sidebar and
internal top bar. All other routes continue to use
`PremiumApplicationShell`.

The route decision belongs to `ApplicationShellBoundary`. Nested layouts
must not add a second `<html>` or `<body>` element.

## Login ribbon

The login and related access screens use a full-width royal-blue ribbon
across the top of the viewport. A subtle light sweep may animate across
the ribbon. Reduced-motion preferences disable the sweep.

## Hospital logo behavior

Before an organization uploads and configures its logo, access screens
show a neutral hospital-logo placeholder. The UI must not imply that a
logo already exists.

A future organization configuration adapter may replace the placeholder
with the uploaded logo without restructuring the form.

## WonFlow route loader

The transition loader uses `/brand/wonflow-mark.png`. The WonFlow `W`
itself rotates; no generic circular spinner is added.

The animation:

- rotates approximately once every 1.2 seconds;
- uses a slight perspective tilt and gentle scale change;
- uses transform and opacity for smooth rendering;
- respects `prefers-reduced-motion`;
- exposes an accessible polite status label.

`apps/web/src/app/loading.tsx` and client-side route transitions use the
same loader.

## Route-transition behavior

The route-transition provider observes ordinary same-origin link
navigation without replacing Next.js navigation. It ignores external
links, downloads, new-window links, modifier-key clicks, telephone links,
email links, and same-page hash changes.

A short delay prevents flashing on extremely fast transitions. A minimum
visible duration prevents flicker once shown. Safety timeouts prevent a
stuck overlay.

Programmatic workflows may call:

- `beginTransition(label?)`
- `endTransition()`
- `isTransitioning`

## Empty-state rule

New Phase 1 screens start empty unless connected data exists. Use zero,
an em dash, disabled actions, or a clear empty state instead of invented
records.

This batch adds no hospitals, branches, users, clinicians, patients,
appointments, subscriptions, financial records, or clinical records.

## Responsive behavior

- Access screens support widths down to 320px.
- Two-column access layouts collapse to one column.
- Form controls provide touch-friendly targets.
- Horizontal overflow is not permitted.
- The login ribbon remains readable at mobile widths.

## Accessibility

- Every field has a visible label.
- Validation messages use accessible descriptions.
- Status feedback uses `role="status"` or `role="alert"`.
- Focus styling remains visible.
- Native buttons, links, inputs, and selects retain semantic behavior.
- Loader animation respects reduced-motion preferences.

## Authentication integration

The existing `/login` route continues to call `/api/auth/login`. Batch 01
does not invent a session, credentials, or privileged portal access.

Password recovery, password reset, invitation, verification, SSO, access
requests, and context selection remain clearly marked as not connected
when their production service is unavailable.

## Files in this batch

The installer prints the exact file list after applying the batch.
