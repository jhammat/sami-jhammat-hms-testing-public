# @wonflow/config

Shared runtime configuration and environment rules for WonFlow.

## Purpose

This package provides:

- Public environment validation
- Server environment validation
- Feature flags
- Portal definitions
- Runtime application configuration
- Production-safety rules

## Public Configuration

Values prefixed with:

```text
NEXT_PUBLIC_
```

may be included in browser bundles.

They must never contain:

- Passwords
- Database URLs
- Authentication secrets
- Encryption keys
- Private tokens
- Storage secret keys

## Server Configuration

Server-only values include:

- `DATABASE_URL`
- `SESSION_SECRET`
- `AUTH_ENCRYPTION_KEY`
- `REDIS_URL`
- Object-storage credentials
- SMTP credentials

## Example

```ts
import {
  createWonFlowAppConfiguration,
} from "@wonflow/config";

const configuration =
  createWonFlowAppConfiguration(
    process.env,
  );
```

Server-only configuration:

```ts
import {
  parseWonFlowServerEnvironment,
} from "@wonflow/config";

const serverEnvironment =
  parseWonFlowServerEnvironment(
    process.env,
  );
```

## Environments

WonFlow recognizes:

- Development
- Test
- Staging
- Pilot
- Production

Mock mode is blocked in pilot and production.

## Data Modes

```text
mock
= Deterministic fictional frontend data

api
= Controlled backend API data
```

## Verification

```powershell
pnpm --filter @wonflow/config audit:config
pnpm --filter @wonflow/config typecheck
pnpm --filter @wonflow/config check
pnpm check
```