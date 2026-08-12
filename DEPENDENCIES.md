# WonFlow Dependencies

This repository is a pnpm monorepo. A new contributor does not need to install every JavaScript package by hand, but they do need the right machine-level tooling before running `pnpm install`.

## What to install on a new machine

- Node.js 20.9.0 or newer
- pnpm 10 or newer, with pnpm 11.15.1 matching the repo lockfile and `packageManager` field
- Git
- PostgreSQL, or Docker Desktop if you want to run the database through containers
- Docker Desktop if you want to use the provided `deploy/docker-compose.yml` setup
- Android Studio with the Android SDK, platform tools, and JDK 17 if you want to run the mobile apps on Windows
- macOS with Xcode if you need iOS builds or iOS simulator support

## Install the workspace packages

After the machine prerequisites are in place, run `pnpm install` from the repository root. That installs the direct dependencies declared across the workspace:

- Root workspace: `dotenv`, `tsx`
- Web app: `next`, `react`, `react-dom`, `@base-ui/react`, `class-variance-authority`, `clsx`, `lucide-react`, `qrcode`, `shadcn`, `tailwind-merge`, `tw-animate-css`, `zod`
- Doctor mobile app: `expo`, `expo-router`, `expo-secure-store`, `react`, `react-native`
- Patient mobile app: `expo`, `expo-router`, `expo-secure-store`, `react`, `react-native`
- Worker app: `tsx`, `typescript`, `@types/node`, `@wonflow/database`
- Shared config package: `zod`, `@wonflow/contracts`, `@wonflow/validation`
- Shared contracts package: no external runtime dependencies
- Shared validation package: `zod`, `@wonflow/contracts`
- Shared UI package: `react`, `react-dom`, `class-variance-authority`, `clsx`, `lucide-react`, `shadcn`, `tailwind-merge`, `tw-animate-css`
- Shared database package: `@prisma/client`, `@prisma/adapter-pg`, `pg`, `dotenv`, `prisma`, `@types/pg`
- Shared TypeScript config package: no runtime dependencies

## Optional setup depending on what you run

- Browser for the Next.js web app and Playwright tests
- Android emulator or physical Android device for Expo mobile development
- PostgreSQL credentials and a `.env.local` file for database-backed flows

## Notes

- On Windows, the mobile apps can be developed for Android. iOS requires macOS.
- The repo already contains the package manifests and lockfile, so the canonical install step is still just `pnpm install` at the root.