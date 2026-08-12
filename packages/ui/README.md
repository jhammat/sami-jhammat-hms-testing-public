# @wonflow/ui

Shared interface components and design-system utilities for the WonFlow platform.

## Purpose

This package provides:

- Reusable, presentation-only React components (`src/components`)
- Shared client-side utilities and hooks (`src/lib`, `src/hooks`)
- The base Tailwind stylesheet (`src/styles/globals.css`)

Portal-specific screens live in `apps/web/src/components`; only building
blocks meant to be shared across portals belong here.

## Approved Import

```ts
import { Button } from "@wonflow/ui/components/button";
import "@wonflow/ui/globals.css";
```

## Package Exclusions

The package must not contain:

- Route handlers or server actions
- Domain/business logic (that belongs in `@wonflow/contracts` or
  `apps/web/src/server`)
- Hospital-specific copy or production data

## Verification

```powershell
pnpm --filter @wonflow/ui typecheck
pnpm check
```
