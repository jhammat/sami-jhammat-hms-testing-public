# @wonflow/doctor-mobile

Doctor Android/iOS application, built with Expo and Expo Router.

## Status

Early scaffold (`app/_layout.tsx`, `app/index.tsx`). The doctor workspace
ships first on the web at `/doctor` (`apps/web`); this app will consume the
same `@wonflow/contracts`-typed API once native screens are built out.

## Run

```powershell
pnpm --filter @wonflow/doctor-mobile start
pnpm --filter @wonflow/doctor-mobile android   # or: ios
```

## Verification

```powershell
pnpm --filter @wonflow/doctor-mobile typecheck
```
