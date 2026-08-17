# @wonflow/mobile

The whole WonFlow product, wrapped for Android and iOS. Not a rebuild — a
thin native shell (Expo + `react-native-webview`) around the real web app,
which already handles login and every portal (admin, reception, doctor,
patient, laboratory, radiology, pharmacy, billing, management, platform).
One app, every role — the same as visiting the website, just installed as
an app icon on a phone.

`apps/doctor-mobile` and `apps/patient-mobile` are separate, earlier,
unfinished native-screen scaffolds and are not part of this app.

## How it works

`app/index.tsx` is the entire app: one `WebView` pointed at your deployment,
plus:

- **Cookies persist** across app restarts (`sharedCookiesEnabled`), so a
  signed-in session survives closing and reopening the app.
- **Android hardware back button** navigates the WebView's own history
  instead of exiting the app.
- **Camera and microphone** are available for document/report photo capture
  and video consultations — granted automatically rather than prompted
  repeatedly (`mediaCapturePermissionGrantType="grant"` on iOS 15+; Android
  grants based on the app's own `CAMERA`/`RECORD_AUDIO` permissions,
  declared in `app.json`).
- **External links** (anything not on your WonFlow domain — a `mailto:`
  link, an outside reference) open in the system browser instead of inside
  the app.
- **A retry screen** appears if the app can't reach the server at all
  (no connection, server down), instead of a blank white screen.

## Configuration

Set the deployment URL at build time:

```
EXPO_PUBLIC_WONFLOW_APP_URL=https://your-real-domain.example.com
```

Without it, the app falls back to `http://localhost:3000` (`10.0.2.2` on the
Android emulator, which is how an emulator reaches the host machine) — for
local development only. Set the real env var before building anything meant
to leave your machine.

## Run locally

```powershell
pnpm --filter @wonflow/mobile start
pnpm --filter @wonflow/mobile android   # or: ios
```

## Building an installable APK (direct download, no Play Store)

```powershell
cd apps/mobile
npx eas build --profile preview-apk --platform android
```

Requires an Expo account (free) and `eas.json`'s `EXPO_PUBLIC_WONFLOW_APP_URL`
placeholder updated to your real domain first. The resulting `.apk` can be
hosted anywhere and installed directly — no Play Store review needed.

## iOS distribution

Apple does not allow installing an app the same way Android does (no direct
`.ipa` download-and-install for ordinary users). Realistic options, in order
of effort: a Progressive Web App / "Add to Home Screen" from Safari (no
Apple involvement at all), TestFlight (light Apple review, invite-only,
90-day build expiry), or the Apple Enterprise Program (org-internal
distribution only — using it for the general public violates Apple's terms
and risks the certificate being revoked for everyone at once). A real App
Store submission is also always an option if that changes.

## Verification

```powershell
pnpm --filter @wonflow/mobile typecheck
cd apps/mobile && npx expo export --platform android   # or: ios
```

The `export` command runs the real Metro bundler end to end — it's the
strongest available check that the app actually compiles, short of running
it on a device or emulator (neither of which is available in every
environment).
