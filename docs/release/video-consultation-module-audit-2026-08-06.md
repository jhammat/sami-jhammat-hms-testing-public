# Online Video Consultation Module — Audit

Date: 2026-08-06
Scope: `VideoCallSession` / `VideoCallSignal`, `video-consultation-service.ts`, `/api/v1/video-consultations/*`, `VideoConsultationRoom`, and the `consultationMode` changes across services, booking and both portals.
Verdict: **Correctly placed and well built. Not production ready — one hard blocker and several operational gaps.**

## Is it correctly placed?

Yes. The module follows the conventions already established in this codebase, and I found no misplacement.

| Layer | Placement | Assessment |
|---|---|---|
| Schema | `VideoCallSession` (1:1 with `Appointment`), `VideoCallSignal` (child, cascade delete) | Correct. Tenant-scoped, correct cascade rules, sensible indexes on `(tenantId, status, expiresAt)` and `(sessionId, createdAt)`. |
| Migration | `20260806030000_online_video_consultations` | Forward-only, additive, safe defaults (`consultationMode DEFAULT 'IN_PERSON'`). Applies cleanly. |
| Service | `src/server/video-consultation/` | Matches the `src/server/<domain>/` convention. |
| API | `/api/v1/video-consultations/[appointmentId]` and `/signals` | Matches the versioned API layout and uses the shared `handleApiRoute` error envelope. |
| Pages | `(patient-access)` and `(doctor-workspace)` route groups | Correct — each portal serves its own participant, sharing one room component. |
| Entry points | Patient appointment card and doctor appointment card | Both render the link only for `ONLINE`, non-cancelled appointments. |
| `consultationMode` | Threaded through admin service creation, doctor fee service, reception booking and patient booking | Complete; no path creates an appointment without setting it. |

`/doctor/appointments` has no `page.tsx` of its own — it resolves through the existing `doctor/[section]` catch-all to `LiveDoctorAppointments`. That is consistent with how the other doctor sections work, not a defect.

## What is genuinely good

- **Authorization is the strongest part.** `resolveParticipant` derives the role rather than trusting the client: the patient is verified through an active `PatientAccess` row, and the doctor through `appointment.doctor.staffProfile.membershipId === context.membershipId`. Everything is tenant-scoped. Reception, laboratory, billing and administrators are all refused — now asserted by test.
- **The room is not a free-for-all.** Non-`ONLINE`, cancelled and no-show appointments are rejected, and a join window (15 minutes before to 60 minutes after) is enforced on both join and signalling.
- **Media never touches the server.** WebRTC is peer-to-peer; only session state and short-lived SDP/ICE signals are stored, with a 120-minute expiry. This is the right architecture for patient confidentiality, and the UI says so honestly.
- Signals are filtered to `senderRole != mine`, so a participant is never fed their own traffic back.
- Payloads are capped at 64 KB and signal types are allow-listed.
- Join and end are written to `AuditEvent`.

## Blocker fixed during this audit

**The module could not work at all.** The `Permissions-Policy` header I added in the previous commit was `camera=(), microphone=()`, which denies those capabilities to every origin including this one. `getUserMedia` would have been blocked before the browser prompt ever appeared, so no call could ever start. Changed to `camera=(self), microphone=(self)`, with a regression test asserting it.

This was my defect colliding with this module, not a fault in the module.

## Other changes made

| Area | Issue | Change |
|---|---|---|
| `listVideoSignals` | Ran `deleteMany` across the **entire** `VideoCallSignal` table on every poll — once per second per participant | Scoped the sweep to the polled session, which is covered by the `sessionId` index |
| `listVideoSignals` | Called `resolveParticipant`, joining patient, doctor, staff profile, membership, branch, service and session, once per second per participant | Added `resolvePollingParticipant`, a narrow query enforcing identical access rules |
| Worker | No retention job; expired signals and sessions accumulated | Added a sweep that deletes expired signals and closes overdue sessions |
| Seed | No `ONLINE` service existed, so the module was unreachable | Added an online consultation service, an evening clinic window, and one live appointment so the room is joinable on sight |
| Seed | Both services shared one 09:00–17:00 window | Split them. Slot capacity is enforced **per doctor across all services**, so overlapping clinics halve the bookable day — this is worth knowing when configuring real schedules |

## Remaining gaps before production

1. **No TURN server.** `WONFLOW_WEBRTC_ICE_SERVERS_JSON` is documented but empty, so the code falls back to Google's public STUN. STUN alone cannot traverse symmetric NAT, which is normal on hospital and mobile carrier networks — **a substantial share of real calls will fail to connect.** An authenticated TURN service is mandatory, not optional, and the public Google STUN default should not ship to production.
2. **Signalling is 1-second HTTP polling.** Each participant issues roughly 2 database round trips per second for the duration of a call. It works and is now much cheaper, but it will not scale to many concurrent consultations. Server-sent events or a WebSocket relay is the correct end state.
3. **No media-level testing.** Coverage proves the signalling protocol, authorization and lifecycle. It does not prove that audio and video actually flow between two browsers, which needs fake-device browser runs and a real TURN relay.
4. **No consent capture or session recording policy.** Many jurisdictions require explicit patient consent before a remote consultation and a documented stance on recording. Neither exists; the module records no consent artefact.
5. **No clinical record link.** A completed video consultation does not open or attach to an `Encounter`, so a remote visit leaves no clinical note the way an in-person visit does.
6. **No reconnection handling.** If a participant drops, the peer connection reports `failed`/`disconnected` and the UI says so, but there is no ICE restart or automatic rejoin.
7. **Nested `<main>` landmarks.** The room renders its own `<main id="main-content">` inside the portal shell, which already provides one. Two `main` landmarks per page is an accessibility defect — the same class of issue as the duplicate `<h1>` already recorded for the shell.
8. **Not feature-flagged.** The module is always on. If online consultations are out of Phase 1 scope, it should sit behind the flag mechanism used for the hidden Phase 2 modules.

## Test coverage added

Ten end-to-end tests:

- An online booking exposes a room to its patient; the assigned doctor is the initiator.
- Reception, laboratory, billing and administrator are refused on read, join and signalling (403).
- Anonymous visitors are redirected to sign-in.
- An in-person appointment has no room (409).
- Signalling is refused before the room opens, and again after the call ends.
- **Full signalling handshake**: doctor joins and publishes an offer, patient joins and receives exactly that offer, patient answers, doctor receives the answer, session flips to `ACTIVE`, and ending the call closes it for both sides.
- A participant never receives their own signals.
- Oversized signals are rejected (413).
- Camera and microphone remain permitted for this origin.

## Verdict

The module is **well engineered and correctly integrated** — the authorization model in particular is stronger than most of the surrounding code. It is **not production ready**, principally because **without a TURN server a significant proportion of real consultations will silently fail to connect**, and because a clinical video consultation currently captures no consent and produces no encounter record.
