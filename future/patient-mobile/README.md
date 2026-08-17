# @wonflow/patient-mobile

Patient Android/iOS application, built with Expo and Expo Router.

## Status

Early scaffold (`app/_layout.tsx`, `app/index.tsx`). The patient portal ships
first on the web at `/patient` (`apps/web`); this app will consume the same
`@wonflow/contracts`-typed API once native screens are built out.

## Run

```powershell
pnpm --filter @wonflow/patient-mobile start
pnpm --filter @wonflow/patient-mobile android   # or: ios
```

## Verification

```powershell
pnpm --filter @wonflow/patient-mobile typecheck
```
